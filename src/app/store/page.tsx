import type { Metadata } from 'next';
import { ArrowDown, Box, ShieldCheck, Zap } from 'lucide-react';

import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import { createClient } from '@/lib/supabase/server';
import type { ProductWithVariants } from '@/lib/types/database';
import { normalizeLegacyProduct } from '@/lib/store/legacy-product';
import ProductsList from './ProductsList';

export const metadata: Metadata = {
  title: 'Chợ Sản Phẩm Số',
  description: 'Tool, source code và tài nguyên số từ PhuongDev với nhiều gói bản quyền và giao hàng tự động.',
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
      <Navbar />
      <main>
        <section className="relative overflow-hidden border-b border-slate-200/70 bg-white pb-28 pt-32 text-slate-900">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(225,29,72,0.10),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(99,102,241,0.08),transparent_30%)]" />
          <div className="absolute inset-0 opacity-[0.32] [background-image:linear-gradient(rgba(203,213,225,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(203,213,225,.35)_1px,transparent_1px)] [background-size:48px_48px]" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-rose-100 bg-rose-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-rose-600">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> PhuongDev digital market
              </div>
              <h1 className="text-4xl font-black leading-[1.06] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
                Chọn đúng gói.<br /><span className="text-slate-300">Nhận đúng công cụ.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Tool, source code và tài nguyên số có phiên bản rõ ràng, tồn kho thật và lịch sử bàn giao lưu trong tài khoản của bạn.
              </p>
            </div>
            <div className="mt-10 grid max-w-3xl gap-3 sm:grid-cols-3">
              {[
                { icon: ShieldCheck, title: 'Đối soát tự động', note: 'SePay xác nhận theo mã đơn' },
                { icon: Box, title: 'Tồn kho theo gói', note: 'Không bán vượt số lượng' },
                { icon: Zap, title: 'Bàn giao tức thì', note: 'Key và link về đúng tài khoản' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur-sm">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                    <div><p className="text-xs font-bold text-slate-800">{item.title}</p><p className="mt-1 text-[11px] text-slate-500">{item.note}</p></div>
                  </div>
                );
              })}
            </div>
          </div>
          <ArrowDown className="absolute bottom-7 right-8 h-5 w-5 animate-bounce text-slate-300" />
        </section>

        <section className="relative z-10 -mt-12 pb-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <ProductsList products={products || []} />
          </div>
        </section>
      </main>
      <Footer siteConfig={siteConfig} />
    </div>
  );
}
