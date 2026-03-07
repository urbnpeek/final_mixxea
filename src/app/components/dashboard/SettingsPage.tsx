import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from './AuthContext';
import * as api from './api';
import { toast } from 'sonner';
import {
  User, Mail, Shield, Bell, ChevronRight, Save, Music, Radio, BookOpen,
  Check, Zap, ExternalLink, RefreshCw, CreditCard,
  Calendar, TrendingUp, Crown, Loader2, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { useCurrency } from '../mixxea/CurrencyContext';
import { TwoFactorSettings } from './TwoFactorSettings';
import { VerificationSettings } from './VerificationSettings';

// ── Plan definitions ────────────────────────────────────────────────────────
const PLANS = [
  {
    id: 'starter', name: 'Starter', priceUsd: 19, color: '#6B7280',
    icon: Music,
    features: ['Unlimited distribution', 'UPC & ISRC generation', '10 promo credits/month', 'Basic analytics', 'Smart pages', 'Email support'],
  },
  {
    id: 'growth', name: 'Growth', priceUsd: 39, color: '#7B5FFF',
    icon: TrendingUp,
    features: ['Everything in Starter', '40 promo credits/month', 'Playlist pitching (5/mo)', 'TikTok & IG UGC campaigns', 'Publishing & royalty splits', 'Playlist marketplace', 'Advanced analytics', 'Priority support'],
  },
  {
    id: 'pro', name: 'Pro', priceUsd: 149, color: '#D63DF6',
    icon: Crown,
    features: ['Everything in Growth', '120 promo credits/month', 'Multi-artist management', 'PR & press outreach', 'Meta & Google Ads', 'Dedicated account manager', 'White-label smart pages', '24/7 priority support'],
  },
];

const STATUS_COLORS: Record<string, string> = {
  active: '#10B981',
  trialing: '#00C4FF',
  past_due: '#F59E0B',
  unpaid: '#F59E0B',
  cancelled: '#FF5252',
  incomplete: '#F59E0B',
  incomplete_expired: '#FF5252',
};

export function SettingsPage() {
  const { user, token, updateUser } = useAuth();
  const { fpm, fp, currency } = useCurrency();

  const [tab, setTab] = useState<'profile' | 'account' | 'plan' | 'notifications'>('profile');
  const [saving, setSaving] = useState(false);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);

  // Subscription state
  const [subscription, setSubscription] = useState<any>(null);
  const [subLoading, setSubLoading] = useState(false);

  // Stripe health
  const [stripeHealth, setStripeHealth] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const [profile, setProfile] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    avatar: user?.avatar || '',
  });

  const [notifications, setNotifications] = useState({
    releaseUpdates: true,
    campaignAlerts: true,
    royaltyPayouts: true,
    newMessages: true,
    weeklyReport: false,
    marketingEmails: false,
  });

  // Load subscription data when Plan tab opens
  useEffect(() => {
    if (tab !== 'plan' || !token) return;
    fetchSubscription();
    fetchStripeHealth();
  }, [tab, token]);

  // Handle return from Stripe Checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('plan_success') === '1') {
      toast.success('🎉 Subscription activated! Your plan will update shortly.');
      window.history.replaceState({}, '', '/dashboard/settings');
      // Refresh after a short delay for webhook to process
      setTimeout(fetchSubscription, 3000);
    }
    if (params.get('plan_cancelled') === '1') {
      toast.error('Subscription cancelled. No charge was made.');
      window.history.replaceState({}, '', '/dashboard/settings');
    }
  }, []);

  async function fetchSubscription() {
    setSubLoading(true);
    try {
      const { subscription: sub } = await api.getSubscription(token!);
      setSubscription(sub);
    } catch { /* silently fail */ }
    finally { setSubLoading(false); }
  }

  async function fetchStripeHealth() {
    setHealthLoading(true);
    try {
      const health = await api.getStripeHealth();
      setStripeHealth(health);
    } catch { /* silently fail */ }
    finally { setHealthLoading(false); }
  }

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { user: updated } = await api.updateProfile(token!, profile);
      updateUser(updated);
      toast.success('Profile updated!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Redirect to Stripe Checkout for plan subscription
  const handleSubscribePlan = async (planId: string) => {
    if (subscribing || planId === user?.plan) return;
    setSubscribing(planId);
    try {
      const { checkoutUrl } = await api.subscribePlan(token!, {
        planId,
        successUrl: `${window.location.origin}/dashboard/settings?plan_success=1`,
        cancelUrl:  `${window.location.origin}/dashboard/settings?plan_cancelled=1`,
      });
      window.location.href = checkoutUrl;
    } catch (err: any) {
      // Fallback: if Stripe not configured, apply directly (dev mode)
      if (err.message?.includes('not configured') || err.message?.includes('503')) {
        try {
          const { user: updated } = await api.upgradePlan(token!, planId);
          updateUser({ plan: updated.plan });
          toast.success(`✅ Plan changed to ${PLANS.find(p => p.id === planId)?.name}! (Dev mode — Stripe not configured)`);
        } catch (inner: any) {
          toast.error(inner.message || 'Failed to update plan');
        }
      } else {
        toast.error(err.message || 'Failed to start checkout');
      }
      setSubscribing(null);
    }
  };

  // Open Stripe Customer Portal
  const handleManageSubscription = async () => {
    setOpeningPortal(true);
    try {
      const { portalUrl } = await api.getStripePortal(token!, {
        returnUrl: `${window.location.origin}/dashboard/settings`,
      });
      window.location.href = portalUrl;
    } catch (err: any) {
      const msg: string = err.message || 'Could not open subscription portal';
      if (msg.includes('not yet configured') || msg.includes('portal') || msg.includes('configuration')) {
        toast.error(
          '⚙️ Stripe Customer Portal not set up yet. Go to stripe.com/dashboard → Settings → Billing → Customer Portal to activate it.',
          { duration: 8000 }
        );
      } else if (msg.includes('No active subscription') || msg.includes('stripeCustomerId')) {
        toast.error('No active Stripe subscription found. Subscribe to a plan first, then manage it here.');
      } else {
        toast.error(msg);
      }
      setOpeningPortal(false);
    }
  };

  const roleIcons: Record<string, any> = { artist: Music, label: Radio, curator: BookOpen };
  const RoleIcon = roleIcons[user?.role || 'artist'] || Music;

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'account', label: 'Account', icon: Shield },
    { id: 'plan', label: 'Plan & Billing', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ] as const;

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-white/40 text-sm mt-1">Manage your account and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:w-52 flex-shrink-0">
          <div className="bg-[#111111] border border-white/[0.06] rounded-2xl overflow-hidden">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-all border-b border-white/[0.04] last:border-0 ${tab === t.id ? 'text-white bg-white/[0.05] border-l-2 border-l-[#7B5FFF]' : 'text-white/50 hover:text-white hover:bg-white/[0.03]'}`}>
                <t.icon size={15} />
                {t.label}
                <ChevronRight size={13} className={`ml-auto opacity-50 ${tab === t.id ? 'opacity-100 text-[#7B5FFF]' : ''}`} />
              </button>
            ))}
          </div>

          {/* User Card */}
          <div className="mt-4 bg-[#111111] border border-white/[0.06] rounded-2xl p-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7B5FFF] to-[#D63DF6] flex items-center justify-center mx-auto mb-3">
              <span className="text-white text-xl font-bold">{user?.name?.charAt(0)?.toUpperCase()}</span>
            </div>
            <p className="text-sm font-semibold text-white">{user?.name}</p>
            <p className="text-xs text-white/40 mt-0.5 capitalize">{user?.role}</p>
            <div className="mt-2 px-2 py-1 bg-white/[0.05] rounded-lg text-[11px] text-white/50 capitalize">{user?.plan} Plan</div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* ─── PROFILE TAB ─────────────────────────────────────────────────── */}
          {tab === 'profile' && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="bg-[#111111] border border-white/[0.06] rounded-2xl p-6 space-y-5">
              <h2 className="text-base font-semibold text-white border-b border-white/[0.06] pb-3">Profile Information</h2>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Display Name / Artist Name</label>
                <input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Email</label>
                <input value={user?.email} disabled
                  className="w-full bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-2.5 text-sm text-white/40 cursor-not-allowed" />
                <p className="text-xs text-white/30 mt-1">Email cannot be changed. Contact us at <a href="mailto:onboarding@mixxea.com" className="text-[#7B5FFF]/70 hover:text-[#7B5FFF] transition-colors">onboarding@mixxea.com</a> if needed.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Bio</label>
                <textarea value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} rows={4}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/50 resize-none"
                  placeholder="Tell us about yourself, your music style, achievements..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Role</label>
                <div className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/[0.05]">
                  <RoleIcon size={16} className="text-[#7B5FFF]" />
                  <span className="text-sm text-white capitalize">{user?.role}</span>
                  <a href="mailto:onboarding@mixxea.com" className="ml-auto text-xs text-[#7B5FFF]/50 hover:text-[#7B5FFF] transition-colors">onboarding@mixxea.com</a>
                </div>
              </div>
              <button onClick={handleSaveProfile} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-white text-sm hover:opacity-90 disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}>
                <Save size={14} /> {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </motion.div>
          )}

          {/* ─── ACCOUNT TAB ─────────────────────────────────────────────────── */}
          {tab === 'account' && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="bg-[#111111] border border-white/[0.06] rounded-2xl p-6">
                <h2 className="text-base font-semibold text-white mb-4 border-b border-white/[0.06] pb-3">Account Security</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Email Address</label>
                    <input value={user?.email} disabled className="w-full bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-2.5 text-sm text-white/40 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Member Since</label>
                    <input value={user?.joinedAt ? new Date(user.joinedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'} disabled className="w-full bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-2.5 text-sm text-white/40 cursor-not-allowed" />
                  </div>
                </div>
              </div>
              <div className="bg-[#111111] border border-[#FF5252]/20 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-white mb-1">Danger Zone</h3>
                <p className="text-xs text-white/40 mb-4">Irreversible actions that affect your account</p>
                <div className="flex gap-3">
                  <button className="px-4 py-2 rounded-xl text-xs font-medium text-[#FF5252] border border-[#FF5252]/30 hover:bg-[#FF5252]/10 transition-all">Request Data Export</button>
                  <button className="px-4 py-2 rounded-xl text-xs font-medium text-[#FF5252] border border-[#FF5252]/30 hover:bg-[#FF5252]/10 transition-all">Close Account</button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── PLAN & BILLING TAB ───────────────────────────────────────────── */}
          {tab === 'plan' && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">

              {/* Stripe health banner */}
              {!healthLoading && stripeHealth && (
                <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${stripeHealth.keyValid ? 'border-[#10B981]/25 bg-[#10B981]/05' : 'border-[#F59E0B]/25 bg-[#F59E0B]/05'}`}>
                  {stripeHealth.keyValid
                    ? <CheckCircle2 size={15} className="text-[#10B981] flex-shrink-0 mt-0.5" />
                    : <AlertTriangle size={15} className="text-[#F59E0B] flex-shrink-0 mt-0.5" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${stripeHealth.keyValid ? 'text-[#10B981]' : 'text-[#F59E0B]'}`}>
                      {stripeHealth.keyValid ? `Stripe ${stripeHealth.mode === 'live' ? '🔴 Live' : '🧪 Test'} Mode Active` : 'Stripe Not Fully Configured'}
                    </p>
                    <p className="text-[11px] text-white/40 mt-0.5">{stripeHealth.message}</p>
                  </div>
                  {stripeHealth.keyValid && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {stripeHealth.paymentMethods?.map((m: string) => (
                        <span key={m} className="text-[9px] px-1.5 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] font-medium uppercase tracking-wide">{m.replace('_', ' ')}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Current subscription card */}
              <div className="bg-[#111111] border border-white/[0.06] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                  <h2 className="text-base font-semibold text-white">Subscription</h2>
                  <div className="flex items-center gap-2">
                    {subscription?.status && (
                      <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-full capitalize"
                        style={{ background: `${STATUS_COLORS[subscription.status] || '#6B7280'}20`, color: STATUS_COLORS[subscription.status] || '#6B7280' }}
                      >
                        {subscription.status}
                      </span>
                    )}
                    <span className="text-xs px-2 py-0.5 rounded-lg bg-[#7B5FFF]/20 text-[#7B5FFF] font-medium capitalize">{user?.plan}</span>
                  </div>
                </div>

                {subLoading ? (
                  <div className="flex items-center gap-2 text-xs text-white/40 mt-2">
                    <Loader2 size={12} className="animate-spin" /> Loading subscription details…
                  </div>
                ) : subscription ? (
                  <div className="mt-3 space-y-2">
                    {subscription.currentPeriodEnd && (
                      <div className="flex items-center gap-2 text-xs text-white/50">
                        <Calendar size={12} className="text-white/30" />
                        {subscription.cancelAtPeriodEnd
                          ? <span className="text-[#F59E0B]">Cancels on {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                          : `Renews on ${new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                        }
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-white/50">
                      <CreditCard size={12} className="text-white/30" />
                      Managed via Stripe · <button onClick={handleManageSubscription} disabled={openingPortal} className="text-[#7B5FFF] hover:text-[#D63DF6] underline underline-offset-2 transition-colors disabled:opacity-60">{openingPortal ? 'Opening…' : 'Manage subscription'}</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-white/40 mt-1">
                    {user?.plan === 'starter' ? 'You are on the free Starter plan.' : <>Subscription details not found — email <a href="mailto:onboarding@mixxea.com" className="text-[#7B5FFF]/70 hover:text-[#7B5FFF] transition-colors">onboarding@mixxea.com</a> if billing is active.</>}
                  </p>
                )}

                {/* Manage Subscription Portal button */}
                {subscription?.subscriptionId && (
                  <button
                    onClick={handleManageSubscription}
                    disabled={openingPortal}
                    className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white border border-white/10 hover:border-white/20 hover:bg-white/[0.05] transition-all disabled:opacity-60"
                  >
                    {openingPortal ? <Loader2 size={12} className="animate-spin" /> : <ExternalLink size={12} />}
                    {openingPortal ? 'Opening Stripe Portal…' : 'Manage Subscription · Cancel · Change Plan'}
                  </button>
                )}

                {/* Refresh button */}
                <button onClick={fetchSubscription} disabled={subLoading} className="mt-2 flex items-center gap-1.5 text-[11px] text-white/25 hover:text-white/50 transition-colors disabled:opacity-50">
                  <RefreshCw size={10} className={subLoading ? 'animate-spin' : ''} /> Refresh status
                </button>
              </div>

              {/* Plan cards */}
              <div className="grid sm:grid-cols-3 gap-4">
                {PLANS.map(plan => {
                  const isCurrent = user?.plan === plan.id;
                  const isLower = (plan.id === 'starter' && ['growth', 'pro'].includes(user?.plan || ''))
                    || (plan.id === 'growth' && user?.plan === 'pro');
                  const PlanIcon = plan.icon;
                  return (
                    <div key={plan.id} className={`bg-[#111111] border rounded-2xl p-5 relative transition-all ${isCurrent ? 'border-[#7B5FFF]/50 shadow-[0_0_20px_rgba(123,95,255,0.1)]' : 'border-white/[0.06] hover:border-white/15'}`}>
                      {isCurrent && (
                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#7B5FFF] flex items-center justify-center">
                          <Check size={11} className="text-white" />
                        </div>
                      )}
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${plan.color}20` }}>
                        <PlanIcon size={16} style={{ color: plan.color }} />
                      </div>
                      <h3 className="font-bold text-white mb-0.5">{plan.name}</h3>
                      <p className="text-sm font-bold mb-1" style={{ color: plan.color }}>{fpm(plan.priceUsd)}</p>
                      {currency.code !== 'USD' && (
                        <p className="text-[10px] text-white/25 mb-3">≈ ${plan.priceUsd} USD/mo</p>
                      )}
                      <div className="space-y-1.5 mb-4 mt-3">
                        {plan.features.map(f => (
                          <div key={f} className="flex items-center gap-2 text-xs text-white/50">
                            <Check size={10} className="text-[#10B981] flex-shrink-0" />{f}
                          </div>
                        ))}
                      </div>
                      {isCurrent ? (
                        <div className="w-full py-2 rounded-xl text-xs font-semibold text-center text-white/40 bg-white/[0.05]">
                          Current Plan
                        </div>
                      ) : isLower ? (
                        <button
                          onClick={handleManageSubscription}
                          disabled={openingPortal}
                          className="w-full py-2 rounded-xl text-xs font-semibold text-center text-white/50 border border-white/10 hover:border-white/20 hover:bg-white/[0.05] transition-all disabled:opacity-60"
                        >
                          Downgrade via Portal
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSubscribePlan(plan.id)}
                          disabled={!!subscribing}
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
                          style={{ background: `linear-gradient(135deg, ${plan.color}, ${plan.id === 'growth' ? '#D63DF6' : '#FF5252'})` }}
                        >
                          {subscribing === plan.id
                            ? <><Loader2 size={11} className="animate-spin" /> Redirecting to Stripe…</>
                            : <><Zap size={11} /> Upgrade — {fpm(plan.priceUsd)}</>
                          }
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Payment methods + security info */}
              <div className="bg-[#111111] border border-white/[0.06] rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield size={13} className="text-[#10B981]" />
                  <p className="text-xs font-semibold text-white/60">Secure Payments via Stripe</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { icon: '💳', label: 'All major cards' },
                    { icon: '🍎', label: 'Apple Pay' },
                    { icon: '🤖', label: 'Google Pay' },
                    { icon: '🔗', label: 'Link (saved cards)' },
                    { icon: '🏦', label: 'Bank transfer' },
                  ].map(m => (
                    <div key={m.label} className="flex items-center gap-1.5 text-[11px] text-white/40 px-2.5 py-1 bg-white/[0.03] rounded-lg border border-white/[0.05]">
                      <span>{m.icon}</span>{m.label}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-white/25 mt-3">
                  All plans billed monthly · Cancel anytime via the Stripe Portal · 256-bit SSL encryption
                  {currency.code !== 'USD' && ' · Prices shown are approximate — all charges processed in USD'}
                </p>
              </div>

              {/* Feature comparison note */}
              <div className="bg-[#111111] border border-white/[0.06] rounded-2xl p-4">
                <p className="text-xs text-white/40 text-center leading-relaxed">
                  <strong className="text-white/60">Starter:</strong> Distribution + basic promo &nbsp;·&nbsp;
                  <strong className="text-white/60">Growth:</strong> + Marketplace, Publishing, TikTok/IG/YouTube &nbsp;·&nbsp;
                  <strong className="text-white/60">Pro:</strong> + PR, Meta/Google Ads, multi-artist
                </p>
              </div>

              {/* 2FA + Verification */}
              <TwoFactorSettings />
              <VerificationSettings />
            </motion.div>
          )}

          {/* ─── NOTIFICATIONS TAB ───────────────────────────────────────────── */}
          {tab === 'notifications' && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="bg-[#111111] border border-white/[0.06] rounded-2xl p-6">
              <h2 className="text-base font-semibold text-white mb-4 border-b border-white/[0.06] pb-3">Notification Preferences</h2>
              <div className="space-y-4">
                {[
                  { key: 'releaseUpdates', label: 'Release Status Updates', desc: 'Get notified when your release status changes' },
                  { key: 'campaignAlerts', label: 'Campaign Alerts', desc: 'Updates on your active promotion campaigns' },
                  { key: 'royaltyPayouts', label: 'Royalty Payouts', desc: 'When royalties are collected and paid out' },
                  { key: 'newMessages', label: 'New Messages', desc: 'Support ticket replies and team messages' },
                  { key: 'weeklyReport', label: 'Weekly Analytics Report', desc: 'Weekly summary of your streams and revenue' },
                  { key: 'marketingEmails', label: 'Marketing & Promotions', desc: 'Tips, new features, and promotional offers' },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0">
                    <div>
                      <p className="text-sm font-medium text-white">{label}</p>
                      <p className="text-xs text-white/40 mt-0.5">{desc}</p>
                    </div>
                    <button
                      onClick={() => setNotifications(n => ({ ...n, [key]: !n[key as keyof typeof n] }))}
                      className={`relative w-11 h-6 rounded-full transition-all flex-shrink-0 ${notifications[key as keyof typeof notifications] ? '' : 'bg-white/[0.1]'}`}
                      style={notifications[key as keyof typeof notifications] ? { background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' } : {}}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${notifications[key as keyof typeof notifications] ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={() => toast.success('Notification preferences saved!')}
                className="mt-4 flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-white text-sm hover:opacity-90 transition-all"
                style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}>
                <Save size={14} /> Save Preferences
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}