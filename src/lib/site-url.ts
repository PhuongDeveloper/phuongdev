const FALLBACK_SITE_URL = 'https://phuongdev.io.vn';

/** URL công khai duy nhất, dùng chung cho canonical, sitemap và dữ liệu schema.org. */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || FALLBACK_SITE_URL;
  try {
    const url = new URL(configured);
    return url.origin;
  } catch {
    return FALLBACK_SITE_URL;
  }
}

export function absoluteUrl(pathname = '/'): string {
  return new URL(pathname, getSiteUrl()).href;
}
