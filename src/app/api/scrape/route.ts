/* ==========================================================================
   Route Handler: Quét nội dung bài báo từ URL
   - Nhận URL bài báo
   - Fetch HTML và parse ra tiêu đề, mô tả, ảnh bìa, nội dung
   ========================================================================== */

import { NextRequest, NextResponse } from 'next/server';

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

    // --- Parse HTML bằng regex (server-side, không cần DOM parser) ---

    // Tiêu đề: ưu tiên og:title > title tag > h1
    const title =
      extractMeta(html, 'og:title') ||
      extractMeta(html, 'twitter:title') ||
      extractTagContent(html, 'title') ||
      extractFirstTag(html, 'h1') ||
      '';

    // Mô tả: ưu tiên og:description > meta description
    const excerpt =
      extractMeta(html, 'og:description') ||
      extractMetaName(html, 'description') ||
      extractMeta(html, 'twitter:description') ||
      '';

    // Ảnh bìa: ưu tiên og:image > twitter:image
    const coverImage =
      extractMeta(html, 'og:image') ||
      extractMeta(html, 'twitter:image') ||
      '';

    // Nội dung chính: trích xuất từ thẻ article, hoặc các thẻ nội dung phổ biến
    const content = extractArticleContent(html);

    // Ảnh trong bài
    const images = extractImages(html, url);

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

/** Trích xuất nội dung meta property (og:*, twitter:*) */
function extractMeta(html: string, property: string): string {
  const regex = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
    'i'
  );
  const match = html.match(regex);
  if (match) return match[1];

  // Thử thứ tự ngược (content trước property)
  const regex2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
    'i'
  );
  const match2 = html.match(regex2);
  return match2 ? match2[1] : '';
}

/** Trích xuất meta name */
function extractMetaName(html: string, name: string): string {
  return extractMeta(html, name);
}

/** Trích xuất nội dung thẻ HTML (ví dụ: <title>) */
function extractTagContent(html: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, 'i');
  const match = html.match(regex);
  return match ? match[1].trim() : '';
}

/** Trích xuất nội dung thẻ đầu tiên (h1, h2...) */
function extractFirstTag(html: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 'is');
  const match = html.match(regex);
  return match ? match[1].replace(/<[^>]+>/g, '').trim() : '';
}

/** Trích xuất nội dung bài viết chính */
function extractArticleContent(html: string): string {
  // Thử tìm thẻ <article>
  let contentHtml = '';

  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch) {
    contentHtml = articleMatch[1];
  } else {
    // Thử tìm các class phổ biến cho nội dung bài báo
    const contentSelectors = [
      /class=["'][^"']*(?:article-body|article-content|post-content|entry-content|content-body|detail-content|fck_detail|main-content)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
      /class=["'][^"']*(?:singular-body|cms-body|detail__content|article__body|story-body)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    ];

    for (const selector of contentSelectors) {
      const match = html.match(selector);
      if (match) {
        contentHtml = match[1];
        break;
      }
    }
  }

  if (!contentHtml) {
    // Fallback: lấy tất cả nội dung trong body, loại bỏ script/style
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    contentHtml = bodyMatch ? bodyMatch[1] : '';
  }

  // Chuyển HTML sang dạng text đơn giản (giống Markdown)
  return htmlToMarkdown(contentHtml);
}

/** Chuyển đổi HTML sang Markdown đơn giản */
function htmlToMarkdown(html: string): string {
  let text = html;

  // 1. Xoá các khối HTML thường chứa nội dung rác bằng class/id (breadcrumb, social, tags, author, related)
  text = text.replace(/<[^>]+(?:class|id)=["'][^"']*(?:social|share|breadcrumb|tags|author|related|comment|advert)[^"']*["'][^>]*>[\s\S]*?<\/[a-z]+>/gi, '');

  // 2. Xoá các thẻ không cần thiết
  text = text.replace(/<(script|style|nav|header|footer|aside|iframe|form|noscript|svg|button)[^>]*>[\s\S]*?<\/\1>/gi, '');

  // Xoá các comment HTML
  text = text.replace(/<!--[\s\S]*?-->/g, '');

  // Headings
  text = text.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n');
  text = text.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n');
  text = text.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n');
  text = text.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n');

  // Bold & Italic
  text = text.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**');
  text = text.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*');

  // Images
  text = text.replace(/<img[^>]+src=["']([^"']+)["'][^>]*alt=["']([^"']*?)["'][^>]*\/?>/gi, '\n![$2]($1)\n');
  text = text.replace(/<img[^>]+alt=["']([^"']*?)["'][^>]*src=["']([^"']+)["'][^>]*\/?>/gi, '\n![$1]($2)\n');
  text = text.replace(/<img[^>]+src=["']([^"']+)["'][^>]*\/?>/gi, '\n![]($1)\n');

  // Links (Lọc link chia sẻ MXH và link rỗng)
  text = text.replace(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (match, url, linkText) => {
    if (url.includes('facebook.com/sharer') || url.includes('twitter.com/intent') || url.includes('zalo.me/share')) {
      return '';
    }
    const cleanLinkText = linkText.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (!cleanLinkText) return '';
    return `[${cleanLinkText}](${url})`;
  });

  // Paragraphs & line breaks
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<p[^>]*>/gi, '');

  // Lists
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');
  text = text.replace(/<\/?(?:ul|ol)[^>]*>/gi, '\n');

  // Blockquote
  text = text.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '\n> $1\n');

  // Code blocks
  text = text.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '\n```\n$1\n```\n');
  text = text.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');

  // Horizontal rule
  text = text.replace(/<hr[^>]*\/?>/gi, '\n---\n');

  // Xoá tất cả các thẻ HTML còn lại
  text = text.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));

  // Xóa các link rỗng (chỉ có link mà không có text)
  text = text.replace(/\[\s*\]\([^\)]+\)/g, '');

  // Dọn dẹp khoảng trắng
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.trim();

  return text;
}

/** Trích xuất tất cả ảnh trong bài */
function extractImages(html: string, baseUrl: string): string[] {
  const images: string[] = [];
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const src = resolveUrl(match[1], baseUrl);
    if (src && !src.includes('data:') && !src.includes('pixel') && !src.includes('tracking')) {
      images.push(src);
    }
  }
  // Loại bỏ trùng lặp
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
