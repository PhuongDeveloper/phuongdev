/* ==========================================================================
   Route Handler: Quét nội dung bài báo từ URL
   - Nhận URL bài báo
   - Fetch HTML và parse ra tiêu đề, mô tả, ảnh bìa, nội dung
   ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import type { AnyNode } from 'domhandler';
import { getAdminSession } from '@/lib/auth/admin';

export async function POST(request: NextRequest) {
  try {
    // Dùng cùng phiên Supabase với toàn bộ khu vực admin. Cookie admin_auth cũ
    // không còn tồn tại sau khi chuyển sang xác thực theo user_profiles.is_admin.
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json(
        { error: 'Chưa xác thực. Vui lòng đăng nhập.' },
        { status: 401 }
      );
    }

    const { url } = (await request.json()) as { url?: unknown };
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL không hợp lệ.' },
        { status: 400 }
      );
    }

    let articleUrl: URL;
    try {
      articleUrl = new URL(url);
      if (!['http:', 'https:'].includes(articleUrl.protocol)) throw new Error('unsupported protocol');
    } catch {
      return NextResponse.json({ error: 'URL không hợp lệ.' }, { status: 400 });
    }

    // Fetch HTML từ trang báo
    const response = await fetch(articleUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Không thể truy cập URL (HTTP ${response.status})` },
        { status: 400 }
      );
    }

    const html = await response.text();

    // --- Parse HTML ---
    const $ = cheerio.load(html);

    const title =
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('title').text() ||
      $('h1').first().text() ||
      '';

    const excerpt =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') ||
      '';

    const coverImage =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      '';

    // Tác giả thường không nằm ở một selector cố định giữa các trang báo.
    // Ưu tiên JSON-LD/meta rồi mới dò phần giao diện để tránh lấy nhầm ngày đăng,
    // tên chuyên mục hoặc chữ "Tác giả" thay cho tên thật.
    const author = extractAuthor($) || 'PhuongDev';

    // Nội dung chính
    const content = extractArticleContent($, articleUrl.href);

    // Ảnh trong bài
    const images = extractImages($, articleUrl.href);

    // Slug từ URL
    const slug = generateSlug(articleUrl.href, title);

    return NextResponse.json({
      success: true,
      data: {
        title: cleanText(title),
        excerpt: cleanText(excerpt),
        author,
        cover_image: resolveUrl(coverImage, articleUrl.href),
        content,
        images,
        slug,
        source_url: articleUrl.href,
      },
    });
  } catch (error) {
    console.error('Lỗi scrape:', error);
    const message = error instanceof Error ? error.message : 'Lỗi không xác định khi quét bài viết.';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/* ---------- Helper functions ---------- */

