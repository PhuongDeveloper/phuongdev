import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  BadgeCheck,
  Box,
  ChevronRight,
  Clock3,
  ExternalLink,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Star,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import ProductGallery from '@/components/store/ProductGallery';
import ProductPurchase from '@/components/ui/ProductPurchase';
import ViewTracker from '@/components/ui/ViewTracker';
import { createClient } from '@/lib/supabase/server';
import type { Product, ProductVariant } from '@/lib/types/database';
import { normalizeLegacyProduct } from '@/lib/store/legacy-product';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: product } = await supabase
    .from('products')
    .select('title, description, image_url')
    .eq('slug', slug)
    .maybeSingle();

  if (!product) return { title: 'Không tìm thấy sản phẩm' };
  return {
    title: `${product.title} | PhuongDev Market`,
    description: product.description,
    openGraph: { images: product.image_url ? [product.image_url] : [] },
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const [catalogueResult, { data: configRows }] = await Promise.all([
    supabase
      .from('products')
      .select('id,title,slug,description,content,price,demo_url,image_url,category,is_active,has_key,gallery_images,badge,total_sold,is_featured,fulfillment_time,warranty_text,sort_order,views,created_at,updated_at,product_variants(id,product_id,name,sku,short_description,duration_label,price,compare_at_price,inventory_policy,stock_quantity,sold_count,purchase_limit,key_type,is_active,is_featured,sort_order,created_at,updated_at)')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle(),
    supabase.from('site_config').select('key, value'),
  ]);

  let data = catalogueResult.data;
  if (catalogueResult.error) {
    const legacyResult = await supabase.from('products').select('id,title,slug,description,content,price,demo_url,image_url,category,is_active,has_key,sort_order,views,created_at,updated_at').eq('slug', slug).eq('is_active', true).maybeSingle();
    data = legacyResult.data ? normalizeLegacyProduct(legacyResult.data) : null;
  }
  if (!data) notFound();

  const product = data as Product & { product_variants: ProductVariant[] };
  const variants = (product.product_variants || [])
    .filter((variant) => variant.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);
  const finiteVariants = variants.filter((variant) => variant.inventory_policy === 'finite');
  const totalStock = finiteVariants.reduce((sum, variant) => sum + variant.stock_quantity, 0);
  const isAvailable = variants.some((variant) => variant.inventory_policy === 'unlimited' || variant.stock_quantity > 0);
  const priceValues = variants.map((variant) => Number(variant.price));
  const minimumPrice = priceValues.length ? Math.min(...priceValues) : Number(product.price);
  const siteConfig: Record<string, string> = {};
  configRows?.forEach((row) => { siteConfig[row.key] = row.value; });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <ViewTracker table="products" slug={product.slug} />
      <Navbar />

      <main className="pb-20 pt-20">
        <div className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-[1380px] items-center gap-2 overflow-x-auto px-4 py-4 text-xs text-slate-500 sm:px-6 lg:px-8">
            <Link href="/store" className="whitespace-nowrap transition hover:text-rose-600">Kho sản phẩm</Link>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            <span className="whitespace-nowrap">{product.category}</span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate font-semibold text-slate-700">{product.title}</span>
            <span className={`ml-auto hidden shrink-0 items-center gap-1.5 sm:flex ${isAvailable ? 'text-emerald-400' : 'text-red-400'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isAvailable ? 'bg-emerald-400' : 'bg-red-400'}`} />
              {isAvailable ? 'Đang mở bán' : 'Tạm hết hàng'}
            </span>
          </div>
        </div>

        <div className="mx-auto max-w-[1380px] px-4 py-7 sm:px-6 lg:px-8">
          <Link href="/store" className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-rose-600">
            <ArrowLeft className="h-3.5 w-3.5" /> Quay lại cửa hàng
          </Link>

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_390px] xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="min-w-0">
              <ProductGallery
                title={product.title}
                imageUrl={product.image_url}
                galleryImages={product.gallery_images || []}
              />

              <div className="mt-7">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">{product.category}</span>
                  {product.badge && <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">{product.badge}</span>}
                  <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-700">Sản phẩm số</span>
                </div>

                <h1 className="max-w-4xl text-3xl font-black leading-tight tracking-[-0.035em] sm:text-4xl lg:text-[44px]">
                  {product.title}
                </h1>

                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5 font-bold text-amber-400"><Star className="h-4 w-4 fill-current" />5.0</span>
                  <span className="flex items-center gap-1.5"><ShoppingBag className="h-4 w-4" />Đã bán <b className="text-slate-700">{product.total_sold.toLocaleString('vi-VN')}</b></span>
                  <span className="flex items-center gap-1.5"><Box className="h-4 w-4" />{finiteVariants.length ? `Còn ${totalStock.toLocaleString('vi-VN')}` : 'Kho không giới hạn'}</span>
                  <span className="flex items-center gap-1.5"><PackageCheck className="h-4 w-4" />Từ {minimumPrice === 0 ? 'miễn phí' : `${minimumPrice.toLocaleString('vi-VN')}đ`}</span>
                </div>

                <p className="mt-5 max-w-4xl text-[15px] leading-7 text-slate-600">{product.description}</p>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    { icon: Clock3, title: product.fulfillment_time, note: 'Xác nhận theo từng đơn' },
                    { icon: ShieldCheck, title: product.warranty_text, note: 'Lưu lịch sử trong tài khoản' },
                    { icon: BadgeCheck, title: 'Đúng gói đã chọn', note: 'Giá, kho và quyền lợi riêng' },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                        <div><p className="text-xs font-bold text-slate-800">{item.title}</p><p className="mt-1 text-[11px] text-slate-500">{item.note}</p></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <ProductPurchase product={product} variants={variants} />
          </div>
        </div>

        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto grid max-w-[1380px] gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:px-8">
            <article>
              <div className="mb-7 flex items-center gap-3">
                <span className="h-px w-10 bg-rose-600" />
                <h2 className="text-xl font-black">Chi tiết sản phẩm</h2>
              </div>
              {product.content ? (
                <div className="prose prose-slate max-w-none prose-headings:font-black prose-headings:tracking-tight prose-p:leading-7 prose-a:text-rose-600 prose-code:text-rose-600">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{product.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">Thông tin chi tiết đang được cập nhật.</p>
              )}
            </article>

            <aside className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Cam kết giao dịch</p>
                <ul className="mt-4 space-y-3 text-xs text-slate-600">
                  <li className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />Thanh toán được đối soát theo mã đơn.</li>
                  <li className="flex gap-2"><PackageCheck className="h-4 w-4 shrink-0 text-emerald-400" />Tồn kho giữ chỗ khi tạo QR.</li>
                  <li className="flex gap-2"><BadgeCheck className="h-4 w-4 shrink-0 text-emerald-400" />Key được cấp riêng cho từng đơn.</li>
                </ul>
              </div>
              {product.demo_url && (
                <a href={product.demo_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 text-sm font-bold transition hover:border-rose-200 hover:bg-rose-50">
                  Xem bản demo <ExternalLink className="h-4 w-4 text-rose-600" />
                </a>
              )}
            </aside>
          </div>
        </section>
      </main>

      <Footer siteConfig={siteConfig} />
    </div>
  );
}
