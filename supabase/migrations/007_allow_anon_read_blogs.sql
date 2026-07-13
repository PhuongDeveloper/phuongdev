-- Cho phép anon xem tất cả các bài viết blogs (kể cả bản nháp)
-- Vì hệ thống đã bỏ qua Supabase Auth và dùng cookie riêng cho Admin,
-- server component sử dụng anon key nên bị chặn xem bản nháp nếu không có policy này.

DROP POLICY IF EXISTS "Cho phép đọc công khai blogs đã xuất bản" ON blogs;
DROP POLICY IF EXISTS "Anon được đọc mọi blogs" ON blogs;

CREATE POLICY "Anon được đọc mọi blogs" ON blogs FOR SELECT TO anon USING (true);
