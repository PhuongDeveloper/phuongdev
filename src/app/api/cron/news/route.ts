import { NextRequest, NextResponse } from 'next/server';

import { syncNewsSources } from '@/lib/content/news-sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await syncNewsSources();
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('[NewsCron] Sync failed', error);
    return NextResponse.json({ error: 'Không thể đồng bộ nguồn tin.' }, { status: 500 });
  }
}
