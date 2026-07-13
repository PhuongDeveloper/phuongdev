'use client';

import { motion, type Variants } from 'framer-motion';
import { Mail, MapPin, Briefcase, GraduationCap, ExternalLink } from 'lucide-react';
import { FaFacebook as Facebook, FaTelegram as Telegram } from 'react-icons/fa';
import Card from '@/components/ui/Card';

interface AboutClientProps {
  siteConfig: Record<string, string>;
}

export default function AboutClient({ siteConfig }: AboutClientProps) {
  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16 pt-8 border-b border-slate-200 pb-12"
      >
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-12 gap-12"
      >
        {/* Cột trái: Thông tin Profile */}
        <motion.div variants={fadeInUp} className="lg:col-span-4 space-y-6">
          <Card variant="solid" className="border border-slate-200 sticky top-24 shadow-sm rounded-2xl p-8">
            <div className="flex flex-col items-center">
              <div className="w-40 h-40 rounded-full border border-slate-200 bg-slate-50 mb-6 flex items-center justify-center overflow-hidden">
                <span className="text-5xl font-extrabold text-rose-600">PD</span>
              </div>

              <h2 className="text-2xl font-bold text-slate-900 mb-1">
                PhuongDev
              </h2>
              <p className="text-slate-500 font-medium mb-8 uppercase tracking-widest text-xs">
                Software Engineer
              </p>

              <div className="w-full space-y-5 text-sm text-slate-600 border-t border-slate-100 pt-8">
                <div className="flex items-center gap-4">
                  <MapPin className="w-5 h-5 text-slate-400" />
                  <span className="font-medium text-slate-700">Hà Nội, Việt Nam</span>
                </div>
                {siteConfig['email'] && (
                  <div className="flex items-center gap-4">
                    <Mail className="w-5 h-5 text-slate-400" />
                    <a href={`mailto:${siteConfig['email']}`} className="font-medium hover:text-rose-600 transition-colors">
                      {siteConfig['email']}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <Briefcase className="w-5 h-5 text-slate-400" />
                  <span className="font-medium text-slate-700">Freelancer / Full-time</span>
                </div>
                <div className="flex items-center gap-4">
                  <GraduationCap className="w-5 h-5 text-slate-400" />
                  <span className="font-medium text-slate-700">Công Nghệ Thông Tin</span>
                </div>
              </div>

              {/* Social Links */}
              <div className="flex items-center justify-center gap-4 w-full mt-10 pt-8 border-t border-slate-100">
                <a href={siteConfig['zalo_url'] || '#'} target="_blank" rel="noopener noreferrer" className="text-slate-400 font-bold hover:text-blue-500 transition-colors" title="Zalo">
                  Zalo
                </a>
                <a href={siteConfig['facebook_url'] || '#'} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-600 transition-colors" title="Facebook">
                  <Facebook className="w-6 h-6" />
                </a>
                <a href={siteConfig['telegram_url'] || '#'} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-sky-500 transition-colors" title="Telegram">
                  <Telegram className="w-6 h-6" />
                </a>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Cột phải: Nội dung chi tiết */}
        <motion.div variants={fadeInUp} className="lg:col-span-8 space-y-12">

          <section>
            <h3 className="text-2xl font-bold text-slate-900 mb-6 uppercase tracking-wider text-sm border-b border-slate-200 pb-4">
              Vê tôi
            </h3>

            <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed">
              {siteConfig['about_content'] ? (
                siteConfig['about_content'].split('\n').map((paragraph, idx) => (
                  <p key={idx} className="mb-4 text-base">
                    {paragraph}
                  </p>
                ))
              ) : (
                <p className="text-base italic text-slate-400">
                  Phần giới thiệu đang được cập nhật...
                </p>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-2xl font-bold text-slate-900 mb-8 uppercase tracking-wider text-sm border-b border-slate-200 pb-4">
              Hành Trình & Kinh Nghiệm
            </h3>

            <div className="space-y-12">
              {/* Item 1 */}
              <div className="flex gap-6">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-rose-600 mt-2"></div>
                  <div className="w-px h-full bg-slate-200 mt-2"></div>
                </div>
                <div className="pb-8">
                  <h4 className="font-bold text-slate-900 text-xl mb-1">Senior Full-Stack Developer</h4>
                  <div className="text-rose-600 font-medium text-sm mb-4">Hiện tại</div>
                  <p className="text-slate-600 leading-relaxed">
                    Phát triển các ứng dụng web và di động phức tạp, tối ưu hóa hiệu suất, xây dựng kiến trúc hệ thống và dẫn dắt team phát triển.
                  </p>
                </div>
              </div>

              {/* Item 2 */}
              <div className="flex gap-6">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-slate-300 mt-2"></div>
                  <div className="w-px h-full bg-slate-200 mt-2"></div>
                </div>
                <div className="pb-8">
                  <h4 className="font-bold text-slate-900 text-xl mb-1">Backend Developer</h4>
                  <div className="text-slate-500 font-medium text-sm mb-4">2020 - 2023</div>
                  <p className="text-slate-600 leading-relaxed">
                    Thiết kế và triển khai RESTful APIs, quản trị cơ sở dữ liệu lớn (PostgreSQL, MongoDB) và xây dựng các dịch vụ microservices bằng Node.js.
                  </p>
                </div>
              </div>

              {/* Item 3 */}
              <div className="flex gap-6">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-slate-300 mt-2"></div>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xl mb-1">Đại Học Bách Khoa</h4>
                  <div className="text-slate-500 font-medium text-sm mb-4">2016 - 2020</div>
                  <p className="text-slate-600 leading-relaxed">
                    Tốt nghiệp loại Giỏi chuyên ngành Khoa học Máy tính. Tham gia nghiên cứu AI và hoàn thành nhiều đề tài xuất sắc.
                  </p>
                </div>
              </div>

            </div>
          </section>
        </motion.div>
      </motion.div>
    </div>
  );
}
