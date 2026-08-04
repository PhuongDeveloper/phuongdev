import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

import { paymentConfig } from '@/lib/payments/config';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type SepayPayload = {
  id?: number | string;
  accountNumber?: string;
  code?: string | null;
  content?: string;
  description?: string;
  transferType?: 'in' | 'out' | string;
  transferAmount?: number | string;
  referenceCode?: string;
};

function secureEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function verifyWebhook(request: NextRequest, rawBody: string) {
  const signature = request.headers.get('x-sepay-signature');
  const timestamp = request.headers.get('x-sepay-timestamp');
  const hmacSecret = process.env.SEPAY_WEBHOOK_HMAC_SECRET;

  if (signature && timestamp && hmacSecret) {
    const timestampNumber = Number(timestamp);
    if (!Number.isFinite(timestampNumber) || Math.abs(Date.now() / 1000 - timestampNumber) > 300) {
      return false;
    }
    const digest = createHmac('sha256', hmacSecret)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex');
    return secureEqual(`sha256=${digest}`, signature);
  }

  const apiKey = process.env.SEPAY_WEBHOOK_SECRET;
  const authorization = request.headers.get('authorization') || '';
  return Boolean(apiKey && secureEqual(authorization, `Apikey ${apiKey}`));
}

async function sendInternalEmail(path: string, body: Record<string, unknown>) {
  const internalSecret = process.env.INTERNAL_API_SECRET;
  if (!internalSecret) return;

  await fetch(`${paymentConfig.appUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-secret': internalSecret },
    body: JSON.stringify(body),
  });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (!verifyWebhook(request, rawBody)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  let payload: SepayPayload;
  try {
    payload = JSON.parse(rawBody) as SepayPayload;
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 });
  }

  const providerId = String(payload.id ?? '').trim();
  const amount = Number(payload.transferAmount);
  const transferText = `${payload.code || ''} ${payload.content || ''} ${payload.description || ''}`;
  const code = transferText.match(/PD[A-Z0-9]{8,10}/i)?.[0]?.toUpperCase() || null;
  const admin = createAdminClient();

  if (!providerId || !Number.isSafeInteger(amount) || amount <= 0) {
    return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 });
  }

  const { error: eventError } = await admin.from('payment_events').insert({
    provider: 'sepay',
    provider_transaction_id: providerId,
    transaction_code: code,
    transfer_amount: amount,
    status: 'received',
    raw_payload: payload,
  });

  if (eventError?.code === '23505') {
    return NextResponse.json({ success: true });
  }
  if (eventError) {
    console.error('[SePay] Could not persist event', eventError);
    return NextResponse.json({ success: false }, { status: 500 });
  }

  const reject = async (reason: string, status: 'unmatched' | 'rejected' = 'rejected') => {
    await admin
      .from('payment_events')
      .update({ status, reason })
      .eq('provider', 'sepay')
      .eq('provider_transaction_id', providerId);
    return NextResponse.json({ success: true });
  };

  if (payload.transferType !== 'in') return reject('Giao dịch không phải tiền vào');
  if (payload.accountNumber && payload.accountNumber !== paymentConfig.accountNumber) {
    return reject('Sai tài khoản nhận');
  }
  if (!code) return reject('Không tìm thấy mã thanh toán', 'unmatched');

  const { data: transaction } = await admin
    .from('transactions')
    .select('id, user_id, amount, purpose, status, transaction_code')
    .eq('transaction_code', code)
    .maybeSingle();

  if (!transaction) return reject('Không tìm thấy giao dịch chờ đối soát', 'unmatched');
  if (Number(transaction.amount) !== amount) {
    return reject(`Sai số tiền: cần ${transaction.amount}, nhận ${amount}`);
  }

  const { data: result, error: rpcError } = await admin.rpc('complete_payment_transaction', {
    p_transaction_id: transaction.id,
    p_received_amount: amount,
    p_provider_transaction_id: providerId,
    p_bank_ref: payload.referenceCode || providerId,
    p_payload: payload,
  });

  if (rpcError) {
    console.error('[SePay] Completion RPC failed', rpcError);
    return NextResponse.json({ success: false }, { status: 500 });
  }

  if (result?.duplicate) return reject('Mã thanh toán đã được xử lý trước đó');
  if (!result?.success) return reject(result?.error || 'Không thể hoàn tất giao dịch');

  await admin
    .from('payment_events')
    .update({ status: 'matched', reason: null })
    .eq('provider', 'sepay')
    .eq('provider_transaction_id', providerId);

  const { data: profile } = await admin
    .from('user_profiles')
    .select('email, display_name, coin_balance')
    .eq('id', result.user_id)
    .single();

  if (profile?.email) {
    const emailPromise = result.purpose === 'order'
      ? sendInternalEmail('/api/email/send-delivery', {
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
        })
      : sendInternalEmail('/api/email/send-recharge', {
          email: profile.email,
          display_name: profile.display_name,
          amount,
          transaction_code: code,
          new_balance: profile.coin_balance,
        });

    emailPromise.catch((error) => console.error('[SePay] Email error', error));
  }

  // SePay considers exactly this success shape a successful delivery.
  return NextResponse.json({ success: true });
}
