import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, User, ArrowLeft, Tag } from 'lucide-react';
import { formatDate } from '@/utils/helpers';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Sinh Metadata SEO động
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const supabase = await createClient();
  const { data: blog } = await supabase
    .from('blogs')
    .select('title, excerpt, cover_image')
    .eq('slug', resolvedParams.slug)
    .single();

  if (!blog) return { title: 'Không tìm thấy bài viết' };

  return {
    title: `${blog.title} | PhuongDev Blog`,
    description: blog.excerpt || blog.title,
    openGraph: {
      images: blog.cover_image ? [blog.cover_image] : [],
    },
  };
}

import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const supabase = await createClient();

  const { data: configRows } = await supabase
    .from('site_config')
    .select('key, value');

  const siteConfig: Record<string, string> = {};
  configRows?.forEach((row) => {
    siteConfig[row.key] = row.value;
  });

  const { data: blog } = await supabase
    .from('blogs')
    .select('*')
    .eq('slug', resolvedParams.slug)
    .single();

  if (!blog) {
    notFound();
  }

  return (
    <div className="bg-white min-h-screen flex flex-col">
      <Navbar />
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
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-500 to-red-400 flex items-center justify-center text-white shadow-sm">
                <User className="w-5 h-5" />
              </div>
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
      </div>
      </article>
      <Footer siteConfig={siteConfig} />
    </div>
  );
}
