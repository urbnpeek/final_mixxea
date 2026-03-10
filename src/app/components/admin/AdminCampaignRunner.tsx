// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — Admin Campaign Runner
//  Build, launch, and track paid ad campaigns:
//  Spotify Ads · YouTube Ads · Google Ads · TikTok Ads · Meta Ads
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../dashboard/AuthContext';
import * as api from '../dashboard/api';
import { toast } from 'sonner';
import {
  Play, Pause, CheckCircle, Clock, Plus, X, Edit3, Trash2,
  Save, ExternalLink, RefreshCw, Zap, TrendingUp, DollarSign,
  Target, Users, Globe, Calendar, BarChart2, ArrowRight,
  ChevronDown, ChevronUp, Music, Youtube, Instagram,
  MousePointerClick, Eye, Radio, Megaphone, Search,
  Copy, Check, AlertCircle, Activity,
} from 'lucide-react';

// ── Platform Config ───────────────────────────────────────────────────────────
const AD_PLATFORMS: Record<string, {
  label: string; color: string; bg: string; icon: any;
  dashboardUrl: string; newCampaignUrl: string;
  objectives: string[]; creativeTypes: string[];
  tips: string[];
}> = {
  spotify: {
    label: 'Spotify Ads', color: '#1DB954', bg: '#1DB95415', icon: Music,
    dashboardUrl: 'https://adstudio.spotify.com',
    newCampaignUrl: 'https://adstudio.spotify.com/campaigns/new',
    objectives: ['Stream Count', 'Follower Growth', 'Playlist Adds', 'Profile Visits'],
    creativeTypes: ['Audio Ad (30s)', 'Video Ad', 'Podcast Ad'],
    tips: [
      'Audio ads perform best at 15–30 seconds with a clear CTA',
      'Target listeners of similar artists for highest relevance',
      'Spotify ads reach users during active listening sessions',
      'Recommended budget: $250+ for meaningful data',
    ],
  },
  tiktok: {
    label: 'TikTok Ads', color: '#FF0050', bg: '#FF005015', icon: TrendingUp,
    dashboardUrl: 'https://ads.tiktok.com/i18n/dashboard',
    newCampaignUrl: 'https://ads.tiktok.com/i18n/oreo/campaign/create',
    objectives: ['Video Views', 'Profile Visits', 'Followers', 'Website Traffic', 'App Install'],
    creativeTypes: ['In-Feed Video', 'TopView', 'Brand Takeover', 'Spark Ads'],
    tips: [
      'In-Feed ads with native-style creatives outperform polished ads 3:1',
      'First 3 seconds must hook — use text overlay + strong visual',
      'Spark Ads (boost existing organic content) deliver the best CPV',
      'Target by music genre interest + lookalike of existing fans',
    ],
  },
  youtube: {
    label: 'YouTube Ads', color: '#FF0000', bg: '#FF000015', icon: Youtube,
    dashboardUrl: 'https://ads.google.com/aw/overview',
    newCampaignUrl: 'https://ads.google.com/aw/campaigns/new?campaignType=VIDEO',
    objectives: ['Video Views', 'Brand Awareness', 'Channel Subscribers', 'Website Clicks'],
    creativeTypes: ['Skippable In-Stream', 'Non-Skippable (15s)', 'Bumper Ad (6s)', 'Discovery Ad'],
    tips: [
      'Skippable in-stream: hook in first 5 seconds before skip button appears',
      'In-stream ads placed against music content get 2× engagement',
      'Discovery ads show in YouTube search results — great for new releases',
      'Target by music channel affinity + custom intent audiences',
    ],
  },
  google: {
    label: 'Google Ads', color: '#4285F4', bg: '#4285F415', icon: Globe,
    dashboardUrl: 'https://ads.google.com/aw/overview',
    newCampaignUrl: 'https://ads.google.com/aw/campaigns/new',
    objectives: ['Website Traffic', 'Conversions', 'Brand Search', 'Display Awareness'],
    creativeTypes: ['Search Ad', 'Display Banner', 'Responsive Display', 'Performance Max'],
    tips: [
      'Search ads for branded terms protect your name + catch active searches',
      'Display remarketing to site visitors drives streaming platform visits',
      'Performance Max campaigns auto-optimize across all Google inventory',
      'Target keywords like "new [genre] music 2026" for discovery',
    ],
  },
  meta: {
    label: 'Meta Ads', color: '#1877F2', bg: '#1877F215', icon: Instagram,
    dashboardUrl: 'https://www.facebook.com/adsmanager',
    newCampaignUrl: 'https://www.facebook.com/adsmanager/creation',
    objectives: ['Video Views', 'Website Clicks', 'Engagement', 'Reach', 'Conversions'],
    creativeTypes: ['Feed Video', 'Reels Ad', 'Stories Ad', 'Carousel', 'Image Ad'],
    tips: [
      'Reels placements deliver the lowest CPM for music content',
      '9:16 vertical video performs 50% better than horizontal',
      'Lookalike audiences from Instagram followers = highest relevance',
      'Run A/B test between 2 creatives for first 3 days before scaling',
    ],
  },
};

