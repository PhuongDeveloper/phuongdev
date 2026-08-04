import type { Metadata } from 'next';
import { AlertTriangle, CheckCircle2, CircleDollarSign, Clock3, Radio } from 'lucide-react';

import { createAdminClient } from '@/lib/supabase/admin';

// Admin data depends on the authenticated request and server-only credentials.
// Never execute these routes during static generation.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Đối soát thanh toán | Admin' };

export default async function TransactionsPage() {
  const admin = createAdminClient();
  const [{ data: transactions }, { data: events }] = await Promise.all([
    admin.from('transactions').select('id, user_id, amount, coin_amount, status, transaction_code, payment_method, purpose, bank_ref, created_at, completed_at').order('created_at', { ascending: false }).limit(150),
    admin.from('payment_events').select('*').order('created_at', { ascending: false }).limit(50),
  ]);
  const completed = (transactions || []).filter((item) => item.status === 'completed');
  const pending = (transactions || []).filter((item) => item.status === 'pending');
  const rejected = (events || []).filter((item) => item.status === 'rejected' || item.status === 'unmatched');
  const rechargeTotal = completed.filter((item) => item.purpose === 'recharge').reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div><p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#ed4c50]">Payment reconciliation</p><h2 className="mt-1 text-3xl font-black tracking-[-0.04em]">Nạp tiền & đối soát</h2><p className="mt-2 text-sm text-slate-500">Theo dõi giao dịch chờ, webhook đã khớp và các khoản cần kiểm tra.</p></div>
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: 'Đã hoàn tất', value: completed.length, icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-600' },
          { label: 'Đang chờ', value: pending.length, icon: Clock3, tone: 'bg-amber-50 text-amber-600' },
          { label: 'Cần kiểm tra', value: rejected.length, icon: AlertTriangle, tone: 'bg-red-50 text-red-600' },
          { label: 'Tổng nạp', value: `${rechargeTotal.toLocaleString('vi-VN')}đ`, icon: CircleDollarSign, tone: 'bg-blue-50 text-blue-600' },
        ].map((stat) => { const Icon = stat.icon; return <div key={stat.label} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"><span className={`grid h-10 w-10 place-items-center rounded-xl ${stat.tone}`}><Icon className="h-4 w-4" /></span><p className="mt-4 text-xl font-black tracking-tight">{stat.value}</p><p className="mt-1 text-xs text-slate-400">{stat.label}</p></div>; })}
      </div>

      {rejected.length > 0 && <section className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm"><div className="flex items-center gap-3 border-b border-red-100 bg-red-50 px-5 py-4"><AlertTriangle className="h-5 w-5 text-red-600" /><div><p className="text-sm font-black text-red-800">Webhook cần kiểm tra</p><p className="text-xs text-red-600/70">Sai số tiền, sai mã hoặc không tìm thấy giao dịch</p></div></div><div className="divide-y divide-slate-100">{rejected.slice(0, 8).map((event) => <div key={event.id} className="grid gap-2 px-5 py-3.5 text-xs sm:grid-cols-[140px_150px_120px_minmax(0,1fr)]"><code className="font-bold text-slate-700">{event.transaction_code || 'Không có mã'}</code><span className="font-black">{Number(event.transfer_amount).toLocaleString('vi-VN')}đ</span><span className="text-slate-400">SePay #{event.provider_transaction_id}</span><span className="text-red-600">{event.reason || 'Không thể đối soát'}</span></div>)}</div></section>}

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 p-5"><Radio className="h-5 w-5 text-emerald-500" /><div><p className="text-sm font-black">Luồng giao dịch</p><p className="text-xs text-slate-400">150 giao dịch gần nhất</p></div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-3">Mã</th><th className="px-4 py-3">Mục đích</th><th className="px-4 py-3">Số tiền</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Tham chiếu</th><th className="px-4 py-3">Thời gian</th></tr></thead><tbody className="divide-y divide-slate-100">{(transactions || []).map((item) => <tr key={item.id} className="hover:bg-slate-50"><td className="px-5 py-3.5 font-mono font-bold">{item.transaction_code}</td><td className="px-4 py-3.5 text-slate-600">{item.purpose === 'recharge' ? 'Nạp ví' : 'Mua hàng QR'}</td><td className="px-4 py-3.5 font-black">{Number(item.amount).toLocaleString('vi-VN')}đ</td><td className="px-4 py-3.5"><span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${item.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : item.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{item.status}</span></td><td className="px-4 py-3.5 font-mono text-[10px] text-slate-400">{item.bank_ref || '—'}</td><td className="px-4 py-3.5 text-[10px] text-slate-400">{new Date(item.created_at).toLocaleString('vi-VN')}</td></tr>)}</tbody></table></div>
      </section>
    </div>
  );
}
