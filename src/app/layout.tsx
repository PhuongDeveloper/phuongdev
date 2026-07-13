/* ==========================================================================
   Root Layout - Bố cục gốc của toàn bộ ứng dụng
   Cấu hình font Inter từ Google Fonts, metadata SEO toàn cục
   ========================================================================== */

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'PhuongDev - Kỹ Sư Phần Mềm',
    template: '%s | PhuongDev',
  },
  description:
    'Website cá nhân của PhuongDev - Nơi chia sẻ dự án, dịch vụ và công cụ lập trình chuyên nghiệp.',
  keywords: ['PhuongDev', 'lập trình', 'phần mềm', 'Next.js', 'React', 'portfolio'],
  authors: [{ name: 'PhuongDev' }],
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    siteName: 'PhuongDev',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
