import ProductsClient from './ProductsClient';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ProductWithVariants } from '@/lib/types/database';

export default async function ProductsPage() {
  const admin = createAdminClient();
  const [{ data: products }, { data: categories }, { data: keys }] = await Promise.all([
    admin.from('products').select('*, product_variants(*)').order('sort_order', { ascending: true }),
    admin.from('categories').select('*').order('sort_order', { ascending: true }),
    admin.from('product_keys').select('variant_id, is_used, reserved_order_id'),
  ]);

  const keyCount = new Map<string, number>();
  (keys || []).forEach((key) => {
    if (key.variant_id && !key.is_used && !key.reserved_order_id) keyCount.set(key.variant_id, (keyCount.get(key.variant_id) || 0) + 1);
  });
  const enriched = (products || []).map((product) => ({
    ...product,
    product_variants: (product.product_variants || []).map((variant: Record<string, unknown>) => ({
      ...variant,
      available_keys: keyCount.get(variant.id as string) || 0,
    })),
  }));

  return <ProductsClient initialData={enriched as ProductWithVariants[]} categories={categories || []} />;
}

