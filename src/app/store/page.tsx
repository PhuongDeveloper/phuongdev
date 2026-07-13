/* ==========================================================================
   Trang Cửa Hàng (/store) - Server Component
   Hiển thị danh sách mã nguồn, sản phẩm số từ database
   ========================================================================== */

import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ProductsList from './ProductsList';
import { ShoppingBag } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Cửa Hàng Lập Trình',
  description: 'Nơi chia sẻ mã nguồn, template và các công cụ hữu ích từ PhuongDev.',
};

export default async function StorePage() {
  const supabase = await createClient();

  // Lấy cấu hình site
  const { data: configRows } = await supabase
    .from('site_config')
    .select('key, value');

  const siteConfig: Record<string, string> = {};
  configRows?.forEach((row) => {
    siteConfig[row.key] = row.value;
  });

  // Lấy danh sách sản phẩm, chỉ lấy sản phẩm đang bật (is_active = true)
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-32 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
          {/* Danh sách sản phẩm */}
          <ProductsList products={products || []} />
        </div>
      </main>

      <Footer siteConfig={siteConfig} />
    </div>
  );
}
