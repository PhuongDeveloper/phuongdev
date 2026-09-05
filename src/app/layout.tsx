/* ==========================================================================
   Root Layout - Bố cục gốc của toàn bộ ứng dụng
   Cấu hình font Inter từ Google Fonts, metadata SEO toàn cục
   ========================================================================== */

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { getSiteUrl } from '@/lib/site-url';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: 'PhuongDev - Kỹ Sư Phần Mềm',
    template: '%s | PhuongDev',
  },
  description:
    'Website cá nhân của PhuongDev - Nơi chia sẻ dự án, dịch vụ và công cụ lập trình chuyên nghiệp.',
  keywords: ['PhuongDev', 'lập trình', 'phần mềm', 'Next.js', 'React', 'portfolio'],
  authors: [{ name: 'PhuongDev' }],
  creator: 'PhuongDev',
  publisher: 'PhuongDev',
  applicationName: 'PhuongDev',
  category: 'Công nghệ',
  alternates: { canonical: '/' },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    siteName: 'PhuongDev',
    url: '/',
    title: 'PhuongDev - Kỹ Sư Phần Mềm',
    description: 'Dự án, dịch vụ và công cụ lập trình chuyên nghiệp từ PhuongDev.',
  },
  twitter: { card: 'summary_large_image', title: 'PhuongDev - Kỹ Sư Phần Mềm', description: 'Dự án, dịch vụ và công cụ lập trình chuyên nghiệp từ PhuongDev.' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={inter.variable} data-scroll-behavior="smooth">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
