/* ==========================================================================
   ProductsList - Client Component hiển thị sản phẩm với Framer Motion
   ========================================================================== */

'use client';

import { motion, type Variants } from 'framer-motion';
import { Download, ShoppingCart, Tag, ExternalLink, Info } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import { type Product } from '@/lib/types/database';
import { formatCurrency, truncateText } from '@/utils/helpers';

interface ProductsListProps {
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
    transition: { duration: 0.4 },
  },
};

export default function ProductsList({ products }: ProductsListProps) {
  if (!products || products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Chưa có sản phẩm nào trong cửa hàng.</p>
      </div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {products.map((product) => (
        <motion.div key={product.id} variants={itemVariants} className="flex h-full">
          <Card variant="glass" hoverable padding="none" className="w-full flex flex-col group overflow-hidden border-slate-200/60">
            {/* Banner/Ảnh sản phẩm */}
            <div className="relative h-56 bg-slate-100 overflow-hidden shrink-0">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 flex items-center justify-center transition-transform duration-700 group-hover:scale-105">
                  <Tag className="w-20 h-20 text-white/20" />
                  <Tag className="w-12 h-12 text-white absolute" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
              
              {/* Category Badge */}
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-bold text-indigo-600 shadow-sm uppercase tracking-wider">
                  {product.category}
                </span>
              </div>
              
              {/* Tiêu đề & Icon góc dưới cùng banner */}
              <div className="absolute bottom-4 left-6 right-6">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 text-white mb-3">
                  <Tag className="w-5 h-5" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-1 line-clamp-1">
                  {product.title}
                </h3>
              </div>
            </div>

            {/* Thông tin sản phẩm */}
            <div className="p-6 pt-5 flex-1 flex flex-col relative z-10">
              <div className="flex items-end justify-between mb-4">
                <span className="font-bold text-rose-600 text-lg">
                  {product.price > 0 ? formatCurrency(product.price) : 'Miễn phí'}
                </span>
              </div>
              
              <p className="text-sm text-slate-600 mb-6 flex-1 leading-relaxed">
                {truncateText(product.description, 100)}
              </p>

              {/* Nút hành động */}
              <div className="mt-auto space-y-3">
                <div className="flex gap-2">
                  <Link href={`/store/${product.slug}`} className="flex-1">
                    <Button variant="outline" className="w-full justify-center">
                      Chi Tiết <Info className="w-4 h-4 ml-1.5" />
                    </Button>
                  </Link>
                  
                  {product.demo_url && (
                    <a href={product.demo_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                      <Button variant="outline" className="w-full justify-center">
                        Demo <ExternalLink className="w-4 h-4 ml-1.5" />
                      </Button>
                    </a>
                  )}
                </div>
                
                {product.download_url ? (
                  <a href={product.download_url} target="_blank" rel="noopener noreferrer" className="block w-full">
                    <Button variant="primary" className="w-full justify-center shadow-md shadow-rose-500/20">
                      {product.price > 0 ? 'Mua Ngay' : 'Tải Xuống Ngay'} 
                      {product.price > 0 ? <ShoppingCart className="w-4 h-4 ml-2" /> : <Download className="w-4 h-4 ml-2" />}
                    </Button>
                  </a>
                ) : (
                  <Link href={`/store/${product.slug}`} className="block w-full">
                    <Button variant="primary" className="w-full justify-center shadow-md shadow-rose-500/20">
                      Xem Thông Tin Mua Hàng
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}
