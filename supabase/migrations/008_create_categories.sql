-- ==========================================================================
-- Migration 008: Create categories table
-- ==========================================================================

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_categories_updated_at ON categories;
CREATE TRIGGER trigger_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Read access for everyone
DROP POLICY IF EXISTS "Cho phép đọc công khai categories" ON categories;
CREATE POLICY "Cho phép đọc công khai categories" ON categories
  FOR SELECT USING (true);

-- Admin write access (Cho phép anon vì sử dụng custom auth)
DROP POLICY IF EXISTS "Chỉ admin được thêm categories" ON categories;
DROP POLICY IF EXISTS "Chỉ admin được sửa categories" ON categories;
DROP POLICY IF EXISTS "Chỉ admin được xoá categories" ON categories;
DROP POLICY IF EXISTS "Anon được thêm categories" ON categories;
DROP POLICY IF EXISTS "Anon được sửa categories" ON categories;
DROP POLICY IF EXISTS "Anon được xoá categories" ON categories;

CREATE POLICY "Anon được thêm categories" ON categories
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon được sửa categories" ON categories
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon được xoá categories" ON categories
  FOR DELETE TO anon USING (true);

-- Seed initial data matching existing hardcoded categories
INSERT INTO categories (name, slug, description, sort_order) VALUES
  ('Script / Mã Nguồn', 'script', 'Sản phẩm là script và mã nguồn', 1),
  ('Template Giao Diện', 'template', 'Sản phẩm là template giao diện', 2),
  ('Bot / Tool', 'bot', 'Sản phẩm là bot hoặc tool', 3),
  ('Khác', 'other', 'Các loại sản phẩm khác', 4)
ON CONFLICT (slug) DO NOTHING;
