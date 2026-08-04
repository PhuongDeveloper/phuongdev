/* ==========================================================================
   Định nghĩa TypeScript Types cho cơ sở dữ liệu Supabase
   Mỗi bảng trong database đều có interface tương ứng
   ========================================================================== */

/** Cấu hình chung của website (key-value) */
export interface SiteConfig {
  key: string;
  value: string;
  updated_at: string;
}

/** Dự án trong portfolio */
export interface Project {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  github_url: string | null;
  demo_url: string | null;
  image_url: string | null;
  is_featured: boolean;
  sort_order: number;
  views: number;
  created_at: string;
  updated_at: string;
}

/** Dịch vụ phần mềm */
export interface Service {
  id: string;
  title: string;
  slug: string;
  description: string;
  content: string;
  price_range: string | null;
  icon_name: string;
  image_url: string | null;
  features: string[];
  redirect_url: string | null;
  sort_order: number;
  views: number;
  created_at: string;
  updated_at: string;
}

/** Danh mục sản phẩm/bài viết */
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** Sản phẩm cửa hàng (mã nguồn, script, tool) */
export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  content: string;
  price: number;
  download_url: string | null;
  demo_url: string | null;
  image_url: string | null;
  category: string;
  is_active: boolean;
  has_key: boolean;              // Tool có dạng key bản quyền
  delivery_intro: string | null; // Lời cảm ơn tùy chỉnh (2-5 dòng) gửi trong email
  delivery_note: string | null;  // Hướng dẫn sử dụng chi tiết (Markdown)
  sort_order: number;
  views: number;
  created_at: string;
  updated_at: string;
}

/** Bài viết Blog công nghệ */
export interface Blog {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  cover_image: string | null;
  author: string;
  tags: string[];
  is_published: boolean;
  published_at: string | null;
  views: number;
  created_at: string;
  updated_at: string;
}

/** Cộng đồng */
export interface Community {
  id: string;
  name: string;
  description: string;
  url: string;
  image_url: string | null;
  button_text: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** Hồ sơ người dùng (mở rộng Supabase Auth) */
export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  coin_balance: number;       // 1 coin = 1 VND
  total_spent: number;        // Tổng đã chi
  total_recharged: number;    // Tổng đã nạp
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

/** Giao dịch nạp tiền */
export interface Transaction {
  id: string;
  user_id: string;
  amount: number;             // Số tiền VND
  coin_amount: number;        // Số coin được cộng (= amount)
  status: 'pending' | 'completed' | 'failed' | 'expired';
  transaction_code: string;   // Mã nội dung chuyển khoản
  payment_method: string;
  bank_ref: string | null;
  sepay_data: Record<string, unknown> | null;
  expires_at: string | null;
  completed_at: string | null;
  created_at: string;
}

/** Key bản quyền sản phẩm */
export interface ProductKey {
  id: string;
  product_id: string;
  key_value: string;
  key_type: 'trial' | 'permanent';
  is_used: boolean;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
}

/** Đơn hàng */
export interface Order {
  id: string;
  user_id: string;
  product_id: string;
  product_title: string;
  amount: number;
  payment_method: 'coin' | 'bank_qr' | 'free_trial';
  status: 'pending' | 'completed' | 'failed';
  key_id: string | null;
  key_value: string | null;
  transaction_id: string | null;
  email_sent: boolean;
  completed_at: string | null;
  created_at: string;
}

/* ---------- Kiểu dữ liệu cho form (thêm/sửa) ---------- */

export type SiteConfigInsert = Omit<SiteConfig, 'updated_at'>;
export type SiteConfigUpdate = Partial<SiteConfigInsert>;

export type ProjectInsert = Omit<Project, 'id' | 'created_at' | 'updated_at' | 'views'> & { views?: number };
export type ProjectUpdate = Partial<ProjectInsert>;

export type ServiceInsert = Omit<Service, 'id' | 'created_at' | 'updated_at' | 'views'> & { views?: number };
export type ServiceUpdate = Partial<ServiceInsert>;

export type CategoryInsert = Omit<Category, 'id' | 'created_at' | 'updated_at'>;
export type CategoryUpdate = Partial<CategoryInsert>;

export type ProductInsert = Omit<Product, 'id' | 'created_at' | 'updated_at' | 'views'> & { views?: number };
export type ProductUpdate = Partial<ProductInsert>;

export type BlogInsert = Omit<Blog, 'id' | 'created_at' | 'updated_at' | 'views'> & { views?: number };
export type BlogUpdate = Partial<BlogInsert>;

export type CommunityInsert = Omit<Community, 'id' | 'created_at' | 'updated_at'>;
export type CommunityUpdate = Partial<CommunityInsert>;

export type OrderInsert = Omit<Order, 'id' | 'created_at'>;
export type TransactionInsert = Omit<Transaction, 'id' | 'created_at'>;
export type ProductKeyInsert = Omit<ProductKey, 'id' | 'created_at'>;
