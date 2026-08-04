import { NextRequest, NextResponse } from 'next/server';

import { createVietQrUrl, paymentConfig, publicBankDetails } from '@/lib/payments/config';
import { createTransactionCode } from '@/lib/payments/transaction-code';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

type PurchasePayload = {
  product_id?: string;
  variant_id?: string;
  quantity?: number;
  payment_method?: 'coin' | 'bank_qr';
};

async function sendDeliveryEmail(body: Record<string, unknown>) {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) return;

  await fetch(`${paymentConfig.appUrl}/api/email/send-delivery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-secret': secret },
    body: JSON.stringify(body),
  });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Vui lòng đăng nhập để mua hàng.' }, { status: 401 });

    const payload = (await request.json()) as PurchasePayload;
    const quantity = Number(payload.quantity ?? 1);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100) {
      return NextResponse.json({ error: 'Số lượng không hợp lệ.' }, { status: 400 });
    }
    if (!payload.payment_method || !['coin', 'bank_qr'].includes(payload.payment_method)) {
      return NextResponse.json({ error: 'Phương thức thanh toán không hợp lệ.' }, { status: 400 });
    }

    const admin = createAdminClient();
    let variantId = payload.variant_id;

    // Backwards compatibility for older clients that only submit product_id.
    if (!variantId && payload.product_id) {
      const { data: defaultVariant } = await admin
        .from('product_variants')
        .select('id')
        .eq('product_id', payload.product_id)
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('sort_order', { ascending: true })
        .limit(1)
        .maybeSingle();
      variantId = defaultVariant?.id;
    }

    if (!variantId) return NextResponse.json({ error: 'Vui lòng chọn một gói sản phẩm.' }, { status: 400 });

    const { data: variant } = await admin
      .from('product_variants')
      .select('id, product_id, name, price, download_url, delivery_note, products!inner(*)')
      .eq('id', variantId)
      .eq('is_active', true)
      .maybeSingle();
    if (!variant) return NextResponse.json({ error: 'Gói sản phẩm không còn được bán.' }, { status: 404 });

    const product = Array.isArray(variant.products) ? variant.products[0] : variant.products;

    if (payload.payment_method === 'coin') {
      const { data: result, error } = await admin.rpc('purchase_variant_with_wallet', {
        p_user_id: user.id,
        p_variant_id: variantId,
        p_quantity: quantity,
      });

      if (error) {
        console.error('[Purchase] Wallet RPC error', error);
        return NextResponse.json({ error: 'Không thể hoàn tất thanh toán.' }, { status: 500 });
      }
      if (!result?.success) {
        return NextResponse.json(
          { error: result?.error || 'Không thể hoàn tất thanh toán.', need_recharge: result?.need_recharge },
          { status: 400 },
        );
      }

      const { data: profile } = await admin
        .from('user_profiles')
        .select('email, display_name')
        .eq('id', user.id)
        .single();

      if (profile?.email) {
        sendDeliveryEmail({
          email: profile.email,
          display_name: profile.display_name,
          product_title: product?.title,
          product_image: product?.image_url,
          variant_name: variant.name,
          key_value: result.key_value,
          delivery_data: result.delivery_data,
          download_url: result.download_url,
          delivery_intro: result.delivery_intro,
          delivery_note: result.delivery_note,
          order_id: result.order_id,
          amount: result.amount,
          payment_method: Number(variant.price) === 0 ? 'free_trial' : 'coin',
        }).catch((emailError) => console.error('[Purchase] Delivery email error', emailError));
      }

      return NextResponse.json({
        ...result,
        message: Number(variant.price) === 0
          ? 'Đã nhận gói miễn phí.'
          : 'Thanh toán thành công. Sản phẩm đã được bàn giao.',
      });
    }

    if (Number(variant.price) <= 0) {
      return NextResponse.json({ error: 'Gói miễn phí không cần chuyển khoản.' }, { status: 400 });
    }

    const transactionCode = createTransactionCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const { data: result, error } = await admin.rpc('create_bank_variant_purchase', {
      p_user_id: user.id,
      p_variant_id: variantId,
      p_quantity: quantity,
      p_transaction_code: transactionCode,
      p_expires_at: expiresAt,
    });

    if (error) {
      console.error('[Purchase] Bank reservation RPC error', error);
      return NextResponse.json({ error: 'Không thể giữ hàng và tạo giao dịch.' }, { status: 500 });
    }
    if (!result?.success) {
      return NextResponse.json({ error: result?.error || 'Không thể tạo giao dịch.' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      payment_method: 'bank_qr',
      qr_url: createVietQrUrl(Number(result.amount), transactionCode),
      transaction_code: transactionCode,
      transaction_id: result.transaction_id,
      order_id: result.order_id,
      amount: Number(result.amount),
      expires_at: expiresAt,
      bank: publicBankDetails(),
    });
  } catch (error) {
    console.error('[Purchase] Unexpected error', error);
    return NextResponse.json({ error: 'Hệ thống mua hàng đang bận. Vui lòng thử lại.' }, { status: 500 });
  }
}

