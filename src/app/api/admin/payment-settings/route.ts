import { NextRequest, NextResponse } from 'next/server';

import { getAdminSession } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type PaymentSettingsPayload = {
  bank_id?: unknown;
  account_number?: unknown;
  account_name?: unknown;
  api_url?: unknown;
};

function normalizePayload(payload: PaymentSettingsPayload) {
  const bankId = String(payload.bank_id || '').trim().toUpperCase();
  const accountNumber = String(payload.account_number || '').trim();
  const accountName = String(payload.account_name || '').trim();
  const apiUrl = String(payload.api_url || '').trim();

  if (!/^[A-Z0-9]{2,16}$/.test(bankId)) return { error: 'Mã ngân hàng không hợp lệ.' } as const;
  if (!/^[0-9]{6,24}$/.test(accountNumber)) return { error: 'Số tài khoản chỉ được gồm 6–24 chữ số.' } as const;
  if (accountName.length < 2 || accountName.length > 100) return { error: 'Tên chủ tài khoản cần từ 2 đến 100 ký tự.' } as const;
  if (apiUrl) {
    try {
      const parsed = new URL(apiUrl);
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password || !parsed.hostname || parsed.hostname === 'localhost') {
        return { error: 'URL API phải là HTTPS hợp lệ và không chứa thông tin đăng nhập trong URL.' } as const;
      }
    } catch {
      return { error: 'URL API không hợp lệ.' } as const;
    }
  }

  return { value: { id: true, bank_id: bankId, account_number: accountNumber, account_name: accountName, api_url: apiUrl } } as const;
}

export async function PATCH(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Không có quyền quản trị.' }, { status: 403 });

  let payload: PaymentSettingsPayload;
  try {
    payload = await request.json() as PaymentSettingsPayload;
  } catch {
    return NextResponse.json({ error: 'Dữ liệu không đúng định dạng.' }, { status: 400 });
  }

  const normalized = normalizePayload(payload);
  if ('error' in normalized) return NextResponse.json({ error: normalized.error }, { status: 422 });

  const admin = createAdminClient();
  const { error } = await admin.from('payment_settings').upsert({
    ...normalized.value,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });

  if (error) {
    console.error('[Payment Settings] Save failed', error);
    return NextResponse.json({ error: 'Không thể lưu cấu hình thanh toán.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Không có quyền quản trị.' }, { status: 403 });

  let payload: { api_url?: unknown };
  try {
    payload = await request.json() as { api_url?: unknown };
  } catch {
    return NextResponse.json({ error: 'Dữ liệu không đúng định dạng.' }, { status: 400 });
  }

  const apiUrl = String(payload.api_url || '').trim();
  if (!apiUrl) return NextResponse.json({ error: 'Nhập URL API ACB trước khi kiểm tra.' }, { status: 422 });
  try {
    const parsed = new URL(apiUrl);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.hostname === 'localhost') {
      return NextResponse.json({ error: 'URL kiểm tra phải là HTTPS hợp lệ.' }, { status: 422 });
    }
  } catch {
    return NextResponse.json({ error: 'URL API không hợp lệ.' }, { status: 422 });
  }

  try {
    const response = await fetch(apiUrl, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10_000) });
    if (!response.ok) {
      return NextResponse.json({ error: `API trả về HTTP ${response.status}.` }, { status: 502 });
    }
    const data = await response.json() as { status?: unknown; msg?: unknown; transactions?: unknown };
    if (data.status !== 'success' || !Array.isArray(data.transactions)) {
      const message = typeof data.msg === 'string' ? data.msg.slice(0, 180) : 'Phản hồi không đúng mẫu ACB.';
      return NextResponse.json({ error: `API phản hồi chưa hợp lệ: ${message}` }, { status: 502 });
    }
    return NextResponse.json({ success: true, transaction_count: data.transactions.length });
  } catch {
    return NextResponse.json({ error: 'Không kết nối được API. Hãy kiểm tra URL, token và trạng thái dịch vụ.' }, { status: 502 });
  }
}
