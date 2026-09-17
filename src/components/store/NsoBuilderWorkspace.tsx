'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { Clock3, Download, ExternalLink, LoaderCircle, QrCode, RefreshCcw, RefreshCw, X } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import type { NsoBuilderSettings, NsoBuildJob, NsoBuildVersion, NsoPlatform, NsoPlatformOffer, NsoServerAccess, NsoStoreChannel } from '@/lib/types/database';

type Props = {
  settings: NsoBuilderSettings;
  versions: NsoBuildVersion[];
  channels: NsoStoreChannel[];
  offers: NsoPlatformOffer[];
};

type AccessHistory = NsoServerAccess & {
  channel: Pick<NsoStoreChannel, 'id' | 'platform' | 'version_code' | 'name' | 'download_url'> | null;
};

type QrData = {
  qr_url: string;
  transaction_code: string;
  transaction_id: string;
  amount: number;
  expires_at: string;
};

const platformMeta = {
  jar: { label: 'JAR' },
  apk: { label: 'APK' },
  pc: { label: 'PC' },
  ios: { label: 'iOS' },
} satisfies Record<NsoPlatform, { label: string }>;

const inputClass = 'mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100';

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
  const [qrData, setQrData] = useState<QrData | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const checkingPaymentRef = useRef(false);

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

  useEffect(() => {
    if (!qrData) return;
    const tick = () => setCountdown(Math.max(0, Math.floor((new Date(qrData.expires_at).getTime() - Date.now()) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [qrData]);

  const choosePlatform = (next: NsoPlatform) => {
    setPlatform(next);
    setError('');
    setMessage('');
    setDownloadUrl('');
    setQrData(null);
    if (next === 'jar') return;
    const channel = activeChannels.find((item) => item.platform === next);
    setSelectedChannelId(channel?.id || '');
    setSelectedOfferId(activeOffers.find((offer) => offer.channel_id === channel?.id)?.id || '');
  };

  const chooseChannel = (channel: NsoStoreChannel) => {
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

  const startQrPayment = async () => {
    const form = document.getElementById('nso-builder-form') as HTMLFormElement | null;
    if (!form?.reportValidity()) return;
    if (platform === 'jar' && !selectedVersion) return;
    if (platform !== 'jar' && (!selectedChannel || !selectedOffer)) return;
    if (selectedPrice <= 0) return;

    setSubmitting(true);
    setError('');
    setMessage('');
    setDownloadUrl('');
    try {
      const response = await fetch('/api/nso-builder/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchase_kind: platform === 'jar' ? 'jar' : 'access',
          ...(platform === 'jar'
            ? { version_code: selectedVersion?.code, output_kind: cloneBundle ? 'clone_bundle' : 'single' }
            : { offer_id: selectedOffer?.id }),
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
      if (!response.ok) throw new Error(data.error || 'Không thể tạo mã QR.');
      setQrData(data as QrData);
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : 'Không thể tạo mã QR.');
    } finally {
      setSubmitting(false);
    }
  };

  const checkPayment = useCallback(async () => {
    if (!qrData || checkingPaymentRef.current) return;
    checkingPaymentRef.current = true;
    setCheckingPayment(true);
    try {
      const response = await fetch(`/api/payment/status?transaction_id=${encodeURIComponent(qrData.transaction_id)}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không thể kiểm tra thanh toán.');
      if (data.status === 'expired') {
        setQrData(null);
        setError('Mã QR đã hết hạn. Vui lòng tạo mã mới.');
        return;
      }
      if (data.status !== 'completed') return;
      if (data.fulfillment_error) {
        setMessage(data.fulfillment_error);
        return;
      }
      const delivery = Array.isArray(data.order?.delivery_data) ? data.order.delivery_data : [];
      const deliveredUrl = delivery.find((item: { download_url?: unknown }) => typeof item.download_url === 'string')?.download_url;
      if (!deliveredUrl) {
        setMessage('Đã nhận thanh toán, hệ thống đang chuẩn bị file...');
        return;
      }
      setDownloadUrl(String(deliveredUrl));
      setMessage('Thanh toán thành công. File của bạn đã sẵn sàng.');
      setQrData(null);
      await Promise.all([loadHistory(), loadBalance()]);
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : 'Không thể kiểm tra thanh toán.');
    } finally {
      checkingPaymentRef.current = false;
      setCheckingPayment(false);
    }
  }, [loadBalance, loadHistory, qrData]);

  useEffect(() => {
    if (!qrData) return;
    const initial = window.setTimeout(() => { void checkPayment(); }, 0);
    const timer = window.setInterval(() => { void checkPayment(); }, 2000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [checkPayment, qrData]);

  const selectionName = platform === 'jar'
    ? `${selectedVersion?.name || 'Ninja School'} · ${cloneBundle ? 'Trọn bộ 5 bản' : 'Bản thường'}`
    : `${selectedChannel?.name || platformMeta[platform].label} · ${selectedOffer?.name || ''}`;
  const historyCount = jobs.length + accesses.length;

  return (
    <div className="space-y-8">
      <nav className="flex border-b border-slate-200" aria-label="Nền tảng">
        {(Object.keys(platformMeta) as NsoPlatform[]).map((item) => {
          const meta = platformMeta[item];
          const available = availablePlatforms.includes(item);
          return (
            <button key={item} type="button" disabled={!available} onClick={() => choosePlatform(item)} className={`relative min-w-20 px-5 py-3 text-sm font-bold transition ${platform === item ? 'text-rose-600 after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-rose-500' : 'text-slate-400 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-35'}`}>
              {meta.label}
            </button>
          );
        })}
      </nav>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <form id="nso-builder-form" onSubmit={submit} className="space-y-7 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          {platform === 'jar' ? (
            <>
              <section>
                <h2 className="text-sm font-bold text-slate-800">Phiên bản</h2>
                <div className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                  {activeVersions.map((version) => (
                    <button key={version.code} type="button" onClick={() => setSelectedCode(version.code)} className={`flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition ${selectedVersion?.code === version.code ? 'bg-rose-50' : 'hover:bg-slate-50'}`}>
                      <span className="flex items-center gap-3"><span className={`h-4 w-4 rounded-full border-4 ${selectedVersion?.code === version.code ? 'border-rose-500' : 'border-slate-200'}`} /><b className="text-sm text-slate-800">{version.name}</b></span><span className="text-sm font-bold text-rose-600">{formatPrice(Number(version.price))}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="text-sm font-bold text-slate-800">Gói</h2>
                <div className="mt-3 grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 p-1">
                  <button type="button" onClick={() => setCloneBundle(false)} className={`rounded-lg px-3 py-3 text-sm font-bold transition ${!cloneBundle ? 'bg-rose-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                    Bản thường
                  </button>
                  <button type="button" onClick={() => setCloneBundle(true)} className={`rounded-lg px-3 py-3 text-sm font-bold transition ${cloneBundle ? 'bg-rose-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                    Trọn bộ x1–x24
                  </button>
                </div>
              </section>
            </>
          ) : (
            <>
              <section>
                <h2 className="text-sm font-bold text-slate-800">Phiên bản</h2>
                <div className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                  {platformChannels.map((channel) => <button key={channel.id} type="button" onClick={() => chooseChannel(channel)} className={`flex w-full items-center gap-3 px-4 py-4 text-left transition ${selectedChannel?.id === channel.id ? 'bg-rose-50' : 'hover:bg-slate-50'}`}><span className={`h-4 w-4 rounded-full border-4 ${selectedChannel?.id === channel.id ? 'border-rose-500' : 'border-slate-200'}`} /><b className="text-sm text-slate-800">{channel.name}</b></button>)}
                </div>
              </section>
              <section>
                <h2 className="text-sm font-bold text-slate-800">Thời hạn</h2>
                <div className="mt-3 flex flex-wrap gap-2">{channelOffers.map((offer) => <button key={offer.id} type="button" onClick={() => setSelectedOfferId(offer.id)} className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${selectedOffer?.id === offer.id ? 'border-rose-500 bg-rose-500 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-rose-300'}`}>{offer.name} · {formatPrice(Number(offer.price))}</button>)}</div>
              </section>
            </>
          )}

          <section className="border-t border-slate-100 pt-6">
            <h2 className="text-sm font-bold text-slate-800">Server</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className="text-xs font-semibold text-slate-500">Tên server</span><input required minLength={2} maxLength={40} value={serverName} onChange={(event) => setServerName(event.target.value)} placeholder="NsoX" className={inputClass} /></label>
              <label><span className="text-xs font-semibold text-slate-500">Địa chỉ</span><input required value={serverHost} onChange={(event) => setServerHost(event.target.value)} placeholder="127.0.0.1" className={`${inputClass} font-mono`} /></label>
              <label><span className="text-xs font-bold text-slate-500">Cổng kết nối</span><input required type="number" min="1" max="65535" value={serverPort} onChange={(event) => setServerPort(Number(event.target.value))} className={`${inputClass} font-mono`} /></label>
            </div>
          </section>
        </form>

        <aside className="lg:sticky lg:top-24">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-bold leading-5 text-slate-800">{selectionName}</p>
            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4"><span className="text-sm text-slate-500">Tổng</span><strong className="text-xl font-black text-rose-600">{formatPrice(selectedPrice)}</strong></div>
            {balance !== null && <p className="mt-2 text-xs text-slate-400">Số dư {balance.toLocaleString('vi-VN')}đ</p>}
            {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-xs font-bold text-red-600">{error}</p>}
            {message && <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-700">{message}</p>}
            {downloadUrl ? <a href={downloadUrl} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white text-sm font-bold text-rose-600 hover:bg-rose-50"><Download className="h-4 w-4" />Tải xuống</a> : null}
            {qrData ? (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold text-slate-700">Quét mã để thanh toán</p>
                  <span className="flex items-center gap-1 font-mono text-xs text-slate-400"><Clock3 className="h-3.5 w-3.5" />{String(Math.floor(countdown / 60)).padStart(2, '0')}:{String(countdown % 60).padStart(2, '0')}</span>
                </div>
                <div className="mx-auto mt-3 w-fit rounded-xl border border-slate-100 bg-white p-2">
                  <Image src={qrData.qr_url} alt="Mã QR thanh toán" width={190} height={190} className="rounded-lg" />
                </div>
                <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2.5 text-center">
                  <p className="font-mono text-xs font-bold text-slate-700">{qrData.transaction_code}</p>
                  <p className="mt-1 text-sm font-black text-rose-600">{formatPrice(qrData.amount)}</p>
                </div>
                <button type="button" onClick={() => void checkPayment()} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"><RefreshCw className={`h-3.5 w-3.5 ${checkingPayment ? 'animate-spin' : ''}`} />Kiểm tra thanh toán</button>
                <button type="button" onClick={() => setQrData(null)} className="mt-1 inline-flex h-9 w-full items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-700"><X className="h-3.5 w-3.5" />Đóng</button>
              </div>
            ) : (
              <>
                <button form="nso-builder-form" disabled={submitting || (platform === 'jar' ? !selectedVersion : !selectedOffer)} className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#ed4c50] text-sm font-bold text-white transition hover:bg-rose-600 disabled:opacity-60">{submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}{submitting ? 'Đang tạo...' : 'Thanh toán bằng ví'}</button>
                {selectedPrice > 0 && <button type="button" disabled={submitting} onClick={() => void startQrPayment()} className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 disabled:opacity-60"><QrCode className="h-4 w-4 text-rose-500" />Thanh toán QR</button>}
              </>
            )}
          </div>
        </aside>
      </div>

      {historyCount > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          <div className="flex items-center justify-between gap-4"><h2 className="text-sm font-bold text-slate-800">File của bạn</h2><button type="button" onClick={() => void loadHistory()} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-400 hover:text-rose-500" aria-label="Làm mới"><RefreshCcw className={`h-3.5 w-3.5 ${loadingHistory ? 'animate-spin' : ''}`} /></button></div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {jobs.map((job) => <article key={job.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{job.server_name}</p><p className="mt-1 text-xs text-slate-400">{job.version_code} · {job.output_kind === 'clone_bundle' ? '5 bản' : '1 bản'}</p></div><a href={`/api/nso-builder/jobs/${job.id}/download`} className="text-xs font-bold text-rose-600 hover:text-rose-700">Tải xuống</a></div></article>)}
            {accesses.map((access) => <article key={access.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{access.server_name}</p><p className="mt-1 truncate text-xs text-slate-400">{access.channel?.name || 'Ninja School'}</p></div>{access.status === 'active' && access.channel?.download_url && <a href={access.channel.download_url} className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700">Tải xuống<ExternalLink className="h-3 w-3" /></a>}</div></article>)}
          </div>
        </section>
      )}
    </div>
  );
}
