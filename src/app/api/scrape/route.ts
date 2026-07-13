/* ==========================================================================
   Route Handler: Quét nội dung bài báo từ URL
   - Nhận URL bài báo
   - Fetch HTML và parse ra tiêu đề, mô tả, ảnh bìa, nội dung
   ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

export async function POST(request: NextRequest) {
  try {
    // Kiểm tra xác thực
    const adminAuthCookie = request.cookies.get('admin_auth');
    if (adminAuthCookie?.value !== 'phuongdev') {
      return NextResponse.json(
        { error: 'Chưa xác thực. Vui lòng đăng nhập.' },
        { status: 401 }
      );
    }

    const { url } = await request.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL không hợp lệ.' },
        { status: 400 }
      );
    }

    // Fetch HTML từ trang báo
    const response = await fetch(url, {
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

    // Nội dung chính
    const content = extractArticleContent($, url);

    // Ảnh trong bài
    const images = extractImages($, url);

    // Slug từ URL
    const slug = generateSlug(url, title);

    return NextResponse.json({
      success: true,
      data: {
        title: cleanText(title),
        excerpt: cleanText(excerpt),
        cover_image: resolveUrl(coverImage, url),
        content,
        images,
        slug,
        source_url: url,
      },
    });
  } catch (error: any) {
    console.error('Lỗi scrape:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi không xác định khi quét bài viết.' },
      { status: 500 }
    );
  }
}

/* ---------- Helper functions ---------- */

/** Trích xuất nội dung bài viết chính */
function extractArticleContent($: cheerio.CheerioAPI, baseUrl: string): string {
  let contentElement: any = $('article').first();

  if (!contentElement.length) {
    const selectors = [
      '.article-body', '.article-content', '.post-content', '.entry-content',
      '.content-body', '.detail-content', '.fck_detail', '.main-content',
      '.singular-body', '.cms-body', '.detail__content', '.article__body', '.story-body'
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
    contentElement.find('img').each((_: any, el: any) => {
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
    contentElement.find('a').each((_: any, el: any) => {
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
  $('img').each((_: any, el: any) => {
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

/** Resolve URL tương đối thành URL tuyệt đối */
function resolveUrl(src: string, baseUrl: string): string {
  if (!src) return '';
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  if (src.startsWith('//')) return 'https:' + src;
  try {
    const base = new URL(baseUrl);
    if (src.startsWith('/')) {
      return `${base.protocol}//${base.host}${src}`;
    }
    return `${base.protocol}//${base.host}/${src}`;
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
