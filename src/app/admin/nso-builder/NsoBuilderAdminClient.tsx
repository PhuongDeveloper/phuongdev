'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, CircleCheck, Coins, ExternalLink, Hammer, LoaderCircle, Radio, RotateCcw } from 'lucide-react';

import ImageUpload from '@/components/ui/ImageUpload';
import type { NsoBuilderSettings, NsoBuildJob, NsoBuildVersion, NsoPlatformChannel, NsoPlatformOffer, NsoServerAccess } from '@/lib/types/database';

type AdminJob = NsoBuildJob & { customer: { email: string; display_name: string | null } | null };
type AdminAccess = NsoServerAccess & {
  customer: { email: string; display_name: string | null } | null;
  channel: NsoPlatformChannel | null;
};
type Props = {
  initialSettings: NsoBuilderSettings;
  initialVersions: NsoBuildVersion[];
  initialChannels: NsoPlatformChannel[];
  initialOffers: NsoPlatformOffer[];
  jobs: AdminJob[];
  accesses: AdminAccess[];
};

const inputClass = 'mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100';
const textareaClass = `${inputClass} h-auto min-h-24 py-3`;

const statusMeta = {
  completed: { label: 'Hoàn thành', className: 'bg-emerald-50 text-emerald-700', icon: CircleCheck },
} as const;

