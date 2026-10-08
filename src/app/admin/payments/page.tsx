import type { Metadata } from 'next';

import PaymentSettingsClient from './PaymentSettingsClient';
import { getPaymentSettings } from '@/lib/payments/config';

export const metadata: Metadata = { title: 'Cấu hình thanh toán | Admin' };

export default async function AdminPaymentsPage() {
  const settings = await getPaymentSettings();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#ed4c50]">Payment settings</p>
        <h2 className="mt-1 text-3xl font-black tracking-[-0.04em] text-slate-950">Cấu hình thanh toán</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Cập nhật tài khoản nhận tiền và kết nối API ngân hàng. QR nạp ví, mua hàng và Ninja School sẽ dùng chung cấu hình này.</p>
      </header>
      <PaymentSettingsClient initialSettings={settings} />
    </div>
  );
}
