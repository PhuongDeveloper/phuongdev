import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ShoppingCart, Download, ExternalLink, Tag } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Button from '@/components/ui/Button';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { formatCurrency } from '@/utils/helpers';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const supabase = await createClient();
  const { data: product } = await supabase
    .from('products')
    .select('title, description, image_url')
    .eq('slug', resolvedParams.slug)
    .single();

  if (!product) return { title: 'Không tìm thấy sản phẩm' };

  return {
    title: `${product.title} | PhuongDev Store`,
    description: product.description,
    openGraph: {
      images: product.image_url ? [product.image_url] : [],
    },
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('slug', resolvedParams.slug)
    .single();

  if (!product || !product.is_active) {
    notFound();
  }

  const { data: configRows } = await supabase
    .from('site_config')
    .select('key, value');

  const siteConfig: Record<string, string> = {};
  configRows?.forEach((row) => {
    siteConfig[row.key] = row.value;
  });

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col">
      <Navbar />

      <article className="flex-1 pt-24 pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Nút quay lại */}
          <Link href="/store" className="inline-flex items-center gap-2 text-slate-500 hover:text-rose-600 mb-8 font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" /> Quay lại Cửa Hàng
          </Link>

          {/* Header Sản phẩm */}
          <div className="bg-white rounded-3xl overflow-hidden shadow-xl shadow-slate-200/50 border border-slate-100 mb-12 flex flex-col md:flex-row">
            {/* Ảnh */}
            <div className="md:w-1/2 relative min-h-[300px] bg-slate-100 flex items-center justify-center">
              {product.image_url ? (
                <Image
                  src={product.image_url}
                  alt={product.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="text-slate-400 flex flex-col items-center">
                  <Tag className="w-12 h-12 mb-2" />
                  <span className="font-medium">Chưa có ảnh</span>
                </div>
              )}
            </div>

            {/* Thông tin */}
            <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
              <div className="mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-500 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100">
                  {product.category}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
                {product.title}
              </h1>
              
              <div className="text-3xl font-black text-rose-600 mb-6">
                {product.price > 0 ? formatCurrency(product.price) : 'Miễn Phí'}
              </div>

              <p className="text-slate-600 mb-8 leading-relaxed">
                {product.description}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mt-auto">
                {product.download_url && (
                  <a href={product.download_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button variant="primary" className="w-full justify-center shadow-lg shadow-rose-500/30 py-3 text-base">
                      {product.price > 0 ? 'Mua Ngay' : 'Tải Xuống Ngay'}
                      {product.price > 0 ? <ShoppingCart className="w-5 h-5 ml-2" /> : <Download className="w-5 h-5 ml-2" />}
                    </Button>
                  </a>
                )}
                
                {product.demo_url && (
                  <a href={product.demo_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button variant="outline" className="w-full justify-center py-3 text-base border-slate-300">
                      Xem Demo <ExternalLink className="w-5 h-5 ml-2" />
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Nội dung Markdown */}
          {product.content ? (
            <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-100">
              <h2 className="text-2xl font-bold text-slate-900 mb-8 pb-4 border-b border-slate-100">Chi Tiết Sản Phẩm</h2>
              <div className="prose prose-lg prose-slate prose-headings:font-bold prose-headings:text-slate-900 prose-a:text-rose-600 hover:prose-a:text-rose-700 max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {product.content}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-100 text-center text-slate-500">
              Chưa có thông tin chi tiết cho sản phẩm này.
            </div>
          )}
        </div>
      </article>

      <Footer siteConfig={siteConfig} />
    </div>
  );
}
