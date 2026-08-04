'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  BookOpen,
  Boxes,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Code2,
  FolderKanban,
  Globe2,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Tags,
  Users,
  X,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { cn } from '@/utils/helpers';

const commerceLinks = [
  { href: '/admin', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Sản phẩm & kho', icon: Boxes },
  { href: '/admin/orders', label: 'Đơn hàng', icon: ShoppingCart },
  { href: '/admin/transactions', label: 'Đối soát nạp tiền', icon: CircleDollarSign },
  { href: '/admin/users', label: 'Khách hàng', icon: Users },
  { href: '/admin/categories', label: 'Danh mục', icon: Tags },
];

const contentLinks = [
  { href: '/admin/site-config', label: 'Cấu hình website', icon: Settings2 },
  { href: '/admin/about', label: 'Giới thiệu', icon: Globe2 },
  { href: '/admin/projects', label: 'Dự án', icon: FolderKanban },
  { href: '/admin/services', label: 'Dịch vụ', icon: BriefcaseBusiness },
  { href: '/admin/blogs', label: 'Bài viết', icon: BookOpen },
  { href: '/admin/communities', label: 'Cộng đồng', icon: Users },
  { href: '/admin/account', label: 'Bảo mật', icon: ShieldCheck },
];

type AdminShellProps = {
  children: React.ReactNode;
  user: { email: string; displayName: string; avatarUrl?: string | null };
};

export default function AdminShell({ children, user }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => href === '/admin' ? pathname === href : pathname.startsWith(href);
  const current = [...commerceLinks, ...contentLinks].find((link) => isActive(link.href)) || commerceLinks[0];

  const logout = async () => {
    await createClient().auth.signOut();
    router.replace('/login');
    router.refresh();
  };

  const navigation = (
    <>
      <div className="flex h-[72px] items-center justify-between border-b border-white/10 px-4">
        <Link href="/admin" className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ed4c50] shadow-lg shadow-red-950/30"><Code2 className="h-5 w-5" /></span>
          {!collapsed && <span className="min-w-0"><b className="block truncate text-sm">PhuongDev</b><span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">Market control</span></span>}
        </Link>
        <button type="button" onClick={() => setMobileOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg text-white/50 hover:bg-white/10 md:hidden"><X className="h-4 w-4" /></button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {[
          { label: 'Kinh doanh', links: commerceLinks },
          { label: 'Nội dung website', links: contentLinks },
        ].map((group) => (
          <div key={group.label} className="mb-6">
            {!collapsed && <p className="mb-2 px-3 text-[9px] font-black uppercase tracking-[0.2em] text-white/25">{group.label}</p>}
            <div className="space-y-1">
              {group.links.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.href);
                return (
                  <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} title={collapsed ? link.label : undefined} className={cn('group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition', active ? 'bg-white text-slate-950 shadow-md' : 'text-white/50 hover:bg-white/[0.06] hover:text-white', collapsed && 'justify-center px-0')}>
                    <Icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-[#ed4c50]' : 'text-white/35 group-hover:text-white/70')} />
                    {!collapsed && <span>{link.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <Link href="/store" target="_blank" className={cn('mb-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/45 transition hover:bg-white/[0.06] hover:text-white', collapsed && 'justify-center px-0')}>
          <ArrowUpRight className="h-[18px] w-[18px]" />{!collapsed && 'Mở cửa hàng'}
        </Link>
        <button type="button" onClick={logout} className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-300/70 transition hover:bg-red-400/10 hover:text-red-300', collapsed && 'justify-center px-0')}>
          <LogOut className="h-[18px] w-[18px]" />{!collapsed && 'Đăng xuất'}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#f3f5f7] text-slate-950">
      <aside className={cn('fixed inset-y-0 left-0 z-50 hidden flex-col bg-[#10141c] text-white transition-[width] duration-300 md:flex', collapsed ? 'w-20' : 'w-72')}>{navigation}</aside>
      {mobileOpen && <div className="fixed inset-0 z-50 md:hidden"><button type="button" aria-label="Đóng menu" className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} /><aside className="relative flex h-full w-72 flex-col bg-[#10141c] text-white shadow-2xl">{navigation}</aside></div>}

      <div className={cn('min-h-screen transition-[padding] duration-300', collapsed ? 'md:pl-20' : 'md:pl-72')}>
        <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl sm:px-6">
          <button type="button" onClick={() => setMobileOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 md:hidden"><Menu className="h-4 w-4" /></button>
          <button type="button" onClick={() => setCollapsed((value) => !value)} className="hidden h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 md:grid" aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}>{collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}</button>
          <div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Bảng điều khiển</p><h1 className="truncate text-sm font-black sm:text-base">{current.label}</h1></div>
          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-2 pr-3 sm:flex">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-xs font-black text-white">{user.displayName[0]?.toUpperCase()}</span>
            <span className="max-w-40"><b className="block truncate text-xs">{user.displayName}</b><span className="block truncate text-[10px] text-slate-400">{user.email}</span></span>
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-[1440px]">{children}</div></main>
      </div>
    </div>
  );
}
