import { paymentConfig } from './config';
import { fulfillNsoPaymentOrder } from '@/lib/nso-builder/payment';
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
let lastRechargeCleanupTime = 0;
let isCleaningRecharge = false;

/** Mốc thời gian để giới hạn danh sách giao dịch cần duyệt thủ công. */
export function getRechargeManualReviewCutoff() {
  return Date.now() - PAYMENT_EVENT_RETENTION_MS;
}

function parseProviderTransactionTime(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value < 10_000_000_000 ? value * 1000 : value;
  }
  if (typeof value !== 'string' || !value.trim()) return null;

  const text = value.trim();
  // API hiện chỉ trả YYYY-MM-DD cho một số giao dịch. Dùng cuối ngày Việt Nam
  // để cảnh báo của giao dịch hôm nay không biến mất sớm chỉ vì thiếu giờ.
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const timestamp = Date.parse(`${text}T23:59:59+07:00`);
    return Number.isNaN(timestamp) ? null : timestamp;
  }
  const vietnameseDate = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (vietnameseDate) {
    const [, day, month, year, hour = '0', minute = '0', second = '0'] = vietnameseDate;
    const timestamp = Date.parse(
      `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute}:${second}+07:00`,
    );
    return Number.isNaN(timestamp) ? null : timestamp;
  }

  const sqlDate = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  const timestamp = Date.parse(sqlDate
    ? `${sqlDate[1]}-${sqlDate[2]}-${sqlDate[3]}T${sqlDate[4]}:${sqlDate[5]}:${sqlDate[6] || '00'}+07:00`
    : text);
  return Number.isNaN(timestamp) ? null : timestamp;
}

type PaymentEventAge = {
  created_at?: string | null;
  raw_payload?: { transactionDate?: unknown } | null;
};

/** Dùng ngày giao dịch từ nhà cung cấp, tránh webhook cũ bị coi là mới khi API phát lại. */
export function isPaymentEventWithinReviewWindow(event: PaymentEventAge, now = Date.now()) {
  const createdTime = event.created_at ? Date.parse(event.created_at) : Number.NaN;
  const providerDate = event.raw_payload?.transactionDate;
  const dateOnly = typeof providerDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(providerDate.trim())
    ? providerDate.trim()
    : null;
  // Nếu sự kiện được ghi nhận đúng ngày giao dịch thì created_at là mốc chính
  // xác hơn. Nếu API phát lại vào ngày khác, phải dùng ngày gốc để chặn bản cũ.
  const createdVietnamDate = Number.isNaN(createdTime)
    ? null
    : new Date(createdTime + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const providerTime = dateOnly && dateOnly === createdVietnamDate
    ? createdTime
    : parseProviderTransactionTime(providerDate);
  const eventTime = providerTime ?? (Number.isNaN(createdTime) ? now : createdTime);
  return eventTime >= now - PAYMENT_EVENT_RETENTION_MS;
}

/** Xóa webhook lỗi cũ theo ngày giao dịch gốc; sự kiện đã khớp vẫn được giữ. */
export async function cleanupStalePaymentEvents() {
  const now = Date.now();
  if (isCleaningUp || now - lastCleanupTime < 10 * 60 * 1000) return;
  isCleaningUp = true;
  lastCleanupTime = now;
  try {
    const admin = createAdminClient();
    const { data: candidates, error: readError } = await admin
      .from('payment_events')
      .select('id, created_at, raw_payload')
      .in('status', ['rejected', 'unmatched'])
      .order('created_at', { ascending: true })
      .limit(1000);
    if (readError) {
      console.error('[ZaloPay] Read payment events for cleanup failed:', readError);
      return;
    }
    const staleIds = (candidates || [])
      .filter((event) => !isPaymentEventWithinReviewWindow(event, now))
      .map((event) => event.id);
    if (staleIds.length > 0) {
      const { error } = await admin.from('payment_events').delete().in('id', staleIds);
      if (error) console.error('[ZaloPay] Cleanup payment events failed:', error);
    }
  } finally {
    isCleaningUp = false;
  }
}

/** Đóng các giao dịch nạp bị bỏ quên quá lâu để không nằm mãi trong hàng chờ. */
export async function cleanupStaleRechargeTransactions() {
  const now = Date.now();
  if (isCleaningRecharge || now - lastRechargeCleanupTime < 10 * 60 * 1000) return;
  isCleaningRecharge = true;
  lastRechargeCleanupTime = now;
  try {
    const cutoff = new Date(now - PAYMENT_EVENT_RETENTION_MS).toISOString();
    const admin = createAdminClient();
    const { error } = await admin
      .from('transactions')
      .update({ status: 'expired' })
      .eq('purpose', 'recharge')
      .eq('status', 'pending')
      .lt('created_at', cutoff);
    if (error) console.error('[ZaloPay] Cleanup stale recharge transactions failed:', error);
  } finally {
    isCleaningRecharge = false;
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
    await cleanupStaleRechargeTransactions();
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
      // API lịch sử thường phát lại giao dịch cũ. Không lưu lại các bản ghi đã
      // quá cửa sổ kiểm tra, nếu không cảnh báo vừa xóa sẽ xuất hiện trở lại.
      if (!isPaymentEventWithinReviewWindow({ raw_payload: txn }, now)) continue;

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
      let deliveryResult = result;
      let skipDeliveryEmail = false;
      if (result.purpose === 'order') {
        try {
          const nsoResult = await fulfillNsoPaymentOrder(transaction.id);
          if (nsoResult) deliveryResult = { ...result, ...nsoResult, purpose: 'order' };
        } catch (fulfillmentError) {
          // Tiền đã được xác nhận; không đánh dấu giao dịch lỗi. payment/status
          // sẽ thử bàn giao lại và email chỉ được gửi khi đã có file/link tải.
          console.error('[ZaloPay] NSO fulfillment failed', fulfillmentError);
          skipDeliveryEmail = true;
        }
      }

      const { data: profile } = await admin
        .from('user_profiles')
        .select('email, display_name, coin_balance')
        .eq('id', result.user_id)
        .single();

      if (profile?.email && !skipDeliveryEmail) {
        if (deliveryResult.purpose === 'order') {
          const downloadUrl = typeof deliveryResult.download_url === 'string' && deliveryResult.download_url.startsWith('/')
            ? `${paymentConfig.appUrl}${deliveryResult.download_url}`
            : deliveryResult.download_url;
          await sendInternalEmail('/api/email/send-delivery', {
            email: profile.email,
            display_name: profile.display_name,
            product_title: deliveryResult.product_title,
            variant_name: deliveryResult.variant_name,
            key_value: deliveryResult.key_value,
            delivery_data: deliveryResult.delivery_data,
            download_url: downloadUrl,
            delivery_intro: deliveryResult.delivery_intro,
            delivery_note: deliveryResult.delivery_note,
            order_id: deliveryResult.order_id,
            amount: deliveryResult.amount,
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
