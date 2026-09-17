import { NextRequest, NextResponse } from 'next/server';

import { ensureUserProfile } from '@/lib/auth/ensure-user-profile';
import { uuidPattern, validateNsoServer } from '@/lib/nso-builder/validation';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type PurchasePayload = {
  offer_id?: string;
  server_name?: string;
  server_host?: string;
  server_port?: number;
  idempotency_key?: string;
};

async function authenticatedUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: 'Vui lòng đăng nhập để xem server của bạn.' }, { status: 401 });

  const admin = createAdminClient();
  const { data: accesses, error } = await admin.from('nso_server_access')
    .select('id,user_id,channel_id,server_name,server_host,server_port,status,expires_at,total_paid,purchase_count,created_at,updated_at')
    .eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
  if (error) {
    console.error('[NSO Access] Could not list access', error);
    return NextResponse.json({ error: 'Không thể tải danh sách server.' }, { status: 500 });
  }

  const channelIds = Array.from(new Set((accesses || []).map((access) => access.channel_id)));
  const { data: channels } = channelIds.length
    ? await admin.from('nso_platform_channels')
      .select('id,platform,version_code,name,download_url').in('id', channelIds)
    : { data: [] };
  const channelMap = new Map((channels || []).map((channel) => [channel.id, channel]));
  return NextResponse.json({
    accesses: (accesses || []).map((access) => ({ ...access, channel: channelMap.get(access.channel_id) || null })),
  });
}

export async function POST(request: NextRequest) {
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: 'Vui lòng đăng nhập trước khi tạo bản tải.' }, { status: 401 });

  let payload: PurchasePayload;
  try {
    payload = (await request.json()) as PurchasePayload;
  } catch {
    return NextResponse.json({ error: 'Dữ liệu gửi lên không đúng định dạng.' }, { status: 400 });
  }

  const offerId = String(payload.offer_id || '').trim();
  const serverName = String(payload.server_name || '').trim();
  const serverHost = String(payload.server_host || '').trim().toLowerCase();
  const serverPort = Number(payload.server_port ?? 14444);
  const idempotencyKey = String(payload.idempotency_key || '').trim();
  if (!uuidPattern.test(offerId) || !uuidPattern.test(idempotencyKey)) {
    return NextResponse.json({ error: 'Gói hoặc mã yêu cầu không hợp lệ.' }, { status: 422 });
  }
  const serverError = validateNsoServer(serverName, serverHost, serverPort);
  if (serverError) return NextResponse.json({ error: serverError }, { status: 422 });

  const admin = createAdminClient();
  try {
    await ensureUserProfile(admin, user);
  } catch (error) {
    console.error('[NSO Access] Could not ensure profile', error);
    return NextResponse.json({ error: 'Không thể khởi tạo hồ sơ mua hàng.' }, { status: 500 });
  }

  const { data, error } = await admin.rpc('purchase_nso_server_access', {
    p_order_id: crypto.randomUUID(),
    p_user_id: user.id,
    p_offer_id: offerId,
    p_server_name: serverName,
    p_server_host: serverHost,
    p_server_port: serverPort,
    p_idempotency_key: idempotencyKey,
  });
  if (error) {
    console.error('[NSO Access] Purchase RPC failed', error);
    return NextResponse.json({ error: 'Không thể hoàn tất giao dịch lúc này.' }, { status: 500 });
  }
  if (!data?.success) {
    return NextResponse.json({ error: data?.error || 'Không thể hoàn tất giao dịch.', need_recharge: data?.need_recharge }, { status: 400 });
  }
  return NextResponse.json({ ...data, message: 'Server đã được thêm vào bản tải của bạn.' });
}
