'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ViewTracker({ table, slug }: { table: string, slug: string }) {
  const hasTracked = useRef(false);

  useEffect(() => {
    const increment = async () => {
      // Chỉ tăng view 1 lần trong 1 session render
      if (hasTracked.current) return;
      hasTracked.current = true;

      const supabase = createClient();
      
      // Thử dùng RPC nếu đã chạy migration
      const { error } = await supabase.rpc('increment_views', { table_name: table, row_slug: slug });
      
      if (error) {
         // Fallback: lấy view hiện tại và update
         const { data } = await supabase.from(table).select('views').eq('slug', slug).single();
         if (data !== null && data.views !== undefined) {
           await supabase.from(table).update({ views: data.views + 1 }).eq('slug', slug);
         }
      }
    };
    
    increment();
  }, [table, slug]);

  return null;
}
