/* ==========================================================================
   Admin Layout - Bố cục dành riêng cho phân hệ quản trị
   ========================================================================== */

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import AdminSidebar from '@/components/layout/AdminSidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Kiểm tra xác thực qua cookie tự định nghĩa
  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.get('admin_auth')?.value === 'phuongdev';

  if (!isAuthenticated) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Nội dung chính */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header trên cùng của admin */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 sticky top-0 z-10">
          <h1 className="text-lg font-semibold text-slate-800">
            Khu Vực Quản Trị
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">
              Xin chào, <span className="font-medium text-slate-900">phuongdev</span>
            </span>
          </div>
        </header>

        {/* Nội dung trang */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
