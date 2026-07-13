-- Thay đổi RLS để cho phép thao tác mà không cần session từ Supabase Auth
-- Lưu ý: Cách này sẽ làm cho các API của Supabase mở hoàn toàn. 
-- Nhưng bù lại, bạn có thể dùng tài khoản fix cứng trong code như yêu cầu.

-- 1. Bảng site_config
DROP POLICY IF EXISTS "Chỉ admin được thêm site_config" ON site_config;
DROP POLICY IF EXISTS "Chỉ admin được sửa site_config" ON site_config;
DROP POLICY IF EXISTS "Chỉ admin được xoá site_config" ON site_config;

CREATE POLICY "Anon được thêm site_config" ON site_config FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon được sửa site_config" ON site_config FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon được xoá site_config" ON site_config FOR DELETE TO anon USING (true);

-- 2. Bảng projects
DROP POLICY IF EXISTS "Chỉ admin được thêm projects" ON projects;
DROP POLICY IF EXISTS "Chỉ admin được sửa projects" ON projects;
DROP POLICY IF EXISTS "Chỉ admin được xoá projects" ON projects;

CREATE POLICY "Anon được thêm projects" ON projects FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon được sửa projects" ON projects FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon được xoá projects" ON projects FOR DELETE TO anon USING (true);

-- 3. Bảng services
DROP POLICY IF EXISTS "Chỉ admin được thêm services" ON services;
DROP POLICY IF EXISTS "Chỉ admin được sửa services" ON services;
DROP POLICY IF EXISTS "Chỉ admin được xoá services" ON services;

CREATE POLICY "Anon được thêm services" ON services FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon được sửa services" ON services FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon được xoá services" ON services FOR DELETE TO anon USING (true);

-- 4. Bảng products
DROP POLICY IF EXISTS "Chỉ admin được thêm products" ON products;
DROP POLICY IF EXISTS "Chỉ admin được sửa products" ON products;
DROP POLICY IF EXISTS "Chỉ admin được xoá products" ON products;

CREATE POLICY "Anon được thêm products" ON products FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon được sửa products" ON products FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon được xoá products" ON products FOR DELETE TO anon USING (true);

-- 5. Bảng blogs
DROP POLICY IF EXISTS "Chỉ admin được thêm blogs" ON blogs;
DROP POLICY IF EXISTS "Chỉ admin được sửa blogs" ON blogs;
DROP POLICY IF EXISTS "Chỉ admin được xoá blogs" ON blogs;

CREATE POLICY "Anon được thêm blogs" ON blogs FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon được sửa blogs" ON blogs FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon được xoá blogs" ON blogs FOR DELETE TO anon USING (true);

-- 6. Bảng communities
DROP POLICY IF EXISTS "Chỉ admin được thêm cộng đồng" ON communities;
DROP POLICY IF EXISTS "Chỉ admin được sửa cộng đồng" ON communities;
DROP POLICY IF EXISTS "Chỉ admin được xoá cộng đồng" ON communities;

CREATE POLICY "Anon được thêm cộng đồng" ON communities FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon được sửa cộng đồng" ON communities FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon được xoá cộng đồng" ON communities FOR DELETE TO anon USING (true);
