/* ==========================================================================
   Admin Users - Quản lý người dùng
   ========================================================================== */

import { createClient as supabaseAdminCreate } from '@supabase/supabase-js';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Quản Lý Người Dùng | Admin' };

function getAdminClient() {
  return supabaseAdminCreate(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export default async function AdminUsersPage() {
  const admin = getAdminClient();
  const { data: users } = await admin
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Quản Lý Người Dùng</h2>
        <p className="text-slate-500 mt-1">{users?.length || 0} tài khoản đã đăng ký.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Người dùng', 'Email', 'Số dư (VND)', 'Tổng nạp', 'Tổng chi', 'Ngày tham gia'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(users || []).map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500 to-red-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {(user.display_name || user.email || '?')[0].toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-900">{user.display_name || '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{user.email}</td>
                  <td className="px-4 py-3 font-bold text-rose-600">{(user.coin_balance || 0).toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3 text-emerald-600 font-medium">{(user.total_recharged || 0).toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3 text-slate-500">{(user.total_spent || 0).toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{new Date(user.created_at).toLocaleDateString('vi-VN')}</td>
                </tr>
              ))}
              {!users?.length && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">Chưa có người dùng nào.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
