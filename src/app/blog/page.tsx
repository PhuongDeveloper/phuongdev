import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, User, ArrowRight } from 'lucide-react';
import { formatDate } from '@/utils/helpers';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata = {
  title: 'Blog Công Nghệ | PhuongDev',
  description: 'Chia sẻ kiến thức, kinh nghiệm lập trình và công nghệ mới nhất.',
};

export default async function BlogPage() {
  const supabase = await createClient();

  const { data: configRows } = await supabase
    .from('site_config')
    .select('key, value');

  const siteConfig: Record<string, string> = {};
  configRows?.forEach((row) => {
    siteConfig[row.key] = row.value;
  });

  const { data: blogs } = await supabase
    .from('blogs')
    .select('*')
    .order('published_at', { ascending: false });

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col">
      <Navbar />
      <div className="pt-32 pb-20 flex-1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            Blog <span className="text-rose-600">Công Nghệ</span>
          </h1>
          <p className="text-lg text-slate-600">
            Nơi chia sẻ kiến thức, thủ thuật và kinh nghiệm thực chiến trong lĩnh vực phát triển phần mềm.
          </p>
        </div>

        {/* Danh sách Blog */}
        {blogs && blogs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogs.map((blog) => (
              <Link key={blog.id} href={`/blog/${blog.slug}`} className="group h-full">
                <article className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300 h-full flex flex-col">
                  {/* Ảnh bìa */}
                  <div className="relative w-full h-56 bg-slate-200 overflow-hidden">
                    {blog.cover_image ? (
                      <Image
                        src={blog.cover_image}
                        alt={blog.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-slate-400 bg-slate-100">
                        <span className="text-sm">Không có ảnh bìa</span>
                      </div>
                    )}
                    {/* Badge Ngày đăng */}
                    {blog.published_at && (
                      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 shadow-sm flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-rose-500" />
                        {formatDate(blog.published_at)}
                      </div>
                    )}
                  </div>
                  
                  {/* Nội dung Card */}
                  <div className="p-6 flex-1 flex flex-col">
                    {/* Tags */}
                    {blog.tags && blog.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {blog.tags.slice(0, 3).map((tag: string) => (
                          <span key={tag} className="text-xs font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <h2 className="text-xl font-bold text-slate-900 mb-3 line-clamp-2 group-hover:text-rose-600 transition-colors">
                      {blog.title}
                    </h2>
                    
                    <p className="text-slate-600 text-sm mb-6 line-clamp-3 flex-1">
                      {blog.excerpt || 'Đang cập nhật mô tả...'}
                    </p>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500 to-red-400 flex items-center justify-center text-white">
                          <User className="w-4 h-4" />
                        </div>
                        {blog.author}
                      </div>
                      <span className="text-rose-600 font-medium text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                        Đọc tiếp <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Chưa có bài viết nào</h3>
            <p className="text-slate-500">Các bài viết mới sẽ sớm được cập nhật tại đây.</p>
          </div>
        )}

      </div>
      </div>
      <Footer siteConfig={siteConfig} />
    </div>
  );
}
