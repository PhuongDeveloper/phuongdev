/* ==========================================================================
   Trang Giới Thiệu (/about) - Server Component
   ========================================================================== */

import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AboutClient from './AboutClient';

export const metadata: Metadata = {
  title: 'Giới Thiệu',
  description: 'Thông tin cá nhân và hành trình phát triển của PhuongDev.',
};

export default async function AboutPage() {
  const supabase = await createClient();

  const { data: configRows } = await supabase
    .from('site_config')
    .select('key, value');

  const siteConfig: Record<string, string> = {};
  configRows?.forEach((row) => {
    siteConfig[row.key] = row.value;
  });

  return (
    <>
      <Navbar />
      <main className="min-h-screen pb-20 bg-slate-50/50">
        <AboutClient siteConfig={siteConfig} />
      </main>
      <Footer siteConfig={siteConfig} />
    </>
  );
}
