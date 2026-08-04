import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, { ...options, path: '/' }));
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  if (!user && (pathname.startsWith('/admin') || pathname.startsWith('/profile'))) {
    const url = request.nextUrl.clone();
    if (pathname.startsWith('/admin')) {
      url.pathname = '/login';
      url.searchParams.set('next', pathname);
    } else {
      url.pathname = '/';
      url.searchParams.set('auth', 'login');
    }
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/profile/:path*', '/profile'],
};

