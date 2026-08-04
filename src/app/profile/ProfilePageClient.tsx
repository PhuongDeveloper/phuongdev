/* ==========================================================================
   ProfilePageClient - Trang hồ sơ người dùng
   Thiết kế nhất quán với design system (slate + rose, không emoji)
   ========================================================================== */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Wallet, History, ShoppingBag, Copy, Check,
  Coins, Clock, CheckCircle2, Key, RefreshCw,
  LogOut, TrendingUp, ArrowDownToLine,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import WalletModal from './WalletModal';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { cn } from '@/utils/helpers';
import type { UserProfile, Order, Transaction } from '@/lib/types/database';

const TABS = [
  { id: 'profile', label: 'Hồ Sơ', icon: User },
  { id: 'wallet', label: 'Ví & Nạp Tiền', icon: Wallet },
  { id: 'orders', label: 'Lịch Sử Mua', icon: History },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer" title="Sao chép">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

const txStatusConfig = {
  completed: { label: 'Thành công', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2, iconCls: 'text-emerald-500' },
  pending:   { label: 'Đang chờ',   cls: 'bg-amber-50 text-amber-700 border-amber-200',     icon: Clock,         iconCls: 'text-amber-500' },
  failed:    { label: 'Thất bại',   cls: 'bg-red-50 text-red-700 border-red-200',            icon: ArrowDownToLine, iconCls: 'text-red-500' },
  expired:   { label: 'Hết hạn',   cls: 'bg-slate-50 text-slate-500 border-slate-200',      icon: Clock,         iconCls: 'text-slate-400' },
};

const orderStatusConfig = {
  completed: { label: 'Hoàn thành', cls: 'bg-emerald-50 text-emerald-700' },
  pending:   { label: 'Đang xử lý', cls: 'bg-amber-50 text-amber-700' },
  failed:    { label: 'Thất bại',   cls: 'bg-red-50 text-red-700' },
};

const paymentMethodLabel: Record<string, string> = {
  coin: 'Thanh toán ví',
  bank_qr: 'Chuyển khoản',
  free_trial: 'Miễn phí',
};

export default function ProfilePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [walletOpen, setWalletOpen] = useState(false);

  const supabase = createClient();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/'); return; }

    const [profileRes, ordersRes, txRes] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('id', user.id).single(),
      supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
    ]);

    setProfile(profileRes.data);
    setOrders(ordersRes.data || []);
    setTransactions(txRes.data || []);
    setIsLoading(false);
  }, []);

  useEffect(() => { loadData(); }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4">

          {/* Profile Header Card */}
          <Card variant="solid" padding="none" className="mb-6 overflow-hidden">
            <div className="bg-gradient-to-r from-rose-600 to-red-500 p-6 text-white">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-xl font-bold flex-shrink-0">
                    {(profile?.display_name || profile?.email || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <h1 className="text-xl font-bold">{profile?.display_name || 'Người dùng'}</h1>
                    <p className="text-rose-200 text-sm">{profile?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-white/15 border border-white/20 rounded-xl px-4 py-2.5 text-center">
                    <div className="flex items-center gap-1.5 text-rose-100 text-xs mb-1">
                      <Coins className="w-3.5 h-3.5" />
                      <span>Số dư ví</span>
                    </div>
                    <div className="text-xl font-black">{(profile?.coin_balance ?? 0).toLocaleString('vi-VN')}</div>
                    <div className="text-rose-200 text-xs">VND</div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setWalletOpen(true)}
                    className="bg-white text-rose-600 border-white hover:bg-rose-50"
                  >
                    Nạp Tiền
                  </Button>
                </div>
              </div>
            </div>
            {/* Stats row */}
            <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
              {[
                { label: 'Đơn hoàn thành', value: orders.filter(o => o.status === 'completed').length },
                { label: 'Tổng đã nạp (VND)', value: (profile?.total_recharged ?? 0).toLocaleString('vi-VN') },
                { label: 'Tổng đã chi (VND)', value: (profile?.total_spent ?? 0).toLocaleString('vi-VN') },
              ].map((stat) => (
                <div key={stat.label} className="py-3 px-4 text-center">
                  <div className="text-base font-bold text-slate-900">{stat.value}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Tabs */}
          <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-slate-100 mb-6">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer',
                    tab === t.id
                      ? 'bg-gradient-to-r from-rose-600 to-red-500 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {/* Profile tab */}
              {tab === 'profile' && (
                <Card variant="solid" padding="lg" className="space-y-5">
                  <h2 className="text-base font-semibold text-slate-900">Thông Tin Cá Nhân</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { label: 'Tên hiển thị', value: profile?.display_name || '—' },
                      { label: 'Email', value: profile?.email || '—' },
                      { label: 'Ngày tham gia', value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('vi-VN') : '—' },
                    ].map((item) => (
                      <div key={item.label} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-400 mb-1">{item.label}</p>
                        <p className="text-sm font-semibold text-slate-900">{item.value}</p>
                      </div>
                    ))}
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-400 mb-1">Số dư ví</p>
                      <div className="flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-rose-500" />
                        <span className="text-sm font-bold text-rose-600">{(profile?.coin_balance ?? 0).toLocaleString('vi-VN')}</span>
                        <span className="text-xs text-slate-400">VND</span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-slate-500 hover:text-red-600 transition-colors cursor-pointer">
                      <LogOut className="w-4 h-4" /> Đăng xuất
                    </button>
                  </div>
                </Card>
              )}

              {/* Wallet tab */}
              {tab === 'wallet' && (
                <Card variant="solid" padding="lg">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-base font-semibold text-slate-900">Lịch Sử Nạp Tiền</h2>
                    <Button variant="primary" size="sm" onClick={() => setWalletOpen(true)} icon={<Coins className="w-3.5 h-3.5" />}>
                      Nạp Tiền
                    </Button>
                  </div>
                  {transactions.length === 0 ? (
                    <div className="text-center py-12">
                      <TrendingUp className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                      <p className="text-sm text-slate-400">Chưa có giao dịch nào</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {transactions.map((tx) => {
                        const cfg = txStatusConfig[tx.status] || txStatusConfig.pending;
                        const Icon = cfg.icon;
                        return (
                          <div key={tx.id} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-white rounded-lg border border-slate-100">
                                <Icon className={cn('w-4 h-4', cfg.iconCls)} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-mono font-semibold text-slate-800">{tx.transaction_code}</span>
                                  <CopyButton text={tx.transaction_code} />
                                </div>
                                <p className="text-xs text-slate-400">{new Date(tx.created_at).toLocaleString('vi-VN')}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={cn('text-sm font-bold', tx.status === 'completed' ? 'text-emerald-600' : 'text-slate-500')}>
                                +{tx.amount.toLocaleString('vi-VN')}
                              </p>
                              <span className={cn('text-xs px-2 py-0.5 rounded-full border', cfg.cls)}>{cfg.label}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              )}

              {/* Orders tab */}
              {tab === 'orders' && (
                <Card variant="solid" padding="lg">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-base font-semibold text-slate-900">Lịch Sử Mua Hàng</h2>
                    <button onClick={loadData} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer" title="Làm mới">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>

                  {orders.length === 0 ? (
                    <div className="text-center py-12">
                      <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                      <p className="text-sm text-slate-400">Chưa có đơn hàng nào</p>
                      <a href="/store" className="mt-2 inline-block text-rose-500 text-sm hover:underline">Khám phá cửa hàng</a>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orders.map((order) => {
                        const cfg = orderStatusConfig[order.status] || orderStatusConfig.pending;
                        return (
                          <div key={order.id} className="border border-slate-100 rounded-xl p-4 hover:border-slate-200 transition-colors">
                            <div className="flex items-start justify-between flex-wrap gap-2 mb-2">
                              <div>
                                <h3 className="text-sm font-semibold text-slate-900">{order.product_title}</h3>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', cfg.cls)}>{cfg.label}</span>
                                  <span className="text-xs text-slate-400">{paymentMethodLabel[order.payment_method] || order.payment_method}</span>
                                  {order.amount > 0 && (
                                    <span className="text-xs font-semibold text-rose-600">{order.amount.toLocaleString('vi-VN')} VND</span>
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-slate-400">{new Date(order.created_at).toLocaleString('vi-VN')}</p>
                            </div>

                            {order.status === 'completed' && order.key_value && (
                              <div className="mt-3 pt-3 border-t border-slate-100">
                                <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                                  <Key className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                  <span className="font-mono text-sm font-semibold text-slate-800 flex-1 break-all">{order.key_value}</span>
                                  <CopyButton text={order.key_value} />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <WalletModal isOpen={walletOpen} onClose={() => setWalletOpen(false)} onSuccess={loadData} />
    </>
  );
}
