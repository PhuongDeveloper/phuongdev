/* ==========================================================================
   Trang Profile (/profile) - Server Component
   Navbar & Footer được render ở server, ProfilePageClient là client-only
   ========================================================================== */

import { Suspense } from 'react';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ProfilePageClient from './ProfilePageClient';

export const metadata: Metadata = {
  title: 'Hồ Sơ Cá Nhân | PhuongDev Shop',
  description: 'Quản lý hồ sơ, số dư ví và lịch sử mua hàng của bạn.',
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: configRows } = await supabase.from('site_config').select('key, value');
  const siteConfig: Record<string, string> = {};
  configRows?.forEach((row) => { siteConfig[row.key] = row.value; });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <Suspense fallback={
        <main className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
        </main>
      }>
        <ProfilePageClient />
      </Suspense>
      <Footer siteConfig={siteConfig} />
    </div>
  );
}
