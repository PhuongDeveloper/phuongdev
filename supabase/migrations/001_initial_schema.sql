-- ==========================================================================
-- Schema cơ sở dữ liệu cho WebPhuongDev
-- Bao gồm 4 bảng chính: site_config, projects, services, products
-- Kèm theo Seed Data mẫu bằng tiếng Việt
-- ==========================================================================

-- ===== BẢNG 1: site_config (Cấu hình chung của website) =====
CREATE TABLE IF NOT EXISTS site_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== BẢNG 2: projects (Dự án portfolio) =====
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  technologies TEXT[] NOT NULL DEFAULT '{}',
  github_url TEXT,
  demo_url TEXT,
  image_url TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== BẢNG 3: services (Dịch vụ phần mềm) =====
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_range TEXT,
  icon_name TEXT NOT NULL DEFAULT 'Code',
  features TEXT[] NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== BẢNG 4: products (Sản phẩm cửa hàng) =====
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC NOT NULL DEFAULT 0,
  download_url TEXT,
  image_url TEXT,
  category TEXT NOT NULL DEFAULT 'script',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== TRIGGER: Tự động cập nhật updated_at =====
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_site_config_updated_at
  BEFORE UPDATE ON site_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== ROW LEVEL SECURITY (RLS) =====
-- Bật RLS cho tất cả các bảng
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Chính sách SELECT công khai (cho trang public đọc dữ liệu)
CREATE POLICY "Cho phép đọc công khai site_config" ON site_config
  FOR SELECT USING (true);

CREATE POLICY "Cho phép đọc công khai projects" ON projects
  FOR SELECT USING (true);

CREATE POLICY "Cho phép đọc công khai services" ON services
  FOR SELECT USING (true);

CREATE POLICY "Cho phép đọc công khai products" ON products
  FOR SELECT USING (true);

-- Chính sách INSERT/UPDATE/DELETE chỉ cho user đã xác thực
CREATE POLICY "Chỉ admin được thêm site_config" ON site_config
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Chỉ admin được sửa site_config" ON site_config
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Chỉ admin được xoá site_config" ON site_config
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Chỉ admin được thêm projects" ON projects
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Chỉ admin được sửa projects" ON projects
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Chỉ admin được xoá projects" ON projects
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Chỉ admin được thêm services" ON services
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Chỉ admin được sửa services" ON services
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Chỉ admin được xoá services" ON services
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Chỉ admin được thêm products" ON products
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Chỉ admin được sửa products" ON products
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Chỉ admin được xoá products" ON products
  FOR DELETE TO authenticated USING (true);


-- ==========================================================================
-- SEED DATA MẪU (Tiếng Việt, thực tế)
-- ==========================================================================

-- --- Cấu hình website ---
INSERT INTO site_config (key, value) VALUES
  ('site_title', 'PhuongDev - Kỹ Sư Phần Mềm'),
  ('site_description', 'Website cá nhân của PhuongDev - Nơi chia sẻ dự án, dịch vụ và công cụ lập trình chuyên nghiệp.'),
  ('hero_greeting', 'Xin chào, mình là PhuongDev'),
  ('hero_subtitle', 'Kỹ sư phần mềm đam mê công nghệ, chuyên phát triển ứng dụng web và di động với các công nghệ hiện đại như Next.js, React, Java, Python và nhiều hơn nữa.'),
  ('email', 'contact@phuongdev.com'),
  ('github_url', 'https://github.com/phuongdev'),
  ('facebook_url', 'https://facebook.com/phuongdev'),
  ('discord_url', 'https://discord.gg/phuongdev'),
  ('youtube_url', 'https://youtube.com/@phuongdev'),
  ('about_content', 'Mình là một kỹ sư phần mềm trẻ, đam mê sáng tạo các giải pháp công nghệ. Với kinh nghiệm làm việc trên nhiều dự án từ web app, mobile app cho đến các hệ thống backend phức tạp, mình luôn tìm kiếm những thách thức mới để phát triển bản thân. Mình tin rằng công nghệ có thể thay đổi cuộc sống và mình muốn góp phần vào điều đó.'),
  ('skills', 'Java,Python,PHP,Next.js,React,TypeScript,Node.js,PostgreSQL,Docker,Git'),
  ('community_description', 'Tham gia cộng đồng PhuongDev để giao lưu, học hỏi và nhận hỗ trợ kỹ thuật từ các lập trình viên khác. Chúng ta cùng nhau phát triển và chia sẻ kiến thức.')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- --- Dự án mẫu ---