/** Trích xuất nội dung bài viết chính */
function extractArticleContent($: cheerio.CheerioAPI, baseUrl: string): string {
  let contentElement: cheerio.Cheerio<AnyNode> = $('article').first();

  if (!contentElement.length) {
    const selectors = [
      '.article-body', '.article-content', '.post-content', '.entry-content',
      '.content-body', '.detail-content', '.fck_detail', '.main-content',
      '.singular-body', '.cms-body', '.detail__content', '.article__body', '.story-body',
      '[itemprop="articleBody"]', 'main'
    ];
    for (const sel of selectors) {
      if ($(sel).length) {
        contentElement = $(sel).first();
        break;
      }
    }
  }

  let contentHtml = '';
  if (contentElement.length) {
    // 1. Dọn rác an toàn (không dùng wildcard dễ xoá nhầm ảnh)
    contentElement.find('script, style, nav, header, footer, aside, iframe, form, svg, button').remove();
    
    const spamSelectors = [
      '.social-share', '.share-buttons', '.article-share', 
      '.breadcrumb', '.article-tags', 
      '.author-info', '.article-author',
      '.related-news', '.related-articles', '.tin-lien-quan',
      '.comments', '.box-comment', 
      '.advertisement', '.banner-ads', '.ads-content',
      '#social', '#share', '#comments', '#advert'
    ];
    contentElement.find(spamSelectors.join(', ')).remove();

    // 2. Cứu ảnh (xử lý Lazy Load) TRƯỚC KHI unwrap thẻ a
    contentElement.find('img').each((_, el) => {
      // Quét các thuộc tính phổ biến chứa link ảnh thật
      const realSrc = 
        $(el).attr('data-src') || 
        $(el).attr('data-original') || 
        $(el).attr('data-lazy-src') || 
        $(el).attr('srcset')?.split(' ')[0] || 
        $(el).attr('src') || '';
        
      if (realSrc && !realSrc.startsWith('data:') && !realSrc.includes('pixel')) {
        $(el).attr('src', resolveUrl(realSrc, baseUrl));
        // Xoá các thuộc tính rác để tránh nhiễu
        $(el).removeAttr('data-src').removeAttr('data-original').removeAttr('data-lazy-src').removeAttr('srcset');
      } else {
        // Nếu chỉ là ảnh placeholder (data:image) mà không tìm thấy link thật thì mới xoá
        if (realSrc.startsWith('data:')) {
           $(el).remove();
        }
      }
    });

    // 3. Giải quyết liên kết rác và unwrap thẻ <a>
    contentElement.find('a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().toLowerCase().trim();
      
      const isSpam = 
        href.includes('facebook.com') || 
        href.includes('twitter.com') || 
        href.includes('zalo.me') ||
        text === 'bài liên quan' ||
        text === 'đọc thêm' ||
        text === 'xem thêm';
        
      if (isSpam) {
        $(el).remove();
      } else {
        // Gỡ thẻ <a>, giữ lại text/img bên trong
        $(el).replaceWith($(el).html() || '');
      }
    });

    contentHtml = contentElement.html() || '';
  } else {
    // Fallback: body
    $('body').find('script, style, nav, header, footer, aside, iframe, form, noscript, svg, button').remove();
    contentHtml = $('body').html() || '';
  }

  // Cấu hình Turndown (thông minh phân biệt Markdown)
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    strongDelimiter: '**',
  });

  // Bổ sung hỗ trợ giữ lại gạch chân (u) vì MD không hỗ trợ u
  turndownService.keep(['u', 'ins', 'kbd']);

  let markdown = turndownService.turndown(contentHtml);

  // Xóa link rỗng và dọn khoảng trắng thừa
  markdown = markdown.replace(/\[\s*\]\([^\)]+\)/g, '');
  // Xóa ảnh trống (vd: ![]())
  markdown = markdown.replace(/!\[.*?\]\(\s*\)/g, '');
  // Xóa ảnh data base64 do sót lại
  markdown = markdown.replace(/!\[.*?\]\(data:.*?\)/g, '');
  
  markdown = markdown.replace(/\n{3,}/g, '\n\n');
  
  // Dọn các thẻ rác như **** hoặc ** ** do HTML thừa tạo ra
  markdown = markdown.replace(/\*\*[\s\*]*\*\*/g, ''); 
  markdown = markdown.replace(/\*[\s\*]*\*/g, '');

  return markdown.trim();
}

/** Trích xuất tất cả ảnh trong bài */
function extractImages($: cheerio.CheerioAPI, baseUrl: string): string[] {
  const images: string[] = [];
  $('img').each((_, el) => {
    const src = 
      $(el).attr('data-src') || 
      $(el).attr('data-original') || 
      $(el).attr('data-lazy-src') || 
      $(el).attr('srcset')?.split(' ')[0] || 
      $(el).attr('src') || '';
      
    if (src && !src.startsWith('data:') && !src.includes('pixel') && !src.includes('tracking')) {
      images.push(resolveUrl(src, baseUrl));
    }
  });
  return [...new Set(images)].slice(0, 20);
}

