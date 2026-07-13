/* ==========================================================================
   Client Component Quản Lý Dịch Vụ (Services)
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
import { type Service, type ServiceInsert } from '@/lib/types/database';

interface ServicesClientProps {
  initialData: Service[];
}

export default function ServicesClient({ initialData }: ServicesClientProps) {
  const [data, setData] = useState<Service[]>(initialData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Service | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<ServiceInsert>({
    title: '',
    slug: '',
    description: '',
    content: '',
    price_range: '',
    icon_name: 'Code2',
    image_url: '',
    features: [],
    redirect_url: '',
    sort_order: 0,
  });
  const [featuresInput, setFeaturesInput] = useState('');

  const supabase = createClient();

  const handleEdit = (item: Service) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      slug: item.slug || '',
      description: item.description,
      content: item.content || '',
      price_range: item.price_range || '',
      icon_name: item.icon_name,
      image_url: item.image_url || '',
      features: item.features,
      redirect_url: item.redirect_url || '',
      sort_order: item.sort_order,
    });
    setFeaturesInput(item.features.join('\n'));
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      title: '',
      slug: '',
      description: '',
      content: '',
      price_range: '',
      icon_name: 'Code2',
      image_url: '',
      features: [],
      redirect_url: '',
      sort_order: data.length,
    });
    setFeaturesInput('');
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

  const handleDelete = async (item: Service) => {
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', item.id);

      if (error) throw error;
      setData(data.filter((d) => d.id !== item.id));
    } catch (error) {
      console.error('Lỗi khi xoá dịch vụ:', error);
      alert('Đã xảy ra lỗi khi xoá.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Chuyển mỗi dòng thành một tính năng
      const featuresArray = featuresInput
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean);

      const payload: ServiceInsert = {
        ...formData,
        features: featuresArray,
      };

      if (editingItem) {
        const { data: updatedItem, error } = await supabase
          .from('services')
          .update(payload)
          .eq('id', editingItem.id)
          .select()
          .single();

        if (error) throw error;
        setData(
          data.map((item) => (item.id === editingItem.id ? updatedItem : item))
        );
      } else {
        const { data: newItem, error } = await supabase
          .from('services')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        setData([...data, newItem]);
      }

      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Lỗi khi lưu dịch vụ:', error);
      alert(error.message || 'Đã xảy ra lỗi khi lưu.');
    } finally {
      setIsSaving(false);
    }
  };

  const columns = [
    {
      header: 'Icon',
      accessorKey: 'icon_name',
      cell: (item: Service) => (
        <span className="font-mono text-xs px-2 py-1 bg-slate-100 rounded text-slate-600">
          {item.icon_name}
        </span>
      ),
    },
    {
      header: 'Tên Dịch Vụ',
      accessorKey: 'title',
      cell: (item: Service) => (
        <div className="font-medium text-slate-900">{item.title}</div>
      ),
    },
    {
      header: 'Giá',
      accessorKey: 'price_range',
      cell: (item: Service) => (
        <div className="text-blue-600 text-sm font-medium">
          {item.price_range || 'Liên hệ'}
        </div>
      ),
    },
    {
      header: 'Thứ Tự',
      accessorKey: 'sort_order',
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
        addButtonLabel="Thêm Dịch Vụ"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Sửa Dịch Vụ' : 'Thêm Dịch Vụ Mới'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Tên Dịch Vụ"
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Tên Icon (Lucide React)"
              value={formData.icon_name}
              onChange={(e) =>
                setFormData({ ...formData, icon_name: e.target.value })
              }
              required
              helperText="Ví dụ: Globe, Smartphone, Code2"
            />
            <FormInput
              label="Link Chuyển Hướng (Liên hệ / Đăng ký)"
              value={formData.redirect_url || ''}
              onChange={(e) =>
                setFormData({ ...formData, redirect_url: e.target.value })
              }
              placeholder="VD: /contact hoặc https://zalo.me/..."
            />
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
            placeholder="Mô tả chuyên sâu về dịch vụ..."
            className="min-h-[150px] font-mono text-sm"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Khoảng Giá"
              value={formData.price_range || ''}
              onChange={(e) =>
                setFormData({ ...formData, price_range: e.target.value })
              }
              placeholder="Ví dụ: Từ 3.000.000 VND"
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

          <FormTextarea
            label="Các Tính Năng (mỗi dòng một tính năng)"
            value={featuresInput}
            onChange={(e) => setFeaturesInput(e.target.value)}
            placeholder="Thiết kế UI/UX hiện đại&#10;Tối ưu SEO&#10;Bảo hành 12 tháng"
            className="min-h-[120px]"
          />

          <div className="pt-2">
            <ImageUpload
              label="Ảnh Banner Dịch Vụ"
              value={formData.image_url || ''}
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
