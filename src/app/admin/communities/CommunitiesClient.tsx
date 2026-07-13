/* ==========================================================================
   Client Component Quản Lý Cộng Đồng (Communities)
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
import { type Community, type CommunityInsert } from '@/lib/types/database';

interface CommunitiesClientProps {
  initialData: Community[];
}

export default function CommunitiesClient({ initialData }: CommunitiesClientProps) {
  const [data, setData] = useState<Community[]>(initialData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Community | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CommunityInsert>({
    name: '',
    description: '',
    url: '',
    image_url: '',
    button_text: 'Tham gia ngay',
    is_active: true,
    sort_order: 0,
  });

  const supabase = createClient();

  const handleEdit = (item: Community) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      url: item.url,
      image_url: item.image_url || '',
      button_text: item.button_text,
      is_active: item.is_active,
      sort_order: item.sort_order,
    });
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      description: '',
      url: '',
      image_url: '',
      button_text: 'Tham gia ngay',
      is_active: true,
      sort_order: data.length,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (item: Community) => {
    try {
      const { error } = await supabase
        .from('communities')
        .delete()
        .eq('id', item.id);

      if (error) throw error;
      setData(data.filter((d) => d.id !== item.id));
    } catch (error) {
      console.error('Lỗi khi xoá cộng đồng:', error);
      alert('Đã xảy ra lỗi khi xoá.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (editingItem) {
        const { data: updatedItem, error } = await supabase
          .from('communities')
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
          .from('communities')
          .insert(formData)
          .select()
          .single();

        if (error) throw error;
        setData([...data, newItem]);
      }

      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Lỗi khi lưu cộng đồng:', error);
      alert(error.message || 'Đã xảy ra lỗi khi lưu.');
    } finally {
      setIsSaving(false);
    }
  };

  const columns = [
    {
      header: 'Tên Cộng Đồng',
      accessorKey: 'name',
      cell: (item: Community) => (
        <div className="font-medium text-slate-900">{item.name}</div>
      ),
    },
    {
      header: 'Link',
      accessorKey: 'url',
      cell: (item: Community) => (
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm truncate max-w-[200px] block">
          {item.url}
        </a>
      ),
    },
    {
      header: 'Thứ Tự',
      accessorKey: 'sort_order',
    },
    {
      header: 'Trạng Thái',
      accessorKey: 'is_active',
      cell: (item: Community) => (
        <span className={`text-xs px-2 py-1 rounded font-medium ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
          {item.is_active ? 'Hiển thị' : 'Ẩn'}
        </span>
      ),
    }
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
        addButtonLabel="Thêm Cộng Đồng"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Sửa Cộng Đồng' : 'Thêm Cộng Đồng Mới'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Tên Cộng Đồng"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <FormInput
              label="Đường Link Tham Gia"
              value={formData.url}
              onChange={(e) =>
                setFormData({ ...formData, url: e.target.value })
              }
              required
              placeholder="https://..."
            />
          </div>

          <FormTextarea
            label="Mô Tả"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            required
            className="min-h-[80px]"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Nội dung nút bấm"
              value={formData.button_text}
              onChange={(e) =>
                setFormData({ ...formData, button_text: e.target.value })
              }
              required
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
          
          <div className="flex items-center gap-2 pt-2 pb-4">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
              Cho phép hiển thị trên trang chủ / trang cộng đồng
            </label>
          </div>

          <div className="pt-2">
            <ImageUpload
              label="Ảnh Banner Cộng Đồng"
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
