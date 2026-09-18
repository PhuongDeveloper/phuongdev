/* ==========================================================================
   Hero Section - Banner trang chủ phong cách Đỏ/Trắng, Agency/Store
   ========================================================================== */

import { ArrowRight, ShoppingBag, Code2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
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
        
        {/* Trống Đồng gốc đã được raster hóa để giữ nguyên chi tiết mà không bắt trình duyệt vẽ lại SVG nặng mỗi khung hình. */}
        <div
          className="hero-drum absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 opacity-[0.13] sm:opacity-10 pointer-events-none"
          aria-hidden="true"
        >
          <div className="animate-spin-slow">
            <Image
              src="/trongdong.webp"
              alt=""
              width={900}
              height={900}
              sizes="(max-width: 639px) 560px, (max-width: 1023px) 760px, 900px"
              quality={75}
              decoding="async"
              priority
              className="h-[560px] w-[560px] max-w-none sm:h-[760px] sm:w-[760px] md:h-[1200px] md:w-[1200px]"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          {/* Tiêu đề chính */}
          <h1
            className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 mb-8 animate-fade-in-up"
            style={{ animationDelay: '0ms' }}
          >
            {title.split(' ').map((word, idx) => (
              <span key={idx} className={idx % 3 === 0 ? 'text-rose-600' : ''}>
                {word}{' '}
              </span>
            ))}
          </h1>

          {/* Mô tả */}
          <p
            className="text-xl text-slate-600 mb-10 leading-relaxed max-w-3xl mx-auto animate-fade-in-up"
            style={{ animationDelay: '100ms' }}
          >
            {description}
          </p>

          {/* Các nút Call-to-action */}
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up"
            style={{ animationDelay: '200ms' }}
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
          </div>
        </div>
      </div>
    </section>
  );
}
