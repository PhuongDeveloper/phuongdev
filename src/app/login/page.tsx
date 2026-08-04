'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, Code2, Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError || !data.user) {
      setError('Email hoặc mật khẩu không chính xác.');
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase.from('user_profiles').select('is_admin').eq('id', data.user.id).single();
    if (!profile?.is_admin) {
      await supabase.auth.signOut();
      setError('Tài khoản này không có quyền truy cập khu vực quản trị.');
      setLoading(false);
      return;
    }

    router.replace('/admin');
    router.refresh();
  };

  return (
    <main className="relative grid min-h-screen overflow-hidden bg-slate-50 text-slate-900 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="relative hidden overflow-hidden border-r border-slate-200 bg-gradient-to-br from-white via-rose-50 to-indigo-50 p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(225,29,72,.14),transparent_28%),radial-gradient(circle_at_78%_76%,rgba(99,102,241,.10),transparent_30%)]" />
        <div className="absolute inset-0 opacity-[0.28] [background-image:linear-gradient(rgba(148,163,184,.32)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.32)_1px,transparent_1px)] [background-size:52px_52px]" />
        <div className="relative flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-rose-600 text-white"><Code2 className="h-5 w-5" /></span><div><b className="block">PhuongDev</b><span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Market control</span></div></div>
        <div className="relative max-w-xl"><p className="mb-5 text-[11px] font-black uppercase tracking-[0.2em] text-rose-600">Hệ điều hành cửa hàng số</p><h1 className="text-5xl font-black leading-[1.05] tracking-[-0.05em]">Đơn hàng, kho và dòng tiền.<br /><span className="text-slate-300">Một nơi để kiểm soát.</span></h1><div className="mt-9 grid grid-cols-2 gap-3 text-xs text-slate-600"><span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm"><ShieldCheck className="h-4 w-4 text-emerald-600" />Phiên đăng nhập bảo mật</span><span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm"><LockKeyhole className="h-4 w-4 text-rose-600" />Chỉ tài khoản admin</span></div></div>
        <p className="relative text-xs text-slate-400">PhuongDev Market · Administration</p>
      </div>

      <div className="flex items-center justify-center bg-white p-5 sm:p-10">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-10 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-rose-600"><ArrowLeft className="h-3.5 w-3.5" />Về website</Link>
          <div className="mb-8"><span className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-rose-600 text-white lg:hidden"><Code2 className="h-5 w-5" /></span><p className="text-[11px] font-black uppercase tracking-[0.18em] text-rose-600">Xác thực quản trị</p><h2 className="mt-2 text-3xl font-black tracking-tight">Đăng nhập bảng điều khiển</h2><p className="mt-2 text-sm leading-6 text-slate-500">Dùng tài khoản Supabase đã được cấp quyền <code className="text-slate-700">is_admin</code>.</p></div>
          <form onSubmit={login} className="space-y-4">
            <label className="block"><span className="mb-2 block text-xs font-bold text-slate-600">Email quản trị</span><span className="relative block"><Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" placeholder="admin@phuongdev.com" className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100" /></span></label>
            <label className="block"><span className="mb-2 block text-xs font-bold text-slate-600">Mật khẩu</span><span className="relative block"><LockKeyhole className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" placeholder="••••••••" className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-12 text-sm outline-none transition placeholder:text-slate-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span></label>
            {error && <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
            <button type="submit" disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-500 text-sm font-black text-white shadow-lg shadow-rose-200 transition hover:from-rose-700 hover:to-red-600 disabled:opacity-50">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}{loading ? 'Đang xác thực...' : 'Vào bảng điều khiển'}</button>
          </form>
        </div>
      </div>
    </main>
  );
}
