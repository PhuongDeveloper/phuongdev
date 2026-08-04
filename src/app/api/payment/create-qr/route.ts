/* ==========================================================================
   API Route: /api/payment/create-qr
   Tạo mã QR VietQR + lưu pending transaction vào DB
   ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const BANK_ID = 'BIDV';
const ACCOUNT_NO = '8811430066';
const ACCOUNT_NAME = 'TRAN MINH PHUONG';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Xác thực người dùng
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const { amount } = await request.json();

    if (!amount || amount < 1000) {
      return NextResponse.json({ error: 'Số tiền tối thiểu 1,000 VND' }, { status: 400 });
    }

    if (amount > 50_000_000) {
      return NextResponse.json({ error: 'Số tiền tối đa 50,000,000 VND' }, { status: 400 });
    }

    // Tạo mã giao dịch unique: PD + 8 ký tự random
    const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
    const transactionCode = `PD${randomPart}`;

    // Lưu pending transaction
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 phút

    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        amount,
        coin_amount: amount, // 1 coin = 1 VND
        status: 'pending',
        transaction_code: transactionCode,
        payment_method: 'bank_transfer',
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (txError) {
      console.error('Transaction error:', txError);
      return NextResponse.json({ error: 'Không thể tạo giao dịch' }, { status: 500 });
    }

    // Tạo URL QR VietQR
    const addInfo = encodeURIComponent(transactionCode);
    const qrUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png?amount=${amount}&addInfo=${addInfo}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;

    return NextResponse.json({
      success: true,
      qr_url: qrUrl,
      transaction_code: transactionCode,
      transaction_id: transaction.id,
      amount,
      expires_at: expiresAt,
      bank: {
        bank_id: BANK_ID,
        account_no: ACCOUNT_NO,
        account_name: ACCOUNT_NAME,
      },
    });
  } catch (error) {
    console.error('Create QR error:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}
