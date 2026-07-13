/* ==========================================================================
   Trang Quản Trị Dịch Vụ (/admin/services) - Server Component
   ========================================================================== */

import { createClient } from '@/lib/supabase/server';
import ServicesClient from './ServicesClient';

export default async function ServicesPage() {
  const supabase = await createClient();

  const { data: services } = await supabase
    .from('services')
    .select('*')
    .order('sort_order', { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Quản Lý Dịch Vụ</h2>
        <p className="text-slate-500">Cập nhật danh sách các dịch vụ bạn đang cung cấp cho khách hàng.</p>
      </div>

      <ServicesClient initialData={services || []} />
    </div>
  );
}
