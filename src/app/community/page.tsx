/* ==========================================================================
   Trang Cộng Đồng (/community) - Server Component
   ========================================================================== */

import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Users, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Cộng Đồng',
  description: 'Tham gia cộng đồng PhuongDev để học hỏi và chia sẻ kiến thức.',
};

export default async function CommunityPage() {
  const supabase = await createClient();

  // Lấy site config
  const { data: configRows } = await supabase
    .from('site_config')
    .select('key, value');

  const siteConfig: Record<string, string> = {};
  configRows?.forEach((row) => {
    siteConfig[row.key] = row.value;
  });

  // Lấy danh sách cộng đồng từ bảng communities
  const { data: communities } = await supabase
    .from('communities')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-16 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-blue-100 mb-6 shadow-sm shadow-blue-200">
              <Users className="w-10 h-10 text-blue-600" />
            </div>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto font-medium">
              {siteConfig['community_description'] ||
                'Nơi kết nối, chia sẻ kiến thức và cùng nhau phát triển trên con đường lập trình.'}
            </p>
          </div>

          {/* Danh sách cộng đồng */}
          <div className="space-y-6">
            {communities && communities.length > 0 ? (
              communities.map((community) => (
                <Card
                  key={community.id}
                  className="flex flex-col md:flex-row overflow-hidden border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group"
                  padding="none"
                >
                  {/* Left Banner */}
                  <div className="w-full md:w-2/5 aspect-video md:aspect-auto md:min-h-[250px] relative bg-slate-100 overflow-hidden shrink-0 border-b md:border-b-0 md:border-r border-slate-100">
                    {community.image_url ? (
                      <Image
                        src={community.image_url}
                        alt={community.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white opacity-90 group-hover:opacity-100 transition-opacity">
                        <div className="text-center">
                          <Users className="w-16 h-16 mx-auto mb-2 opacity-50" />
                          <span className="font-semibold">{community.name}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Content */}
                  <div className="flex-1 p-6 md:p-8 flex flex-col justify-center bg-white">
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">
                      {community.name}
                    </h2>
                    <p className="text-slate-600 mb-6 leading-relaxed flex-1">
                      {community.description}
                    </p>
                    <div className="mt-auto">
                      <a
                        href={community.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block w-full sm:w-auto"
                      >
                        <Button
                          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-blue-600 text-white transition-all shadow-md hover:shadow-blue-500/30"
                          size="lg"
                        >
                          <LinkIcon className="w-4 h-4" />
                          {community.button_text || 'Tham gia ngay'}
                        </Button>
                      </a>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">Chưa có thông tin cộng đồng</h3>
                <p className="text-slate-500">Các kênh giao lưu sẽ sớm được cập nhật tại đây.</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer siteConfig={siteConfig} />
    </>
  );
}
