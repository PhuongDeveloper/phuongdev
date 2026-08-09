/* ==========================================================================
   Supabase Client cho phía trình duyệt (Browser / Client Components)
   Sử dụng trong các component có 'use client'
   ========================================================================== */

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | undefined;

/**
 * Tạo Supabase client cho phía trình duyệt.
 * Client này sử dụng cookie để quản lý phiên đăng nhập.
 */
export function createClient(): SupabaseClient {
  if (browserClient) return browserClient;

  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return browserClient;
}
