/* ==========================================================================
   Client Component Quản Lý Danh Mục (Categories)
   ========================================================================== */

'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import DataTable from '@/components/admin/DataTable';
import Modal from '@/components/ui/Modal';
import FormInput from '@/components/ui/FormInput';
import FormTextarea from '@/components/ui/FormTextarea';
import Button from '@/components/ui/Button';
import { type Category, type CategoryInsert } from '@/lib/types/database';

interface CategoriesClientProps {
  initialData: Category[];
}

export default function CategoriesClient({ initialData }: CategoriesClientProps) {
  const [data, setData] = useState<Category[]>(initialData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Category | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CategoryInsert>({
    name: '',
    slug: '',
    description: '',
    sort_order: 0,
  });

  const supabase = createClient();

  const handleEdit = (item: Category) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      slug: item.slug,
      description: item.description || '',
      sort_order: item.sort_order,
    });
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      sort_order: data.length,
    });
    setIsModalOpen(true);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    if (!editingItem && name) {
      const slug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setFormData({ ...formData, name, slug });
    } else {
      setFormData({ ...formData, name });
    }
  };

  const handleDelete = async (item: Category) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', item.id);

      if (error) throw error;
      setData(data.filter((d) => d.id !== item.id));
    } catch (error) {
      console.error('Lỗi khi xoá danh mục:', error);
      alert('Đã xảy ra lỗi khi xoá.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (editingItem) {
        const { data: updatedItem, error } = await supabase
          .from('categories')
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
          .from('categories')
          .insert(formData)
          .select()
          .single();

        if (error) throw error;
        setData([...data, newItem]);
      }

      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Lỗi khi lưu danh mục:', error);
      alert(error.message || 'Đã xảy ra lỗi khi lưu.');
    } finally {
      setIsSaving(false);
    }
  };

  const columns = [
    {
      header: 'Tên Danh Mục',
      accessorKey: 'name',
      cell: (item: Category) => (
        <div>
          <div className="font-medium text-slate-900">{item.name}</div>
          <div className="text-xs text-slate-500 mt-0.5">/{item.slug}</div>
        </div>
      ),
    },
    {
      header: 'Mô Tả',
      accessorKey: 'description',
      cell: (item: Category) => (
        <span className="text-sm text-slate-600 line-clamp-2">
          {item.description || '-'}
        </span>
      ),
    },
    {
      header: 'Thứ Tự',
      accessorKey: 'sort_order',
      cell: (item: Category) => (
        <span className="font-medium text-slate-700">
          {item.sort_order}
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
        addButtonLabel="Thêm Danh Mục"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Sửa Danh Mục' : 'Thêm Danh Mục Mới'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="Tên Danh Mục"
            value={formData.name}
            onChange={handleNameChange}
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

          <FormTextarea
            label="Mô Tả"
            value={formData.description || ''}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            className="min-h-[80px]"
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
