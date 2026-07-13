/* ==========================================================================
   ServicesList - Client Component hiển thị dịch vụ với Framer Motion
   ========================================================================== */

'use client';

import { motion, type Variants } from 'framer-motion';
import { CheckCircle2, ArrowRight, PhoneCall } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import { type Service } from '@/lib/types/database';

interface ServicesListProps {
  services: Service[];
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

/** Lấy icon Lucide theo tên (dynamic) */
function getIconByName(name: string): React.ElementType {
  const icons = LucideIcons as unknown as Record<string, React.ElementType>;
  return icons[name] || LucideIcons.Code2;
}

export default function ServicesList({ services }: ServicesListProps) {
  if (!services || services.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Chưa có dịch vụ nào được thêm.</p>
      </div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 gap-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {services.map((service) => {
        const Icon = getIconByName(service.icon_name);

        return (
          <motion.div key={service.id} variants={itemVariants} className="flex h-full">
            <Card variant="glass" hoverable padding="none" className="w-full flex flex-col relative overflow-hidden group">
              {/* Ảnh Banner */}
              <div className="relative h-56 bg-slate-100 overflow-hidden shrink-0">
                {service.image_url ? (
                  <img
                    src={service.image_url}
                    alt={service.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-rose-500 via-rose-600 to-orange-500 flex items-center justify-center transition-transform duration-700 group-hover:scale-105">
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
                <div className="absolute bottom-4 left-6 right-6">
                  <h3 className="text-2xl font-bold text-white mb-1 line-clamp-1">
                    {service.title}
                  </h3>
                </div>
              </div>
              
              <div className="p-6 pt-5 flex-1 flex flex-col relative z-10">
                <div className="flex-1 mb-4">
                  {service.price_range && (
                    <span className="inline-block px-3 py-1 bg-rose-50 border border-rose-100 text-sm font-semibold text-rose-700 rounded-full mb-4">
                      {service.price_range}
                    </span>
                  )}
                  {/* Mô tả */}
                  <p className="text-base text-slate-600 leading-relaxed">
                    {service.description}
                  </p>
                </div>

              {/* Danh sách tính năng */}
              {service.features && service.features.length > 0 && (
                <ul className="space-y-3 mb-8 relative z-10 flex-1">
                  {service.features.map((feature, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 text-sm font-medium text-slate-700"
                    >
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Nút bấm điều hướng */}
              <div className="flex flex-col sm:flex-row gap-3 mt-auto relative z-10 pt-6 border-t border-slate-100/60">
                <Link href={`/services/${service.slug}`} className="flex-1">
                  <Button variant="outline" className="w-full justify-center">
                    Xem Chi Tiết
                  </Button>
                </Link>
                {service.redirect_url ? (
                  <Link href={service.redirect_url} target="_blank" className="flex-1">
                    <Button variant="primary" className="w-full justify-center group-hover:shadow-rose-500/25">
                      Liên Hệ Ngay <PhoneCall className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                ) : (
                  <Link href="/contact" className="flex-1">
                    <Button variant="primary" className="w-full justify-center group-hover:shadow-rose-500/25">
                      Liên Hệ Ngay <PhoneCall className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                )}
              </div>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
