import { NextRequest, NextResponse } from 'next/server';

import { ensureUserProfile } from '@/lib/auth/ensure-user-profile';
import { createVietQrUrl, publicBankDetails } from '@/lib/payments/config';
import { createTransactionCode } from '@/lib/payments/transaction-code';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const MIN_RECHARGE = 10_000;
const MAX_RECHARGE = 50_000_000;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Vui lòng đăng nhập để nạp tiền.' }, { status: 401 });
    }

    const payload = (await request.json()) as { amount?: unknown };
    const amount = Number(payload.amount);

    if (!Number.isSafeInteger(amount) || amount < MIN_RECHARGE) {
      return NextResponse.json(
        { error: `Số tiền nạp tối thiểu ${MIN_RECHARGE.toLocaleString('vi-VN')}đ.` },
        { status: 400 },
      );
    }

    if (amount > MAX_RECHARGE) {
      return NextResponse.json(
        { error: `Số tiền nạp tối đa ${MAX_RECHARGE.toLocaleString('vi-VN')}đ.` },
        { status: 400 },
      );
    }

    const transactionCode = createTransactionCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const admin = createAdminClient();
    try {
      await ensureUserProfile(admin, user);
    } catch (profileError) {
      console.error('[Recharge] Could not ensure user profile', profileError);
      return NextResponse.json({ error: 'Không thể khởi tạo hồ sơ nạp tiền.' }, { status: 500 });
    }

    const { data: transaction, error } = await admin
      .from('transactions')
      .insert({
        user_id: user.id,
        amount,
        coin_amount: amount,
        status: 'pending',
        transaction_code: transactionCode,
        payment_method: 'bank_transfer',
        purpose: 'recharge',
        expires_at: expiresAt,
      })
      .select('id')
      .single();

    if (error || !transaction) {
      console.error('[Recharge] Could not create transaction', {
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
      });
      return NextResponse.json(
        { error: `Không thể tạo giao dịch nạp tiền. (${error?.code ?? 'unknown'})` },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      qr_url: createVietQrUrl(amount, transactionCode),
      transaction_code: transactionCode,
      transaction_id: transaction.id,
      amount,
      expires_at: expiresAt,
      bank: publicBankDetails(),
    });
  } catch (error) {
    console.error('[Recharge] Unexpected create QR error', error);
    return NextResponse.json({ error: 'Hệ thống thanh toán đang bận. Vui lòng thử lại.' }, { status: 500 });
  }
}
