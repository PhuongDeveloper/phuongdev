'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import {
  AlertCircle,
  Boxes,
  Eye,
  EyeOff,
  KeyRound,
  Package,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
} from 'lucide-react';

import ImageUpload from '@/components/ui/ImageUpload';
import Modal from '@/components/ui/Modal';
import type { Category, Product, ProductVariant, ProductWithVariants } from '@/lib/types/database';
import { cn } from '@/utils/helpers';

type AdminVariant = ProductVariant & { available_keys?: number };
type AdminProduct = Product & { product_variants: AdminVariant[] };
type DraftVariant = Omit<AdminVariant, 'id' | 'product_id' | 'created_at' | 'updated_at'> & {
  id?: string;
  new_keys_text: string;
};

type ProductDraft = Omit<Product, 'id' | 'created_at' | 'updated_at' | 'views' | 'total_sold'>;

type ProductsClientProps = {
  initialData: ProductWithVariants[];
  categories: Category[];
};

const inputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-350 focus:border-[#ed4c50]/60 focus:ring-4 focus:ring-red-50';
const labelClass = 'mb-1.5 block text-[11px] font-black uppercase tracking-[0.1em] text-slate-500';

function slugify(value: string) {
  return value.toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function defaultProduct(category: string): ProductDraft {
  return {
    title: '', slug: '', description: '', content: '', price: 0,
    download_url: '', demo_url: '', image_url: '', gallery_images: [],
    category, is_active: true, has_key: true, delivery_intro: '', delivery_note: '',
    badge: '', is_featured: false, fulfillment_time: 'Giao ngay sau thanh toán',
    warranty_text: 'Hỗ trợ trong thời hạn gói', sort_order: 0,
  };
}

function defaultVariant(index = 0): DraftVariant {
  return {
    name: index === 0 ? 'Gói 1 tháng' : `Gói ${index + 1}`,
    sku: `PKG-${Date.now().toString(36).toUpperCase()}-${index + 1}`,
    short_description: '', duration_label: index === 0 ? '1 tháng' : '',
    price: 0, compare_at_price: null, inventory_policy: 'finite', stock_quantity: 0,
    sold_count: 0, purchase_limit: 5, key_type: 'permanent', download_url: '',
    delivery_note: '', is_active: true, is_featured: index === 0, sort_order: index,
    available_keys: 0, new_keys_text: '',
  };
}

function formatPrice(value: number) {
  return value === 0 ? 'Miễn phí' : `${value.toLocaleString('vi-VN')}đ`;
}

async function readApiResult(response: Response) {
  const text = await response.text();
  if (!text) return {} as { error?: string; product?: AdminProduct };
  try {
    return JSON.parse(text) as { error?: string; product?: AdminProduct };
  } catch {
    return { error: response.ok ? 'Phản hồi từ máy chủ không hợp lệ.' : `Máy chủ từ chối yêu cầu (${response.status}).` };
  }
}

export default function ProductsClient({ initialData, categories }: ProductsClientProps) {
  const [products, setProducts] = useState<AdminProduct[]>(initialData as AdminProduct[]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProductDraft>(() => defaultProduct(categories[0]?.slug || 'other'));
  const [variants, setVariants] = useState<DraftVariant[]>([defaultVariant()]);
  const [galleryText, setGalleryText] = useState('');

  const filtered = useMemo(() => products.filter((product) => `${product.title} ${product.slug}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi'))), [products, query]);
  const activeCount = products.filter((product) => product.is_active).length;
  const totalStock = products.reduce((sum, product) => sum + (product.product_variants || []).filter((variant) => variant.inventory_policy === 'finite' && variant.is_active).reduce((value, variant) => value + variant.stock_quantity, 0), 0);
  const totalSold = products.reduce((sum, product) => sum + (product.total_sold || 0), 0);

  const openCreate = () => {
    setEditing(null);
    setDraft({ ...defaultProduct(categories[0]?.slug || 'other'), sort_order: products.length });
    setVariants([defaultVariant()]);
    setGalleryText('');
    setError('');
    setModalOpen(true);
  };

  const openEdit = (product: AdminProduct) => {
    setEditing(product);
    setDraft({
      title: product.title, slug: product.slug, description: product.description,
      content: product.content || '', price: product.price, download_url: product.download_url || '',
      demo_url: product.demo_url || '', image_url: product.image_url || '', gallery_images: product.gallery_images || [],
      category: product.category, is_active: product.is_active, has_key: product.has_key,
      delivery_intro: product.delivery_intro || '', delivery_note: product.delivery_note || '',
      badge: product.badge || '', is_featured: product.is_featured, fulfillment_time: product.fulfillment_time || 'Giao ngay sau thanh toán',
      warranty_text: product.warranty_text || 'Hỗ trợ trong thời hạn gói', sort_order: product.sort_order,
    });
    const currentVariants = (product.product_variants || []).sort((a, b) => a.sort_order - b.sort_order).map((variant) => ({ ...variant, new_keys_text: '' }));
    setVariants(currentVariants.length ? currentVariants : [defaultVariant()]);
    setGalleryText((product.gallery_images || []).join('\n'));
    setError('');
    setModalOpen(true);
  };

  const updateVariant = (index: number, value: Partial<DraftVariant>) => {
    setVariants((current) => current.map((variant, variantIndex) => variantIndex === index ? { ...variant, ...value } : variant));
  };

  const addVariant = () => setVariants((current) => [...current, defaultVariant(current.length)]);
  const removeVariant = (index: number) => {
    if (variants.length === 1) { setError('Sản phẩm cần ít nhất một gói bán.'); return; }
    setVariants((current) => current.filter((_, variantIndex) => variantIndex !== index));
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const normalizedSkus = variants.map((variant) => variant.sku.trim().toUpperCase());
    if (new Set(normalizedSkus).size !== normalizedSkus.length) {
      setError('Các gói trong cùng sản phẩm không được trùng SKU.');
      return;
    }
    const invalidComparePrice = variants.find((variant) => (
      variant.compare_at_price != null && variant.compare_at_price < variant.price
    ));
    if (invalidComparePrice) {
      setError(`Giá so sánh của "${invalidComparePrice.name}" phải lớn hơn hoặc bằng giá bán.`);
      return;
    }

    setSaving(true);
    try {
      const body = {
        id: editing?.id,
        product: {
          ...draft,
          gallery_images: galleryText.split('\n').map((value) => value.trim()).filter(Boolean),
        },
        variants: variants.map((variant, index) => ({
          ...variant,
          sort_order: index,
          new_keys: variant.new_keys_text.split('\n').map((value) => value.trim()).filter(Boolean),
          new_keys_text: undefined,
          available_keys: undefined,
        })),
      };
      const response = await fetch('/api/admin/products', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await readApiResult(response);
      if (!response.ok) throw new Error(result.error || 'Không thể lưu sản phẩm.');

      const saved = result.product;
      if (!saved) throw new Error('Sản phẩm đã lưu nhưng máy chủ không trả lại dữ liệu mới.');
      setProducts((current) => editing ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved]);
      setModalOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể lưu sản phẩm.');
    } finally {
      setSaving(false);
    }
  };

  const archive = async (product: AdminProduct) => {
    const action = product.is_active ? 'dừng bán' : 'mở bán lại';
    if (!window.confirm(`${action === 'dừng bán' ? 'Dừng bán' : 'Mở bán lại'} "${product.title}"?`)) return;
    setActionError('');
    setBusyProductId(product.id);
    try {
      const response = await fetch('/api/admin/products', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: product.id }) });
      const result = await readApiResult(response);
      if (!response.ok) throw new Error(result.error || 'Không thể đổi trạng thái sản phẩm.');
      setProducts((current) => current.map((item) => item.id === product.id ? { ...item, is_active: !item.is_active } : item));
    } catch (archiveError) {
      setActionError(archiveError instanceof Error ? archiveError.message : 'Không thể đổi trạng thái sản phẩm.');
    } finally {
      setBusyProductId(null);
    }
  };

  const deleteProduct = async (product: AdminProduct) => {
    setActionError('');
    if ((product.total_sold || 0) > 0) {
      setActionError(`"${product.title}" đã có đơn hàng nên không thể xóa vĩnh viễn. Hãy dùng nút Dừng bán để giữ lịch sử khách hàng.`);
      return;
    }
    if (!window.confirm(`Xóa vĩnh viễn "${product.title}"?\n\nThao tác này không thể hoàn tác!`)) return;
    setBusyProductId(product.id);
    try {
      const response = await fetch('/api/admin/products', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: product.id, permanent: true }) });
      const result = await readApiResult(response);
      if (!response.ok) throw new Error(result.error || 'Không thể xóa sản phẩm.');
      setProducts((current) => current.filter((item) => item.id !== product.id));
    } catch (deleteError) {
      setActionError(deleteError instanceof Error ? deleteError.message : 'Không thể xóa sản phẩm.');
    } finally {
      setBusyProductId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#ed4c50]">Catalog operations</p><h2 className="mt-1 text-3xl font-black tracking-[-0.035em]">Sản phẩm & tồn kho</h2><p className="mt-2 text-sm text-slate-500">Mỗi sản phẩm có nhiều gói, giá, kho và key riêng.</p></div>
        <button type="button" onClick={openCreate} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#ed4c50] px-4 text-sm font-black text-white shadow-lg shadow-red-200 transition hover:bg-[#db3f44]"><Plus className="h-4 w-4" />Thêm sản phẩm</button>
      </div>

      {actionError && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError('')} className="ml-auto text-xs font-black uppercase tracking-wide text-amber-700 hover:text-amber-900">Đóng</button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Đang mở bán', value: activeCount, icon: Eye, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Tồn kho hữu hạn', value: totalStock, icon: Boxes, color: 'text-blue-600 bg-blue-50' },
          { label: 'Tổng đã bán', value: totalSold, icon: ShoppingBag, color: 'text-[#ed4c50] bg-red-50' },
        ].map((stat) => { const Icon = stat.icon; return <div key={stat.label} className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"><span className={cn('grid h-11 w-11 place-items-center rounded-xl', stat.color)}><Icon className="h-5 w-5" /></span><div><p className="text-2xl font-black tracking-tight">{stat.value.toLocaleString('vi-VN')}</p><p className="text-xs text-slate-400">{stat.label}</p></div></div>; })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên hoặc slug..." className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none focus:border-red-300 focus:bg-white focus:ring-4 focus:ring-red-50" /></div>
          <p className="text-xs font-semibold text-slate-400">{filtered.length} / {products.length} sản phẩm</p>
        </div>
        <div className="divide-y divide-slate-100">
          {filtered.map((product) => {
            const activeVariants = (product.product_variants || []).filter((variant) => variant.is_active);
            const prices = activeVariants.map((variant) => Number(variant.price));
            const stock = activeVariants.filter((variant) => variant.inventory_policy === 'finite').reduce((sum, variant) => sum + variant.stock_quantity, 0);
            const available = activeVariants.some((variant) => variant.inventory_policy === 'unlimited' || variant.stock_quantity > 0);
            return (
              <div key={product.id} className="grid gap-4 p-4 transition hover:bg-slate-50/60 md:grid-cols-[72px_minmax(0,1.4fr)_minmax(180px,.8fr)_130px_auto] md:items-center">
                <div className="relative h-14 w-[72px] overflow-hidden rounded-xl bg-slate-100">{product.image_url ? <Image src={product.image_url} alt={product.title} fill className="object-cover" sizes="72px" /> : <div className="grid h-full place-items-center bg-slate-900 text-white/30"><Package className="h-5 w-5" /></div>}</div>
                <div className="min-w-0"><div className="flex items-center gap-2"><h3 className="truncate text-sm font-black">{product.title}</h3>{product.is_featured && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-black uppercase text-amber-700">Nổi bật</span>}</div><p className="mt-1 truncate text-xs text-slate-400">/{product.slug} · {product.category}</p><div className="mt-2 flex gap-1.5">{activeVariants.slice(0, 3).map((variant) => <span key={variant.id} className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">{variant.name}</span>)}{activeVariants.length > 3 && <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">+{activeVariants.length - 3}</span>}</div></div>
                <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{activeVariants.length} gói · giá từ</p><p className="mt-1 text-sm font-black text-[#ed4c50]">{formatPrice(prices.length ? Math.min(...prices) : product.price)}</p></div>
                <div><p className={cn('flex items-center gap-1.5 text-xs font-bold', available ? 'text-emerald-600' : 'text-red-500')}><span className={cn('h-1.5 w-1.5 rounded-full', available ? 'bg-emerald-500' : 'bg-red-500')} />{available ? 'Còn hàng' : 'Hết hàng'}</p><p className="mt-1 text-[11px] text-slate-400">Kho: {stock} · Đã bán: {product.total_sold || 0}</p></div>
                <div className="flex items-center justify-end gap-1">
                  <button type="button" disabled={busyProductId === product.id} onClick={() => openEdit(product)} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-wait disabled:opacity-50" title="Chỉnh sửa">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" disabled={busyProductId === product.id} onClick={() => archive(product)}
                    className={cn('grid h-9 w-9 place-items-center rounded-xl border transition disabled:cursor-wait disabled:opacity-50', product.is_active ? 'border-slate-200 text-slate-400 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-600' : 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100')}
                    title={product.is_active ? 'Dừng bán' : 'Mở bán lại'}>
                    {product.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button type="button" disabled={busyProductId === product.id} onClick={() => deleteProduct(product)} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-400 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:cursor-wait disabled:opacity-50" title={(product.total_sold || 0) > 0 ? 'Sản phẩm đã có đơn — chỉ có thể dừng bán' : 'Xóa vĩnh viễn'}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
          {!filtered.length && <div className="p-14 text-center text-sm text-slate-400">Không có sản phẩm phù hợp.</div>}
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => !saving && setModalOpen(false)} title={editing ? 'Chỉnh sửa sản phẩm' : 'Tạo sản phẩm mới'} size="xl">
        <form onSubmit={save} className="space-y-7">
          {error && <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}

          <section>
            <div className="mb-4"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ed4c50]">01 · Thông tin bán hàng</p><h3 className="mt-1 text-lg font-black">Thông tin chung</h3></div>
            <div className="grid gap-4 md:grid-cols-2">
              <label><span className={labelClass}>Tên sản phẩm</span><input required value={draft.title} onChange={(event) => setDraft((value) => ({ ...value, title: event.target.value, ...(!editing ? { slug: slugify(event.target.value) } : {}) }))} className={inputClass} /></label>
              <label><span className={labelClass}>Slug</span><input required value={draft.slug} onChange={(event) => setDraft((value) => ({ ...value, slug: slugify(event.target.value) }))} className={inputClass} /></label>
              <label><span className={labelClass}>Danh mục</span><select value={draft.category} onChange={(event) => setDraft((value) => ({ ...value, category: event.target.value }))} className={inputClass}>{categories.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select></label>
              <label><span className={labelClass}>Nhãn nổi bật</span><input value={draft.badge || ''} onChange={(event) => setDraft((value) => ({ ...value, badge: event.target.value }))} placeholder="Ví dụ: Mới, Best seller" className={inputClass} /></label>
            </div>
            <label className="mt-4 block"><span className={labelClass}>Mô tả ngắn</span><textarea required value={draft.description} onChange={(event) => setDraft((value) => ({ ...value, description: event.target.value }))} className={`${inputClass} min-h-24 py-3`} /></label>
            <label className="mt-4 block"><span className={labelClass}>Nội dung chi tiết (Markdown)</span><textarea value={draft.content} onChange={(event) => setDraft((value) => ({ ...value, content: event.target.value }))} className={`${inputClass} min-h-40 py-3 font-mono text-xs`} /></label>
            <div className="mt-4 grid gap-4 md:grid-cols-2"><label><span className={labelClass}>Thời gian bàn giao</span><input value={draft.fulfillment_time} onChange={(event) => setDraft((value) => ({ ...value, fulfillment_time: event.target.value }))} className={inputClass} /></label><label><span className={labelClass}>Chính sách hỗ trợ</span><input value={draft.warranty_text} onChange={(event) => setDraft((value) => ({ ...value, warranty_text: event.target.value }))} className={inputClass} /></label></div>
            <div className="mt-4 flex flex-wrap gap-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold"><label className="flex items-center gap-2"><input type="checkbox" checked={draft.is_active} onChange={(event) => setDraft((value) => ({ ...value, is_active: event.target.checked }))} className="h-4 w-4 accent-[#ed4c50]" />Đang mở bán</label><label className="flex items-center gap-2"><input type="checkbox" checked={draft.is_featured} onChange={(event) => setDraft((value) => ({ ...value, is_featured: event.target.checked }))} className="h-4 w-4 accent-[#ed4c50]" />Sản phẩm nổi bật</label><label className="flex items-center gap-2"><input type="checkbox" checked={draft.has_key} onChange={(event) => setDraft((value) => ({ ...value, has_key: event.target.checked }))} className="h-4 w-4 accent-[#ed4c50]" />Bàn giao bằng key</label></div>
          </section>

          <section className="border-t border-slate-100 pt-6">
            <div className="mb-4 flex items-end justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ed4c50]">02 · License rail</p><h3 className="mt-1 text-lg font-black">Các gói sản phẩm</h3><p className="mt-1 text-xs text-slate-400">Giá, kho, số đã bán và key được tách riêng theo từng gói.</p></div><button type="button" onClick={addVariant} className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-[#ed4c50]"><Plus className="h-3.5 w-3.5" />Thêm gói</button></div>
            <div className="space-y-4">
              {variants.map((variant, index) => (
                <div key={variant.id || `${variant.sku}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-white"><KeyRound className="h-4 w-4" /></span><div><p className="text-xs font-black">Gói #{index + 1}</p><p className="text-[10px] text-slate-400">{variant.available_keys || 0} key sẵn sàng</p></div></div><button type="button" onClick={() => removeVariant(index)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div>
                  <div className="grid gap-3 md:grid-cols-4"><label className="md:col-span-2"><span className={labelClass}>Tên gói</span><input required value={variant.name} onChange={(event) => updateVariant(index, { name: event.target.value })} className={inputClass} /></label><label><span className={labelClass}>SKU</span><input required value={variant.sku} onChange={(event) => updateVariant(index, { sku: event.target.value.toUpperCase().replace(/\s+/g, '-') })} className={inputClass} /></label><label><span className={labelClass}>Thời hạn</span><input value={variant.duration_label || ''} onChange={(event) => updateVariant(index, { duration_label: event.target.value })} placeholder="1 tháng" className={inputClass} /></label></div>
                  <label className="mt-3 block"><span className={labelClass}>Quyền lợi / mô tả gói</span><input value={variant.short_description} onChange={(event) => updateVariant(index, { short_description: event.target.value })} placeholder="Dùng trên 1 thiết bị, cập nhật trong 30 ngày..." className={inputClass} /></label>
                  <div className="mt-3 grid gap-3 md:grid-cols-4"><label><span className={labelClass}>Giá bán</span><input type="number" min="0" value={variant.price} onChange={(event) => updateVariant(index, { price: Number(event.target.value) })} className={inputClass} /></label><label><span className={labelClass}>Giá so sánh</span><input type="number" min={variant.price} value={variant.compare_at_price || ''} onChange={(event) => updateVariant(index, { compare_at_price: event.target.value ? Number(event.target.value) : null })} className={inputClass} /></label><label><span className={labelClass}>Kiểu kho</span><select value={variant.inventory_policy} onChange={(event) => updateVariant(index, { inventory_policy: event.target.value as 'finite' | 'unlimited' })} className={inputClass}><option value="finite">Hữu hạn</option><option value="unlimited">Không giới hạn</option></select></label><label><span className={labelClass}>{draft.has_key ? 'Kho = key sẵn sàng' : 'Số lượng tồn'}</span><input type="number" min="0" disabled={draft.has_key || variant.inventory_policy === 'unlimited'} value={draft.has_key ? variant.available_keys || 0 : variant.stock_quantity} onChange={(event) => updateVariant(index, { stock_quantity: Number(event.target.value) })} className={`${inputClass} disabled:bg-slate-100 disabled:text-slate-400`} /></label></div>
                  <div className="mt-3 grid gap-3 md:grid-cols-3"><label><span className={labelClass}>Giới hạn / đơn</span><input type="number" min="1" max="100" value={variant.purchase_limit} onChange={(event) => updateVariant(index, { purchase_limit: Number(event.target.value) })} className={inputClass} /></label><label><span className={labelClass}>Loại key</span><select disabled={!draft.has_key} value={variant.key_type} onChange={(event) => updateVariant(index, { key_type: event.target.value as 'trial' | 'permanent' })} className={`${inputClass} disabled:bg-slate-100`}><option value="permanent">Trả phí / chính thức</option><option value="trial">Miễn phí / dùng thử</option></select></label><label><span className={labelClass}>Link tải riêng</span><input type="url" value={variant.download_url || ''} onChange={(event) => updateVariant(index, { download_url: event.target.value })} placeholder="https://..." className={inputClass} /></label></div>
                  {draft.has_key && <label className="mt-3 block"><span className={labelClass}>Thêm key mới — mỗi dòng một key</span><textarea value={variant.new_keys_text} onChange={(event) => updateVariant(index, { new_keys_text: event.target.value })} placeholder={'KEY-001\nKEY-002'} className={`${inputClass} min-h-24 py-3 font-mono text-xs`} /><span className="mt-1 block text-[10px] text-slate-400">{variant.new_keys_text.split('\n').filter((value) => value.trim()).length} key mới; key cũ không bị xóa.</span></label>}
                  <div className="mt-3 flex gap-5 text-xs font-semibold text-slate-600"><label className="flex items-center gap-2"><input type="checkbox" checked={variant.is_active} onChange={(event) => updateVariant(index, { is_active: event.target.checked })} className="accent-[#ed4c50]" />Đang bán</label><label className="flex items-center gap-2"><input type="checkbox" checked={variant.is_featured} onChange={(event) => { setVariants((current) => current.map((item, itemIndex) => ({ ...item, is_featured: itemIndex === index ? event.target.checked : false }))); }} className="accent-[#ed4c50]" />Gói đề xuất</label></div>
                </div>
              ))}
            </div>
          </section>

          <section className="border-t border-slate-100 pt-6">
            <div className="mb-4"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ed4c50]">03 · Media & bàn giao</p><h3 className="mt-1 text-lg font-black">Hình ảnh và tài liệu</h3></div>
            <ImageUpload label="Ảnh bìa sản phẩm" value={draft.image_url} onChange={(url) => setDraft((value) => ({ ...value, image_url: url }))} />
            <label className="mt-4 block"><span className={labelClass}>Gallery — mỗi dòng một URL ảnh</span><textarea value={galleryText} onChange={(event) => setGalleryText(event.target.value)} placeholder={'https://.../screen-1.jpg\nhttps://.../screen-2.jpg'} className={`${inputClass} min-h-24 py-3 font-mono text-xs`} /></label>
            <div className="mt-4 grid gap-4 md:grid-cols-2"><label><span className={labelClass}>Link tải mặc định</span><input type="url" value={draft.download_url || ''} onChange={(event) => setDraft((value) => ({ ...value, download_url: event.target.value }))} className={inputClass} /></label><label><span className={labelClass}>Link demo</span><input type="url" value={draft.demo_url || ''} onChange={(event) => setDraft((value) => ({ ...value, demo_url: event.target.value }))} className={inputClass} /></label></div>
            <label className="mt-4 block"><span className={labelClass}>Lời nhắn bàn giao</span><textarea value={draft.delivery_intro || ''} onChange={(event) => setDraft((value) => ({ ...value, delivery_intro: event.target.value }))} className={`${inputClass} min-h-20 py-3`} /></label>
            <label className="mt-4 block"><span className={labelClass}>Hướng dẫn sử dụng</span><textarea value={draft.delivery_note || ''} onChange={(event) => setDraft((value) => ({ ...value, delivery_note: event.target.value }))} className={`${inputClass} min-h-24 py-3`} /></label>
          </section>

          <div className="sticky bottom-0 -mx-6 flex items-center justify-end gap-3 border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur"><button type="button" disabled={saving} onClick={() => setModalOpen(false)} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 hover:bg-slate-50">Hủy</button><button type="submit" disabled={saving} className="h-10 rounded-xl bg-[#ed4c50] px-5 text-sm font-black text-white shadow-md shadow-red-100 disabled:opacity-50">{saving ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Tạo sản phẩm'}</button></div>
        </form>
      </Modal>
    </div>
  );
}
