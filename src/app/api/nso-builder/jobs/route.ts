import { NextRequest, NextResponse } from 'next/server';

import { ensureUserProfile } from '@/lib/auth/ensure-user-profile';
import { createNsoJar, createNsoJarBundle, safeJarFilePart } from '@/lib/nso-builder/jar';
import { uuidPattern, validateNsoServer } from '@/lib/nso-builder/validation';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type CreateJobPayload = {
  version_code?: string;
  server_name?: string;
  server_host?: string;
  server_port?: number;
  output_kind?: 'single' | 'clone_bundle';
  idempotency_key?: string;
};

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
    .select('id,user_id,version_code,server_name,server_host,server_port,price,output_kind,status,output_name,output_size,built_at,created_at,updated_at')
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
  const outputKind = payload.output_kind === 'clone_bundle' ? 'clone_bundle' : 'single';
  const idempotencyKey = String(payload.idempotency_key || '');

  if (!/^[a-zA-Z0-9._-]{1,24}$/.test(versionCode)) {
    return NextResponse.json({ error: 'Phiên bản không hợp lệ.' }, { status: 422 });
  }
  const serverError = validateNsoServer(serverName, serverHost, serverPort);
  if (serverError) return NextResponse.json({ error: serverError }, { status: 422 });
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
      .select('code,price,clone_bundle_price,template_file,is_active').eq('code', versionCode).eq('is_active', true).maybeSingle(),
    admin.from('nso_builder_settings').select('is_active').eq('id', true).maybeSingle(),
    admin.from('nso_build_jobs').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).gt('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()),
  ]);
  if (!settings?.is_active) return NextResponse.json({ error: 'Dịch vụ tạo JAR đang tạm dừng.' }, { status: 503 });
  if (versionError || !version) return NextResponse.json({ error: 'Phiên bản không còn được bán.' }, { status: 404 });
  if ((recentCount || 0) >= 10) {
    return NextResponse.json({ error: 'Bạn đã tạo quá nhiều file trong một giờ. Vui lòng thử lại sau.' }, { status: 429 });
  }
  const totalPrice = Number(version.price) + (outputKind === 'clone_bundle' ? Number(version.clone_bundle_price) : 0);
  if (Number(profile.coin_balance) < totalPrice) {
    return NextResponse.json({ error: 'Số dư ví không đủ.', need_recharge: true }, { status: 400 });
  }

  const jobId = crypto.randomUUID();
  const outputName = outputKind === 'clone_bundle'
    ? `${safeJarFilePart(serverName)}_${safeJarFilePart(versionCode)}_multi-tab.zip`
    : `${safeJarFilePart(serverName)}_${safeJarFilePart(versionCode)}.jar`;
  const outputPath = `${user.id}/${jobId}/${outputName}`;
  let uploaded = false;

  try {
    const serverData = `${serverName}:${serverHost}:${serverPort}:0:0`;
    const { output } = outputKind === 'clone_bundle'
      ? await createNsoJarBundle(versionCode, version.template_file, serverName, serverData)
      : await createNsoJar(version.template_file, serverData);
    const { error: uploadError } = await admin.storage.from('nso-builds').upload(outputPath, output, {
      contentType: outputKind === 'clone_bundle' ? 'application/zip' : 'application/java-archive',
      cacheControl: '3600',
      upsert: false,
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
      p_output_kind: outputKind,
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
    return NextResponse.json({
      ...data,
      message: outputKind === 'clone_bundle'
        ? 'Bộ 5 file x1, x3, x6, x12 và x24 đã sẵn sàng tải.'
        : 'JAR đã được tạo xong và sẵn sàng tải.',
    });
  } catch (error) {
    if (uploaded) await admin.storage.from('nso-builds').remove([outputPath]);
    console.error('[NSO Builder] Instant JAR creation failed', error);
    return NextResponse.json({ error: 'Không thể tạo JAR lúc này. Tài khoản chưa bị trừ tiền.' }, { status: 500 });
  }
}
