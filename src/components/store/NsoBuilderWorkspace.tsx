'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Apple, Check, Coins, Download, ExternalLink, FileArchive, History, LoaderCircle, Monitor, PackageOpen, RefreshCcw, Server, Smartphone, Wifi } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import type { NsoBuilderSettings, NsoBuildJob, NsoBuildVersion, NsoPlatform, NsoPlatformChannel, NsoPlatformOffer, NsoServerAccess } from '@/lib/types/database';

type Props = {
  settings: NsoBuilderSettings;
  versions: NsoBuildVersion[];
  channels: NsoPlatformChannel[];
  offers: NsoPlatformOffer[];
};

type AccessHistory = NsoServerAccess & {
  channel: Pick<NsoPlatformChannel, 'id' | 'platform' | 'version_code' | 'name' | 'download_url'> | null;
};

const platformMeta = {
  jar: { label: 'JAR', icon: FileArchive },
  apk: { label: 'APK', icon: Smartphone },
  pc: { label: 'PC', icon: Monitor },
  ios: { label: 'iOS', icon: Apple },
} satisfies Record<NsoPlatform, { label: string; icon: typeof FileArchive }>;

const inputClass = 'mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-rose-300 focus:ring-4 focus:ring-rose-100';

function formatPrice(value: number) {
  return value === 0 ? 'Miễn phí' : `${value.toLocaleString('vi-VN')}đ`;
}

