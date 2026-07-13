import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, PhoneCall } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Button from '@/components/ui/Button';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import * as LucideIcons from 'lucide-react';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const supabase = await createClient();
  const { data: service } = await supabase
    .from('services')
    .select('title, description')
    .eq('slug', resolvedParams.slug)
    .single();

  if (!service) return { title: 'Không tìm thấy dịch vụ' };

  return {
    title: `${service.title} | PhuongDev`,
    description: service.description,
  };
}

/** Lấy icon Lucide theo tên (dynamic) */
function getIconByName(name: string): React.ElementType {
  const icons = LucideIcons as unknown as Record<string, React.ElementType>;
  return icons[name] || LucideIcons.Code2;
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const supabase = await createClient();

  const { data: service } = await supabase
    .from('services')
    .select('*')
    .eq('slug', resolvedParams.slug)
    .single();

  if (!service) {
    notFound();
  }

  const { data: configRows } = await supabase
    .from('site_config')
    .select('key, value');

  const siteConfig: Record<string, string> = {};
  configRows?.forEach((row) => {
    siteConfig[row.key] = row.value;
  });

  const Icon = getIconByName(service.icon_name);

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col">
      <Navbar />

      <article className="flex-1 pt-24 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Nút quay lại */}
          <Link href="/services" className="inline-flex items-center gap-2 text-slate-500 hover:text-rose-600 mb-8 font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" /> Quay lại danh sách dịch vụ
          </Link>

          {/* Header */}
          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl shadow-slate-200/50 border border-slate-100 mb-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-rose-50 rounded-full blur-3xl opacity-50 -mr-20 -mt-20 pointer-events-none" />
            
            <div className="flex items-start gap-6 relative z-10 flex-col md:flex-row">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-100">
                <Icon className="w-10 h-10 text-rose-600" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
                  {service.title}
                </h1>
                <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                  {service.description}
                </p>
                
                <div className="flex flex-wrap gap-4 items-center">
                  {service.price_range && (
                    <div className="px-4 py-2 bg-slate-100 rounded-xl font-bold text-slate-700">
                      Giá tham khảo: <span className="text-rose-600">{service.price_range}</span>
                    </div>
                  )}
                  {service.redirect_url ? (
                    <a href={service.redirect_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="primary" className="shadow-lg shadow-rose-500/30">
                        Liên Hệ Đăng Ký Ngay <PhoneCall className="w-4 h-4 ml-2" />
                      </Button>
                    </a>
                  ) : (
                    <Link href="/contact">
                      <Button variant="primary" className="shadow-lg shadow-rose-500/30">
                        Liên Hệ Tư Vấn <PhoneCall className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Features */}
          {service.features && service.features.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Tính Năng Nổi Bật</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {service.features.map((feature: string, index: number) => (
                  <div key={index} className="flex items-start gap-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                    <span className="text-slate-700 font-medium">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nội dung Markdown */}
          {service.content && (
            <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-100">
              <div className="prose prose-lg prose-slate prose-headings:font-bold prose-headings:text-slate-900 prose-a:text-rose-600 hover:prose-a:text-rose-700 max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {service.content}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </article>

      <Footer siteConfig={siteConfig} />
    </div>
  );
}
