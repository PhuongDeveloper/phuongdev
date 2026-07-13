/* ==========================================================================
   Trang Quản Trị Cộng Đồng (/admin/communities) - Server Component
   ========================================================================== */

import { createClient } from '@/lib/supabase/server';
import CommunitiesClient from './CommunitiesClient';

export default async function CommunitiesPage() {
  const supabase = await createClient();

  const { data: communities } = await supabase
    .from('communities')
    .select('*')
    .order('sort_order', { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Quản Lý Cộng Đồng</h2>
        <p className="text-slate-500">Quản lý các nhóm, máy chủ và kênh cộng đồng của bạn.</p>
      </div>

      <CommunitiesClient initialData={communities || []} />
    </div>
  );
}
