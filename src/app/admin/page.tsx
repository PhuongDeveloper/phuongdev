import Link from 'next/link';
import {
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
  Clock3,
  PackageX,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react';

import { createAdminClient } from '@/lib/supabase/admin';

function money(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}tr`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return value.toLocaleString('vi-VN');
}

export default async function AdminDashboard() {
  const admin = createAdminClient();
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startWeek = new Date(startToday);
  startWeek.setDate(startWeek.getDate() - 6);

  const [users, products, ordersMonth, weekOrders, pendingTransactions, lowStock, recentOrders] = await Promise.all([
    admin.from('user_profiles').select('*', { count: 'exact', head: true }),
    admin.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true),
    admin.from('orders').select('amount, created_at').eq('status', 'completed').gte('created_at', startMonth.toISOString()),
    admin.from('orders').select('amount, created_at').eq('status', 'completed').gte('created_at', startWeek.toISOString()),
    admin.from('transactions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('product_variants').select('id, name, sku, stock_quantity, product_id, products(title, slug)').eq('is_active', true).eq('inventory_policy', 'finite').lte('stock_quantity', 5).order('stock_quantity'),
    admin.from('orders').select('id, product_title, variant_name, quantity, amount, payment_method, status, created_at').order('created_at', { ascending: false }).limit(8),
  ]);

  const monthRevenue = (ordersMonth.data || []).reduce((sum, order) => sum + Number(order.amount || 0), 0);
  const todayRevenue = (ordersMonth.data || []).filter((order) => new Date(order.created_at) >= startToday).reduce((sum, order) => sum + Number(order.amount || 0), 0);
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startWeek);
    date.setDate(startWeek.getDate() + index);
    const key = date.toISOString().slice(0, 10);
    const value = (weekOrders.data || []).filter((order) => new Date(order.created_at).toISOString().slice(0, 10) === key).reduce((sum, order) => sum + Number(order.amount || 0), 0);
    return { key, label: date.toLocaleDateString('vi-VN', { weekday: 'short' }), value };
  });
  const maxDay = Math.max(...week.map((day) => day.value), 1);

  const stats = [
    { label: 'Doanh thu hôm nay', value: `${money(todayRevenue)}đ`, note: 'Đơn đã hoàn thành', icon: CircleDollarSign, tone: 'bg-emerald-50 text-emerald-600' },
    { label: 'Doanh thu tháng', value: `${money(monthRevenue)}đ`, note: `${ordersMonth.data?.length || 0} đơn thành công`, icon: TrendingUp, tone: 'bg-blue-50 text-blue-600' },
    { label: 'Sản phẩm đang bán', value: products.count || 0, note: `${lowStock.data?.length || 0} gói sắp hết`, icon: Boxes, tone: 'bg-red-50 text-[#ed4c50]' },
    { label: 'Khách hàng', value: users.count || 0, note: `${pendingTransactions.count || 0} giao dịch chờ`, icon: Users, tone: 'bg-violet-50 text-violet-600' },
  ];

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#ed4c50]">Live commerce overview</p><h2 className="mt-1 text-3xl font-black tracking-[-0.04em]">Nhịp vận hành hôm nay</h2><p className="mt-2 text-sm text-slate-500">Doanh thu, đơn và cảnh báo kho tại một nơi.</p></div>
        <Link href="/admin/products" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800">Quản lý kho <ArrowUpRight className="h-4 w-4" /></Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => { const Icon = stat.icon; return <div key={stat.label} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><span className={`grid h-11 w-11 place-items-center rounded-xl ${stat.tone}`}><Icon className="h-5 w-5" /></span><ArrowUpRight className="h-4 w-4 text-slate-300" /></div><p className="mt-5 text-2xl font-black tracking-tight">{stat.value}</p><p className="mt-1 text-xs font-bold text-slate-600">{stat.label}</p><p className="mt-1 text-[11px] text-slate-400">{stat.note}</p></div>; })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.55fr)]">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between"><div><p className="text-sm font-black">Doanh thu 7 ngày</p><p className="mt-1 text-xs text-slate-400">Chỉ tính đơn đã hoàn thành</p></div><span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500">Realtime</span></div>
          <div className="mt-8 grid h-52 grid-cols-7 items-end gap-2 sm:gap-4">
            {week.map((day) => <div key={day.key} className="flex h-full flex-col justify-end text-center"><p className="mb-2 hidden text-[10px] font-bold text-slate-400 sm:block">{day.value ? money(day.value) : '—'}</p><div className="group relative mx-auto w-full max-w-14 overflow-hidden rounded-t-xl bg-slate-100" style={{ height: `${Math.max(day.value ? (day.value / maxDay) * 100 : 5, 5)}%` }}><div className="absolute inset-0 bg-gradient-to-t from-[#ed4c50] to-[#ff7679] transition group-hover:brightness-110" /></div><p className="mt-2 text-[10px] font-bold uppercase text-slate-400">{day.label}</p></div>)}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-5"><div><p className="text-sm font-black">Cảnh báo kho</p><p className="mt-1 text-xs text-slate-400">Gói còn tối đa 5 sản phẩm</p></div><PackageX className="h-5 w-5 text-amber-500" /></div>
          <div className="divide-y divide-slate-100">
            {(lowStock.data || []).slice(0, 6).map((variant) => {
              const productRelation = Array.isArray(variant.products) ? variant.products[0] : variant.products;
              return <Link key={variant.id} href="/admin/products" className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-slate-50"><span className={`grid h-9 w-9 place-items-center rounded-xl text-xs font-black ${variant.stock_quantity === 0 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>{variant.stock_quantity}</span><span className="min-w-0 flex-1"><b className="block truncate text-xs">{productRelation?.title || 'Sản phẩm'}</b><span className="block truncate text-[10px] text-slate-400">{variant.name} · {variant.sku}</span></span><ArrowUpRight className="h-3.5 w-3.5 text-slate-300" /></Link>;
            })}
            {!lowStock.data?.length && <div className="p-10 text-center"><Boxes className="mx-auto h-7 w-7 text-emerald-400" /><p className="mt-2 text-xs font-bold text-slate-600">Kho đang ổn định</p></div>}
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 p-5"><div><p className="text-sm font-black">Đơn hàng mới nhất</p><p className="mt-1 text-xs text-slate-400">Dòng hoạt động gần đây của cửa hàng</p></div><Link href="/admin/orders" className="text-xs font-black text-[#ed4c50] hover:underline">Xem tất cả</Link></div>
        <div className="divide-y divide-slate-100">
          {(recentOrders.data || []).map((order) => <div key={order.id} className="grid gap-2 px-5 py-3.5 sm:grid-cols-[minmax(0,1fr)_130px_120px_100px] sm:items-center"><div className="min-w-0"><p className="truncate text-xs font-black">{order.product_title}</p><p className="mt-1 truncate text-[10px] text-slate-400">{order.variant_name || 'Gói tiêu chuẩn'} · SL {order.quantity}</p></div><p className="text-xs font-bold">{Number(order.amount).toLocaleString('vi-VN')}đ</p><p className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400"><Clock3 className="h-3 w-3" />{new Date(order.created_at).toLocaleString('vi-VN')}</p><span className={`w-fit rounded-full px-2 py-1 text-[9px] font-black uppercase ${order.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : order.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'}`}>{order.status === 'completed' ? 'Hoàn thành' : order.status === 'pending' ? 'Chờ xử lý' : 'Thất bại'}</span></div>)}
          {!recentOrders.data?.length && <div className="p-12 text-center text-sm text-slate-400"><ShoppingCart className="mx-auto mb-2 h-7 w-7" />Chưa có đơn hàng.</div>}
        </div>
      </section>
    </div>
  );
}

