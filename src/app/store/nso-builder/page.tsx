import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Zap } from 'lucide-react';

import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import NsoBuilderWorkspace from '@/components/store/NsoBuilderWorkspace';
import { createClient } from '@/lib/supabase/server';
import type { NsoBuilderSettings, NsoBuildVersion, NsoPlatformChannel, NsoPlatformOffer } from '@/lib/types/database';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Tạo client Ninja School',
  description: 'Tạo JAR Ninja School theo server và quản lý bản APK, PC, iOS.',
  alternates: { canonical: '/store/nso-builder' },
};

export default async function NsoBuilderPage() {
  const supabase = await createClient();
  const [{ data: configRows }, { data: settings }, { data: versions }, { data: channels }, { data: offers }] = await Promise.all([
    supabase.from('site_config').select('key,value'),
    supabase.from('nso_builder_settings').select('*').eq('id', true).single(),
    supabase.from('nso_build_versions').select('code,name,description,price,clone_bundle_price,is_active,sold_count,sort_order,created_at,updated_at').eq('is_active', true).order('sort_order'),
    supabase.from('nso_platform_channels').select('id,platform,version_code,name,description,endpoint_slug,download_url,is_active,sort_order,created_at,updated_at').eq('is_active', true).order('sort_order'),
    supabase.from('nso_platform_offers').select('id,channel_id,name,duration_days,price,is_active,sort_order,created_at,updated_at').eq('is_active', true).order('sort_order'),
  ]);
  const siteConfig: Record<string, string> = {};
  configRows?.forEach((row) => { siteConfig[row.key] = row.value; });

  return (
    <div className="min-h-screen bg-[#fffafa]">
      <Navbar siteConfig={siteConfig} />
      <main className="pb-16 pt-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Link href="/store" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-rose-500"><ArrowLeft className="h-4 w-4" />Cửa hàng</Link>
          <header className="mb-7 mt-5 overflow-hidden rounded-3xl border border-rose-100 bg-white px-6 py-7 shadow-sm sm:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-rose-500"><Zap className="h-3.5 w-3.5" />Tạo tự động</div><h1 className="text-3xl font-black tracking-[-0.035em] text-slate-900 sm:text-4xl">{settings?.title || 'Tạo client Ninja School'}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Chọn phiên bản, nhập server và tải file.</p></div>
              <div className="flex gap-1.5">{['x1', 'x3', 'x6', 'x12', 'x24'].map((item) => <span key={item} className="grid h-10 min-w-10 place-items-center rounded-xl border border-rose-200 bg-rose-50 px-2 font-mono text-xs font-black text-rose-500">{item}</span>)}</div>
            </div>
          </header>

          {settings ? (
            <NsoBuilderWorkspace
              settings={settings as NsoBuilderSettings}
              versions={(versions || []) as NsoBuildVersion[]}
              channels={(channels || []) as NsoPlatformChannel[]}
              offers={(offers || []) as NsoPlatformOffer[]}
            />
          ) : (
            <div className="rounded-3xl border border-rose-100 bg-white p-10 text-center text-sm text-slate-500">Tính năng đang tạm đóng.</div>
          )}
        </div>
      </main>
      <Footer siteConfig={siteConfig} />
    </div>
  );
}
