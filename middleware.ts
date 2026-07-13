/* ==========================================================================
   Next.js Middleware - Bảo vệ route /admin
   ========================================================================== */

import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Kiểm tra cookie admin_auth do hardcoded login tạo ra
  const adminAuthCookie = request.cookies.get('admin_auth');
  const isAuthenticated = adminAuthCookie?.value === 'phuongdev';

  // Nếu truy cập vào /admin mà chưa đăng nhập -> chuyển hướng về /login
  if (!isAuthenticated && request.nextUrl.pathname.startsWith('/admin')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Nếu đã đăng nhập mà truy cập /login -> chuyển hướng về /admin
  if (isAuthenticated && request.nextUrl.pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Chỉ áp dụng middleware cho các route cần kiểm tra
export const config = {
  matcher: ['/admin/:path*', '/login'],
};
