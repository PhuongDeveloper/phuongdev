/* ==========================================================================
   Home Blogs - Hiển thị Blog mới nhất trên Trang chủ
   ========================================================================== */

'use client';

import { motion, type Variants } from 'framer-motion';
import { ArrowRight, Clock, CalendarDays, Eye } from 'lucide-react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import { type Blog } from '@/lib/types/database';
import { formatDate, truncateText } from '@/utils/helpers';

interface HomeBlogsProps {
  blogs: Blog[];
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export default function HomeBlogs({ blogs }: HomeBlogsProps) {
  if (!blogs || blogs.length === 0) return null;

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Blog & Kiến Thức
            </h2>
            <p className="text-lg text-slate-600">
              Chia sẻ những bài viết mới nhất về công nghệ, lập trình và kinh nghiệm phát triển phần mềm.
            </p>
          </div>
          <Link
            href="/blog"
            className="hidden md:inline-flex items-center text-rose-600 font-medium hover:text-rose-700 transition-colors group"
          >
            Xem tất cả bài viết
            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {blogs.map((blog) => (
            <motion.div key={blog.id} variants={itemVariants}>
              <Link href={`/blog/${blog.slug}`} className="block h-full">
                <Card variant="glass" hoverable padding="none" className="h-full flex flex-col group overflow-hidden border-slate-100 hover:border-rose-100">
                  {/* Ảnh cover */}
                  <div className="relative aspect-video w-full bg-slate-100 overflow-hidden">
                    {blog.cover_image ? (
                      <img
                        src={blog.cover_image}
                        alt={blog.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-rose-50 to-slate-100 flex items-center justify-center text-rose-300">
                        <Clock className="w-12 h-12 opacity-50" />
                      </div>
                    )}
                    {/* Không có category cho blog */}
                  </div>

                  {/* Nội dung */}
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {formatDate(blog.created_at)}
                      </div>
                      <div className="flex items-center gap-1.5 font-medium">
                        <Eye className="w-3.5 h-3.5" />
                        <span>{blog.views?.toLocaleString() || 0}</span>
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold text-slate-900 mb-3 line-clamp-2 group-hover:text-rose-600 transition-colors">
                      {blog.title}
                    </h3>
                    
                    <p className="text-slate-600 text-sm mb-4 line-clamp-3 leading-relaxed flex-1">
                      {blog.excerpt || truncateText(blog.content, 120)}
                    </p>
                    
                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center text-rose-600 font-medium text-sm group-hover:text-rose-700 transition-colors">
                      Đọc tiếp
                      <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-8 text-center md:hidden">
          <Link
            href="/blog"
            className="inline-flex items-center text-rose-600 font-medium hover:text-rose-700 transition-colors group"
          >
            Xem tất cả bài viết
            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}
