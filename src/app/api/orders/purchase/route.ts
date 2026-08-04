/* ==========================================================================
   API Route: /api/orders/purchase
   Xử lý mua hàng bằng coin hoặc tạo QR bank thanh toán trực tiếp
   ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as supabaseAdminCreate } from '@supabase/supabase-js';

const supabaseAdmin = supabaseAdminCreate(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy_key',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const BANK_ID = 'BIDV';
const ACCOUNT_NO = '8811430066';
const ACCOUNT_NAME = 'TRAN MINH PHUONG';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const { product_id, payment_method } = await request.json();

    if (!product_id || !payment_method) {
      return NextResponse.json({ error: 'Thiếu thông tin đơn hàng' }, { status: 400 });
    }

    if (!['coin', 'bank_qr'].includes(payment_method)) {
      return NextResponse.json({ error: 'Phương thức thanh toán không hợp lệ' }, { status: 400 });
    }

    // Lấy thông tin sản phẩm
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', product_id)
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: 'Sản phẩm không tồn tại hoặc đã dừng bán' }, { status: 404 });
    }

    if (product.price <= 0) {
      return NextResponse.json({ error: 'Sản phẩm này miễn phí, không cần mua' }, { status: 400 });
    }

    // === THANH TOÁN BẰNG COIN ===
    if (payment_method === 'coin') {
      // Lấy số dư coin
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('coin_balance, email, display_name, total_spent')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        return NextResponse.json({ error: 'Không tìm thấy hồ sơ người dùng' }, { status: 404 });
      }

      if (profile.coin_balance < product.price) {
        return NextResponse.json({
          error: `Số dư không đủ. Bạn có ${profile.coin_balance.toLocaleString('vi-VN')} coin, cần ${product.price.toLocaleString('vi-VN')} coin.`,
          need_recharge: true,
        }, { status: 400 });
      }

      // Lấy key permanent
      let keyData = null;
      if (product.has_key) {
        const { data: availableKey } = await supabaseAdmin
          .from('product_keys')
          .select('*')
          .eq('product_id', product_id)
          .eq('key_type', 'permanent')
          .eq('is_used', false)
          .limit(1)
          .single();

        if (!availableKey) {
          return NextResponse.json({ error: 'Hết key bản quyền. Vui lòng liên hệ admin.' }, { status: 400 });
        }
        keyData = availableKey;
      }

      // Trừ coin & cộng total_spent
      const { error: deductError } = await supabaseAdmin
        .from('user_profiles')
        .update({
          coin_balance: profile.coin_balance - product.price,
          total_spent: (profile.total_spent || 0) + product.price,
        })
        .eq('id', user.id);

      if (deductError) {
        return NextResponse.json({ error: 'Không thể trừ coin' }, { status: 500 });
      }

      // Tạo order
      const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .insert({
          user_id: user.id,
          product_id,
          product_title: product.title,
          amount: product.price,
          payment_method: 'coin',
          status: 'completed',
          key_id: keyData?.id || null,
          key_value: keyData?.key_value || null,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (orderError || !order) {
        return NextResponse.json({ error: 'Không thể tạo đơn hàng' }, { status: 500 });
      }

      // Đánh dấu key đã dùng
      if (keyData) {
        await supabaseAdmin
          .from('product_keys')
          .update({ is_used: true, used_by: user.id, used_at: new Date().toISOString() })
          .eq('id', keyData.id);
      }

      // Gửi email tài liệu bàn giao
      const emailPayload = {
        email: profile.email || user.email,
        display_name: profile.display_name,
        product_title: product.title,
        product_image: product.image_url,
        key_value: keyData?.key_value || null,
        key_type: keyData ? 'permanent' : null,
        download_url: product.download_url,
        delivery_intro: product.delivery_intro,
        delivery_note: product.delivery_note,
        order_id: order.id,
        amount: product.price,
        payment_method: 'coin',
      };

      fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email/send-delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.INTERNAL_API_SECRET || '' },
        body: JSON.stringify(emailPayload),
      }).catch(console.error);

      return NextResponse.json({
        success: true,
        order_id: order.id,
        key_value: keyData?.key_value || null,
        download_url: product.download_url,
        delivery_intro: product.delivery_intro,
        delivery_note: product.delivery_note,
        message: 'Thanh toán thành công! Email xác nhận đã được gửi.',
      });
    }

    // === THANH TOÁN QR BANK TRỰC TIẾP ===
    if (payment_method === 'bank_qr') {
      const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
      const transactionCode = `PD${randomPart}`;
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      // Tạo pending transaction
      const { data: transaction, error: txError } = await supabaseAdmin
        .from('transactions')
        .insert({
          user_id: user.id,
          amount: product.price,
          coin_amount: 0, // Không cộng coin, xử lý thẳng
          status: 'pending',
          transaction_code: transactionCode,
          payment_method: 'bank_qr',
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (txError || !transaction) {
        return NextResponse.json({ error: 'Không thể tạo giao dịch' }, { status: 500 });
      }

      // Tạo pending order
      await supabaseAdmin.from('orders').insert({
        user_id: user.id,
        product_id,
        product_title: product.title,
        amount: product.price,
        payment_method: 'bank_qr',
        status: 'pending',
        transaction_id: transaction.id,
      });

      const addInfo = encodeURIComponent(transactionCode);
      const qrUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png?amount=${product.price}&addInfo=${addInfo}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;

      return NextResponse.json({
        success: true,
        payment_method: 'bank_qr',
        qr_url: qrUrl,
        transaction_code: transactionCode,
        transaction_id: transaction.id,
        amount: product.price,
        expires_at: expiresAt,
        bank: { bank_id: BANK_ID, account_no: ACCOUNT_NO, account_name: ACCOUNT_NAME },
      });
    }

  } catch (error) {
    console.error('[Purchase]', error);
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}
