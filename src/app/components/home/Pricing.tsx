import { motion } from 'motion/react';
import { GlowButton } from '../mixxea/GlowButton';
import { Check, Zap } from 'lucide-react';
import { useCurrency } from '../mixxea/CurrencyContext';
import { useRef, useEffect } from 'react';

const plans = [
  {
    name: 'Starter',
    priceUsd: 19,
    tagline: 'For independent artists getting started',
    credits: '10 promo credits / month',
    highlight: false,
    badge: null,
    features: [
      'Unlimited music distribution',
      'UPC & ISRC code generation',
      'Royalty tracking & payouts',
      '10 promotion credits included',
      'Basic analytics dashboard',
      'Smart link pages',
      'Creative Studio — 3 accounts, 20 posts/mo',
      '20 AI captions · 5 AI images / month',
      'Email support',
    ],
    cta: 'Get Started Free',
    ctaHref: '/auth',
    ctaVariant: 'secondary' as const,
  },
  {
    name: 'Growth',
    priceUsd: 49,
    tagline: 'For artists ready to scale their career',
    credits: '40 promo credits / month',
    highlight: true,
    badge: '⭐ Most Popular',
    features: [
      'Everything in Starter',
      '40 promotion credits included',
      'Playlist pitching bundle (5 pitches/mo)',
      'Spotify artist verification support',
      'TikTok / IG campaign access',
      'Priority campaign placement',
      'Advanced analytics & KPI reports',
      'Publishing split tools',
      'Creative Studio — 8 accounts, 80 posts/mo',
      '100 AI captions · 25 AI images · 15 scripts/mo',
      'Video posting to IG, TikTok, YouTube',
      'Priority email & chat support',
    ],
    cta: 'Get Started Free',
    ctaHref: '/auth',
    ctaVariant: 'primary' as const,
  },
  {
    name: 'Pro',
    priceUsd: 119,
    tagline: 'For labels and multi-artist rosters',
    credits: '120 promo credits / month',
    highlight: false,
    badge: null,
    features: [
      'Everything in Growth',
      '120 promotion credits included',
      'Multi-artist / label management',
      'White-label smart pages',
      'Dedicated account manager',
      'Custom campaign strategy calls',
      'Full PR & press outreach',
      'Meta & Google Ads integration',
      'API access & bulk tools',
      'Creative Studio — unlimited accounts & posts',
      'Unlimited AI captions · 80 AI images · 50 scripts',
      'Weekly AI content calendar + bulk scheduling',
      'Full analytics & AI marketing suggestions',
      '24/7 priority support',
    ],
    cta: 'Talk to Sales',
    ctaHref: 'mailto:onboarding@mixxea.com',
    ctaVariant: 'secondary' as const,
  },
];

const compareRows = [
  { feature: 'Distribution',          starter: true,       growth: true,       pro: true },
  { feature: 'Promotion Credits',     starter: '10/mo',    growth: '40/mo',    pro: '120/mo' },
  { feature: 'Playlist Pitching',     starter: false,      growth: true,       pro: true },
  { feature: 'TikTok / IG Campaigns', starter: false,      growth: true,       pro: true },
  { feature: 'PR & Press',            starter: false,      growth: false,      pro: true },
  { feature: 'Multi-Artist Tools',    starter: false,      growth: false,      pro: true },
  { feature: 'Dedicated Manager',     starter: false,      growth: false,      pro: true },
  // ── Creative Studio rows ──────────────────────────────────────────────────
  { feature: 'Social Accounts',       starter: '3',        growth: '8',        pro: 'Unlimited' },
  { feature: 'Posts / Month',         starter: '20/mo',    growth: '80/mo',    pro: 'Unlimited' },
  { feature: 'AI Captions',           starter: '20/mo',    growth: '100/mo',   pro: 'Unlimited' },
  { feature: 'AI Image Generation',   starter: '5/mo',     growth: '25/mo',    pro: '80/mo' },
  { feature: 'Video Posting',         starter: false,      growth: true,       pro: true },
  { feature: 'AI Content Calendar',   starter: 'Monthly',  growth: 'Weekly',   pro: 'Weekly + AI' },
];

function CellValue({ value, isHighlight }: { value: boolean | string; isHighlight?: boolean }) {
  if (typeof value === 'boolean') {
    return value ? (
      <Check className="h-5 w-5 mx-auto" style={{ color: '#7B5FFF' }} />
    ) : (
      <span className="text-[#555] text-lg">—</span>
    );
  }
  return <span className="text-white text-sm font-semibold">{value}</span>;
}

