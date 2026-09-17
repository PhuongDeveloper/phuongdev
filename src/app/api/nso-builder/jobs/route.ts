import { NextRequest, NextResponse } from 'next/server';

import { ensureUserProfile } from '@/lib/auth/ensure-user-profile';
import { createNsoJar, safeJarFilePart } from '@/lib/nso-builder/jar';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type CreateJobPayload = {
  version_code?: string;
  server_name?: string;
  server_host?: string;
  server_port?: number;
  idempotency_key?: string;
};

const hostPattern = /^(localhost|([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(\.([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))*|([0-9]{1,3}\.){3}[0-9]{1,3})$/i;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidHost(value: string) {
  if (!hostPattern.test(value) || value.length > 253) return false;
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)) return true;
  return value.split('.').every((part) => Number(part) <= 255);
}

async function authenticatedUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: 'Vui lòng đăng nhập để xem file đã build.' }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('nso_build_jobs')
    .select('id,user_id,version_code,server_name,server_host,server_port,price,status,output_name,output_size,built_at,created_at,updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('[NSO Builder] Could not list jobs', error);
    return NextResponse.json({ error: 'Không thể tải lịch sử build.' }, { status: 500 });
  }
  return NextResponse.json({ jobs: data || [] });
}

export async function POST(request: NextRequest) {
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: 'Vui lòng đăng nhập trước khi build.' }, { status: 401 });

  let payload: CreateJobPayload;
  try {
    payload = (await request.json()) as CreateJobPayload;
  } catch {
    return NextResponse.json({ error: 'Dữ liệu gửi lên không đúng định dạng.' }, { status: 400 });
  }

  const versionCode = String(payload.version_code || '').trim();
  const serverName = String(payload.server_name || '').trim();
  const serverHost = String(payload.server_host || '').trim().toLowerCase();
  const serverPort = Number(payload.server_port ?? 14444);
  const idempotencyKey = String(payload.idempotency_key || '');

  if (!/^[a-zA-Z0-9._-]{1,24}$/.test(versionCode)) {
    return NextResponse.json({ error: 'Phiên bản không hợp lệ.' }, { status: 422 });
  }
  if (serverName.length < 2 || serverName.length > 40 || /[\x00-\x1f\\/:*?"<>|]/.test(serverName) || /[\u{10000}-\u{10ffff}]/u.test(serverName)) {
    return NextResponse.json({ error: 'Tên server cần từ 2–40 ký tự và không chứa ký tự tên file đặc biệt.' }, { status: 422 });
  }
  if (!isValidHost(serverHost)) {
    return NextResponse.json({ error: 'IP hoặc tên miền không hợp lệ. Không nhập http:// hay port tại ô này.' }, { status: 422 });
  }
  if (!Number.isSafeInteger(serverPort) || serverPort < 1 || serverPort > 65535) {
    return NextResponse.json({ error: 'Port phải là số từ 1 đến 65535.' }, { status: 422 });
  }
  if (!uuidPattern.test(idempotencyKey)) {
    return NextResponse.json({ error: 'Mã yêu cầu build không hợp lệ.' }, { status: 422 });
  }

  const admin = createAdminClient();
  let profile;
  try {
    profile = await ensureUserProfile(admin, user);
  } catch (error) {
    console.error('[NSO Builder] Could not ensure profile', error);
    return NextResponse.json({ error: 'Không thể khởi tạo hồ sơ mua hàng.' }, { status: 500 });
  }

  const { data: existing } = await admin.from('nso_build_jobs')
    .select('id,price,status').eq('user_id', user.id).eq('idempotency_key', idempotencyKey).maybeSingle();
  if (existing) return NextResponse.json({ success: true, job_id: existing.id, price: existing.price, duplicate: true });

  const [{ data: version, error: versionError }, { data: settings }, { count: recentCount }] = await Promise.all([
    admin.from('nso_build_versions')
      .select('code,price,template_file,is_active').eq('code', versionCode).eq('is_active', true).maybeSingle(),
    admin.from('nso_builder_settings').select('is_active').eq('id', true).maybeSingle(),
    admin.from('nso_build_jobs').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).gt('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()),
  ]);
  if (!settings?.is_active) return NextResponse.json({ error: 'Dịch vụ tạo JAR đang tạm dừng.' }, { status: 503 });
  if (versionError || !version) return NextResponse.json({ error: 'Phiên bản không còn được bán.' }, { status: 404 });
  if ((recentCount || 0) >= 10) {
    return NextResponse.json({ error: 'Bạn đã tạo quá nhiều file trong một giờ. Vui lòng thử lại sau.' }, { status: 429 });
  }
  if (Number(profile.coin_balance) < Number(version.price)) {
    return NextResponse.json({ error: 'Số dư ví không đủ.', need_recharge: true }, { status: 400 });
  }

  const jobId = crypto.randomUUID();
  const outputName = `${safeJarFilePart(serverName)}_${safeJarFilePart(versionCode)}.jar`;
  const outputPath = `${user.id}/${jobId}/${outputName}`;
  let uploaded = false;

  try {
    const serverData = `${serverName}:${serverHost}:${serverPort}:0:0`;
    const { output } = await createNsoJar(version.template_file, serverData);
    const { error: uploadError } = await admin.storage.from('nso-builds').upload(outputPath, output, {
      contentType: 'application/java-archive', cacheControl: '3600', upsert: false,
    });
    if (uploadError) throw uploadError;
    uploaded = true;

    const { data, error } = await admin.rpc('purchase_completed_nso_build', {
      p_job_id: jobId,
      p_user_id: user.id,
      p_version_code: versionCode,
      p_server_name: serverName,
      p_server_host: serverHost,
      p_server_port: serverPort,
      p_idempotency_key: idempotencyKey,
      p_output_path: outputPath,
      p_output_name: outputName,
      p_output_size: output.length,
    });
    if (error) throw error;
    if (!data?.success) {
      await admin.storage.from('nso-builds').remove([outputPath]);
      uploaded = false;
      return NextResponse.json({ error: data?.error || 'Không thể hoàn tất giao dịch.', need_recharge: data?.need_recharge }, { status: 400 });
    }
    if (data.duplicate) {
      await admin.storage.from('nso-builds').remove([outputPath]);
      uploaded = false;
    }
    return NextResponse.json({ ...data, message: 'JAR đã được tạo xong và sẵn sàng tải.' });
  } catch (error) {
    if (uploaded) await admin.storage.from('nso-builds').remove([outputPath]);
    console.error('[NSO Builder] Instant JAR creation failed', error);
    return NextResponse.json({ error: 'Không thể tạo JAR lúc này. Tài khoản chưa bị trừ tiền.' }, { status: 500 });
  }
}
