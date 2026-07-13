'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Card from '@/components/ui/Card';
import FormInput from '@/components/ui/FormInput';
import Button from '@/components/ui/Button';
import { Save, Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

interface Experience {
  title: string;
  duration: string;
  description: string;
  type: 'work' | 'education';
}

interface AboutConfigClientProps {
  initialConfig: Record<string, string>;
}

export default function AboutConfigClient({ initialConfig }: AboutConfigClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form State
  const [config, setConfig] = useState({
    about_name: initialConfig['about_name'] || 'PhuongDev',
    about_title: initialConfig['about_title'] || 'Software Engineer',
    about_location: initialConfig['about_location'] || 'Hà Nội, Việt Nam',
    about_availability: initialConfig['about_availability'] || 'Freelancer / Full-time',
    about_major: initialConfig['about_major'] || 'Công Nghệ Thông Tin',
    about_avatar_url: initialConfig['about_avatar_url'] || '',
    about_content: initialConfig['about_content'] || '',
  });

  // Experiences State
  const defaultExperiences: Experience[] = [
    { title: 'Senior Full-Stack Developer', duration: 'Hiện tại', description: 'Phát triển các ứng dụng web...', type: 'work' },
    { title: 'Backend Developer', duration: '2020 - 2023', description: 'Thiết kế APIs...', type: 'work' },
    { title: 'Đại Học Bách Khoa', duration: '2016 - 2020', description: 'Tốt nghiệp loại Giỏi...', type: 'education' },
  ];
  
  const [experiences, setExperiences] = useState<Experience[]>(
    initialConfig['about_experiences'] 
      ? JSON.parse(initialConfig['about_experiences']) 
      : defaultExperiences
  );

  const [isUploading, setIsUploading] = useState(false);

  const handleConfigChange = (key: string, value: string) => {
    setConfig({ ...config, [key]: value });
  };

  const handleExperienceChange = (index: number, field: keyof Experience, value: string) => {
    const newExperiences = [...experiences];
    newExperiences[index] = { ...newExperiences[index], [field]: value };
    setExperiences(newExperiences);
  };

  const addExperience = () => {
    setExperiences([...experiences, { title: '', duration: '', description: '', type: 'work' }]);
  };

  const removeExperience = (index: number) => {
    setExperiences(experiences.filter((_, i) => i !== index));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Lỗi upload ảnh');
      }

      const data = await response.json();
      setConfig({ ...config, about_avatar_url: data.url });
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi upload ảnh.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Chuẩn bị dữ liệu cập nhật
      const updates = [
        ...Object.entries(config).map(([key, value]) => ({ key, value })),
        { key: 'about_experiences', value: JSON.stringify(experiences) }
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('site_config')
          .upsert({ 
            key: update.key, 
            value: update.value,
            updated_at: new Date().toISOString()
          }, { onConflict: 'key' });

        if (error) throw error;
      }

      setSuccess('Đã lưu cấu hình trang giới thiệu thành công!');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi lưu cấu hình.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Cấu Hình Trang Giới Thiệu</h2>
          <p className="text-slate-500 mt-1">Quản lý toàn bộ nội dung hiển thị trên trang /about</p>
        </div>
        <Button onClick={handleSave} isLoading={isSaving} icon={<Save className="w-4 h-4" />}>
          Lưu Thay Đổi
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 text-green-600 rounded-lg border border-green-200">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Info */}
        <Card padding="lg" className="space-y-6">
          <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">Thông Tin Cá Nhân (Profile)</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ảnh Đại Diện (Avatar)</label>
              <div className="flex items-center gap-4">
                {config.about_avatar_url ? (
                  <div className="relative w-20 h-20 rounded-full overflow-hidden border border-slate-200">
                    <Image src={config.about_avatar_url} alt="Avatar" fill className="object-cover" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                    className="block w-full text-sm text-slate-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100 cursor-pointer"
                  />
                  {isUploading && <p className="text-xs text-blue-500 mt-1">Đang tải ảnh lên...</p>}
                </div>
              </div>
            </div>

            <FormInput
              id="about_name"
              label="Tên hiển thị"
              value={config.about_name}
              onChange={(e) => handleConfigChange('about_name', e.target.value)}
            />
            <FormInput
              id="about_title"
              label="Chức danh"
              value={config.about_title}
              onChange={(e) => handleConfigChange('about_title', e.target.value)}
            />
            <FormInput
              id="about_location"
              label="Vị trí (Nơi ở)"
              value={config.about_location}
              onChange={(e) => handleConfigChange('about_location', e.target.value)}
            />
            <FormInput
              id="about_availability"
              label="Trạng thái làm việc"
              value={config.about_availability}
              onChange={(e) => handleConfigChange('about_availability', e.target.value)}
            />
            <FormInput
              id="about_major"
              label="Chuyên ngành"
              value={config.about_major}
              onChange={(e) => handleConfigChange('about_major', e.target.value)}
            />
          </div>
        </Card>

        {/* About Content */}
        <Card padding="lg" className="space-y-6">
          <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">Nội Dung Giới Thiệu (Về Tôi)</h3>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Đoạn văn giới thiệu bản thân (xuống dòng bằng Enter)
            </label>
            <textarea
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[250px] outline-none transition-all resize-y"
              value={config.about_content}
              onChange={(e) => handleConfigChange('about_content', e.target.value)}
              placeholder="Nhập nội dung giới thiệu..."
            />
          </div>
        </Card>
      </div>

      {/* Experiences */}
      <Card padding="lg">
        <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-6">
          <h3 className="text-lg font-bold text-slate-800">Hành Trình & Kinh Nghiệm</h3>
          <Button onClick={addExperience} size="sm" variant="outline" icon={<Plus className="w-4 h-4" />}>
            Thêm Kinh Nghiệm
          </Button>
        </div>

        <div className="space-y-6">
          {experiences.map((exp, index) => (
            <div key={index} className="p-4 bg-slate-50 border border-slate-200 rounded-xl relative">
              <button
                onClick={() => removeExperience(index)}
                className="absolute top-4 right-4 text-red-500 hover:text-red-700 p-1 bg-red-50 rounded"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pr-8">
                <FormInput
                  id={`exp_title_${index}`}
                  label="Tiêu đề (VD: Senior Developer)"
                  value={exp.title}
                  onChange={(e) => handleExperienceChange(index, 'title', e.target.value)}
                />
                <FormInput
                  id={`exp_duration_${index}`}
                  label="Thời gian (VD: Hiện tại, 2020 - 2023)"
                  value={exp.duration}
                  onChange={(e) => handleExperienceChange(index, 'duration', e.target.value)}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Loại hình</label>
                <select
                  value={exp.type}
                  onChange={(e) => handleExperienceChange(index, 'type', e.target.value as any)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="work">Công việc (Work)</option>
                  <option value="education">Học vấn (Education)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả ngắn</label>
                <textarea
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[80px] outline-none resize-y"
                  value={exp.description}
                  onChange={(e) => handleExperienceChange(index, 'description', e.target.value)}
                />
              </div>
            </div>
          ))}
          {experiences.length === 0 && (
            <p className="text-center text-slate-500 py-8">Chưa có dữ liệu. Hãy thêm kinh nghiệm mới.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
