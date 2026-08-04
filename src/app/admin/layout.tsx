import { redirect } from 'next/navigation';

import AdminShell from '@/components/layout/AdminShell';
import { getAdminSession } from '@/lib/auth/admin';

// Admin data depends on the authenticated request and server-only credentials.
// Never execute these routes during static generation.
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect('/login');

  return (
    <AdminShell
      user={{
        email: session.profile.email || session.user.email || '',
        displayName: session.profile.display_name || session.user.email?.split('@')[0] || 'Admin',
        avatarUrl: session.profile.avatar_url,
      }}
    >
      {children}
    </AdminShell>
  );
}
