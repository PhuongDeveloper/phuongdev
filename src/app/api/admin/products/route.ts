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
  value.sort_order = Math.max(0, Math.round(Number(input.sort_order) || 0));
  return value;
}

function sanitizeVariant(variant: VariantPayload, productId: string, index: number) {
  const parsedCompareAtPrice = variant.compare_at_price == null
    ? null
    : Math.max(0, Math.round(Number(variant.compare_at_price) || 0));

  return {
    product_id: productId,
    name: String(variant.name || '').trim(),
    sku: String(variant.sku || '').trim().toUpperCase(),
    short_description: String(variant.short_description || '').trim(),
    duration_label: variant.duration_label || null,
    price: Math.max(0, Math.round(Number(variant.price) || 0)),
    compare_at_price: parsedCompareAtPrice,
    inventory_policy: variant.inventory_policy === 'unlimited' ? 'unlimited' : 'finite',
    stock_quantity: Math.max(0, Math.round(Number(variant.stock_quantity) || 0)),
    purchase_limit: Math.min(100, Math.max(1, Math.round(Number(variant.purchase_limit) || 1))),
    key_type: variant.key_type === 'trial' ? 'trial' : 'permanent',
    download_url: variant.download_url || null,
    delivery_note: variant.delivery_note || null,
    is_active: variant.is_active !== false,
    is_featured: Boolean(variant.is_featured),
    sort_order: index,
  };
}

type DatabaseError = { code?: string; message?: string };

function databaseErrorResponse(error: DatabaseError, fallback: string) {
  console.error(fallback, error);
  if (error.code === '23505') {
    return NextResponse.json({ error: 'Slug sản phẩm hoặc SKU của gói đã tồn tại.' }, { status: 409 });
  }
  if (error.code === '23503') {
    return NextResponse.json({ error: 'Dữ liệu này đang được đơn hàng sử dụng nên không thể xóa.' }, { status: 409 });
  }
  if (error.code === '23514') {
    return NextResponse.json({ error: 'Giá, tồn kho hoặc giới hạn mua chưa hợp lệ.' }, { status: 422 });
  }
  return NextResponse.json({ error: fallback }, { status: 500 });
}

function validatePayload(payload: ProductPayload) {
  if (!payload?.product || !Array.isArray(payload.variants) || payload.variants.length === 0) {
    return 'Sản phẩm phải có ít nhất một gói bán.';
  }
  if (!String(payload.product.title || '').trim() || !String(payload.product.slug || '').trim()) {
    return 'Sản phẩm cần có tên và slug.';
  }
  if (payload.variants.some((variant) => !variant.name?.trim() || !variant.sku?.trim())) {
    return 'Mỗi gói cần có tên và SKU.';
  }

  const skus = payload.variants.map((variant) => variant.sku.trim().toUpperCase());
  if (new Set(skus).size !== skus.length) return 'Các gói trong cùng sản phẩm không được trùng SKU.';

  const invalidPrice = payload.variants.find((variant) => {
    const price = Math.max(0, Math.round(Number(variant.price) || 0));
    if (variant.compare_at_price == null) return false;
    const compareAtPrice = Number(variant.compare_at_price);
    return !Number.isFinite(compareAtPrice) || compareAtPrice < price;
  });
  if (invalidPrice) return `Giá so sánh của "${invalidPrice.name}" phải lớn hơn hoặc bằng giá bán.`;

  return null;
}

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) return null;
  return { session, admin: createAdminClient() };
}

