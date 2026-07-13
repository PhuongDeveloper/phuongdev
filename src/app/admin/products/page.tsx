/* ==========================================================================
   Trang Quản Trị Sản Phẩm (/admin/products) - Server Component
   ========================================================================== */

import { createClient } from '@/lib/supabase/server';
import ProductsClient from './ProductsClient';

export default async function ProductsPage() {
  const supabase = await createClient();

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('sort_order', { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Quản Lý Sản Phẩm</h2>
        <p className="text-slate-500">Thêm mã nguồn, script hoặc template để hiển thị trong cửa hàng.</p>
      </div>

      <ProductsClient initialData={products || []} />
    </div>
  );
}
