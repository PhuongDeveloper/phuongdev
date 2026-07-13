/* ==========================================================================
   Trang Dịch Vụ (/services) - Server Component
   Hiển thị danh sách các dịch vụ phần mềm từ database
   ========================================================================== */

import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ServicesList from './ServicesList';
import { Rocket } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Dịch Vụ',
  description: 'Các dịch vụ phát triển phần mềm chuyên nghiệp từ PhuongDev.',
};

export default async function ServicesPage() {
  const supabase = await createClient();

  // Lấy cấu hình site
  const { data: configRows } = await supabase
    .from('site_config')
    .select('key, value');

  const siteConfig: Record<string, string> = {};
  configRows?.forEach((row) => {
    siteConfig[row.key] = row.value;
  });

  // Lấy danh sách dịch vụ, sắp xếp theo thứ tự
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .order('sort_order', { ascending: true });

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-32 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
          {/* Danh sách dịch vụ (Client Component cho animation) */}
          <ServicesList services={services || []} />
        </div>
      </main>

      <Footer siteConfig={siteConfig} />
    </div>
  );
}
