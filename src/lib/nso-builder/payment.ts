import 'server-only';

import { createNsoJar, createNsoJarBundle, safeJarFilePart } from './jar';
import { createAdminClient } from '@/lib/supabase/admin';

type PendingNsoPayment = {
  id: string;
  transaction_id: string;
  order_id: string;
  user_id: string;
  purchase_kind: 'jar' | 'access';
  version_code: string | null;
  output_kind: 'single' | 'clone_bundle' | null;
  offer_id: string | null;
  server_name: string;
  server_host: string;
  server_port: number;
  job_id: string;
  status: 'pending' | 'completed' | 'failed' | 'expired';
};

/**
 * Bàn giao một đơn NSO đã được ngân hàng xác nhận. Hàm idempotent: mọi lần gọi
 * dùng cùng job_id/output path và RPC cuối cùng khóa bản ghi thanh toán.
 */
export async function fulfillNsoPaymentOrder(transactionId: string) {
  const admin = createAdminClient();
  const { data: payment, error: paymentError } = await admin
    .from('nso_payment_orders')
    .select('id,transaction_id,order_id,user_id,purchase_kind,version_code,output_kind,offer_id,server_name,server_host,server_port,job_id,status')
    .eq('transaction_id', transactionId)
    .maybeSingle();

  if (paymentError) throw paymentError;
  if (!payment) return null;
  const pending = payment as PendingNsoPayment;

  if (pending.status === 'completed') {
    const { data: order } = await admin
      .from('orders')
      .select('id,product_title,variant_name,amount,delivery_data,user_id')
      .eq('id', pending.order_id)
      .single();
    return order ? { success: true, order_id: order.id, ...order } : { success: true, order_id: pending.order_id };
  }
  if (pending.status !== 'pending') {
    throw new Error('Đơn thanh toán Ninja School không còn hiệu lực.');
  }

  const { data: transaction } = await admin
    .from('transactions')
    .select('status')
    .eq('id', transactionId)
    .single();
  if (transaction?.status !== 'completed') return { success: false, pending: true };

  let outputPath: string | null = null;
  let outputName: string | null = null;
  let outputSize = 0;

  if (pending.purchase_kind === 'jar') {
    const { data: version, error: versionError } = await admin
      .from('nso_build_versions')
      .select('code,template_file')
      .eq('code', pending.version_code)
      .single();
    if (versionError || !version || !pending.version_code || !pending.output_kind) {
      throw new Error('Không tìm thấy JAR mẫu của đơn đã thanh toán.');
    }

    outputName = pending.output_kind === 'clone_bundle'
      ? `${safeJarFilePart(pending.server_name)}_${safeJarFilePart(pending.version_code)}_multi-tab.zip`
      : `${safeJarFilePart(pending.server_name)}_${safeJarFilePart(pending.version_code)}.jar`;
    outputPath = `${pending.user_id}/${pending.job_id}/${outputName}`;
    const serverData = `${pending.server_name}:${pending.server_host}:${pending.server_port}:0:0`;
    const { output } = pending.output_kind === 'clone_bundle'
      ? await createNsoJarBundle(pending.version_code, version.template_file, pending.server_name, serverData)
      : await createNsoJar(version.template_file, serverData);
    outputSize = output.length;

    const { error: uploadError } = await admin.storage.from('nso-builds').upload(outputPath, output, {
      contentType: pending.output_kind === 'clone_bundle' ? 'application/zip' : 'application/java-archive',
      cacheControl: '3600',
      upsert: true,
    });
    if (uploadError) throw uploadError;
  }

  const { data: result, error: finalizeError } = await admin.rpc('finalize_nso_bank_purchase', {
    p_transaction_id: transactionId,
    p_output_path: outputPath,
    p_output_name: outputName,
    p_output_size: outputSize,
  });
  if (finalizeError) throw finalizeError;
  if (!result?.success) throw new Error(result?.error || 'Không thể bàn giao đơn Ninja School.');
  return result;
}
