/* ==========================================================================
   Home Services - Hiển thị Dịch vụ nổi bật trên Trang chủ
   ========================================================================== */

'use client';

import { motion, type Variants } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import { type Service } from '@/lib/types/database';

interface HomeServicesProps {
  services: Service[];
}

/** Lấy icon Lucide theo tên (dynamic) */
function getIconByName(name: string): React.ElementType {
  const icons = LucideIcons as unknown as Record<string, React.ElementType>;
  return icons[name] || LucideIcons.Code2;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export default function HomeServices({ services }: HomeServicesProps) {
  if (!services || services.length === 0) return null;

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Dịch Vụ Cung Cấp
            </h2>
            <p className="text-lg text-slate-600">
              Các giải pháp phần mềm chuyên nghiệp giúp bạn tối ưu chi phí và tăng tốc độ phát triển dự án.
            </p>
          </div>
          <Link
            href="/services"
            className="hidden md:inline-flex items-center text-rose-600 font-medium hover:text-rose-700 transition-colors group"
          >
            Xem tất cả dịch vụ
            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {services.map((service) => {
            const Icon = getIconByName(service.icon_name);

            return (
              <motion.div key={service.id} variants={itemVariants}>
                <Link href={`/services/${service.slug}`} className="block h-full">
                  <Card variant="glass" hoverable padding="none" className="h-full w-full flex flex-col relative overflow-hidden group border-slate-100 hover:border-rose-100 cursor-pointer transition-all">
                    
                    {/* Ảnh Banner */}
                    <div className="relative h-48 bg-slate-100 overflow-hidden shrink-0">
                      {service.image_url ? (
                        <img
                          src={service.image_url}
                          alt={service.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-rose-500 via-rose-600 to-orange-500 flex items-center justify-center transition-transform duration-700 group-hover:scale-105">
                          <Icon className="w-20 h-20 text-white/20" />
                          <Icon className="w-12 h-12 text-white absolute" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
                      <div className="absolute bottom-4 left-5 right-5">
                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/20 backdrop-blur-md border border-white/30 text-white mb-2">
                          <Icon className="w-4 h-4" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-1 line-clamp-1">
                          {service.title}
                        </h3>
                      </div>
                    </div>
                    
                    <div className="p-6 pt-5 flex-1 flex flex-col relative z-10">
                      <p className="text-slate-600 mb-6 line-clamp-3 leading-relaxed">
                        {service.description}
                      </p>
                      
                      <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 text-sm font-medium text-slate-500 mb-1">
                            <LucideIcons.Eye className="w-4 h-4" />
                            <span>{service.views?.toLocaleString() || 0}</span>
                          </div>
                          <div className="text-lg font-bold text-rose-600">
                            {service.price_range || 'Liên hệ'}
                          </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                          <ArrowRight className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

        <div className="mt-8 text-center md:hidden">
          <Link
            href="/services"
            className="inline-flex items-center text-rose-600 font-medium hover:text-rose-700 transition-colors group"
          >
            Xem tất cả dịch vụ
            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}
