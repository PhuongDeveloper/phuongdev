/* ==========================================================================
   API Route: /api/orders/get-trial-key
   Lấy key test miễn phí cho người dùng
   ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as supabaseAdminCreate } from '@supabase/supabase-js';

const supabaseAdmin = supabaseAdminCreate(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const { product_id } = await request.json();

    if (!product_id) {
      return NextResponse.json({ error: 'Thiếu product_id' }, { status: 400 });
    }

    // Lấy thông tin sản phẩm
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', product_id)
      .eq('is_active', true)
      .eq('has_key', true)
      .single();

    if (!product) {
      return NextResponse.json({ error: 'Sản phẩm không hỗ trợ key test' }, { status: 404 });
    }

    // Kiểm tra user đã lấy key test cho sản phẩm này chưa
    const { data: existingOrder } = await supabaseAdmin
      .from('orders')
      .select('id, key_value, created_at')
      .eq('user_id', user.id)
      .eq('product_id', product_id)
      .eq('payment_method', 'free_trial')
      .eq('status', 'completed')
      .single();

    if (existingOrder) {
      return NextResponse.json({
        success: true,
        already_received: true,
        key_value: existingOrder.key_value,
        download_url: product.download_url,
        delivery_intro: product.delivery_intro,
        delivery_note: product.delivery_note,
        message: 'Bạn đã nhận key test này trước đó.',
      });
    }

    // Lấy key trial còn trống
    const { data: availableKey } = await supabaseAdmin
      .from('product_keys')
      .select('*')
      .eq('product_id', product_id)
      .eq('key_type', 'trial')
      .eq('is_used', false)
      .limit(1)
      .single();

    if (!availableKey) {
      return NextResponse.json({ error: 'Hết key test miễn phí. Vui lòng mua key vĩnh viễn.' }, { status: 400 });
    }

    // Tạo order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: user.id,
        product_id,
        product_title: product.title,
        amount: 0,
        payment_method: 'free_trial',
        status: 'completed',
        key_id: availableKey.id,
        key_value: availableKey.key_value,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Không thể tạo đơn hàng' }, { status: 500 });
    }

    // Đánh dấu key đã dùng
    await supabaseAdmin
      .from('product_keys')
      .update({ is_used: true, used_by: user.id, used_at: new Date().toISOString() })
      .eq('id', availableKey.id);

    // Lấy thông tin profile để gửi email
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('email, display_name')
      .eq('id', user.id)
      .single();

    // Gửi email
    if (profile?.email || user.email) {
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email/send-delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.INTERNAL_API_SECRET || '' },
        body: JSON.stringify({
          email: profile?.email || user.email,
          display_name: profile?.display_name,
          product_title: product.title,
          product_image: product.image_url,
          key_value: availableKey.key_value,
          key_type: 'trial',
          download_url: product.download_url,
          delivery_intro: product.delivery_intro,
          delivery_note: product.delivery_note,
          order_id: order.id,
          amount: 0,
          payment_method: 'free_trial',
        }),
      }).catch(console.error);
    }

    return NextResponse.json({
      success: true,
      key_value: availableKey.key_value,
      download_url: product.download_url,
      delivery_intro: product.delivery_intro,
      delivery_note: product.delivery_note,
      order_id: order.id,
      message: '🎉 Nhận key test thành công! Email xác nhận đã được gửi.',
    });
  } catch (error) {
    console.error('[TrialKey]', error);
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}
