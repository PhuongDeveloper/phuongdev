'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CircleCheck, Coins, Hammer, LoaderCircle } from 'lucide-react';

import ImageUpload from '@/components/ui/ImageUpload';
import type { NsoBuilderSettings, NsoBuildJob, NsoBuildVersion } from '@/lib/types/database';

type AdminJob = NsoBuildJob & { customer: { email: string; display_name: string | null } | null };
type Props = { initialSettings: NsoBuilderSettings; initialVersions: NsoBuildVersion[]; jobs: AdminJob[] };

const inputClass = 'mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100';
const textareaClass = `${inputClass} h-auto min-h-24 py-3`;

const statusMeta = {
  completed: { label: 'Hoàn thành', className: 'bg-emerald-50 text-emerald-700', icon: CircleCheck },
} as const;

export default function NsoBuilderAdminClient({ initialSettings, initialVersions, jobs }: Props) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [versions, setVersions] = useState(initialVersions);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const updateVersion = (index: number, value: Partial<NsoBuildVersion>) => {
    setVersions((current) => current.map((version, versionIndex) => versionIndex === index ? { ...version, ...value } : version));
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch('/api/admin/nso-builder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings, versions }),
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

  const revenue = jobs.reduce((sum, job) => sum + Number(job.price), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#ed4c50]">JAR workshop</p><h2 className="mt-1 text-3xl font-black tracking-[-0.04em]">Build Ninja School</h2><p className="mt-2 text-sm text-slate-500">Quản lý sản phẩm tạo JAR tức thì ngay trong cửa hàng.</p></div>
        <a href="/store" target="_blank" className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50">Xem tại cửa hàng</a>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><Hammer className="h-5 w-5 text-blue-500" /><p className="mt-3 text-2xl font-black">{versions.length}</p><p className="text-xs text-slate-400">JAR mẫu có sẵn</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><CircleCheck className="h-5 w-5 text-emerald-500" /><p className="mt-3 text-2xl font-black">{jobs.length}</p><p className="text-xs text-slate-400">File đã bàn giao</p></div>
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
          <div className="mb-5"><h3 className="text-lg font-black">Phiên bản & giá</h3><p className="text-xs text-slate-400">Hai JAR mẫu đã nằm trong bản deploy; chỉ cần chỉnh nội dung, giá và trạng thái bán.</p></div>
          <div className="space-y-4">
            {versions.map((version, index) => (
              <div key={`${version.code}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="grid gap-3 md:grid-cols-6">
                  <label><span className="text-xs font-bold text-slate-600">Mã bản</span><input value={version.code} disabled className={`${inputClass} bg-slate-100 font-mono text-slate-500`} /></label>
                  <label className="md:col-span-3"><span className="text-xs font-bold text-slate-600">Tên hiển thị</span><input value={version.name} onChange={(event) => updateVersion(index, { name: event.target.value })} className={inputClass} /></label>
                  <label className="md:col-span-2"><span className="text-xs font-bold text-slate-600">Giá</span><input type="number" min="0" value={version.price} onChange={(event) => updateVersion(index, { price: Number(event.target.value) })} className={inputClass} /></label>
                  <label className="md:col-span-6"><span className="text-xs font-bold text-slate-600">Mô tả</span><input value={version.description} onChange={(event) => updateVersion(index, { description: event.target.value })} className={inputClass} /></label>
                </div>
                <div className="mt-3"><label className="flex items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" checked={version.is_active} onChange={(event) => updateVersion(index, { is_active: event.target.checked })} className="accent-rose-500" />Đang bán · đã tạo {version.sold_count} file</label></div>
              </div>
            ))}
          </div>
        </section>

        {notice && <p className={`rounded-xl px-4 py-3 text-sm font-semibold ${notice.tone === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{notice.text}</p>}
        <div className="flex justify-end"><button disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#ed4c50] px-5 text-sm font-black text-white shadow-lg shadow-red-200 disabled:opacity-60">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Hammer className="h-4 w-4" />}{saving ? 'Đang lưu...' : 'Lưu cấu hình'}</button></div>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4"><h3 className="font-black">100 yêu cầu gần nhất</h3><p className="text-xs text-slate-400">Trang tự cập nhật khi tải lại.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-xs"><thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3">Khách hàng</th><th className="px-4 py-3">Server</th><th className="px-4 py-3">Bản / giá</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">File</th><th className="px-4 py-3">Thời gian</th></tr></thead><tbody className="divide-y divide-slate-100">
          {jobs.map((job) => { const meta = statusMeta[job.status]; const Icon = meta.icon; return <tr key={job.id} className="hover:bg-slate-50/70"><td className="px-5 py-4"><p className="font-bold">{job.customer?.display_name || 'Khách hàng'}</p><p className="text-[10px] text-slate-400">{job.customer?.email || job.user_id}</p></td><td className="px-4 py-4"><p className="font-black">{job.server_name}</p><p className="font-mono text-[10px] text-slate-400">{job.server_host}:{job.server_port}</p></td><td className="px-4 py-4"><p className="font-black">{job.version_code}</p><p className="text-[10px] text-slate-400">{Number(job.price).toLocaleString('vi-VN')}đ</p></td><td className="px-4 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-bold ${meta.className}`}><Icon className="h-3 w-3" />{meta.label}</span></td><td className="max-w-72 px-4 py-4"><p className="truncate font-mono text-[10px] text-slate-600">{job.output_name}</p></td><td className="px-4 py-4 text-[10px] text-slate-400">{new Date(job.created_at).toLocaleString('vi-VN')}</td></tr>; })}
          {!jobs.length && <tr><td colSpan={6} className="px-5 py-14 text-center text-slate-400">Chưa có yêu cầu build.</td></tr>}
        </tbody></table></div>
      </section>
    </div>
  );
}
