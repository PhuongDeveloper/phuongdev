import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

export const paymentConfig = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
};

export type PaymentSettings = {
  bankId: string;
  accountNumber: string;
  accountName: string;
  apiUrl: string;
};

const defaultPaymentSettings: PaymentSettings = {
  bankId: 'ACB',
  accountNumber: '28049351',
  accountName: 'TRAN MINH PHUONG',
  apiUrl: '',
};

export async function getPaymentSettings(): Promise<PaymentSettings> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('payment_settings')
      .select('bank_id, account_number, account_name, api_url')
      .eq('id', true)
      .maybeSingle();

    if (error || !data) return defaultPaymentSettings;
    return {
      bankId: data.bank_id || defaultPaymentSettings.bankId,
      accountNumber: data.account_number || defaultPaymentSettings.accountNumber,
      accountName: data.account_name || defaultPaymentSettings.accountName,
      apiUrl: data.api_url || '',
    };
  } catch {
    return defaultPaymentSettings;
  }
}

export function createVietQrUrl(amount: number, transactionCode: string, settings: PaymentSettings) {
  const query = new URLSearchParams({
    amount: String(amount),
    addInfo: transactionCode,
    accountName: settings.accountName,
  });

  return `https://img.vietqr.io/image/${encodeURIComponent(settings.bankId)}-${encodeURIComponent(settings.accountNumber)}-compact2.png?${query.toString()}`;
}

export function publicBankDetails(settings: PaymentSettings) {
  return {
    bank_id: settings.bankId,
    account_no: settings.accountNumber,
    account_name: settings.accountName,
  };
}
