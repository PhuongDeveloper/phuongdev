/* ==========================================================================
   Supabase Client cho phía Server (Server Components, Route Handlers, Actions)
   Sử dụng createServerClient từ @supabase/ssr với cookies() của Next.js
   ========================================================================== */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Tạo Supabase client cho phía server.
 * Phải gọi trong Server Component, Route Handler, hoặc Server Action.
 * Client này đọc/ghi cookie để duy trì phiên đăng nhập.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Trong Server Component, không thể set cookie.
            // Có thể bỏ qua nếu middleware đã xử lý refresh session.
          }
        },
      },
    }
  );
}
