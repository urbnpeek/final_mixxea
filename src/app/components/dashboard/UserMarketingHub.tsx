// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — User AI Marketing Hub
//  Tabs: Campaign Brief · AI Strategy · Trend Intel · My Results · Auto Rules
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router';
import { useAuth } from './AuthContext';
import * as api from './api';
import { planHasAccess, UpgradeWall } from './PlanGate';
import { toast } from 'sonner';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Brain, Layers, TrendingUp, BarChart2, Settings,
  Plus, Trash2, Check, Copy, ArrowRight, Sparkles,
  Zap, Lock, Crown, Rocket, Music2, Instagram, Youtube,
  Globe, Search, Hash, AlignLeft, Video, Megaphone,
  Clock, CheckCircle, AlertCircle, RefreshCw, ChevronRight,
  ToggleLeft, ToggleRight, Info, ExternalLink, Target,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────
type Tab = 'brief' | 'strategy' | 'trends' | 'results' | 'rules';

const TABS: { id: Tab; label: string; icon: any; requiredPlan?: string; badge?: string }[] = [
  { id: 'brief',    label: 'Campaign Brief',    icon: Layers },
  { id: 'strategy', label: 'AI Strategy',       icon: Brain,      requiredPlan: 'growth', badge: '25cr' },
  { id: 'trends',   label: 'Trend Intel',       icon: TrendingUp, requiredPlan: 'growth', badge: '10cr' },
  { id: 'results',  label: 'My Campaigns',      icon: BarChart2 },
  { id: 'rules',    label: 'Automation',        icon: Settings,   requiredPlan: 'pro' },
];

const PLATFORMS = [
  { id: 'tiktok',    label: 'TikTok',    color: '#FF0050', icon: TrendingUp },
  { id: 'instagram', label: 'Instagram', color: '#E1306C', icon: Instagram },
  { id: 'meta',      label: 'Meta Ads',  color: '#1877F2', icon: Globe },
  { id: 'youtube',   label: 'YouTube',   color: '#FF0000', icon: Youtube },
  { id: 'spotify',   label: 'Spotify',   color: '#1DB954', icon: Music2 },
  { id: 'google',    label: 'Google Ads',color: '#4285F4', icon: Search },
];

const GENRES = ['Hip-Hop','R&B','Pop','Electronic','Afrobeats','Reggaeton','Trap','Latin','Rock','Soul','Jazz','House','Drill','Dancehall','Lo-Fi'];
const MOODS  = ['Hype','Emotional','Chill','Motivational','Dark','Romantic','Party','Spiritual','Melancholic','Aggressive'];
const GOALS  = [
  { id: 'streams',   label: 'Maximize Streams' },
  { id: 'followers', label: 'Grow Followers' },
  { id: 'reach',     label: 'Expand Reach' },
  { id: 'sales',     label: 'Drive Sales' },
];

// ── Shared ────────────────────────────────────────────────────────────────────
function UsageBar({ used, total, label, color = '#7B5FFF' }: any) {
  const pct = total === -1 ? 0 : Math.min(100, Math.round((used / total) * 100));
  const isUnlimited = total === -1;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] text-white/40 w-20 flex-shrink-0">{label}</span>
      {isUnlimited ? (
        <span className="text-[10px] font-bold text-[#10B981]">∞ Unlimited</span>
      ) : (
        <>
          <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
          </div>
          <span className="text-[10px] text-white/40 flex-shrink-0">{used}/{total}</span>
        </>
      )}
    </div>
  );
}

