-- ==========================================================================
-- Schema cơ sở dữ liệu: Tính năng Blog Công Nghệ
-- ==========================================================================

-- ===== BẢNG 5: blogs (Bài viết công nghệ) =====
CREATE TABLE IF NOT EXISTS blogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL DEFAULT '',
  excerpt TEXT,
  cover_image TEXT,
  author TEXT NOT NULL DEFAULT 'PhuongDev',
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== TRIGGER: Tự động cập nhật updated_at =====
CREATE TRIGGER trigger_blogs_updated_at
  BEFORE UPDATE ON blogs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== ROW LEVEL SECURITY (RLS) =====
ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;

-- Chính sách SELECT công khai: Chỉ xem các bài viết đã xuất bản
CREATE POLICY "Cho phép đọc công khai blogs đã xuất bản" ON blogs
  FOR SELECT USING (is_published = true);

-- Chính sách SELECT cho Admin: Xem được tất cả (kể cả bản nháp)
CREATE POLICY "Admin xem toàn bộ blogs" ON blogs
  FOR SELECT TO authenticated USING (true);

-- Chính sách INSERT/UPDATE/DELETE chỉ cho Admin
CREATE POLICY "Chỉ admin được thêm blogs" ON blogs
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Chỉ admin được sửa blogs" ON blogs
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Chỉ admin được xoá blogs" ON blogs
  FOR DELETE TO authenticated USING (true);

-- ==========================================================================
-- SEED DATA MẪU
-- ==========================================================================
INSERT INTO blogs (title, slug, content, excerpt, cover_image, tags, is_published, published_at) VALUES
(
  'Hướng dẫn xây dựng ứng dụng Next.js chuyên nghiệp với Supabase',
  'huong-dan-xay-dung-ung-dung-nextjs-voi-supabase',
  '# Xin chào các bạn!
Trong bài viết này, mình sẽ hướng dẫn các bạn cách kết hợp **Next.js 14** (App Router) với **Supabase** để tạo ra một ứng dụng hoàn chỉnh có cơ sở dữ liệu thời gian thực và hệ thống xác thực người dùng.

## 1. Supabase là gì?
Supabase là một giải pháp mã nguồn mở thay thế cho Firebase, được xây dựng trên nền tảng PostgreSQL...

## 2. Cách tích hợp
Bạn chỉ cần sử dụng thư viện `@supabase/ssr` để đảm bảo việc đọc ghi dữ liệu từ phía Server Component được bảo mật tối đa.

![Supabase](https://i.ibb.co/30C9vR2/image.png)

Cảm ơn các bạn đã đọc!',
  'Cách kết hợp Next.js 14 App Router với Supabase để tạo hệ thống full-stack mạnh mẽ.',
  'https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=1000&auto=format&fit=crop',
  ARRAY['Next.js', 'Supabase', 'React', 'Tutorial'],
  TRUE,
  NOW()
),
(
  'Tối ưu SEO cho Website React/Next.js: Những điều cần biết',
  'toi-uu-seo-cho-website-react-nextjs',
  '# Tối ưu SEO cho Website
SEO (Search Engine Optimization) là một phần không thể thiếu đối với bất kỳ website nào nếu muốn người dùng tìm thấy bạn trên Google.

## Các kỹ thuật cần thiết:
1. Sử dụng Metadata API của Next.js
2. Tự động sinh sitemap.xml
3. Sử dụng thẻ Semantic HTML

Bài viết đang được cập nhật thêm...',
  'Tổng hợp các kỹ thuật tối ưu hóa công cụ tìm kiếm (SEO) dành riêng cho ứng dụng Next.js.',
  'https://images.unsplash.com/photo-1432821596592-e2c18b78144f?q=80&w=1000&auto=format&fit=crop',
  ARRAY['SEO', 'Next.js', 'Web Development'],
  TRUE,
  NOW()
);
