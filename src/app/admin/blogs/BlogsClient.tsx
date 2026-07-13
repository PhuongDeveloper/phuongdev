/* ==========================================================================
   Client Component Quản Lý Blog
   ========================================================================== */

'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Plus, Edit2, Trash2, X, Save, Image as ImageIcon, Globe } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import FormInput from '@/components/ui/FormInput';
import ImageUpload from '@/components/ui/ImageUpload';
import { type Blog, type BlogInsert, type BlogUpdate } from '@/lib/types/database';
import { formatDate } from '@/utils/helpers';

interface BlogsClientProps {
  initialBlogs: Blog[];
}

export default function BlogsClient({ initialBlogs }: BlogsClientProps) {
  const [blogs, setBlogs] = useState<Blog[]>(initialBlogs);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<BlogInsert>({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    cover_image: '',
    author: 'PhuongDev',
    tags: [],
    is_published: false,
    published_at: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [tagsInput, setTagsInput] = useState('');
  const [isUploadingInline, setIsUploadingInline] = useState(false);
  
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const inlineFileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    setBlogs(initialBlogs);
  }, [initialBlogs]);

  // Mở modal thêm mới
  const handleAddNew = () => {
    setEditingId(null);
    setFormData({
      title: '',
      slug: '',
      content: '',
      excerpt: '',
      cover_image: '',
      author: 'PhuongDev',
      tags: [],
      is_published: false,
      published_at: null,
    });
    setTagsInput('');
    setIsModalOpen(true);
  };

  // Mở modal sửa
  const handleEdit = (blog: Blog) => {
    setEditingId(blog.id);
    setFormData({
      title: blog.title,
      slug: blog.slug,
      content: blog.content,
      excerpt: blog.excerpt || '',
      cover_image: blog.cover_image || '',
      author: blog.author,
      tags: blog.tags,
      is_published: blog.is_published,
      published_at: blog.published_at,
    });
    setTagsInput(blog.tags.join(', '));
    setIsModalOpen(true);
  };

  // Xoá blog
  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xoá bài viết này?')) return;
    try {
      const { error } = await supabase.from('blogs').delete().eq('id', id);
      if (error) throw error;
      setBlogs(blogs.filter((b) => b.id !== id));
      alert('Đã xoá bài viết thành công!');
    } catch (error: any) {
      console.error(error);
      alert('Lỗi khi xoá: ' + error.message);
    }
  };

  // Auto-generate slug từ title
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    if (!editingId && title) {
      const slug = title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setFormData({ ...formData, title, slug });
    } else {
      setFormData({ ...formData, title });
    }
  };

  // Upload ảnh chèn vào nội dung bài viết
  const handleInlineImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingInline(true);
    const form = new FormData();
    form.append('image', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      
      const imageUrl = data.url;
      const markdownImage = `\n![${file.name}](${imageUrl})\n`;
      
      // Chèn markdown vào vị trí con trỏ
      if (contentTextareaRef.current) {
        const start = contentTextareaRef.current.selectionStart;
        const end = contentTextareaRef.current.selectionEnd;
        const newContent = formData.content.substring(0, start) + markdownImage + formData.content.substring(end);
        setFormData({ ...formData, content: newContent });
      } else {
        setFormData({ ...formData, content: formData.content + markdownImage });
      }
    } catch (error: any) {
      alert('Lỗi upload ảnh: ' + error.message);
    } finally {
      setIsUploadingInline(false);
      if (inlineFileInputRef.current) inlineFileInputRef.current.value = '';
    }
  };

  // Lưu dữ liệu
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Parse tags
      const parsedTags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
        
      const payload = {
        ...formData,
        tags: parsedTags,
        published_at: formData.is_published && !formData.published_at ? new Date().toISOString() : formData.published_at,
      };

      if (editingId) {
        const { error } = await supabase
          .from('blogs')
          .update(payload as BlogUpdate)
          .eq('id', editingId);
        if (error) throw error;
        
        setBlogs(blogs.map((b) => (b.id === editingId ? { ...b, ...payload } as Blog : b)));
        alert('Cập nhật bài viết thành công!');
      } else {
        const { data, error } = await supabase
          .from('blogs')
          .insert([payload])
          .select();
        if (error) throw error;
        
        if (data && data[0]) {
          setBlogs([data[0] as Blog, ...blogs]);
        }
        alert('Thêm bài viết mới thành công!');
      }
      setIsModalOpen(false);
    } catch (error: any) {
      console.error(error);
      alert('Lỗi lưu dữ liệu: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản Lý Blog</h1>
          <p className="text-slate-600">Thêm, sửa, xoá bài viết công nghệ.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/admin/blogs/scraper')}>
            <Globe className="w-5 h-5 mr-2" />
            Quét Bài Báo
          </Button>
          <Button onClick={handleAddNew}>
            <Plus className="w-5 h-5 mr-2" />
            Viết bài mới
          </Button>
        </div>
      </div>

      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 font-semibold text-slate-600">Tiêu đề</th>
                <th className="p-4 font-semibold text-slate-600">Trạng thái</th>
                <th className="p-4 font-semibold text-slate-600">Ngày đăng</th>
                <th className="p-4 font-semibold text-slate-600 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {blogs.map((blog) => (
                <tr key={blog.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-slate-900">{blog.title}</div>
                    <div className="text-sm text-slate-500">/{blog.slug}</div>
                  </td>
                  <td className="p-4">
                    {blog.is_published ? (
                      <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">Đã xuất bản</span>
                    ) : (
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">Bản nháp</span>
                    )}
                  </td>
                  <td className="p-4 text-slate-600">
                    {blog.published_at ? formatDate(blog.published_at) : '-'}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(blog)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(blog.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {blogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    Chưa có bài viết nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl my-8">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">
                {editingId ? 'Sửa bài viết' : 'Viết bài mới'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <FormInput
                    label="Tiêu đề bài viết (*)"
                    value={formData.title}
                    onChange={handleTitleChange}
                    required
                    placeholder="VD: Hướng dẫn học Next.js..."
                  />
                  <FormInput
                    label="Đường dẫn (Slug) (*)"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    required
                    placeholder="huong-dan-hoc-nextjs"
                  />
                  <FormInput
                    label="Thẻ (Tags) - Phân cách bằng dấu phẩy"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="VD: React, Next.js, Tutorial"
                  />
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_published}
                        onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                        className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                      />
                      <span className="text-sm font-medium text-slate-700">Xuất bản bài viết này ngay</span>
                    </label>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">Mô tả ngắn (Excerpt)</label>
                    <textarea
                      value={formData.excerpt || ''}
                      onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all resize-none"
                      rows={3}
                      placeholder="Hiển thị ở trang danh sách blog..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Ảnh bìa (Cover Image)</label>
                    <ImageUpload
                      value={formData.cover_image || ''}
                      onChange={(url) => setFormData({ ...formData, cover_image: url })}
                      label="Upload Ảnh Bìa"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-6">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-700">Nội dung bài viết (Markdown) (*)</label>
                  
                  {/* Nút Upload chèn ảnh vào Markdown */}
                  <div className="relative">
                    <input
                      type="file"
                      ref={inlineFileInputRef}
                      onChange={handleInlineImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => inlineFileInputRef.current?.click()}
                      disabled={isUploadingInline}
                    >
                      {isUploadingInline ? (
                        <span className="flex items-center"><span className="animate-pulse">Đang tải...</span></span>
                      ) : (
                        <span className="flex items-center"><ImageIcon className="w-4 h-4 mr-1.5" /> Chèn ảnh vào nội dung</span>
                      )}
                    </Button>
                  </div>
                </div>
                
                <textarea
                  ref={contentTextareaRef}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all font-mono text-sm resize-y"
                  rows={15}
                  placeholder="Hỗ trợ Markdown: # Tiêu đề 1, **In đậm**, ![Alt ảnh](url)..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                  Huỷ
                </Button>
                <Button type="submit" isLoading={isLoading}>
                  <Save className="w-5 h-5 mr-2" />
                  Lưu Bài Viết
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
