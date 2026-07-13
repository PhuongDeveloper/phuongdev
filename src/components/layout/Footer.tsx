/* ==========================================================================
   Component Footer - Chân trang của website public
   Hiển thị thông tin liên kết và bản quyền
   ========================================================================== */

import Link from 'next/link';
import { Code2, MessageCircle, Mail, Heart, ArrowRight } from 'lucide-react';
import { FaFacebook as Facebook, FaTelegram as Telegram } from 'react-icons/fa';

import Image from 'next/image';

interface FooterProps {
  siteConfig?: Record<string, string>;
}

const ZaloIcon = ({ className }: { className?: string }) => (
  <span className={`font-bold text-xs flex items-center justify-center ${className || ''}`}>
    Zalo
  </span>
);

export default function Footer({ siteConfig = {} }: FooterProps) {
  const currentYear = new Date().getFullYear();

  /** Các liên kết nhanh */
  const quickLinks = [
    { href: '/', label: 'Trang Chủ' },
    { href: '/services', label: 'Dịch Vụ' },
    { href: '/store', label: 'Cửa Hàng' },
    { href: '/about', label: 'Giới Thiệu' },
    { href: '/community', label: 'Cộng Đồng' },
  ];

  /** Các liên kết mạng xã hội */
  const socialLinks = [
    { href: siteConfig['zalo_url'] || '#', icon: ZaloIcon, label: 'Zalo' },
    { href: siteConfig['facebook_url'] || '#', icon: Facebook, label: 'Facebook' },
    { href: siteConfig['telegram_url'] || '#', icon: Telegram, label: 'Telegram' },
  ];

  const logoUrl = siteConfig['logo_url'];

  return (
    <footer className="border-t border-slate-200 bg-white/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Cột 1: Thông tin thương hiệu */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              {logoUrl ? (
                <div className="relative h-14 w-[200px] flex items-center">
                  <Image
                    src={logoUrl}
                    alt="PhuongDev Logo"
                    fill
                    className="object-contain object-left"
                  />
                </div>
              ) : (
                <>
                  <div className="p-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-500">
                    <Code2 className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-lg font-bold text-slate-900">
                    Phuong<span className="gradient-text">Dev</span>
                  </span>
                </>
              )}
            </Link>
            <p className="text-sm text-slate-500 max-w-xs">
              {siteConfig['site_description'] ||
                'Nơi chia sẻ dự án, dịch vụ và công cụ lập trình chuyên nghiệp.'}
            </p>
            {siteConfig['email'] && (
              <a
                href={`mailto:${siteConfig['email']}`}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors"
              >
                <Mail className="w-4 h-4" />
                {siteConfig['email']}
              </a>
            )}
          </div>

          {/* Cột 2: Liên kết nhanh */}
          <div className="space-y-4">
            <h3 className="text-slate-900 font-bold mb-4">Liên Kết Nhanh</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/services" className="text-slate-600 hover:text-rose-600 transition-colors inline-flex items-center gap-2 group">
                  <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-rose-500 transition-colors" />
                  Dịch Vụ Phần Mềm
                </Link>
              </li>
              <li>
                <Link href="/store" className="text-slate-600 hover:text-rose-600 transition-colors inline-flex items-center gap-2 group">
                  <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-rose-500 transition-colors" />
                  Cửa Hàng Code
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-slate-600 hover:text-rose-600 transition-colors inline-flex items-center gap-2 group">
                  <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-rose-500 transition-colors" />
                  Blog Công Nghệ
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-slate-600 hover:text-rose-600 transition-colors inline-flex items-center gap-2 group">
                  <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-rose-500 transition-colors" />
                  Về PhuongDev
                </Link>
              </li>
              <li>
                <Link href="/community" className="text-slate-600 hover:text-rose-600 transition-colors inline-flex items-center gap-2 group">
                  <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-rose-500 transition-colors" />
                  Cộng Đồng
                </Link>
              </li>
            </ul>
          </div>

          {/* Cột 3: Mạng xã hội */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-4">
              Kết Nối
            </h3>
            <div className="flex gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-all"
                    aria-label={social.label}
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* Đường phân cách và bản quyền */}
        <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400">
            {currentYear} PhuongDev. Tất cả quyền được bảo lưu.
          </p>
          <p className="text-xs text-slate-400 flex items-center gap-1">
            Xây dựng với <Heart className="w-3 h-3 text-red-400" /> bởi PhuongDev
          </p>
        </div>
      </div>
    </footer>
  );
}
