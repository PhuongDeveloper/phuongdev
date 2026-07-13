/* ==========================================================================
   Component DataTable - Bảng hiển thị dữ liệu có thể tái sử dụng cho Admin
   ========================================================================== */

'use client';

import { useState } from 'react';
import { Pencil, Trash2, Plus, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

interface Column<T> {
  header: string;
  accessorKey: keyof T | string;
  cell?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onAdd?: () => void;
  isLoading?: boolean;
  addButtonLabel?: string;
  keyExtractor: (item: T) => string;
}

export default function DataTable<T>({
  data,
  columns,
  onEdit,
  onDelete,
  onAdd,
  isLoading = false,
  addButtonLabel = 'Thêm mới',
  keyExtractor,
}: DataTableProps<T>) {
  return (
    <div className="space-y-4">
      {/* Thanh công cụ */}
      {onAdd && (
        <div className="flex justify-end">
          <Button onClick={onAdd} icon={<Plus className="w-4 h-4" />}>
            {addButtonLabel}
          </Button>
        </div>
      )}

      {/* Bảng dữ liệu */}
      <Card variant="solid" padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-medium">
              <tr>
                {columns.map((col, idx) => (
                  <th key={idx} className="px-6 py-4 whitespace-nowrap">
                    {col.header}
                  </th>
                ))}
                {(onEdit || onDelete) && (
                  <th className="px-6 py-4 text-right">Thao tác</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin mx-auto" />
                    <p className="mt-2 text-slate-500">Đang tải dữ liệu...</p>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-6 py-12 text-center text-slate-500">
                    Không có dữ liệu.
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={keyExtractor(item)} className="hover:bg-slate-50/50 transition-colors">
                    {columns.map((col, idx) => (
                      <td key={idx} className="px-6 py-4">
                        {col.cell
                          ? col.cell(item)
                          : String(item[col.accessorKey as keyof T] || '')}
                      </td>
                    ))}
                    {(onEdit || onDelete) && (
                      <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(item)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex cursor-pointer"
                            title="Sửa"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => {
                              if (window.confirm('Bạn có chắc chắn muốn xoá mục này không?')) {
                                onDelete(item);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex cursor-pointer"
                            title="Xoá"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