function CreditCostBadge({ cost, enough }: { cost: number; enough: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${enough ? 'border-[#7B5FFF]/25 bg-[#7B5FFF]/10 text-[#C4AEFF]' : 'border-[#FF5252]/25 bg-[#FF5252]/10 text-[#FF5252]'}`}>
      <Zap size={11} />
      {cost} credits {enough ? 'will be deducted' : '— insufficient'}
    </div>
  );
}

function PlatformToggle({ platforms, onChange }: { platforms: string[]; onChange: (p: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PLATFORMS.map(p => {
        const PIcon = p.icon;
        const active = platforms.includes(p.id);
        return (
          <button key={p.id} type="button"
            onClick={() => onChange(active ? platforms.filter(x => x !== p.id) : [...platforms, p.id])}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all"
            style={active ? { background: `${p.color}18`, borderColor: `${p.color}40`, color: p.color } : { borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)' }}>
            <PIcon size={12} />{p.label}
          </button>
        );
      })}
    </div>
  );
}

function StrategyCard({ strategy, onSubmitAsBrief, token }: any) {
  const [submitting, setSubmitting] = useState(false);
  if (!strategy) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.userMcSubmitBrief(token, {
        trackName: strategy._trackName || '',
        artistName: strategy._artistName || '',
        genre: strategy._genre || '',
        platforms: strategy._platforms || [],
        budget: strategy._dailyBudget || 10,
        notes: `AI Strategy: ${strategy.campaign_name}. ${strategy.creative_direction || ''}`,
        goal: 'streams',
      });
      toast.success('✅ Strategy sent to MIXXEA team as a campaign brief!');
    } catch (err: any) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-[#7B5FFF]/25 bg-[#0A0A0A] overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.06]" style={{ background: 'linear-gradient(135deg, rgba(123,95,255,0.1), rgba(214,61,246,0.05))' }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#7B5FFF] mb-1">AI-Generated Strategy</p>
            <h4 className="text-base font-bold text-white">{strategy.campaign_name}</h4>
            <p className="text-xs text-white/40 mt-0.5">{strategy.objective} · {strategy.duration_days}d · ${strategy.total_budget} total budget</p>
          </div>
          <span className="flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold text-[#10B981] bg-[#10B981]/15">Ready</span>
        </div>
      </div>
      <div className="p-5 space-y-4 max-h-[460px] overflow-y-auto">
        {/* Platform breakdown */}
        {(strategy.platform_breakdown || []).length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Platform Allocation</p>
            <div className="space-y-2">
              {strategy.platform_breakdown.map((p: any, i: number) => {
                const cfg = PLATFORMS.find(pl => pl.label === p.platform || pl.id === p.platform?.toLowerCase());
                return (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${cfg?.color || '#7B5FFF'}15` }}>
                      {cfg ? <cfg.icon size={12} style={{ color: cfg.color }} /> : <Globe size={12} className="text-white/40" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-white">{p.platform}</p>
                        <span className="text-xs font-bold" style={{ color: cfg?.color || '#7B5FFF' }}>${p.daily_budget}/day</span>
                      </div>
                      <p className="text-[10px] text-white/35 truncate">{p.format}</p>
                    </div>
                    <span className="text-[10px] font-bold text-white/50">{p.budget_pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* KPIs */}
        {strategy.kpis && (
          <div className="grid grid-cols-2 gap-2">
            {[
              { l: 'Target Streams', v: strategy.kpis.target_streams?.toLocaleString() },
              { l: 'Expected Reach',  v: strategy.kpis.expected_reach?.toLocaleString() },
              { l: 'Target Clicks',  v: strategy.kpis.target_clicks?.toLocaleString() },
              { l: 'CTR',            v: strategy.kpis.expected_ctr },
            ].filter(k => k.v).map(k => (
              <div key={k.l} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] text-center">
                <p className="text-base font-black text-white">{k.v}</p>
                <p className="text-[9px] text-white/35 mt-0.5">{k.l}</p>
              </div>
            ))}
          </div>
        )}
        {/* Creative direction */}
        {strategy.creative_direction && (
          <div className="p-3.5 rounded-xl bg-[#7B5FFF]/08 border border-[#7B5FFF]/15">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#7B5FFF] mb-1.5">Creative Direction</p>
            <p className="text-xs text-white/60 leading-relaxed">{strategy.creative_direction}</p>
          </div>
        )}
        {/* Key messages */}
        {(strategy.key_messages || []).length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Key Messages</p>
            <div className="space-y-1.5">
              {strategy.key_messages.slice(0, 4).map((m: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-xs text-white/60">
                  <div className="w-1 h-1 rounded-full bg-[#D63DF6] mt-1.5 flex-shrink-0" />
                  {m}
                </div>
              ))}
            </div>
          </div>
        )}
        <button onClick={handleSubmit} disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
          <Rocket size={15} />{submitting ? 'Sending to MIXXEA team…' : '🚀 Send to MIXXEA Team as Campaign'}
        </button>
      </div>
    </motion.div>
  );
}