export function Pricing() {
  const { fp, fpm, currency } = useCurrency();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => {});
  }, []);

  return (
    <section id="pricing" className="relative py-40 bg-black overflow-hidden">
      {/* ── Ambient video strip behind pricing header ── */}
      <div className="absolute top-0 left-0 right-0 h-[480px] overflow-hidden pointer-events-none">
        <video
          ref={videoRef}
          src="https://videos.pexels.com/video-files/3912240/3912240-hd_1920_1080_25fps.mp4"
          muted loop playsInline autoPlay preload="metadata"
          className="w-full h-full object-cover opacity-10"
          style={{ filter: 'saturate(1.8) blur(2px)' }}
          onError={(e) => {
            const v = e.currentTarget;
            if (v.src !== 'https://videos.pexels.com/video-files/1739506/1739506-hd_1920_1080_25fps.mp4') {
              v.src = 'https://videos.pexels.com/video-files/1739506/1739506-hd_1920_1080_25fps.mp4';
              v.play().catch(() => {});
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black" />
      </div>

      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[500px] rounded-full blur-[180px] opacity-[0.06]"
          style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6, #FF5252)' }}
        />
      </div>

      <div className="relative max-w-[1240px] mx-auto px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
            <Zap className="h-4 w-4" style={{ color: '#7B5FFF' }} />
            <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#7B5FFF' }}>Pricing</span>
          </div>
          <h2 className="text-[64px] leading-[1.1] font-bold text-white mb-6">
            Simple, transparent
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #7B5FFF, #D63DF6, #FF5252)' }}
            >
              pricing
            </span>
          </h2>
          <p className="text-xl text-[#B5B5B5] max-w-xl mx-auto leading-relaxed">
            All plans include music distribution with 100% royalty retention. Promotion credits can be topped up anytime.
          </p>
          {/* Live currency indicator */}
          {currency.code !== 'USD' && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 text-sm text-white/40 flex items-center justify-center gap-2"
            >
              <span className="text-base">{currency.flag}</span>
              Showing prices in <strong className="text-white/60">{currency.name} ({currency.code})</strong>
              &nbsp;· Approximate rates · Billed in USD
            </motion.p>
          )}
        </motion.div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.12 }}
              className="relative rounded-3xl border transition-all duration-300 hover:-translate-y-1"
              style={plan.highlight ? {
                borderColor: 'rgba(123,95,255,0.5)',
                background: 'linear-gradient(180deg, #120e1f 0%, #121212 100%)',
                boxShadow: '0 25px 50px -12px rgba(123,95,255,0.1)',
              } : {
                borderColor: 'rgba(255,255,255,0.1)',
                background: '#121212',
              }}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span
                    className="px-4 py-1.5 rounded-full text-white text-xs font-bold shadow-lg"
                    style={{
                      background: 'linear-gradient(135deg, #7B5FFF, #FF5252)',
                      boxShadow: '0 4px 15px rgba(123,95,255,0.4)',
                    }}
                  >
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="p-8">
                {/* Plan name + price */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                  <p className="text-[#B5B5B5] text-sm mb-6">{plan.tagline}</p>

                  {/* Price */}
                  <div className="flex items-baseline gap-1 flex-wrap">
                    <span className="text-5xl font-bold text-white">{fp(plan.priceUsd)}</span>
                    <span className="text-[#B5B5B5]">/mo</span>
                  </div>

                  {/* USD reference for non-USD currencies */}
                  {currency.code !== 'USD' && (
                    <p className="text-xs text-white/25 mt-1">≈ ${plan.priceUsd} USD</p>
                  )}

                  <div
                    className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full border"
                    style={{
                      background: 'rgba(123,95,255,0.1)',
                      borderColor: 'rgba(123,95,255,0.2)',
                    }}
                  >
                    <Zap className="h-3.5 w-3.5" style={{ color: '#7B5FFF' }} />
                    <span className="text-xs font-semibold" style={{ color: '#D63DF6' }}>{plan.credits}</span>
                  </div>
                </div>

                {/* CTA */}
                <div className="mb-8">
                  <GlowButton
                    variant={plan.ctaVariant}
                    size="md"
                    className="w-full"
                    href={plan.ctaHref}
                  >
                    {plan.cta}
                  </GlowButton>
                </div>

                {/* Divider */}
                <div className="border-t border-white/5 mb-6" />

                {/* Features */}
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div
                        className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                        style={plan.highlight ? {
                          background: 'rgba(123,95,255,0.2)',
                        } : {
                          background: 'rgba(255,255,255,0.05)',
                        }}
                      >
                        <Check
                          className="h-3 w-3"
                          style={{ color: plan.highlight ? '#7B5FFF' : '#B5B5B5' }}
                        />
                      </div>
                      <span className="text-[#B5B5B5] text-sm leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Notes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <p className="text-sm text-[#666]">
            Promotion credits can be topped up anytime. Access is reviewed within 24 hours. No credit card required to apply.
            {currency.code !== 'USD' && ' · Prices shown are approximate conversions. All charges processed in USD.'}
          </p>
        </motion.div>

        {/* Compare plans mini-table */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="rounded-3xl border border-white/10 bg-[#0d0d0d] overflow-hidden"
        >
          <div className="p-8 border-b border-white/5">
            <h3 className="text-2xl font-bold text-white text-center">Compare Plans</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left p-6 text-[#B5B5B5] text-sm font-semibold w-1/2">Feature</th>
                  <th className="text-center p-6 text-white text-sm font-bold">
                    <div>Starter</div>
                    <div className="text-xs font-normal text-[#B5B5B5] mt-0.5">{fpm(19)}</div>
                  </th>
                  <th className="text-center p-6 text-sm font-bold" style={{ color: '#D63DF6' }}>
                    <div>Growth</div>
                    <div className="text-xs font-normal text-[#B5B5B5] mt-0.5">{fpm(49)}</div>
                  </th>
                  <th className="text-center p-6 text-white text-sm font-bold">
                    <div>Pro</div>
                    <div className="text-xs font-normal text-[#B5B5B5] mt-0.5">{fpm(119)}</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {compareRows.map((row, index) => (
                  <tr
                    key={index}
                    className="border-b border-white/5 last:border-none hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="p-6 text-[#B5B5B5] text-sm">{row.feature}</td>
                    <td className="p-6 text-center"><CellValue value={row.starter} /></td>
                    <td className="p-6 text-center"><CellValue value={row.growth} isHighlight /></td>
                    <td className="p-6 text-center"><CellValue value={row.pro} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </section>
  );
}