/** Trích xuất tên tác giả từ JSON-LD, meta tags và các selector phổ biến. */
function extractAuthor($: cheerio.CheerioAPI): string {
  const jsonLdAuthors: string[] = [];

  const collectJsonLdAuthors = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(collectJsonLdAuthors);
      return;
    }
    if (!value || typeof value !== 'object') return;

    const record = value as Record<string, unknown>;
    if ('author' in record) {
      const author = normalizeAuthorValue(record.author);
      if (author) jsonLdAuthors.push(author);
    }

    // Một số báo bọc Article trong @graph hoặc @value.
    Object.entries(record).forEach(([key, nested]) => {
      if (key === 'author') return;
      if (key === '@graph' || key === 'mainEntity' || key === 'mainEntityOfPage' || key === '@value') {
        collectJsonLdAuthors(nested);
      }
    });
  };

  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).contents().text().trim();
    if (!raw) return;
    try {
      collectJsonLdAuthors(JSON.parse(raw.replace(/^<!--[\s\S]*?-->/, '').trim()));
    } catch {
      // JSON-LD lỗi không được làm hỏng toàn bộ quá trình cào; dùng meta/DOM bên dưới.
    }
  });

  const fromJsonLd = jsonLdAuthors.map(normalizeAuthorText).find(Boolean);
  if (fromJsonLd) return fromJsonLd;

  const metaNames = new Set(['author', 'article:author', 'byl', 'parsely-author', 'dc.creator', 'dcterms.creator']);
  const metaAuthors: string[] = [];
  $('meta').each((_, element) => {
    const key = String($(element).attr('name') || $(element).attr('property') || $(element).attr('itemprop') || '').toLowerCase().trim();
    if (!metaNames.has(key)) return;
    const value = $(element).attr('content') || '';
    const normalized = normalizeAuthorText(value);
    if (normalized) metaAuthors.push(normalized);
  });
  if (metaAuthors[0]) return metaAuthors[0];

  const authorSelectors = [
    '[rel="author"]', '[itemprop="author"]',
    '.author-name', '.author__name', '.author', '.article-author', '.post-author',
    '.author-info', '.byline', '.article__author', '.post__author', '.detail-author',
  ];
  for (const selector of authorSelectors) {
    const elements = $(selector);
    for (let index = 0; index < elements.length; index += 1) {
      const element = elements.eq(index);
      const value = element.attr('content') || element.attr('title') || element.text();
      const normalized = normalizeAuthorText(value);
      if (normalized) return normalized;
    }
  }

  return '';
}

function normalizeAuthorValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.map(normalizeAuthorValue).find(Boolean) || '';
  }
  if (!value || typeof value !== 'object') return '';
  const record = value as Record<string, unknown>;
  if (typeof record.name === 'string') return record.name;
  const givenName = typeof record.givenName === 'string' ? record.givenName : '';
  const familyName = typeof record.familyName === 'string' ? record.familyName : '';
  return `${givenName} ${familyName}`.trim();
}

function normalizeAuthorText(value: string): string {
  const text = cleanText(value)
    .replace(/\s+/g, ' ')
    .replace(/^[|·•\-–—]+|[|·•\-–—]+$/g, '')
    .trim();
  if (!text || /^https?:\/\//i.test(text) || text.length > 120) return '';

  const withoutLabel = text.replace(/^(?:tác\s*giả|author|by|viết\s*bởi|written\s+by|theo)\s*[:\-–—]?\s*/i, '').trim();
  if (!withoutLabel || /^(?:tác\s*giả|author|by|admin|unknown|n\/a)$/i.test(withoutLabel)) return '';
  return withoutLabel.slice(0, 120);
}

/** Resolve URL tương đối thành URL tuyệt đối */
function resolveUrl(src: string, baseUrl: string): string {
  if (!src) return '';
  try {
    return new URL(src, baseUrl).href;
  } catch {
    return src;
  }
}

/** Tạo slug từ URL hoặc tiêu đề */
function generateSlug(url: string, title: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && lastPart.length > 3) {
      return lastPart.replace(/\.html?$/i, '').replace(/[^a-z0-9-]/gi, '-').toLowerCase();
    }
  } catch { /* ignore */ }

  // Fallback: tạo slug từ title
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80)
    .trim();
}

/** Dọn dẹp text */
function cleanText(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}
