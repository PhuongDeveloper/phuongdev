import 'server-only';

import { createClient } from '@/lib/supabase/server';

export async function getAdminSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, email, display_name, avatar_url, is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) return null;

  return { user, profile };
}

