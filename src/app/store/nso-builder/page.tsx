import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import NsoBuilderWorkspace from '@/components/store/NsoBuilderWorkspace';
import { createClient } from '@/lib/supabase/server';
import type { NsoBuilderSettings, NsoBuildVersion, NsoPlatformOffer, NsoStoreChannel } from '@/lib/types/database';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Tạo game Ninja School',
  description: 'Tạo phiên bản Ninja School theo server của bạn.',
  alternates: { canonical: '/store/nso-builder' },
};

export default async function NsoBuilderPage() {
  const supabase = await createClient();
  const [{ data: configRows }, { data: settings }, { data: versions }, { data: channels }, { data: offers }] = await Promise.all([
    supabase.from('site_config').select('key,value'),
    supabase.from('nso_builder_settings').select('*').eq('id', true).single(),
    supabase.from('nso_build_versions').select('code,name,description,price,clone_bundle_price,is_active,sold_count,sort_order,created_at,updated_at').eq('is_active', true).order('sort_order'),
    supabase.from('nso_platform_channels').select('id,platform,version_code,name,description,download_url,is_active,sort_order,created_at,updated_at').eq('is_active', true).order('sort_order'),
    supabase.from('nso_platform_offers').select('id,channel_id,name,duration_days,price,is_active,sort_order,created_at,updated_at').eq('is_active', true).order('sort_order'),
  ]);
  const siteConfig: Record<string, string> = {};
  configRows?.forEach((row) => { siteConfig[row.key] = row.value; });

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar siteConfig={siteConfig} />
      <main className="pb-16 pt-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Link href="/store" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-rose-500"><ArrowLeft className="h-4 w-4" />Cửa hàng</Link>
          <header className="mb-8 mt-6 border-b border-slate-200 pb-6">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Ninja School</h1>
            <p className="mt-2 text-sm text-slate-500">Tạo game theo server</p>
          </header>

          {settings ? (
            <NsoBuilderWorkspace
              settings={settings as NsoBuilderSettings}
              versions={(versions || []) as NsoBuildVersion[]}
              channels={(channels || []) as NsoStoreChannel[]}
              offers={(offers || []) as NsoPlatformOffer[]}
            />
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Tính năng đang tạm đóng.</div>
          )}
        </div>
      </main>
      <Footer siteConfig={siteConfig} />
    </div>
  );
}
