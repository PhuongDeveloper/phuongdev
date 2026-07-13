/* ==========================================================================
   Trang Quản Trị Cấu Hình (/admin/site-config) - Server Component
   ========================================================================== */

import { createClient } from '@/lib/supabase/server';
import SiteConfigClient from './SiteConfigClient';

export default async function SiteConfigPage() {
  const supabase = await createClient();

  const { data: config } = await supabase
    .from('site_config')
    .select('*')
    .order('key', { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Cấu Hình Website</h2>
        <p className="text-slate-500">Quản lý các thông tin chung của website như tiêu đề, mô tả, liên kết mạng xã hội.</p>
      </div>

      <SiteConfigClient initialData={config || []} />
    </div>
  );
}
