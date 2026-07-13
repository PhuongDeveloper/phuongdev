/* ==========================================================================
   Trang Tổng Quan Admin (/admin) - Server Component
   ========================================================================== */

import { createClient } from '@/lib/supabase/server';
import Card from '@/components/ui/Card';
import { FolderKanban, Briefcase, ShoppingBag, Settings } from 'lucide-react';
import Link from 'next/link';

export default async function AdminDashboard() {
  const supabase = await createClient();

  // Lấy số lượng từ các bảng
  const [
    { count: projectsCount },
    { count: servicesCount },
    { count: productsCount }
  ] = await Promise.all([
    supabase.from('projects').select('*', { count: 'exact', head: true }),
    supabase.from('services').select('*', { count: 'exact', head: true }),
    supabase.from('products').select('*', { count: 'exact', head: true }),
  ]);

  const stats = [
    {
      title: 'Dự Án',
      value: projectsCount || 0,
      icon: FolderKanban,
      href: '/admin/projects',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Dịch Vụ',
      value: servicesCount || 0,
      icon: Briefcase,
      href: '/admin/services',
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      title: 'Sản Phẩm',
      value: productsCount || 0,
      icon: ShoppingBag,
      href: '/admin/products',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Tổng Quan</h2>
        <p className="text-slate-500">Chào mừng bạn trở lại CMS. Dưới đây là tóm tắt dữ liệu của bạn.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} variant="solid" className="flex items-center p-6 gap-4">
              <div className={`p-4 rounded-xl ${stat.bg}`}>
                <Icon className={`w-8 h-8 ${stat.color}`} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-500">{stat.title}</h3>
                <div className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <Card variant="solid" padding="lg">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-500" />
            Lối tắt quản trị
          </h3>
          <div className="space-y-3">
            <Link href="/admin/site-config" className="block p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-colors">
              <div className="font-medium text-slate-900">Cấu hình Website</div>
              <div className="text-sm text-slate-500 mt-1">Thay đổi tiêu đề, mô tả, liên kết mạng xã hội</div>
            </Link>
            <Link href="/admin/projects" className="block p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-colors">
              <div className="font-medium text-slate-900">Quản lý Dự án</div>
              <div className="text-sm text-slate-500 mt-1">Thêm, sửa, xoá các dự án trong portfolio</div>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
