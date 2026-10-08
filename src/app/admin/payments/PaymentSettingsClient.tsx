'use client';

import { useState } from 'react';
import { Building2, Check, CircleAlert, CircleCheck, LoaderCircle, Save, Wifi } from 'lucide-react';

type PaymentSettingsForm = { bankId: string; accountNumber: string; accountName: string; apiUrl: string };
type Props = { initialSettings: PaymentSettingsForm };
type Notice = { kind: 'success' | 'error'; text: string } | null;

const inputClass = 'mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#ed4c50] focus:ring-4 focus:ring-rose-100';

export default function PaymentSettingsClient({ initialSettings }: Props) {
  const [settings, setSettings] = useState<PaymentSettingsForm>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const update = (key: keyof PaymentSettingsForm, value: string) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setNotice(null);
  };

  const testConnection = async () => {
    setTesting(true);
    setNotice(null);
    try {
      const response = await fetch('/api/admin/payment-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_url: settings.apiUrl }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Không kiểm tra được kết nối.');
      setNotice({ kind: 'success', text: `Kết nối thành công · API trả về ${result.transaction_count} giao dịch.` });
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Không kiểm tra được kết nối.' });
    } finally {
      setTesting(false);
    }
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch('/api/admin/payment-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bank_id: settings.bankId,
          account_number: settings.accountNumber,
          account_name: settings.accountName,
          api_url: settings.apiUrl,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Không lưu được cấu hình.');
      setNotice({ kind: 'success', text: 'Đã lưu cấu hình thanh toán.' });
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Không lưu được cấu hình.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
      <form onSubmit={save} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-[#ed4c50]"><Building2 className="h-5 w-5" /></span>
          <div><h3 className="font-black text-slate-900">Tài khoản nhận tiền</h3><p className="mt-0.5 text-xs text-slate-400">Thông tin được in trên mã QR chuyển khoản.</p></div>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <label className="text-xs font-bold text-slate-600">Mã ngân hàng
            <input className={inputClass} value={settings.bankId} onChange={(event) => update('bankId', event.target.value)} placeholder="ACB" autoComplete="off" required />
            <span className="mt-1.5 block font-normal leading-5 text-slate-400">Mã ngân hàng dùng cho VietQR, ví dụ ACB.</span>
          </label>
          <label className="text-xs font-bold text-slate-600">Số tài khoản
            <input className={inputClass} inputMode="numeric" value={settings.accountNumber} onChange={(event) => update('accountNumber', event.target.value)} placeholder="28049351" autoComplete="off" required />
          </label>
          <label className="text-xs font-bold text-slate-600 sm:col-span-2">Tên chủ tài khoản
            <input className={inputClass} value={settings.accountName} onChange={(event) => update('accountName', event.target.value)} placeholder="Tên trên tài khoản ngân hàng" autoComplete="off" required />
          </label>
          <div className="sm:col-span-2">
            <label htmlFor="acb-api-url" className="text-xs font-bold text-slate-600">URL API lịch sử giao dịch ACB</label>
            <input id="acb-api-url" type="url" className={inputClass} value={settings.apiUrl} onChange={(event) => update('apiUrl', event.target.value)} placeholder="https://.../historyapiacb/..." autoComplete="off" spellCheck={false} />
            <p className="mt-1.5 text-xs font-normal leading-5 text-slate-400">Dán URL đầy đủ do dịch vụ API cấp, gồm token nếu dịch vụ đặt token trong URL. URL chỉ được dùng phía máy chủ.</p>
          </div>
          {notice && (
            <div role="status" aria-live="polite" className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm sm:col-span-2 ${notice.kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
              {notice.kind === 'success' ? <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" /> : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />}
              <span>{notice.text}</span>
            </div>
          )}
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={testConnection} disabled={testing || saving || !settings.apiUrl.trim()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-50">
              {testing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
              {testing ? 'Đang kiểm tra…' : 'Kiểm tra kết nối'}
            </button>
            <button type="submit" disabled={saving || testing} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#ed4c50] px-5 text-sm font-black text-white shadow-sm shadow-rose-200 transition hover:bg-[#d93e43] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Đang lưu…' : 'Lưu cấu hình'}
            </button>
          </div>
        </div>
      </form>

      <aside className="relative overflow-hidden rounded-2xl bg-[#111721] p-5 text-white shadow-sm sm:p-6">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full border border-white/[0.06]" />
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full border border-white/[0.08]" />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white/70"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Cấu hình đang sửa</span>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.08] text-rose-300"><Building2 className="h-5 w-5" /></span>
          </div>
          <p className="mt-9 text-[10px] font-black uppercase tracking-[0.18em] text-white/40">Tài khoản nhận chuyển khoản</p>
          <p className="mt-2 break-all font-mono text-3xl font-black tracking-[-0.04em] sm:text-4xl">{settings.accountNumber || '••••••••'}</p>
          <p className="mt-3 text-sm font-bold text-white/80">{settings.accountName || 'Tên chủ tài khoản'}</p>
          <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-xs">
            <span className="text-white/40">Ngân hàng</span><span className="font-black tracking-wide">{settings.bankId || '—'}</span>
          </div>
          <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.04] p-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-white/75"><Check className="h-3.5 w-3.5 text-emerald-400" /> Áp dụng cho mọi mã QR</div>
            <p className="mt-1.5 text-[11px] leading-5 text-white/40">Thông tin mới có hiệu lực với các giao dịch được tạo sau khi lưu.</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
