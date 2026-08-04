/* ==========================================================================
   ProductPurchase - Luồng mua hàng trên trang chi tiết sản phẩm
   Hiển thị khi sản phẩm có has_key = true hoặc price > 0
   ========================================================================== */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart, Gift, Coins, QrCode, Copy, Check, Clock,
  AlertCircle, CheckCircle2, Key, Download, Loader2, RefreshCw, X,
} from 'lucide-react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import { cn } from '@/utils/helpers';
import type { Product, UserProfile } from '@/lib/types/database';

interface ProductPurchaseProps {
  product: Product;
}

type PurchaseStatus = 'idle' | 'loading' | 'qr_pending' | 'success' | 'error';

interface SuccessData {
  key_value: string | null;
  download_url: string | null;
  delivery_intro: string | null;
  delivery_note: string | null;
  message: string;
}

interface QRData {
  qr_url: string;
  transaction_code: string;
  transaction_id: string;
  amount: number;
  expires_at: string;
}

function CopyButton({ text, size = 'sm' }: { text: string; size?: 'sm' | 'md' }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handle} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function ProductPurchase({ product }: ProductPurchaseProps) {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<PurchaseStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [polling, setPolling] = useState(false);
  const [showAuthHint, setShowAuthHint] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).single();
        setProfile(data);
      } else {
        setProfile(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Countdown QR
  useEffect(() => {
    if (status !== 'qr_pending' || !qrData) return;
    const expiresAt = new Date(qrData.expires_at).getTime();
    const tick = () => {
      const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setCountdown(diff);
      if (diff === 0) { setStatus('idle'); setQrData(null); }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [status, qrData]);

  // Polling QR order
  const checkQRStatus = useCallback(async () => {
    if (!qrData || polling) return;
    setPolling(true);
    try {
      const res = await fetch(`/api/payment/sepay-webhook?transaction_id=${qrData.transaction_id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'completed') {
          // Lấy order tương ứng
          const orderRes = await supabase.from('orders').select('*').eq('transaction_id', qrData.transaction_id).eq('status', 'completed').single();
          setSuccessData({
            key_value: orderRes.data?.key_value || null,
            download_url: product.download_url,
            delivery_intro: product.delivery_intro,
            delivery_note: product.delivery_note,
            message: 'Thanh toán thành công! Email xác nhận đã được gửi.',
          });
          setStatus('success');
          // Reload profile
          const { data: newProfile } = await supabase.from('user_profiles').select('*').eq('id', user!.id).single();
          setProfile(newProfile);
        }
      }
    } catch { /* ignore */ }
    setPolling(false);
  }, [qrData, polling, product, user]);

  useEffect(() => {
    if (status !== 'qr_pending') return;
    const interval = setInterval(checkQRStatus, 5000);
    return () => clearInterval(interval);
  }, [status, checkQRStatus]);

  const requireAuth = () => {
    if (!user) { setShowAuthHint(true); return false; }
    return true;
  };

  const handleGetTrialKey = async () => {
    if (!requireAuth()) return;
    setStatus('loading'); setError(null);
    const res = await fetch('/api/orders/get-trial-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: product.id }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setStatus('error'); return; }
    setSuccessData(data);
    setStatus('success');
  };

  const handlePurchaseCoin = async () => {
    if (!requireAuth()) return;
    setStatus('loading'); setError(null);
    const res = await fetch('/api/orders/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: product.id, payment_method: 'coin' }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setStatus('error'); return; }
    setSuccessData(data);
    setStatus('success');
    const { data: newProfile } = await supabase.from('user_profiles').select('*').eq('id', user!.id).single();
    setProfile(newProfile);
  };

  const handlePurchaseQR = async () => {
    if (!requireAuth()) return;
    setStatus('loading'); setError(null);
    const res = await fetch('/api/orders/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: product.id, payment_method: 'bank_qr' }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setStatus('error'); return; }
    setQrData(data);
    setStatus('qr_pending');
  };

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // Không hiển thị gì nếu sản phẩm miễn phí và không có key
  if (product.price === 0 && !product.has_key) return null;

  return (
    <div className="space-y-3">
      {/* Auth hint */}
      <AnimatePresence>
        {showAuthHint && !user && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Vui lòng <button onClick={() => { setShowAuthHint(false); const btn = document.getElementById('navbar-login-btn'); btn?.click(); }} className="underline font-semibold cursor-pointer">đăng nhập</button> để mua hàng.</span>
            <button onClick={() => setShowAuthHint(false)} className="ml-auto text-amber-600 hover:text-amber-800 cursor-pointer"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {status === 'error' && error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">{error}</div>
            <button onClick={() => setStatus('idle')} className="text-red-400 hover:text-red-600 cursor-pointer"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User coin balance */}
      {user && profile && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 px-1">
          <Coins className="w-3.5 h-3.5 text-rose-500" />
          Số dư ví: <span className="font-semibold text-slate-700">{(profile.coin_balance ?? 0).toLocaleString('vi-VN')} VND</span>
        </div>
      )}

      {/* Buttons */}
      {status !== 'qr_pending' && status !== 'success' && (
        <div className="flex flex-col gap-2.5">
          {/* Key trial button */}
          {product.has_key && (
            <Button
              variant="outline"
              className="w-full justify-center"
              onClick={handleGetTrialKey}
              isLoading={status === 'loading'}
              icon={<Gift className="w-4 h-4" />}
            >
              Nhận Key Test Miễn Phí
            </Button>
          )}

          {/* Mua bằng coin */}
          {product.price > 0 && (
            <Button
              variant="primary"
              className="w-full justify-center shadow-md shadow-rose-500/20"
              onClick={handlePurchaseCoin}
              isLoading={status === 'loading'}
              icon={<Coins className="w-4 h-4" />}
            >
              Mua Bằng Ví · {product.price.toLocaleString('vi-VN')} VND
            </Button>
          )}

          {/* Mua bằng QR */}
          {product.price > 0 && (
            <Button
              variant="secondary"
              className="w-full justify-center"
              onClick={handlePurchaseQR}
              isLoading={status === 'loading'}
              icon={<QrCode className="w-4 h-4" />}
            >
              Thanh Toán QR Bank
            </Button>
          )}
        </div>
      )}

      {/* QR Pending */}
      {status === 'qr_pending' && qrData && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <span className="text-sm font-semibold text-slate-800">Quét QR để thanh toán</span>
            <div className={cn('flex items-center gap-1.5 text-xs font-mono font-bold', countdown < 120 ? 'text-red-600' : 'text-slate-600')}>
              <Clock className="w-3.5 h-3.5" />{formatTime(countdown)}
            </div>
          </div>
          <div className="p-4 flex flex-col items-center gap-3">
            <div className="p-2 bg-white border border-slate-100 rounded-xl">
              <Image src={qrData.qr_url} alt="QR thanh toán" width={180} height={180} className="rounded-lg" />
            </div>
            <div className="w-full space-y-2">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                <span className="text-slate-500">Nội dung CK</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono font-bold text-slate-800">{qrData.transaction_code}</span>
                  <CopyButton text={qrData.transaction_code} />
                </div>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                <span className="text-slate-500">Số tiền</span>
                <span className="font-bold text-rose-600">{qrData.amount.toLocaleString('vi-VN')} VND</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                <div className={cn('w-1.5 h-1.5 rounded-full', polling ? 'bg-blue-400 animate-pulse' : 'bg-slate-300')} />
                <span className="text-slate-500">Đang chờ xác nhận thanh toán tự động...</span>
                <button onClick={checkQRStatus} className="ml-auto text-slate-400 hover:text-slate-700 cursor-pointer">
                  <RefreshCw className={cn('w-3.5 h-3.5', polling && 'animate-spin')} />
                </button>
              </div>
            </div>
          </div>
          <div className="px-4 pb-4">
            <button onClick={() => { setStatus('idle'); setQrData(null); }} className="w-full py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
              Huỷ
            </button>
          </div>
        </motion.div>
      )}

      {/* Success */}
      {status === 'success' && successData && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          className="border border-emerald-200 bg-emerald-50 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-emerald-100">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <p className="text-sm font-semibold text-emerald-800">Giao hàng thành công</p>
          </div>
          <div className="p-4 space-y-3">
            {successData.delivery_intro && (
              <p className="text-sm text-slate-700 leading-relaxed">{successData.delivery_intro}</p>
            )}
            {successData.key_value && (
              <div className="bg-white border border-slate-200 rounded-xl p-3">
                <p className="text-xs text-slate-400 mb-2 uppercase tracking-wider font-semibold">Key bản quyền</p>
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="font-mono text-sm font-bold text-slate-900 flex-1 break-all">{successData.key_value}</span>
                  <CopyButton text={successData.key_value} />
                </div>
              </div>
            )}
            {successData.download_url && (
              <a href={successData.download_url} target="_blank" rel="noopener noreferrer">
                <Button variant="primary" className="w-full justify-center" icon={<Download className="w-4 h-4" />}>
                  Tải Xuống Sản Phẩm
                </Button>
              </a>
            )}
            {successData.delivery_note && (
              <div className="bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                {successData.delivery_note}
              </div>
            )}
            <p className="text-xs text-emerald-700">Email xác nhận đã được gửi về hộp thư của bạn.</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