INSERT INTO projects (title, description, technologies, github_url, demo_url, is_featured, sort_order) VALUES
  (
    'GreenHabit-AI',
    'Ứng dụng theo dõi thói quen sống xanh sử dụng trí tuệ nhân tạo. GreenHabit-AI phân tích hành vi hàng ngày của người dùng và đưa ra gợi ý cá nhân hoá để giảm thiểu tác động môi trường. Tích hợp chat AI để tư vấn trực tiếp.',
    ARRAY['Next.js', 'Python', 'TensorFlow', 'PostgreSQL', 'Tailwind CSS'],
    'https://github.com/phuongdev/greenhabit-ai',
    'https://greenhabit-ai.vercel.app',
    TRUE,
    1
  ),
  (
    'Ngữ Văn Master',
    'Nền tảng học ngữ văn trực tuyến dành cho học sinh THPT. Hệ thống bao gồm ngân hàng đề thi, bài giảng video, và công cụ chấm bài tự luận tự động bằng AI. Hỗ trợ học sinh ôn thi hiệu quả với lộ trình cá nhân hoá.',
    ARRAY['React', 'Node.js', 'MongoDB', 'OpenAI API', 'Socket.io'],
    'https://github.com/phuongdev/nguvan-master',
    'https://nguvanmaster.vn',
    TRUE,
    2
  ),
  (
    'ServerCore Pro',
    'Hệ thống quản lý và giám sát server game đa nền tảng. Hỗ trợ quản lý người chơi, plugin, bản đồ và cấu hình server từ xa thông qua giao diện web hiện đại. Tích hợp cảnh báo thời gian thực qua Discord và Telegram.',
    ARRAY['Java', 'Spring Boot', 'React', 'WebSocket', 'Docker', 'Redis'],
    'https://github.com/phuongdev/servercore-pro',
    NULL,
    TRUE,
    3
  ),
  (
    'DevPortfolio Builder',
    'Công cụ tạo website portfolio tự động cho lập trình viên. Chỉ cần nhập thông tin cá nhân và dự án, hệ thống sẽ tự động tạo ra một trang web chuyên nghiệp với nhiều mẫu thiết kế đẹp mắt.',
    ARRAY['Next.js', 'TypeScript', 'Prisma', 'PostgreSQL', 'Vercel'],
    'https://github.com/phuongdev/devportfolio-builder',
    'https://devportfolio.phuongdev.com',
    FALSE,
    4
  ),
  (
    'ChatBot Framework',
    'Framework xây dựng chatbot đa nền tảng (Discord, Telegram, Facebook) với khả năng tuỳ biến cao. Hỗ trợ xử lý ngôn ngữ tự nhiên tiếng Việt và tích hợp các dịch vụ AI.',
    ARRAY['Python', 'FastAPI', 'Docker', 'NLP', 'Redis'],
    'https://github.com/phuongdev/chatbot-framework',
    NULL,
    FALSE,
    5
  );

