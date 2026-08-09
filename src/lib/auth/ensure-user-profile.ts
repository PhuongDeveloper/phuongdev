import 'server-only';

import type { SupabaseClient, User } from '@supabase/supabase-js';

import type { UserProfile } from '@/lib/types/database';

function metadataText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * Bảo đảm auth.users luôn có dòng user_profiles tương ứng.
 * Hàm này chỉ được gọi với service-role client ở phía server.
 */
export async function ensureUserProfile(admin: SupabaseClient, user: User) {
  const { data: existing, error: lookupError } = await admin
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (existing) return existing as UserProfile;

  const email = user.email?.trim().toLowerCase();
  if (!email) throw new Error('Tài khoản không có email để khởi tạo hồ sơ.');

  const displayName = metadataText(user.user_metadata?.full_name)
    || metadataText(user.user_metadata?.name)
    || email.split('@')[0];
  const avatarUrl = metadataText(user.user_metadata?.avatar_url);

  const { data: created, error: createError } = await admin
    .from('user_profiles')
    .insert({
      id: user.id,
      email,
      display_name: displayName,
      avatar_url: avatarUrl,
    })
    .select('*')
    .maybeSingle();

  if (!createError && created) return created as UserProfile;
  if (createError?.code !== '23505') throw createError || new Error('Không thể tạo hồ sơ người dùng.');

  // Hai request đầu tiên có thể cùng sửa một hồ sơ thiếu; đọc lại nếu request
  // còn lại đã insert trước và tạo ra unique conflict.
  const { data: recovered, error: recoveryError } = await admin
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (recoveryError || !recovered) throw recoveryError || new Error('Không thể khôi phục hồ sơ người dùng.');
  return recovered as UserProfile;
}
