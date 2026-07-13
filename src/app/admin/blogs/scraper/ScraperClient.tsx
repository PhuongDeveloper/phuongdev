/* ==========================================================================
   Client Component: Công Cụ Quét Bài Báo
   - Nhập danh sách URL (mỗi dòng 1 URL, tối đa 100)
   - Gọi API /api/scrape từng URL
   - Hiển thị tiến trình, preview kết quả
   - Cho phép chọn và đăng bài viết vào database
   ========================================================================== */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import {
  ArrowLeft,
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
  Globe,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Save,
  X,
  Check,
  AlertTriangle,
} from 'lucide-react';

/** Kiểu dữ liệu cho 1 bài viết đã quét */
interface ScrapedArticle {
  title: string;
  excerpt: string;
  cover_image: string;
  content: string;
  images: string[];
  slug: string;
  source_url: string;
}

/** Kiểu dữ liệu kết quả quét */
interface ScrapeResult {
  url: string;
  status: 'pending' | 'scraping' | 'success' | 'error';
  data?: ScrapedArticle;
  error?: string;
}

export default function ScraperClient() {
  const router = useRouter();
  const [urlsText, setUrlsText] = useState('');
  const [results, setResults] = useState<ScrapeResult[]>([]);
  const [isScraping, setIsScraping] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [showPreview, setShowPreview] = useState(false);
  const [selectedArticles, setSelectedArticles] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  const supabase = createClient();

  /** Đếm số URL hợp lệ */
  const getUrls = (): string[] => {
    return urlsText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && (line.startsWith('http://') || line.startsWith('https://')));
  };

  const urlCount = getUrls().length;

  /** Bắt đầu quét */
  const handleStartScraping = async () => {
    const urls = getUrls();
    if (urls.length === 0) {
      alert('Vui lòng nhập ít nhất 1 URL hợp lệ.');
      return;
    }
    if (urls.length > 100) {
      alert('Tối đa 100 URL mỗi lần quét.');
      return;
    }

    setIsScraping(true);
    setShowPreview(false);
    setProgress({ current: 0, total: urls.length });

    // Khởi tạo kết quả
    const initialResults: ScrapeResult[] = urls.map((url) => ({
      url,
      status: 'pending',
    }));
    setResults(initialResults);

    // Quét tuần tự từng URL
    const finalResults = [...initialResults];
    for (let i = 0; i < urls.length; i++) {
      finalResults[i] = { ...finalResults[i], status: 'scraping' };
      setResults([...finalResults]);
      setProgress({ current: i + 1, total: urls.length });

      try {
        const res = await fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: urls[i] }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          finalResults[i] = {
            ...finalResults[i],
            status: 'error',
            error: json.error || 'Lỗi không xác định',
          };
        } else {
          finalResults[i] = {
            ...finalResults[i],
            status: 'success',
            data: json.data,
          };
        }
      } catch (err: any) {
        finalResults[i] = {
          ...finalResults[i],
          status: 'error',
          error: err.message || 'Lỗi kết nối',
        };
      }

      setResults([...finalResults]);
    }

    setIsScraping(false);

    // Tự động chọn tất cả bài thành công
    const successIndices = new Set<number>();
    finalResults.forEach((r, idx) => {
      if (r.status === 'success') successIndices.add(idx);
    });
    setSelectedArticles(successIndices);
    setShowPreview(true);
  };

  /** Đếm kết quả */
  const successCount = results.filter((r) => r.status === 'success').length;
  const errorCount = results.filter((r) => r.status === 'error').length;
  const progressPercent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  /** Toggle chọn bài viết */
  const toggleArticle = (index: number) => {
    const next = new Set(selectedArticles);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedArticles(next);
  };

  /** Chọn / bỏ chọn tất cả */
  const toggleAll = () => {
    const successIndices = results
      .map((r, idx) => (r.status === 'success' ? idx : -1))
      .filter((i) => i >= 0);

    if (selectedArticles.size === successIndices.length) {
      setSelectedArticles(new Set());
    } else {
      setSelectedArticles(new Set(successIndices));
    }
  };

  /** Lưu các bài viết đã chọn vào database */
  const handlePublish = async () => {
    if (selectedArticles.size === 0) {
      alert('Vui lòng chọn ít nhất 1 bài viết.');
      return;
    }

    setIsSaving(true);
    let savedCount = 0;
    let failedCount = 0;

    for (const idx of selectedArticles) {
      const article = results[idx]?.data;
      if (!article) continue;

      try {
        const { error } = await supabase.from('blogs').insert([
          {
            title: article.title,
            slug: article.slug + '-' + Date.now().toString(36),
            content: article.content,
            excerpt: article.excerpt || null,
            cover_image: article.cover_image || null,
            author: 'PhuongDev',
            tags: [],
            is_published: false,
            published_at: null,
          },
        ]);

        if (error) throw error;
        savedCount++;
      } catch (err: any) {
        console.error('Lỗi lưu bài viết:', err);
        failedCount++;
      }
    }

    setIsSaving(false);
    alert(
      `Hoàn tất! Đã lưu ${savedCount} bài viết${failedCount > 0 ? `, ${failedCount} bài lỗi` : ''}.\nCác bài viết được lưu ở trạng thái "Bản nháp".`
    );

    if (savedCount > 0) {
      router.push('/admin/blogs');
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <button
            onClick={() => router.push('/admin/blogs')}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại Quản Lý Blog
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Công Cụ Quét Bài Báo</h1>
          <p className="text-slate-600">
            Nhập link bài báo để tự động quét nội dung và chuyển thành bài viết blog.
          </p>
        </div>
      </div>

      {/* Input URLs */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold text-slate-700">
              Danh sách URL bài báo
            </label>
            <span className="text-xs text-slate-500">
              {urlCount}/100 URL
              {urlCount > 100 && (
                <span className="text-red-500 ml-1">(vượt giới hạn)</span>
              )}
            </span>
          </div>
          <textarea
            value={urlsText}
            onChange={(e) => setUrlsText(e.target.value)}
            disabled={isScraping}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all font-mono text-sm resize-y disabled:bg-slate-50 disabled:cursor-not-allowed"
            rows={8}
            placeholder={`Nhập mỗi URL trên 1 dòng, ví dụ:\nhttps://vnexpress.net/bai-viet-1.html\nhttps://tuoitre.vn/bai-viet-2.htm\nhttps://dantri.com.vn/bai-viet-3.htm`}
          />

          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Hỗ trợ quét từ hầu hết các trang báo phổ biến: VnExpress, Tuổi Trẻ, Dân Trí, Thanh Niên, ...
            </p>
            <Button
              onClick={handleStartScraping}
              disabled={isScraping || urlCount === 0 || urlCount > 100}
              isLoading={isScraping}
            >
              {isScraping ? (
                'Đang quét...'
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Bắt Đầu Quét
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Progress */}
      {(isScraping || results.length > 0) && (
        <Card>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Tiến trình quét</h3>
              <span className="text-sm text-slate-600">
                {progress.current}/{progress.total} ({progressPercent}%)
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progressPercent}%`,
                  background: isScraping
                    ? 'linear-gradient(90deg, #3b82f6, #06b6d4)'
                    : errorCount > 0 && successCount === 0
                    ? '#ef4444'
                    : '#22c55e',
                }}
              />
            </div>

            {/* Kết quả tổng quan */}
            {!isScraping && results.length > 0 && (
              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  {successCount} thành công
                </span>
                <span className="flex items-center gap-1 text-red-500">
                  <XCircle className="w-4 h-4" />
                  {errorCount} thất bại
                </span>
              </div>
            )}

            {/* Danh sách chi tiết */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {results.map((r, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 text-sm"
                >
                  {r.status === 'pending' && (
                    <div className="w-4 h-4 rounded-full border-2 border-slate-300 flex-shrink-0" />
                  )}
                  {r.status === 'scraping' && (
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
                  )}
                  {r.status === 'success' && (
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  )}
                  {r.status === 'error' && (
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  )}
                  <span className="truncate flex-1 text-slate-700">{r.url}</span>
                  {r.status === 'error' && (
                    <span className="text-xs text-red-500 flex-shrink-0">{r.error}</span>
                  )}
                  {r.status === 'success' && r.data && (
                    <span className="text-xs text-green-600 flex-shrink-0 max-w-[200px] truncate">
                      {r.data.title}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Preview Modal */}
      {showPreview && successCount > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Kết Quả Quét Bài Báo
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  <span className="text-green-600 font-medium">{successCount} thành công</span>
                  {errorCount > 0 && (
                    <span className="text-red-500 ml-2">{errorCount} thất bại</span>
                  )}
                  {' · '}
                  <span className="text-blue-600 font-medium">{selectedArticles.size} đã chọn</span>
                </p>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nút chọn tất cả */}
            <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <button
                onClick={toggleAll}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    selectedArticles.size === successCount
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-slate-300'
                  }`}
                >
                  {selectedArticles.size === successCount && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
                Chọn tất cả ({successCount} bài)
              </button>

              {errorCount > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {errorCount} URL không quét được
                </div>
              )}
            </div>

            {/* Danh sách bài viết */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {results.map((r, idx) => {
                if (r.status !== 'success' || !r.data) return null;
                const isSelected = selectedArticles.has(idx);

                return (
                  <div
                    key={idx}
                    className={`flex gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/50'
                        : 'border-slate-100 hover:border-slate-200 bg-white'
                    }`}
                    onClick={() => toggleArticle(idx)}
                  >
                    {/* Checkbox */}
                    <div className="flex-shrink-0 pt-1">
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-slate-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </div>

                    {/* Ảnh bìa */}
                    {r.data.cover_image && (
                      <div className="flex-shrink-0 w-28 h-20 rounded-lg overflow-hidden bg-slate-100">
                        <img
                          src={r.data.cover_image}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    {/* Thông tin */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 line-clamp-1">
                        {r.data.title || 'Không có tiêu đề'}
                      </h3>
                      <p className="text-sm text-slate-500 line-clamp-2 mt-1">
                        {r.data.excerpt || 'Không có mô tả'}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {r.data.content.length.toLocaleString()} ký tự
                        </span>
                        <span className="flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          {r.data.images.length} ảnh
                        </span>
                        <a
                          href={r.data.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-500 hover:text-blue-700"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3 h-3" />
                          Nguồn
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Hiển thị các URL lỗi */}
              {errorCount > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h4 className="text-sm font-semibold text-red-600 mb-2">URL quét thất bại:</h4>
                  <div className="space-y-1">
                    {results
                      .filter((r) => r.status === 'error')
                      .map((r, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-slate-500">
                          <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                          <span className="truncate">{r.url}</span>
                          <span className="text-xs text-red-400">— {r.error}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-slate-100 flex-shrink-0">
              <Button variant="ghost" onClick={() => setShowPreview(false)}>
                Đóng
              </Button>
              <Button
                onClick={handlePublish}
                disabled={selectedArticles.size === 0}
                isLoading={isSaving}
              >
                <Save className="w-4 h-4 mr-2" />
                Đăng {selectedArticles.size} Bài Viết (Bản Nháp)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
