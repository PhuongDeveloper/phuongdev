/* ==========================================================================
   Trang Quản Trị Dự Án (/admin/projects) - Server Component
   ========================================================================== */

import { createClient } from '@/lib/supabase/server';
import ProjectsClient from './ProjectsClient';

export default async function ProjectsPage() {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .order('sort_order', { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Quản Lý Dự Án</h2>
        <p className="text-slate-500">Thêm, sửa, xoá và sắp xếp các dự án trong portfolio của bạn.</p>
      </div>

      <ProjectsClient initialData={projects || []} />
    </div>
  );
}
