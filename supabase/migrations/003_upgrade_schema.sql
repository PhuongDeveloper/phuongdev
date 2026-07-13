-- ==========================================================================
-- Migration 003: Upgrade Schema cho Services và Products
-- Bổ sung slug, content và action urls
-- ==========================================================================

-- 1. Bổ sung cho bảng services
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS content TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS redirect_url TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Tự động sinh slug cho dữ liệu cũ (chỉ dùng tạm để tránh lỗi NULL nếu slug bắt buộc, ở đây cho phép null tạm)
UPDATE services SET slug = 'dich-vu-' || substr(id::text, 1, 8) WHERE slug IS NULL;

-- 2. Bổ sung cho bảng products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS content TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS demo_url TEXT;

UPDATE products SET slug = 'san-pham-' || substr(id::text, 1, 8) WHERE slug IS NULL;

-- (Tùy chọn) Bổ sung constraints cho slug sau khi update data cũ
ALTER TABLE services ALTER COLUMN slug SET NOT NULL;
ALTER TABLE products ALTER COLUMN slug SET NOT NULL;
