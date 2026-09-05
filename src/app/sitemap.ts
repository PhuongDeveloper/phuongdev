import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

import { absoluteUrl } from '@/lib/site-url';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fixedPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/store'), changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteUrl('/services'), changeFrequency: 'weekly', priority: 0.8 },
    { url: absoluteUrl('/blog'), changeFrequency: 'daily', priority: 0.8 },
    { url: absoluteUrl('/about'), changeFrequency: 'monthly', priority: 0.5 },
    { url: absoluteUrl('/community'), changeFrequency: 'weekly', priority: 0.5 },
  ];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return fixedPages;

  try {
    const supabase = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const [{ data: blogs }, { data: products }, { data: services }] = await Promise.all([
      supabase.from('blogs').select('slug, updated_at, cover_image').eq('is_published', true),
      supabase.from('products').select('slug, updated_at, image_url').eq('is_active', true),
      supabase.from('services').select('slug, updated_at, image_url'),
    ]);

    return [
      ...fixedPages,
      ...(blogs || []).map((blog) => ({ url: absoluteUrl(`/blog/${encodeURIComponent(blog.slug)}`), lastModified: blog.updated_at, changeFrequency: 'monthly' as const, priority: 0.7, images: blog.cover_image ? [blog.cover_image] : undefined })),
      ...(products || []).map((product) => ({ url: absoluteUrl(`/store/${encodeURIComponent(product.slug)}`), lastModified: product.updated_at, changeFrequency: 'weekly' as const, priority: 0.8, images: product.image_url ? [product.image_url] : undefined })),
      ...(services || []).map((service) => ({ url: absoluteUrl(`/services/${encodeURIComponent(service.slug)}`), lastModified: service.updated_at, changeFrequency: 'monthly' as const, priority: 0.7, images: service.image_url ? [service.image_url] : undefined })),
    ];
  } catch (error) {
    console.error('[Sitemap] Không thể tải URL động:', error);
    return fixedPages;
  }
}
