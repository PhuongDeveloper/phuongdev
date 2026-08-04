'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Box, PackageX, Search, ShoppingBag, SlidersHorizontal } from 'lucide-react';

import type { ProductWithVariants } from '@/lib/types/database';
import { cn } from '@/utils/helpers';

type ProductsListProps = { products: ProductWithVariants[] };

function formatPrice(value: number) {
  return value === 0 ? 'Miễn phí' : `${value.toLocaleString('vi-VN')}đ`;
}

export default function ProductsList({ products }: ProductsListProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
  const categories = useMemo(() => Array.from(new Set(products.map((product) => product.category))), [products]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('vi');
    return products.filter((product) => {
      const matchCategory = category === 'all' || product.category === category;
      const matchQuery = !normalized || `${product.title} ${product.description}`.toLocaleLowerCase('vi').includes(normalized);
      return matchCategory && matchQuery;
    });
  }, [category, products, query]);

  return (
    <div className="rounded-[28px] border border-slate-200/70 bg-white p-4 shadow-2xl shadow-slate-900/10 sm:p-6">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-rose-500">Danh mục đang mở bán</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Kho sản phẩm số</h2>
          <p className="mt-1 text-sm text-slate-500">{filtered.length} sản phẩm phù hợp</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative min-w-0 sm:w-72">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm tool, source code..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-rose-300 focus:bg-white focus:ring-4 focus:ring-rose-100"
            />
          </label>
          <label className="relative">
            <SlidersHorizontal className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-11 min-w-44 appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-8 text-sm font-semibold text-slate-700 outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-100">
              <option value="all">Tất cả danh mục</option>
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="grid min-h-80 place-items-center text-center">
          <div><PackageX className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-bold text-slate-700">Không tìm thấy sản phẩm</p><p className="mt-1 text-sm text-slate-400">Thử từ khóa hoặc danh mục khác.</p></div>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => {
            const variants = (product.product_variants || []).filter((variant) => variant.is_active);
            const prices = variants.map((variant) => Number(variant.price));
            const minPrice = prices.length ? Math.min(...prices) : Number(product.price);
            const finite = variants.filter((variant) => variant.inventory_policy === 'finite');
            const stock = finite.reduce((sum, variant) => sum + variant.stock_quantity, 0);
            const inStock = variants.some((variant) => variant.inventory_policy === 'unlimited' || variant.stock_quantity > 0);

            return (
              <Link key={product.id} href={`/store/${product.slug}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-900/10">
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                  {product.image_url && !failedImages.has(product.id) ? (
                    <Image src={product.image_url} alt={product.title} fill className="object-cover transition duration-700 group-hover:scale-[1.04]" sizes="(max-width: 768px) 100vw, 33vw" onError={() => setFailedImages((current) => new Set(current).add(product.id))} />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_30%_25%,rgba(225,29,72,.20),transparent_32%),linear-gradient(145deg,#fff1f2,#eef2ff)]"><ShoppingBag className="h-10 w-10 text-rose-300" /></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/10" />
                  <div className="absolute left-3 top-3 flex gap-2">
                    <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-900 backdrop-blur">{product.category}</span>
                    {product.badge && <span className="rounded-full bg-[#ed4c50] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">{product.badge}</span>}
                  </div>
                  <div className="absolute inset-x-4 bottom-3 flex items-end justify-between gap-3 text-white">
                    <span className="text-xs font-bold">{variants.length} gói lựa chọn</span>
                    <ArrowUpRight className="h-5 w-5 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="line-clamp-1 text-lg font-black tracking-tight text-slate-950">{product.title}</h3>
                  <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">{product.description}</p>
                  <div className="mt-5 flex items-end justify-between border-t border-slate-100 pt-4">
                    <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Giá từ</p><p className="mt-0.5 text-xl font-black text-rose-600">{formatPrice(minPrice)}</p></div>
                    <div className="text-right">
                      <span className={cn('inline-flex items-center gap-1.5 text-xs font-bold', inStock ? 'text-emerald-600' : 'text-red-500')}><span className={cn('h-1.5 w-1.5 rounded-full', inStock ? 'bg-emerald-500' : 'bg-red-500')} />{inStock ? finite.length ? `Còn ${stock}` : 'Còn hàng' : 'Hết hàng'}</span>
                      <p className="mt-1 flex items-center justify-end gap-1 text-[11px] text-slate-400"><Box className="h-3 w-3" />Đã bán {product.total_sold.toLocaleString('vi-VN')}</p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
