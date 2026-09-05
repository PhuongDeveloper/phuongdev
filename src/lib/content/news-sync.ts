import 'server-only';

import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';

import { scrapeArticle, normalizeSourceUrl } from '@/lib/content/article-scraper';
import { createAdminClient } from '@/lib/supabase/admin';
import type { NewsSource } from '@/lib/types/database';

type FeedItem = {
  url: string;
  publishedAt: string | null;
};

export type NewsSyncResult = {
  sources: number;
  imported: number;
  published: number;
  skipped: number;
  errors: string[];
};

type SyncOptions = {
  sourceId?: string;
};

/**
 * Đồng bộ RSS theo kiểu idempotent: source_url có unique index nên cron chạy lặp
 * hoặc chồng nhau cũng không tạo bài trùng.
 */
export async function syncNewsSources(options: SyncOptions = {}): Promise<NewsSyncResult> {
  const admin = createAdminClient();
  let query = admin.from('news_sources').select('*').eq('is_active', true).order('created_at', { ascending: true });
  if (options.sourceId) query = query.eq('id', options.sourceId);
  const { data: sourceRows, error } = await query;
  if (error) throw new Error('Không thể tải danh sách nguồn RSS.');

  const result: NewsSyncResult = { sources: sourceRows?.length || 0, imported: 0, published: 0, skipped: 0, errors: [] };
  for (const row of (sourceRows || []) as NewsSource[]) {
    await syncOneSource(row, result);
  }
  return result;
}

async function syncOneSource(source: NewsSource, result: NewsSyncResult) {
  const admin = createAdminClient();
  const errorStart = result.errors.length;
  try {
    const items = await readFeed(source.feed_url, source.limit_per_run);
    if (items.length === 0) {
      await updateSourceStatus(source.id, null);
      return;
    }

    const urls = items.map((item) => item.url);
    const { data: existingRows } = await admin.from('blogs').select('source_url').in('source_url', urls);
    const existingUrls = new Set((existingRows || []).map((item) => item.source_url).filter(Boolean));

    for (const item of items) {
      if (existingUrls.has(item.url)) {
        result.skipped += 1;
        continue;
      }

      try {
        const article = await scrapeArticle(item.url);
        const { error: insertError } = await admin.from('blogs').insert({
          title: article.title,
          slug: `${article.slug || 'tin-moi'}-${crypto.randomUUID().slice(0, 8)}`,
          content: article.content,
          excerpt: article.excerpt || null,
          cover_image: article.cover_image || null,
          author: article.author,
          tags: mergeTags(source.default_tags, article.tags),
          source_url: article.source_url,
          source_name: source.name || article.source_name,
          source_published_at: article.source_published_at || item.publishedAt,
          is_auto_import: true,
          is_published: source.auto_publish,
          published_at: source.auto_publish ? new Date().toISOString() : null,
        });

        if (insertError?.code === '23505') {
          result.skipped += 1;
          continue;
        }
        if (insertError) throw new Error(insertError.message);
        result.imported += 1;
        if (source.auto_publish) result.published += 1;
      } catch (error) {
        result.errors.push(`${source.name}: ${errorMessage(error)}`);
      }
    }
    await updateSourceStatus(source.id, result.errors.length > errorStart ? result.errors.slice(-1)[0] : null);
  } catch (error) {
    const message = `${source.name}: ${errorMessage(error)}`;
    result.errors.push(message);
    await updateSourceStatus(source.id, message);
  }
}

async function updateSourceStatus(sourceId: string, lastError: string | null) {
  const admin = createAdminClient();
  await admin.from('news_sources').update({ last_synced_at: new Date().toISOString(), last_error: lastError }).eq('id', sourceId);
}

async function readFeed(feedUrl: string, limit: number): Promise<FeedItem[]> {
  const safeFeedUrl = normalizeSourceUrl(feedUrl);
  const response = await fetch(safeFeedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; PhuongDevContentBot/1.0; +https://phuongdev.io.vn)',
      Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.8',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Không thể đọc RSS (HTTP ${response.status})`);

  const xml = await response.text();
  const $ = cheerio.load(xml, { xmlMode: true });
  const entries = $('item').length ? $('item').toArray() : $('entry').toArray();
  const seen = new Set<string>();
  const items: FeedItem[] = [];

  for (const entry of entries) {
    if (items.length >= Math.min(Math.max(limit, 1), 5)) break;
    const root = $(entry);
    const link = extractFeedLink($, root);
    if (!link) continue;

    let url: string;
    try {
      url = normalizeSourceUrl(link);
    } catch {
      continue;
    }
    if (seen.has(url)) continue;
    seen.add(url);
    items.push({ url, publishedAt: parseFeedDate(root.find('pubDate, published, updated').first().text()) });
  }
  return items;
}

function extractFeedLink($: cheerio.CheerioAPI, root: cheerio.Cheerio<AnyNode>): string {
  const links = root.find('link');
  for (let index = 0; index < links.length; index += 1) {
    const link = links.eq(index);
    const rel = link.attr('rel');
    const href = link.attr('href') || link.text();
    if ((!rel || rel === 'alternate') && href) return href.trim();
  }
  return root.find('guid').first().text().trim() || root.find('id').first().text().trim();
}

function parseFeedDate(value: string): string | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function mergeTags(configured: string[], extracted: string[]): string[] {
  const tags: string[] = [];
  [...configured, ...extracted].forEach((value) => {
    const tag = value.trim().replace(/\s+/g, ' ');
    if (!tag || tag.length > 48 || tags.some((saved) => saved.toLocaleLowerCase('vi') === tag.toLocaleLowerCase('vi'))) return;
    tags.push(tag);
  });
  return tags.slice(0, 8);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Lỗi không xác định.';
}
