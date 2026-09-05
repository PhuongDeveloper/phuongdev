import { paymentConfig } from './config';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type ZaloPayTransaction = {
  transactionID: string;
  amount: number;
  description: string;
  transactionDate: string;
  type: 'IN' | 'OUT';
};

type SieuthiCodeResponse = {
  status: string;
  msg: string;
  transactions: ZaloPayTransaction[];
};

// Lưu thời điểm sync cuối cùng trong memory để tránh gọi API quá nhiều lần (Rate Limit)
let lastSyncTime = 0;
let isSyncing = false;
const MIN_SYNC_INTERVAL_MS = 2000;
let lastCleanupTime = 0;
let isCleaningUp = false;
const PAYMENT_EVENT_RETENTION_MS = 5 * 60 * 60 * 1000;

/** Xóa các webhook lỗi cũ; sự kiện đã khớp vẫn được giữ để đối soát lịch sử. */
export async function cleanupStalePaymentEvents() {
  const now = Date.now();
  if (isCleaningUp || now - lastCleanupTime < 10 * 60 * 1000) return;
  isCleaningUp = true;
  lastCleanupTime = now;
  try {
    const cutoff = new Date(now - PAYMENT_EVENT_RETENTION_MS).toISOString();
    const admin = createAdminClient();
    const { error } = await admin
      .from('payment_events')
      .delete()
      .in('status', ['rejected', 'unmatched'])
      .lt('created_at', cutoff);
    if (error) console.error('[ZaloPay] Cleanup payment events failed:', error);
  } finally {
    isCleaningUp = false;
  }
}

async function sendInternalEmail(path: string, body: Record<string, unknown>) {
  const internalSecret = process.env.INTERNAL_API_SECRET;
  if (!internalSecret) return;

  await fetch(`${paymentConfig.appUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-secret': internalSecret },
    body: JSON.stringify(body),
  }).catch((err) => console.error('[ZaloPay] Email error:', err));
}

export async function syncZaloPayTransactions() {
  const now = Date.now();
  // Giới hạn gọi API nhưng vẫn cho phép trạng thái mới được nhận gần như tức thời.
  if (now - lastSyncTime < MIN_SYNC_INTERVAL_MS || isSyncing) {
    return;
  }
  
  isSyncing = true;
  lastSyncTime = now;

  try {
    await cleanupStalePaymentEvents();
    const apiUrl = process.env.ZALOPAY_API_URL || 'https://sieuthicode.com/historyapizalopayv3/PZCE43-TD7PVE-P416-9516-QFS7';
    const response = await fetch(apiUrl, { cache: 'no-store' });
    
    if (!response.ok) {
      console.error('[ZaloPay] Lỗi HTTP khi gọi API:', response.status);
      return;
    }

    const data: SieuthiCodeResponse = await response.json();
    if (data.status !== 'success' || !Array.isArray(data.transactions)) {
      console.error('[ZaloPay] Lỗi từ API:', data.msg);
      return;
    }

    const admin = createAdminClient();

    // Duyệt qua danh sách giao dịch
    for (const txn of data.transactions) {
      // Chỉ quan tâm giao dịch tiền VÀO hoặc có chứa mã PD
      // Đôi khi test bằng tài khoản cá nhân có thể là OUT, nên ta ưu tiên check mã PD
      const description = String(txn.description || '').toUpperCase();
      const codeMatch = description.match(/PD[A-Z0-9]{8,10}/i);
      const code = codeMatch ? codeMatch[0].toUpperCase() : null;
      const amount = Number(txn.amount);
      const providerId = String(txn.transactionID);

      if (!providerId || !Number.isSafeInteger(amount) || amount <= 0) continue;

      // 1. Lưu vào payment_events để lưu vết
      const { error: eventError } = await admin.from('payment_events').insert({
        provider: 'zalopay',
        provider_transaction_id: providerId,
        transaction_code: code,
        transfer_amount: amount,
        status: 'received',
        raw_payload: txn,
      });

      // Nếu mã lỗi 23505 (Unique violation) nghĩa là giao dịch này đã được xử lý rồi, bỏ qua
      if (eventError?.code === '23505') {
        continue;
      }
      
      if (eventError) {
        console.error('[ZaloPay] Could not persist event', eventError);
        continue;
      }

      if (!code) {
        await admin.from('payment_events').update({ status: 'unmatched', reason: 'Không tìm thấy mã thanh toán' }).eq('provider', 'zalopay').eq('provider_transaction_id', providerId);
        continue;
      }

      // 2. Tìm giao dịch đang chờ (pending) trong bảng transactions
      const { data: transaction } = await admin
        .from('transactions')
        .select('id, user_id, amount, purpose, status, transaction_code')
        .eq('transaction_code', code)
        .maybeSingle();

      if (!transaction) {
        await admin.from('payment_events').update({ status: 'unmatched', reason: 'Không tìm thấy giao dịch chờ đối soát' }).eq('provider', 'zalopay').eq('provider_transaction_id', providerId);
        continue;
      }

      if (Number(transaction.amount) !== amount) {
        await admin.from('payment_events').update({ status: 'rejected', reason: `Sai số tiền: cần ${transaction.amount}, nhận ${amount}` }).eq('provider', 'zalopay').eq('provider_transaction_id', providerId);
        continue;
      }

      // 3. Khớp nối và hoàn tất giao dịch
      const { data: result, error: rpcError } = await admin.rpc('complete_payment_transaction', {
        p_transaction_id: transaction.id,
        p_received_amount: amount,
        p_provider_transaction_id: providerId,
        p_bank_ref: providerId,
        p_payload: txn,
      });

      if (rpcError) {
        console.error('[ZaloPay] Completion RPC failed', rpcError);
        continue;
      }

      if (result?.duplicate || !result?.success) {
        await admin.from('payment_events').update({ status: 'rejected', reason: result?.error || 'Không thể hoàn tất giao dịch' }).eq('provider', 'zalopay').eq('provider_transaction_id', providerId);
        continue;
      }

      // 4. Đánh dấu thành công trong payment_events
      await admin
        .from('payment_events')
        .update({ status: 'matched', reason: null })
        .eq('provider', 'zalopay')
        .eq('provider_transaction_id', providerId);

      // 5. Gửi email thông báo
      const { data: profile } = await admin
        .from('user_profiles')
        .select('email, display_name, coin_balance')
        .eq('id', result.user_id)
        .single();

      if (profile?.email) {
        if (result.purpose === 'order') {
          await sendInternalEmail('/api/email/send-delivery', {
            email: profile.email,
            display_name: profile.display_name,
            product_title: result.product_title,
            variant_name: result.variant_name,
            key_value: result.key_value,
            delivery_data: result.delivery_data,
            download_url: result.download_url,
            delivery_intro: result.delivery_intro,
            delivery_note: result.delivery_note,
            order_id: result.order_id,
            amount: result.amount,
            payment_method: 'bank_qr',
          });
        } else {
          await sendInternalEmail('/api/email/send-recharge', {
            email: profile.email,
            display_name: profile.display_name,
            amount,
            transaction_code: code,
            new_balance: profile.coin_balance,
          });
        }
      }
    }
  } catch (error) {
    console.error('[ZaloPay] Sync error:', error);
  } finally {
    isSyncing = false;
  }
}
