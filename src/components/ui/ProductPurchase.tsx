'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock3,
  Coins,
  Copy,
  Download,
  KeyRound,
  Minus,
  Plus,
  QrCode,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  WalletCards,
  X,
  Zap,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import type { Product, ProductVariant, UserProfile } from '@/lib/types/database';
import { cn } from '@/utils/helpers';

type PurchaseStatus = 'idle' | 'loading' | 'qr_pending' | 'success' | 'error';

type DeliveryItem = { key?: string; type?: string; download_url?: string | null; note?: string | null };

type SuccessData = {
  key_value?: string | null;
  delivery_data?: DeliveryItem[];
  download_url?: string | null;
  delivery_intro?: string | null;
  delivery_note?: string | null;
  message?: string;
};

type QrData = {
  qr_url: string;
  transaction_code: string;
  transaction_id: string;
  amount: number;
  expires_at: string;
  bank?: { bank_id: string; account_no: string; account_name: string };
};

type ProductPurchaseProps = {
  product: Product;
  variants: ProductVariant[];
};

function formatPrice(value: number) {
  return value === 0 ? 'Miễn phí' : `${value.toLocaleString('vi-VN')}đ`;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      }}
      aria-label="Sao chép"
    >
      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

export default function ProductPurchase({ product, variants }: ProductPurchaseProps) {
  const availableVariants = useMemo(
    () => variants.filter((variant) => variant.is_active).sort((a, b) => Number(b.is_featured) - Number(a.is_featured) || a.sort_order - b.sort_order),
    [variants],
  );
  const [selectedId, setSelectedId] = useState(availableVariants[0]?.id || '');
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<PurchaseStatus>('idle');
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const [qrData, setQrData] = useState<QrData | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [checking, setChecking] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showLoginHint, setShowLoginHint] = useState(false);
  const checkingRef = useRef(false);
  const [supabase] = useState(() => createClient());

  const selected = availableVariants.find((variant) => variant.id === selectedId) || availableVariants[0];
  const isOutOfStock = !selected || (selected.inventory_policy === 'finite' && selected.stock_quantity <= 0);
  const maxQuantity = selected
    ? Math.max(1, Math.min(selected.purchase_limit, selected.inventory_policy === 'finite' ? selected.stock_quantity : selected.purchase_limit))
    : 1;
  const total = selected ? selected.price * quantity : 0;

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
    setProfile(data);
  }, [supabase]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ? { id: session.user.id, email: session.user.email } : null;
      setUser(currentUser);
      if (currentUser) loadProfile(currentUser.id);
      else setProfile(null);
    });
    return () => subscription.unsubscribe();
  }, [loadProfile, supabase]);

  useEffect(() => {
    if (status !== 'qr_pending' || !qrData) return;
    const tick = () => {
      const seconds = Math.max(0, Math.floor((new Date(qrData.expires_at).getTime() - Date.now()) / 1000));
      setCountdown(seconds);
      if (seconds === 0) {
        setError('Mã QR đã hết hạn. Hàng giữ chỗ đã được trả lại kho.');
        setStatus('error');
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [qrData, status]);

  const checkPayment = useCallback(async () => {
    if (!qrData || checkingRef.current) return;
    checkingRef.current = true;
    setChecking(true);
    try {
      const response = await fetch(`/api/payment/status?transaction_id=${encodeURIComponent(qrData.transaction_id)}`, { cache: 'no-store' });
      const data = await response.json();
      if (response.ok && data.status === 'completed') {
        const delivery = (data.order?.delivery_data || []) as DeliveryItem[];
        setSuccessData({
          delivery_data: delivery,
          key_value: data.order?.key_value,
          download_url: data.delivery?.download_url || delivery.find((item) => item.download_url)?.download_url,
          delivery_intro: data.delivery?.delivery_intro,
          delivery_note: data.delivery?.delivery_note || delivery.find((item) => item.note)?.note,
          message: 'Thanh toán đã được xác nhận và sản phẩm đã bàn giao.',
        });
        setStatus('success');
        if (user) loadProfile(user.id);
      } else if (data.status === 'expired') {
        setError('Giao dịch đã hết hạn. Vui lòng tạo mã QR mới.');
        setStatus('error');
      }
    } catch {
      // Keep polling. A temporary network error must not cancel the order.
    } finally {
      checkingRef.current = false;
      setChecking(false);
    }
  }, [loadProfile, qrData, user]);

  useEffect(() => {
    if (status !== 'qr_pending') return;
    const initialCheck = window.setTimeout(() => { void checkPayment(); }, 0);
    const timer = window.setInterval(checkPayment, 2000);
    return () => {
      window.clearTimeout(initialCheck);
      window.clearInterval(timer);
    };
  }, [checkPayment, status]);

  const selectVariant = (id: string) => {
    setSelectedId(id);
    setQuantity(1);
    setStatus('idle');
    setError('');
    setQrData(null);
    setSuccessData(null);
  };

  const requireAuth = async () => {
    if (user) return true;
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const currentUser = { id: data.user.id, email: data.user.email };
      setUser(currentUser);
      void loadProfile(currentUser.id);
      return true;
    }
    setShowLoginHint(true);
    document.getElementById('navbar-login-btn')?.click();
    return false;
  };

  const purchase = async (paymentMethod: 'coin' | 'bank_qr') => {
    if (!selected || isOutOfStock || !(await requireAuth())) return;
    setStatus('loading');
    setError('');
    try {
      const response = await fetch('/api/orders/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          variant_id: selected.id,
          quantity,
          payment_method: paymentMethod,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không thể tạo đơn hàng.');

      if (paymentMethod === 'bank_qr') {
        setQrData(data);
        setStatus('qr_pending');
      } else {
        setSuccessData(data);
        setStatus('success');
        if (user) loadProfile(user.id);
      }
    } catch (purchaseError) {
      setError(purchaseError instanceof Error ? purchaseError.message : 'Không thể tạo đơn hàng.');
      setStatus('error');
    }
  };

  if (!selected) {
    return (
      <aside className="rounded-[28px] border border-slate-200 bg-white p-6 text-slate-900 shadow-sm">
        <AlertCircle className="mb-3 h-6 w-6 text-amber-400" />
        <h2 className="font-bold">Chưa có gói đang bán</h2>
        <p className="mt-1 text-sm text-slate-500">Sản phẩm này đang được cập nhật bảng giá.</p>
      </aside>
    );
  }

  const deliveryKeys = successData?.delivery_data?.filter((item) => item.key) || [];

  return (
    <aside className="rounded-[28px] border border-slate-200 bg-white p-4 text-slate-900 shadow-xl shadow-slate-200/70 lg:sticky lg:top-24">
      <div className="border-b border-slate-100 px-2 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Gói đang chọn</p>
            <p className="mt-1 text-3xl font-black tracking-tight text-rose-600">{formatPrice(total)}</p>
          </div>
          <span className={cn(
            'mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold',
            isOutOfStock ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700',
          )}>
            <span className={cn('h-1.5 w-1.5 rounded-full', isOutOfStock ? 'bg-red-400' : 'bg-emerald-400')} />
            {isOutOfStock ? 'Hết hàng' : 'Còn hàng'}
          </span>
        </div>
        {selected.compare_at_price && selected.compare_at_price > selected.price && (
          <p className="mt-1 text-sm text-slate-400 line-through">{formatPrice(selected.compare_at_price * quantity)}</p>
        )}
      </div>

      <div className="px-2 py-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">Chọn thời hạn & phiên bản</h2>
          <span className="text-[11px] text-slate-400">{availableVariants.length} lựa chọn</span>
        </div>
        <div className="max-h-[355px] space-y-2 overflow-y-auto pr-1 pt-2">
          {availableVariants.map((variant) => {
            const out = variant.inventory_policy === 'finite' && variant.stock_quantity <= 0;
            const active = variant.id === selected.id;
            return (
              <button
                type="button"
                key={variant.id}
                disabled={out}
                onClick={() => selectVariant(variant.id)}
                className={cn(
                  'group relative w-full rounded-2xl border p-3 text-left transition',
                  active ? 'border-rose-500 bg-rose-50/70 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                  out && 'cursor-not-allowed opacity-40',
                )}
              >
                <div className="flex gap-3">
                  <span className={cn(
                    'mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border',
                    active ? 'border-rose-200 bg-rose-100 text-rose-600' : 'border-slate-200 bg-slate-50 text-slate-400',
                  )}>
                    <KeyRound className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-3">
                      <span className="font-bold leading-snug">{variant.name}</span>
                      <span className={cn('shrink-0 text-sm font-black', active ? 'text-rose-600' : 'text-slate-700')}>
                        {formatPrice(variant.price)}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                      {variant.short_description || variant.duration_label || `Mã gói ${variant.sku}`}
                    </span>
                    <span className="mt-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      <span>{variant.inventory_policy === 'unlimited' ? 'Kho không giới hạn' : `Còn ${variant.stock_quantity}`}</span>
                      <span>•</span>
                      <span>Đã bán {variant.sold_count.toLocaleString('vi-VN')}</span>
                    </span>
                  </span>
                </div>
                {variant.is_featured && (
                  <span className="absolute -top-2 left-12 rounded-full bg-rose-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                    Phổ biến
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {status !== 'qr_pending' && status !== 'success' && (
        <div className="space-y-3 border-t border-slate-100 px-2 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">Số lượng</p>
              <p className="text-[11px] text-slate-400">Tối đa {maxQuantity} / đơn</p>
            </div>
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button type="button" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-white disabled:opacity-25">
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-10 text-center text-sm font-black">{quantity}</span>
              <button type="button" disabled={quantity >= maxQuantity} onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-white disabled:opacity-25">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {user && profile && (
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs">
              <span className="flex items-center gap-2 text-slate-500"><Coins className="h-3.5 w-3.5" />Số dư ví</span>
              <span className="font-bold">{profile.coin_balance.toLocaleString('vi-VN')}đ</span>
            </div>
          )}

          {(status === 'error' && error) || (showLoginHint && !user) ? (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-relaxed text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error || 'Đăng nhập để lưu đơn và nhận sản phẩm.'}</span>
              <button type="button" className="ml-auto" onClick={() => { setStatus('idle'); setError(''); setShowLoginHint(false); }}><X className="h-4 w-4" /></button>
            </div>
          ) : null}

          <button
            type="button"
            disabled={isOutOfStock || status === 'loading'}
            onClick={() => purchase('coin')}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-rose-200 transition hover:from-rose-700 hover:to-red-600 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <WalletCards className="h-4 w-4" />
            {status === 'loading' ? 'Đang giữ hàng...' : selected.price === 0 ? 'Nhận miễn phí' : `Mua bằng ví • ${formatPrice(total)}`}
          </button>
          {selected.price > 0 && (
            <button
              type="button"
              disabled={isOutOfStock || status === 'loading'}
              onClick={() => purchase('bank_qr')}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 disabled:opacity-45"
            >
              <QrCode className="h-4 w-4 text-rose-600" /> Thanh toán QR tự động
            </button>
          )}
          <div className="grid grid-cols-2 gap-2 pt-1 text-[10px] text-slate-400">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" />Đối soát an toàn</span>
            <span className="flex items-center justify-end gap-1.5"><Zap className="h-3.5 w-3.5" />Giao tự động</span>
          </div>
        </div>
      )}

      {status === 'qr_pending' && qrData && (
        <div className="border-t border-slate-100 px-2 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">Quét QR để thanh toán</p>
              <p className="mt-0.5 text-[11px] text-slate-400">Hệ thống tự đối soát mỗi 2 giây</p>
            </div>
            <span className={cn('flex items-center gap-1.5 font-mono text-xs font-bold', countdown < 120 ? 'text-red-600' : 'text-slate-500')}>
              <Clock3 className="h-3.5 w-3.5" />{String(Math.floor(countdown / 60)).padStart(2, '0')}:{String(countdown % 60).padStart(2, '0')}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-[150px_1fr] lg:grid-cols-1 xl:grid-cols-[150px_1fr]">
            <div className="mx-auto rounded-2xl bg-white p-2">
              <Image src={qrData.qr_url} alt="Mã QR thanh toán" width={150} height={150} className="rounded-xl" />
            </div>
            <div className="space-y-2 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-slate-400">Nội dung chuyển khoản</p>
                <div className="mt-1 flex items-center justify-between gap-2"><b className="font-mono text-sm">{qrData.transaction_code}</b><CopyButton value={qrData.transaction_code} /></div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-slate-400">Số tiền chính xác</p>
                <b className="mt-1 block text-base text-rose-600">{formatPrice(qrData.amount)}</b>
              </div>
              <button type="button" onClick={checkPayment} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 font-semibold text-slate-600 hover:bg-slate-50">
                <RefreshCw className={cn('h-3.5 w-3.5', checking && 'animate-spin')} /> Kiểm tra ngay
              </button>
            </div>
          </div>
          <button type="button" className="mt-3 w-full py-2 text-xs text-slate-400 hover:text-slate-700" onClick={() => { setStatus('idle'); setQrData(null); }}>Đóng mã QR</button>
        </div>
      )}

      {status === 'success' && successData && (
        <div className="border-t border-slate-100 px-2 pt-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 className="h-5 w-5" /></span>
              <div><p className="font-bold text-emerald-800">Bàn giao thành công</p><p className="mt-1 text-xs leading-relaxed text-emerald-700/70">{successData.message || 'Đơn hàng đã được lưu vào tài khoản của bạn.'}</p></div>
            </div>
          </div>

          {deliveryKeys.length > 0 && (
            <div className="mt-3 space-y-2">
              {deliveryKeys.map((item, index) => (
                <div key={`${item.key}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Key {deliveryKeys.length > 1 ? index + 1 : 'bản quyền'}</p>
                  <div className="mt-1 flex items-center gap-2"><code className="min-w-0 flex-1 break-all text-xs font-bold text-slate-900">{item.key}</code><CopyButton value={item.key!} /></div>
                </div>
              ))}
            </div>
          )}

          {successData.download_url && (
            <a href={successData.download_url} target="_blank" rel="noopener noreferrer" className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-500 px-4 py-3 text-sm font-black text-white transition hover:from-rose-700 hover:to-red-600">
              <Download className="h-4 w-4" /> Tải sản phẩm
            </a>
          )}
          <button type="button" onClick={() => { setStatus('idle'); setSuccessData(null); }} className="mt-2 flex w-full items-center justify-center gap-2 py-2 text-xs text-slate-400 hover:text-slate-700">
            <ShoppingBag className="h-3.5 w-3.5" /> Tiếp tục mua
          </button>
        </div>
      )}
    </aside>
  );
}
