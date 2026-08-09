/* ==========================================================================
   Component ImageUpload - Upload ảnh với xem trước (preview)
   Gửi file lên /api/upload và trả về URL ảnh từ ImgBB
   ========================================================================== */

'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/utils/helpers';

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  className?: string;
}

async function readUploadResponse(response: Response) {
  const text = await response.text();
  if (!text) return {} as { error?: string; url?: string };
  try {
    return JSON.parse(text) as { error?: string; url?: string };
  } catch {
    return {
      error: response.ok
        ? 'Máy chủ trả về dữ liệu ảnh không hợp lệ.'
        : `Upload thất bại (mã ${response.status}).`,
    };
  }
}

export default function ImageUpload({
  value,
  onChange,
  label = 'Hình ảnh',
  className,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** Xử lý khi chọn file */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
        cache: 'no-store',
      });

      const data = await readUploadResponse(response);

      if (!response.ok) {
        throw new Error(data.error || 'Không thể upload ảnh.');
      }

      if (!data.url) throw new Error('Máy chủ không trả về đường dẫn ảnh.');
      onChange(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi khi upload ảnh.');
    } finally {
      setIsUploading(false);
      // Reset input để có thể chọn lại cùng file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  /** Xoá ảnh đã chọn */
  const handleRemove = () => {
    onChange(null);
    setError(null);
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="block text-sm font-medium text-slate-700">
        {label}
      </label>

      {/* Khu vực hiển thị ảnh hoặc nút upload */}
      {value ? (
        <div className="relative h-48 group rounded-xl overflow-hidden border border-slate-200">
          <Image
            src={value}
            alt="Ảnh đã upload"
            fill
            sizes="(max-width: 768px) 100vw, 640px"
            className="w-full h-48 object-cover"
          />
          {/* Nút xoá ảnh */}
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            aria-label="Xoá ảnh"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center gap-3 p-8',
            'border-2 border-dashed border-slate-200 rounded-xl',
            'hover:border-blue-400 hover:bg-blue-50/30 transition-all',
            'cursor-pointer',
            isUploading && 'pointer-events-none opacity-60'
          )}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <span className="text-sm text-slate-500">Đang tải ảnh lên...</span>
            </>
          ) : (
            <>
              <div className="p-3 rounded-full bg-blue-50">
                <Upload className="w-6 h-6 text-blue-500" />
              </div>
              <div className="text-center">
                <span className="text-sm font-medium text-slate-700">
                  Nhấn để chọn ảnh
                </span>
                <p className="text-xs text-slate-400 mt-1">
                  JPEG, PNG, GIF, WebP (tối đa 32MB)
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Input file ẩn */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Thông báo lỗi */}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <ImageIcon className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}
