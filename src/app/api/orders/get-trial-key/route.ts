import { NextRequest, NextResponse } from 'next/server';

import { ensureUserProfile } from '@/lib/auth/ensure-user-profile';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

/** Backwards-compatible endpoint. New storefront uses /api/orders/purchase for free packages too. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Vui lòng đăng nhập.' }, { status: 401 });

  const { product_id, variant_id } = (await request.json()) as { product_id?: string; variant_id?: string };
  const admin = createAdminClient();
  try {
    await ensureUserProfile(admin, user);
  } catch (profileError) {
    console.error('[Trial] Could not ensure user profile', profileError);
    return NextResponse.json({ error: 'Không thể khởi tạo hồ sơ nhận sản phẩm.' }, { status: 500 });
  }

  let variantId = variant_id;

  if (!variantId && product_id) {
    const { data } = await admin
      .from('product_variants')
      .select('id')
      .eq('product_id', product_id)
      .eq('price', 0)
      .eq('key_type', 'trial')
      .eq('is_active', true)
      .order('sort_order')
      .limit(1)
      .maybeSingle();
    variantId = data?.id;
  }

  if (!variantId) return NextResponse.json({ error: 'Sản phẩm chưa có gói dùng thử.' }, { status: 404 });

  const { data: result, error } = await admin.rpc('purchase_variant_with_wallet', {
    p_user_id: user.id,
    p_variant_id: variantId,
    p_quantity: 1,
  });
  if (error) return NextResponse.json({ error: 'Không thể cấp gói dùng thử.' }, { status: 500 });
  if (!result?.success) return NextResponse.json({ error: result?.error || 'Không thể cấp gói dùng thử.' }, { status: 400 });

  return NextResponse.json({ ...result, message: 'Đã cấp gói dùng thử vào tài khoản của bạn.' });
}
