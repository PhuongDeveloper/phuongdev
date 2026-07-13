/* ==========================================================================
   Client Component Quản Lý Dự Án (Projects)
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
import { type Project, type ProjectInsert } from '@/lib/types/database';

interface ProjectsClientProps {
  initialData: Project[];
}

export default function ProjectsClient({ initialData }: ProjectsClientProps) {
  const [data, setData] = useState<Project[]>(initialData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Project | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<ProjectInsert>({
    title: '',
    description: '',
    technologies: [],
    github_url: '',
    demo_url: '',
    image_url: '',
    is_featured: false,
    sort_order: 0,
  });
  const [techInput, setTechInput] = useState('');

  const supabase = createClient();

  const handleEdit = (item: Project) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description,
      technologies: item.technologies,
      github_url: item.github_url || '',
      demo_url: item.demo_url || '',
      image_url: item.image_url || '',
      is_featured: item.is_featured,
      sort_order: item.sort_order,
    });
    setTechInput(item.technologies.join(', '));
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      title: '',
      description: '',
      technologies: [],
      github_url: '',
      demo_url: '',
      image_url: '',
      is_featured: false,
      sort_order: data.length, // Tự động lấy order cuối cùng
    });
    setTechInput('');
    setIsModalOpen(true);
  };

  const handleDelete = async (item: Project) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', item.id);

      if (error) throw error;
      setData(data.filter((d) => d.id !== item.id));
    } catch (error) {
      console.error('Lỗi khi xoá dự án:', error);
      alert('Đã xảy ra lỗi khi xoá.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Chuẩn bị payload, chuyển đổi mảng công nghệ
      const technologiesArray = techInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const payload: ProjectInsert = {
        ...formData,
        technologies: technologiesArray,
      };

      if (editingItem) {
        // Cập nhật
        const { data: updatedItem, error } = await supabase
          .from('projects')
          .update(payload)
          .eq('id', editingItem.id)
          .select()
          .single();

        if (error) throw error;

        setData(
          data.map((item) => (item.id === editingItem.id ? updatedItem : item))
        );
      } else {
        // Thêm mới
        const { data: newItem, error } = await supabase
          .from('projects')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        setData([...data, newItem]);
      }

      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Lỗi khi lưu dự án:', error);
      alert(error.message || 'Đã xảy ra lỗi khi lưu.');
    } finally {
      setIsSaving(false);
    }
  };

  const columns = [
    {
      header: 'Ảnh',
      accessorKey: 'image_url',
      cell: (item: Project) => (
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
      header: 'Tên Dự Án',
      accessorKey: 'title',
      cell: (item: Project) => (
        <div>
          <div className="font-medium text-slate-900">{item.title}</div>
          <div className="text-xs text-slate-500 mt-1 truncate max-w-[200px]">
            {item.description}
          </div>
        </div>
      ),
    },
    {
      header: 'Nổi Bật',
      accessorKey: 'is_featured',
      cell: (item: Project) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            item.is_featured
              ? 'bg-blue-100 text-blue-700'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {item.is_featured ? 'Có' : 'Không'}
        </span>
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
        addButtonLabel="Thêm Dự Án"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Sửa Dự Án' : 'Thêm Dự Án Mới'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Tên Dự Án"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
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

          <FormTextarea
            label="Mô Tả"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            required
          />

          <FormInput
            label="Công Nghệ (cách nhau bởi dấu phẩy)"
            value={techInput}
            onChange={(e) => setTechInput(e.target.value)}
            placeholder="Next.js, React, Tailwind CSS..."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="GitHub URL"
              type="url"
              value={formData.github_url || ''}
              onChange={(e) =>
                setFormData({ ...formData, github_url: e.target.value })
              }
            />
            <FormInput
              label="Demo URL"
              type="url"
              value={formData.demo_url || ''}
              onChange={(e) =>
                setFormData({ ...formData, demo_url: e.target.value })
              }
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_featured"
              checked={formData.is_featured}
              onChange={(e) =>
                setFormData({ ...formData, is_featured: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <label htmlFor="is_featured" className="text-sm font-medium text-slate-700">
              Đánh dấu là dự án nổi bật (hiển thị ở trang chủ)
            </label>
          </div>

          <div className="pt-2">
            <ImageUpload
              label="Ảnh Minh Hoạ (tuỳ chọn)"
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
