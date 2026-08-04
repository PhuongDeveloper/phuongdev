import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import NavbarClient from './NavbarClient';

export default async function Navbar({ theme = 'light' }: { theme?: 'light' | 'dark' }) {
  const supabase = await createClient();

  const { data: configRows } = await supabase
    .from('site_config')
    .select('key, value');

  const siteConfig: Record<string, string> = {};
  configRows?.forEach((row) => {
    siteConfig[row.key] = row.value;
  });

  return (
    <Suspense fallback={null}>
      <NavbarClient siteConfig={siteConfig} theme={theme} />
    </Suspense>
  );
}
