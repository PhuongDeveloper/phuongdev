import type { Product, ProductVariant, ProductWithVariants } from '@/lib/types/database';

/** Keeps the catalogue readable between the code deploy and migration 011. */
export function normalizeLegacyProduct(input: Partial<Product> & Pick<Product, 'id' | 'title' | 'slug' | 'description' | 'price'>): ProductWithVariants {
  const product = {
    gallery_images: [], badge: null, total_sold: 0, is_featured: false,
    fulfillment_time: 'Giao ngay sau thanh toán', warranty_text: 'Hỗ trợ trong thời hạn gói',
    ...input,
  } as Product;

  const variant: ProductVariant = {
    id: product.id,
    product_id: product.id,
    name: product.price === 0 ? 'Miễn phí' : 'Bản tiêu chuẩn',
    sku: `LEGACY-${product.id.replaceAll('-', '').slice(0, 10).toUpperCase()}`,
    short_description: product.description,
    duration_label: null,
    price: Number(product.price),
    compare_at_price: null,
    inventory_policy: 'unlimited',
    stock_quantity: 0,
    sold_count: 0,
    purchase_limit: 1,
    key_type: product.price === 0 ? 'trial' : 'permanent',
    download_url: product.download_url,
    delivery_note: product.delivery_note,
    is_active: product.is_active,
    is_featured: true,
    sort_order: 0,
    created_at: product.created_at,
    updated_at: product.updated_at,
  };

  return { ...product, product_variants: [variant] };
}