// ── TAB: CAMPAIGN BRIEF ────────────────────────────────────────────────────────
function BriefTab({ token, user, usage, limits, onUsageUpdate }: any) {
  const [form, setForm] = useState({
    artistName: user?.name || '', trackName: '', genre: 'Hip-Hop', mood: 'Hype',
    goal: 'streams', platforms: ['tiktok', 'instagram'], budget: 10, notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [briefs, setBriefs] = useState<any[]>([]);
  const [loadingBriefs, setLoadingBriefs] = useState(true);

  useEffect(() => {
    api.userMcGetBriefs(token).then((d: any) => setBriefs(d.briefs || [])).finally(() => setLoadingBriefs(false));
  }, [token]);

  const briefsUsed = usage?.briefs || 0;
  const briefsLimit = limits?.briefs ?? 1;
  const atLimit = briefsLimit !== -1 && briefsUsed >= briefsLimit;

  const handleSubmit = async () => {
    if (!form.trackName.trim()) { toast.error('Track name is required'); return; }
    if (form.platforms.length === 0) { toast.error('Select at least one platform'); return; }
    setSubmitting(true);
    try {
      const r = await api.userMcSubmitBrief(token, form);
      setBriefs(prev => [r.brief, ...prev]);
      setSubmitted(true);
      onUsageUpdate(r.usage);
      toast.success('✅ Campaign brief submitted! Our team will review it shortly.');
      setTimeout(() => setSubmitted(false), 4000);
    } catch (err: any) {
      toast.error(err.message || 'Submission failed');
    } finally { setSubmitting(false); }
  };

  const STATUS_CFG: Record<string, any> = {
    pending:    { color: '#F59E0B', icon: Clock,         label: 'Under Review' },
    approved:   { color: '#10B981', icon: CheckCircle,   label: 'Approved' },
    active:     { color: '#7B5FFF', icon: Rocket,        label: 'Live' },
    rejected:   { color: '#FF5252', icon: AlertCircle,   label: 'Rejected' },
    completed:  { color: '#6B7280', icon: CheckCircle,   label: 'Completed' },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form */}
      <div className="space-y-5">
        {/* Quota indicator */}
        <div className="p-4 rounded-2xl border border-white/[0.07] bg-[#0A0A0A] space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-white/50">This Month's Briefs</p>
            <Link to="/dashboard/credits" className="text-[10px] text-[#7B5FFF] hover:text-[#D63DF6] transition-colors">Need more? →</Link>
          </div>
          <UsageBar used={briefsUsed} total={briefsLimit} label="Briefs" color="#7B5FFF" />
          {atLimit && (
            <p className="text-[10px] text-[#F59E0B] flex items-center gap-1.5 mt-1">
              <AlertCircle size={10} /> Monthly limit reached — upgrade to submit more
            </p>
          )}
        </div>

        {/* Form card */}
        <div className="p-5 rounded-2xl border border-white/[0.07] bg-[#0A0A0A] space-y-4">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
              <Layers size={13} className="text-white" />
            </div>
            <h3 className="text-sm font-bold text-white">Campaign Brief</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-white/40 mb-1.5 font-semibold uppercase tracking-wider">Artist Name</label>
              <input value={form.artistName} onChange={e => setForm(f => ({ ...f, artistName: e.target.value }))}
                placeholder="Your artist name"
                className="w-full bg-[#111] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50" />
            </div>
            <div>
              <label className="block text-[11px] text-white/40 mb-1.5 font-semibold uppercase tracking-wider">Track Name *</label>
              <input value={form.trackName} onChange={e => setForm(f => ({ ...f, trackName: e.target.value }))}
                placeholder="e.g. Midnight Dreams"
                className="w-full bg-[#111] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-white/40 mb-1.5 font-semibold uppercase tracking-wider">Genre</label>
              <select value={form.genre} onChange={e => setForm(f => ({ ...f, genre: e.target.value }))}
                className="w-full bg-[#111] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/50">
                {GENRES.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-white/40 mb-1.5 font-semibold uppercase tracking-wider">Campaign Goal</label>
              <select value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))}
                className="w-full bg-[#111] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/50">
                {GOALS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-white/40 mb-2 font-semibold uppercase tracking-wider">Target Platforms *</label>
            <PlatformToggle platforms={form.platforms} onChange={p => setForm(f => ({ ...f, platforms: p }))} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] text-white/40 font-semibold uppercase tracking-wider">Daily Budget</label>
              <span className="text-sm font-bold" style={{ color: '#00C4FF' }}>${form.budget}/day</span>
            </div>
            <input type="range" min={5} max={500} step={5} value={form.budget}
              onChange={e => setForm(f => ({ ...f, budget: +e.target.value }))}
              className="w-full accent-[#7B5FFF]" />
            <div className="flex justify-between text-[10px] text-white/25 mt-0.5"><span>$5</span><span>$500</span></div>
          </div>

          <div>
            <label className="block text-[11px] text-white/40 mb-1.5 font-semibold uppercase tracking-wider">Notes / Goals (Optional)</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
              placeholder="e.g. Target fans of Drake, focus on US + UK, launch date March 20th…"
              className="w-full bg-[#111] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50 resize-none" />
          </div>

          <AnimatePresence>
            {submitted ? (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-3 p-4 rounded-2xl bg-[#10B981]/10 border border-[#10B981]/25">
                <CheckCircle size={18} className="text-[#10B981] flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-[#10B981]">Brief Submitted!</p>
                  <p className="text-xs text-white/50 mt-0.5">Our team will review and launch your campaign within 24–48 hours.</p>
                </div>
              </motion.div>
            ) : (
              <button onClick={handleSubmit} disabled={submitting || atLimit || !form.trackName}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-sm font-bold text-white disabled:opacity-40 transition-all relative overflow-hidden group"
                style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'linear-gradient(135deg, #8B6FFF, #E64DF6)' }} />
                <Rocket size={15} className="relative" />
                <span className="relative">{submitting ? 'Submitting…' : atLimit ? 'Monthly Limit Reached' : '🚀 Submit Campaign Brief'}</span>
                {submitting && <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin relative" />}
              </button>
            )}
          </AnimatePresence>

          <p className="text-[10px] text-white/25 text-center flex items-center justify-center gap-1">
            <Info size={9} /> Free on all plans · Our team reviews within 24–48h
          </p>
        </div>
      </div>

      {/* Previous briefs */}
      <div>
        <h3 className="text-sm font-bold text-white mb-4">Your Campaign Briefs</h3>
        {loadingBriefs ? (
          <div className="space-y-2">{Array(3).fill(null).map((_, i) => <div key={i} className="h-20 bg-white/[0.03] rounded-xl animate-pulse" />)}</div>
        ) : briefs.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-dashed border-white/[0.07]">
            <Megaphone size={28} className="text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No briefs submitted yet</p>
            <p className="text-white/25 text-xs mt-1">Submit your first brief to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {briefs.map((brief: any) => {
              const sc = STATUS_CFG[brief.status] || STATUS_CFG.pending;
              const StatusIcon = sc.icon;
              return (
                <motion.div key={brief.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="p-4 rounded-2xl border border-white/[0.07] bg-[#0A0A0A] hover:border-white/[0.11] transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white">{brief.trackName || 'Untitled'}</p>
                      <p className="text-xs text-white/40 mt-0.5">{brief.artistName} · {brief.genre}</p>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {(brief.platforms || []).map((p: string) => {
                          const cfg = PLATFORMS.find(pl => pl.id === p);
                          return <span key={p} className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                            style={{ background: `${cfg?.color || '#7B5FFF'}18`, color: cfg?.color || '#7B5FFF' }}>{cfg?.label || p}</span>;
                        })}
                        <span className="text-[9px] text-white/30">${brief.budget}/day</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold"
                      style={{ background: `${sc.color}15`, color: sc.color }}>
                      <StatusIcon size={10} />{sc.label}
                    </div>
                  </div>
                  <p className="text-[10px] text-white/25 mt-2">{new Date(brief.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── TAB: AI STRATEGY ───────────────────────────────────────────────────────────
function StrategyTab({ token, user, usage, limits, credits, onUsageUpdate, onCreditsUpdate }: any) {
  if (!planHasAccess(user?.plan || 'starter', 'growth')) {
    return <UpgradeWall requiredPlan="growth" featureName="AI Strategy Generator"
      featureDesc="Get a complete AI-generated marketing plan: platform breakdown, budget allocation, content schedule, KPIs and targeting — all in seconds." />;
  }

  const strategiesUsed = usage?.strategies || 0;
  const strategiesLimit = limits?.strategies ?? 3;
  const included = strategiesLimit === -1 ? Infinity : Math.max(0, strategiesLimit - strategiesUsed);
  const needsCredits = included <= 0;
  const hasEnoughCredits = credits >= 25;

  const [form, setForm] = useState({
    artistName: user?.name || '', trackName: '', genre: 'Hip-Hop', mood: 'Hype',
    platforms: ['tiktok', 'instagram'], dailyBudget: 15, targetAudience: '',
  });
  const [strategy, setStrategy] = useState<any>(null);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!form.trackName.trim()) { toast.error('Track name required'); return; }
    if (form.platforms.length === 0) { toast.error('Select at least one platform'); return; }
    setGenerating(true);
    setStrategy(null);
    try {
      const r = await api.userMcAiStrategy(token, form);
      setStrategy({ ...r.strategy, _trackName: form.trackName, _artistName: form.artistName, _genre: form.genre, _platforms: form.platforms, _dailyBudget: form.dailyBudget });
      onUsageUpdate(r.usage);
      if (r.creditsRemaining !== undefined) onCreditsUpdate(r.creditsRemaining);
      if (r.chargedCredits > 0) toast.info(`💳 ${r.chargedCredits} credits deducted`);
      else toast.success('✅ AI Strategy ready!');
    } catch (err: any) { toast.error(err.message || 'Generation failed'); }
    finally { setGenerating(false); }
  };

  return (
    <div className="space-y-6">
      {/* Quota bar */}
      <div className="p-4 rounded-2xl border border-white/[0.07] bg-[#0A0A0A] space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-white/50">AI Strategy Usage This Month</p>
          {needsCredits && <CreditCostBadge cost={25} enough={hasEnoughCredits} />}
        </div>
        <UsageBar used={strategiesUsed} total={strategiesLimit} label="Strategies" color="#7B5FFF" />
        <p className="text-[10px] text-white/30">
          {strategiesLimit === -1 ? 'Unlimited strategies on Pro' :
           included > 0 ? `${included} included this month · Extra strategies cost 25 credits each` :
           `Monthly quota reached · 25 credits per additional strategy`}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="p-5 rounded-2xl border border-white/[0.07] bg-[#0A0A0A] space-y-4">
          <h3 className="text-sm font-bold text-white">Strategy Parameters</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-white/40 mb-1.5 font-semibold uppercase tracking-wider">Artist</label>
              <input value={form.artistName} onChange={e => setForm(f => ({ ...f, artistName: e.target.value }))} placeholder="Artist name"
                className="w-full bg-[#111] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50" />
            </div>
            <div>
              <label className="block text-[11px] text-white/40 mb-1.5 font-semibold uppercase tracking-wider">Track *</label>
              <input value={form.trackName} onChange={e => setForm(f => ({ ...f, trackName: e.target.value }))} placeholder="Track name"
                className="w-full bg-[#111] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-white/40 mb-1.5 font-semibold uppercase tracking-wider">Genre</label>
              <select value={form.genre} onChange={e => setForm(f => ({ ...f, genre: e.target.value }))}
                className="w-full bg-[#111] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/50">
                {GENRES.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-white/40 mb-1.5 font-semibold uppercase tracking-wider">Vibe</label>
              <select value={form.mood} onChange={e => setForm(f => ({ ...f, mood: e.target.value }))}
                className="w-full bg-[#111] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/50">
                {MOODS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-white/40 mb-2 font-semibold uppercase tracking-wider">Platforms</label>
            <PlatformToggle platforms={form.platforms} onChange={p => setForm(f => ({ ...f, platforms: p }))} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] text-white/40 font-semibold uppercase tracking-wider">Daily Budget</label>
              <span className="text-sm font-bold" style={{ color: '#00C4FF' }}>${form.dailyBudget}/day</span>
            </div>
            <input type="range" min={5} max={500} step={5} value={form.dailyBudget}
              onChange={e => setForm(f => ({ ...f, dailyBudget: +e.target.value }))}
              className="w-full accent-[#7B5FFF]" />
          </div>

          <div>
            <label className="block text-[11px] text-white/40 mb-1.5 font-semibold uppercase tracking-wider">Audience Notes</label>
            <textarea value={form.targetAudience} onChange={e => setForm(f => ({ ...f, targetAudience: e.target.value }))} rows={2}
              placeholder="e.g. Fans of SZA and Jhene Aiko, 18–28, US/UK"
              className="w-full bg-[#111] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50 resize-none" />
          </div>

          <button onClick={handleGenerate} disabled={generating || !form.trackName || (needsCredits && !hasEnoughCredits)}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-sm font-bold text-white disabled:opacity-40 relative overflow-hidden group"
            style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'linear-gradient(135deg,#8B6FFF,#E64DF6)' }} />
            <Brain size={15} className="relative" />
            <span className="relative">{generating ? 'AI Strategy Running…' : `⚡ Generate Strategy${needsCredits ? ' (25 cr)' : ''}`}</span>
            {generating && <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin relative" />}
          </button>
        </div>

        {/* Output */}
        <div className="min-h-[380px]">
          <AnimatePresence mode="wait">
            {generating ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="h-full min-h-[380px] rounded-2xl border border-[#7B5FFF]/20 bg-[#0A0A0A] flex flex-col items-center justify-center gap-4">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  className="w-14 h-14 rounded-full border-2 border-[#7B5FFF]/20 border-t-[#7B5FFF]" />
                <div className="text-center">
                  <p className="text-white font-semibold text-sm">Strategy Agent Thinking</p>
                  <p className="text-white/40 text-xs mt-1">Analyzing genre · Allocating budget · Building plan…</p>
                </div>
              </motion.div>
            ) : strategy ? (
              <StrategyCard key="result" strategy={strategy} token={token} onSubmitAsBrief={() => {}} />
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="h-full min-h-[380px] rounded-2xl border border-dashed border-white/[0.07] flex flex-col items-center justify-center gap-3 text-center p-8">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(123,95,255,0.1)', border: '1px solid rgba(123,95,255,0.2)' }}>
                  <Brain size={26} style={{ color: '#7B5FFF' }} />
                </div>
                <p className="text-white font-semibold text-sm">AI Strategy Generator</p>
                <p className="text-white/35 text-xs max-w-xs leading-relaxed">Fill in your track details and generate a complete, platform-optimized campaign plan.</p>
                <div className="flex flex-wrap gap-1.5 justify-center mt-1">
                  {['Budget breakdown', 'Platform targeting', 'Content calendar', 'KPI projections'].map(f => (
                    <span key={f} className="text-[9px] px-2 py-1 rounded-full bg-white/[0.05] text-white/35">{f}</span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ── TAB: TREND INTELLIGENCE ────────────────────────────────────────────────────
function TrendsTab({ token, user, usage, limits, credits, onUsageUpdate, onCreditsUpdate }: any) {
  if (!planHasAccess(user?.plan || 'starter', 'growth')) {
    return <UpgradeWall requiredPlan="growth" featureName="Trend Intelligence"
      featureDesc="Get AI-powered trend reports: viral sounds, hashtag clusters, competitor patterns, and best posting windows — all specific to your genre." />;
  }

  const trendsUsed = usage?.trends || 0;
  const trendsLimit = limits?.trends ?? 3;
  const included = trendsLimit === -1 ? Infinity : Math.max(0, trendsLimit - trendsUsed);
  const needsCredits = included <= 0;
  const hasEnoughCredits = credits >= 10;

  const [genre, setGenre] = useState('Hip-Hop');
  const [platform, setPlatform] = useState('tiktok');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('sounds');

  const handleGenerate = async () => {
    setLoading(true);
    setReport(null);
    try {
      const r = await api.userMcTrends(token, { genre, platform });
      setReport(r.report);
      onUsageUpdate(r.usage);
      if (r.creditsRemaining !== undefined) onCreditsUpdate(r.creditsRemaining);
      if (r.chargedCredits > 0) toast.info(`💳 ${r.chargedCredits} credits deducted`);
      else toast.success('✅ Trend report generated!');
    } catch (err: any) { toast.error(err.message || 'Failed to generate report'); }
    finally { setLoading(false); }
  };

  const TREND_ICON: Record<string, any> = { rising: TrendingUp, viral: Sparkles, declining: ChevronRight };
  const TREND_COLOR: Record<string, string> = { rising: '#10B981', viral: '#F59E0B', declining: '#9CA3AF' };

  const sections = [
    { id: 'sounds',   label: 'Trending Sounds',    count: report?.trending_sounds?.length },
    { id: 'hashtags', label: 'Hashtag Clusters',   count: report?.hashtag_clusters?.length },
    { id: 'content',  label: 'Content Patterns',   count: report?.content_patterns?.length },
    { id: 'times',    label: 'Posting Times',       count: report?.best_posting_times?.length },
  ];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="p-5 rounded-2xl border border-white/[0.07] bg-[#0A0A0A]">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-white/50">Trend Intelligence · {genre} on {PLATFORMS.find(p => p.id === platform)?.label}</p>
              {needsCredits && <CreditCostBadge cost={10} enough={hasEnoughCredits} />}
            </div>
            <UsageBar used={trendsUsed} total={trendsLimit} label="Reports" color="#F59E0B" />
            <div className="flex gap-3 flex-wrap">
              <div>
                <label className="block text-[11px] text-white/40 mb-1 font-semibold uppercase tracking-wider">Genre</label>
                <select value={genre} onChange={e => setGenre(e.target.value)}
                  className="bg-[#111] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F59E0B]/40">
                  {GENRES.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-white/40 mb-1 font-semibold uppercase tracking-wider">Platform Focus</label>
                <select value={platform} onChange={e => setPlatform(e.target.value)}
                  className="bg-[#111] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F59E0B]/40">
                  {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
            </div>
          </div>
          <button onClick={handleGenerate} disabled={loading || (needsCredits && !hasEnoughCredits)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444)' }}>
            <TrendingUp size={14} />
            {loading ? 'Analyzing trends…' : `Generate Report${needsCredits ? ' (10 cr)' : ''}`}
            {loading && <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {loading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="rounded-2xl border border-[#F59E0B]/20 bg-[#0A0A0A] p-12 flex flex-col items-center gap-4">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="w-12 h-12 rounded-full border-2 border-[#F59E0B]/20 border-t-[#F59E0B]" />
            <p className="text-white font-semibold text-sm">Trend Intelligence Agent Running</p>
            <p className="text-white/40 text-xs">Scanning viral content · Analyzing hashtag data · Mapping patterns…</p>
          </motion.div>
        ) : report ? (
          <motion.div key="report" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* AI Recommendation banner */}
            {report.ai_recommendation && (
              <div className="p-4 rounded-2xl border border-[#F59E0B]/20 bg-[#F59E0B]/08 flex items-start gap-3">
                <Sparkles size={16} className="text-[#F59E0B] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#F59E0B] mb-1">AI Recommendation</p>
                  <p className="text-sm text-white/70 leading-relaxed">{report.ai_recommendation}</p>
                </div>
              </div>
            )}

            {/* Section tabs */}
            <div className="flex gap-2 flex-wrap">
              {sections.filter(s => s.count).map(s => (
                <button key={s.id} onClick={() => setActiveSection(s.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${activeSection === s.id ? 'border-[#F59E0B]/35 bg-[#F59E0B]/15 text-[#F5C26B]' : 'border-white/[0.07] text-white/40 hover:text-white/60'}`}>
                  {s.label} {s.count ? <span className="ml-1 opacity-50">({s.count})</span> : null}
                </button>
              ))}
            </div>

            {/* Trending sounds */}
            {activeSection === 'sounds' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(report.trending_sounds || []).map((s: any, i: number) => {
                  const TIcon = TREND_ICON[s.trend] || TrendingUp;
                  const color = TREND_COLOR[s.trend] || '#9CA3AF';
                  return (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                      className="p-4 rounded-2xl border border-white/[0.07] bg-[#0A0A0A] hover:border-white/[0.12] transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-bold text-white">{s.name}</p>
                          <p className="text-xs text-white/40">{s.artist}</p>
                        </div>
                        <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold" style={{ background: `${color}15`, color }}>
                          <TIcon size={9} />{s.trend}
                        </div>
                      </div>
                      <p className="text-xs text-white/50 leading-relaxed">{s.description}</p>
                      <p className="text-[10px] text-white/25 mt-2">{s.streams} streams</p>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Hashtag clusters */}
            {activeSection === 'hashtags' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(report.hashtag_clusters || []).map((c: any, i: number) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                    className="p-4 rounded-2xl border border-white/[0.07] bg-[#0A0A0A]">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-bold text-white">{c.cluster}</p>
                      <span className="text-[10px] font-bold text-[#10B981]">+{c.growth}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(c.tags || []).map((t: string) => (
                        <span key={t} className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-[#7B5FFF]/10 text-[#C4AEFF]">{t}</span>
                      ))}
                    </div>
                    <p className="text-[10px] text-white/25 mt-2">{c.avg_views} avg views</p>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Content patterns */}
            {activeSection === 'content' && (
              <div className="space-y-3">
                {(report.content_patterns || []).map((p: any, i: number) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                    className="p-4 rounded-2xl border border-white/[0.07] bg-[#0A0A0A]">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#D63DF6]/10">
                        <Video size={14} className="text-[#D63DF6]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">{p.format}</p>
                        <p className="text-xs text-white/50 mt-0.5 leading-relaxed">{p.description}</p>
                        {p.why_it_works && <p className="text-[10px] text-[#10B981] mt-2">✓ {p.why_it_works}</p>}
                        {p.example && <p className="text-[10px] text-white/30 mt-1 italic">"{p.example}"</p>}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Posting times */}
            {activeSection === 'times' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(report.best_posting_times || []).map((t: any, i: number) => {
                  const pCfg = PLATFORMS.find(p => p.id === platform);
                  return (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                      className="p-4 rounded-2xl border border-white/[0.07] bg-[#0A0A0A] flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${pCfg?.color || '#7B5FFF'}15` }}>
                        <Clock size={16} style={{ color: pCfg?.color || '#7B5FFF' }} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{t.day} · {t.time}</p>
                        <p className="text-xs text-white/40">{t.platform} — {t.reason}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

// ── TAB: MY CAMPAIGNS ──────────────────────────────────────────────────────────
function ResultsTab({ token }: any) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.userMcGetAnalytics(token).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const t = data?.totals || {};
  const PCOLOR: Record<string, string> = { tiktok: '#FF0050', instagram: '#E1306C', meta: '#1877F2', youtube: '#FF0000', spotify: '#1DB954', google: '#4285F4' };
  const STATUS_CFG: Record<string, any> = {
    active:    { color: '#10B981', label: 'Active' },
    draft:     { color: '#F59E0B', label: 'Draft' },
    paused:    { color: '#9CA3AF', label: 'Paused' },
    completed: { color: '#6B7280', label: 'Done'  },
  };

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { l: 'Spend',       v: loading ? '—' : `$${(t.spend||0).toLocaleString()}`,          c: '#00C4FF' },
          { l: 'Streams',     v: loading ? '—' : (t.streams||0).toLocaleString(),              c: '#1DB954' },
          { l: 'Clicks',      v: loading ? '—' : (t.clicks||0).toLocaleString(),               c: '#D63DF6' },
          { l: 'ROI',         v: loading ? '—' : `${t.roi||0}%`,                               c: '#FF5252' },
        ].map(k => (
          <div key={k.l} className="rounded-2xl border border-white/[0.07] p-4 bg-[#0A0A0A] text-center">
            <p className="text-xl font-black text-white">{k.v}</p>
            <p className="text-[10px] mt-1 font-semibold uppercase tracking-wider" style={{ color: k.c }}>{k.l}</p>
          </div>
        ))}
      </div>

      {/* AI Insight */}
      {!loading && data?.insight && (
        <div className="flex items-start gap-3 p-4 rounded-2xl border border-[#7B5FFF]/20 bg-[#7B5FFF]/06">
          <Brain size={14} className="text-[#7B5FFF] mt-0.5 flex-shrink-0" />
          <p className="text-sm text-white/65 leading-relaxed">{data.insight}</p>
        </div>
      )}

      {/* Campaigns */}
      {loading ? (
        <div className="space-y-2">{Array(4).fill(null).map((_, i) => <div key={i} className="h-20 bg-white/[0.03] rounded-xl animate-pulse" />)}</div>
      ) : (data?.campaigns || []).length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-white/[0.07]">
          <Target size={28} className="text-white/20 mx-auto mb-3" />
          <p className="text-white/40 text-sm">No campaigns running yet</p>
          <p className="text-white/25 text-xs mt-1 max-w-xs mx-auto leading-relaxed">
            Submit a Campaign Brief and our team will launch your first AI-powered campaign. Results will appear here.
          </p>
          <Link to="/dashboard/marketing" className="inline-flex items-center gap-2 mt-4 px-4 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
            <Layers size={13} /> Submit a Brief
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white">Your Campaigns</h3>
          {data.campaigns.map((c: any) => {
            const sc = STATUS_CFG[c.status] || STATUS_CFG.draft;
            return (
              <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="p-4 rounded-2xl border border-white/[0.07] bg-[#0A0A0A] hover:border-white/[0.11] transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">{c.trackName || 'Untitled'}</p>
                    <p className="text-xs text-white/40 mt-0.5">{c.artistName}</p>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {(c.platforms || []).map((p: string) => (
                        <span key={p} className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: `${PCOLOR[p] || '#7B5FFF'}18`, color: PCOLOR[p] || '#7B5FFF' }}>{p}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold"
                      style={{ background: `${sc.color}15`, color: sc.color }}>
                      <span className="w-1 h-1 rounded-full" style={{ background: sc.color }} />{sc.label}
                    </span>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                      {[
                        { l: 'Spend',   v: `$${(c.metrics?.spend||0).toFixed(0)}` },
                        { l: 'Streams', v: (c.metrics?.streams||0).toLocaleString() },
                        { l: 'Clicks',  v: (c.metrics?.clicks||0).toLocaleString() },
                      ].map(m => (
                        <div key={m.l}>
                          <p className="text-xs font-bold text-white">{m.v}</p>
                          <p className="text-[9px] text-white/30">{m.l}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── TAB: AUTOMATION RULES ──────────────────────────────────────────────────────
function RulesTab({ token, user }: any) {
  if ((user?.plan || 'starter') !== 'pro') {
    return <UpgradeWall requiredPlan="pro" featureName="Automation Rules"
      featureDesc="Set up smart content automation: auto-schedule posts when you release new music, get AI caption suggestions when engagement drops, and more." />;
  }

  const TRIGGERS = [
    { id: 'new_release',    label: 'When I submit a new release' },
    { id: 'brief_approved', label: 'When my campaign brief is approved' },
    { id: 'weekly',         label: 'Every Monday morning' },
    { id: 'monthly',        label: 'Start of each month' },
  ];
  const ACTIONS = [
    { id: 'schedule_posts',       label: 'Auto-schedule 7 days of social posts' },
    { id: 'generate_captions',    label: 'Generate 10 new AI captions' },
    { id: 'generate_hashtags',    label: 'Refresh hashtag sets' },
    { id: 'submit_brief',         label: 'Auto-submit campaign brief' },
    { id: 'notify_me',            label: 'Send me an email digest' },
  ];

  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', trigger: 'new_release', action: 'schedule_posts' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api.userMcGetRules(token).then((d: any) => setRules(d.rules || [])).finally(() => setLoading(false));
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Rule name required'); return; }
    setSaving(true);
    try {
      const r = await api.userMcCreateRule(token, form);
      setRules(prev => [r.rule, ...prev]);
      setShowForm(false);
      setForm({ name: '', trigger: 'new_release', action: 'schedule_posts' });
      toast.success('✅ Automation rule created!');
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleToggle = async (rule: any) => {
    try {
      const r = await api.userMcUpdateRule(token, rule.id, { status: rule.status === 'active' ? 'paused' : 'active' });
      setRules(prev => prev.map(x => x.id === rule.id ? r.rule : x));
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.userMcDeleteRule(token, id);
      setRules(prev => prev.filter(r => r.id !== id));
      toast.success('Rule deleted');
    } catch (err: any) { toast.error(err.message); }
  };

  const triggerLabel = (t: string) => TRIGGERS.find(x => x.id === t)?.label || t;
  const actionLabel  = (a: string) => ACTIONS.find(x => x.id === a)?.label || a;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Automation Rules</h3>
          <p className="text-xs text-white/40 mt-0.5">{rules.length}/10 rules · Pro plan</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} disabled={rules.length >= 10}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}>
          <Plus size={13} /> New Rule
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-[#7B5FFF]/25 bg-[#0A0A0A] p-5 space-y-4">
            <h4 className="text-sm font-bold text-white">Create Rule</h4>
            <div>
              <label className="block text-[11px] text-white/40 mb-1.5 font-semibold uppercase tracking-wider">Rule Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Auto-post on new release"
                className="w-full bg-[#111] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-white/40 mb-1.5 font-semibold uppercase tracking-wider">Trigger (WHEN)</label>
                <select value={form.trigger} onChange={e => setForm(f => ({ ...f, trigger: e.target.value }))}
                  className="w-full bg-[#111] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/50">
                  {TRIGGERS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-white/40 mb-1.5 font-semibold uppercase tracking-wider">Action (DO THIS)</label>
                <select value={form.action} onChange={e => setForm(f => ({ ...f, action: e.target.value }))}
                  className="w-full bg-[#111] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/50">
                  {ACTIONS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
              </div>
            </div>
            {/* Preview */}
            <div className="p-3 rounded-xl border border-[#00C4FF]/20 bg-[#00C4FF]/05">
              <p className="text-xs text-white/60">
                <span className="text-[#7B5FFF] font-bold">WHEN</span> {triggerLabel(form.trigger)}&nbsp;→&nbsp;
                <span className="text-[#D63DF6] font-bold">DO</span> {actionLabel(form.action)}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl text-sm text-white/50 bg-white/[0.04]">Cancel</button>
              <button onClick={handleCreate} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
                {saving ? 'Creating…' : 'Create Rule'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {loading ? <div className="h-20 bg-white/[0.03] rounded-xl animate-pulse" /> :
         rules.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-dashed border-white/[0.07]">
            <Settings size={24} className="text-white/20 mx-auto mb-2" />
            <p className="text-white/35 text-sm">No automation rules yet</p>
            <p className="text-white/20 text-xs mt-1">Up to 10 rules on Pro plan</p>
          </div>
        ) : rules.map((rule: any) => (
          <motion.div key={rule.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center gap-4 p-4 rounded-2xl border border-white/[0.07] bg-[#0A0A0A] hover:border-white/[0.11] transition-all">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">{rule.name}</p>
              <p className="text-xs text-white/40 mt-0.5">
                <span style={{ color: '#7B5FFF' }}>WHEN</span> {triggerLabel(rule.trigger)}&nbsp;→&nbsp;
                <span style={{ color: '#D63DF6' }}>DO</span> {actionLabel(rule.action)}
              </p>
              {rule.triggerCount > 0 && <p className="text-[10px] text-white/25 mt-0.5">Triggered {rule.triggerCount}×</p>}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => handleToggle(rule)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${rule.status === 'active' ? 'text-[#10B981] border-[#10B981]/25 bg-[#10B981]/10' : 'text-white/30 border-white/[0.08]'}`}>
                {rule.status === 'active' ? '● Active' : '○ Paused'}
              </button>
              <button onClick={() => handleDelete(rule.id)} className="p-1.5 text-white/25 hover:text-[#FF5252] rounded-lg hover:bg-[#FF5252]/10 transition-all">
                <Trash2 size={13} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── ROOT ───────────────────────────────────────────────────────────────────────
export function UserMarketingHub() {
  const { user, token } = useAuth();
  const [tab, setTab] = useState<Tab>('brief');
  const [usage, setUsage] = useState<any>(null);
  const [limits, setLimits] = useState<any>(null);
  const [credits, setCredits] = useState<number>(user?.credits || 0);

  const loadUsage = useCallback(() => {
    if (!token) return;
    api.userMcGetUsage(token).then((d: any) => {
      setUsage(d.usage);
      setLimits(d.limits);
      setCredits(d.credits);
    }).catch(() => {});
  }, [token]);

  useEffect(() => { loadUsage(); }, [loadUsage]);
  useEffect(() => { setCredits(user?.credits || 0); }, [user?.credits]);

  if (!token || !user) return null;

  const plan = user.plan || 'starter';

  return (
    <div className="min-h-screen bg-[#050505] p-4 md:p-6 lg:p-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}>
                <Brain size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white tracking-tight">AI Marketing Hub</h1>
                <p className="text-xs text-white/35">Campaign briefs · AI strategies · Trend intel · Your results</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Credits pill */}
            <Link to="/dashboard/credits" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#00C4FF]/20 bg-[#00C4FF]/10 hover:border-[#00C4FF]/40 transition-all">
              <Zap size={11} className="text-[#00C4FF]" />
              <span className="text-[11px] font-bold text-[#00C4FF]">{credits.toLocaleString()} cr</span>
            </Link>
            {/* Plan badge */}
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border capitalize text-[11px] font-bold"
              style={plan === 'pro' ? { borderColor: '#D63DF620', background: '#D63DF608', color: '#D63DF6' }
                   : plan === 'growth' ? { borderColor: '#7B5FFF20', background: '#7B5FFF08', color: '#C4AEFF' }
                   : { borderColor: 'rgba(255,255,255,0.08)', background: 'transparent', color: 'rgba(255,255,255,0.35)' }}>
              {plan === 'pro' ? <Crown size={10} /> : plan === 'growth' ? <Rocket size={10} /> : <Lock size={10} />}
              {plan} plan
            </span>
          </div>
        </div>

        {/* Usage summary row */}
        {usage && limits && (
          <div className="mt-4 p-3.5 rounded-2xl border border-white/[0.06] bg-[#0A0A0A] flex flex-wrap gap-5">
            <UsageBar used={usage.briefs || 0}     total={limits.briefs}     label="Briefs"      color="#7B5FFF" />
            <UsageBar used={usage.strategies || 0} total={limits.strategies} label="Strategies"  color="#D63DF6" />
            <UsageBar used={usage.trends || 0}     total={limits.trends}     label="Trend Rpts"  color="#F59E0B" />
          </div>
        )}

        <div className="h-px mt-4 rounded-full" style={{ background: 'linear-gradient(90deg, #7B5FFF, #D63DF6, transparent)' }} />
      </motion.div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
        {TABS.map(t => {
          const TIcon = t.icon;
          const isActive = tab === t.id;
          const isLocked = t.requiredPlan && !planHasAccess(plan, t.requiredPlan);
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0 border transition-all ${
                isActive ? 'text-white border-[#7B5FFF]/30' : isLocked ? 'text-white/25 border-transparent' : 'text-white/45 border-transparent hover:text-white/70 hover:bg-white/[0.04]'
              }`}
              style={isActive ? { background: 'linear-gradient(135deg, rgba(123,95,255,0.15), rgba(214,61,246,0.08))' } : {}}>
              {isLocked ? <Lock size={11} className="text-white/25" /> : <TIcon size={13} className={isActive ? 'text-[#7B5FFF]' : ''} />}
              {t.label}
              {t.badge && (
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${isActive ? 'bg-[#7B5FFF] text-white' : 'bg-white/[0.07] text-white/35'}`}>
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
          {tab === 'brief'    && <BriefTab    token={token} user={user} usage={usage} limits={limits} onUsageUpdate={setUsage} />}
          {tab === 'strategy' && <StrategyTab token={token} user={user} usage={usage} limits={limits} credits={credits} onUsageUpdate={setUsage} onCreditsUpdate={setCredits} />}
          {tab === 'trends'   && <TrendsTab   token={token} user={user} usage={usage} limits={limits} credits={credits} onUsageUpdate={setUsage} onCreditsUpdate={setCredits} />}
          {tab === 'results'  && <ResultsTab  token={token} />}
          {tab === 'rules'    && <RulesTab    token={token} user={user} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
