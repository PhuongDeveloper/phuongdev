import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { syncZaloPayTransactions } from '@/lib/payments/zalopay';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const transactionId = request.nextUrl.searchParams.get('transaction_id');
  if (!transactionId) {
    return NextResponse.json({ error: 'Thiếu mã giao dịch.' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 });

  const admin = createAdminClient();
  const getTransaction = () => admin
    .from('transactions')
    .select('id, user_id, status, amount, coin_amount, purpose, completed_at, expires_at')
    .eq('id', transactionId)
    .eq('user_id', user.id)
    .maybeSingle();

  let { data: transaction } = await getTransaction();

  if (!transaction) return NextResponse.json({ error: 'Không tìm thấy giao dịch.' }, { status: 404 });

  // Chỉ gọi API ngân hàng khi giao dịch còn chờ; các giao dịch đã hoàn tất trả về ngay.
  if (transaction.status === 'pending') {
    await syncZaloPayTransactions();
    const refreshed = await getTransaction();
    if (refreshed.data) transaction = refreshed.data;
  }

  if (
    transaction.status === 'pending' &&
    transaction.expires_at &&
    new Date(transaction.expires_at).getTime() <= Date.now()
  ) {
    await admin.rpc('expire_payment_transaction', { p_transaction_id: transaction.id });
    transaction.status = 'expired';
  }

  let order = null;
  let delivery = null;
  if (transaction.purpose === 'order' && transaction.status === 'completed') {
    const { data } = await admin
      .from('orders')
      .select('id, status, key_value, delivery_data, product_id, variant_id')
      .eq('transaction_id', transaction.id)
      .eq('user_id', user.id)
      .maybeSingle();
    order = data;
    if (order) {
      const [{ data: product }, { data: variant }] = await Promise.all([
        admin.from('products').select('download_url, delivery_intro, delivery_note').eq('id', order.product_id).maybeSingle(),
        order.variant_id
          ? admin.from('product_variants').select('download_url, delivery_note').eq('id', order.variant_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      delivery = {
        download_url: variant?.download_url || product?.download_url || null,
        delivery_intro: product?.delivery_intro || null,
        delivery_note: variant?.delivery_note || product?.delivery_note || null,
      };
    }
  }

  return NextResponse.json({
    id: transaction.id,
    status: transaction.status,
    amount: transaction.amount,
    purpose: transaction.purpose,
    completed_at: transaction.completed_at,
    order,
    delivery,
  });
}
