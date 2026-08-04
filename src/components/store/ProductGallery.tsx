'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Code2, Maximize2, ShieldCheck, Sparkles, Zap } from 'lucide-react';

type ProductGalleryProps = {
  title: string;
  imageUrl: string | null;
  galleryImages: string[];
};

export default function ProductGallery({ title, imageUrl, galleryImages }: ProductGalleryProps) {
  const images = Array.from(new Set([imageUrl, ...galleryImages].filter(Boolean))) as string[];
  const [activeImage, setActiveImage] = useState(images[0] || '');

  return (
    <div className="space-y-3">
      <div className="relative aspect-[16/10] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
        {activeImage ? (
          <Image src={activeImage} alt={title} fill priority className="object-cover" sizes="(max-width: 1024px) 100vw, 68vw" onError={() => setActiveImage('')} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(225,29,72,0.13),transparent_34%),linear-gradient(145deg,#ffffff,#eef2f7)]">
            <div className="text-center text-slate-400">
              <Code2 className="mx-auto mb-3 h-16 w-16" />
              <p className="text-sm font-semibold">Sản phẩm số PhuongDev</p>
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950/70 via-slate-900/20 to-transparent" />
        <button
          type="button"
          aria-label="Mở ảnh sản phẩm"
          className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-sm backdrop-blur-md transition hover:bg-white hover:text-rose-600"
          onClick={() => activeImage && window.open(activeImage, '_blank', 'noopener,noreferrer')}
        >
          <Maximize2 className="h-4 w-4" />
        </button>

        <div className="absolute inset-x-4 bottom-4 grid grid-cols-3 gap-2">
          {[
            { icon: ShieldCheck, title: 'Giao dịch bảo vệ', note: 'Lưu đơn & bằng chứng' },
            { icon: Zap, title: 'Bàn giao nhanh', note: 'Tự động sau thanh toán' },
            { icon: Sparkles, title: 'Đúng phiên bản', note: 'Gói nào, quyền lợi đó' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex min-w-0 items-center gap-2.5 rounded-2xl border border-white/60 bg-white/90 px-3 py-2.5 text-slate-900 shadow-sm backdrop-blur-md">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-rose-100 bg-rose-50 text-rose-600">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-bold uppercase tracking-wide">{item.title}</span>
                  <span className="block truncate text-[10px] text-slate-500">{item.note}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image) => (
            <button
              type="button"
              key={image}
              onClick={() => setActiveImage(image)}
              className={`relative h-20 w-28 shrink-0 overflow-hidden rounded-2xl border-2 transition ${
                activeImage === image ? 'border-rose-500' : 'border-slate-200 opacity-65 hover:opacity-100'
              }`}
            >
              <Image src={image} alt="Ảnh xem trước" fill className="object-cover" sizes="112px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
