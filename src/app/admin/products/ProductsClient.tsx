/* ==========================================================================
   Client Component Quản Lý Sản Phẩm (Products)
   ========================================================================== */

'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import DataTable from '@/components/admin/DataTable';
import Modal from '@/components/ui/Modal';
import FormInput from '@/components/ui/FormInput';
import FormTextarea from '@/components/ui/FormTextarea';
import Button from '@/components/ui/Button';
import ImageUpload from '@/components/ui/ImageUpload';
import { type Product, type ProductInsert } from '@/lib/types/database';
import { formatCurrency } from '@/utils/helpers';

interface ProductsClientProps {
  initialData: Product[];
}

export default function ProductsClient({ initialData }: ProductsClientProps) {
  const [data, setData] = useState<Product[]>(initialData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<ProductInsert>({
    title: '',
    slug: '',
    description: '',
    content: '',
    price: 0,
    download_url: '',
    demo_url: '',
    image_url: '',
    category: 'script',
    is_active: true,
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
      sort_order: item.sort_order,
    });
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      title: '',
      slug: '',
      description: '',
      content: '',
      price: 0,
      download_url: '',
      demo_url: '',
      image_url: '',
      category: 'script',
      is_active: true,
      sort_order: data.length,
    });
    setIsModalOpen(true);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    if (!editingItem && title) {
      const slug = title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setFormData({ ...formData, title, slug });
    } else {
      setFormData({ ...formData, title });
    }
  };

  const handleDelete = async (item: Product) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', item.id);

      if (error) throw error;
      setData(data.filter((d) => d.id !== item.id));
    } catch (error) {
      console.error('Lỗi khi xoá sản phẩm:', error);
      alert('Đã xảy ra lỗi khi xoá.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (editingItem) {
        const { data: updatedItem, error } = await supabase
          .from('products')
          .update(formData)
          .eq('id', editingItem.id)
          .select()
          .single();

        if (error) throw error;
        setData(
          data.map((item) => (item.id === editingItem.id ? updatedItem : item))
        );
      } else {
        const { data: newItem, error } = await supabase
          .from('products')
          .insert(formData)
          .select()
          .single();

        if (error) throw error;
        setData([...data, newItem]);
      }

      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Lỗi khi lưu sản phẩm:', error);
      alert(error.message || 'Đã xảy ra lỗi khi lưu.');
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
          {item.image_url && (
            <img
              src={item.image_url}
              alt={item.title}
              className="w-full h-full object-cover"
            />
          )}
        </div>
      ),
    },
    {
      header: 'Sản Phẩm',
      accessorKey: 'title',
      cell: (item: Product) => (
        <div>
          <div className="font-medium text-slate-900">{item.title}</div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mt-0.5">
            {item.category}
          </div>
        </div>
      ),
    },
    {
      header: 'Giá',
      accessorKey: 'price',
      cell: (item: Product) => (
        <span className="font-medium text-blue-600">
          {item.price > 0 ? formatCurrency(item.price) : 'Miễn phí'}
        </span>
      ),
    },
    {
      header: 'Trạng Thái',
      accessorKey: 'is_active',
      cell: (item: Product) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            item.is_active
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {item.is_active ? 'Bật' : 'Tắt'}
        </span>
      ),
    },
  ];

  return (
    <>
      <DataTable
        data={data}
        columns={columns}
        keyExtractor={(item) => item.id}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        addButtonLabel="Thêm Sản Phẩm"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Sửa Sản Phẩm' : 'Thêm Sản Phẩm Mới'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Tên Sản Phẩm"
              value={formData.title}
              onChange={handleTitleChange}
              required
            />
            <FormInput
              label="Đường dẫn (Slug)"
              value={formData.slug}
              onChange={(e) =>
                setFormData({ ...formData, slug: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Danh Mục
            </label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            >
              <option value="script">Script / Mã Nguồn</option>
              <option value="template">Template Giao Diện</option>
              <option value="bot">Bot / Tool</option>
              <option value="other">Khác</option>
            </select>
          </div>

          <FormTextarea
            label="Mô Tả Ngắn (Hiển thị ở Card)"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            required
            className="min-h-[80px]"
          />
          
          <FormTextarea
            label="Nội Dung Chi Tiết (Hỗ trợ Markdown)"
            value={formData.content}
            onChange={(e) =>
              setFormData({ ...formData, content: e.target.value })
            }
            placeholder="Viết chi tiết hướng dẫn, tính năng bằng Markdown..."
            className="min-h-[150px] font-mono text-sm"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Giá Bán (VND)"
              type="number"
              value={formData.price}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  price: parseInt(e.target.value) || 0,
                })
              }
              required
              helperText="Nhập 0 nếu là sản phẩm miễn phí"
            />
            <FormInput
              label="Thứ Tự Hiển Thị"
              type="number"
              value={formData.sort_order}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  sort_order: parseInt(e.target.value) || 0,
                })
              }
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Link Tải Xuống / Mua Ngay"
              type="url"
              value={formData.download_url || ''}
              onChange={(e) =>
                setFormData({ ...formData, download_url: e.target.value })
              }
              placeholder="https://..."
            />
            <FormInput
              label="Link Demo / Xem Thử"
              type="url"
              value={formData.demo_url || ''}
              onChange={(e) =>
                setFormData({ ...formData, demo_url: e.target.value })
              }
              placeholder="https://..."
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) =>
                setFormData({ ...formData, is_active: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
              Trạng thái (Hiển thị sản phẩm trên cửa hàng)
            </label>
          </div>

          <div className="pt-2">
            <ImageUpload
              label="Ảnh Sản Phẩm"
              value={formData.image_url}
              onChange={(url) => setFormData({ ...formData, image_url: url })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Hủy
            </Button>
            <Button type="submit" isLoading={isSaving}>
              Lưu Lại
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
