import type { Metadata } from 'next';

import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import { createClient } from '@/lib/supabase/server';
import type { ProductWithVariants } from '@/lib/types/database';
import { normalizeLegacyProduct } from '@/lib/store/legacy-product';
import ProductsList from './ProductsList';

export const metadata: Metadata = {
  title: 'Chợ Sản Phẩm Số',
  description: 'Tool, source code và tài nguyên số từ PhuongDev với nhiều gói bản quyền và giao hàng tự động.',
  alternates: { canonical: '/store' },
  openGraph: { type: 'website', url: '/store', title: 'Chợ Sản Phẩm Số | PhuongDev', description: 'Tool, source code và tài nguyên số với nhiều gói bản quyền và giao hàng tự động.' },
  twitter: { card: 'summary_large_image', title: 'Chợ Sản Phẩm Số | PhuongDev', description: 'Tool, source code và tài nguyên số với nhiều gói bản quyền và giao hàng tự động.' },
};

export default async function StorePage() {
  const supabase = await createClient();
  const [{ data: configRows }, catalogueResult] = await Promise.all([
    supabase.from('site_config').select('key, value'),
    supabase.from('products').select('id,title,slug,description,content,price,demo_url,image_url,category,is_active,has_key,gallery_images,badge,total_sold,is_featured,fulfillment_time,warranty_text,sort_order,views,created_at,updated_at,product_variants(id,product_id,name,sku,short_description,duration_label,price,compare_at_price,inventory_policy,stock_quantity,sold_count,purchase_limit,key_type,is_active,is_featured,sort_order,created_at,updated_at)').eq('is_active', true).order('is_featured', { ascending: false }).order('sort_order', { ascending: true }),
  ]);
  let products = catalogueResult.data as ProductWithVariants[] | null;
  if (catalogueResult.error) {
    const legacyResult = await supabase.from('products').select('id,title,slug,description,content,price,demo_url,image_url,category,is_active,has_key,sort_order,views,created_at,updated_at').eq('is_active', true).order('sort_order', { ascending: true });
    products = (legacyResult.data || []).map((product) => normalizeLegacyProduct(product));
  }

  const siteConfig: Record<string, string> = {};
  configRows?.forEach((row) => { siteConfig[row.key] = row.value; });

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar siteConfig={siteConfig} />
      <main className="pt-24 pb-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ProductsList products={products || []} />
        </div>
      </main>

      <Footer siteConfig={siteConfig} />
    </div>
  );
}
