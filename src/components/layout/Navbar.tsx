/* ==========================================================================
   Component Navbar - Thanh điều hướng chính của trang public
   Hiệu ứng glass khi cuộn trang, responsive với menu mobile
   ========================================================================== */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  Code2,
  Home,
  Briefcase,
  ShoppingBag,
  User,
  Users,
} from 'lucide-react';
import { cn } from '@/utils/helpers';

/** Các mục menu điều hướng */
const navLinks = [
  { href: '/', label: 'Trang Chủ', icon: Home },
  { href: '/services', label: 'Dịch Vụ', icon: Briefcase },
  { href: '/store', label: 'Cửa Hàng', icon: ShoppingBag },
  { href: '/blog', label: 'Blog', icon: Code2 },
  { href: '/about', label: 'Giới Thiệu', icon: User },
  { href: '/community', label: 'Cộng Đồng', icon: Users },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Theo dõi sự kiện cuộn trang để thay đổi giao diện navbar
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Đóng menu mobile khi chuyển trang
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={cn(
        'fixed top-0 left-0 right-0 z-40 transition-colors duration-300',
        isScrolled
          ? 'bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm'
          : 'bg-transparent'
      )}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <motion.div 
              whileHover={{ rotate: 10, scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-500 shadow-lg shadow-rose-500/30"
            >
              <Code2 className="w-5 h-5 text-white" />
            </motion.div>
            <span className="text-lg font-bold text-slate-900 group-hover:text-rose-600 transition-colors">
              Phuong<span className="gradient-text">Dev</span>
            </span>
          </Link>

          {/* Menu desktop */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link, index) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.1 }}
                >
                  <Link
                    href={link.href}
                    className={cn(
                      'relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 group overflow-hidden',
                      isActive
                        ? 'text-rose-600'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="navbar-active-bg"
                        className="absolute inset-0 bg-rose-50 rounded-xl -z-10"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <Icon className={cn("w-4 h-4 transition-transform group-hover:scale-110", isActive && "scale-110")} />
                    <span className="relative z-10">{link.label}</span>
                    
                    {!isActive && (
                      <div className="absolute inset-0 bg-slate-50 opacity-0 group-hover:opacity-100 rounded-xl -z-10 transition-opacity" />
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* Nút menu mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Mở menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Menu mobile */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden overflow-hidden"
            >
              <div className="pb-4 border-t border-slate-100 mt-2 pt-4 flex flex-col gap-1">
                {navLinks.map((link, index) => {
                  const isActive = pathname === link.href;
                  const Icon = link.icon;
                  return (
                    <motion.div
                      key={link.href}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        href={link.href}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                          isActive
                            ? 'bg-rose-50 text-rose-600'
                            : 'text-slate-600 hover:bg-slate-50'
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        {link.label}
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </motion.header>
  );
}
