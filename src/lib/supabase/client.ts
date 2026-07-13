/* ==========================================================================
   Supabase Client cho phía trình duyệt (Browser / Client Components)
   Sử dụng trong các component có 'use client'
   ========================================================================== */

import { createBrowserClient } from '@supabase/ssr';

/**
 * Tạo Supabase client cho phía trình duyệt.
 * Client này sử dụng cookie để quản lý phiên đăng nhập.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
