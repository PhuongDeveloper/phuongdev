import 'server-only';

import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import TurndownService from 'turndown';

export type ScrapedArticle = {
  title: string;
  excerpt: string;
  author: string;
  cover_image: string;
  content: string;
  images: string[];
  tags: string[];
  reading_time_minutes: number;
  slug: string;
  source_url: string;
  source_name: string;
  source_published_at: string | null;
};

type JsonRecord = Record<string, unknown>;

type ExtractedBody = {
  content: string;
  images: string[];
};

const ARTICLE_SELECTORS = [
  '[itemprop="articleBody"]',
  '.article-body', '.article-content', '.article__body', '.article__content',
  '.post-content', '.post__content', '.entry-content', '.entry__content',
  '.content-body', '.detail-content', '.detail__content', '.fck_detail',
  '.singular-body', '.cms-body', '.story-body', '.main-content',
  'article', 'main',
];

const REMOVABLE_SELECTORS = [
  'script', 'style', 'noscript', 'nav', 'header', 'footer', 'aside', 'iframe', 'form', 'svg', 'button',
  '.social-share', '.share-buttons', '.article-share', '.breadcrumb', '.article-tags',
  '.author-info', '.article-author', '.related-news', '.related-articles', '.tin-lien-quan',
  '.comments', '.box-comment', '.advertisement', '.banner-ads', '.ads-content',
  '[class*="advert"]', '[class*="advertisement"]', '[id*="advert"]', '[id*="banner"]',
  '#social', '#share', '#comments', '#advert',
];

const TRACKING_PARAMS = new Set(['fbclid', 'gclid', 'dclid', 'mc_cid', 'mc_eid', 'igshid']);

/** Cào một bài viết thành dữ liệu sẵn sàng lưu/xuất bản. */
export async function scrapeArticle(inputUrl: string): Promise<ScrapedArticle> {
  const articleUrl = parseRemoteUrl(inputUrl);
  const response = await fetch(articleUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; PhuongDevContentBot/1.0; +https://phuongdev.io.vn)',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) throw new Error(`Không thể truy cập URL (HTTP ${response.status})`);

  const finalUrl = parseRemoteUrl(response.url || articleUrl.href);
  const html = await response.text();
  const $ = cheerio.load(html);
  const jsonLdRecords = getJsonLdRecords($);
  const articleRecords = jsonLdRecords.filter(isArticleRecord);
  const extractedBody = extractArticleBody($, finalUrl.href);

  const title = cleanText(
    getMeta($, 'property', 'og:title')
      || getMeta($, 'name', 'twitter:title')
      || getJsonLdText(articleRecords, ['headline', 'name'])
      || $('h1').first().text()
      || $('title').text(),
  );
  if (!title) throw new Error('Không tìm thấy tiêu đề bài viết.');

  const rawDescription = getMeta($, 'property', 'og:description')
    || getMeta($, 'name', 'description')
    || getMeta($, 'name', 'twitter:description')
    || getJsonLdText(articleRecords, ['description']);
  const coverImage = resolveUrl(
    getMeta($, 'property', 'og:image')
      || getMeta($, 'name', 'twitter:image')
      || getJsonLdText(articleRecords, ['image', 'thumbnailUrl'])
      || extractedBody.images[0]
      || '',
    finalUrl.href,
  );
  const sourceName = finalUrl.hostname.replace(/^www\./i, '');
  const author = extractAuthor($, articleRecords) || sourceName;
  const sourcePublishedAt = extractPublishedAt($, articleRecords);

  return {
    title,
    excerpt: createExcerpt(rawDescription, extractedBody.content, title),
    author,
    cover_image: coverImage,
    content: extractedBody.content,
    images: extractedBody.images,
    tags: extractTags($, articleRecords),
    reading_time_minutes: calculateReadingTime(extractedBody.content),
    slug: generateSlug(finalUrl.href, title),
    source_url: normalizeSourceUrl(finalUrl.href),
    source_name: sourceName,
    source_published_at: sourcePublishedAt,
  };
}

/** Chuẩn hóa URL để một bài từ RSS/social không bị nhập lặp do tracking params. */
export function normalizeSourceUrl(input: string): string {
  const url = parseRemoteUrl(input);
  url.hash = '';
  [...url.searchParams.keys()].forEach((key) => {
    if (key.toLowerCase().startsWith('utm_') || TRACKING_PARAMS.has(key.toLowerCase())) {
      url.searchParams.delete(key);
    }
  });
  return url.href;
}

function parseRemoteUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error('URL không hợp lệ.');
  }
  if (!['http:', 'https:'].includes(url.protocol) || isPrivateHostname(url.hostname)) {
    throw new Error('URL nguồn không được hỗ trợ.');
  }
  return url;
}

