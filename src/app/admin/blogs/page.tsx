/* ==========================================================================
   Trang Quản Trị Blog (/admin/blogs) - Server Component
   ========================================================================== */

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BlogsClient from './BlogsClient';

export default async function AdminBlogsPage() {
  const supabase = await createClient();

  // Lấy toàn bộ bài viết (sắp xếp mới nhất)
  const { data: blogs, error } = await supabase
    .from('blogs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Lỗi khi tải blogs:', error);
  }

  return <BlogsClient initialBlogs={blogs || []} />;
}
