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

  const [
    { data: configRows },
    { data: projects },
    { data: services },
    { data: products },
    { data: blogs },
  ] = await Promise.all([
    supabase.from('site_config').select('key, value'),
    supabase.from('projects').select('*').eq('is_featured', true).order('sort_order', { ascending: true }).limit(10),
    supabase.from('services').select('*').order('sort_order', { ascending: true }).limit(3),
    supabase.from('products').select('id,title,slug,description,price,demo_url,image_url,category,is_active,badge,total_sold,is_featured,sort_order,views,created_at,updated_at').eq('is_active', true).order('sort_order', { ascending: true }).limit(3),
    supabase.from('blogs').select('*').eq('is_published', true).order('created_at', { ascending: false }).limit(3),
  ]);

  const siteConfig: Record<string, string> = {};
  configRows?.forEach((row) => {
    siteConfig[row.key] = row.value;
  });

  return (
    <div className="bg-white selection:bg-rose-100 selection:text-rose-900">
      <Navbar siteConfig={siteConfig} />
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