function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host === '::1' || host.endsWith('.local')) return true;
  if (/^127\./.test(host) || /^0\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return true;
  const match = host.match(/^172\.(\d{1,3})\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}

function getMeta($: cheerio.CheerioAPI, attribute: 'name' | 'property', value: string): string {
  const target = value.toLowerCase();
  let result = '';
  $('meta').each((_, element) => {
    if (result) return;
    if ($(element).attr(attribute)?.toLowerCase() === target) result = $(element).attr('content') || '';
  });
  return result;
}

function getJsonLdRecords($: cheerio.CheerioAPI): JsonRecord[] {
  const records: JsonRecord[] = [];
  const collect = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }
    if (!value || typeof value !== 'object') return;
    const record = value as JsonRecord;
    records.push(record);
    if (record['@graph']) collect(record['@graph']);
  };

  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).contents().text().trim().replace(/^<!--\s*|\s*-->$/g, '');
    if (!raw) return;
    try {
      collect(JSON.parse(raw));
    } catch {
      // Trang nguồn có JSON-LD lỗi vẫn có thể cào qua meta/HTML.
    }
  });
  return records;
}

function isArticleRecord(record: JsonRecord): boolean {
  const type = record['@type'];
  const values = Array.isArray(type) ? type : [type];
  return values.some((value) => typeof value === 'string' && /article|newsarticle|blogposting/i.test(value));
}

function getJsonLdText(records: JsonRecord[], fields: string[]): string {
  for (const record of records) {
    for (const field of fields) {
      const value = normalizeTextValue(record[field]);
      if (value) return value;
    }
  }
  return '';
}

function normalizeTextValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(normalizeTextValue).find(Boolean) || '';
  if (!value || typeof value !== 'object') return '';
  const record = value as JsonRecord;
  return typeof record.url === 'string' ? record.url : typeof record.name === 'string' ? record.name : '';
}

function extractArticleBody($: cheerio.CheerioAPI, baseUrl: string): ExtractedBody {
  const element = selectPrimaryContent($).clone();
  element.find(REMOVABLE_SELECTORS.join(', ')).remove();

  element.find('h1').first().remove();
  element.find('img').each((_, image) => {
    const src = getImageSource($(image));
    if (!src || src.startsWith('data:') || /(?:pixel|tracking|spacer|blank)\b/i.test(src)) {
      $(image).remove();
      return;
    }
    $(image).attr('src', resolveUrl(src, baseUrl));
    $(image).removeAttr('srcset').removeAttr('data-src').removeAttr('data-original').removeAttr('data-lazy-src').removeAttr('data-url');
  });

  element.find('figcaption').each((_, caption) => {
    const text = cleanText($(caption).text());
    if (!text) {
      $(caption).remove();
      return;
    }
    $(caption).replaceWith($('<p>').append($('<em>').text(text)));
  });

  element.find('a').each((_, link) => {
    const href = $(link).attr('href') || '';
    const text = cleanText($(link).text());
    const hasImage = $(link).find('img').length > 0;
    if (!href || href.startsWith('#')) {
      if (!text && !hasImage) $(link).remove();
      else $(link).replaceWith($(link).html() || '');
      return;
    }
    if (/(?:facebook\.com|twitter\.com|x\.com|zalo\.me|tiktok\.com)\b/i.test(href)) {
      $(link).remove();
      return;
    }
    $(link).attr('href', resolveUrl(href, baseUrl));
  });

  const images = collectImages($, element, baseUrl);
  const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', emDelimiter: '*', strongDelimiter: '**' });
  turndown.keep(['u', 'ins', 'kbd']);
  const content = cleanMarkdown(turndown.turndown(element.html() || ''));
  if (content.length < 160) throw new Error('Nội dung bài viết quá ngắn hoặc không thể trích xuất.');
  return { content, images };
}

