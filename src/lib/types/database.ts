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

/** Sản phẩm cửa hàng (mã nguồn, script) */
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

export type CommunityInsert = Omit<Community, 'id' | 'created_at' | 'updated_at'>;
export type CommunityUpdate = Partial<CommunityInsert>;
