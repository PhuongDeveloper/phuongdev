'use client';

import { useCallback, useMemo, useState } from 'react';
import Image from 'next/image';
import { CheckCircle2, Coins, Download, Hammer, LoaderCircle, PackageCheck, RotateCcw, Server, Sparkles, Wifi } from 'lucide-react';

import Modal from '@/components/ui/Modal';
import { createClient } from '@/lib/supabase/client';
import type { NsoBuilderSettings, NsoBuildJob, NsoBuildVersion } from '@/lib/types/database';

type Props = { settings: NsoBuilderSettings; versions: NsoBuildVersion[] };

const statusMeta = {
  completed: { label: 'Sẵn sàng tải', note: 'File riêng của bạn đã hoàn tất.', className: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
} as const;

function price(value: number) {
  return value === 0 ? 'Miễn phí' : `${Number(value).toLocaleString('vi-VN')}đ`;
}

export default function NsoBuilderProduct({ settings, versions }: Props) {
  const activeVersions = useMemo(() => versions.filter((version) => version.is_active).sort((a, b) => a.sort_order - b.sort_order), [versions]);
  const [open, setOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState(activeVersions[0]?.code || '');
  const [serverName, setServerName] = useState('');
  const [serverHost, setServerHost] = useState('');
  const [serverPort, setServerPort] = useState(settings.default_port);
  const [jobs, setJobs] = useState<NsoBuildJob[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [failedImage, setFailedImage] = useState(false);
  const selected = activeVersions.find((version) => version.code === selectedCode) || activeVersions[0];

  const loadJobs = useCallback(async (quiet = false) => {
    if (!quiet) setLoadingJobs(true);
    try {
      const response = await fetch('/api/nso-builder/jobs', { cache: 'no-store' });
      if (response.status === 401) return;
      const data = await response.json();
      if (response.ok) setJobs(data.jobs || []);
    } finally {
      if (!quiet) setLoadingJobs(false);
    }
  }, []);

  const loadBalance = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('user_profiles').select('coin_balance').eq('id', user.id).maybeSingle();
    if (data) setBalance(Number(data.coin_balance));
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/nso-builder/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version_code: selected.code,
          server_name: serverName,
          server_host: serverHost,
          server_port: serverPort,
          idempotency_key: crypto.randomUUID(),
        }),
      });
      const data = await response.json();
      if (response.status === 401) {
        setError('Hãy đăng nhập để tiếp tục. Thông tin server vẫn được giữ lại.');
        document.getElementById('navbar-login-btn')?.click();
        return;
      }
      if (!response.ok) throw new Error(data.error || 'Không thể tạo file JAR.');
      setMessage(data.message || 'JAR đã được tạo xong và sẵn sàng tải.');
      await Promise.all([loadJobs(true), loadBalance()]);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Không thể tạo file JAR.');
    } finally {
      setSubmitting(false);
    }
  };

  const minPrice = activeVersions.length ? Math.min(...activeVersions.map((version) => Number(version.price))) : 0;
  const totalBuilt = versions.reduce((sum, version) => sum + Number(version.sold_count || 0), 0);
  const openBuilder = () => {
    setOpen(true);
    void loadJobs();
    void loadBalance();
  };

  return (
    <>
      <button type="button" onClick={openBuilder} className="group overflow-hidden rounded-2xl border border-rose-200 bg-white text-left transition duration-300 hover:-translate-y-1 hover:border-rose-300 hover:shadow-xl hover:shadow-rose-100">
        <div className="relative aspect-[16/10] overflow-hidden bg-[#171d29]">
          {settings.banner_url && !failedImage ? <Image src={settings.banner_url} alt={settings.title} fill className="object-cover opacity-80 transition duration-700 group-hover:scale-[1.04]" sizes="(max-width: 768px) 100vw, 33vw" onError={() => setFailedImage(true)} /> : <div className="absolute inset-0 bg-[radial-gradient(circle_at_26%_28%,rgba(244,63,94,.42),transparent_28%),linear-gradient(145deg,#171d29,#2d3444)]" />}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.045)_1px,transparent_1px)] bg-[size:22px_22px]" />
          <div className="absolute left-3 top-3 flex gap-2"><span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-900">Build game</span><span className="rounded-full bg-[#ed4c50] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">{settings.badge}</span></div>
          <div className="absolute inset-0 grid place-items-center"><div className="relative grid h-24 w-24 place-items-center rounded-[26px] border border-white/15 bg-white/10 text-white shadow-2xl backdrop-blur"><Hammer className="h-10 w-10" /><span className="absolute -bottom-2 -right-2 rounded-lg bg-rose-500 px-2 py-1 font-mono text-[10px] font-black">.JAR</span></div></div>
          <div className="absolute inset-x-4 bottom-3 flex items-center justify-between text-xs font-bold text-white"><span>{activeVersions.length} phiên bản sẵn sàng</span><span className="inline-flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" />Tạo theo yêu cầu</span></div>
        </div>
        <div className="p-5"><h3 className="line-clamp-1 text-lg font-black tracking-tight text-slate-950">{settings.title}</h3><p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">{settings.description}</p><div className="mt-5 flex items-end justify-between border-t border-slate-100 pt-4"><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Giá từ</p><p className="mt-0.5 text-xl font-black text-rose-600">{price(minPrice)}</p></div><div className="text-right"><span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Nhận build</span><p className="mt-1 text-[11px] text-slate-400">Đã tạo {totalBuilt.toLocaleString('vi-VN')} file</p></div></div></div>
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Đóng gói Ninja School cho server của bạn" size="xl">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <form onSubmit={submit} className="space-y-5">
            <div className="rounded-2xl bg-[#171d29] p-5 text-white"><div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-rose-500"><Hammer className="h-5 w-5" /></span><div><p className="font-black">{settings.title}</p><p className="mt-1 text-sm leading-5 text-white/55">{settings.content}</p></div></div><div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider text-white/45"><span className="rounded-lg border border-white/10 px-2.5 py-1.5">IP riêng</span><span className="rounded-lg border border-white/10 px-2.5 py-1.5">JAR riêng</span><span className="rounded-lg border border-white/10 px-2.5 py-1.5">Tạo tức thì</span></div></div>

            <fieldset><legend className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">1. Chọn phiên bản</legend><div className="mt-3 grid gap-3 sm:grid-cols-2">{activeVersions.map((version) => <button key={version.code} type="button" onClick={() => setSelectedCode(version.code)} className={`rounded-2xl border p-4 text-left transition ${selected?.code === version.code ? 'border-rose-400 bg-rose-50 ring-4 ring-rose-100' : 'border-slate-200 hover:border-slate-300'}`}><div className="flex items-start justify-between gap-3"><span className="rounded-lg bg-slate-900 px-2 py-1 font-mono text-[10px] font-black text-white">v{version.code}</span><span className="font-black text-rose-600">{price(version.price)}</span></div><p className="mt-3 text-sm font-black text-slate-900">{version.name}</p><p className="mt-1 text-xs leading-5 text-slate-500">{version.description}</p></button>)}</div></fieldset>

            <fieldset className="grid gap-4 sm:grid-cols-2"><legend className="col-span-full text-xs font-black uppercase tracking-[0.14em] text-slate-400">2. Thông tin kết nối</legend><label className="sm:col-span-2"><span className="text-xs font-bold text-slate-600">Tên server</span><div className="relative mt-1.5"><Server className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input required minLength={2} maxLength={40} value={serverName} onChange={(event) => setServerName(event.target.value)} placeholder="Ví dụ: Làng Lá" className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-100" /></div></label><label><span className="text-xs font-bold text-slate-600">IP hoặc tên miền</span><div className="relative mt-1.5"><Wifi className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input required value={serverHost} onChange={(event) => setServerHost(event.target.value)} placeholder="127.0.0.1" className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 font-mono text-sm outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-100" /></div></label><label><span className="text-xs font-bold text-slate-600">Port</span><input required type="number" min="1" max="65535" value={serverPort} onChange={(event) => setServerPort(Number(event.target.value))} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3.5 font-mono text-sm outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-100" /></label></fieldset>

            {balance !== null && <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm"><span className="inline-flex items-center gap-2 font-semibold text-slate-500"><Coins className="h-4 w-4" />Số dư hiện tại</span><b>{balance.toLocaleString('vi-VN')}đ</b></div>}
            {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
            {message && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p>}
            <button disabled={submitting || !selected} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#ed4c50] text-sm font-black text-white shadow-lg shadow-red-200 transition hover:bg-rose-600 disabled:opacity-60">{submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Hammer className="h-4 w-4" />}{submitting ? 'Đang tạo JAR...' : `Tạo ${selected?.name || 'JAR'} · ${price(selected?.price || 0)}`}</button>
          </form>

          <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"><div className="mb-4 flex items-center justify-between"><div><p className="font-black text-slate-900">File của bạn</p><p className="text-xs text-slate-400">File xuất hiện ngay sau khi tạo xong</p></div><button type="button" onClick={() => void loadJobs()} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500" aria-label="Làm mới"><RotateCcw className={`h-4 w-4 ${loadingJobs ? 'animate-spin' : ''}`} /></button></div><div className="space-y-3">{jobs.map((job) => { const meta = statusMeta[job.status]; const Icon = meta.icon; return <article key={job.id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-black">{job.output_name || `${job.server_name}_${job.version_code}.jar`}</p><p className="mt-1 truncate font-mono text-[10px] text-slate-400">{job.server_host}:{job.server_port}</p></div><span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${meta.className}`}><Icon className="h-3 w-3" />{meta.label}</span></div><div className="mt-3 border-t border-slate-100 pt-3"><p className="text-xs text-slate-500">{meta.note}</p><div className="mt-2 flex items-center justify-between text-[10px] text-slate-400"><span>{new Date(job.created_at).toLocaleString('vi-VN')}</span><a href={`/api/nso-builder/jobs/${job.id}/download`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-900 px-3 font-bold text-white"><Download className="h-3.5 w-3.5" />Tải JAR</a></div></div></article>; })}{!jobs.length && <div className="grid min-h-64 place-items-center text-center"><div><PackageCheck className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-600">Chưa có file JAR</p><p className="mt-1 text-xs text-slate-400">File mới sẽ xuất hiện ngay sau khi tạo.</p></div></div>}</div></section>
        </div>
      </Modal>
    </>
  );
}
