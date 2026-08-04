/* ==========================================================================
   Admin Orders - Quản lý đơn hàng
   ========================================================================== */

import { createClient as supabaseAdminCreate } from '@supabase/supabase-js';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Quản Lý Đơn Hàng | Admin' };

function getAdminClient() {
  return supabaseAdminCreate(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const paymentLabel: Record<string, string> = {
  coin: 'Thanh toán ví',
  bank_qr: 'Chuyển khoản QR',
  free_trial: 'Miễn phí',
};

export default async function AdminOrdersPage() {
  const admin = getAdminClient();
  const { data: orders } = await admin
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Quản Lý Đơn Hàng</h2>
        <p className="text-slate-500 mt-1">Danh sách toàn bộ đơn hàng trong hệ thống.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Mã ĐH', 'Sản Phẩm', 'User ID', 'Giá', 'Hình thức', 'Trạng thái', 'Thời gian'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(orders || []).map((order) => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">#{order.id.slice(-8).toUpperCase()}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-900">{order.product_title}</span>
                    {order.key_value && (
                      <div className="text-xs text-slate-400 mt-0.5 font-mono">{order.key_value}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{order.user_id?.slice(-8)}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {order.amount > 0 ? `${order.amount.toLocaleString('vi-VN')}` : 'Miễn phí'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{paymentLabel[order.payment_method] || order.payment_method}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      order.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                      order.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                      'bg-red-50 text-red-700'
                    }`}>
                      {order.status === 'completed' ? 'Hoàn thành' : order.status === 'pending' ? 'Đang xử lý' : 'Thất bại'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{new Date(order.created_at).toLocaleString('vi-VN')}</td>
                </tr>
              ))}
              {!orders?.length && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">Chưa có đơn hàng nào.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
