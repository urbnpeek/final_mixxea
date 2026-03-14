import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './AuthContext';
import * as api from './api';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router';
import {
  Zap, TrendingUp, Star, ArrowUpRight, ArrowDownRight,
  Crown, Rocket, Shield, Check, ExternalLink, CreditCard,
  Loader2, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { useCurrency } from '../mixxea/CurrencyContext';

const PACKAGES = [
  {
    id: 'basic', name: 'Basic Pack', credits: 100, bonusCredits: 0, price: 5.00, color: '#6B7280',
    icon: Star, perks: ['100 credits', '~$0.05/credit', 'Pay as you go', 'All services unlocked'],
  },
  {
    id: 'value', name: 'Value Pack', credits: 500, bonusCredits: 25, price: 20.00, color: '#7B5FFF', popular: true,
    icon: Rocket, perks: ['500 credits', 'Best value', '+25 bonus credits', 'Priority support'],
  },
  {
    id: 'creator', name: 'Creator Pack', credits: 2000, bonusCredits: 100, price: 60.00, color: '#D63DF6',
    icon: Crown, perks: ['2,000 credits', 'For power users', '+100 bonus credits', 'Dedicated manager'],
  },
];

const CREDIT_COSTS = [
  // ── Promotion services ──────────────────────────────────────────────────────
  { service: 'Spotify Growth',      credits: 140,  icon: '🎵', category: 'Promotion' },
  { service: 'Playlist Pitching',   credits: 500,  icon: '🎸', category: 'Promotion' },
  { service: 'TikTok UGC Campaign', credits: 800,  icon: '📱', category: 'Promotion' },
  { service: 'Instagram UGC',       credits: 600,  icon: '📸', category: 'Promotion' },
  { service: 'YouTube Ads',         credits: 900,  icon: '📺', category: 'Promotion' },
  { service: 'PR & Press Coverage', credits: 1300, icon: '📰', category: 'Promotion' },
  { service: 'Meta / Google Ads',   credits: 800,  icon: '🎯', category: 'Promotion' },
  { service: 'Sync Licensing',      credits: 350,  icon: '🎬', category: 'Promotion' },
  // ── Creative Studio AI ──────────────────────────────────────────────────────
  { service: 'AI Caption',          credits: 2,    icon: '✍️',  category: 'Creative AI' },
  { service: 'AI Hashtag Set',      credits: 1,    icon: '#️⃣',  category: 'Creative AI' },
  { service: 'AI Image (DALL·E 3)', credits: 15,   icon: '🎨', category: 'Creative AI' },
  { service: 'AI Video Script',     credits: 10,   icon: '🎬', category: 'Creative AI' },
  { service: 'AI Content Calendar', credits: 20,   icon: '📅', category: 'Creative AI' },
  { service: 'Extra Post',          credits: 2,    icon: '📤', category: 'Creative AI' },
  { service: 'Extra Social Account',credits: 10,   icon: '🔗', category: 'Creative AI' },
];

export function CreditsPage() {
  const { token, user, updateUser } = useAuth();
  const { fp, currency } = useCurrency();
  const [searchParams, setSearchParams] = useSearchParams();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [stripeHealth, setStripeHealth] = useState<any>(null);

  // Handle Stripe return
  useEffect(() => {
    const success = searchParams.get('success');
    const cancelled = searchParams.get('cancelled');

    if (success === '1') {
      toast.success('🎉 Payment successful! Credits have been added to your account.');
      setSearchParams({});
      setTimeout(() => {
        if (token) {
          api.getCredits(token).then(d => {
            setBalance(d.balance || 0);
            setTransactions(d.transactions || []);
            updateUser({ credits: d.balance || 0 });
          });
        }
      }, 2000);
    }
    if (cancelled === '1') {
      toast.error('Payment cancelled. No charges were made.');
      setSearchParams({});
    }
  }, [searchParams]);

  useEffect(() => {
    if (!token) return;
    api.getCredits(token).then(d => {
      setBalance(d.balance || 0);
      setTransactions(d.transactions || []);
    }).catch(() => {}).finally(() => setLoading(false));

    // Check Stripe status
    api.getStripeHealth().then(h => setStripeHealth(h)).catch(() => {});
  }, [token]);

  const handleStripeCheckout = async () => {
    if (!selectedPackage) return;
    setPurchasing(true);
    try {
      const successUrl = `${window.location.origin}/dashboard/credits?success=1`;
      const cancelUrl = `${window.location.origin}/dashboard/credits?cancelled=1`;
      const { checkoutUrl } = await api.createStripeCheckout(token!, {
        packageId: selectedPackage.id,
        successUrl,
        cancelUrl,
      });
      window.location.href = checkoutUrl;
    } catch (err: any) {
      // Stripe not configured — fall back to dev mode
      if (err.message?.includes('not configured') || err.message?.includes('503')) {
        await handleDevPurchase();
      } else {
        toast.error(err.message || 'Checkout failed');
        setPurchasing(false);
      }
    }
  };

  const handleDevPurchase = async () => {
    if (!selectedPackage) return;
    try {
      const totalCredits = selectedPackage.credits + (selectedPackage.bonusCredits || 0);
      const { balance: newBalance } = await api.purchaseCredits(token!, { amount: totalCredits, packageName: selectedPackage.name });
      setBalance(newBalance);
      updateUser({ credits: newBalance });
      await api.getCredits(token!).then(d => setTransactions(d.transactions || []));
      toast.success(`✅ ${totalCredits.toLocaleString()} credits added! (Dev mode — Stripe not configured)`);
      setSelectedPackage(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPurchasing(false);
    }
  };

  const totalSpent = transactions.filter(t => t.type === 'use').reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalPurchased = transactions.filter(t => t.type === 'purchase' || t.type === 'admin_grant').reduce((s, t) => s + t.amount, 0);
  const totalBonuses = transactions.filter(t => t.type === 'bonus').reduce((s, t) => s + t.amount, 0);

  const stripeOk = stripeHealth?.keyValid;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Credits</h1>
        <p className="text-white/40 text-sm mt-1">Purchase and manage your MIXXEA promotion credits</p>
      </div>

      {/* Stripe Status Banner */}
      {stripeHealth && (
        <div className={`mb-5 p-3.5 rounded-xl border flex items-start gap-3 ${stripeOk ? 'border-[#10B981]/20 bg-[#10B981]/05' : 'border-[#F59E0B]/20 bg-[#F59E0B]/05'}`}>
          {stripeOk
            ? <CheckCircle2 size={14} className="text-[#10B981] flex-shrink-0 mt-0.5" />
            : <AlertTriangle size={14} className="text-[#F59E0B] flex-shrink-0 mt-0.5" />
          }
          <div className="flex-1">
            <p className={`text-xs font-semibold ${stripeOk ? 'text-[#10B981]' : 'text-[#F59E0B]'}`}>
              {stripeOk
                ? `Stripe ${stripeHealth.mode === 'live' ? '🔴 Live' : '🧪 Test'} Mode · All payment methods enabled`
                : 'Stripe not configured — payments in dev mode'}
            </p>
            {stripeOk && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {['💳 Cards', '🍎 Apple Pay', '🤖 Google Pay', '🔗 Link', '🏦 Bank transfer'].map(m => (
                  <span key={m} className="text-[9px] px-1.5 py-0.5 rounded bg-[#10B981]/10 text-[#10B981] font-medium">{m}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Balance Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="mb-6 p-6 rounded-2xl relative overflow-hidden border border-[#7B5FFF]/20"
        style={{ background: 'linear-gradient(135deg, #7B5FFF15, #D63DF615)' }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#7B5FFF]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm text-white/50 mb-1">Current Balance</p>
              <div className="flex items-end gap-3">
                <span className="text-5xl font-bold text-white">{loading ? '...' : balance.toLocaleString()}</span>
                <div className="flex items-center gap-1.5 mb-2">
                  <Zap size={18} className="text-[#00C4FF]" />
                  <span className="text-lg text-white/60">credits</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm text-white/50"><ArrowUpRight size={14} className="text-[#10B981]" />{totalPurchased.toLocaleString()} purchased</div>
              <div className="flex items-center gap-2 text-sm text-white/50"><ArrowDownRight size={14} className="text-[#FF5252]" />{totalSpent.toLocaleString()} used</div>
              <div className="flex items-center gap-2 text-sm text-white/50"><Star size={14} className="text-[#F59E0B]" />{totalBonuses.toLocaleString()} bonus</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-white/30 mb-1.5">
              <span>Credits used</span>
              <span>{totalSpent} credits</span>
            </div>
            <div className="h-2 bg-white/[0.08] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((totalSpent / Math.max(totalPurchased + totalBonuses, 1)) * 100, 100)}%`, background: 'linear-gradient(90deg, #7B5FFF, #D63DF6)' }} />
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Packages */}
        <div className="lg:col-span-2">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <CreditCard size={15} className="text-[#7B5FFF]" /> Buy Credits
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            {PACKAGES.map(pkg => {
              const totalCr = pkg.credits + (pkg.bonusCredits || 0);
              return (
                <motion.div key={pkg.id} whileHover={{ y: -2 }}
                  onClick={() => setSelectedPackage(pkg)}
                  className={`relative bg-[#111111] border rounded-2xl p-5 cursor-pointer transition-all ${selectedPackage?.id === pkg.id ? 'border-[#7B5FFF] shadow-[0_0_20px_rgba(123,95,255,0.2)]' : 'border-white/[0.06] hover:border-white/20'}`}
                >
                  {pkg.popular && (
                    <div className="absolute top-0 right-4 -translate-y-1/2 px-3 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}>
                      Most Popular
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${pkg.color}20` }}>
                      <pkg.icon size={18} style={{ color: pkg.color }} />
                    </div>
                    {selectedPackage?.id === pkg.id && (
                      <div className="w-5 h-5 rounded-full bg-[#7B5FFF] flex items-center justify-center"><Check size={12} className="text-white" /></div>
                    )}
                  </div>
                  <h3 className="font-bold text-white mb-0.5">{pkg.name}</h3>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-2xl font-bold text-white">{fp(pkg.price)}</span>
                    {currency.code !== 'USD' && (
                      <span className="text-xs text-white/25">(≈${pkg.price})</span>
                    )}
                    <div className="flex items-center gap-1">
                      <Zap size={12} style={{ color: pkg.color }} />
                      <span className="text-sm font-bold" style={{ color: pkg.color }}>{totalCr.toLocaleString()}</span>
                      {pkg.bonusCredits > 0 && (
                        <span className="text-xs text-[#10B981] font-semibold">({pkg.credits}+{pkg.bonusCredits})</span>
                      )}
                      <span className="text-xs text-white/30">cr</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {pkg.perks.map(p => (
                      <div key={p} className="flex items-center gap-2 text-xs text-white/50">
                        <Check size={11} className="text-[#10B981] flex-shrink-0" />{p}
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Checkout CTA */}
          <AnimatePresence>
            {selectedPackage && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-[#111111] border border-[#7B5FFF]/30 rounded-2xl flex items-center justify-between gap-4 flex-wrap"
              >
                <div>
                  <p className="text-sm font-semibold text-white">{selectedPackage.name}</p>
                  <p className="text-xs text-white/50">
                    {(selectedPackage.credits + (selectedPackage.bonusCredits || 0)).toLocaleString()} total credits · {fp(selectedPackage.price)}{currency.code !== 'USD' ? ` (≈$${selectedPackage.price} USD)` : ''}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setSelectedPackage(null)} className="px-4 py-2 rounded-xl text-sm text-white/50 hover:text-white bg-white/[0.05] transition-all">Cancel</button>
                  <button
                    onClick={handleStripeCheckout}
                    disabled={purchasing}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-all"
                    style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}
                  >
                    {purchasing ? (
                      <><Loader2 size={14} className="animate-spin" /> Processing...</>
                    ) : (
                      <><CreditCard size={14} /> Pay {fp(selectedPackage.price)} with Stripe<ExternalLink size={11} /></>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Credit costs reference */}
          <div className="mt-6 bg-[#111111] border border-white/[0.06] rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Shield size={14} className="text-[#00C4FF]" /> Credit Cost Reference</h3>
            <div className="grid sm:grid-cols-2 gap-2">
              {CREDIT_COSTS.map(item => (
                <div key={item.service} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02]">
                  <span className="text-base">{item.icon}</span>
                  <span className="text-xs text-white/60 flex-1">{item.service}</span>
                  <div className="flex items-center gap-1">
                    <Zap size={10} className="text-[#00C4FF]" />
                    <span className="text-sm font-extrabold text-white">{item.credits.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div>
          <h2 className="text-base font-semibold text-white mb-4">Transaction History</h2>
          <div className="bg-[#111111] border border-white/[0.06] rounded-2xl overflow-hidden">
            {loading ? (
              <div className="p-4 space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-12 bg-white/[0.03] rounded-xl animate-pulse" />)}</div>
            ) : transactions.length === 0 ? (
              <div className="p-6 text-center">
                <Zap size={24} className="text-white/20 mx-auto mb-2" />
                <p className="text-white/40 text-sm">No transactions yet</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04] max-h-[600px] overflow-y-auto">
                {transactions.map((txn: any) => {
                  const isPositive = txn.amount > 0;
                  const typeColors: Record<string, string> = {
                    bonus: '#F59E0B',
                    purchase: '#10B981',
                    admin_grant: '#00C4FF',
                    use: '#FF5252',
                    admin_deduct: '#FF5252',
                  };
                  const color = typeColors[txn.type] || (isPositive ? '#10B981' : '#FF5252');
                  return (
                    <div key={txn.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-all">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
                        {isPositive ? <ArrowUpRight size={14} style={{ color }} /> : <ArrowDownRight size={14} style={{ color }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{txn.description}</p>
                        <p className="text-[11px] text-white/30">{new Date(txn.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <span className="text-sm font-bold flex-shrink-0" style={{ color }}>
                        {isPositive ? '+' : ''}{txn.amount}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}