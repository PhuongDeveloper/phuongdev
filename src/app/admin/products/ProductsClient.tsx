/* ==========================================================================
   Client Component Quản Lý Sản Phẩm (Products) - Thêm hỗ trợ key
   ========================================================================== */

'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { createClient as supabaseAdminCreate } from '@supabase/supabase-js';
import DataTable from '@/components/admin/DataTable';
import Modal from '@/components/ui/Modal';
import FormInput from '@/components/ui/FormInput';
import FormTextarea from '@/components/ui/FormTextarea';
import Button from '@/components/ui/Button';
import ImageUpload from '@/components/ui/ImageUpload';
import { type Product, type ProductInsert, type Category } from '@/lib/types/database';
import { formatCurrency } from '@/utils/helpers';
import { Key } from 'lucide-react';
import { cn } from '@/utils/helpers';

interface ProductsClientProps {
  initialData: Product[];
  categories: Category[];
}

export default function ProductsClient({ initialData, categories }: ProductsClientProps) {
  const [data, setData] = useState<Product[]>(initialData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Key inputs (chỉ dùng khi has_key = true)
  const [trialKeysText, setTrialKeysText] = useState('');
  const [permanentKeysText, setPermanentKeysText] = useState('');
  const [isSavingKeys, setIsSavingKeys] = useState(false);

  const [formData, setFormData] = useState<ProductInsert>({
    title: '',
    slug: '',
    description: '',
    content: '',
    price: 0,
    download_url: '',
    demo_url: '',
    image_url: '',
    category: categories.length > 0 ? categories[0].slug : '',
    is_active: true,
    has_key: false,
    delivery_intro: '',
    delivery_note: '',
    sort_order: 0,
  });

  const supabase = createClient();

  const handleEdit = (item: Product) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      slug: item.slug || '',
      description: item.description,
      content: item.content || '',
      price: item.price,
      download_url: item.download_url || '',
      demo_url: item.demo_url || '',
      image_url: item.image_url || '',
      category: item.category,
      is_active: item.is_active,
      has_key: item.has_key || false,
      delivery_intro: item.delivery_intro || '',
      delivery_note: item.delivery_note || '',
      sort_order: item.sort_order,
    });
    setTrialKeysText('');
    setPermanentKeysText('');
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      title: '', slug: '', description: '', content: '', price: 0,
      download_url: '', demo_url: '', image_url: '',
      category: categories.length > 0 ? categories[0].slug : '',
      is_active: true, has_key: false,
      delivery_intro: '', delivery_note: '',
      sort_order: data.length,
    });
    setTrialKeysText('');
    setPermanentKeysText('');
    setIsModalOpen(true);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    if (!editingItem && title) {
      const slug = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
      setFormData({ ...formData, title, slug });
    } else {
      setFormData({ ...formData, title });
    }
  };

  const handleDelete = async (item: Product) => {
    try {
      const { error } = await supabase.from('products').delete().eq('id', item.id);
      if (error) throw error;
      setData(data.filter((d) => d.id !== item.id));
    } catch (error) {
      console.error('Lỗi khi xoá sản phẩm:', error);
      alert('Đã xảy ra lỗi khi xoá.');
    }
  };

  const saveKeys = async (productId: string) => {
    const trialLines = trialKeysText.split('\n').map(k => k.trim()).filter(Boolean);
    const permanentLines = permanentKeysText.split('\n').map(k => k.trim()).filter(Boolean);

    const allKeys = [
      ...trialLines.map(k => ({ product_id: productId, key_value: k, key_type: 'trial' as const, is_used: false })),
      ...permanentLines.map(k => ({ product_id: productId, key_value: k, key_type: 'permanent' as const, is_used: false })),
    ];

    if (allKeys.length === 0) return;

    const { error } = await supabase.from('product_keys').insert(allKeys);
    if (error) throw error;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingItem) {
        const { data: updatedItem, error } = await supabase.from('products').update(formData).eq('id', editingItem.id).select().single();
        if (error) throw error;
        if (formData.has_key && (trialKeysText.trim() || permanentKeysText.trim())) {
          await saveKeys(editingItem.id);
        }
        setData(data.map((item) => (item.id === editingItem.id ? updatedItem : item)));
      } else {
        const { data: newItem, error } = await supabase.from('products').insert(formData).select().single();
        if (error) throw error;
        if (formData.has_key && (trialKeysText.trim() || permanentKeysText.trim())) {
          await saveKeys(newItem.id);
        }
        setData([...data, newItem]);
      }
      setIsModalOpen(false);
    } catch (error: unknown) {
      console.error('Lỗi khi lưu sản phẩm:', error);
      alert(error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lưu.');
    } finally {
      setIsSaving(false);
    }
  };

  const columns = [
    {
      header: 'Ảnh',
      accessorKey: 'image_url',
      cell: (item: Product) => (
        <div className="w-16 h-12 bg-slate-100 rounded overflow-hidden">
          {item.image_url && <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />}
        </div>
      ),
    },
    {
      header: 'Sản Phẩm',
      accessorKey: 'title',
      cell: (item: Product) => (
        <div>
          <div className="font-medium text-slate-900 flex items-center gap-2">
            {item.title}
            {item.has_key && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-violet-50 text-violet-700 border border-violet-100 font-medium"><Key className="w-3 h-3" />Key</span>}
          </div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mt-0.5">
            {categories.find(c => c.slug === item.category)?.name || item.category}
          </div>
        </div>
      ),
    },
    {
      header: 'Giá',
      accessorKey: 'price',
      cell: (item: Product) => (
        <span className="font-medium text-blue-600">{item.price > 0 ? formatCurrency(item.price) : 'Miễn phí'}</span>
      ),
    },
    {
      header: 'Trạng Thái',
      accessorKey: 'is_active',
      cell: (item: Product) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {item.is_active ? 'Bật' : 'Tắt'}
        </span>
      ),
    },
  ];

  return (
    <>
      <DataTable data={data} columns={columns} keyExtractor={(item) => item.id} onAdd={handleAdd} onEdit={handleEdit} onDelete={handleDelete} addButtonLabel="Thêm Sản Phẩm" />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? 'Sửa Sản Phẩm' : 'Thêm Sản Phẩm Mới'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput label="Tên Sản Phẩm" value={formData.title} onChange={handleTitleChange} required />
            <FormInput label="Đường dẫn (Slug)" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} required />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Danh Mục</label>
            <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500">
              {categories.map((cat) => <option key={cat.id} value={cat.slug}>{cat.name}</option>)}
            </select>
          </div>

          <FormTextarea label="Mô Tả Ngắn (Hiển thị ở Card)" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required className="min-h-[80px]" />
          <FormTextarea label="Nội Dung Chi Tiết (Hỗ trợ Markdown)" value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} placeholder="Viết chi tiết hướng dẫn, tính năng bằng Markdown..." className="min-h-[150px] font-mono text-sm" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput label="Giá Bán (VND)" type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })} required helperText="Nhập 0 nếu là sản phẩm miễn phí" />
            <FormInput label="Thứ Tự Hiển Thị" type="number" value={formData.sort_order} onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })} required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput label="Link Tải Xuống" type="url" value={formData.download_url || ''} onChange={(e) => setFormData({ ...formData, download_url: e.target.value })} placeholder="https://..." />
            <FormInput label="Link Demo / Xem Thử" type="url" value={formData.demo_url || ''} onChange={(e) => setFormData({ ...formData, demo_url: e.target.value })} placeholder="https://..." />
          </div>

          {/* Checkbox is_active */}
          <div className="flex items-center gap-2 pt-1">
            <input type="checkbox" id="is_active" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
            <label htmlFor="is_active" className="text-sm font-medium text-slate-700">Hiển thị sản phẩm trên cửa hàng</label>
          </div>

          {/* Checkbox has_key */}
          <div className="p-4 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="has_key" checked={formData.has_key} onChange={(e) => setFormData({ ...formData, has_key: e.target.checked })} className="w-4 h-4 text-violet-600 rounded border-slate-300 focus:ring-violet-500" />
              <label htmlFor="has_key" className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-violet-500" />
                Tool có Key bản quyền
              </label>
            </div>

            {formData.has_key && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <FormTextarea
                  label="Lời Cảm Ơn / Giới Thiệu (2-5 dòng, hiển thị trong email)"
                  value={formData.delivery_intro || ''}
                  onChange={(e) => setFormData({ ...formData, delivery_intro: e.target.value })}
                  placeholder="VD: Cảm ơn bạn đã tin tưởng sản phẩm của chúng tôi..."
                  className="min-h-[80px] text-sm"
                />
                <FormTextarea
                  label="Hướng Dẫn Sử Dụng (hiển thị trong email bàn giao)"
                  value={formData.delivery_note || ''}
                  onChange={(e) => setFormData({ ...formData, delivery_note: e.target.value })}
                  placeholder="Hướng dẫn cài đặt, sử dụng chi tiết..."
                  className="min-h-[100px] text-sm"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">
                      Key Test Miễn Phí
                      <span className="text-xs text-slate-400 font-normal ml-2">(mỗi dòng 1 key)</span>
                    </label>
                    <textarea
                      value={trialKeysText}
                      onChange={(e) => setTrialKeysText(e.target.value)}
                      placeholder={"KEY-TRIAL-001\nKEY-TRIAL-002\nKEY-TRIAL-003"}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-xs font-mono transition-all focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 hover:border-slate-300 min-h-[100px] resize-y"
                    />
                    <p className="text-xs text-slate-400">{trialKeysText.split('\n').filter(k => k.trim()).length} key sẽ được thêm</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">
                      Key Vĩnh Viễn
                      <span className="text-xs text-slate-400 font-normal ml-2">(mỗi dòng 1 key)</span>
                    </label>
                    <textarea
                      value={permanentKeysText}
                      onChange={(e) => setPermanentKeysText(e.target.value)}
                      placeholder={"KEY-PERM-001\nKEY-PERM-002\nKEY-PERM-003"}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-xs font-mono transition-all focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 hover:border-slate-300 min-h-[100px] resize-y"
                    />
                    <p className="text-xs text-slate-400">{permanentKeysText.split('\n').filter(k => k.trim()).length} key sẽ được thêm</p>
                  </div>
                </div>
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  Các key nhập ở đây sẽ được thêm mới vào kho. Key cũ không bị xoá.
                </p>
              </div>
            )}
          </div>

          <div className="pt-2">
            <ImageUpload label="Ảnh Sản Phẩm" value={formData.image_url} onChange={(url) => setFormData({ ...formData, image_url: url })} />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="submit" isLoading={isSaving}>Lưu Lại</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
