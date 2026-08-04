import { NextRequest, NextResponse } from 'next/server';

import { getAdminSession } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';

type VariantPayload = {
  id?: string;
  name: string;
  sku: string;
  short_description?: string;
  duration_label?: string | null;
  price: number;
  compare_at_price?: number | null;
  inventory_policy: 'finite' | 'unlimited';
  stock_quantity: number;
  sold_count?: number;
  purchase_limit: number;
  key_type: 'trial' | 'permanent';
  download_url?: string | null;
  delivery_note?: string | null;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  new_keys?: string[];
};

type ProductPayload = {
  id?: string;
  product: Record<string, unknown>;
  variants: VariantPayload[];
};

const productFields = [
  'title', 'slug', 'description', 'content', 'price', 'download_url', 'demo_url',
  'image_url', 'gallery_images', 'category', 'is_active', 'has_key', 'delivery_intro',
  'delivery_note', 'badge', 'is_featured', 'fulfillment_time', 'warranty_text', 'sort_order',
] as const;

function sanitizeProduct(input: Record<string, unknown>, variants: VariantPayload[]) {
  const value: Record<string, unknown> = {};
  productFields.forEach((field) => { if (field in input) value[field] = input[field]; });
  const prices = variants.map((variant) => Number(variant.price)).filter(Number.isFinite);
  value.price = prices.length ? Math.min(...prices) : Number(input.price || 0);
  value.gallery_images = Array.isArray(input.gallery_images)
    ? input.gallery_images.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map((item) => item.trim())
    : [];
  return value;
}

function sanitizeVariant(variant: VariantPayload, productId: string, index: number) {
  return {
    ...(variant.id ? { id: variant.id } : {}),
    product_id: productId,
    name: String(variant.name || '').trim(),
    sku: String(variant.sku || '').trim().toUpperCase(),
    short_description: String(variant.short_description || '').trim(),
    duration_label: variant.duration_label || null,
    price: Math.max(0, Math.round(Number(variant.price) || 0)),
    compare_at_price: variant.compare_at_price ? Math.round(Number(variant.compare_at_price)) : null,
    inventory_policy: variant.inventory_policy === 'unlimited' ? 'unlimited' : 'finite',
    stock_quantity: Math.max(0, Math.round(Number(variant.stock_quantity) || 0)),
    sold_count: Math.max(0, Math.round(Number(variant.sold_count) || 0)),
    purchase_limit: Math.min(100, Math.max(1, Math.round(Number(variant.purchase_limit) || 1))),
    key_type: variant.key_type === 'trial' ? 'trial' : 'permanent',
    download_url: variant.download_url || null,
    delivery_note: variant.delivery_note || null,
    is_active: variant.is_active !== false,
    is_featured: Boolean(variant.is_featured),
    sort_order: index,
  };
}

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) return null;
  return { session, admin: createAdminClient() };
}

async function saveProduct(payload: ProductPayload) {
  const context = await requireAdmin();
  if (!context) return NextResponse.json({ error: 'Không có quyền quản trị.' }, { status: 403 });
  if (!payload.product || !Array.isArray(payload.variants) || payload.variants.length === 0) {
    return NextResponse.json({ error: 'Sản phẩm phải có ít nhất một gói bán.' }, { status: 400 });
  }
  if (payload.variants.some((variant) => !variant.name?.trim() || !variant.sku?.trim())) {
    return NextResponse.json({ error: 'Mỗi gói cần có tên và SKU.' }, { status: 400 });
  }

  const { admin } = context;
  const productValue = sanitizeProduct(payload.product, payload.variants);
  let productId = payload.id;

  if (productId) {
    const { error } = await admin.from('products').update(productValue).eq('id', productId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    const { data, error } = await admin.from('products').insert(productValue).select('id').single();
    if (error || !data) return NextResponse.json({ error: error?.message || 'Không thể tạo sản phẩm.' }, { status: 400 });
    productId = data.id;
  }

  if (!productId) return NextResponse.json({ error: 'Không thể xác định sản phẩm.' }, { status: 500 });
  const resolvedProductId = productId;

  const savedVariantIds: string[] = [];
  for (let index = 0; index < payload.variants.length; index += 1) {
    const variant = payload.variants[index];
    const value = sanitizeVariant(variant, resolvedProductId, index);
    const { data, error } = variant.id
      ? await admin.from('product_variants').update(value).eq('id', variant.id).eq('product_id', resolvedProductId).select('id').single()
      : await admin.from('product_variants').insert(value).select('id').single();

    if (error || !data) return NextResponse.json({ error: error?.message || `Không thể lưu gói ${variant.name}.` }, { status: 400 });
    savedVariantIds.push(data.id);

    const newKeys = Array.from(new Set((variant.new_keys || []).map((key) => key.trim()).filter(Boolean)));
    if (newKeys.length > 0) {
      const { error: keyError } = await admin.from('product_keys').insert(newKeys.map((key) => ({
        product_id: resolvedProductId,
        variant_id: data.id,
        key_value: key,
        key_type: variant.key_type,
        is_used: false,
      })));
      if (keyError) return NextResponse.json({ error: `Không thể thêm key cho ${variant.name}: ${keyError.message}` }, { status: 400 });
    }
  }

  if (payload.id) {
    const { data: oldVariants } = await admin.from('product_variants').select('id').eq('product_id', resolvedProductId);
    const removedIds = (oldVariants || []).map((item) => item.id).filter((id) => !savedVariantIds.includes(id));
    if (removedIds.length) await admin.from('product_variants').update({ is_active: false }).in('id', removedIds);
  }

  if (Boolean(productValue.has_key)) {
    for (const variantId of savedVariantIds) {
      const { count } = await admin
        .from('product_keys')
        .select('*', { count: 'exact', head: true })
        .eq('variant_id', variantId)
        .eq('is_used', false)
        .is('reserved_order_id', null);
      await admin.from('product_variants').update({ stock_quantity: count || 0, inventory_policy: 'finite' }).eq('id', variantId);
    }
  }

  const { data: saved } = await admin.from('products').select('*, product_variants(*)').eq('id', resolvedProductId).single();
  return NextResponse.json({ success: true, product: saved });
}

export async function POST(request: NextRequest) {
  return saveProduct((await request.json()) as ProductPayload);
}

export async function PATCH(request: NextRequest) {
  return saveProduct((await request.json()) as ProductPayload);
}

export async function DELETE(request: NextRequest) {
  const context = await requireAdmin();
  if (!context) return NextResponse.json({ error: 'Không có quyền quản trị.' }, { status: 403 });
  const { id } = (await request.json()) as { id?: string };
  if (!id) return NextResponse.json({ error: 'Thiếu mã sản phẩm.' }, { status: 400 });

  const { error } = await context.admin.from('products').update({ is_active: false }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await context.admin.from('product_variants').update({ is_active: false }).eq('product_id', id);
  return NextResponse.json({ success: true });
}
