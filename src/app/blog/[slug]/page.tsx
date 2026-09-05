import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, User, ArrowLeft, ExternalLink, ShoppingBag, Tag } from 'lucide-react';
import { formatDate } from '@/utils/helpers';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { absoluteUrl } from '@/lib/site-url';

// Sinh Metadata SEO động
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const supabase = await createClient();
  const { data: blog } = await supabase
    .from('blogs')
    .select('title, excerpt, cover_image, author, tags, published_at, updated_at')
    .eq('slug', resolvedParams.slug)
    .eq('is_published', true)
    .single();

  if (!blog) return { title: 'Không tìm thấy bài viết', robots: { index: false, follow: false } };

  const description = makeSeoDescription(blog.excerpt, blog.title);
  const canonical = `/blog/${encodeURIComponent(resolvedParams.slug)}`;

  return {
    title: blog.title,
    description,
    authors: [{ name: blog.author }],
    keywords: blog.tags || [],
    alternates: { canonical },
    openGraph: {
      type: 'article',
      url: canonical,
      title: blog.title,
      description,
      images: blog.cover_image ? [blog.cover_image] : [],
      publishedTime: blog.published_at || undefined,
      modifiedTime: blog.updated_at,
      authors: [blog.author],
      tags: blog.tags || [],
    },
    twitter: { card: 'summary_large_image', title: blog.title, description, images: blog.cover_image ? [blog.cover_image] : [] },
  };
}

import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ViewTracker from '@/components/ui/ViewTracker';

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const supabase = await createClient();

  const [{ data: configRows }, { data: blog }, { data: featuredProducts }] = await Promise.all([
    supabase.from('site_config').select('key, value'),
    supabase.from('blogs').select('*').eq('slug', resolvedParams.slug).eq('is_published', true).single(),
    supabase.from('products').select('title, slug, description, price, image_url').eq('is_active', true).eq('is_featured', true).order('sort_order', { ascending: true }).limit(3),
  ]);

  const siteConfig: Record<string, string> = {};
  configRows?.forEach((row) => {
    siteConfig[row.key] = row.value;
  });

  if (!blog) {
    notFound();
  }

  const publishedAt = blog.published_at || blog.created_at;
  const description = makeSeoDescription(blog.excerpt, blog.title);
  const structuredData = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: blog.title,
    description,
    image: blog.cover_image ? [blog.cover_image] : undefined,
    datePublished: publishedAt,
    dateModified: blog.updated_at,
    inLanguage: 'vi-VN',
    author: { '@type': 'Person', name: blog.author },
    publisher: { '@type': 'Organization', name: 'PhuongDev', url: absoluteUrl('/') },
    mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(`/blog/${encodeURIComponent(blog.slug)}`) },
    keywords: blog.tags?.join(', '),
  }).replace(/</g, '\\u003c');

  return (
    <div className="bg-white min-h-screen flex flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
      <ViewTracker table="blogs" slug={blog.slug} />
      <Navbar siteConfig={siteConfig} />
      <article className="pt-24 pb-20 flex-1">
        {/* Cover Image Header */}
      {blog.cover_image && (
        <div className="w-full h-[40vh] md:h-[50vh] relative mb-12">
          <Image
            src={blog.cover_image}
            alt={blog.title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent"></div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10">
        
        {/* Nút quay lại */}
        <Link href="/blog" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-8 font-medium transition-colors bg-black/20 px-4 py-2 rounded-full backdrop-blur-md">
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
        </Link>

        {/* Bài viết Header */}
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl shadow-slate-200/50 border border-slate-100 mb-12">
          {blog.tags && blog.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {blog.tags.map((tag: string) => (
                <span key={tag} className="flex items-center gap-1.5 text-sm font-semibold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg">
                  <Tag className="w-3.5 h-3.5" /> {tag}
                </span>
              ))}
            </div>
          )}
          
          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-6 leading-tight">
            {blog.title}
          </h1>

          <div className="flex flex-wrap items-center gap-6 text-slate-600 font-medium">
            <div className="flex items-center gap-2.5">
              {siteConfig.avt_url || siteConfig.avatar_url || siteConfig.author_avatar ? (
                <img
                  src={siteConfig.avt_url || siteConfig.avatar_url || siteConfig.author_avatar}
                  alt={blog.author}
                  className="w-10 h-10 rounded-full object-cover shadow-sm border border-slate-100"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-500 to-red-400 flex items-center justify-center text-white shadow-sm">
                  <User className="w-5 h-5" />
                </div>
              )}
              <span className="text-slate-900">{blog.author}</span>
            </div>
            {blog.published_at && (
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-slate-400" />
                {formatDate(blog.published_at)}
              </div>
            )}
          </div>
        </div>

        {/* Bài viết Content (Markdown) */}
        <div className="prose prose-lg prose-slate prose-headings:font-bold prose-headings:text-slate-900 prose-a:text-rose-600 hover:prose-a:text-rose-700 prose-img:rounded-2xl prose-img:shadow-lg max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {blog.content}
          </ReactMarkdown>
        </div>

        {blog.source_url && <p className="mt-8 flex items-center gap-2 border-l-2 border-slate-200 pl-4 text-sm text-slate-500"><ExternalLink className="h-4 w-4 shrink-0" />Nguồn tham khảo: <a href={blog.source_url} target="_blank" rel="noreferrer" className="truncate text-rose-600 hover:text-rose-700">{blog.source_name || blog.source_url}</a></p>}

        <section aria-labelledby="related-products-title" className="mt-12 rounded-3xl border border-rose-100 bg-gradient-to-br from-rose-50 via-white to-amber-50 p-6 md:p-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-600">Giải pháp thực hành</p><h2 id="related-products-title" className="mt-2 text-2xl font-bold text-slate-900">Cần tool hoặc source để triển khai nhanh?</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Khám phá các sản phẩm số, source code và công cụ hỗ trợ từ PhuongDev.</p></div>
            <Link href="/store" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"><ShoppingBag className="h-4 w-4" />Xem cửa hàng</Link>
          </div>
          {featuredProducts && featuredProducts.length > 0 && <div className="mt-6 grid gap-3 md:grid-cols-3">{featuredProducts.map((product) => <Link key={product.slug} href={`/store/${product.slug}`} className="rounded-2xl border border-white bg-white/90 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><p className="line-clamp-2 font-semibold text-slate-900">{product.title}</p><p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{product.description}</p><p className="mt-3 text-sm font-bold text-rose-600">{Number(product.price).toLocaleString('vi-VN')}đ</p></Link>)}</div>}
        </section>
      </div>
      </article>
      <Footer siteConfig={siteConfig} />
    </div>
  );
}

function makeSeoDescription(excerpt: string | null, title: string): string {
  const text = (excerpt || title).replace(/\s+/g, ' ').trim();
  if (text.length <= 165) return text;
  const breakAt = text.slice(0, 164).lastIndexOf(' ');
  return `${text.slice(0, breakAt > 80 ? breakAt : 164).trim()}…`;
}