-- --- Dịch vụ mẫu ---
INSERT INTO services (title, description, price_range, icon_name, features, sort_order) VALUES
  (
    'Thiết Kế & Phát Triển Website',
    'Thiết kế và phát triển website chuyên nghiệp từ landing page đơn giản đến hệ thống web phức tạp. Sử dụng các công nghệ hiện đại nhất đảm bảo tốc độ, bảo mật và trải nghiệm người dùng tuyệt vời.',
    'Từ 3.000.000 VND',
    'Globe',
    ARRAY['Thiết kế giao diện hiện đại, responsive', 'Tối ưu SEO và hiệu suất', 'Tích hợp hệ thống quản trị nội dung', 'Hỗ trợ bảo trì và cập nhật'],
    1
  ),
  (
    'Phát Triển Ứng Dụng Di Động',
    'Xây dựng ứng dụng di động đa nền tảng (iOS và Android) bằng React Native hoặc Flutter. Từ lên ý tưởng, thiết kế UI/UX cho đến xuất bản lên App Store và Google Play.',
    'Từ 10.000.000 VND',
    'Smartphone',
    ARRAY['Phát triển đa nền tảng iOS và Android', 'Thiết kế UI/UX chuyên nghiệp', 'Tích hợp API và dịch vụ backend', 'Hỗ trợ xuất bản và bảo trì'],
    2
  ),
  (
    'Tư Vấn Kiến Trúc Hệ Thống',
    'Tư vấn và thiết kế kiến trúc phần mềm cho doanh nghiệp. Phân tích yêu cầu, lựa chọn công nghệ phù hợp và xây dựng lộ trình phát triển sản phẩm hiệu quả.',
    'Từ 5.000.000 VND',
    'Network',
    ARRAY['Phân tích và thiết kế kiến trúc hệ thống', 'Lựa chọn công nghệ và công cụ phù hợp', 'Tối ưu hiệu suất và khả năng mở rộng', 'Đào tạo và chuyển giao công nghệ'],
    3
  ),
  (
    'Phát Triển Plugin & Script Game',
    'Lập trình plugin cho các server game (Minecraft, FiveM, Roblox) và các script tự động hoá. Tuỳ chỉnh theo yêu cầu cụ thể của từng dự án.',
    'Từ 1.000.000 VND',
    'Gamepad2',
    ARRAY['Plugin Minecraft (Spigot, Paper, BungeeCord)', 'Script FiveM và Roblox', 'Bot Discord tích hợp quản lý server', 'Cấu hình và tối ưu hiệu suất server'],
    4
  );

-- --- Sản phẩm cửa hàng mẫu ---
INSERT INTO products (title, description, price, download_url, category, is_active, sort_order) VALUES
  (
    'Script Kinh Tế Server Minecraft',
    'Hệ thống kinh tế đầy đủ cho server Minecraft bao gồm: cửa hàng NPC, đấu giá, giao dịch giữa người chơi, ngân hàng và nhiều tính năng hấp dẫn khác. Tương thích Paper 1.20+.',
    350000,
    NULL,
    'script',
    TRUE,
    1
  ),
  (
    'Template Portfolio Next.js Pro',
    'Mẫu website portfolio chuyên nghiệp xây dựng bằng Next.js 14, Tailwind CSS và Framer Motion. Bao gồm trang quản trị, hệ thống blog, và nhiều hiệu ứng động đẹp mắt. Sẵn sàng triển khai lên Vercel.',
    250000,
    NULL,
    'template',
    TRUE,
    2
  ),
  (
    'Bot Discord Quản Lý Server',
    'Bot Discord đa chức năng: quản lý thành viên, hệ thống cấp bậc, mini game, phát nhạc, chống spam và nhiều tính năng tuỳ chỉnh khác. Dễ dàng cài đặt và cấu hình.',
    200000,
    NULL,
    'bot',
    TRUE,
    3
  ),
  (
    'Hệ Thống Đăng Ký Tài Khoản Game',
    'Website đăng ký và quản lý tài khoản cho server game tự xây. Bao gồm: đăng ký, đăng nhập, đổi mật khẩu, xác minh email và quản lý thông tin người chơi. Tích hợp thanh toán trực tuyến.',
    500000,
    NULL,
    'script',
    TRUE,
    4
  ),
  (
    'Landing Page SaaS Starter Kit',
    'Bộ khởi tạo landing page cho sản phẩm SaaS với thiết kế hiện đại. Bao gồm các thành phần: Hero, Features, Pricing, Testimonials, FAQ và Contact form. Tối ưu chuyển đổi và SEO.',
    180000,
    NULL,
    'template',
    TRUE,
    5
  );
