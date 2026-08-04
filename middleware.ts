/* ==========================================================================
   Middleware - Bảo vệ route /admin và /profile dùng Supabase Auth
   ========================================================================== */

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, { ...options, path: '/' })
          );
        },
      },
    }
  );

  // Lấy session người dùng
  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Bảo vệ /profile - cần đăng nhập
  if (!user && pathname.startsWith('/profile')) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('auth', 'login');
    return NextResponse.redirect(url);
  }

  // Bảo vệ /admin - cần đăng nhập + is_admin
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    // Kiểm tra is_admin trong user_profiles
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    // Fallback: kiểm tra cookie admin_auth cũ (backward compat)
    const adminCookie = request.cookies.get('admin_auth')?.value === 'phuongdev';

    if (!profile?.is_admin && !adminCookie) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  // Nếu đã đăng nhập + admin mà vào /login -> chuyển về /admin
  if (user && pathname === '/login') {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    const adminCookie = request.cookies.get('admin_auth')?.value === 'phuongdev';
    if (profile?.is_admin || adminCookie) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/admin/:path*', '/login', '/profile/:path*', '/profile'],
};
