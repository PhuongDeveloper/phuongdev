/* ==========================================================================
   Các hàm tiện ích dùng chung trong dự án
   ========================================================================== */

/**
 * Format số tiền theo định dạng tiền tệ Việt Nam (VND)
 * @param amount - Số tiền cần format
 * @returns Chuỗi đã format (ví dụ: "150.000 VND")
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format ngày tháng năm
 */
export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(dateString));
}

/**
 * Rút gọn văn bản nếu vượt quá độ dài tối đa
 * @param text - Văn bản gốc
 * @param maxLength - Độ dài tối đa (mặc định 150 ký tự)
 * @returns Văn bản đã rút gọn với dấu "..."
 */
export function truncateText(text: string, maxLength: number = 150): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '...';
}

/**
 * Tạo slug từ chuỗi tiếng Việt (loại bỏ dấu và ký tự đặc biệt)
 * @param text - Chuỗi gốc
 * @returns Slug URL-friendly
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Tạo class names từ các điều kiện (tương tự thư viện clsx)
 * @param classes - Các class name hoặc điều kiện
 * @returns Chuỗi class đã gộp
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
