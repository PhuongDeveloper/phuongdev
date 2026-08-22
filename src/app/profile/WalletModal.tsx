/* ==========================================================================
   WalletModal - Modal Nạp Tiền bằng VietQR
   Thiết kế nhất quán với design system (slate + rose)
   ========================================================================== */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Coins, Copy, Check, Clock, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import { cn } from '@/utils/helpers';

const QUICK_AMOUNTS = [20_000, 50_000, 100_000, 200_000, 500_000];

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'select' | 'qr' | 'success';

export default function WalletModal({ isOpen, onClose, onSuccess }: WalletModalProps) {
  const [step, setStep] = useState<Step>('select');
  const [amount, setAmount] = useState<number>(100_000);
  const [customAmount, setCustomAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [qrData, setQrData] = useState<{
    qr_url: string; transaction_code: string; transaction_id: string; expires_at: string; amount: number;
    bank?: { bank_id: string; account_no: string; account_name: string };
  } | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const pollingRef = useRef(false);

  // Countdown khi đang ở bước QR
  useEffect(() => {
    if (step !== 'qr' || !qrData) return;
    const expiresAt = new Date(qrData.expires_at).getTime();
    const tick = () => {
      const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setCountdown(diff);
      if (diff === 0) setStep('select');
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [step, qrData]);

  // Kiểm tra ngay khi mở QR rồi duy trì nhịp 2 giây để cập nhật gần như tức thời.
  const checkStatus = useCallback(async () => {
    if (!qrData || pollingRef.current) return;
    pollingRef.current = true;
    setPolling(true);
    try {
      const res = await fetch(`/api/payment/status?transaction_id=${encodeURIComponent(qrData.transaction_id)}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'completed') {
          setStep('success');
          onSuccess();
        }
      }
    } catch { /* ignore */ }
    finally {
      pollingRef.current = false;
      setPolling(false);
    }
  }, [qrData, onSuccess]);

  useEffect(() => {
    if (step !== 'qr') return;
    const initialCheck = window.setTimeout(() => { void checkStatus(); }, 0);
    const interval = window.setInterval(checkStatus, 2000);
    return () => {
      window.clearTimeout(initialCheck);
      window.clearInterval(interval);
    };
  }, [step, checkStatus]);

  const handleCreateQR = async () => {
    const finalAmount = customAmount ? parseInt(customAmount.replace(/\D/g, '')) : amount;
    if (!finalAmount || finalAmount < 10_000) {
      setError('Số tiền tối thiểu 10.000 VND'); return;
    }
    setIsLoading(true); setError(null);
    try {
      const res = await fetch('/api/payment/create-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: finalAmount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQrData(data);
      setStep('qr');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Không thể tạo QR. Vui lòng thử lại.');
    }
    setIsLoading(false);
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setStep('select'); setQrData(null); setError(null);
    setCustomAmount(''); setAmount(100_000); onClose();
  };

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const finalAmount = customAmount ? parseInt(customAmount.replace(/\D/g, '')) || 0 : amount;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-50">
                  <Coins className="w-4 h-4 text-rose-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Nạp Tiền Vào Ví</h2>
                  <p className="text-xs text-slate-500">1 VND = 1 Coin · Tự động xác nhận</p>
                </div>
              </div>
              <button onClick={handleClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5">
              {/* Step 1: Chọn số tiền */}
              {step === 'select' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-3">Chọn số tiền nạp</p>
                    <div className="grid grid-cols-3 gap-2">
                      {QUICK_AMOUNTS.map((a) => (
                        <button
                          key={a}
                          onClick={() => { setAmount(a); setCustomAmount(''); }}
                          className={cn(
                            'py-2.5 rounded-xl text-sm font-semibold border transition-all cursor-pointer',
                            amount === a && !customAmount
                              ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-500/20'
                              : 'border-slate-200 text-slate-700 hover:border-rose-300 hover:text-rose-600 bg-white'
                          )}
                        >
                          {(a / 1000).toFixed(0)}K
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">Hoặc nhập số tiền khác</label>
                    <input
                      type="text"
                      placeholder="VD: 150000"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 hover:border-slate-300"
                    />
                    <p className="text-xs text-slate-400">Tối thiểu 10.000 VND</p>
                  </div>

                  {finalAmount > 0 && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Số tiền nạp</span>
                        <span className="font-bold text-slate-900">{finalAmount.toLocaleString('vi-VN')} VND</span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="text-slate-500">Coin nhận được</span>
                        <span className="font-bold text-rose-600">+{finalAmount.toLocaleString('vi-VN')} Coin</span>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {error}
                    </div>
                  )}

                  <Button variant="primary" className="w-full justify-center" onClick={handleCreateQR} isLoading={isLoading}>
                    Tạo Mã QR Thanh Toán
                  </Button>
                </div>
              )}

              {/* Step 2: Hiển thị QR */}
              {step === 'qr' && qrData && (
                <div className="space-y-4">
                  {/* Countdown */}
                  <div className={cn('flex items-center justify-between p-3 rounded-xl text-sm border', countdown < 120 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-slate-50 border-slate-100 text-slate-600')}>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>Hết hạn sau</span>
                    </div>
                    <span className="font-mono font-bold">{formatTime(countdown)}</span>
                  </div>

                  {/* QR Code */}
                  <div className="flex flex-col items-center">
                    <div className="p-3 bg-white border-2 border-slate-100 rounded-2xl shadow-sm">
                      <Image src={qrData.qr_url} alt="QR VietQR" width={220} height={220} className="rounded-xl" />
                    </div>
                  </div>

                  {/* Bank info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <p className="text-xs text-slate-500">Ngân hàng</p>
                        <p className="text-sm font-semibold text-slate-900">{qrData.bank?.bank_id || 'Ngân hàng'} · {qrData.bank?.account_name || 'PhuongDev'}</p>
                      </div>
                      <p className="text-sm font-mono font-bold text-slate-900">{qrData.bank?.account_no || '—'}</p>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <p className="text-xs text-slate-500">Nội dung chuyển khoản</p>
                        <p className="text-sm font-mono font-bold text-slate-900">{qrData.transaction_code}</p>
                      </div>
                      <button onClick={() => handleCopy(qrData.transaction_code)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer">
                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <p className="text-xs text-slate-500">Số tiền</p>
                      </div>
                      <p className="text-sm font-bold text-rose-600">{qrData.amount.toLocaleString('vi-VN')} VND</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
                    <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', polling ? 'bg-blue-400 animate-pulse' : 'bg-blue-400')} />
                    Đang chờ xác nhận thanh toán tự động...
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => { setStep('select'); setQrData(null); }} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
                      Quay Lại
                    </button>
                    <button onClick={checkStatus} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
                      <RefreshCw className={cn('w-3.5 h-3.5', polling && 'animate-spin')} />
                      Kiểm Tra
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Thành công */}
              {step === 'success' && (
                <div className="py-4 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-emerald-50 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">Nạp Tiền Thành Công</h3>
                    <p className="text-sm text-slate-500">
                      <span className="font-semibold text-emerald-600">+{finalAmount.toLocaleString('vi-VN')} Coin</span> đã được cộng vào ví của bạn.
                    </p>
                  </div>
                  <Button variant="primary" className="w-full justify-center" onClick={handleClose}>
                    Đóng
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
