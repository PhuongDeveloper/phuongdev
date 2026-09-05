/* API cào bài thủ công cho khu vực quản trị. */

import { NextRequest, NextResponse } from 'next/server';

import { getAdminSession } from '@/lib/auth/admin';
import { scrapeArticle } from '@/lib/content/article-scraper';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const adminSession = await getAdminSession();
  if (!adminSession) return NextResponse.json({ error: 'Chưa xác thực. Vui lòng đăng nhập.' }, { status: 401 });

  let payload: { url?: unknown };
  try {
    payload = (await request.json()) as { url?: unknown };
  } catch {
    return NextResponse.json({ error: 'Dữ liệu gửi lên không đúng định dạng.' }, { status: 400 });
  }

  if (typeof payload.url !== 'string' || !payload.url.trim()) {
    return NextResponse.json({ error: 'URL không hợp lệ.' }, { status: 400 });
  }

  try {
    const article = await scrapeArticle(payload.url);
    return NextResponse.json({ success: true, data: article });
  } catch (error) {
    console.error('[ArticleScraper] Lỗi cào bài:', error);
    const message = error instanceof Error ? error.message : 'Lỗi không xác định khi quét bài viết.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
