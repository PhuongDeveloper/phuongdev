'use client';

import { useCallback, useMemo, useState } from 'react';
import Image from 'next/image';
import { Apple, CheckCircle2, Clock3, Coins, Download, ExternalLink, FileArchive, LoaderCircle, Monitor, PackageCheck, RotateCcw, Server, Smartphone, Wifi } from 'lucide-react';

import Modal from '@/components/ui/Modal';
import { createClient } from '@/lib/supabase/client';
import type { NsoBuilderSettings, NsoBuildJob, NsoBuildVersion, NsoPlatform, NsoPlatformChannel, NsoPlatformOffer, NsoServerAccess } from '@/lib/types/database';

type Props = {
  settings: NsoBuilderSettings;
  versions: NsoBuildVersion[];
  channels: NsoPlatformChannel[];
  offers: NsoPlatformOffer[];
};

type AccessHistory = NsoServerAccess & {
  channel: Pick<NsoPlatformChannel, 'id' | 'platform' | 'version_code' | 'name' | 'endpoint_slug' | 'download_url'> | null;
};

const platformMeta = {
  jar: { label: 'JAR', note: 'Tạo file riêng', icon: FileArchive },
  apk: { label: 'APK', note: 'Android', icon: Smartphone },
  pc: { label: 'PC', note: 'Máy tính', icon: Monitor },
  ios: { label: 'iOS', note: 'TestFlight', icon: Apple },
} satisfies Record<NsoPlatform, { label: string; note: string; icon: typeof FileArchive }>;

function price(value: number) {
  return value === 0 ? 'Miễn phí' : `${Number(value).toLocaleString('vi-VN')}đ`;
}

function accessIsExpired(access: AccessHistory, currentTime: number) {
  return Boolean(access.expires_at && new Date(access.expires_at).getTime() <= currentTime);
}

