'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Card from '@/components/ui/Card';
import FormInput from '@/components/ui/FormInput';
import Button from '@/components/ui/Button';

export default function AccountClient() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const supabase = createClient();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Mật khẩu phải có ít nhất 6 ký tự.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp.' });
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw error;
      }

      setMessage({ type: 'success', text: 'Đã đổi mật khẩu thành công!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Lỗi khi đổi mật khẩu:', error);
      setMessage({ type: 'error', text: error.message || 'Đã xảy ra lỗi khi đổi mật khẩu.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="max-w-xl">
      <h2 className="text-xl font-semibold text-slate-900 mb-6 border-b border-slate-100 pb-4">
        Đổi Mật Khẩu
      </h2>

      {message && (
        <div className={`p-4 rounded-xl mb-6 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleUpdatePassword} className="space-y-6">
        <FormInput
          label="Mật khẩu mới"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          placeholder="Nhập mật khẩu mới..."
          helperText="Mật khẩu phải có ít nhất 6 ký tự."
        />

        <FormInput
          label="Xác nhận mật khẩu mới"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          placeholder="Nhập lại mật khẩu mới..."
        />

        <div className="pt-4">
          <Button type="submit" isLoading={isSaving} className="w-full sm:w-auto">
            Cập Nhật Mật Khẩu
          </Button>
        </div>
      </form>
    </Card>
  );
}
