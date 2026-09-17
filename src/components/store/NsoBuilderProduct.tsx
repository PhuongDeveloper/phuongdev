'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, FileArchive } from 'lucide-react';

import type { NsoBuilderSettings, NsoBuildVersion, NsoPlatformChannel, NsoPlatformOffer } from '@/lib/types/database';

type Props = {
  settings: NsoBuilderSettings;
  versions: NsoBuildVersion[];
  channels: NsoPlatformChannel[];
  offers: NsoPlatformOffer[];
};

function price(value: number) {
  return value === 0 ? 'Miễn phí' : `${value.toLocaleString('vi-VN')}đ`;
}

export default function NsoBuilderProduct({ settings, versions, offers }: Props) {
  const [failedImage, setFailedImage] = useState(false);
  const activePrices = [
    ...versions.filter((version) => version.is_active).map((version) => Number(version.price)),
    ...offers.filter((offer) => offer.is_active).map((offer) => Number(offer.price)),
  ];
  const minPrice = activePrices.length ? Math.min(...activePrices) : 0;
  const totalBuilt = versions.reduce((sum, version) => sum + Number(version.sold_count || 0), 0);

  return (
    <Link href="/store/nso-builder" className="group overflow-hidden rounded-2xl border border-rose-200 bg-white text-left transition duration-300 hover:-translate-y-1 hover:border-rose-300 hover:shadow-xl hover:shadow-rose-100">
      <div className="relative aspect-[16/10] overflow-hidden bg-rose-50">
        {settings.banner_url && !failedImage ? (
          <Image src={settings.banner_url} alt={settings.title} fill className="object-contain transition duration-500 group-hover:scale-[1.015]" sizes="(max-width: 768px) 100vw, 33vw" onError={() => setFailedImage(true)} />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-rose-50"><FileArchive className="h-12 w-12 text-rose-300" /></div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-rose-600 shadow-sm">Build game</span>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0"><h3 className="line-clamp-1 text-lg font-black tracking-tight text-slate-900">{settings.title}</h3><p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">{settings.description}</p></div>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-500 transition group-hover:bg-[#ed4c50] group-hover:text-white"><ArrowUpRight className="h-4 w-4" /></span>
        </div>
        <div className="mt-5 flex items-end justify-between border-t border-rose-100 pt-4">
          <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Giá từ</p><p className="mt-0.5 text-xl font-black text-rose-600">{price(minPrice)}</p></div>
          <div className="text-right"><p className="text-xs font-bold text-emerald-600">Tạo tự động</p><p className="mt-1 text-[11px] text-slate-400">{totalBuilt.toLocaleString('vi-VN')} lượt tạo</p></div>
        </div>
      </div>
    </Link>
  );
}
