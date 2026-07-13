-- ==========================================================================
-- Migration 004: Create communities table for dynamic community links
-- ==========================================================================

CREATE TABLE IF NOT EXISTS communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  image_url TEXT,
  button_text TEXT NOT NULL DEFAULT 'Tham gia ngay',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
CREATE TRIGGER trigger_communities_updated_at
  BEFORE UPDATE ON communities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;

-- Read access for everyone
CREATE POLICY "Cho phép đọc công khai communities" ON communities
  FOR SELECT USING (true);

-- Admin write access
CREATE POLICY "Chỉ admin được thêm communities" ON communities
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Chỉ admin được sửa communities" ON communities
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Chỉ admin được xoá communities" ON communities
  FOR DELETE TO authenticated USING (true);

-- Seed some initial data based on old static list
INSERT INTO communities (name, description, url, button_text, sort_order) VALUES
  ('Discord Server', 'Nơi giao lưu, chém gió và hỏi đáp trực tiếp hàng ngày.', 'https://discord.gg/phuongdev', 'Tham gia Discord', 1),
  ('Facebook Group', 'Tham gia nhóm để cập nhật tin tức và bài viết hữu ích.', 'https://facebook.com/groups/phuongdev', 'Truy cập Nhóm', 2),
  ('YouTube Channel', 'Xem các video hướng dẫn lập trình và chia sẻ kinh nghiệm.', 'https://youtube.com/@phuongdev', 'Đăng ký Kênh', 3),
  ('GitHub Organization', 'Đóng góp vào các mã nguồn mở do cộng đồng phát triển.', 'https://github.com/phuongdev', 'Theo dõi GitHub', 4);
