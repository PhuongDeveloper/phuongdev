/* ==========================================================================
   Admin Dashboard - Trang tổng quan doanh thu + thống kê
   ========================================================================== */

import { createClient } from '@/lib/supabase/server';
import { createClient as supabaseAdminCreate } from '@supabase/supabase-js';
import Link from 'next/link';
import {
  ShoppingBag, Users, TrendingUp, DollarSign, Package,
  ArrowUpRight, Briefcase, FolderKanban,
} from 'lucide-react';

// Sử dụng service role để đọc dữ liệu admin
function getAdminClient() {
  return supabaseAdminCreate(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function formatCurrencyVN(amount: number) {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toLocaleString('vi-VN');
}

export default async function AdminDashboard() {
  const supabase = await createClient();
  const admin = getAdminClient();

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

  const [
    { count: projectsCount },
    { count: servicesCount },
    { count: productsCount },
    { count: usersCount },
    revenueToday,
    revenueMonth,
    recentOrders,
    recentTransactions,
  ] = await Promise.all([
    supabase.from('projects').select('*', { count: 'exact', head: true }),
    supabase.from('services').select('*', { count: 'exact', head: true }),
    supabase.from('products').select('*', { count: 'exact', head: true }),
    admin.from('user_profiles').select('*', { count: 'exact', head: true }),
    admin.from('orders').select('amount').eq('status', 'completed').gte('created_at', startOfToday),
    admin.from('orders').select('amount').eq('status', 'completed').gte('created_at', startOfMonth),
    admin.from('orders').select('*').order('created_at', { ascending: false }).limit(8),
    admin.from('transactions').select('*').eq('status', 'completed').order('created_at', { ascending: false }).limit(8),
  ]);

  const todayRevenue = (revenueToday.data || []).reduce((s, o) => s + (o.amount || 0), 0);
  const monthRevenue = (revenueMonth.data || []).reduce((s, o) => s + (o.amount || 0), 0);

  const paymentLabel: Record<string, string> = {
    coin: 'Ví', bank_qr: 'QR Bank', free_trial: 'Miễn phí',
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Tổng Quan</h2>
        <p className="text-slate-500 mt-1">Dữ liệu kinh doanh và quản trị hệ thống.</p>
      </div>

      {/* Revenue cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: 'Doanh thu hôm nay',
            value: `${formatCurrencyVN(todayRevenue)} VND`,
            icon: DollarSign,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            border: 'border-emerald-100',
          },
          {
            title: 'Doanh thu tháng này',
            value: `${formatCurrencyVN(monthRevenue)} VND`,
            icon: TrendingUp,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            border: 'border-blue-100',
          },
          {
            title: 'Người Dùng',
            value: usersCount || 0,
            icon: Users,
            color: 'text-violet-600',
            bg: 'bg-violet-50',
            border: 'border-violet-100',
            href: '/admin/users',
          },
          {
            title: 'Sản Phẩm',
            value: productsCount || 0,
            icon: ShoppingBag,
            color: 'text-rose-600',
            bg: 'bg-rose-50',
            border: 'border-rose-100',
            href: '/admin/products',
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className={`bg-white border ${stat.border} rounded-2xl p-5 shadow-sm`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                {stat.href && (
                  <Link href={stat.href} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
              <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
              <div className="text-sm text-slate-500 mt-0.5">{stat.title}</div>
            </div>
          );
        })}
      </div>

      {/* Content stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { title: 'Dự Án', value: projectsCount || 0, icon: FolderKanban, href: '/admin/projects', color: 'text-blue-600', bg: 'bg-blue-50' },
          { title: 'Dịch Vụ', value: servicesCount || 0, icon: Briefcase, href: '/admin/services', color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { title: 'Sản Phẩm', value: productsCount || 0, icon: Package, href: '/admin/products', color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} href={stat.href}
              className="flex items-center gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-slate-300 hover:shadow-md transition-all group">
              <div className={`p-3 rounded-xl ${stat.bg} flex-shrink-0`}>
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">{stat.title}</div>
                <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 ml-auto transition-colors" />
            </Link>
          );
        })}
      </div>

      {/* Recent orders + transactions */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Đơn hàng gần đây */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Đơn Hàng Gần Đây</h3>
            <Link href="/admin/orders" className="text-xs text-rose-600 hover:underline font-medium">Xem tất cả</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {(recentOrders.data || []).length === 0 ? (
              <p className="px-5 py-8 text-sm text-slate-400 text-center">Chưa có đơn hàng nào.</p>
            ) : (
              (recentOrders.data || []).map((order: Record<string, unknown>) => (
                <div key={order.id as string} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{order.product_title as string}</p>
                    <p className="text-xs text-slate-400">{paymentLabel[order.payment_method as string] || order.payment_method as string} · {new Date(order.created_at as string).toLocaleDateString('vi-VN')}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="text-sm font-semibold text-slate-900">{(order.amount as number) > 0 ? `${(order.amount as number).toLocaleString('vi-VN')}` : 'Miễn phí'}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      order.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                      order.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                      'bg-red-50 text-red-700'
                    }`}>
                      {order.status === 'completed' ? 'Hoàn thành' : order.status === 'pending' ? 'Đang xử lý' : 'Thất bại'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Nạp tiền gần đây */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Nạp Tiền Gần Đây</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {(recentTransactions.data || []).length === 0 ? (
              <p className="px-5 py-8 text-sm text-slate-400 text-center">Chưa có giao dịch nào.</p>
            ) : (
              (recentTransactions.data || []).map((tx: Record<string, unknown>) => (
                <div key={tx.id as string} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-mono font-medium text-slate-800">{tx.transaction_code as string}</p>
                    <p className="text-xs text-slate-400">{new Date(tx.created_at as string).toLocaleDateString('vi-VN')}</p>
                  </div>
                  <p className="text-sm font-bold text-emerald-600 flex-shrink-0 ml-3">+{(tx.amount as number).toLocaleString('vi-VN')}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Quản Trị Nhanh</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { href: '/admin/site-config', label: 'Cấu hình Website', desc: 'Tiêu đề, mô tả, mạng xã hội' },
            { href: '/admin/products', label: 'Quản lý Sản Phẩm', desc: 'Thêm, sửa, xoá sản phẩm, key' },
            { href: '/admin/orders', label: 'Quản lý Đơn Hàng', desc: 'Xem và xử lý đơn hàng' },
            { href: '/admin/users', label: 'Quản lý Người Dùng', desc: 'Xem hồ sơ, điều chỉnh coin' },
            { href: '/admin/blogs', label: 'Quản lý Blog', desc: 'Bài viết công nghệ' },
            { href: '/admin/projects', label: 'Quản lý Dự Án', desc: 'Portfolio dự án' },
          ].map((item) => (
            <Link key={item.href} href={item.href}
              className="block p-3.5 rounded-xl border border-slate-100 hover:border-rose-200 hover:bg-rose-50/50 transition-all group">
              <div className="font-medium text-slate-900 group-hover:text-rose-700 text-sm">{item.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{item.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
