import { NextRequest, NextResponse } from 'next/server';

import { ensureUserProfile } from '@/lib/auth/ensure-user-profile';
import { uuidPattern, validateNsoServer } from '@/lib/nso-builder/validation';
import { createVietQrUrl, publicBankDetails } from '@/lib/payments/config';
import { createTransactionCode } from '@/lib/payments/transaction-code';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type PaymentPayload = {
  purchase_kind?: 'jar' | 'access';
  version_code?: string;
  output_kind?: 'single' | 'clone_bundle';
  offer_id?: string;
  server_name?: string;
  server_host?: string;
  server_port?: number;
  idempotency_key?: string;
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Vui lòng đăng nhập để thanh toán.' }, { status: 401 });

  let payload: PaymentPayload;
  try {
    payload = (await request.json()) as PaymentPayload;
  } catch {
    return NextResponse.json({ error: 'Dữ liệu gửi lên không đúng định dạng.' }, { status: 400 });
  }

  const purchaseKind = payload.purchase_kind === 'access' ? 'access' : 'jar';
  const versionCode = String(payload.version_code || '').trim();
  const outputKind = payload.output_kind === 'clone_bundle' ? 'clone_bundle' : 'single';
  const offerId = String(payload.offer_id || '').trim();
  const serverName = String(payload.server_name || '').trim();
  const serverHost = String(payload.server_host || '').trim().toLowerCase();
  const serverPort = Number(payload.server_port ?? 14444);
  const idempotencyKey = String(payload.idempotency_key || '').trim();

  const serverError = validateNsoServer(serverName, serverHost, serverPort);
  if (serverError) return NextResponse.json({ error: serverError }, { status: 422 });
  if (!uuidPattern.test(idempotencyKey)) {
    return NextResponse.json({ error: 'Mã yêu cầu thanh toán không hợp lệ.' }, { status: 422 });
  }
  if (purchaseKind === 'jar' && !/^[a-zA-Z0-9._-]{1,24}$/.test(versionCode)) {
    return NextResponse.json({ error: 'Phiên bản không hợp lệ.' }, { status: 422 });
  }
  if (purchaseKind === 'access' && !uuidPattern.test(offerId)) {
    return NextResponse.json({ error: 'Gói tải không hợp lệ.' }, { status: 422 });
  }

  const admin = createAdminClient();
  try {
    await ensureUserProfile(admin, user);
  } catch (error) {
    console.error('[NSO Payment] Could not ensure profile', error);
    return NextResponse.json({ error: 'Không thể khởi tạo hồ sơ thanh toán.' }, { status: 500 });
  }

  const transactionCode = createTransactionCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const { data, error } = await admin.rpc('create_nso_bank_purchase', {
    p_user_id: user.id,
    p_purchase_kind: purchaseKind,
    p_version_code: purchaseKind === 'jar' ? versionCode : null,
    p_output_kind: purchaseKind === 'jar' ? outputKind : null,
    p_offer_id: purchaseKind === 'access' ? offerId : null,
    p_server_name: serverName,
    p_server_host: serverHost,
    p_server_port: serverPort,
    p_idempotency_key: idempotencyKey,
    p_transaction_code: transactionCode,
    p_expires_at: expiresAt,
  });

  if (error) {
    console.error('[NSO Payment] Could not create bank order', error);
    return NextResponse.json({ error: 'Không thể tạo mã thanh toán lúc này.' }, { status: 500 });
  }
  if (!data?.success) {
    return NextResponse.json({ error: data?.error || 'Không thể tạo mã thanh toán.' }, { status: 400 });
  }

  const code = String(data.transaction_code || transactionCode);
  const amount = Number(data.amount);
  const expiry = String(data.expires_at || expiresAt);
  return NextResponse.json({
    success: true,
    qr_url: createVietQrUrl(amount, code),
    transaction_code: code,
    transaction_id: data.transaction_id,
    order_id: data.order_id,
    amount,
    expires_at: expiry,
    bank: publicBankDetails(),
  });
}
