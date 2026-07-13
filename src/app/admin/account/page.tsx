import { Metadata } from 'next';
import AccountClient from './AccountClient';

export const metadata: Metadata = {
  title: 'Tài Khoản | Admin PhuongDev',
  description: 'Quản lý tài khoản và bảo mật.',
};

export default function AdminAccountPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tài Khoản</h1>
        <p className="text-sm text-slate-500 mt-1">
          Đổi mật khẩu và quản lý bảo mật
        </p>
      </div>

      <AccountClient />
    </div>
  );
}
