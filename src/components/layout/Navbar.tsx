import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import NavbarClient from './NavbarClient';

type NavbarProps = {
  theme?: 'light' | 'dark';
  siteConfig?: Record<string, string>;
};

export default async function Navbar({ theme = 'light', siteConfig: providedSiteConfig }: NavbarProps) {
  const supabase = await createClient();

  const [{ data: configRows }, { data: authData }] = await Promise.all([
    providedSiteConfig
      ? Promise.resolve({ data: null })
      : supabase.from('site_config').select('key, value'),
    supabase.auth.getUser(),
  ]);

  const initialUser = authData.user
    ? { id: authData.user.id, email: authData.user.email }
    : null;
  const { data: initialProfile } = initialUser
    ? await supabase.from('user_profiles').select('*').eq('id', initialUser.id).maybeSingle()
    : { data: null };

  const siteConfig: Record<string, string> = { ...providedSiteConfig };
  configRows?.forEach((row) => {
    siteConfig[row.key] = row.value;
  });

  return (
    <Suspense fallback={null}>
      <NavbarClient
        siteConfig={siteConfig}
        theme={theme}
        initialUser={initialUser}
        initialProfile={initialProfile}
      />
    </Suspense>
  );
}