export default function NsoBuilderAdminClient({ initialSettings, initialVersions, initialChannels, initialOffers, jobs, accesses }: Props) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [versions, setVersions] = useState(initialVersions);
  const [channels, setChannels] = useState(initialChannels);
  const [offers, setOffers] = useState(initialOffers);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [renderedAt] = useState(() => Date.now());

  const updateVersion = (index: number, value: Partial<NsoBuildVersion>) => {
    setVersions((current) => current.map((version, versionIndex) => versionIndex === index ? { ...version, ...value } : version));
  };

  const updateChannel = (index: number, value: Partial<NsoPlatformChannel>) => {
    setChannels((current) => current.map((channel, channelIndex) => channelIndex === index ? { ...channel, ...value } : channel));
  };

  const updateOffer = (id: string, value: Partial<NsoPlatformOffer>) => {
    setOffers((current) => current.map((offer) => offer.id === id ? { ...offer, ...value } : offer));
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch('/api/admin/nso-builder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings, versions, channels, offers }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không thể lưu cấu hình.');
      setNotice({ tone: 'success', text: 'Đã lưu cấu hình cửa hàng và bảng giá.' });
      router.refresh();
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Không thể lưu cấu hình.' });
    } finally {
      setSaving(false);
    }
  };

  const setAccessStatus = async (access: AdminAccess, status: 'active' | 'revoked') => {
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/nso-builder/access/${access.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không thể cập nhật server.');
      setNotice({ tone: 'success', text: status === 'active' ? 'Đã kích hoạt lại server.' : 'Đã tạm dừng server.' });
      router.refresh();
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Không thể cập nhật server.' });
    }
  };

  const revenue = jobs.reduce((sum, job) => sum + Number(job.price), 0)
    + accesses.reduce((sum, access) => sum + Number(access.total_paid), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#ed4c50]">JAR workshop</p><h2 className="mt-1 text-3xl font-black tracking-[-0.04em]">Build Ninja School</h2><p className="mt-2 text-sm text-slate-500">Quản lý sản phẩm tạo JAR tức thì ngay trong cửa hàng.</p></div>
        <a href="/store" target="_blank" className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50">Xem tại cửa hàng</a>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><Hammer className="h-5 w-5 text-blue-500" /><p className="mt-3 text-2xl font-black">{versions.length}</p><p className="text-xs text-slate-400">JAR mẫu có sẵn</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><CircleCheck className="h-5 w-5 text-emerald-500" /><p className="mt-3 text-2xl font-black">{jobs.length + accesses.length}</p><p className="text-xs text-slate-400">Bản đã bàn giao</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><Coins className="h-5 w-5 text-rose-500" /><p className="mt-3 text-2xl font-black">{revenue.toLocaleString('vi-VN')}đ</p><p className="text-xs text-slate-400">Doanh thu hoàn thành</p></div>
      </div>

      <form onSubmit={save} className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center justify-between"><div><h3 className="text-lg font-black">Nội dung sản phẩm</h3><p className="text-xs text-slate-400">Hiển thị trực tiếp trong danh sách cửa hàng.</p></div><label className="flex items-center gap-2 text-sm font-bold text-slate-600"><input type="checkbox" checked={settings.is_active} onChange={(event) => setSettings((value) => ({ ...value, is_active: event.target.checked }))} className="accent-rose-500" />Đang mở bán</label></div>
          <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className="text-xs font-bold text-slate-600">Tiêu đề</span><input value={settings.title} onChange={(event) => setSettings((value) => ({ ...value, title: event.target.value }))} className={inputClass} required /></label>
              <label className="sm:col-span-2"><span className="text-xs font-bold text-slate-600">Mô tả ngắn</span><textarea value={settings.description} onChange={(event) => setSettings((value) => ({ ...value, description: event.target.value }))} className={textareaClass} required /></label>
              <label className="sm:col-span-2"><span className="text-xs font-bold text-slate-600">Nội dung trong form build</span><textarea value={settings.content} onChange={(event) => setSettings((value) => ({ ...value, content: event.target.value }))} className={textareaClass} /></label>
              <label><span className="text-xs font-bold text-slate-600">Nhãn nổi bật</span><input value={settings.badge} onChange={(event) => setSettings((value) => ({ ...value, badge: event.target.value }))} className={inputClass} /></label>
              <label><span className="text-xs font-bold text-slate-600">Port mặc định</span><input type="number" min="1" max="65535" value={settings.default_port} onChange={(event) => setSettings((value) => ({ ...value, default_port: Number(event.target.value) }))} className={inputClass} /></label>
            </div>
            <ImageUpload label="Banner sản phẩm" value={settings.banner_url} onChange={(url) => setSettings((value) => ({ ...value, banner_url: url }))} />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5"><h3 className="text-lg font-black">Phiên bản & giá</h3><p className="text-xs text-slate-400">Giá bộ nhiều tab là phụ phí cộng thêm vào giá JAR cơ bản; khách nhận ZIP gồm x1, x3, x6, x12 và x24.</p></div>
          <div className="space-y-4">
            {versions.map((version, index) => (
              <div key={`${version.code}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="grid gap-3 md:grid-cols-8">
                  <label><span className="text-xs font-bold text-slate-600">Mã bản</span><input value={version.code} disabled className={`${inputClass} bg-slate-100 font-mono text-slate-500`} /></label>
                  <label className="md:col-span-3"><span className="text-xs font-bold text-slate-600">Tên hiển thị</span><input value={version.name} onChange={(event) => updateVersion(index, { name: event.target.value })} className={inputClass} /></label>
                  <label className="md:col-span-2"><span className="text-xs font-bold text-slate-600">Giá JAR x1</span><input type="number" min="0" value={version.price} onChange={(event) => updateVersion(index, { price: Number(event.target.value) })} className={inputClass} /></label>
                  <label className="md:col-span-2"><span className="text-xs font-bold text-slate-600">Phụ phí bộ 5 JAR</span><input type="number" min="0" value={version.clone_bundle_price} onChange={(event) => updateVersion(index, { clone_bundle_price: Number(event.target.value) })} className={inputClass} /></label>
                  <label className="md:col-span-8"><span className="text-xs font-bold text-slate-600">Mô tả</span><input value={version.description} onChange={(event) => updateVersion(index, { description: event.target.value })} className={inputClass} /></label>
                </div>
                <div className="mt-3"><label className="flex items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" checked={version.is_active} onChange={(event) => updateVersion(index, { is_active: event.target.checked })} className="accent-rose-500" />Đang bán · đã tạo {version.sold_count} file</label></div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-600"><Radio className="h-5 w-5" /></span><div><h3 className="text-lg font-black">APK, PC, iOS & endpoint TXT</h3><p className="text-xs leading-5 text-slate-400">Nhập link Drive/TestFlight, giá và bật kênh khi client đã sẵn sàng. Endpoint vẫn tự loại server iOS hết hạn.</p></div></div>
          <div className="space-y-4">
            {channels.map((channel, channelIndex) => {
              const channelOffers = offers.filter((offer) => offer.channel_id === channel.id);
              return (
                <div key={channel.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="grid gap-3 lg:grid-cols-12">
                    <label className="lg:col-span-2"><span className="text-xs font-bold text-slate-600">Kênh</span><input value={`${channel.platform.toUpperCase()} ${channel.version_code}`} disabled className={`${inputClass} bg-slate-100 font-mono text-slate-500`} /></label>
                    <label className="lg:col-span-3"><span className="text-xs font-bold text-slate-600">Tên hiển thị</span><input value={channel.name} onChange={(event) => updateChannel(channelIndex, { name: event.target.value })} className={inputClass} /></label>
                    <label className="lg:col-span-5"><span className="text-xs font-bold text-slate-600">Link tải Drive / TestFlight</span><input type="url" value={channel.download_url || ''} onChange={(event) => updateChannel(channelIndex, { download_url: event.target.value })} placeholder="https://..." className={inputClass} /></label>
                    <div className="flex items-end lg:col-span-2"><label className="flex h-11 w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600"><input type="checkbox" checked={channel.is_active} onChange={(event) => updateChannel(channelIndex, { is_active: event.target.checked })} className="accent-rose-500" />Đang mở bán</label></div>
                    <label className="lg:col-span-8"><span className="text-xs font-bold text-slate-600">Mô tả</span><input value={channel.description} onChange={(event) => updateChannel(channelIndex, { description: event.target.value })} className={inputClass} /></label>
                    <div className="flex items-end lg:col-span-4"><a href={`/${channel.endpoint_slug}`} target="_blank" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 font-mono text-xs font-bold text-sky-700"><ExternalLink className="h-3.5 w-3.5" />/{channel.endpoint_slug}</a></div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {channelOffers.map((offer) => (
                      <div key={offer.id} className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="grid grid-cols-2 gap-2"><label><span className="text-[10px] font-bold uppercase text-slate-400">Tên gói</span><input value={offer.name} onChange={(event) => updateOffer(offer.id, { name: event.target.value })} className={inputClass} /></label><label><span className="text-[10px] font-bold uppercase text-slate-400">Giá</span><input type="number" min="0" value={offer.price} onChange={(event) => updateOffer(offer.id, { price: Number(event.target.value) })} className={inputClass} /></label></div>
                        <label className="mt-3 flex items-center justify-between text-xs font-bold text-slate-600"><span>{offer.duration_days === 0 ? 'Vĩnh viễn' : `${offer.duration_days} ngày`}</span><span className="inline-flex items-center gap-2"><input type="checkbox" checked={offer.is_active} onChange={(event) => updateOffer(offer.id, { is_active: event.target.checked })} className="accent-rose-500" />Mở bán</span></label>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {notice && <p className={`rounded-xl px-4 py-3 text-sm font-semibold ${notice.tone === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{notice.text}</p>}
        <div className="flex justify-end"><button disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#ed4c50] px-5 text-sm font-black text-white shadow-lg shadow-red-200 disabled:opacity-60">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Hammer className="h-4 w-4" />}{saving ? 'Đang lưu...' : 'Lưu cấu hình'}</button></div>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-black">Server trong APK / PC / iOS</h3><p className="text-xs text-slate-400">Server iOS hết hạn tự động không còn xuất hiện trong TXT; dữ liệu vẫn giữ để đối soát.</p></div><span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-black text-sky-700">{accesses.length} server</span></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[1080px] text-left text-xs"><thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3">Khách hàng</th><th className="px-4 py-3">Server</th><th className="px-4 py-3">Kênh / endpoint</th><th className="px-4 py-3">Hiệu lực</th><th className="px-4 py-3">Đã trả</th><th className="px-4 py-3 text-right">Quản lý</th></tr></thead><tbody className="divide-y divide-slate-100">
          {accesses.map((access) => {
            const expired = Boolean(access.expires_at && new Date(access.expires_at).getTime() <= renderedAt);
            const active = access.status === 'active';
            return <tr key={access.id} className="hover:bg-slate-50/70"><td className="px-5 py-4"><p className="font-bold">{access.customer?.display_name || 'Khách hàng'}</p><p className="text-[10px] text-slate-400">{access.customer?.email || access.user_id}</p></td><td className="px-4 py-4"><p className="font-black">{access.server_name}</p><p className="font-mono text-[10px] text-slate-400">{access.server_host}:{access.server_port}</p></td><td className="px-4 py-4"><p className="font-black uppercase">{access.channel?.platform || '?' } {access.channel?.version_code}</p>{access.channel && <a href={`/${access.channel.endpoint_slug}`} target="_blank" className="font-mono text-[10px] text-sky-600">/{access.channel.endpoint_slug}</a>}</td><td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${!active ? 'bg-slate-100 text-slate-500' : expired ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{!active ? 'Đã tạm dừng' : expired ? 'Đã hết hạn' : access.expires_at ? new Date(access.expires_at).toLocaleDateString('vi-VN') : 'Vĩnh viễn'}</span></td><td className="px-4 py-4"><p className="font-black">{Number(access.total_paid).toLocaleString('vi-VN')}đ</p><p className="text-[10px] text-slate-400">{access.purchase_count} lần mua</p></td><td className="px-4 py-4 text-right"><button type="button" onClick={() => void setAccessStatus(access, active ? 'revoked' : 'active')} className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 font-bold ${active ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>{active ? <Ban className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}{active ? 'Tạm dừng' : 'Kích hoạt'}</button></td></tr>;
          })}
          {!accesses.length && <tr><td colSpan={6} className="px-5 py-14 text-center text-slate-400">Chưa có server APK, PC hoặc iOS.</td></tr>}
        </tbody></table></div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4"><h3 className="font-black">100 yêu cầu gần nhất</h3><p className="text-xs text-slate-400">Trang tự cập nhật khi tải lại.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-xs"><thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3">Khách hàng</th><th className="px-4 py-3">Server</th><th className="px-4 py-3">Bản / giá</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">File</th><th className="px-4 py-3">Thời gian</th></tr></thead><tbody className="divide-y divide-slate-100">
          {jobs.map((job) => { const meta = statusMeta[job.status]; const Icon = meta.icon; return <tr key={job.id} className="hover:bg-slate-50/70"><td className="px-5 py-4"><p className="font-bold">{job.customer?.display_name || 'Khách hàng'}</p><p className="text-[10px] text-slate-400">{job.customer?.email || job.user_id}</p></td><td className="px-4 py-4"><p className="font-black">{job.server_name}</p><p className="font-mono text-[10px] text-slate-400">{job.server_host}:{job.server_port}</p></td><td className="px-4 py-4"><p className="font-black">{job.version_code} · {job.output_kind === 'clone_bundle' ? 'Bộ 5 JAR' : 'JAR x1'}</p><p className="text-[10px] text-slate-400">{Number(job.price).toLocaleString('vi-VN')}đ</p></td><td className="px-4 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-bold ${meta.className}`}><Icon className="h-3 w-3" />{meta.label}</span></td><td className="max-w-72 px-4 py-4"><p className="truncate font-mono text-[10px] text-slate-600">{job.output_name}</p></td><td className="px-4 py-4 text-[10px] text-slate-400">{new Date(job.created_at).toLocaleString('vi-VN')}</td></tr>; })}
          {!jobs.length && <tr><td colSpan={6} className="px-5 py-14 text-center text-slate-400">Chưa có yêu cầu build.</td></tr>}
        </tbody></table></div>
      </section>
    </div>
  );
}