export default function NsoBuilderProduct({ settings, versions, channels, offers }: Props) {
  const activeVersions = useMemo(() => versions.filter((version) => version.is_active).sort((a, b) => a.sort_order - b.sort_order), [versions]);
  const activeChannels = useMemo(() => channels.filter((channel) => channel.is_active).sort((a, b) => a.sort_order - b.sort_order), [channels]);
  const activeOffers = useMemo(() => offers.filter((offer) => offer.is_active).sort((a, b) => a.sort_order - b.sort_order), [offers]);
  const availablePlatforms = useMemo(() => (Object.keys(platformMeta) as NsoPlatform[]).filter((item) => (
    item === 'jar'
      ? activeVersions.length > 0
      : activeChannels.some((channel) => channel.platform === item && activeOffers.some((offer) => offer.channel_id === channel.id))
  )), [activeChannels, activeOffers, activeVersions]);

  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<NsoPlatform>(availablePlatforms[0] || 'jar');
  const [selectedCode, setSelectedCode] = useState(activeVersions[0]?.code || '');
  const firstChannel = activeChannels.find((channel) => channel.platform === availablePlatforms.find((item) => item !== 'jar'));
  const [selectedChannelId, setSelectedChannelId] = useState(firstChannel?.id || '');
  const [selectedOfferId, setSelectedOfferId] = useState(activeOffers.find((offer) => offer.channel_id === firstChannel?.id)?.id || '');
  const [serverName, setServerName] = useState('');
  const [serverHost, setServerHost] = useState('');
  const [serverPort, setServerPort] = useState(settings.default_port);
  const [cloneBundle, setCloneBundle] = useState(false);
  const [jobs, setJobs] = useState<NsoBuildJob[]>([]);
  const [accesses, setAccesses] = useState<AccessHistory[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [failedImage, setFailedImage] = useState(false);
  const [renderedAt] = useState(() => Date.now());

  const selectedVersion = activeVersions.find((version) => version.code === selectedCode) || activeVersions[0];
  const platformChannels = activeChannels.filter((channel) => channel.platform === platform);
  const selectedChannel = platformChannels.find((channel) => channel.id === selectedChannelId) || platformChannels[0];
  const channelOffers = activeOffers.filter((offer) => offer.channel_id === selectedChannel?.id);
  const selectedOffer = channelOffers.find((offer) => offer.id === selectedOfferId) || channelOffers[0];
  const selectedPrice = platform === 'jar'
    ? Number(selectedVersion?.price || 0) + (cloneBundle ? Number(selectedVersion?.clone_bundle_price || 0) : 0)
    : Number(selectedOffer?.price || 0);

  const loadHistory = useCallback(async (quiet = false) => {
    if (!quiet) setLoadingHistory(true);
    try {
      const [jobsResponse, accessResponse] = await Promise.all([
        fetch('/api/nso-builder/jobs', { cache: 'no-store' }),
        fetch('/api/nso-builder/access', { cache: 'no-store' }),
      ]);
      if (jobsResponse.ok) setJobs((await jobsResponse.json()).jobs || []);
      if (accessResponse.ok) setAccesses((await accessResponse.json()).accesses || []);
    } finally {
      if (!quiet) setLoadingHistory(false);
    }
  }, []);

  const loadBalance = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('user_profiles').select('coin_balance').eq('id', user.id).maybeSingle();
    if (data) setBalance(Number(data.coin_balance));
  }, []);

  const selectPlatform = (nextPlatform: NsoPlatform) => {
    setPlatform(nextPlatform);
    setError('');
    setMessage('');
    setDownloadUrl('');
    if (nextPlatform === 'jar') return;
    const channel = activeChannels.find((item) => item.platform === nextPlatform);
    setSelectedChannelId(channel?.id || '');
    setSelectedOfferId(activeOffers.find((offer) => offer.channel_id === channel?.id)?.id || '');
  };

  const selectChannel = (channel: NsoPlatformChannel) => {
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
          ...(isJar ? {
            version_code: selectedVersion?.code,
            output_kind: cloneBundle ? 'clone_bundle' : 'single',
          } : { offer_id: selectedOffer?.id }),
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
      if (!response.ok) throw new Error(data.error || 'Không thể tạo bản tải.');
      setMessage(data.message || (isJar ? 'JAR đã sẵn sàng tải.' : 'Server đã được thêm vào bản tải.'));
      if (!isJar && data.download_url) {
        const nextDownloadUrl = String(data.download_url);
        setDownloadUrl(nextDownloadUrl);
        window.setTimeout(() => window.location.assign(nextDownloadUrl), 700);
      }
      await Promise.all([loadHistory(true), loadBalance()]);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Không thể tạo bản tải.');
    } finally {
      setSubmitting(false);
    }
  };

  const allPrices = [...activeVersions.map((version) => Number(version.price)), ...activeOffers.map((offer) => Number(offer.price))];
  const minPrice = allPrices.length ? Math.min(...allPrices) : 0;
  const totalBuilt = versions.reduce((sum, version) => sum + Number(version.sold_count || 0), 0);
  const openBuilder = () => {
    setOpen(true);
    void loadHistory();
    void loadBalance();
  };

  return (
    <>
      <button type="button" onClick={openBuilder} className="group overflow-hidden rounded-2xl border border-rose-200 bg-white text-left transition duration-300 hover:-translate-y-1 hover:border-rose-300 hover:shadow-xl hover:shadow-rose-100">
        <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
          {settings.banner_url && !failedImage ? (
            <Image src={settings.banner_url} alt={settings.title} fill className="object-contain transition duration-500 group-hover:scale-[1.015]" sizes="(max-width: 768px) 100vw, 33vw" onError={() => setFailedImage(true)} />
          ) : (
            <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(135deg,#171d29,#30394c)]"><FileArchive className="h-12 w-12 text-white/70" /></div>
          )}
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between gap-3"><span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">Build game</span><span className="text-[10px] font-black uppercase tracking-wide text-rose-500">{settings.badge}</span></div>
          <h3 className="mt-3 line-clamp-1 text-lg font-black tracking-tight text-slate-950">{settings.title}</h3>
          <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">{settings.description}</p>
          <div className="mt-5 flex items-end justify-between border-t border-slate-100 pt-4"><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Giá từ</p><p className="mt-0.5 text-xl font-black text-rose-600">{price(minPrice)}</p></div><div className="text-right"><span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Sẵn sàng</span><p className="mt-1 text-[11px] text-slate-400">Đã tạo {totalBuilt.toLocaleString('vi-VN')} bản</p></div></div>
        </div>
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Tạo client Ninja School" size="xl">
        <div className="mb-6 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-1.5">
          <div className="grid min-w-[520px] grid-cols-4 gap-1.5">
            {(Object.keys(platformMeta) as NsoPlatform[]).map((item) => {
              const meta = platformMeta[item];
              const Icon = meta.icon;
              const available = availablePlatforms.includes(item);
              return <button key={item} type="button" disabled={!available} onClick={() => selectPlatform(item)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left transition ${platform === item ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35'}`}><Icon className="h-4 w-4 shrink-0" /><span><b className="block text-xs">{meta.label}</b><span className={`block text-[10px] ${platform === item ? 'text-white/50' : 'text-slate-400'}`}>{available ? meta.note : 'Chưa mở'}</span></span></button>;
            })}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.08fr_.92fr]">
          <form onSubmit={submit} className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-sm font-black text-slate-900">{platform === 'jar' ? 'File JAR riêng cho server' : `Thêm server vào bản ${platformMeta[platform].label}`}</p><p className="mt-1 text-xs leading-5 text-slate-500">{platform === 'jar' ? settings.content : 'Client đã build sẵn sẽ đọc danh sách server từ endpoint TXT. Sau khi thanh toán, bạn nhận link tải do quản trị viên cấu hình.'}</p></div>

            {platform === 'jar' ? (
              <div className="space-y-4">
                <fieldset><legend className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Chọn phiên bản</legend><div className="mt-3 grid gap-3 sm:grid-cols-2">{activeVersions.map((version) => <button key={version.code} type="button" onClick={() => setSelectedCode(version.code)} className={`rounded-2xl border p-4 text-left transition ${selectedVersion?.code === version.code ? 'border-rose-400 bg-rose-50 ring-4 ring-rose-100' : 'border-slate-200 hover:border-slate-300'}`}><div className="flex items-start justify-between gap-3"><span className="rounded-lg bg-slate-900 px-2 py-1 font-mono text-[10px] font-black text-white">v{version.code}</span><span className="font-black text-rose-600">{price(version.price)}</span></div><p className="mt-3 text-sm font-black text-slate-900">{version.name}</p><p className="mt-1 text-xs leading-5 text-slate-500">{version.description}</p></button>)}</div></fieldset>
                <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${cloneBundle ? 'border-violet-400 bg-violet-50 ring-4 ring-violet-100' : 'border-slate-200 bg-white hover:border-violet-200'}`}>
                  <input type="checkbox" checked={cloneBundle} onChange={(event) => setCloneBundle(event.target.checked)} className="mt-1 h-4 w-4 accent-violet-600" />
                  <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-3"><b className="text-sm text-slate-900">Bộ nhân bản nhiều tab</b><b className="text-sm text-violet-700">{Number(selectedVersion?.clone_bundle_price || 0) === 0 ? 'Không phụ phí' : `+${price(Number(selectedVersion?.clone_bundle_price))}`}</b></span><span className="mt-1 block text-xs leading-5 text-slate-500">Nhận một file ZIP gồm đủ 5 bản JAR: x1, x3, x6, x12 và x24. Mỗi tab có vùng static và dữ liệu RecordStore tách riêng.</span></span>
                </label>
              </div>
            ) : (
              <>
                <fieldset><legend className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Chọn phiên bản</legend><div className="mt-3 grid gap-3 sm:grid-cols-2">{platformChannels.map((channel) => <button key={channel.id} type="button" onClick={() => selectChannel(channel)} className={`rounded-2xl border p-4 text-left transition ${selectedChannel?.id === channel.id ? 'border-rose-400 bg-rose-50 ring-4 ring-rose-100' : 'border-slate-200 hover:border-slate-300'}`}><span className="font-mono text-[10px] font-black uppercase text-rose-500">{channel.endpoint_slug}</span><p className="mt-2 text-sm font-black text-slate-900">{channel.name}</p><p className="mt-1 text-xs leading-5 text-slate-500">{channel.description}</p></button>)}</div></fieldset>
                <fieldset><legend className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Chọn gói sử dụng</legend><div className="mt-3 grid gap-2 sm:grid-cols-3">{channelOffers.map((offer) => <button key={offer.id} type="button" onClick={() => setSelectedOfferId(offer.id)} className={`rounded-xl border px-3 py-3 text-left transition ${selectedOffer?.id === offer.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white hover:border-slate-400'}`}><span className="block text-xs font-black">{offer.name}</span><span className={`mt-1 block text-[11px] font-bold ${selectedOffer?.id === offer.id ? 'text-rose-300' : 'text-rose-500'}`}>{price(offer.price)}</span></button>)}</div></fieldset>
              </>
            )}

            <fieldset className="grid gap-4 sm:grid-cols-2"><legend className="col-span-full text-xs font-black uppercase tracking-[0.14em] text-slate-400">Thông tin kết nối</legend><label className="sm:col-span-2"><span className="text-xs font-bold text-slate-600">Tên server</span><div className="relative mt-1.5"><Server className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input required minLength={2} maxLength={40} value={serverName} onChange={(event) => setServerName(event.target.value)} placeholder="Ví dụ: NsoX" className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-100" /></div></label><label><span className="text-xs font-bold text-slate-600">IP hoặc tên miền</span><div className="relative mt-1.5"><Wifi className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input required value={serverHost} onChange={(event) => setServerHost(event.target.value)} placeholder="127.0.0.1" className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 font-mono text-sm outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-100" /></div></label><label><span className="text-xs font-bold text-slate-600">Port</span><input required type="number" min="1" max="65535" value={serverPort} onChange={(event) => setServerPort(Number(event.target.value))} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3.5 font-mono text-sm outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-100" /></label></fieldset>

            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm"><span className="inline-flex items-center gap-2 font-semibold text-slate-500"><Coins className="h-4 w-4" />{balance === null ? 'Giá thanh toán' : `Số dư ${balance.toLocaleString('vi-VN')}đ`}</span><b className="text-rose-600">{price(selectedPrice)}</b></div>
            {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
            {message && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p>}
            {downloadUrl && <a href={downloadUrl} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-black text-emerald-700"><ExternalLink className="h-4 w-4" />Mở link tải</a>}
            <button disabled={submitting || (platform === 'jar' ? !selectedVersion : !selectedOffer)} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#ed4c50] text-sm font-black text-white shadow-lg shadow-red-200 transition hover:bg-rose-600 disabled:opacity-60">{submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : platform === 'jar' ? <FileArchive className="h-4 w-4" /> : <Download className="h-4 w-4" />}{submitting ? 'Đang xử lý...' : platform === 'jar' ? `${cloneBundle ? 'Tạo bộ 5 JAR' : 'Tạo JAR'} · ${price(selectedPrice)}` : `Thêm server & nhận bản tải · ${price(selectedPrice)}`}</button>
          </form>

          <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="mb-4 flex items-center justify-between"><div><p className="font-black text-slate-900">Bản đã tạo</p><p className="text-xs text-slate-400">JAR và quyền truy cập của tài khoản</p></div><button type="button" onClick={() => void loadHistory()} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500" aria-label="Làm mới"><RotateCcw className={`h-4 w-4 ${loadingHistory ? 'animate-spin' : ''}`} /></button></div>
            <div className="max-h-[620px] space-y-3 overflow-y-auto pr-1">
              {jobs.map((job) => <article key={job.id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-black">{job.output_name || `${job.server_name}_${job.version_code}.jar`}</p><p className="mt-1 truncate font-mono text-[10px] text-slate-400">{job.server_host}:{job.server_port}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${job.output_kind === 'clone_bundle' ? 'bg-violet-50 text-violet-700' : 'bg-emerald-50 text-emerald-700'}`}>{job.output_kind === 'clone_bundle' ? '5 JAR · ZIP' : 'JAR'}</span></div><div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] text-slate-400"><span>{new Date(job.created_at).toLocaleString('vi-VN')}</span><a href={`/api/nso-builder/jobs/${job.id}/download`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-900 px-3 font-bold text-white"><Download className="h-3.5 w-3.5" />{job.output_kind === 'clone_bundle' ? 'Tải ZIP' : 'Tải JAR'}</a></div></article>)}
              {accesses.map((access) => {
                const expired = accessIsExpired(access, renderedAt);
                const available = access.status === 'active' && !expired;
                return <article key={access.id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-black">{access.server_name} · {access.channel?.name || access.channel_id}</p><p className="mt-1 truncate font-mono text-[10px] text-slate-400">{access.server_host}:{access.server_port}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${available ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-500'}`}>{access.channel?.platform.toUpperCase() || 'CLIENT'}</span></div><div className="mt-3 border-t border-slate-100 pt-3"><p className="flex items-center gap-1.5 text-[10px] text-slate-500">{access.expires_at ? <Clock3 className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}{access.status === 'revoked' ? 'Đã tạm dừng' : expired ? 'Đã hết hạn' : access.expires_at ? `Hết hạn ${new Date(access.expires_at).toLocaleString('vi-VN')}` : 'Quyền vĩnh viễn'}</p>{available && access.channel?.download_url && <a href={access.channel.download_url} className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-[10px] font-bold text-white"><ExternalLink className="h-3.5 w-3.5" />Mở bản tải</a>}</div></article>;
              })}
              {!jobs.length && !accesses.length && <div className="grid min-h-64 place-items-center text-center"><div><PackageCheck className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-600">Chưa có bản nào</p><p className="mt-1 text-xs text-slate-400">Bản mới sẽ xuất hiện tại đây.</p></div></div>}
            </div>
          </section>
        </div>
      </Modal>
    </>
  );
}
