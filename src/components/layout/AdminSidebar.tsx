/* ==========================================================================
   Component AdminSidebar - Thanh điều hướng bên trái cho Admin Dashboard
   Bao gồm các mục quản trị, thông tin user và nút đăng xuất
   ========================================================================== */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Settings,
  FolderKanban,
  Briefcase,
  ShoppingBag,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Code2,
  ExternalLink,
  Users,
  Shield,
  User,
  FileText,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/utils/helpers';

/** Các mục menu của Admin */
const adminLinks = [
  { href: '/admin', label: 'Tổng Quan', icon: LayoutDashboard },
  { href: '/admin/site-config', label: 'Cấu Hình Web', icon: Settings },
  { href: '/admin/about', label: 'Trang Giới Thiệu', icon: User },
  { href: '/admin/projects', label: 'Dự Án', icon: FolderKanban },
  { href: '/admin/services', label: 'Dịch Vụ', icon: Briefcase },
  { href: '/admin/products', label: 'Sản Phẩm', icon: ShoppingBag },
  { href: '/admin/blogs', label: 'Bài Viết (Blog)', icon: FileText },
  { href: '/admin/communities', label: 'Cộng Đồng', icon: Users },
  { href: '/admin/account', label: 'Đổi Mật Khẩu', icon: Shield },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);

  /** Xử lý đăng xuất */
  const handleLogout = async () => {
    // Xoá cookie admin_auth
    document.cookie = "admin_auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push('/login');
    router.refresh();
  };

  return (
    <aside
      className={cn(
        'h-screen sticky top-0 flex flex-col bg-slate-900 text-white transition-all duration-300',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Phần đầu sidebar */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
        <Link
          href="/admin"
          className={cn(
            'flex items-center gap-2 overflow-hidden',
            isCollapsed && 'justify-center'
          )}
        >
          <div className="p-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 flex-shrink-0">
            <Code2 className="w-4 h-4 text-white" />
          </div>
          {!isCollapsed && (
            <span className="text-sm font-bold whitespace-nowrap">
              PhuongDev CMS
            </span>
          )}
        </Link>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
          aria-label={isCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Menu điều hướng */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {adminLinks.map((link) => {
          const isActive =
            link.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(link.href);
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800',
                isCollapsed && 'justify-center px-2'
              )}
              title={isCollapsed ? link.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span>{link.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Phần cuối sidebar */}
      <div className="p-3 border-t border-slate-700/50 space-y-1">
        {/* Liên kết về trang public */}
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-all',
            isCollapsed && 'justify-center px-2'
          )}
          title={isCollapsed ? 'Xem trang web' : undefined}
        >
          <ExternalLink className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span>Xem Trang Web</span>}
        </a>

        {/* Nút đăng xuất */}
        <button
          onClick={handleLogout}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-all cursor-pointer',
            isCollapsed && 'justify-center px-2'
          )}
          title={isCollapsed ? 'Đăng xuất' : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span>Đăng Xuất</span>}
        </button>
      </div>
    </aside>
  );
}
