'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ManualApproveButton({ transactionId }: { transactionId: string }) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [error, setError] = useState('');

  const approve = async () => {
    if (state !== 'idle') return;
    if (!window.confirm('Đã kiểm tra sao kê và xác nhận đúng số tiền giao dịch này?')) return;
    const bankRef = window.prompt('Mã tham chiếu ngân hàng (có thể bỏ trống):', '')?.trim() || '';
    setState('loading');
    setError('');
    try {
      const response = await fetch('/api/admin/transactions/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_id: transactionId, bank_ref: bankRef }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Không thể duyệt giao dịch.');
      setState('done');
      router.refresh();
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : 'Không thể duyệt giao dịch.');
      setState('idle');
    }
  };

  return (
    <div className="flex items-center gap-2">
      {error && <span className="max-w-56 text-right text-[10px] text-red-600">{error}</span>}
      <button type="button" onClick={approve} disabled={state !== 'idle'} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60">
        {state === 'loading' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : state === 'done' ? <Check className="h-3.5 w-3.5" /> : null}
        {state === 'done' ? 'Đã duyệt' : 'Duyệt thủ công'}
      </button>
    </div>
  );
}
