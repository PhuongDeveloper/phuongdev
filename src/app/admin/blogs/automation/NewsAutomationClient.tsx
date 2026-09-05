'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, CheckCircle2, Pencil, Plus, RefreshCw, Rss, Trash2 } from 'lucide-react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import FormInput from '@/components/ui/FormInput';
import { createClient } from '@/lib/supabase/client';
import type { NewsSource } from '@/lib/types/database';

type SourceDraft = {
  name: string;
  feed_url: string;
  tags: string;
  limit_per_run: number;
  is_active: boolean;
  auto_publish: boolean;
};

type SyncResult = { sources: number; imported: number; published: number; skipped: number; errors: string[] };

const emptyDraft: SourceDraft = { name: '', feed_url: '', tags: '', limit_per_run: 3, is_active: true, auto_publish: false };

export default function NewsAutomationClient({ initialSources }: { initialSources: NewsSource[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [sources, setSources] = useState(initialSources);
  const [draft, setDraft] = useState<SourceDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const resetDraft = () => {
    setEditingId(null);
    setDraft(emptyDraft);
  };

  const saveSource = async (event: React.FormEvent) => {
    event.preventDefault();
    setNotice(null);
    setIsSaving(true);
    const tags = draft.tags.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 8);
    const payload = {
      name: draft.name.trim(),
      feed_url: draft.feed_url.trim(),
      default_tags: tags,
      limit_per_run: Math.min(5, Math.max(1, Number(draft.limit_per_run) || 3)),
      is_active: draft.is_active,
      auto_publish: draft.auto_publish,
    };

    try {
      new URL(payload.feed_url);
      const response = editingId
        ? await supabase.from('news_sources').update(payload).eq('id', editingId).select().single()
        : await supabase.from('news_sources').insert(payload).select().single();
      if (response.error) throw response.error;
      if (editingId) setSources((items) => items.map((item) => item.id === editingId ? response.data as NewsSource : item));
      else setSources((items) => [response.data as NewsSource, ...items]);
      setNotice({ tone: 'success', text: editingId ? 'Đã cập nhật nguồn tin.' : 'Đã thêm nguồn tin.' });
      resetDraft();
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Không thể lưu nguồn RSS.' });
    } finally {
      setIsSaving(false);
    }
  };

  const editSource = (source: NewsSource) => {
    setEditingId(source.id);
    setDraft({
      name: source.name,
      feed_url: source.feed_url,
      tags: source.default_tags.join(', '),
      limit_per_run: source.limit_per_run,
      is_active: source.is_active,
      auto_publish: source.auto_publish,
    });
  };

  const deleteSource = async (source: NewsSource) => {
    if (!confirm(`Xóa nguồn RSS “${source.name}”?`)) return;
    const { error } = await supabase.from('news_sources').delete().eq('id', source.id);
    if (error) {
      setNotice({ tone: 'error', text: error.message });
      return;
    }
    setSources((items) => items.filter((item) => item.id !== source.id));
    if (editingId === source.id) resetDraft();
  };

  const runSync = async (sourceId?: string) => {
    setIsSyncing(true);
    setNotice(null);
    try {
      const response = await fetch('/api/admin/news-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sourceId ? { source_id: sourceId } : {}),
      });
      const payload = await response.json() as { error?: string; result?: SyncResult };
      if (!response.ok || !payload.result) throw new Error(payload.error || 'Không thể đồng bộ nguồn tin.');
      const { imported, published, skipped, errors } = payload.result;
      setNotice({
        tone: errors.length ? 'error' : 'success',
        text: `Đã nhập ${imported} bài${published ? `, xuất bản ${published} bài` : ''}; bỏ qua ${skipped} bài trùng.${errors.length ? ` ${errors[0]}` : ''}`,
      });
      router.refresh();
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Không thể đồng bộ nguồn tin.' });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <button onClick={() => router.push('/admin/blogs')} className="mb-2 flex items-center gap-1 text-sm text-slate-500 transition hover:text-slate-700">
            <ArrowLeft className="h-4 w-4" /> Quay lại quản lý blog
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Tự động nhập bài từ RSS</h1>
          <p className="mt-1 text-sm text-slate-600">Cron kiểm tra nguồn mỗi ngày, chỉ nhập bài mới và tự đăng theo thiết lập của từng nguồn.</p>
        </div>
        <Button onClick={() => runSync()} isLoading={isSyncing} icon={<RefreshCw className="h-4 w-4" />}>Đồng bộ ngay</Button>
      </div>

      <Card variant="outlined" className="border-amber-200 bg-amber-50/50">
        <div className="flex gap-3 text-sm text-amber-900">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p>Chỉ bật “Đăng ngay” với nguồn anh được phép sử dụng. Bài từ nguồn bên ngoài nên được rà soát, bổ sung góc nhìn riêng và nguồn tham khảo trước khi xuất bản để vừa có giá trị cho khách, vừa tránh nội dung trùng lặp.</p>
        </div>
      </Card>

      {notice && <div className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${notice.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
        {notice.tone === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
        {notice.text}
      </div>}

      <Card variant="solid">
        <div className="mb-5 flex items-center gap-2"><Rss className="h-5 w-5 text-rose-600" /><h2 className="font-semibold text-slate-900">{editingId ? 'Sửa nguồn RSS' : 'Thêm nguồn RSS'}</h2></div>
        <form onSubmit={saveSource} className="grid gap-4 md:grid-cols-2">
          <FormInput label="Tên nguồn" value={draft.name} onChange={(event) => setDraft((value) => ({ ...value, name: event.target.value }))} placeholder="VD: VnExpress Công Nghệ" required />
          <FormInput label="URL RSS/Atom" type="url" value={draft.feed_url} onChange={(event) => setDraft((value) => ({ ...value, feed_url: event.target.value }))} placeholder="https://example.com/rss" required />
          <FormInput label="Thẻ mặc định" value={draft.tags} onChange={(event) => setDraft((value) => ({ ...value, tags: event.target.value }))} placeholder="AI, Công nghệ, Tool" helperText="Phân cách bằng dấu phẩy; tối đa 8 thẻ." />
          <FormInput label="Số bài tối đa mỗi lượt" type="number" min={1} max={5} value={draft.limit_per_run} onChange={(event) => setDraft((value) => ({ ...value, limit_per_run: Number(event.target.value) }))} />
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={draft.is_active} onChange={(event) => setDraft((value) => ({ ...value, is_active: event.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-rose-600" /> Kích hoạt nguồn này</label>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={draft.auto_publish} onChange={(event) => setDraft((value) => ({ ...value, auto_publish: event.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-rose-600" /> Đăng ngay sau khi cào</label>
          <div className="flex gap-2 md:col-span-2">
            <Button type="submit" isLoading={isSaving} icon={<Plus className="h-4 w-4" />}>{editingId ? 'Lưu thay đổi' : 'Thêm nguồn'}</Button>
            {editingId && <Button type="button" variant="secondary" onClick={resetDraft}>Hủy</Button>}
          </div>
        </form>
      </Card>

      <Card padding="none" variant="solid" className="overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4"><h2 className="font-semibold text-slate-900">Nguồn đang theo dõi ({sources.length})</h2></div>
        {sources.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Chưa có nguồn RSS. Thêm nguồn đầu tiên để cron bắt đầu theo dõi.</p> : <div className="divide-y divide-slate-100">
          {sources.map((source) => <div key={source.id} className="flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-medium text-slate-900">{source.name}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${source.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{source.is_active ? 'Đang bật' : 'Đã tắt'}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${source.auto_publish ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{source.auto_publish ? 'Đăng ngay' : 'Lưu nháp'}</span></div><p className="mt-1 truncate text-xs text-slate-500">{source.feed_url}</p><p className="mt-1 text-xs text-slate-400">{source.last_synced_at ? `Lần quét cuối: ${new Date(source.last_synced_at).toLocaleString('vi-VN')}` : 'Chưa từng quét'} · tối đa {source.limit_per_run} bài/lượt</p>{source.last_error && <p className="mt-1 text-xs text-red-600">Lỗi gần nhất: {source.last_error}</p>}</div>
            <div className="flex shrink-0 gap-2"><Button size="sm" variant="outline" onClick={() => runSync(source.id)} disabled={isSyncing}>Quét</Button><Button size="sm" variant="ghost" onClick={() => editSource(source)} icon={<Pencil className="h-4 w-4" />}>Sửa</Button><Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => deleteSource(source)} icon={<Trash2 className="h-4 w-4" />}>Xóa</Button></div>
          </div>)}
        </div>}
      </Card>
    </div>
  );
}
