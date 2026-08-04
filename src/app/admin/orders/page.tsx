import type { Metadata } from 'next';
import { CheckCircle2, Clock3, PackageCheck, ShoppingCart, XCircle } from 'lucide-react';

import { createAdminClient } from '@/lib/supabase/admin';

export const metadata: Metadata = { title: 'Đơn hàng | Admin' };

const paymentLabel: Record<string, string> = { coin: 'Ví', bank_qr: 'QR Bank', free_trial: 'Miễn phí' };

export default async function AdminOrdersPage() {
  const admin = createAdminClient();
  const { data: orders } = await admin.from('orders').select('*').order('created_at', { ascending: false }).limit(200);
  const userIds = Array.from(new Set((orders || []).map((order) => order.user_id).filter(Boolean)));
  const { data: profiles } = userIds.length
    ? await admin.from('user_profiles').select('id, email, display_name').in('id', userIds)
    : { data: [] };
  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));
  const completed = (orders || []).filter((order) => order.status === 'completed');
  const pending = (orders || []).filter((order) => order.status === 'pending');
  const revenue = completed.reduce((sum, order) => sum + Number(order.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div><p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#ed4c50]">Order desk</p><h2 className="mt-1 text-3xl font-black tracking-[-0.04em]">Đơn hàng</h2><p className="mt-2 text-sm text-slate-500">Theo dõi gói đã mua, số lượng, bàn giao và phương thức thanh toán.</p></div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Tổng đơn', value: orders?.length || 0, icon: ShoppingCart, tone: 'bg-blue-50 text-blue-600' },
          { label: 'Đang chờ', value: pending.length, icon: Clock3, tone: 'bg-amber-50 text-amber-600' },
          { label: 'Doanh thu', value: `${revenue.toLocaleString('vi-VN')}đ`, icon: PackageCheck, tone: 'bg-emerald-50 text-emerald-600' },
        ].map((stat) => { const Icon = stat.icon; return <div key={stat.label} className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"><span className={`grid h-11 w-11 place-items-center rounded-xl ${stat.tone}`}><Icon className="h-5 w-5" /></span><div><p className="text-xl font-black tracking-tight">{stat.value}</p><p className="text-xs text-slate-400">{stat.label}</p></div></div>; })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400"><tr><th className="px-5 py-3.5">Đơn hàng</th><th className="px-4 py-3.5">Khách hàng</th><th className="px-4 py-3.5">Gói / SKU</th><th className="px-4 py-3.5">SL</th><th className="px-4 py-3.5">Thanh toán</th><th className="px-4 py-3.5">Trạng thái</th><th className="px-4 py-3.5">Thời gian</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {(orders || []).map((order) => {
                const profile = profileMap.get(order.user_id);
                return <tr key={order.id} className="transition hover:bg-slate-50/70"><td className="px-5 py-4"><p className="font-mono text-[10px] font-bold text-slate-400">#{order.id.slice(-8).toUpperCase()}</p><p className="mt-1 max-w-56 truncate font-black text-slate-900">{order.product_title}</p></td><td className="px-4 py-4"><p className="max-w-48 truncate font-bold text-slate-700">{profile?.display_name || 'Khách hàng'}</p><p className="mt-1 max-w-48 truncate text-[10px] text-slate-400">{profile?.email || order.user_id}</p></td><td className="px-4 py-4"><p className="font-bold text-slate-700">{order.variant_name || 'Gói tiêu chuẩn'}</p><p className="mt-1 font-mono text-[10px] text-slate-400">{order.sku || '—'}</p></td><td className="px-4 py-4 font-black">{order.quantity || 1}</td><td className="px-4 py-4"><p className="font-black">{Number(order.amount).toLocaleString('vi-VN')}đ</p><p className="mt-1 text-[10px] text-slate-400">{paymentLabel[order.payment_method] || order.payment_method}</p></td><td className="px-4 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${order.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : order.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'}`}>{order.status === 'completed' ? <CheckCircle2 className="h-3 w-3" /> : order.status === 'pending' ? <Clock3 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}{order.status === 'completed' ? 'Hoàn thành' : order.status === 'pending' ? 'Chờ xử lý' : 'Thất bại'}</span></td><td className="px-4 py-4 text-[10px] text-slate-400">{new Date(order.created_at).toLocaleString('vi-VN')}</td></tr>;
              })}
              {!orders?.length && <tr><td colSpan={7} className="px-5 py-16 text-center text-sm text-slate-400">Chưa có đơn hàng.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