async function saveProduct(payload: ProductPayload) {
  const context = await requireAdmin();
  if (!context) return NextResponse.json({ error: 'Không có quyền quản trị.' }, { status: 403 });
  const validationError = validatePayload(payload);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 422 });

  const { admin } = context;
  const productValue = sanitizeProduct(payload.product, payload.variants);
  let productId = payload.id;

  // Kiểm tra các ràng buộc trước khi ghi sản phẩm để tránh trạng thái lưu dở dang.
  const slug = String(productValue.slug || '').trim();
  let slugQuery = admin.from('products').select('id').eq('slug', slug).limit(1);
  if (productId) slugQuery = slugQuery.neq('id', productId);
  const { data: slugRows, error: slugError } = await slugQuery;
  if (slugError) return databaseErrorResponse(slugError, 'Không thể kiểm tra slug sản phẩm.');
  if (slugRows?.length) return NextResponse.json({ error: 'Slug sản phẩm đã tồn tại.' }, { status: 409 });

  const normalizedSkus = payload.variants.map((variant) => variant.sku.trim().toUpperCase());
  const expectedVariantBySku = new Map(payload.variants.map((variant) => [variant.sku.trim().toUpperCase(), variant.id]));
  const { data: skuRows, error: skuError } = await admin
    .from('product_variants')
    .select('id, sku')
    .in('sku', normalizedSkus);
  if (skuError) return databaseErrorResponse(skuError, 'Không thể kiểm tra SKU của các gói.');
  const conflictingSku = skuRows?.find((row) => expectedVariantBySku.get(row.sku) !== row.id);
  if (conflictingSku) {
    return NextResponse.json({ error: `SKU ${conflictingSku.sku} đã được một gói khác sử dụng.` }, { status: 409 });
  }

  if (productId) {
    const { data, error } = await admin.from('products').update(productValue).eq('id', productId).select('id').maybeSingle();
    if (error) return databaseErrorResponse(error, 'Không thể cập nhật sản phẩm.');
    if (!data) return NextResponse.json({ error: 'Không tìm thấy sản phẩm cần cập nhật.' }, { status: 404 });
  } else {
    const { data, error } = await admin.from('products').insert(productValue).select('id').single();
    if (error) return databaseErrorResponse(error, 'Không thể tạo sản phẩm.');
    if (!data) return NextResponse.json({ error: 'Không thể tạo sản phẩm.' }, { status: 500 });
    productId = data.id;
  }

  if (!productId) return NextResponse.json({ error: 'Không thể xác định sản phẩm.' }, { status: 500 });
  const resolvedProductId = productId;

  const savedVariantIds: string[] = [];
  for (let index = 0; index < payload.variants.length; index += 1) {
    const variant = payload.variants[index];
    const value = sanitizeVariant(variant, resolvedProductId, index);
    const updateValue: Partial<typeof value> = { ...value };
    delete updateValue.product_id;
    const { data, error } = variant.id
      ? await admin.from('product_variants').update(updateValue).eq('id', variant.id).eq('product_id', resolvedProductId).select('id').maybeSingle()
      : await admin.from('product_variants').insert(value).select('id').single();

    if (error) return databaseErrorResponse(error, `Không thể lưu gói "${variant.name}".`);
    if (!data) return NextResponse.json({ error: `Không tìm thấy gói "${variant.name}" cần cập nhật.` }, { status: 404 });
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
      if (keyError) return databaseErrorResponse(keyError, `Không thể thêm key cho "${variant.name}".`);
    }
  }

  if (payload.id) {
    const { data: oldVariants, error: oldVariantsError } = await admin.from('product_variants').select('id').eq('product_id', resolvedProductId);
    if (oldVariantsError) return databaseErrorResponse(oldVariantsError, 'Không thể đồng bộ danh sách gói.');
    const removedIds = (oldVariants || []).map((item) => item.id).filter((id) => !savedVariantIds.includes(id));
    if (removedIds.length) {
      const { error } = await admin.from('product_variants').update({ is_active: false }).in('id', removedIds);
      if (error) return databaseErrorResponse(error, 'Không thể dừng các gói đã xóa khỏi sản phẩm.');
    }
  }

  if (Boolean(productValue.has_key)) {
    for (const variantId of savedVariantIds) {
      const { count } = await admin
        .from('product_keys')
        .select('*', { count: 'exact', head: true })
        .eq('variant_id', variantId)
        .eq('is_used', false)
        .is('reserved_order_id', null);
      const { error } = await admin.from('product_variants').update({ stock_quantity: count || 0, inventory_policy: 'finite' }).eq('id', variantId);
      if (error) return databaseErrorResponse(error, 'Không thể đồng bộ tồn kho key.');
    }
  }

  const { data: saved, error: savedError } = await admin.from('products').select('*, product_variants(*)').eq('id', resolvedProductId).single();
  if (savedError) return databaseErrorResponse(savedError, 'Sản phẩm đã lưu nhưng không thể tải lại dữ liệu.');
  return NextResponse.json({ success: true, product: saved });
}

export async function POST(request: NextRequest) {
  try {
    return saveProduct((await request.json()) as ProductPayload);
  } catch {
    return NextResponse.json({ error: 'Dữ liệu gửi lên không đúng định dạng.' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    return saveProduct((await request.json()) as ProductPayload);
  } catch {
    return NextResponse.json({ error: 'Dữ liệu gửi lên không đúng định dạng.' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const context = await requireAdmin();
  if (!context) return NextResponse.json({ error: 'Không có quyền quản trị.' }, { status: 403 });
  let body: { id?: string; permanent?: boolean };
  try {
    body = (await request.json()) as { id?: string; permanent?: boolean };
  } catch {
    return NextResponse.json({ error: 'Dữ liệu gửi lên không đúng định dạng.' }, { status: 400 });
  }
  const { id, permanent } = body;
  if (!id) return NextResponse.json({ error: 'Thiếu mã sản phẩm.' }, { status: 400 });

  const { admin } = context;

  if (permanent) {
    const { count, error: orderError } = await admin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', id);
    if (orderError) return databaseErrorResponse(orderError, 'Không thể kiểm tra lịch sử đơn hàng.');
    if ((count || 0) > 0) {
      return NextResponse.json({
        error: 'Sản phẩm đã có đơn hàng nên không thể xóa vĩnh viễn. Hãy dùng Dừng bán để giữ nguyên lịch sử khách hàng.',
      }, { status: 409 });
    }

    // product_variants và product_keys đã có ON DELETE CASCADE theo product.
    const { data, error } = await admin.from('products').delete().eq('id', id).select('id').maybeSingle();
    if (error) return databaseErrorResponse(error, 'Không thể xóa sản phẩm.');
    if (!data) return NextResponse.json({ error: 'Không tìm thấy sản phẩm cần xóa.' }, { status: 404 });
  } else {
    // Ẩn / hiện (toggle is_active)
    const { data: current, error: currentError } = await admin.from('products').select('is_active').eq('id', id).maybeSingle();
    if (currentError) return databaseErrorResponse(currentError, 'Không thể đọc trạng thái sản phẩm.');
    if (!current) return NextResponse.json({ error: 'Không tìm thấy sản phẩm.' }, { status: 404 });
    const nextActive = !(current?.is_active ?? true);
    const { error } = await admin.from('products').update({ is_active: nextActive }).eq('id', id);
    if (error) return databaseErrorResponse(error, 'Không thể đổi trạng thái sản phẩm.');
    const { error: variantError } = await admin.from('product_variants').update({ is_active: nextActive }).eq('product_id', id);
    if (variantError) return databaseErrorResponse(variantError, 'Sản phẩm đã đổi trạng thái nhưng chưa thể đồng bộ các gói.');
  }

  return NextResponse.json({ success: true });
}
