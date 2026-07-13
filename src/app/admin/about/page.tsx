/* ==========================================================================
   Trang Quản Trị Giới Thiệu (/admin/about) - Server Component
   ========================================================================== */

import { createClient } from '@/lib/supabase/server';
import AboutConfigClient from './AboutConfigClient';

export default async function AdminAboutConfigPage() {
  const supabase = await createClient();

  // Lấy toàn bộ cấu hình
  const { data: configRows, error } = await supabase
    .from('site_config')
    .select('key, value');

  if (error) {
    console.error('Lỗi khi tải site config:', error);
  }

  const siteConfig: Record<string, string> = {};
  configRows?.forEach((row) => {
    siteConfig[row.key] = row.value;
  });

  return <AboutConfigClient initialConfig={siteConfig} />;
}
