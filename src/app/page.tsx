/* ==========================================================================
   Trang chủ (/) - Server Component
   ========================================================================== */

import { createClient } from '@/lib/supabase/server';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import HeroSection from '@/components/sections/HeroSection';
import HomeServices from '@/components/sections/HomeServices';
import HomeProducts from '@/components/sections/HomeProducts';
import HomeBlogs from '@/components/sections/HomeBlogs';
import FeaturedProjects from '@/components/sections/FeaturedProjects';

export default async function HomePage() {
  const supabase = await createClient();

  // Lấy cấu hình site từ database
  const { data: configRows } = await supabase
    .from('site_config')
    .select('key, value');

  const siteConfig: Record<string, string> = {};
  configRows?.forEach((row) => {
    siteConfig[row.key] = row.value;
  });

  // Lấy danh sách dự án nổi bật (limit 10 để lướt ngang)
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('is_featured', true)
    .order('sort_order', { ascending: true })
    .limit(10);

  // Lấy danh sách dịch vụ (limit 3)
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .order('sort_order', { ascending: true })
    .limit(3);

  // Lấy danh sách sản phẩm nổi bật (limit 3)
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .limit(3);

  // Lấy danh sách blog mới nhất (limit 3)
  const { data: blogs } = await supabase
    .from('blogs')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(3);

  return (
    <div className="bg-white selection:bg-rose-100 selection:text-rose-900">
      <Navbar />
      <main className="min-h-screen">
        <HeroSection siteConfig={siteConfig} />
        
        {/* Lưới thông tin hiển thị ngay trang chủ */}
        <div className="relative">
          <FeaturedProjects projects={projects || []} />
          <HomeProducts products={products || []} />
          <HomeServices services={services || []} />
          <HomeBlogs blogs={blogs || []} />
        </div>
      </main>
      <Footer siteConfig={siteConfig} />
    </div>
  );
}
