import { NextRequest, NextResponse } from 'next/server';

import { getAdminSession } from '@/lib/auth/admin';
import { paymentConfig } from '@/lib/payments/config';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Không có quyền quản trị.' }, { status: 403 });

  let payload: { transaction_id?: unknown; bank_ref?: unknown };
  try {
    payload = (await request.json()) as { transaction_id?: unknown; bank_ref?: unknown };
  } catch {
    return NextResponse.json({ error: 'Dữ liệu gửi lên không đúng định dạng.' }, { status: 400 });
  }

  const transactionId = typeof payload.transaction_id === 'string' ? payload.transaction_id : '';
  const bankRef = typeof payload.bank_ref === 'string' ? payload.bank_ref.trim().slice(0, 120) : '';
  if (!transactionId) return NextResponse.json({ error: 'Thiếu mã giao dịch.' }, { status: 400 });

  const admin = createAdminClient();
  const { data: transaction, error: transactionError } = await admin
    .from('transactions')
    .select('id, amount, purpose, status, transaction_code')
    .eq('id', transactionId)
    .maybeSingle();
  if (transactionError) return NextResponse.json({ error: 'Không thể đọc giao dịch.' }, { status: 500 });
  if (!transaction) return NextResponse.json({ error: 'Không tìm thấy giao dịch.' }, { status: 404 });
  if (transaction.purpose !== 'recharge') return NextResponse.json({ error: 'Chỉ có thể duyệt giao dịch nạp ví.' }, { status: 422 });
  if (!['pending', 'expired'].includes(transaction.status)) return NextResponse.json({ error: `Giao dịch đã ở trạng thái ${transaction.status}.` }, { status: 409 });

  const providerId = `manual-${transaction.id}-${Date.now()}`;
  const { data: result, error: rpcError } = await admin.rpc('manual_complete_recharge', {
    p_transaction_id: transaction.id,
    p_provider_transaction_id: providerId,
    p_bank_ref: bankRef || 'manual_admin',
    p_payload: {
      source: 'manual_admin',
      approved_by: session.user.id,
      approved_at: new Date().toISOString(),
      transaction_code: transaction.transaction_code,
    },
  });

  if (rpcError) {
    console.error('[ManualRecharge] Completion RPC failed', rpcError);
    return NextResponse.json({ error: 'Không thể hoàn tất giao dịch.' }, { status: 500 });
  }
  if (!result?.success || result?.duplicate) {
    return NextResponse.json({ error: result?.error || 'Giao dịch đã được xử lý trước đó.' }, { status: 409 });
  }

  const internalSecret = process.env.INTERNAL_API_SECRET;
  if (internalSecret) {
    const { data: profile } = await admin
      .from('user_profiles')
      .select('email, display_name')
      .eq('id', result.user_id)
      .maybeSingle();
    if (profile?.email) {
      await fetch(`${paymentConfig.appUrl}/api/email/send-recharge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-secret': internalSecret },
        body: JSON.stringify({
          email: profile.email,
          display_name: profile.display_name,
          amount: Number(transaction.amount),
          transaction_code: transaction.transaction_code,
          new_balance: Number(result.new_balance),
        }),
      }).catch((emailError) => console.error('[ManualRecharge] Email notification failed', emailError));
    }
  }

  return NextResponse.json({ success: true, transaction_id: transaction.id });
}
