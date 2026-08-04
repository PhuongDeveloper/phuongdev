import { redirect } from 'next/navigation';

// Trang /login đã được gỡ bỏ.
// Admin đăng nhập qua modal trên Navbar như user thường.
// Nếu đã là admin thì vào /admin qua nút "Bảng Quản Trị" trên Navbar.
export default function LoginPage() {
  redirect('/');
}