function selectPrimaryContent($: cheerio.CheerioAPI): cheerio.Cheerio<AnyNode> {
  const candidates = new Set<AnyNode>();
  ARTICLE_SELECTORS.forEach((selector) => $(selector).each((_, element) => { candidates.add(element); }));
  if (candidates.size === 0) return $('body').first();

  let best: AnyNode | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  candidates.forEach((element) => {
    const candidate = $(element);
    const textLength = cleanText(candidate.text()).length;
    const paragraphs = candidate.find('p').length;
    const headings = candidate.find('h2,h3,h4').length;
    const imageCount = candidate.find('img').length;
    const linkTextLength = cleanText(candidate.find('a').text()).length;
    const boilerplate = candidate.find(REMOVABLE_SELECTORS.join(', ')).length;
    const linkRatio = textLength ? linkTextLength / textLength : 1;
    const score = Math.min(textLength, 14_000) + paragraphs * 180 + headings * 120 + imageCount * 30 - linkRatio * 1_000 - boilerplate * 240;
    if (score > bestScore) {
      bestScore = score;
      best = element;
    }
  });
  return best ? $(best) : $('body').first();
}

function getImageSource(image: cheerio.Cheerio<AnyNode>): string {
  return image.attr('data-src') || image.attr('data-original') || image.attr('data-lazy-src') || image.attr('data-url') || selectLargestSrcset(image.attr('srcset') || '') || image.attr('src') || '';
}

function selectLargestSrcset(srcset: string): string {
  if (!srcset) return '';
  return srcset
    .split(',')
    .map((entry) => {
      const [url, descriptor = '0w'] = entry.trim().split(/\s+/, 2);
      const width = Number.parseInt(descriptor, 10) || 0;
      return { url, width };
    })
    .sort((a, b) => b.width - a.width)[0]?.url || '';
}

function collectImages($: cheerio.CheerioAPI, element: cheerio.Cheerio<AnyNode>, baseUrl: string): string[] {
  const images = new Set<string>();
  element.find('img').each((_, image) => {
    const src = $(image).attr('src') || '';
    if (src) images.add(resolveUrl(src, baseUrl));
  });
  return [...images].slice(0, 20);
}

function extractAuthor($: cheerio.CheerioAPI, articleRecords: JsonRecord[]): string {
  for (const record of articleRecords) {
    const author = normalizeAuthorValue(record.author);
    if (author) return normalizeAuthorText(author);
  }

  const authorMetaNames = new Set(['author', 'article:author', 'byl', 'parsely-author', 'dc.creator', 'dcterms.creator']);
  let metaAuthor = '';
  $('meta').each((_, element) => {
    if (metaAuthor) return;
    const key = String($(element).attr('name') || $(element).attr('property') || $(element).attr('itemprop') || '').toLowerCase().trim();
    if (authorMetaNames.has(key)) metaAuthor = normalizeAuthorText($(element).attr('content') || '');
  });
  if (metaAuthor) return metaAuthor;

  const selectors = ['[rel="author"]', '[itemprop="author"]', '.author-name', '.author__name', '.author', '.article-author', '.post-author', '.author-info', '.byline', '.article__author', '.post__author', '.detail-author'];
  for (const selector of selectors) {
    const elements = $(selector);
    for (let index = 0; index < elements.length; index += 1) {
      const element = elements.eq(index);
      const author = normalizeAuthorText(element.attr('content') || element.attr('title') || element.text());
      if (author) return author;
    }
  }
  return '';
}

function normalizeAuthorValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(normalizeAuthorValue).find(Boolean) || '';
  if (!value || typeof value !== 'object') return '';
  const record = value as JsonRecord;
  if (typeof record.name === 'string') return record.name;
  const givenName = typeof record.givenName === 'string' ? record.givenName : '';
  const familyName = typeof record.familyName === 'string' ? record.familyName : '';
  return `${givenName} ${familyName}`.trim();
}

function normalizeAuthorText(value: string): string {
  const text = cleanText(value).replace(/\s+/g, ' ').replace(/^[|·•\-–—]+|[|·•\-–—]+$/g, '').trim();
  if (!text || /^https?:\/\//i.test(text) || text.length > 120) return '';
  const author = text.replace(/^(?:tác\s*giả|author|by|viết\s*bởi|written\s+by|theo)\s*[:\-–—]?\s*/i, '').trim();
  return !author || /^(?:tác\s*giả|author|by|admin|unknown|n\/a)$/i.test(author) ? '' : author.slice(0, 120);
}

function extractPublishedAt($: cheerio.CheerioAPI, articleRecords: JsonRecord[]): string | null {
  const candidate = getJsonLdText(articleRecords, ['datePublished', 'dateCreated', 'dateModified'])
    || getMeta($, 'property', 'article:published_time')
    || getMeta($, 'name', 'date')
    || $('time[datetime]').first().attr('datetime')
    || '';
  const date = new Date(candidate);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function extractTags($: cheerio.CheerioAPI, articleRecords: JsonRecord[]): string[] {
  const candidates: string[] = [];
  $('meta').each((_, element) => {
    const key = String($(element).attr('name') || $(element).attr('property') || '').toLowerCase();
    if (['keywords', 'news_keywords', 'article:tag', 'article:section'].includes(key)) candidates.push($(element).attr('content') || '');
  });
  articleRecords.forEach((record) => {
    candidates.push(normalizeTextValue(record.keywords));
    candidates.push(normalizeTextValue(record.articleSection));
  });

  const tags: string[] = [];
  candidates
    .flatMap((candidate) => candidate.split(/[,;|]/))
    .map((tag) => cleanText(tag).replace(/\s+/g, ' ').trim())
    .forEach((tag) => {
      const normalized = tag.toLocaleLowerCase('vi');
      if (tag.length < 2 || tag.length > 48 || tags.some((saved) => saved.toLocaleLowerCase('vi') === normalized)) return;
      tags.push(tag);
    });
  return tags.slice(0, 8);
}

function createExcerpt(rawDescription: string, markdown: string, title: string): string {
  const fromMeta = cleanText(rawDescription);
  const contentCandidate = markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .split(/\n+/)
    .map((line) => cleanText(line.replace(/^#{1,6}\s+/, '')))
    .find((line) => line.length >= 70 && line !== title) || title;
  return trimSnippet(fromMeta.length >= 55 ? fromMeta : contentCandidate, 165);
}

function trimSnippet(value: string, maximum: number): string {
  const text = cleanText(value).replace(/\s+/g, ' ');
  if (text.length <= maximum) return text;
  const cut = text.slice(0, maximum - 1).lastIndexOf(' ');
  return `${text.slice(0, cut > 80 ? cut : maximum - 1).trim()}…`;
}

function calculateReadingTime(markdown: string): number {
  const words = markdown.replace(/[`#>*_\-!\[\]()]/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function generateSlug(url: string, title: string): string {
  try {
    const lastPart = new URL(url).pathname.split('/').filter(Boolean).pop();
    if (lastPart && lastPart.length > 3) return lastPart.replace(/\.html?$/i, '').replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  } catch {
    // Dùng tiêu đề khi URL không có path phù hợp.
  }
  return title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 80).replace(/^-|-$/g, '');
}

function resolveUrl(src: string, baseUrl: string): string {
  if (!src) return '';
  try {
    return new URL(src, baseUrl).href;
  } catch {
    return src;
  }
}

function cleanMarkdown(markdown: string): string {
  return markdown.replace(/\u00a0/g, ' ').replace(/\n{3,}/g, '\n\n').replace(/^[ \t]+$/gm, '').trim();
}

function cleanText(text: string): string {
  return text.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').trim();
}
