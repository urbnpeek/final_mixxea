import { motion } from 'motion/react';
import { Link } from 'react-router';
import { Lock, Zap, ArrowRight, Crown, Rocket, Check } from 'lucide-react';
import { useCurrency } from '../mixxea/CurrencyContext';

// ─── Plan rank (used for comparisons) ─────────────────────────────────────────
export const PLAN_RANK: Record<string, number> = {
  starter: 0,
  growth:  1,
  pro:     2,
};

export function planHasAccess(userPlan: string, requiredPlan: string): boolean {
  return (PLAN_RANK[userPlan] ?? 0) >= (PLAN_RANK[requiredPlan] ?? 0);
}

// ─── Which promo services each plan unlocks ────────────────────────────────────
// Matches exactly what Pricing.tsx advertises per plan.
export const PLAN_PROMO_SERVICES: Record<string, string[]> = {
  starter: ['spotify_growth', 'sync_licensing'],
  growth:  ['spotify_growth', 'sync_licensing', 'playlist_pitching', 'tiktok_ugc', 'ig_ugc', 'youtube_ads'],
  pro:     ['spotify_growth', 'sync_licensing', 'playlist_pitching', 'tiktok_ugc', 'ig_ugc', 'youtube_ads', 'pr_press', 'meta_ads'],
};

export function planCanUseService(userPlan: string, serviceId: string): boolean {
  const allowed = PLAN_PROMO_SERVICES[userPlan] ?? PLAN_PROMO_SERVICES.starter;
  return allowed.includes(serviceId);
}

// Returns which plan a promo service requires, or null if available to all
export function serviceRequiredPlan(serviceId: string): 'growth' | 'pro' | null {
  if (['pr_press', 'meta_ads'].includes(serviceId)) return 'pro';
  if (['playlist_pitching', 'tiktok_ugc', 'ig_ugc', 'youtube_ads'].includes(serviceId)) return 'growth';
  return null;
}

// ─── Upgrade info blocks ───────────────────────────────────────────────────────
export const UPGRADE_INFO: Record<string, {
  name: string; priceUsd: number; color: string; gradientTo: string;
  Icon: any; perks: string[];
}> = {
  growth: {
    name: 'Growth',
    priceUsd: 39,
    color: '#7B5FFF',
    gradientTo: '#D63DF6',
    Icon: Rocket,
    perks: [
      'Playlist pitching (5 pitches/mo)',
      'TikTok & Instagram UGC campaigns',
      'YouTube Ads campaigns',
      'Publishing split tools & admin',
      'Royalty splits management',
      'Playlist marketplace access',
      'Advanced analytics & KPI reports',
      '40 promo credits / month',
    ],
  },
  pro: {
    name: 'Pro',
    priceUsd: 149,
    color: '#D63DF6',
    gradientTo: '#FF5252',
    Icon: Crown,
    perks: [
      'PR & Press outreach campaigns',
      'Meta & Google Ads integration',
      'Multi-artist / label management',
      'Dedicated account manager',
      'Custom campaign strategy calls',
      'White-label smart pages',
      'API access & bulk tools',
      '120 promo credits / month',
    ],
  },
};

// ─── Full-page upgrade wall ────────────────────────────────────────────────────
interface UpgradeWallProps {
  requiredPlan: 'growth' | 'pro';
  featureName: string;
  featureDesc?: string;
}

export function UpgradeWall({ requiredPlan, featureName, featureDesc }: UpgradeWallProps) {
  const info = UPGRADE_INFO[requiredPlan];
  const { Icon } = info;
  const { fpm } = useCurrency();
  const formattedPrice = fpm(info.priceUsd);

  return (
    <div className="p-4 lg:p-8 flex items-center justify-center min-h-[65vh]">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg"
      >
        {/* Icon */}
        <div
          className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
          style={{ background: `${info.color}20` }}
        >
          <Lock size={28} style={{ color: info.color }} />
        </div>

        <h2 className="text-xl font-bold text-white text-center mb-2">{featureName}</h2>
        <p className="text-sm text-white/50 text-center mb-8 leading-relaxed max-w-sm mx-auto">
          {featureDesc ??
            `Upgrade to the ${info.name} plan to unlock ${featureName} and powerful tools for serious artists.`}
        </p>

        {/* Plan perks card */}
        <div
          className="rounded-2xl border p-6 mb-5"
          style={{ borderColor: `${info.color}30`, background: `${info.color}08` }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${info.color}20` }}
            >
              <Icon size={18} style={{ color: info.color }} />
            </div>
            <div>
              <p className="font-bold text-white">{info.name} Plan</p>
              <p className="text-sm font-bold" style={{ color: info.color }}>{formattedPrice}</p>
            </div>
          </div>
          <ul className="grid sm:grid-cols-2 gap-y-2 gap-x-4">
            {info.perks.map(perk => (
              <li key={perk} className="flex items-center gap-2 text-xs text-white/55">
                <Check size={11} className="flex-shrink-0" style={{ color: info.color }} />
                {perk}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <Link
          to="/dashboard/settings"
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-semibold text-white text-sm hover:opacity-90 transition-all"
          style={{ background: `linear-gradient(135deg, ${info.color}, ${info.gradientTo})` }}
        >
          <Zap size={14} />
          Upgrade to {info.name} — {formattedPrice}
          <ArrowRight size={14} />
        </Link>

        <p className="text-center text-xs text-white/25 mt-3">
          Go to <strong className="text-white/40">Settings → Plan</strong> tab to change your subscription
        </p>
      </motion.div>
    </div>
  );
}

// ─── Small inline badge shown on locked service cards ─────────────────────────
export function PlanBadge({ requiredPlan }: { requiredPlan: 'growth' | 'pro' }) {
  const info = UPGRADE_INFO[requiredPlan];
  return (
    <span
      className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
      style={{ background: `${info.color}25`, color: info.color }}
    >
      <Lock size={7} />
      {info.name}
    </span>
  );
}