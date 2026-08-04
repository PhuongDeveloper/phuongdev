/* ==========================================================================
   NavbarClient - Thêm Auth + User Dropdown
   Nhất quán design system: slate + rose, glass effect, Lucide icons
   ========================================================================== */

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  Menu, X, Code2, Home, Briefcase, ShoppingBag, User,
  Users, LogIn, LogOut, Wallet, History, ChevronDown, Coins,
} from 'lucide-react';
import { cn } from '@/utils/helpers';
import { createClient } from '@/lib/supabase/client';
import AuthModal from '@/components/ui/AuthModal';
import type { UserProfile } from '@/lib/types/database';

const navLinks = [
  { href: '/', label: 'Trang Chủ', icon: Home },
  { href: '/services', label: 'Dịch Vụ', icon: Briefcase },
  { href: '/store', label: 'Cửa Hàng', icon: ShoppingBag },
  { href: '/about', label: 'Giới Thiệu', icon: User },
  { href: '/community', label: 'Cộng Đồng', icon: Users },
];

interface NavbarClientProps {
  siteConfig: Record<string, string>;
}

export default function NavbarClient({ siteConfig }: NavbarClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [authModal, setAuthModal] = useState<{ open: boolean; tab: 'login' | 'register' }>({ open: false, tab: 'login' });
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).single();
        setProfile(data);
      } else {
        setProfile(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setDropdownOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setDropdownOpen(false);
    router.push('/');
    router.refresh();
  };

  const logoUrl = siteConfig['logo_url'];

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={cn(
          'fixed top-0 left-0 right-0 z-40 transition-colors duration-300',
          isScrolled ? 'bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm' : 'bg-transparent'
        )}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              {logoUrl ? (
                <div className="relative h-14 w-[200px] flex items-center">
                  <Image src={logoUrl} alt="PhuongDev Logo" fill className="object-contain object-left" />
                </div>
              ) : (
                <>
                  <motion.div whileHover={{ rotate: 10, scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    className="p-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-500 shadow-lg shadow-rose-500/30">
                    <Code2 className="w-5 h-5 text-white" />
                  </motion.div>
                  <span className="text-lg font-bold text-slate-900 group-hover:text-rose-600 transition-colors">
                    Phuong<span className="gradient-text">Dev</span>
                  </span>
                </>
              )}
            </Link>

            {/* Nav links desktop */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link, index) => {
                const isActive = pathname === link.href;
                const Icon = link.icon;
                return (
                  <motion.div key={link.href} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + index * 0.1 }}>
                    <Link href={link.href} className={cn('relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 group overflow-hidden', isActive ? 'text-rose-600' : 'text-slate-600 hover:text-slate-900')}>
                      {isActive && <motion.div layoutId="navbar-active-bg" className="absolute inset-0 bg-rose-50 rounded-xl -z-10" transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }} />}
                      <Icon className={cn('w-4 h-4 transition-transform group-hover:scale-110', isActive && 'scale-110')} />
                      <span className="relative z-10">{link.label}</span>
                      {!isActive && <div className="absolute inset-0 bg-slate-50 opacity-0 group-hover:opacity-100 rounded-xl -z-10 transition-opacity" />}
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            {/* Auth Section desktop */}
            <div className="hidden md:flex items-center gap-2">
              {user ? (
                <div ref={dropdownRef} className="relative">
                  <button onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer">
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500 to-red-400 flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0">
                      {profile?.avatar_url
                        ? <Image src={profile.avatar_url} alt="avatar" width={32} height={32} className="object-cover w-full h-full" />
                        : (profile?.display_name || user.email || 'U')[0].toUpperCase()
                      }
                    </div>
                    <div className="hidden lg:block text-left">
                      <div className="text-xs font-semibold text-slate-800 max-w-[100px] truncate">
                        {profile?.display_name || user.email?.split('@')[0]}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-rose-600 font-medium">
                        <Coins className="w-3 h-3" />
                        {(profile?.coin_balance ?? 0).toLocaleString('vi-VN')}
                      </div>
                    </div>
                    <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform flex-shrink-0', dropdownOpen && 'rotate-180')} />
                  </button>

                  <AnimatePresence>
                    {dropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden"
                      >
                        {/* Coin balance */}
                        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                          <p className="text-xs text-slate-500 mb-1">Số dư ví</p>
                          <div className="flex items-center gap-1.5">
                            <Coins className="w-4 h-4 text-rose-500" />
                            <span className="text-base font-bold text-slate-900">
                              {(profile?.coin_balance ?? 0).toLocaleString('vi-VN')}
                            </span>
                            <span className="text-xs text-slate-400">VND</span>
                          </div>
                        </div>
                        <div className="p-2 space-y-0.5">
                          <Link href="/profile" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                            <User className="w-4 h-4 text-slate-400" /> Hồ Sơ Cá Nhân
                          </Link>
                          <Link href="/profile?tab=wallet" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                            <Wallet className="w-4 h-4 text-slate-400" /> Nạp Tiền
                          </Link>
                          <Link href="/profile?tab=orders" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                            <History className="w-4 h-4 text-slate-400" /> Lịch Sử Mua Hàng
                          </Link>
                          <div className="h-px bg-slate-100 mx-3 my-1" />
                          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer">
                            <LogOut className="w-4 h-4" /> Đăng Xuất
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAuthModal({ open: true, tab: 'login' })}
                    id="navbar-login-btn"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" /> Đăng Nhập
                  </button>
                  <button
                    onClick={() => setAuthModal({ open: true, tab: 'register' })}
                    id="navbar-register-btn"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-rose-600 to-red-500 text-white shadow-md shadow-rose-500/20 hover:shadow-rose-500/40 hover:scale-105 transition-all cursor-pointer"
                  >
                    Đăng Ký
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Mở menu">
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile menu */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="md:hidden overflow-hidden">
                <div className="pb-4 border-t border-slate-100 mt-2 pt-4 flex flex-col gap-1">
                  {navLinks.map((link, index) => {
                    const isActive = pathname === link.href;
                    const Icon = link.icon;
                    return (
                      <motion.div key={link.href} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: index * 0.05 }}>
                        <Link href={link.href} className={cn('flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all', isActive ? 'bg-rose-50 text-rose-600' : 'text-slate-600 hover:bg-slate-50')}>
                          <Icon className="w-4 h-4" />{link.label}
                        </Link>
                      </motion.div>
                    );
                  })}
                  <div className="h-px bg-slate-100 mx-4 my-2" />
                  {user ? (
                    <>
                      <div className="flex items-center gap-2 px-4 py-2">
                        <Coins className="w-4 h-4 text-rose-500" />
                        <span className="text-sm font-semibold text-slate-700">{(profile?.coin_balance ?? 0).toLocaleString('vi-VN')} VND</span>
                      </div>
                      <Link href="/profile" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">
                        <User className="w-4 h-4" /> {profile?.display_name || user.email?.split('@')[0]}
                      </Link>
                      <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 cursor-pointer">
                        <LogOut className="w-4 h-4" /> Đăng Xuất
                      </button>
                    </>
                  ) : (
                    <div className="flex gap-2 px-4">
                      <button onClick={() => setAuthModal({ open: true, tab: 'login' })} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors">
                        Đăng Nhập
                      </button>
                      <button onClick={() => setAuthModal({ open: true, tab: 'register' })} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-500 text-white text-sm font-semibold cursor-pointer">
                        Đăng Ký
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>
      </motion.header>

      <AuthModal isOpen={authModal.open} onClose={() => setAuthModal({ open: false, tab: 'login' })} defaultTab={authModal.tab} />
    </>
  );
}
