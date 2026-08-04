/* ==========================================================================
   API Route: /api/email/send-recharge
   Email xác nhận nạp tiền - chuyên nghiệp, không emoji
   ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

function buildRechargeHtml(data: {
  display_name: string | null;
  amount: number;
  transaction_code: string;
  new_balance: number;
}): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Xác Nhận Nạp Tiền | PhuongDev Shop</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:480px;margin:0 auto;padding:32px 16px;">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#059669,#10b981);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
    <div style="width:48px;height:48px;background:rgba(255,255,255,0.2);border-radius:12px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
      <div style="width:24px;height:24px;border:3px solid #fff;border-radius:50%;"></div>
    </div>
    <h1 style="color:#fff;font-size:20px;font-weight:800;margin:0 0 6px;">Nạp Tiền Thành Công</h1>
    <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:0;">Số dư ví đã được cập nhật</p>
  </div>

  <!-- Body -->
  <div style="background:#fff;padding:28px 32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
    <p style="color:#1e293b;font-size:15px;margin:0 0 20px;">Xin chào <strong>${data.display_name || 'bạn'}</strong>,</p>

    <!-- Amount block -->
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;">
      <p style="color:#15803d;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0 0 8px;">Số tiền nạp</p>
      <p style="color:#166534;font-size:32px;font-weight:900;margin:0 0 4px;">+${data.amount.toLocaleString('vi-VN')}</p>
      <p style="color:#4ade80;font-size:13px;margin:0;">VND · Coin</p>
    </div>

    <!-- Details -->
    <div style="background:#fafafa;border:1px solid #e2e8f0;border-radius:12px;padding:16px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="color:#94a3b8;font-size:12px;padding:5px 0;">Mã giao dịch</td>
          <td style="color:#0f172a;font-size:12px;font-family:monospace;font-weight:700;text-align:right;">${data.transaction_code}</td>
        </tr>
        <tr>
          <td style="color:#94a3b8;font-size:12px;padding:5px 0;border-top:1px solid #f1f5f9;">Số dư hiện tại</td>
          <td style="color:#059669;font-size:13px;font-weight:800;text-align:right;border-top:1px solid #f1f5f9;">${data.new_balance.toLocaleString('vi-VN')} Coin</td>
        </tr>
      </table>
    </div>

    <div style="text-align:center;margin-top:24px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://phuongdev.com'}/store"
        style="display:inline-block;background:linear-gradient(135deg,#e11d48,#f43f5e);color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:14px;">
        Mua Sắm Ngay
      </a>
    </div>
  </div>

  <!-- Footer -->
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 16px 16px;padding:16px 32px;text-align:center;">
    <p style="color:#cbd5e1;font-size:12px;margin:0;">© 2025 PhuongDev Shop ·
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://phuongdev.com'}/profile" style="color:#e11d48;text-decoration:none;">Xem ví của bạn</a>
    </p>
  </div>
</div>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  try {
    const { email, display_name, amount, transaction_code, new_balance } = await request.json();

    if (!email || !amount) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const { data, error } = await resend.emails.send({
      from: 'PhuongDev Shop <onboarding@resend.dev>',
      to: [email],
      subject: `Nạp ${amount.toLocaleString('vi-VN')} VND thành công | PhuongDev Shop`,
      html: buildRechargeHtml({ display_name, amount, transaction_code, new_balance }),
    });

    if (error) {
      console.error('[Email Recharge]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, email_id: data?.id });
  } catch (error) {
    console.error('[Email Recharge]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