export default function NsoBuilderWorkspace({ settings, versions, channels, offers }: Props) {
  const activeVersions = useMemo(() => versions.filter((item) => item.is_active).sort((a, b) => a.sort_order - b.sort_order), [versions]);
  const activeChannels = useMemo(() => channels.filter((item) => item.is_active).sort((a, b) => a.sort_order - b.sort_order), [channels]);
  const activeOffers = useMemo(() => offers.filter((item) => item.is_active).sort((a, b) => a.sort_order - b.sort_order), [offers]);
  const availablePlatforms = useMemo(() => (Object.keys(platformMeta) as NsoPlatform[]).filter((item) => item === 'jar'
    ? activeVersions.length > 0
    : activeChannels.some((channel) => channel.platform === item && activeOffers.some((offer) => offer.channel_id === channel.id))), [activeChannels, activeOffers, activeVersions]);

  const [platform, setPlatform] = useState<NsoPlatform>(availablePlatforms[0] || 'jar');
  const [selectedCode, setSelectedCode] = useState(activeVersions[0]?.code || '');
  const firstClientChannel = activeChannels.find((channel) => channel.platform === availablePlatforms.find((item) => item !== 'jar'));
  const [selectedChannelId, setSelectedChannelId] = useState(firstClientChannel?.id || '');
  const [selectedOfferId, setSelectedOfferId] = useState(activeOffers.find((offer) => offer.channel_id === firstClientChannel?.id)?.id || '');
  const [cloneBundle, setCloneBundle] = useState(false);
  const [serverName, setServerName] = useState('');
  const [serverHost, setServerHost] = useState('');
  const [serverPort, setServerPort] = useState(settings.default_port);
  const [jobs, setJobs] = useState<NsoBuildJob[]>([]);
  const [accesses, setAccesses] = useState<AccessHistory[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');

  const selectedVersion = activeVersions.find((item) => item.code === selectedCode) || activeVersions[0];
  const platformChannels = activeChannels.filter((item) => item.platform === platform);
  const selectedChannel = platformChannels.find((item) => item.id === selectedChannelId) || platformChannels[0];
  const channelOffers = activeOffers.filter((item) => item.channel_id === selectedChannel?.id);
  const selectedOffer = channelOffers.find((item) => item.id === selectedOfferId) || channelOffers[0];
  const selectedPrice = platform === 'jar'
    ? Number(selectedVersion?.price || 0) + (cloneBundle ? Number(selectedVersion?.clone_bundle_price || 0) : 0)
    : Number(selectedOffer?.price || 0);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const [jobResponse, accessResponse] = await Promise.all([
        fetch('/api/nso-builder/jobs', { cache: 'no-store' }),
        fetch('/api/nso-builder/access', { cache: 'no-store' }),
      ]);
      if (jobResponse.ok) setJobs((await jobResponse.json()).jobs || []);
      if (accessResponse.ok) setAccesses((await accessResponse.json()).accesses || []);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const loadBalance = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('user_profiles').select('coin_balance').eq('id', user.id).maybeSingle();
    if (data) setBalance(Number(data.coin_balance));
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadHistory();
      void loadBalance();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadBalance, loadHistory]);

  const choosePlatform = (next: NsoPlatform) => {
    setPlatform(next);
    setError('');
    setMessage('');
    setDownloadUrl('');
    if (next === 'jar') return;
    const channel = activeChannels.find((item) => item.platform === next);
    setSelectedChannelId(channel?.id || '');
    setSelectedOfferId(activeOffers.find((offer) => offer.channel_id === channel?.id)?.id || '');
  };

  const chooseChannel = (channel: NsoPlatformChannel) => {
    setSelectedChannelId(channel.id);
    setSelectedOfferId(activeOffers.find((offer) => offer.channel_id === channel.id)?.id || '');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (platform === 'jar' && !selectedVersion) return;
    if (platform !== 'jar' && (!selectedChannel || !selectedOffer)) return;
    setSubmitting(true);
    setError('');
    setMessage('');
    setDownloadUrl('');
    try {
      const isJar = platform === 'jar';
      const response = await fetch(isJar ? '/api/nso-builder/jobs' : '/api/nso-builder/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isJar ? { version_code: selectedVersion?.code, output_kind: cloneBundle ? 'clone_bundle' : 'single' } : { offer_id: selectedOffer?.id }),
          server_name: serverName,
          server_host: serverHost,
          server_port: serverPort,
          idempotency_key: crypto.randomUUID(),
        }),
      });
      const data = await response.json();
      if (response.status === 401) {
        setError('Đăng nhập để tiếp tục.');
        document.getElementById('navbar-login-btn')?.click();
        return;
      }
      if (!response.ok) throw new Error(data.error || 'Không thể tạo bản tải.');
      setMessage(data.message || 'Đã tạo xong.');
      if (isJar && data.job_id) setDownloadUrl(`/api/nso-builder/jobs/${data.job_id}/download`);
      if (!isJar && data.download_url) setDownloadUrl(String(data.download_url));
      await Promise.all([loadHistory(), loadBalance()]);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Không thể tạo bản tải.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectionName = platform === 'jar'
    ? `${selectedVersion?.name || 'JAR'} · ${cloneBundle ? 'Bộ 5 bản' : 'x1'}`
    : `${selectedChannel?.name || platformMeta[platform].label} · ${selectedOffer?.name || ''}`;
  const historyCount = jobs.length + accesses.length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-2 rounded-2xl border border-rose-100 bg-white p-2 shadow-sm">
        {(Object.keys(platformMeta) as NsoPlatform[]).map((item) => {
          const meta = platformMeta[item];
          const Icon = meta.icon;
          const available = availablePlatforms.includes(item);
          return (
            <button key={item} type="button" disabled={!available} onClick={() => choosePlatform(item)} className={`flex h-14 items-center justify-center gap-2 rounded-xl border text-sm font-black transition ${platform === item ? 'border-rose-300 bg-rose-50 text-rose-600 shadow-sm' : 'border-transparent text-slate-400 hover:bg-rose-50/60 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-35'}`}>
              <Icon className="h-4 w-4" />{meta.label}
            </button>
          );
        })}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <form id="nso-builder-form" onSubmit={submit} className="space-y-7 rounded-3xl border border-rose-100 bg-white p-5 shadow-sm sm:p-7">
          {platform === 'jar' ? (
            <>
              <section>
                <h2 className="text-sm font-black text-slate-800">Phiên bản JAR</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {activeVersions.map((version) => (
                    <button key={version.code} type="button" onClick={() => setSelectedCode(version.code)} className={`rounded-2xl border p-4 text-left transition ${selectedVersion?.code === version.code ? 'border-rose-300 bg-rose-50 ring-2 ring-rose-100' : 'border-slate-200 hover:border-rose-200'}`}>
                      <span className="flex items-center justify-between gap-3"><b className="text-sm text-slate-800">{version.name}</b><span className="text-sm font-black text-rose-600">{formatPrice(Number(version.price))}</span></span>
                      <span className="mt-1 block text-xs text-slate-400">v{version.code}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="text-sm font-black text-slate-800">Gói file</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={() => setCloneBundle(false)} className={`rounded-2xl border p-4 text-left transition ${!cloneBundle ? 'border-rose-300 bg-rose-50 ring-2 ring-rose-100' : 'border-slate-200 hover:border-rose-200'}`}>
                    <span className="flex items-center justify-between"><b className="text-sm text-slate-800">JAR x1</b>{!cloneBundle && <Check className="h-4 w-4 text-rose-500" />}</span>
                    <span className="mt-2 block text-xs text-slate-400">Một file, tải ngay</span>
                  </button>
                  <button type="button" onClick={() => setCloneBundle(true)} className={`rounded-2xl border p-4 text-left transition ${cloneBundle ? 'border-rose-300 bg-rose-50 ring-2 ring-rose-100' : 'border-slate-200 hover:border-rose-200'}`}>
                    <span className="flex items-center justify-between"><b className="text-sm text-slate-800">Bộ 5 JAR</b><span className="text-xs font-black text-rose-600">+{Number(selectedVersion?.clone_bundle_price || 0).toLocaleString('vi-VN')}đ</span></span>
                    <span className="mt-3 flex flex-wrap gap-1.5">{[1, 3, 6, 12, 24].map((count) => <span key={count} className="rounded-md border border-rose-200 bg-white px-2 py-1 font-mono text-[10px] font-black text-rose-500">x{count}</span>)}</span>
                  </button>
                </div>
              </section>
            </>
          ) : (
            <>
              <section>
                <h2 className="text-sm font-black text-slate-800">Phiên bản {platformMeta[platform].label}</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {platformChannels.map((channel) => <button key={channel.id} type="button" onClick={() => chooseChannel(channel)} className={`rounded-2xl border p-4 text-left transition ${selectedChannel?.id === channel.id ? 'border-rose-300 bg-rose-50 ring-2 ring-rose-100' : 'border-slate-200 hover:border-rose-200'}`}><b className="text-sm text-slate-800">{channel.name}</b><span className="mt-1 block font-mono text-[10px] text-slate-400">/{channel.endpoint_slug}</span></button>)}
                </div>
              </section>
              <section>
                <h2 className="text-sm font-black text-slate-800">Thời hạn</h2>
                <div className="mt-3 flex flex-wrap gap-2">{channelOffers.map((offer) => <button key={offer.id} type="button" onClick={() => setSelectedOfferId(offer.id)} className={`rounded-xl border px-4 py-3 text-left transition ${selectedOffer?.id === offer.id ? 'border-rose-300 bg-rose-50 text-rose-600' : 'border-slate-200 bg-white text-slate-600 hover:border-rose-200'}`}><b className="block text-xs">{offer.name}</b><span className="mt-1 block text-[11px] font-bold">{formatPrice(Number(offer.price))}</span></button>)}</div>
              </section>
            </>
          )}

          <section className="border-t border-rose-100 pt-6">
            <h2 className="text-sm font-black text-slate-800">Thông tin server</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className="text-xs font-bold text-slate-500">Tên server</span><div className="relative"><Server className="absolute left-4 top-1/2 mt-0.5 h-4 w-4 -translate-y-1/2 text-rose-300" /><input required minLength={2} maxLength={40} value={serverName} onChange={(event) => setServerName(event.target.value)} placeholder="Ví dụ: NsoX" className={`${inputClass} pl-11`} /></div></label>
              <label><span className="text-xs font-bold text-slate-500">IP hoặc tên miền</span><div className="relative"><Wifi className="absolute left-4 top-1/2 mt-0.5 h-4 w-4 -translate-y-1/2 text-rose-300" /><input required value={serverHost} onChange={(event) => setServerHost(event.target.value)} placeholder="127.0.0.1" className={`${inputClass} pl-11 font-mono`} /></div></label>
              <label><span className="text-xs font-bold text-slate-500">Port</span><input required type="number" min="1" max="65535" value={serverPort} onChange={(event) => setServerPort(Number(event.target.value))} className={`${inputClass} font-mono`} /></label>
            </div>
          </section>
        </form>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="rounded-3xl border border-rose-200 bg-white p-5 shadow-[0_18px_50px_rgba(237,76,80,.10)]">
            <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-rose-500"><PackageOpen className="h-5 w-5" /></span><div><p className="text-xs text-slate-400">Đang chọn</p><p className="text-sm font-black text-slate-800">{selectionName}</p></div></div>
            <div className="my-5 border-t border-dashed border-rose-200" />
            <div className="space-y-3 text-sm"><div className="flex justify-between gap-3"><span className="text-slate-400">Server</span><b className="max-w-48 truncate text-slate-700">{serverName || 'Chưa nhập'}</b></div><div className="flex justify-between gap-3"><span className="text-slate-400">Kết nối</span><b className="max-w-48 truncate font-mono text-xs text-slate-600">{serverHost || '—'}:{serverPort}</b></div>{balance !== null && <div className="flex justify-between gap-3"><span className="text-slate-400">Số dư</span><b className="text-slate-700">{balance.toLocaleString('vi-VN')}đ</b></div>}</div>
            <div className="mt-5 flex items-end justify-between rounded-2xl bg-rose-50 px-4 py-3"><span className="text-xs font-bold text-rose-400">Thanh toán</span><strong className="text-xl font-black text-rose-600">{formatPrice(selectedPrice)}</strong></div>
            {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-xs font-bold text-red-600">{error}</p>}
            {message && <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-700">{message}</p>}
            {downloadUrl ? <a href={downloadUrl} className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white text-sm font-black text-rose-600 hover:bg-rose-50"><Download className="h-4 w-4" />Tải ngay</a> : null}
            <button form="nso-builder-form" disabled={submitting || (platform === 'jar' ? !selectedVersion : !selectedOffer)} className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#ed4c50] text-sm font-black text-white shadow-lg shadow-rose-200 transition hover:bg-rose-600 disabled:opacity-60">{submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}{submitting ? 'Đang tạo...' : platform === 'jar' ? cloneBundle ? 'Tạo bộ 5 JAR' : 'Tạo JAR' : 'Thêm server'}</button>
          </div>
        </aside>
      </div>

      <section className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 text-rose-500"><History className="h-4 w-4" /></span><div><h2 className="text-sm font-black text-slate-800">Bản đã tạo</h2><p className="text-xs text-slate-400">{historyCount ? `${historyCount} bản trong tài khoản` : 'Chưa có bản nào'}</p></div></div><button type="button" onClick={() => void loadHistory()} className="grid h-9 w-9 place-items-center rounded-xl border border-rose-100 text-rose-400 hover:bg-rose-50" aria-label="Làm mới"><RefreshCcw className={`h-4 w-4 ${loadingHistory ? 'animate-spin' : ''}`} /></button></div>
        {historyCount ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {jobs.map((job) => <article key={job.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-black text-slate-800">{job.server_name}</p><p className="mt-1 truncate font-mono text-[10px] text-slate-400">{job.output_name}</p></div><span className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-500">{job.output_kind === 'clone_bundle' ? '5 JAR' : 'JAR'}</span></div><a href={`/api/nso-builder/jobs/${job.id}/download`} className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-white px-3 text-xs font-black text-rose-600 ring-1 ring-rose-100 hover:bg-rose-50"><Download className="h-3.5 w-3.5" />Tải file</a></article>)}
            {accesses.map((access) => <article key={access.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-black text-slate-800">{access.server_name}</p><p className="mt-1 truncate text-[10px] text-slate-400">{access.channel?.name || access.channel_id}</p></div><span className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-black uppercase text-rose-500">{access.channel?.platform || 'client'}</span></div>{access.status === 'active' && access.channel?.download_url && <a href={access.channel.download_url} className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-white px-3 text-xs font-black text-rose-600 ring-1 ring-rose-100 hover:bg-rose-50"><ExternalLink className="h-3.5 w-3.5" />Mở bản tải</a>}</article>)}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-rose-200 bg-rose-50/40 px-4 py-8 text-center text-sm text-slate-400">Bản mới sẽ xuất hiện tại đây sau khi tạo.</div>
        )}
      </section>
    </div>
  );
}
