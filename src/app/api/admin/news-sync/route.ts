import { NextResponse } from 'next/server';

import { getAdminSession } from '@/lib/auth/admin';
import { syncNewsSources } from '@/lib/content/news-sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  const adminSession = await getAdminSession();
  if (!adminSession) return NextResponse.json({ error: 'Không có quyền quản trị.' }, { status: 403 });

  let sourceId: string | undefined;
  try {
    const payload = (await request.json()) as { source_id?: unknown };
    sourceId = typeof payload.source_id === 'string' ? payload.source_id : undefined;
  } catch {
    // Đồng bộ toàn bộ nguồn khi body rỗng.
  }

  try {
    const result = await syncNewsSources({ sourceId });
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('[NewsSync] Manual sync failed', error);
    return NextResponse.json({ error: 'Không thể đồng bộ nguồn tin.' }, { status: 500 });
  }
}
