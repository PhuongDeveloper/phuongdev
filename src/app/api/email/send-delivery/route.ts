/* ==========================================================================
   API Route: /api/email/send-delivery
   Gửi email Tài Liệu Bàn Giao - template chuyên nghiệp, không emoji
   ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

interface DeliveryEmailPayload {
  email: string;
  display_name: string | null;
  product_title: string;
  key_value: string | null;
  key_type: 'trial' | 'permanent' | null;
  download_url: string | null;
  delivery_intro: string | null;
  delivery_note: string | null;
  order_id: string;
  amount: number;
  payment_method: string;
}

function buildDeliveryEmailHtml(data: DeliveryEmailPayload): string {
  const paymentLabel: Record<string, string> = {
    coin: 'Thanh toán bằng Ví',
    bank_qr: 'Chuyển khoản ngân hàng',
    free_trial: 'Nhận miễn phí',
  };

  const keySection = data.key_value
    ? `
    <div style="margin:24px 0;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
      <div style="background:#f8fafc;padding:10px 16px;border-bottom:1px solid #e2e8f0;">
        <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#64748b;">
          ${data.key_type === 'trial' ? 'Key Test Miễn Phí' : 'Key Bản Quyền Vĩnh Viễn'}
        </span>
      </div>
      <div style="padding:16px;background:#ffffff;text-align:center;">
        <div style="display:inline-block;background:#0f172a;color:#f8fafc;font-family:'Courier New',Courier,monospace;font-size:16px;font-weight:700;letter-spacing:3px;padding:12px 24px;border-radius:8px;word-break:break-all;">
          ${data.key_value}
        </div>
        <p style="margin:10px 0 0;font-size:12px;color:#94a3b8;">Vui lòng lưu key này cẩn thận. Không chia sẻ với người khác.</p>
      </div>
    </div>
    `
    : '';

  const downloadSection = data.download_url
    ? `
    <div style="text-align:center;margin:20px 0;">
      <a href="${data.download_url}" style="display:inline-block;background:linear-gradient(135deg,#e11d48,#f43f5e);color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600;font-size:14px;">
        Tải Xuống Sản Phẩm
      </a>
    </div>
    `
    : '';

  const introSection = data.delivery_intro
    ? `
    <div style="border-left:3px solid #e11d48;padding:12px 16px;margin:20px 0;background:#fff5f7;border-radius:0 8px 8px 0;">
      <p style="color:#1e293b;font-size:14px;line-height:1.7;margin:0;white-space:pre-line;">${data.delivery_intro}</p>
    </div>
    `
    : '';

  const noteSection = data.delivery_note
    ? `
    <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin:20px 0;">
      <div style="background:#f8fafc;padding:10px 16px;border-bottom:1px solid #e2e8f0;">
        <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#64748b;">Hướng Dẫn Sử Dụng</span>
      </div>
      <div style="padding:16px;background:#ffffff;">
        <div style="color:#475569;font-size:13px;line-height:1.8;white-space:pre-line;">${data.delivery_note}</div>
      </div>
    </div>
    `
    : '';

  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Tài Liệu Bàn Giao - ${data.product_title}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:580px;margin:0 auto;padding:32px 16px;">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#e11d48,#f43f5e);border-radius:16px 16px 0 0;padding:28px 32px;">
    <div style="margin-bottom:4px;">
      <span style="background:rgba(255,255,255,0.2);color:#fff;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;padding:4px 10px;border-radius:4px;">PhuongDev Shop</span>
    </div>
    <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:12px 0 4px;">Tài Liệu Bàn Giao</h1>
    <p style="color:rgba(255,255,255,0.8);font-size:14px;margin:0;">Cảm ơn bạn đã tin tưởng sử dụng sản phẩm</p>
  </div>

  <!-- Body -->
  <div style="background:#ffffff;padding:28px 32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
    <p style="color:#1e293b;font-size:15px;margin:0 0 6px;">Xin chào <strong>${data.display_name || 'bạn'}</strong>,</p>
    <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 20px;">Đơn hàng của bạn đã được xử lý thành công. Dưới đây là thông tin bàn giao cho sản phẩm:</p>

    <!-- Product info -->
    <div style="background:#fafafa;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:8px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="color:#94a3b8;font-size:12px;padding:4px 0;vertical-align:top;width:40%;">Sản phẩm</td>
          <td style="color:#0f172a;font-size:14px;font-weight:700;padding:4px 0;text-align:right;">${data.product_title}</td>
        </tr>
        <tr>
          <td style="color:#94a3b8;font-size:12px;padding:4px 0;">Hình thức</td>
          <td style="color:#475569;font-size:13px;padding:4px 0;text-align:right;">${paymentLabel[data.payment_method] || data.payment_method}</td>
        </tr>
        ${data.amount > 0 ? `
        <tr>
          <td style="color:#94a3b8;font-size:12px;padding:4px 0;">Số tiền</td>
          <td style="color:#e11d48;font-size:13px;font-weight:600;padding:4px 0;text-align:right;">${data.amount.toLocaleString('vi-VN')} VND</td>
        </tr>` : ''}
        <tr>
          <td style="color:#94a3b8;font-size:12px;padding:4px 0;">Mã đơn hàng</td>
          <td style="color:#475569;font-size:12px;font-family:monospace;padding:4px 0;text-align:right;">#${data.order_id.slice(-8).toUpperCase()}</td>
        </tr>
      </table>
    </div>

    ${introSection}
    ${keySection}
    ${downloadSection}
    ${noteSection}
  </div>

  <!-- Footer -->
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;">
    <p style="color:#94a3b8;font-size:13px;margin:0 0 8px;">Cần hỗ trợ? Liên hệ chúng tôi:</p>
    <a href="https://facebook.com/phuongdev" style="color:#e11d48;text-decoration:none;font-weight:600;font-size:13px;">Facebook / PhuongDev</a>
    <p style="color:#cbd5e1;font-size:12px;margin:16px 0 0;">© 2025 PhuongDev Shop · Tất cả quyền được bảo lưu.</p>
  </div>
</div>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  try {
    const payload: DeliveryEmailPayload = await request.json();

    if (!payload.email || !payload.product_title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const subject = payload.key_type === 'trial'
      ? `Key Test - ${payload.product_title} | PhuongDev Shop`
      : `Tài Liệu Bàn Giao - ${payload.product_title} | PhuongDev Shop`;

    const { data, error } = await resend.emails.send({
      from: 'PhuongDev Shop <onboarding@resend.dev>',
      to: [payload.email],
      subject,
      html: buildDeliveryEmailHtml(payload),
    });

    if (error) {
      console.error('[Email Delivery]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (payload.order_id && payload.order_id !== 'manual') {
      await supabaseAdmin.from('orders').update({ email_sent: true }).eq('id', payload.order_id);
    }

    return NextResponse.json({ success: true, email_id: data?.id });
  } catch (error) {
    console.error('[Email Delivery]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
