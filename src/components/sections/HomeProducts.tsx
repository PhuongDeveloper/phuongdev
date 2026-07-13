/* ==========================================================================
   Home Products - Hiển thị Sản phẩm cửa hàng nổi bật trên Trang chủ
   ========================================================================== */

'use client';

import { motion, type Variants } from 'framer-motion';
import { ArrowRight, ShoppingCart, Download, Eye } from 'lucide-react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { type Product } from '@/lib/types/database';
import { formatCurrency } from '@/utils/helpers';

interface HomeProductsProps {
  products: Product[];
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

export default function HomeProducts({ products }: HomeProductsProps) {
  if (!products || products.length === 0) return null;

  return (
    <section className="py-20 bg-slate-50 border-y border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Cửa Hàng Mã Nguồn
            </h2>
            <p className="text-lg text-slate-600">
              Source code, template UI và các script chất lượng cao.
            </p>
          </div>
          <Link
            href="/store"
            className="hidden md:inline-flex items-center text-rose-600 font-medium hover:text-rose-700 transition-colors group"
          >
            Vào cửa hàng
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
          {products.map((product) => (
            <motion.div key={product.id} variants={itemVariants}>
              <Card variant="glass" hoverable padding="none" className="h-full flex flex-col overflow-hidden border-slate-200">
                {/* Ảnh Banner sản phẩm */}
                <div className="relative aspect-video w-full bg-slate-100 overflow-hidden shrink-0 group">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 flex items-center justify-center transition-transform duration-700 group-hover:scale-105">
                      <ShoppingCart className="w-16 h-16 text-white/20" />
                      <ShoppingCart className="w-8 h-8 text-white absolute" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Badge Miễn phí / Giá */}
                  <div className="absolute top-4 right-4 px-3 py-1 bg-white/95 backdrop-blur-md rounded-full text-sm font-bold text-slate-900 shadow-sm z-10">
                    {product.price > 0 ? formatCurrency(product.price) : <span className="text-green-600">Miễn phí</span>}
                  </div>
                </div>

                <div className="p-6 flex flex-col flex-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-rose-600 mb-2">
                    {product.category}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-3 line-clamp-1">
                    {product.title}
                  </h3>
                  <p className="text-slate-600 text-sm mb-4 line-clamp-2 flex-1">
                    {product.description}
                  </p>
                  
                  <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium mb-4">
                    <Eye className="w-4 h-4" />
                    <span>{product.views?.toLocaleString() || 0}</span>
                  </div>
                  
                  <Link href={`/store/${product.slug}`} className="block mt-auto w-full">
                    <Button
                      variant={product.price === 0 ? "outline" : "primary"}
                      className={`w-full justify-center ${product.price !== 0 ? 'shadow-lg shadow-rose-500/20' : ''}`}
                    >
                      {product.price === 0 ? (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Tải Miễn Phí
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Chi Tiết Mua
                        </>
                      )}
                    </Button>
                  </Link>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-8 text-center md:hidden">
          <Link
            href="/store"
            className="inline-flex items-center text-rose-600 font-medium hover:text-rose-700 transition-colors group"
          >
            Vào cửa hàng
            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}
