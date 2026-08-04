import 'server-only';

export const paymentConfig = {
  bankId: process.env.PAYMENT_BANK_ID || 'BIDV',
  accountNumber: process.env.PAYMENT_ACCOUNT_NUMBER || '8811430066',
  accountName: process.env.PAYMENT_ACCOUNT_NAME || 'TRAN MINH PHUONG',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
};

export function createVietQrUrl(amount: number, transactionCode: string) {
  const { bankId, accountNumber, accountName } = paymentConfig;
  const query = new URLSearchParams({
    amount: String(amount),
    addInfo: transactionCode,
    accountName,
  });

  return `https://img.vietqr.io/image/${bankId}-${accountNumber}-compact2.png?${query.toString()}`;
}

export function publicBankDetails() {
  return {
    bank_id: paymentConfig.bankId,
    account_no: paymentConfig.accountNumber,
    account_name: paymentConfig.accountName,
  };
}

