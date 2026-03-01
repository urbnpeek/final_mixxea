/**
 * MIXXEA Tracking Infrastructure — Developer Documentation
 * ─────────────────────────────────────────────────────────────────────────────
 * Accessible at /admin/tracking (Admin Panel → Tracking tab)
 * Shows pixel status, event catalog, GDPR flow, and implementation guide.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart3, Megaphone, Radio, Shield, CheckCircle2, AlertTriangle,
  Code2, Zap, ChevronDown, ChevronRight, Copy, Check,
  Globe, Lock, Activity, Cookie
} from 'lucide-react';
import { TRACKING_CONFIG } from './config';
import { EVENTS } from './events';
import { useTracking } from './TrackingContext';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isPlaceholder(id: string) {
  return id.includes('X') || id.length < 8;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/30 hover:text-white/70"
      title="Copy"
    >
      {copied ? <Check size={13} className="text-[#10B981]" /> : <Copy size={13} />}
    </button>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="relative group">
      <pre
        className="text-[11px] text-[#00C4FF] leading-relaxed overflow-x-auto p-4 rounded-xl"
        style={{ background: 'rgba(0,196,255,0.04)', border: '1px solid rgba(0,196,255,0.12)' }}
      >
        <code>{children}</code>
      </pre>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={children} />
      </div>
    </div>
  );
}

// ─── Accordion wrapper ────────────────────────────────────────────────────────

function Accordion({ id, label, icon: Icon, iconColor, expanded, onToggle, children }: {
  id: string; label: string; icon: React.ElementType; iconColor: string;
  expanded: boolean; onToggle: (id: string) => void; children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${iconColor}18`, border: `1px solid ${iconColor}30` }}>
          <Icon size={15} style={{ color: iconColor }} />
        </div>
        <span className="flex-1 text-white font-bold text-sm">{label}</span>
        {expanded ? <ChevronDown size={15} className="text-white/30" /> : <ChevronRight size={15} className="text-white/30" />}
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-white/[0.04]">
              <div className="pt-4">{children}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Pixel Status Row ────────────────────────────────────────────────────────

function PixelStatusRow({ name, id, status, docs }: {
  name: string; id: string; status: 'active' | 'placeholder'; docs: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
      <div
        className={`w-2 h-2 rounded-full flex-shrink-0 ${status === 'active' ? 'animate-pulse' : ''}`}
        style={{ background: status === 'active' ? '#10B981' : '#FF5252' }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-white/90 text-xs font-semibold">{name}</p>
        <p className="text-white/30 text-[11px] font-mono truncate">{id}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {status === 'active' ? (
          <span className="text-[10px] font-semibold text-[#10B981] px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.1)' }}>Live</span>
        ) : (
          <span className="text-[10px] font-semibold text-[#FF5252] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,82,82,0.1)' }}>Needs ID</span>
        )}
        <a href={docs} target="_blank" rel="noopener noreferrer"
          className="text-[10px] text-white/30 hover:text-[#00C4FF] transition-colors underline">
          Docs
        </a>
      </div>
    </div>
  );
}

// ─── Event catalog ────────────────────────────────────────────────────────────

const EVENT_MAP: { name: string; event: string; trigger: string; ga4: boolean; meta: boolean; tiktok: boolean }[] = [
  { name: 'Page View',           event: EVENTS.PAGE_VIEW,           trigger: 'Every route change (auto)',           ga4: true,  meta: true,  tiktok: true  },
  { name: 'Sign Up',             event: EVENTS.SIGN_UP,             trigger: '/auth → signup success',             ga4: true,  meta: true,  tiktok: true  },
  { name: 'Login',               event: EVENTS.LOGIN,               trigger: '/auth → login success',              ga4: true,  meta: false, tiktok: false },
  { name: 'View Pricing',        event: EVENTS.VIEW_PRICING,        trigger: 'Pricing section mounts',             ga4: true,  meta: true,  tiktok: true  },
  { name: 'Select Plan',         event: EVENTS.SELECT_PLAN,         trigger: 'Plan CTA clicked',                   ga4: true,  meta: true,  tiktok: true  },
  { name: 'Hero CTA Click',      event: EVENTS.HERO_CTA_CLICK,      trigger: '"Get Started Free" clicked',         ga4: true,  meta: false, tiktok: false },
  { name: 'View Campaigns',      event: EVENTS.VIEW_CAMPAIGNS,      trigger: '/dashboard/promotions mounts',       ga4: true,  meta: false, tiktok: false },
  { name: 'Select Campaign',     event: EVENTS.SELECT_CAMPAIGN,     trigger: 'Campaign type selected',             ga4: true,  meta: true,  tiktok: true  },
  { name: 'Add To Cart',         event: EVENTS.ADD_TO_CART,         trigger: 'Campaign added to order',            ga4: true,  meta: true,  tiktok: true  },
  { name: 'View Credits',        event: EVENTS.VIEW_CREDITS,        trigger: '/dashboard/credits mounts',          ga4: true,  meta: false, tiktok: false },
  { name: 'Begin Checkout',      event: EVENTS.BEGIN_CHECKOUT,      trigger: 'Credit/plan checkout initiated',     ga4: true,  meta: true,  tiktok: true  },
  { name: 'Purchase',            event: EVENTS.PURCHASE,            trigger: 'Stripe webhook → invoice.paid',      ga4: true,  meta: true,  tiktok: true  },
  { name: 'Payment Failed',      event: EVENTS.PAYMENT_FAILED,      trigger: 'Stripe webhook → payment_failed',    ga4: true,  meta: false, tiktok: false },
  { name: 'Distribution Start',  event: EVENTS.DISTRIBUTION_START,  trigger: 'Release upload started',             ga4: true,  meta: false, tiktok: false },
  { name: 'Distribution Submit', event: EVENTS.DISTRIBUTION_SUBMIT, trigger: 'Release submitted',                  ga4: true,  meta: false, tiktok: false },
  { name: 'View Publishing',     event: EVENTS.VIEW_PUBLISHING,     trigger: '/dashboard/publishing mounts',       ga4: true,  meta: false, tiktok: false },
  { name: 'View Analytics',      event: EVENTS.VIEW_ANALYTICS,      trigger: '/dashboard/analytics mounts',        ga4: true,  meta: false, tiktok: false },
  { name: 'Smart Page View',     event: EVENTS.SMART_PAGE_VIEW,     trigger: '/p/:slug public page loads',         ga4: true,  meta: true,  tiktok: false },
  { name: 'View Marketplace',    event: EVENTS.VIEW_MARKETPLACE,    trigger: '/dashboard/marketplace mounts',      ga4: true,  meta: true,  tiktok: false },
  { name: 'Pitch Playlist',      event: EVENTS.PITCH_PLAYLIST,      trigger: 'Playlist pitch submitted',           ga4: true,  meta: false, tiktok: false },
  { name: 'Create Split',        event: EVENTS.CREATE_SPLIT,        trigger: 'Royalty split created',              ga4: true,  meta: false, tiktok: false },
  { name: 'Open Ticket',         event: EVENTS.OPEN_TICKET,         trigger: 'Support ticket opened',              ga4: true,  meta: false, tiktok: false },
];

function Pill({ active, label }: { active: boolean; label: string }) {
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'text-white' : 'text-white/20'}`}
      style={{ background: active ? 'rgba(123,95,255,0.3)' : 'rgba(255,255,255,0.04)' }}>
      {label}
    </span>
  );
}

// ─── GDPR Flow ───────────────────────────────────────────────────────────────

const GDPR_STEPS = [
  { icon: Globe,    color: '#00C4FF', label: 'User lands on MIXXEA',    desc: 'GA4 Consent Mode defaults set to denied. No data collected.' },
  { icon: Cookie,   color: '#7B5FFF', label: 'Cookie banner appears',    desc: 'Shown after 1.2s delay. Equal prominence on Accept / Reject.' },
  { icon: Shield,   color: '#D63DF6', label: 'User makes a choice',      desc: 'Consent saved to localStorage for 180 days with ISO timestamp.' },
  { icon: Activity, color: '#10B981', label: 'Scripts load conditionally', desc: 'GA4 loads if analytics=true. Meta+TikTok load if marketing=true.' },
  { icon: BarChart3,color: '#FF5252', label: 'Events fire from app',     desc: 'trackEvent() silently skips if consent not granted for that category.' },
];

// ─── Main Component ──────────────────────────────────────────────────────────

export function TrackingDocs() {
  const { consent, hasConsented, grantAll, denyAll } = useTracking();
  const [expandedSection, setExpandedSection] = useState<string | null>('pixels');

  const toggle = (id: string) => setExpandedSection(prev => (prev === id ? null : id));

  const ga4Status    = isPlaceholder(TRACKING_CONFIG.ga4.measurementId)   ? 'placeholder' : 'active';
  const metaStatus   = isPlaceholder(TRACKING_CONFIG.metaPixel.pixelId)   ? 'placeholder' : 'active';
  const tiktokStatus = isPlaceholder(TRACKING_CONFIG.tiktokPixel.pixelId) ? 'placeholder' : 'active';

  const totalActive   = [ga4Status, metaStatus, tiktokStatus].filter(s => s === 'active').length;
  const totalPending  = 3 - totalActive;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #00C4FF22, #7B5FFF22)', border: '1px solid rgba(123,95,255,0.3)' }}>
          <Activity size={18} className="text-[#7B5FFF]" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-black text-white tracking-tight">Tracking Infrastructure</h1>
          <p className="text-white/40 text-xs mt-0.5">MIXXEA Analytics &amp; Conversion Layer — Developer Reference</p>
        </div>
        {/* Summary badges */}
        <div className="flex gap-2 flex-shrink-0">
          {totalActive > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-[#10B981]"
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <CheckCircle2 size={11} /> {totalActive} Live
            </span>
          )}
          {totalPending > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-[#FF5252]"
              style={{ background: 'rgba(255,82,82,0.1)', border: '1px solid rgba(255,82,82,0.2)' }}>
              <AlertTriangle size={11} /> {totalPending} Need IDs
            </span>
          )}
        </div>
      </div>

      {/* Live consent status */}
      <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">Current Browser Consent State</p>
        <div className="flex flex-wrap gap-3 items-center">
          {hasConsented ? (
            <>
              <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${consent?.analytics ? 'text-[#10B981]' : 'text-[#FF5252]'}`}
                style={{ background: consent?.analytics ? 'rgba(16,185,129,0.1)' : 'rgba(255,82,82,0.1)' }}>
                <BarChart3 size={11} /> Analytics {consent?.analytics ? 'Granted' : 'Denied'}
              </span>
              <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${consent?.marketing ? 'text-[#D63DF6]' : 'text-[#FF5252]'}`}
                style={{ background: consent?.marketing ? 'rgba(214,61,246,0.1)' : 'rgba(255,82,82,0.1)' }}>
                <Megaphone size={11} /> Marketing {consent?.marketing ? 'Granted' : 'Denied'}
              </span>
              {consent?.timestamp && (
                <span className="text-[11px] text-white/20">Saved: {new Date(consent.timestamp).toLocaleString()}</span>
              )}
            </>
          ) : (
            <span className="text-xs text-[#FF5252] flex items-center gap-1.5">
              <AlertTriangle size={12} /> No consent decision recorded yet in this browser
            </span>
          )}
          <div className="ml-auto flex gap-2">
            <button onClick={grantAll}
              className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-80"
              style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}>
              Simulate: Grant All
            </button>
            <button onClick={denyAll}
              className="text-[11px] font-semibold px-3 py-1.5 rounded-lg text-white/50 hover:text-white border border-white/10 transition-all">
              Simulate: Deny All
            </button>
          </div>
        </div>
      </div>

      {/* 1 — Pixel Status */}
      <Accordion id="pixels" label="Pixel IDs & Status" icon={Radio} iconColor="#00C4FF" expanded={expandedSection === 'pixels'} onToggle={toggle}>
        <PixelStatusRow
          name="Google Analytics 4"
          id={TRACKING_CONFIG.ga4.measurementId}
          status={ga4Status}
          docs="https://support.google.com/analytics/answer/9539598"
        />
        <PixelStatusRow
          name="Meta (Facebook) Pixel"
          id={TRACKING_CONFIG.metaPixel.pixelId}
          status={metaStatus}
          docs="https://developers.facebook.com/docs/meta-pixel/get-started"
        />
        <PixelStatusRow
          name="TikTok Pixel"
          id={TRACKING_CONFIG.tiktokPixel.pixelId}
          status={tiktokStatus}
          docs="https://ads.tiktok.com/help/article?aid=10021254"
        />
        <div className="mt-4 p-3 rounded-xl" style={{ background: 'rgba(255,82,82,0.05)', border: '1px solid rgba(255,82,82,0.15)' }}>
          <p className="text-[11px] text-white/50 leading-relaxed">
            <span className="text-[#FF5252] font-semibold">To go live:</span> Replace placeholder IDs in{' '}
            <code className="text-[#00C4FF] bg-white/5 px-1 rounded">/src/app/components/tracking/config.ts</code>{' '}
            with your real IDs. Scripts load <strong className="text-white/70">only after user consent</strong> — no data is collected before that.
          </p>
        </div>
      </Accordion>

      {/* 2 — Event Catalog */}
      <Accordion id="events" label={`Event Catalog (${EVENT_MAP.length} events)`} icon={Zap} iconColor="#D63DF6" expanded={expandedSection === 'events'} onToggle={toggle}>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-white/30 border-b border-white/[0.05]">
                <th className="text-left pb-2 pr-3 font-semibold">Display Name</th>
                <th className="text-left pb-2 pr-3 font-semibold">Event Key</th>
                <th className="text-left pb-2 pr-3 font-semibold">Trigger</th>
                <th className="text-left pb-2 pr-1 font-semibold">GA4</th>
                <th className="text-left pb-2 pr-1 font-semibold">Meta</th>
                <th className="text-left pb-2 font-semibold">TikTok</th>
              </tr>
            </thead>
            <tbody>
              {EVENT_MAP.map(ev => (
                <tr key={ev.event} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="py-2 pr-3 text-white/80 font-medium whitespace-nowrap">{ev.name}</td>
                  <td className="py-2 pr-3 font-mono text-[#00C4FF]/70 whitespace-nowrap">{ev.event}</td>
                  <td className="py-2 pr-3 text-white/40">{ev.trigger}</td>
                  <td className="py-2 pr-1"><Pill active={ev.ga4} label="GA4" /></td>
                  <td className="py-2 pr-1"><Pill active={ev.meta} label="META" /></td>
                  <td className="py-2"><Pill active={ev.tiktok} label="TTQ" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Accordion>

      {/* 3 — How to fire events */}
      <Accordion id="usage" label="How to Fire Events from Components" icon={Code2} iconColor="#7B5FFF" expanded={expandedSection === 'usage'} onToggle={toggle}>
        <div className="space-y-4">
          <p className="text-white/50 text-xs leading-relaxed">
            Import <code className="text-[#00C4FF] bg-white/5 px-1 rounded">useTracking</code> from any component inside the router tree.
            All consent checks are handled internally — just call <code className="text-[#00C4FF] bg-white/5 px-1 rounded">trackEvent()</code>.
          </p>
          <CodeBlock>{`import { useTracking } from '../tracking/TrackingContext';
import { EVENTS } from '../tracking/events';

export function PromotionsPage() {
  const { trackEvent } = useTracking();

  const handleSelectCampaign = (id: string, value: number) => {
    trackEvent(EVENTS.SELECT_CAMPAIGN, {
      campaign_id: id,
      value,
      currency: 'USD',
    });
  };

  return (
    <button onClick={() => handleSelectCampaign('spotify-growth-xl', 149)}>
      Book Campaign
    </button>
  );
}`}</CodeBlock>

          <p className="text-white/50 text-xs">For purchase / checkout events, always include <code className="text-[#00C4FF] bg-white/5 px-1 rounded">value</code> and <code className="text-[#00C4FF] bg-white/5 px-1 rounded">currency</code> so Meta and TikTok can optimise for conversion value:</p>

          <CodeBlock>{`// On successful Stripe payment (e.g. in webhook handler or success page):
trackEvent(EVENTS.PURCHASE, {
  transaction_id: 'inv_abc123',
  value: 49.00,
  currency: 'USD',
  items: [{ item_name: 'Spotify Growth Pack', quantity: 1, price: 49 }],
});

// On checkout initiation:
trackEvent(EVENTS.BEGIN_CHECKOUT, {
  value: 49.00,
  currency: 'USD',
});`}</CodeBlock>
        </div>
      </Accordion>

      {/* 4 — GDPR Consent Flow */}
      <Accordion id="gdpr" label="GDPR Consent Flow" icon={Shield} iconColor="#10B981" expanded={expandedSection === 'gdpr'} onToggle={toggle}>
        <div className="space-y-1 mb-4">
          {GDPR_STEPS.map((step, i) => (
            <div key={i} className="flex gap-3 items-start py-2.5">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                  style={{ background: `${step.color}18`, border: `1px solid ${step.color}30` }}>
                  <step.icon size={13} style={{ color: step.color }} />
                </div>
                {i < GDPR_STEPS.length - 1 && (
                  <div className="w-px h-5 mt-1" style={{ background: `${step.color}20` }} />
                )}
              </div>
              <div className="pb-1">
                <p className="text-white/90 text-xs font-semibold">{step.label}</p>
                <p className="text-white/35 text-[11px] leading-snug">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl p-3 space-y-1.5" style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.15)' }}>
          <p className="text-[11px] font-semibold text-[#10B981]">GA4 Consent Mode v2 Implemented</p>
          <p className="text-[11px] text-white/40 leading-relaxed">
            <code className="text-[#00C4FF]">analytics_storage</code>, <code className="text-[#00C4FF]">ad_storage</code>,{' '}
            <code className="text-[#00C4FF]">ad_user_data</code>, and <code className="text-[#00C4FF]">ad_personalization</code> are all set to{' '}
            <strong className="text-white/60">denied by default</strong> before any script loads. Updated to granted only after explicit user consent.{' '}
            Consent is stored for <strong className="text-white/60">180 days</strong> in <code className="text-[#00C4FF]">localStorage</code>.
          </p>
        </div>
      </Accordion>

      {/* 5 — Testing Guide */}
      <Accordion id="testing" label="Testing & Verification" icon={CheckCircle2} iconColor="#FF5252" expanded={expandedSection === 'testing'} onToggle={toggle}>
        <div className="space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            {[
              {
                title: 'GA4 DebugView',
                color: '#E37400',
                steps: [
                  'Install "Google Analytics Debugger" Chrome extension',
                  'Open GA4 → Reports → DebugView',
                  'Navigate MIXXEA pages to see live events',
                  'Accept cookies first — events only fire post-consent',
                ],
              },
              {
                title: 'Meta Pixel Helper',
                color: '#0866FF',
                steps: [
                  'Install "Meta Pixel Helper" Chrome extension',
                  'Visit MIXXEA pages and accept cookie consent',
                  'Green checkmark confirms pixel is active',
                  'Verify in Events Manager → Test Events tab',
                ],
              },
              {
                title: 'TikTok Pixel Helper',
                color: '#69C9D0',
                steps: [
                  'Install "TikTok Pixel Helper" Chrome extension',
                  'Navigate pages and accept cookie consent',
                  'Check TikTok Ads Manager → Events',
                  'Use Test Events feature for real-time validation',
                ],
              },
            ].map(tool => (
              <div key={tool.title} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${tool.color}20` }}>
                <p className="font-bold mb-2 text-xs" style={{ color: tool.color }}>{tool.title}</p>
                <ol className="space-y-1">
                  {tool.steps.map((s, i) => (
                    <li key={i} className="flex gap-1.5 text-[11px] text-white/40">
                      <span className="flex-shrink-0 font-bold" style={{ color: `${tool.color}80` }}>{i + 1}.</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'rgba(123,95,255,0.05)', border: '1px solid rgba(123,95,255,0.15)' }}>
            <p className="text-[#7B5FFF] font-semibold text-[11px] mb-1">Dev Mode Console Logging</p>
            <p className="text-[11px] text-white/40 leading-relaxed">
              In <code className="text-[#00C4FF] bg-white/5 px-1 rounded">development</code> mode every{' '}
              <code className="text-[#00C4FF] bg-white/5 px-1 rounded">trackEvent()</code> and page view prints to the browser console
              with prefix <code className="text-[#00C4FF] bg-white/5 px-1 rounded">[MIXXEA Track]</code> — no real pixel IDs needed to test the event flow.
            </p>
          </div>
        </div>
      </Accordion>

    </div>
  );
}
