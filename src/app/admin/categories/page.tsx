/* ==========================================================================
   Trang Quản Trị Danh Mục (/admin/categories) - Server Component
   ========================================================================== */

import { createClient } from '@/lib/supabase/server';
import CategoriesClient from './CategoriesClient';

export default async function CategoriesPage() {
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Quản Lý Danh Mục</h2>
        <p className="text-slate-500">Quản lý các danh mục cho sản phẩm và bài viết.</p>
      </div>

      <CategoriesClient initialData={categories || []} />
    </div>
  );
}
