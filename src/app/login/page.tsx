/* ==========================================================================
   Trang Đăng Nhập (/login) - Client Component
   ========================================================================== */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import FormInput from '@/components/ui/FormInput';
import Button from '@/components/ui/Button';
import { Lock, LogIn } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Đăng nhập fix cứng theo yêu cầu
      if (username === 'phuongdev' && password === '@PhuongDev0501') {
        // Lưu cookie đăng nhập 
        document.cookie = "admin_auth=phuongdev; path=/; max-age=86400"; // 1 ngày
        
        // Đăng nhập thành công, chuyển hướng đến Admin Dashboard
        router.push('/admin');
        router.refresh();
      } else {
        throw new Error('Tài khoản hoặc mật khẩu không chính xác!');
      }
    } catch (err: any) {
      setError(err.message || 'Đăng nhập thất bại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900">
            Đăng Nhập Quản Trị
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Vui lòng nhập tài khoản để truy cập CMS.
          </p>
        </div>

        <Card padding="lg" variant="solid" className="mt-8">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
               <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
                {error}
              </div>
            )}

            <FormInput
              id="username"
              label="Tài khoản"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập tài khoản..."
            />

            <FormInput
              id="password"
              label="Mật khẩu"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            <div>
              <Button
                type="submit"
                className="w-full"
                isLoading={isLoading}
                icon={<LogIn className="w-4 h-4" />}
              >
                Đăng Nhập
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
