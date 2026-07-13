/* ==========================================================================
   Client Component Quản Lý Cấu Hình
   ========================================================================== */

'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import DataTable from '@/components/admin/DataTable';
import Modal from '@/components/ui/Modal';
import FormInput from '@/components/ui/FormInput';
import FormTextarea from '@/components/ui/FormTextarea';
import Button from '@/components/ui/Button';
import { type SiteConfig } from '@/lib/types/database';

interface SiteConfigClientProps {
  initialData: SiteConfig[];
}

export default function SiteConfigClient({ initialData }: SiteConfigClientProps) {
  const [data, setData] = useState<SiteConfig[]>(initialData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SiteConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');

  const supabase = createClient();

  const handleEdit = (item: SiteConfig) => {
    setEditingItem(item);
    setKey(item.key);
    setValue(item.value);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setKey('');
    setValue('');
    setIsModalOpen(true);
  };

  const handleDelete = async (item: SiteConfig) => {
    try {
      const { error } = await supabase
        .from('site_config')
        .delete()
        .eq('key', item.key);

      if (error) throw error;
      setData(data.filter((d) => d.key !== item.key));
    } catch (error) {
      console.error('Lỗi khi xoá cấu hình:', error);
      alert('Đã xảy ra lỗi khi xoá.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const payload = { key, value };

      if (editingItem) {
        // Cập nhật
        const { error } = await supabase
          .from('site_config')
          .update(payload)
          .eq('key', editingItem.key);

        if (error) throw error;

        setData(
          data.map((item) =>
            item.key === editingItem.key ? { ...item, ...payload } : item
          )
        );
      } else {
        // Thêm mới
        const { error } = await supabase.from('site_config').insert(payload);
        if (error) throw error;

        // Tạm thời lấy thời gian hiện tại
        const newItem: SiteConfig = {
          ...payload,
          updated_at: new Date().toISOString(),
        };
        setData([...data, newItem]);
      }

      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Lỗi khi lưu cấu hình:', error);
      alert(error.message || 'Đã xảy ra lỗi khi lưu.');
    } finally {
      setIsSaving(false);
    }
  };

  const columns = [
    {
      header: 'Khóa (Key)',
      accessorKey: 'key',
      cell: (item: SiteConfig) => (
        <span className="font-mono text-sm px-2 py-1 bg-slate-100 rounded text-slate-700">
          {item.key}
        </span>
      ),
    },
    {
      header: 'Giá trị (Value)',
      accessorKey: 'value',
      cell: (item: SiteConfig) => (
        <div className="max-w-md truncate" title={item.value}>
          {item.value}
        </div>
      ),
    },
    {
      header: 'Cập nhật lần cuối',
      accessorKey: 'updated_at',
      cell: (item: SiteConfig) =>
        new Date(item.updated_at).toLocaleString('vi-VN'),
    },
  ];

  return (
    <>
      <DataTable
        data={data}
        columns={columns}
        keyExtractor={(item) => item.key}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        addButtonLabel="Thêm cấu hình"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Sửa Cấu Hình' : 'Thêm Cấu Hình Mới'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="Khóa (Key)"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            disabled={!!editingItem} // Không cho sửa key nếu đang edit
            required
            placeholder="Ví dụ: site_title"
            helperText="Khóa chỉ được chứa chữ cái không dấu, số và dấu gạch dưới."
          />

          <FormTextarea
            label="Giá trị (Value)"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
            placeholder="Nhập giá trị cấu hình..."
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
