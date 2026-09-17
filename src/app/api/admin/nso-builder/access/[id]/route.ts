import { NextRequest, NextResponse } from 'next/server';

import { getAdminSession } from '@/lib/auth/admin';
import { uuidPattern } from '@/lib/nso-builder/validation';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Không có quyền quản trị.' }, { status: 403 });

  const { id } = await params;
  if (!uuidPattern.test(id)) return NextResponse.json({ error: 'Mã server không hợp lệ.' }, { status: 422 });
  let status: string;
  try {
    status = String(((await request.json()) as { status?: string }).status || '');
  } catch {
    return NextResponse.json({ error: 'Dữ liệu không đúng định dạng.' }, { status: 400 });
  }
  if (!['active', 'revoked'].includes(status)) {
    return NextResponse.json({ error: 'Trạng thái không hợp lệ.' }, { status: 422 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from('nso_server_access').update({ status }).eq('id', id);
  if (error) {
    console.error('[NSO Builder Admin] Access status update failed', error);
    return NextResponse.json({ error: 'Không thể cập nhật server.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
