/* ==========================================================================
   Hero Section - Banner trang chủ phong cách Đỏ/Trắng, Agency/Store
   ========================================================================== */

'use client';

import { motion } from 'framer-motion';
import { ArrowRight, ShoppingBag, Code2 } from 'lucide-react';
import Link from 'next/link';
import Button from '@/components/ui/Button';

interface HeroSectionProps {
  siteConfig?: Record<string, string>;
}

export default function HeroSection({ siteConfig }: HeroSectionProps) {
  const title = siteConfig?.['site_title'] || 'Cửa Hàng Mã Nguồn & Dịch Vụ Công Nghệ';
  const description = siteConfig?.['site_description'] || 'Cung cấp các giải pháp phần mềm, mã nguồn mở, và dịch vụ thiết kế website chuyên nghiệp, tối ưu chi phí cho cá nhân và doanh nghiệp.';

  return (
    <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden bg-white">
      {/* Background Patterns */}
      <div className="absolute inset-0 z-0 overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-rose-50 via-white to-white z-0" />
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 z-10">
          <div className="w-[600px] h-[600px] rounded-full bg-rose-100/50 blur-3xl opacity-50" />
        </div>
        
        {/* Hiệu ứng Trống Đồng quay tròn */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 120, ease: 'linear' }}
          className="absolute z-0 opacity-10 pointer-events-none"
        >
          <img 
            src="/trongdong.svg" 
            alt="Trống Đồng Background" 
            className="w-[800px] h-[800px] md:w-[1200px] md:h-[1200px] max-w-none" 
          />
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-100 text-rose-600 text-sm font-medium mb-6"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            Giải pháp công nghệ toàn diện
          </motion.div>

          {/* Tiêu đề chính */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 mb-8"
          >
            {title.split(' ').map((word, idx) => (
              <span key={idx} className={idx % 3 === 0 ? 'text-rose-600' : ''}>
                {word}{' '}
              </span>
            ))}
          </motion.h1>

          {/* Mô tả */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-slate-600 mb-10 leading-relaxed max-w-3xl mx-auto"
          >
            {description}
          </motion.p>

          {/* Các nút Call-to-action */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/store" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto group bg-rose-600 hover:bg-rose-700 text-white">
                <ShoppingBag className="w-5 h-5 mr-2" />
                Khám Phá Cửa Hàng
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            
            <Link href="/services" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-rose-200 text-rose-700 hover:bg-rose-50">
                <Code2 className="w-5 h-5 mr-2" />
                Dịch Vụ & Bảng Giá
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
