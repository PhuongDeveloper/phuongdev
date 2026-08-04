/* ==========================================================================
   API Route: /api/payment/sepay-webhook
   SePay gọi endpoint này khi có tiền về tài khoản ngân hàng
   ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Dùng service role để bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy_key',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[SePay Webhook]', JSON.stringify(body, null, 2));

    // Xác thực API key từ SePay (nếu có cấu hình)
    const sePayToken = request.headers.get('Authorization');
    const expectedToken = process.env.SEPAY_WEBHOOK_SECRET;
    if (expectedToken && sePayToken !== `Apikey ${expectedToken}`) {
      console.warn('[SePay] Invalid token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SePay gửi thông tin giao dịch
    const {
      id: sepayId,
      transferAmount,       // Số tiền
      content,              // Nội dung chuyển khoản
      referenceCode,        // Mã tham chiếu ngân hàng
      description,          // Mô tả
      transactionDate,
    } = body;

    const transferContent: string = content || description || '';
    const amount = Number(transferAmount || 0);

    // Tìm mã giao dịch trong nội dung (format: PD + 8 ký tự)
    const codeMatch = transferContent.match(/PD[A-Z0-9]{8}/i);
    if (!codeMatch) {
      console.log('[SePay] No transaction code found in:', transferContent);
      // Trả về 200 để SePay không retry
      return NextResponse.json({ success: true, message: 'No matching transaction' });
    }

    const transactionCode = codeMatch[0].toUpperCase();
    console.log('[SePay] Found transaction code:', transactionCode);

    // Tìm pending transaction
    const { data: transaction, error: findError } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('transaction_code', transactionCode)
      .eq('status', 'pending')
      .single();

    if (findError || !transaction) {
      console.log('[SePay] Transaction not found or already processed:', transactionCode);
      return NextResponse.json({ success: true, message: 'Transaction not found or already processed' });
    }

    // Kiểm tra hết hạn
    if (transaction.expires_at && new Date(transaction.expires_at) < new Date()) {
      await supabaseAdmin
        .from('transactions')
        .update({ status: 'expired' })
        .eq('id', transaction.id);
      console.log('[SePay] Transaction expired:', transactionCode);
      return NextResponse.json({ success: true, message: 'Transaction expired' });
    }

    // Gọi function hoàn tất giao dịch + cộng coin
    const { data: result, error: rpcError } = await supabaseAdmin
      .rpc('complete_transaction', {
        p_transaction_id: transaction.id,
        p_bank_ref: referenceCode || sepayId?.toString(),
        p_sepay_data: body,
      });

    if (rpcError) {
      console.error('[SePay] RPC error:', rpcError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    console.log('[SePay] Transaction completed:', result);

    // Gửi email xác nhận nạp tiền
    if (result?.success) {
      const { data: userProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('email, display_name, coin_balance')
        .eq('id', transaction.user_id)
        .single();

      if (userProfile?.email) {
        // Fire-and-forget email
        fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email/send-recharge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.INTERNAL_API_SECRET || '' },
          body: JSON.stringify({
            email: userProfile.email,
            display_name: userProfile.display_name,
            amount: transaction.amount,
            transaction_code: transactionCode,
            new_balance: userProfile.coin_balance,
          }),
        }).catch(console.error);
      }
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('[SePay] Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET: endpoint kiểm tra trạng thái transaction (dùng cho polling)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transaction_id');
    const transactionCode = searchParams.get('code');

    if (!transactionId && !transactionCode) {
      return NextResponse.json({ error: 'Missing transaction_id or code' }, { status: 400 });
    }

    let query = supabaseAdmin.from('transactions').select('id, status, amount, coin_amount, completed_at, transaction_code');

    if (transactionId) {
      query = query.eq('id', transactionId);
    } else if (transactionCode) {
      query = query.eq('transaction_code', transactionCode);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