const OBJECTIVES_ICONS: Record<string, any> = {
  streams: Music, followers: Users, reach: Eye, traffic: Globe,
  conversions: Target, views: Play, awareness: Megaphone, engagement: Zap,
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  draft:      { label: 'Draft',      color: '#6B7280', bg: '#6B728015', icon: Edit3 },
  launching:  { label: 'Launching',  color: '#F59E0B', bg: '#F59E0B15', icon: Clock },
  active:     { label: 'Active',     color: '#10B981', bg: '#10B98115', icon: Play },
  paused:     { label: 'Paused',     color: '#9CA3AF', bg: '#9CA3AF15', icon: Pause },
  completed:  { label: 'Completed',  color: '#7B5FFF', bg: '#7B5FFF15', icon: CheckCircle },
};

const COUNTRIES_LIST = [
  'US','UK','NG','GH','ZA','KE','CA','FR','DE','BR','MX','AU','JP','KR','IN','SG','AE','SE','NL','ES',
];

const INTEREST_TAGS = [
  'Music Fans','Hip-Hop Fans','R&B Listeners','Afrobeats','Electronic Music',
  'Pop Music','Independent Artists','Music Streaming','Concert Goers','Festival Fans',
];

function fmtCurrency(n: number) { return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function fmtNum(n: number) { if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`; if (n >= 1_000) return `${(n/1_000).toFixed(1)}K`; return n.toLocaleString(); }

// ── Performance Metrics Row ───────────────────────────────────────────────────
function PerformanceBar({ campaign }: { campaign: any }) {
  const p = campaign.performance || {};
  const plat = AD_PLATFORMS[campaign.platform] || AD_PLATFORMS.tiktok;
  const budgetPct = campaign.budgetTotal > 0 ? Math.min(((p.spend || 0) / campaign.budgetTotal) * 100, 100) : 0;

  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mt-3">
      {[
        { label: 'Impressions',  value: fmtNum(p.impressions  || 0), color: '#00C4FF' },
        { label: 'Clicks',       value: fmtNum(p.clicks       || 0), color: '#7B5FFF' },
        { label: 'Spend',        value: fmtCurrency(p.spend   || 0), color: plat.color },
        { label: 'CTR',          value: `${p.ctr || 0}%`,            color: '#10B981' },
        { label: 'CPM',          value: p.cpm ? fmtCurrency(p.cpm) : '—', color: '#F59E0B' },
        { label: 'ROAS',         value: p.roas ? `${p.roas}×` : '—', color: '#D63DF6' },
      ].map(m => (
        <div key={m.label} className="bg-white/[0.03] rounded-xl p-2.5 text-center">
          <p className="text-sm font-black" style={{ color: m.color }}>{m.value}</p>
          <p className="text-[9px] text-white/30 mt-0.5">{m.label}</p>
        </div>
      ))}
      {campaign.budgetTotal > 0 && (
        <div className="col-span-4 sm:col-span-6">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-white/30">Budget Spent</span>
            <span className="text-[10px] font-bold text-white">{fmtCurrency(p.spend || 0)} / {fmtCurrency(campaign.budgetTotal)}</span>
          </div>
          <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
            <motion.div animate={{ width: `${budgetPct}%` }} transition={{ duration: 0.7 }}
              className="h-full rounded-full" style={{ background: plat.color }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Performance Update Modal ──────────────────────────────────────────────────
function PerformanceModal({ campaign, onSave, onClose }: any) {
  const [perf, setPerf] = useState({ ...campaign.performance });
  const [saving, setSaving] = useState(false);

  const handle = async () => {
    setSaving(true);
    try { await onSave(perf); onClose(); }
    catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const FIELDS = [
    { key: 'impressions', label: 'Impressions' }, { key: 'reach', label: 'Reach' },
    { key: 'clicks', label: 'Clicks' }, { key: 'videoViews', label: 'Video Views' },
    { key: 'spend', label: 'Total Spend ($)' }, { key: 'conversions', label: 'Conversions' },
    { key: 'streams', label: 'Streams Generated' }, { key: 'followers', label: 'Followers Gained' },
    { key: 'roas', label: 'ROAS (e.g. 3.5)' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        className="bg-[#0D0D0D] border border-white/[0.08] rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <h2 className="text-sm font-bold text-white">Update Performance — {campaign.name}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5 grid grid-cols-3 gap-3">
          {FIELDS.map(f => (
            <div key={f.key}>
              <label className="block text-[10px] text-white/40 mb-1 uppercase tracking-wider">{f.label}</label>
              <input type="number" step={f.key === 'roas' ? '0.1' : '1'} min="0"
                value={(perf as any)[f.key] || 0}
                onChange={e => setPerf((p: any) => ({ ...p, [f.key]: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/40" />
            </div>
          ))}
        </div>
        <div className="p-5 border-t border-white/[0.06] flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm text-white/60 bg-white/[0.05]">Cancel</button>
          <button onClick={handle} disabled={saving}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
            {saving ? 'Saving…' : 'Save Performance Data'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Campaign Card ─────────────────────────────────────────────────────────────
function CampaignCard({ campaign, onEdit, onDelete, onUpdatePerf, onStatusChange }: any) {
  const [expanded, setExpanded] = useState(false);
  const [showPerfModal, setShowPerfModal] = useState(false);
  const plat = AD_PLATFORMS[campaign.platform] || AD_PLATFORMS.tiktok;
  const PIcon = plat.icon;
  const sc = STATUS_CFG[campaign.status] || STATUS_CFG.draft;
  const StatusIcon = sc.icon;

  const days = campaign.startDate && campaign.endDate
    ? Math.ceil((new Date(campaign.endDate).getTime() - new Date(campaign.startDate).getTime()) / 86400000)
    : null;

  return (
    <div className={`bg-[#0D0D0D] border rounded-2xl overflow-hidden transition-all ${campaign.status === 'active' ? 'border-[#10B981]/25 shadow-[0_0_20px_#10B98108]' : 'border-white/[0.07]'}`}>

      {/* Status badge top strip */}
      {campaign.status === 'active' && (
        <div className="flex items-center gap-2 px-4 py-2 bg-[#10B981]/08 border-b border-[#10B981]/15">
          <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
          <span className="text-[11px] font-bold text-[#10B981] uppercase tracking-wider">Campaign Live</span>
          {campaign.platformCampaignId && (
            <span className="ml-auto text-[10px] text-white/30 font-mono">ID: {campaign.platformCampaignId}</span>
          )}
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-4 mb-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: plat.bg }}>
            <PIcon size={20} style={{ color: plat.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="text-sm font-bold text-white truncate">{campaign.name}</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1" style={{ background: sc.bg, color: sc.color }}>
                <StatusIcon size={9} />{sc.label}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/40 flex-wrap">
              <span style={{ color: plat.color }}>{plat.label}</span>
              <span className="text-white/20">·</span>
              <span>{campaign.objective}</span>
              {campaign.artistName && <><span className="text-white/20">·</span><span className="text-[#7B5FFF]">{campaign.artistName}</span></>}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => setExpanded(!expanded)} className="p-1.5 text-white/30 hover:text-white transition-colors">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {/* Budget + Date Summary */}
        <div className="flex items-center gap-3 flex-wrap text-xs">
          <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-xl px-2.5 py-1.5">
            <DollarSign size={11} className="text-[#10B981]" />
            <span className="text-white font-semibold">{fmtCurrency(campaign.budgetTotal || 0)}</span>
            <span className="text-white/30">total</span>
            {campaign.budgetDaily > 0 && <span className="text-white/30">· ${campaign.budgetDaily}/day</span>}
          </div>
          {campaign.startDate && (
            <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-xl px-2.5 py-1.5">
              <Calendar size={11} className="text-[#7B5FFF]" />
              <span className="text-white/60">{campaign.startDate}{campaign.endDate ? ` → ${campaign.endDate}` : ''}</span>
              {days && <span className="text-white/30">({days}d)</span>}
            </div>
          )}
          {(campaign.geoTargets || []).length > 0 && (
            <div className="flex items-center gap-1">
              {campaign.geoTargets.slice(0, 3).map((g: string) => (
                <span key={g} className="text-[10px] px-1.5 py-0.5 bg-white/[0.04] rounded text-white/50">{g}</span>
              ))}
              {campaign.geoTargets.length > 3 && <span className="text-[10px] text-white/25">+{campaign.geoTargets.length - 3}</span>}
            </div>
          )}
        </div>

        {/* Performance mini-bar */}
        {campaign.status !== 'draft' && <PerformanceBar campaign={campaign} />}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {/* Launch Button */}
          <a href={plat.newCampaignUrl} target="_blank" rel="noopener noreferrer"
            onClick={() => onStatusChange(campaign.id, 'launching')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${plat.color}CC, ${plat.color}88)` }}>
            <ExternalLink size={11} /> Open {plat.label.split(' ')[0]}
          </a>

          {campaign.status === 'launching' && (
            <button onClick={() => onStatusChange(campaign.id, 'active')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981]">
              <Check size={11} /> Mark Active
            </button>
          )}
          {campaign.status === 'active' && (
            <button onClick={() => onStatusChange(campaign.id, 'paused')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/[0.05] border border-white/[0.10] text-white/60">
              <Pause size={11} /> Pause
            </button>
          )}
          {campaign.status === 'paused' && (
            <button onClick={() => onStatusChange(campaign.id, 'active')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981]">
              <Play size={11} /> Resume
            </button>
          )}
          {['active', 'paused'].includes(campaign.status) && (
            <button onClick={() => onStatusChange(campaign.id, 'completed')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#7B5FFF]/15 border border-[#7B5FFF]/30 text-[#7B5FFF]">
              <CheckCircle size={11} /> Complete
            </button>
          )}

          <button onClick={() => setShowPerfModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/[0.04] border border-white/[0.08] text-white/60 hover:text-white hover:border-white/20 transition-all">
            <BarChart2 size={11} /> Update Stats
          </button>

          <div className="ml-auto flex gap-1">
            <button onClick={() => onEdit(campaign)} className="p-1.5 text-white/30 hover:text-white rounded-lg hover:bg-white/[0.06]">
              <Edit3 size={13} />
            </button>
            <button onClick={() => onDelete(campaign.id)} className="p-1.5 text-white/30 hover:text-[#FF5252] rounded-lg hover:bg-[#FF5252]/10">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/[0.05] overflow-hidden">
            <div className="p-4 space-y-4">
              {/* Platform Tips */}
              <div className="p-3 rounded-xl border border-white/[0.05]" style={{ background: `${plat.color}08` }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: plat.color }}>Platform Best Practices</p>
                <ul className="space-y-1">
                  {plat.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11px] text-white/60">
                      <Zap size={9} className="mt-0.5 flex-shrink-0" style={{ color: plat.color }} />{tip}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Targeting Details */}
              {campaign.interests?.length > 0 && (
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Interest Targeting</p>
                  <div className="flex flex-wrap gap-1">
                    {campaign.interests.map((i: string) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 bg-[#7B5FFF]/10 text-[#7B5FFF] rounded-md">{i}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Creative Info */}
              {campaign.adCopy && (
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Ad Copy</p>
                  <p className="text-xs text-white/60 bg-white/[0.03] rounded-xl p-3 leading-relaxed">{campaign.adCopy}</p>
                </div>
              )}
              {campaign.destinationUrl && (
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Destination URL</p>
                  <a href={campaign.destinationUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-[#00C4FF] hover:underline flex items-center gap-1">
                    <ExternalLink size={10} />{campaign.destinationUrl}
                  </a>
                </div>
              )}

              {/* Campaign ID entry */}
              <CampaignIdEntry campaign={campaign} onSave={(cid: string) => onEdit({ ...campaign, platformCampaignId: cid })} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Performance Modal */}
      <AnimatePresence>
        {showPerfModal && (
          <PerformanceModal campaign={campaign}
            onSave={(perf: any) => { onUpdatePerf(campaign.id, perf); setShowPerfModal(false); }}
            onClose={() => setShowPerfModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Campaign ID Entry ─────────────────────────────────────────────────────────
function CampaignIdEntry({ campaign, onSave }: any) {
  const [cid, setCid] = useState(campaign.platformCampaignId || '');
  const [saving, setSaving] = useState(false);
  const plat = AD_PLATFORMS[campaign.platform] || AD_PLATFORMS.tiktok;

  return (
    <div>
      <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Platform Campaign ID</p>
      <div className="flex gap-2">
        <input value={cid} onChange={e => setCid(e.target.value)}
          placeholder={`Enter your ${plat.label.split(' ')[0]} campaign ID after launching…`}
          className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-white/25 focus:outline-none focus:border-[#7B5FFF]/40" />
        <button disabled={saving || !cid.trim()}
          onClick={async () => { setSaving(true); await onSave(cid); setSaving(false); toast.success('Campaign ID saved!'); }}
          className="px-3 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
          {saving ? '…' : <Save size={12} />}
        </button>
      </div>
    </div>
  );
}

// ── Campaign Builder Form ─────────────────────────────────────────────────────
function CampaignForm({ campaign, creators, onSave, onClose }: any) {
  const isEdit = !!campaign?.id;
  const [step, setStep] = useState(0); // 0: Platform → 1: Details → 2: Targeting → 3: Creative → 4: Review
  const [form, setForm] = useState({
    platform: campaign?.platform || 'tiktok',
    name: campaign?.name || '',
    objective: campaign?.objective || '',
    clientName: campaign?.clientName || '',
    trackTitle: campaign?.trackTitle || '',
    artistName: campaign?.artistName || '',
    budgetTotal: campaign?.budgetTotal || 0,
    budgetDaily: campaign?.budgetDaily || 0,
    startDate: campaign?.startDate || '',
    endDate: campaign?.endDate || '',
    geoTargets: campaign?.geoTargets || ['US'],
    ageMin: campaign?.ageMin || 18,
    ageMax: campaign?.ageMax || 34,
    genders: campaign?.genders || ['all'],
    interests: campaign?.interests || [],
    languages: campaign?.languages || ['English'],
    creativeType: campaign?.creativeType || '',
    adCopy: campaign?.adCopy || '',
    headline: campaign?.headline || '',
    ctaText: campaign?.ctaText || 'Listen Now',
    destinationUrl: campaign?.destinationUrl || '',
    creativeUrls: campaign?.creativeUrls || [''],
    assignedCreators: campaign?.assignedCreators || [],
    notes: campaign?.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const plat = AD_PLATFORMS[form.platform] || AD_PLATFORMS.tiktok;
  const PIcon = plat.icon;

  const STEPS = ['Platform', 'Campaign Details', 'Targeting', 'Creative', 'Review'];

  const handle = async () => {
    if (!form.name.trim()) { toast.error('Campaign name required'); return; }
    if (form.budgetTotal <= 0) { toast.error('Budget must be greater than 0'); return; }
    setSaving(true);
    try {
      await onSave({ ...form, creativeUrls: form.creativeUrls.filter(Boolean) });
      onClose();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const toggleGeo = (code: string) => {
    setForm(f => ({ ...f, geoTargets: f.geoTargets.includes(code) ? f.geoTargets.filter((g: string) => g !== code) : [...f.geoTargets, code] }));
  };

  const toggleInterest = (interest: string) => {
    setForm(f => ({ ...f, interests: f.interests.includes(interest) ? f.interests.filter((i: string) => i !== interest) : [...f.interests, interest] }));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        className="bg-[#0D0D0D] border border-white/[0.08] rounded-2xl w-full max-w-2xl my-4">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: plat.bg }}>
              <PIcon size={16} style={{ color: plat.color }} />
            </div>
            <h2 className="text-sm font-bold text-white">{isEdit ? 'Edit Campaign' : 'New Ad Campaign'}</h2>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={18} /></button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-0 px-5 pt-4">
          {STEPS.map((s, i) => (
            <button key={s} onClick={() => setStep(i)} className="flex-1 flex flex-col items-center gap-1.5">
              <div className={`w-full h-1 rounded-full transition-all ${i <= step ? '' : 'bg-white/[0.06]'}`}
                style={i <= step ? { background: plat.color } : {}} />
              <span className={`text-[9px] font-semibold transition-colors ${i === step ? 'text-white' : i < step ? 'text-white/40' : 'text-white/20'}`}>
                {s}
              </span>
            </button>
          ))}
        </div>

        {/* Step Content */}
        <div className="p-5 max-h-[60vh] overflow-y-auto">

          {/* STEP 0: Platform */}
          {step === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-white/40">Choose the ad platform for this campaign.</p>
              <div className="grid grid-cols-1 gap-3">
                {Object.entries(AD_PLATFORMS).map(([key, p]) => {
                  const PIc = p.icon;
                  return (
                    <button key={key} onClick={() => setForm(f => ({ ...f, platform: key, objective: p.objectives[0], creativeType: p.creativeTypes[0] }))}
                      className={`flex items-start gap-4 p-4 rounded-2xl border text-left transition-all ${form.platform === key ? 'border-transparent' : 'border-white/[0.07] hover:border-white/20'}`}
                      style={form.platform === key ? { background: p.bg, borderColor: `${p.color}40` } : { background: '#111' }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${p.color}20` }}>
                        <PIc size={20} style={{ color: p.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-bold text-white">{p.label}</p>
                          {form.platform === key && <Check size={13} className="text-[#10B981]" />}
                        </div>
                        <p className="text-xs text-white/40 leading-relaxed">{p.tips[0]}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {p.objectives.map(o => (
                            <span key={o} className="text-[9px] px-1.5 py-0.5 border border-white/[0.08] rounded text-white/40">{o}</span>
                          ))}
                        </div>
                      </div>
                      <a href={p.dashboardUrl} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="p-1.5 text-white/20 hover:text-white transition-colors flex-shrink-0 mt-1">
                        <ExternalLink size={12} />
                      </a>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 1: Details */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Campaign Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Afrobeats Summer Push — TikTok"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/40" />
              </div>

              <div>
                <label className="block text-[11px] text-white/40 mb-2 uppercase tracking-wider font-semibold">Campaign Objective *</label>
                <div className="grid grid-cols-2 gap-2">
                  {plat.objectives.map(obj => (
                    <button key={obj} onClick={() => setForm(f => ({ ...f, objective: obj }))}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-semibold text-left transition-all ${form.objective === obj ? 'text-white border-transparent' : 'border-white/[0.07] text-white/40 hover:text-white/70'}`}
                      style={form.objective === obj ? { background: `${plat.color}20`, borderColor: `${plat.color}40`, color: plat.color } : {}}>
                      {obj}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'clientName', label: 'Client / Label Name', placeholder: 'Artist or Label' },
                  { key: 'artistName', label: 'Artist Name', placeholder: 'e.g. DJ Kalani' },
                  { key: 'trackTitle', label: 'Track / Release Title', placeholder: 'e.g. Summer Heat' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">{f.label}</label>
                    <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/40" />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Total Budget (USD) *</label>
                  <input type="number" min="1" value={form.budgetTotal} onChange={e => setForm(f => ({ ...f, budgetTotal: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/40" />
                </div>
                <div>
                  <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Daily Budget (USD)</label>
                  <input type="number" min="0" value={form.budgetDaily} onChange={e => setForm(f => ({ ...f, budgetDaily: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/40" />
                </div>
                <div>
                  <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Start Date</label>
                  <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white/80 focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">End Date</label>
                  <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white/80 focus:outline-none" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Targeting */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Geo */}
              <div>
                <label className="block text-[11px] text-white/40 mb-2 uppercase tracking-wider font-semibold">Target Countries</label>
                <div className="flex flex-wrap gap-2">
                  {COUNTRIES_LIST.map(c => (
                    <button key={c} onClick={() => toggleGeo(c)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${form.geoTargets.includes(c) ? 'text-white border-transparent' : 'border-white/[0.07] text-white/40 hover:text-white/70'}`}
                      style={form.geoTargets.includes(c) ? { background: `${plat.color}25`, borderColor: `${plat.color}50`, color: plat.color } : {}}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Age */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Min Age</label>
                  <input type="number" min="13" max="65" value={form.ageMin}
                    onChange={e => setForm(f => ({ ...f, ageMin: parseInt(e.target.value) || 18 }))}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Max Age</label>
                  <input type="number" min="13" max="65" value={form.ageMax}
                    onChange={e => setForm(f => ({ ...f, ageMax: parseInt(e.target.value) || 34 }))}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none" />
                </div>
              </div>

              {/* Interests */}
              <div>
                <label className="block text-[11px] text-white/40 mb-2 uppercase tracking-wider font-semibold">Interest Targeting</label>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_TAGS.map(interest => (
                    <button key={interest} onClick={() => toggleInterest(interest)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${form.interests.includes(interest) ? 'text-white border-transparent' : 'border-white/[0.07] text-white/40 hover:text-white/70'}`}
                      style={form.interests.includes(interest) ? { background: '#7B5FFF20', borderColor: '#7B5FFF50', color: '#7B5FFF' } : {}}>
                      {interest}
                    </button>
                  ))}
                </div>
              </div>

              {/* Creator assignment */}
              {creators.length > 0 && (
                <div>
                  <label className="block text-[11px] text-white/40 mb-2 uppercase tracking-wider font-semibold">Assign Creators from Network</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {creators.filter((c: any) =>
                      !form.platform || ['tiktok','instagram','youtube'].includes(form.platform)
                        ? ['tiktok','instagram','youtube'].includes(c.platform)
                        : true
                    ).slice(0, 10).map((c: any) => (
                      <button key={c.id}
                        onClick={() => setForm(f => ({ ...f, assignedCreators: f.assignedCreators.includes(c.id) ? f.assignedCreators.filter((id: string) => id !== c.id) : [...f.assignedCreators, c.id] }))}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${form.assignedCreators.includes(c.id) ? 'border-[#7B5FFF]/40 bg-[#7B5FFF]/10' : 'border-white/[0.06] hover:border-white/20'}`}>
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${(TIERS[c.tier]?.color || '#7B5FFF')}20` }}>
                          <span className="text-[9px] font-bold" style={{ color: TIERS[c.tier]?.color || '#7B5FFF' }}>{c.name?.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{c.name}</p>
                          <p className="text-[10px] text-white/40">{c.followers?.toLocaleString()} followers · {c.platform}</p>
                        </div>
                        {form.assignedCreators.includes(c.id) && <Check size={12} className="text-[#7B5FFF]" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Creative */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] text-white/40 mb-2 uppercase tracking-wider font-semibold">Creative Format</label>
                <div className="grid grid-cols-2 gap-2">
                  {plat.creativeTypes.map(ct => (
                    <button key={ct} onClick={() => setForm(f => ({ ...f, creativeType: ct }))}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-semibold text-left transition-all ${form.creativeType === ct ? 'text-white border-transparent' : 'border-white/[0.07] text-white/40 hover:text-white/70'}`}
                      style={form.creativeType === ct ? { background: `${plat.color}20`, borderColor: `${plat.color}40`, color: plat.color } : {}}>
                      {ct}
                    </button>
                  ))}
                </div>
              </div>

              {[
                { key: 'headline', label: 'Ad Headline', placeholder: 'New Music Out Now — Listen on Spotify' },
                { key: 'adCopy',   label: 'Ad Copy / Caption', placeholder: 'Describe your music, what mood it creates, why people should click…' },
                { key: 'ctaText',  label: 'Call To Action', placeholder: 'Listen Now, Stream Now, Watch Now, Download…' },
                { key: 'destinationUrl', label: 'Destination URL', placeholder: 'https://open.spotify.com/track/…' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">{f.label}</label>
                  {f.key === 'adCopy' ? (
                    <textarea value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      rows={3} placeholder={f.placeholder}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/40 resize-none" />
                  ) : (
                    <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/40" />
                  )}
                </div>
              ))}

              <div>
                <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Creative Asset URLs</label>
                {form.creativeUrls.map((url: string, i: number) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input value={url} onChange={e => { const arr = [...form.creativeUrls]; arr[i] = e.target.value; setForm(f => ({ ...f, creativeUrls: arr })); }}
                      placeholder={`Link to video/image asset #${i + 1} (Google Drive, Dropbox, etc.)`}
                      className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none" />
                    {i > 0 && <button onClick={() => setForm(f => ({ ...f, creativeUrls: f.creativeUrls.filter((_: any, idx: number) => idx !== i) }))} className="text-white/30 hover:text-[#FF5252]"><X size={14} /></button>}
                  </div>
                ))}
                <button onClick={() => setForm(f => ({ ...f, creativeUrls: [...f.creativeUrls, ''] }))}
                  className="text-xs text-[#7B5FFF] hover:text-[#D63DF6] flex items-center gap-1">
                  <Plus size={10} /> Add another asset
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Review */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl border" style={{ background: `${plat.color}08`, borderColor: `${plat.color}25` }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: plat.bg }}>
                    <PIcon size={18} style={{ color: plat.color }} />
                  </div>
                  <div>
                    <p className="text-base font-black text-white">{form.name || 'Untitled Campaign'}</p>
                    <p className="text-xs" style={{ color: plat.color }}>{plat.label} · {form.objective}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Total Budget', value: fmtCurrency(form.budgetTotal) },
                    { label: 'Daily Budget', value: form.budgetDaily > 0 ? fmtCurrency(form.budgetDaily) : '—' },
                    { label: 'Duration', value: form.startDate && form.endDate ? `${Math.ceil((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86400000)} days` : '—' },
                    { label: 'Geo Targets', value: form.geoTargets.join(', ') || '—' },
                    { label: 'Age Range', value: `${form.ageMin}–${form.ageMax}` },
                    { label: 'Creative Format', value: form.creativeType || '—' },
                  ].map(m => (
                    <div key={m.label} className="bg-white/[0.04] rounded-xl p-3">
                      <p className="text-[10px] text-white/30 mb-0.5">{m.label}</p>
                      <p className="text-xs font-bold text-white">{m.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Launch Instructions */}
              <div className="p-4 bg-[#F59E0B]/08 border border-[#F59E0B]/20 rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} className="text-[#F59E0B]" />
                  <p className="text-xs font-bold text-[#F59E0B]">Launch Workflow</p>
                </div>
                <ol className="space-y-1.5">
                  {[
                    `Click "Save Campaign" below — campaign saved as Draft in MIXXEA`,
                    `Click "Open ${plat.label.split(' ')[0]}" to go to ${plat.label} manager`,
                    `Create your campaign there using the details above`,
                    `Copy the campaign ID from ${plat.label} and paste it in the Campaign ID field`,
                    `Click "Mark Active" when the campaign is running`,
                    `Update performance stats daily from your ${plat.label} dashboard`,
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-white/60">
                      <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${plat.color}25`, color: plat.color, fontSize: '10px', fontWeight: 700 }}>{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              <div>
                <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Internal Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} placeholder="Any internal notes about this campaign…"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none resize-none" />
              </div>
            </div>
          )}
        </div>

        {/* Footer Nav */}
        <div className="p-5 border-t border-white/[0.06] flex items-center gap-3">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-white/60 bg-white/[0.05] hover:bg-white/[0.08]">
              ← Back
            </button>
          )}
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium text-white/40">Cancel</button>
          <div className="flex-1" />
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(s => s + 1)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${plat.color}CC, ${plat.color}88)` }}>
              Next <ArrowRight size={14} />
            </button>
          ) : (
            <button onClick={handle} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
              <Save size={14} />{saving ? 'Saving…' : isEdit ? 'Update Campaign' : 'Save Campaign'}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function AdminCampaignRunner() {
  const { token } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any>(null);
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [c, cr] = await Promise.all([
        api.adminGetAdCampaigns(token).catch(() => ({ campaigns: [] })),
        api.adminGetCreatorNetwork(token).catch(() => ({ creators: [] })),
      ]);
      setCampaigns(c.campaigns || []);
      setCreators(cr.creators || []);
    } finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (data: any) => {
    if (editingCampaign?.id) {
      const r = await api.adminUpdateAdCampaign(token!, editingCampaign.id, data);
      setCampaigns(prev => prev.map(c => c.id === editingCampaign.id ? r.campaign : c));
      toast.success('Campaign updated!');
    } else {
      const r = await api.adminCreateAdCampaign(token!, data);
      setCampaigns(prev => [r.campaign, ...prev]);
      toast.success(`✅ Campaign "${r.campaign.name}" created!`);
    }
    setEditingCampaign(null);
  };

  const handleStatusChange = async (id: string, status: string) => {
    const r = await api.adminUpdateAdCampaign(token!, id, { status });
    setCampaigns(prev => prev.map(c => c.id === id ? r.campaign : c));
    toast.success(`Campaign ${status}`);
  };

  const handleUpdatePerf = async (id: string, perf: any) => {
    const r = await api.adminUpdateAdPerformance(token!, id, perf);
    setCampaigns(prev => prev.map(c => c.id === id ? r.campaign : c));
    toast.success('Performance data updated!');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this campaign?')) return;
    await api.adminDeleteAdCampaign(token!, id);
    setCampaigns(prev => prev.filter(c => c.id !== id));
    toast.success('Campaign deleted');
  };

  const filtered = campaigns.filter(c => {
    const matchPlatform = filterPlatform === 'all' || c.platform === filterPlatform;
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchPlatform && matchStatus;
  });

  // Aggregate stats
  const totalSpend = campaigns.reduce((s, c) => s + (c.performance?.spend || 0), 0);
  const totalImpressions = campaigns.reduce((s, c) => s + (c.performance?.impressions || 0), 0);
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Campaign Runner</h1>
          <p className="text-white/40 text-sm mt-1">Build, launch, and track paid campaigns across Spotify, TikTok, YouTube, Google & Meta.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setRefreshing(true); load(); }} disabled={refreshing}
            className="p-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white/40 hover:text-white transition-all disabled:opacity-50">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => { setEditingCampaign(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
            <Plus size={14} /> New Campaign
          </button>
        </div>
      </div>

      {/* Platform Quick Links */}
      <div className="grid grid-cols-5 gap-3">
        {Object.entries(AD_PLATFORMS).map(([key, p]) => {
          const PIcon = p.icon;
          return (
            <a key={key} href={p.dashboardUrl} target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-3 bg-[#0D0D0D] border border-white/[0.07] hover:border-white/20 rounded-2xl transition-all group">
              <PIcon size={20} style={{ color: p.color }} />
              <span className="text-[10px] font-semibold text-white/50 group-hover:text-white/80 text-center">{p.label.split(' ')[0]}</span>
              <ExternalLink size={9} className="text-white/20 group-hover:text-white/40" />
            </a>
          );
        })}
      </div>

      {/* Aggregate Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Active Campaigns', value: activeCampaigns, color: '#10B981', icon: Play },
          { label: 'Total Ad Spend', value: fmtCurrency(totalSpend), color: '#7B5FFF', icon: DollarSign },
          { label: 'Total Impressions', value: fmtNum(totalImpressions), color: '#00C4FF', icon: Eye },
        ].map(m => (
          <div key={m.label} className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${m.color}18` }}>
              <m.icon size={16} style={{ color: m.color }} />
            </div>
            <div>
              <p className="text-lg font-black text-white">{m.value}</p>
              <p className="text-[11px] text-white/40">{m.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}
          className="bg-[#111] border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-white/70 focus:outline-none">
          <option value="all">All Platforms</option>
          {Object.entries(AD_PLATFORMS).map(([k, p]) => <option key={k} value={k} className="bg-[#111]">{p.label}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-[#111] border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-white/70 focus:outline-none">
          <option value="all">All Statuses</option>
          {Object.entries(STATUS_CFG).map(([k, s]) => <option key={k} value={k} className="bg-[#111]">{s.label}</option>)}
        </select>
        <p className="ml-auto text-xs text-white/30 self-center">{filtered.length} campaign{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Campaign List */}
      {loading ? (
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-40 bg-white/[0.03] rounded-2xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-[#0A0A0A] border border-white/[0.05] rounded-2xl">
          <Activity size={36} className="text-white/10 mx-auto mb-4" />
          <p className="text-white/30 text-sm mb-6">
            {campaigns.length === 0 ? 'No campaigns yet — create your first paid campaign' : 'No campaigns match your filters'}
          </p>
          {campaigns.length === 0 && (
            <button onClick={() => setShowForm(true)}
              className="px-6 py-3 rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
              Build First Campaign
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(campaign => (
            <CampaignCard key={campaign.id} campaign={campaign}
              onEdit={(c: any) => { setEditingCampaign(c); setShowForm(true); }}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              onUpdatePerf={handleUpdatePerf}
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <CampaignForm
            campaign={editingCampaign}
            creators={creators}
            onSave={handleSave}
            onClose={() => { setShowForm(false); setEditingCampaign(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Export TIERS for use in CampaignForm
const TIERS: Record<string, { color: string }> = {
  nano: { color: '#6B7280' }, micro: { color: '#00C4FF' },
  standard: { color: '#7B5FFF' }, premium: { color: '#D63DF6' },
  elite: { color: '#F59E0B' },
};
