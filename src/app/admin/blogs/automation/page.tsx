import { createClient } from '@/lib/supabase/server';
import type { NewsSource } from '@/lib/types/database';

import NewsAutomationClient from './NewsAutomationClient';

export const dynamic = 'force-dynamic';

export default async function NewsAutomationPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('news_sources').select('*').order('created_at', { ascending: false });
  if (error) console.error('[NewsSources] Không thể tải nguồn RSS:', error);

  const initialSources = (data || []) as NewsSource[];
  return <NewsAutomationClient key={initialSources.map((source) => `${source.id}:${source.updated_at}`).join('|')} initialSources={initialSources} />;
}
