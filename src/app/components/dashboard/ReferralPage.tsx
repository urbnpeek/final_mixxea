// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — Feature 1: Referral / Affiliate Program
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from './AuthContext';
import * as api from './api';
import { toast } from 'sonner';
import { Copy, Check, Users, Gift, TrendingUp, Zap, Share2, ExternalLink, Star } from 'lucide-react';

export function ReferralPage() {
  const { token, user } = useAuth();
  const [referral, setReferral] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) return;
    Promise.all([api.getReferral(token), api.getReferralLeaderboard(token)])
      .then(([r, l]) => { setReferral(r.referral); setLeaderboard(l.leaderboard || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const copyLink = () => {
    if (!referral?.link) return;
    navigator.clipboard.writeText(referral.link);
    setCopied(true); toast.success('Referral link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnTwitter = () => {
    const text = encodeURIComponent(`I'm using MIXXEA to distribute my music to 70+ streaming platforms & run promo campaigns. Join me and get 25 free credits: ${referral?.link}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  const tiers = [
    { label: 'Starter', min: 0,  max: 4,  reward: '50 credits/referral', color: '#7B5FFF' },
    { label: 'Pro',     min: 5,  max: 14, reward: '75 credits/referral', color: '#D63DF6' },
    { label: 'Elite',   min: 15, max: 999, reward: '100 credits + 5% revenue share', color: '#FF5252' },
  ];

  const currentReferrals = referral?.totalReferrals || 0;
  const currentTier = tiers.find(t => currentReferrals >= t.min && currentReferrals <= t.max) || tiers[0];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-[#7B5FFF] border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white mb-1">Referral Program</h1>
        <p className="text-white/40 text-sm">Invite artists to MIXXEA. Earn credits for every signup.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Referrals', value: referral?.totalReferrals || 0, icon: Users, color: '#7B5FFF' },
          { label: 'Credits Earned', value: referral?.creditsEarned || 0, icon: Zap, color: '#00C4FF' },
          { label: 'Current Tier', value: currentTier.label, icon: Star, color: '#D63DF6' },
        ].map(stat => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-white/40">{stat.label}</span>
              <stat.icon size={16} style={{ color: stat.color }} />
            </div>
            <div className="text-2xl font-black text-white">{stat.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Referral Link */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Gift size={16} className="text-[#D63DF6]" />
          <h2 className="text-base font-bold text-white">Your Referral Link</h2>
        </div>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 bg-[#050505] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white/60 font-mono truncate">
            {referral?.link || 'Loading…'}
          </div>
          <button onClick={copyLink}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
            {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={shareOnTwitter}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#050505] border border-white/[0.08] rounded-xl text-sm text-white/60 hover:text-white transition-all">
            <Share2 size={13} /> Share on X
          </button>
          <div className="text-xs text-white/30">
            They get <span className="text-[#10B981] font-semibold">25 free credits</span> · You earn <span className="text-[#00C4FF] font-semibold">50 credits</span>
          </div>
        </div>
      </motion.div>

      {/* Tier Progress */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp size={16} className="text-[#00C4FF]" />
          <h2 className="text-base font-bold text-white">Reward Tiers</h2>
        </div>
        <div className="space-y-3">
          {tiers.map((tier, i) => {
            const isActive = tier.label === currentTier.label;
            const isPast = i < tiers.indexOf(currentTier);
            return (
              <div key={tier.label}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isActive ? 'border-[#7B5FFF]/40' : 'border-white/[0.05]'}`}
                style={isActive ? { background: 'rgba(123,95,255,0.08)' } : {}}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black"
                    style={{ background: isActive ? tier.color : '#1a1a1a', color: isActive ? '#fff' : '#555' }}>
                    {isPast ? '✓' : i + 1}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{tier.label} Tier</div>
                    <div className="text-xs text-white/40">{tier.min}–{tier.max < 999 ? tier.max : '∞'} referrals</div>
                  </div>
                </div>
                <div className="text-sm font-semibold" style={{ color: tier.color }}>{tier.reward}</div>
                {isActive && <span className="text-[10px] text-white bg-[#7B5FFF] px-2 py-0.5 rounded-full font-bold ml-2">CURRENT</span>}
              </div>
            );
          })}
        </div>
        {currentReferrals < 15 && (
          <div className="mt-4 p-3 bg-[#050505] rounded-xl border border-white/[0.05]">
            <div className="text-xs text-white/40 mb-1.5">Progress to next tier</div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, (currentReferrals / (currentTier.label === 'Starter' ? 5 : 15)) * 100)}%`, background: 'linear-gradient(90deg,#7B5FFF,#D63DF6)' }} />
              </div>
              <span className="text-xs text-white/40 flex-shrink-0">
                {currentTier.label === 'Starter' ? `${5 - currentReferrals} more to Pro` : `${15 - currentReferrals} more to Elite`}
              </span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-6">
          <h2 className="text-base font-bold text-white mb-4">Top Referrers</h2>
          <div className="space-y-2">
            {leaderboard.slice(0, 10).map((entry: any, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-[#050505] rounded-xl">
                <span className="text-sm font-black text-white/30 w-5 text-center">{i + 1}</span>
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7B5FFF] to-[#D63DF6] flex items-center justify-center text-white text-xs font-bold">
                  {entry.name?.charAt(0) || '?'}
                </div>
                <span className="flex-1 text-sm text-white">{entry.name || 'Anonymous'}</span>
                <span className="text-sm font-bold text-[#00C4FF]">{entry.referrals} referrals</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
