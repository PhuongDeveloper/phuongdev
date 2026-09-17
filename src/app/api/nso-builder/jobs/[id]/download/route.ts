import { NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Vui lòng đăng nhập để tải file.' }, { status: 401 });

  const admin = createAdminClient();
  const { data: job, error } = await admin
    .from('nso_build_jobs')
    .select('id,user_id,status,output_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !job) return NextResponse.json({ error: 'Không tìm thấy file build.' }, { status: 404 });
  if (job.status !== 'completed' || !job.output_path) {
    return NextResponse.json({ error: 'File chưa sẵn sàng để tải.' }, { status: 409 });
  }

  const { data, error: signedError } = await admin.storage
    .from('nso-builds')
    .createSignedUrl(job.output_path, 60, { download: true });
  if (signedError || !data?.signedUrl) {
    console.error('[NSO Builder] Could not sign download', signedError);
    return NextResponse.json({ error: 'Không thể tạo link tải. Vui lòng thử lại.' }, { status: 500 });
  }
  return NextResponse.redirect(data.signedUrl);
}
