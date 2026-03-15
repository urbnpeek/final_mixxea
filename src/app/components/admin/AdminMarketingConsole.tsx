// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — AI Marketing Console  (Admin Only)
//  Tabs: Control Center · Campaign Builder · Creative Generator ·
//        Automation Rules · AI Agents · Analytics · User Targeting
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../dashboard/AuthContext';
import * as api from '../dashboard/api';
import { toast } from 'sonner';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Brain, Wand2, Layers, Rocket, Target, TrendingUp, Network, BarChart2,
  Play, Pause, Zap, Plus, Trash2, RefreshCw, Copy, Check, X,
  Users, Search, ChevronDown, ArrowRight, Activity, DollarSign,
  Music2, Instagram, Youtube, Globe, Cpu, Sparkles, Shield,
  CheckCircle, AlertCircle, Clock, Eye, Settings, Hash,
  AlignLeft, Video, Megaphone, ToggleLeft, ToggleRight,
  Filter, ExternalLink, Info,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
type Tab = 'control' | 'builder' | 'creatives' | 'rules' | 'agents' | 'analytics' | 'targeting';

const TABS: { id: Tab; label: string; icon: any; badge?: string }[] = [
  { id: 'control',    label: 'Control Center',      icon: Cpu },
  { id: 'builder',    label: 'Campaign Builder',     icon: Layers },
  { id: 'creatives',  label: 'Creative Generator',   icon: Wand2,  badge: 'AI' },
  { id: 'rules',      label: 'Automation Rules',     icon: Settings },
  { id: 'agents',     label: 'AI Agents',            icon: Brain,  badge: '8' },
  { id: 'analytics',  label: 'Analytics',            icon: BarChart2 },
  { id: 'targeting',  label: 'User Targeting',       icon: Users },
];

const PLATFORMS = [
  { id: 'tiktok',    label: 'TikTok',     color: '#FF0050', icon: TrendingUp },
  { id: 'instagram', label: 'Instagram',  color: '#E1306C', icon: Instagram },
  { id: 'meta',      label: 'Meta Ads',   color: '#1877F2', icon: Globe },
  { id: 'youtube',   label: 'YouTube',    color: '#FF0000', icon: Youtube },
  { id: 'spotify',   label: 'Spotify',    color: '#1DB954', icon: Music2 },
  { id: 'google',    label: 'Google Ads', color: '#4285F4', icon: Search },
];

const GENRES = ['Hip-Hop','R&B','Pop','Electronic','Afrobeats','Reggaeton','Trap','Latin','Rock','Soul','Jazz','House','Drill','Dancehall','Lo-Fi'];
const MOODS  = ['Hype','Emotional','Chill','Motivational','Dark','Romantic','Party','Spiritual','Melancholic','Aggressive'];
const STATUS_CFG: Record<string, { color: string; bg: string; label: string }> = {
  active:    { color: '#10B981', bg: '#10B98115', label: 'Active' },
  draft:     { color: '#F59E0B', bg: '#F59E0B15', label: 'Draft'  },
  paused:    { color: '#9CA3AF', bg: '#9CA3AF15', label: 'Paused' },
  completed: { color: '#6B7280', bg: '#6B728015', label: 'Done'   },
};
const AGENT_ICONS: Record<string, any> = {
  Brain, Wand2, Layers, Rocket, Target, TrendingUp, Network, BarChart2,
};

// ── Shared components ─────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, icon: Icon }: any) {
  return (
    <div className="rounded-2xl border border-white/[0.07] p-5 bg-[#0A0A0A] flex flex-col gap-3 relative overflow-hidden group hover:border-white/[0.12] transition-all">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: `radial-gradient(ellipse 60% 60% at 50% 0%, ${color}08, transparent)` }} />
      <div className="flex items-start justify-between relative">
        <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">{label}</p>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}18`, border: `1px solid ${color}25` }}>
          <Icon size={14} style={{ color }} />
        </div>
      </div>
      <div className="relative">
        <p className="text-3xl font-black text-white leading-none">{value}</p>
        {sub && <p className="text-xs text-white/35 mt-1">{sub}</p>}
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-[1px] opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: `linear-gradient(90deg, transparent, ${color}50, transparent)` }} />
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111] border border-white/[0.1] rounded-xl px-3 py-2 shadow-2xl">
      <p className="text-[10px] text-white/40 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-xs">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
          <span className="text-white/60 capitalize">{p.dataKey}:</span>
          <span className="font-semibold text-white">{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.draft;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full"
      style={{ background: cfg.bg, color: cfg.color }}>
      <span className="w-1 h-1 rounded-full" style={{ background: cfg.color }} />
      {cfg.label}
    </span>
  );
}

// ── CONTROL CENTER ─────────────────────────────────────────────────────────────
function ControlCenterTab({ token, campaigns, agents, analytics, onRefresh }: any) {
  const loading = !campaigns || !agents;
  const summary = analytics?.summary || {};
  const totals  = analytics?.totals  || {};

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Active Campaigns"   value={loading ? '—' : summary.active   || 0}   sub={`${summary.total || 0} total`}            color="#7B5FFF" icon={Megaphone} />
        <KpiCard label="Est. Total Spend"   value={loading ? '—' : `$${(totals.spend || 0).toLocaleString()}`} sub="across all campaigns" color="#00C4FF" icon={DollarSign} />
        <KpiCard label="Streams Influenced" value={loading ? '—' : (totals.streams || 0).toLocaleString()} sub={`${totals.clicks || 0} clicks`}           color="#D63DF6" icon={Music2} />
        <KpiCard label="Avg. ROI"           value={loading ? '—' : `${totals.roi || 0}%`}    sub={`${totals.ctr || 0}% CTR`}               color="#FF5252" icon={TrendingUp} />
      </div>

      {/* Agent Status Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">AI Agent Fleet</h3>
          <button onClick={onRefresh} className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white transition-colors">
            <RefreshCw size={11} /> Refresh
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(agents || Array(8).fill(null)).map((agent: any, i: number) => {
            const Icon = agent ? (AGENT_ICONS[agent.icon] || Brain) : Brain;
            const isRunning = agent?.status === 'running';
            const color = agent?.color || '#7B5FFF';
            return (
              <div key={agent?.id || i} className="rounded-xl border border-white/[0.07] p-3.5 bg-[#0A0A0A] flex items-center gap-3">
                {agent ? (
                  <>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                      <Icon size={14} style={{ color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-white truncate">{agent.name.replace(' Agent', '')}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isRunning ? 'animate-pulse' : ''}`}
                          style={{ background: isRunning ? '#10B981' : agent.status === 'error' ? '#FF5252' : '#6B7280' }} />
                        <p className="text-[10px] text-white/35 truncate capitalize">{agent.status}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-8 h-8 rounded-xl bg-white/[0.04] animate-pulse" />
                    <div className="flex-1 space-y-1"><div className="h-2.5 bg-white/[0.05] rounded animate-pulse" /><div className="h-2 bg-white/[0.03] rounded animate-pulse w-2/3" /></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Campaigns */}
      <div>
        <h3 className="text-sm font-bold text-white mb-4">Recent Campaigns</h3>
        {loading ? (
          <div className="space-y-2">{Array(4).fill(null).map((_, i) => <div key={i} className="h-14 bg-white/[0.03] rounded-xl animate-pulse" />)}</div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-dashed border-white/[0.07]">
            <Megaphone size={28} className="text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No campaigns yet</p>
            <p className="text-white/20 text-xs mt-1">Use the Campaign Builder to launch your first AI campaign</p>
          </div>
        ) : (
          <div className="space-y-2">
            {campaigns.slice(0, 8).map((c: any) => (
              <div key={c.id} className="flex items-center gap-4 p-4 rounded-xl bg-[#0A0A0A] border border-white/[0.06] hover:border-white/[0.10] transition-all">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-white truncate">{c.trackName || 'Untitled'}</p>
                    <span className="text-[10px] text-white/35">by {c.artistName}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {(c.platforms || []).slice(0, 3).map((p: string) => {
                      const cfg = PLATFORMS.find(pl => pl.id === p);
                      return <span key={p} className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: `${cfg?.color || '#7B5FFF'}18`, color: cfg?.color || '#7B5FFF' }}>{cfg?.label || p}</span>;
                    })}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-white">${c.dailyBudget}/day</p>
                  <StatusBadge status={c.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── CAMPAIGN BUILDER ───────────────────────────────────────────────────────────
function CampaignBuilderTab({ token }: any) {
  const [form, setForm] = useState({ artistName: '', trackName: '', genre: 'Hip-Hop', mood: 'Hype', platforms: ['tiktok', 'instagram'], dailyBudget: 10, targetAudience: '', userId: '', userName: '' });
  const [strategy, setStrategy] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    api.mcGetTargetUsers(token).then((d: any) => setUsers(d.users || [])).catch(() => {});
  }, [token]);

  const togglePlatform = (id: string) => {
    setForm(f => ({
      ...f,
      platforms: f.platforms.includes(id) ? f.platforms.filter(p => p !== id) : [...f.platforms, id],
    }));
  };

  const handleGenerate = async () => {
    if (!form.artistName || !form.trackName) { toast.error('Artist name and track name are required'); return; }
    if (form.platforms.length === 0) { toast.error('Select at least one platform'); return; }
    setGenerating(true);
    setStrategy(null);
    try {
      const r = await api.mcAiStrategy(token, form);
      setStrategy(r.strategy);
      toast.success('✅ AI strategy generated!');
    } catch (err: any) { toast.error(err.message || 'Strategy generation failed'); }
    finally { setGenerating(false); }
  };

  const handleCreate = async () => {
    if (!strategy) return;
    setSaving(true);
    try {
      await api.mcCreateCampaign(token, { ...form, strategy: JSON.stringify(strategy), objective: strategy.objective || 'streams' });
      toast.success('✅ Campaign created!');
      setStrategy(null);
      setForm({ artistName: '', trackName: '', genre: 'Hip-Hop', mood: 'Hype', platforms: ['tiktok', 'instagram'], dailyBudget: 10, targetAudience: '', userId: '', userName: '' });
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form */}
      <div className="space-y-5">
        <div className="p-5 rounded-2xl border border-white/[0.07] bg-[#0A0A0A] space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}><Layers size={13} className="text-white" /></div>
            <h3 className="text-sm font-bold text-white">Campaign Setup</h3>
          </div>

          {/* User selector */}
          <div>
            <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Target User (Optional)</label>
            <select value={form.userId} onChange={e => { const u = users.find((u: any) => u.id === e.target.value); setForm(f => ({ ...f, userId: e.target.value, userName: u?.name || '' })); }}
              className="w-full bg-[#111] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/40">
              <option value="">— Admin-run (no user) —</option>
              {users.map((u: any) => <option key={u.id} value={u.id}>{u.name} ({u.plan})</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Artist Name *</label>
              <input value={form.artistName} onChange={e => setForm(f => ({ ...f, artistName: e.target.value }))} placeholder="e.g. Luna Park"
                className="w-full bg-[#111] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/40" />
            </div>
            <div>
              <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Track Name *</label>
              <input value={form.trackName} onChange={e => setForm(f => ({ ...f, trackName: e.target.value }))} placeholder="e.g. Midnight Dreams"
                className="w-full bg-[#111] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/40" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Genre</label>
              <select value={form.genre} onChange={e => setForm(f => ({ ...f, genre: e.target.value }))}
                className="w-full bg-[#111] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/40">
                {GENRES.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Mood / Vibe</label>
              <select value={form.mood} onChange={e => setForm(f => ({ ...f, mood: e.target.value }))}
                className="w-full bg-[#111] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/40">
                {MOODS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Platforms */}
          <div>
            <label className="block text-[11px] text-white/40 mb-2 uppercase tracking-wider font-semibold">Platforms *</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => {
                const PIcon = p.icon;
                const active = form.platforms.includes(p.id);
                return (
                  <button key={p.id} onClick={() => togglePlatform(p.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all"
                    style={active ? { background: `${p.color}18`, borderColor: `${p.color}40`, color: p.color } : { borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)' }}>
                    <PIcon size={12} />{p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Budget */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] text-white/40 uppercase tracking-wider font-semibold">Daily Budget</label>
              <span className="text-sm font-bold" style={{ color: '#00C4FF' }}>${form.dailyBudget}/day</span>
            </div>
            <input type="range" min={5} max={500} step={5} value={form.dailyBudget} onChange={e => setForm(f => ({ ...f, dailyBudget: +e.target.value }))}
              className="w-full accent-[#7B5FFF]" />
            <div className="flex justify-between text-[10px] text-white/25 mt-1"><span>$5</span><span>$500</span></div>
          </div>

          {/* Target audience */}
          <div>
            <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Audience Notes (Optional)</label>
            <textarea value={form.targetAudience} onChange={e => setForm(f => ({ ...f, targetAudience: e.target.value }))} rows={2}
              placeholder="e.g. Fans of Drake, Future, 18-28, US/UK focus"
              className="w-full bg-[#111] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/40 resize-none" />
          </div>

          <button onClick={handleGenerate} disabled={generating || !form.artistName || !form.trackName}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-sm font-bold text-white disabled:opacity-50 transition-all relative overflow-hidden group"
            style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'linear-gradient(135deg, #8B6FFF, #E64DF6)' }} />
            <Brain size={16} className="relative" />
            <span className="relative">{generating ? 'Generating AI Strategy…' : '⚡ Generate AI Campaign Strategy'}</span>
            {generating && <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin relative" />}
          </button>
        </div>
      </div>

      {/* Strategy Output */}
      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          {generating ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="h-full min-h-[400px] rounded-2xl border border-[#7B5FFF]/25 bg-[#0A0A0A] flex flex-col items-center justify-center gap-4">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                className="w-14 h-14 rounded-full border-2 border-[#7B5FFF]/20 border-t-[#7B5FFF]" />
              <div className="text-center">
                <p className="text-white font-semibold text-sm">Strategy Agent Running</p>
                <p className="text-white/40 text-xs mt-1">Analyzing artist profile & market data…</p>
              </div>
              <div className="flex items-center gap-2">
                {['Analyzing genre', 'Building audiences', 'Allocating budget', 'Crafting plan'].map((s, i) => (
                  <motion.div key={s} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.5 }}
                    className="text-[9px] font-semibold px-2 py-1 rounded-full bg-[#7B5FFF]/15 text-[#7B5FFF]">{s}</motion.div>
                ))}
              </div>
            </motion.div>
          ) : strategy ? (
            <motion.div key="strategy" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-[#7B5FFF]/25 bg-[#0A0A0A] overflow-hidden">
              {/* Strategy header */}
              <div className="px-5 py-4 border-b border-white/[0.06]" style={{ background: 'linear-gradient(135deg, rgba(123,95,255,0.1), rgba(214,61,246,0.05))' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#7B5FFF] mb-1">AI-Generated Strategy</p>
                    <h4 className="text-base font-bold text-white">{strategy.campaign_name || 'Campaign Strategy'}</h4>
                    <p className="text-xs text-white/40 mt-0.5">{strategy.objective} · {strategy.duration_days} days · ${strategy.total_budget} total</p>
                  </div>
                  <span className="flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold text-[#10B981] bg-[#10B981]/15">Ready</span>
                </div>
              </div>

              <div className="p-5 space-y-4 max-h-[500px] overflow-y-auto">
                {/* Platform breakdown */}
                {strategy.platform_breakdown?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/35 mb-2">Platform Breakdown</p>
                    <div className="space-y-2">
                      {strategy.platform_breakdown.map((p: any, i: number) => {
                        const cfg = PLATFORMS.find(pl => pl.label === p.platform || pl.id === p.platform?.toLowerCase());
                        return (
                          <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${cfg?.color || '#7B5FFF'}18` }}>
                              {cfg ? <cfg.icon size={12} style={{ color: cfg.color }} /> : <Globe size={12} className="text-white/40" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-white">{p.platform}</p>
                                <span className="text-xs font-bold" style={{ color: cfg?.color || '#7B5FFF' }}>${p.daily_budget}/day</span>
                              </div>
                              <p className="text-[10px] text-white/35 truncate mt-0.5">{p.format} · {p.objective}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className="text-[10px] font-bold text-white/60">{p.budget_pct}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* KPIs */}
                {strategy.kpis && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/35 mb-2">Expected Results</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Target Streams', value: strategy.kpis.target_streams?.toLocaleString() },
                        { label: 'Expected Reach',  value: strategy.kpis.expected_reach?.toLocaleString() },
                        { label: 'Target Clicks',  value: strategy.kpis.target_clicks?.toLocaleString() },
                        { label: 'Expected CTR',   value: strategy.kpis.expected_ctr },
                      ].filter(k => k.value).map((k) => (
                        <div key={k.label} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] text-center">
                          <p className="text-base font-black text-white">{k.value}</p>
                          <p className="text-[9px] text-white/35 mt-0.5">{k.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key messages */}
                {strategy.key_messages?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/35 mb-2">Key Messages</p>
                    <div className="space-y-1.5">
                      {strategy.key_messages.slice(0, 4).map((msg: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-white/60">
                          <div className="w-1 h-1 rounded-full bg-[#D63DF6] mt-1.5 flex-shrink-0" />
                          {msg}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Creative direction */}
                {strategy.creative_direction && (
                  <div className="p-3.5 rounded-xl bg-[#7B5FFF]/08 border border-[#7B5FFF]/15">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#7B5FFF] mb-1.5">Creative Direction</p>
                    <p className="text-xs text-white/60 leading-relaxed">{strategy.creative_direction}</p>
                  </div>
                )}

                <button onClick={handleCreate} disabled={saving}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                  <Rocket size={15} />{saving ? 'Creating Campaign…' : '🚀 Create Campaign'}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="h-full min-h-[400px] rounded-2xl border border-dashed border-white/[0.07] flex flex-col items-center justify-center gap-3 text-center p-8">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(123,95,255,0.1)', border: '1px solid rgba(123,95,255,0.2)' }}>
                <Brain size={28} style={{ color: '#7B5FFF' }} />
              </div>
              <p className="text-white font-semibold">AI Strategy Generator</p>
              <p className="text-white/35 text-xs max-w-xs leading-relaxed">Fill in the campaign details and click Generate to have the Strategy Agent build a complete, platform-optimized marketing plan.</p>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {['Budget allocation', 'Platform targeting', 'Content plan', 'KPI projections'].map(f => (
                  <span key={f} className="text-[10px] px-2.5 py-1 rounded-full bg-white/[0.05] text-white/40">{f}</span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── CREATIVE GENERATOR ─────────────────────────────────────────────────────────
function CreativeGeneratorTab({ token }: any) {
  const CREATIVE_TYPES = [
    { id: 'caption',      label: 'Captions',       icon: AlignLeft, color: '#7B5FFF' },
    { id: 'hashtags',     label: 'Hashtag Sets',   icon: Hash,      color: '#00C4FF' },
    { id: 'ad_copy',      label: 'Ad Copy',        icon: Megaphone, color: '#D63DF6' },
    { id: 'video_script', label: 'Video Scripts',  icon: Video,     color: '#FF5252' },
  ];
  const [form, setForm] = useState({ artistName: '', trackName: '', genre: 'Hip-Hop', creativeType: 'caption', platform: 'tiktok', count: 10 });
  const [creatives, setCreatives] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!form.artistName || !form.trackName) { toast.error('Artist and track name required'); return; }
    setGenerating(true);
    setCreatives([]);
    try {
      const r = await api.mcAiCreatives(token, form);
      setCreatives(r.creatives || []);
      toast.success(`✅ ${r.creatives?.length || 0} creatives generated!`);
    } catch (err: any) { toast.error(err.message || 'Generation failed'); }
    finally { setGenerating(false); }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1800);
  };

  const ENGAGEMENT_COLOR: Record<string, string> = { high: '#10B981', medium: '#F59E0B', low: '#9CA3AF' };
  const currentType = CREATIVE_TYPES.find(t => t.id === form.creativeType)!;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="p-5 rounded-2xl border border-white/[0.07] bg-[#0A0A0A]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div className="lg:col-span-1">
            <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Artist</label>
            <input value={form.artistName} onChange={e => setForm(f => ({ ...f, artistName: e.target.value }))} placeholder="Artist name"
              className="w-full bg-[#111] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/40" />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Track</label>
            <input value={form.trackName} onChange={e => setForm(f => ({ ...f, trackName: e.target.value }))} placeholder="Track name"
              className="w-full bg-[#111] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/40" />
          </div>
          <div>
            <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Genre</label>
            <select value={form.genre} onChange={e => setForm(f => ({ ...f, genre: e.target.value }))}
              className="w-full bg-[#111] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/40">
              {GENRES.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Platform</label>
            <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
              className="w-full bg-[#111] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/40">
              {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Count</label>
            <select value={form.count} onChange={e => setForm(f => ({ ...f, count: +e.target.value }))}
              className="w-full bg-[#111] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/40">
              {[5,10,15,20].map(n => <option key={n} value={n}>{n} variations</option>)}
            </select>
          </div>
        </div>

        {/* Creative type selector */}
        <div className="flex gap-2 mt-4 flex-wrap">
          {CREATIVE_TYPES.map(t => {
            const TIcon = t.icon;
            const active = form.creativeType === t.id;
            return (
              <button key={t.id} onClick={() => setForm(f => ({ ...f, creativeType: t.id }))}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all"
                style={active ? { background: `${t.color}15`, borderColor: `${t.color}35`, color: t.color } : { borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.40)' }}>
                <TIcon size={12} />{t.label}
              </button>
            );
          })}
          <button onClick={handleGenerate} disabled={generating || !form.artistName || !form.trackName}
            className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}>
            <Sparkles size={13} />{generating ? `Generating ${form.count} ${currentType.label}…` : `Generate ${form.count} ${currentType.label}`}
            {generating && <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
          </button>
        </div>
      </div>

      {/* Results grid */}
      <AnimatePresence>
        {generating ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(6).fill(null).map((_, i) => (
              <div key={i} className="h-36 rounded-2xl bg-white/[0.03] animate-pulse border border-white/[0.05]" />
            ))}
          </div>
        ) : creatives.length > 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {creatives.map((c: any, i: number) => {
              const platformCfg = PLATFORMS.find(p => p.id === form.platform || p.label.toLowerCase() === (c.platform || '').toLowerCase());
              const engColor = ENGAGEMENT_COLOR[c.estimated_engagement] || '#9CA3AF';
              return (
                <motion.div key={c.id || i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="rounded-2xl border border-white/[0.07] bg-[#0A0A0A] p-4 flex flex-col gap-3 group hover:border-white/[0.12] transition-all relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[1.5px] rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${currentType.color}, transparent)` }} />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider" style={{ background: `${currentType.color}18`, color: currentType.color }}>{currentType.label.replace('s','')}</span>
                      {platformCfg && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${platformCfg.color}18`, color: platformCfg.color }}>{platformCfg.label}</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: engColor }} />
                      <span className="text-[9px] font-semibold capitalize" style={{ color: engColor }}>{c.estimated_engagement}</span>
                    </div>
                  </div>
                  {c.hook && <p className="text-[10px] font-bold text-[#7B5FFF]">Hook: {c.hook}</p>}
                  <p className="text-xs text-white/70 leading-relaxed flex-1 line-clamp-5">{c.content}</p>
                  {c.cta && <p className="text-[10px] font-semibold text-[#00C4FF]">CTA: {c.cta}</p>}
                  <button onClick={() => handleCopy(c.id || String(i), c.content)}
                    className="flex items-center gap-1.5 text-[10px] font-semibold text-white/35 hover:text-white transition-colors self-end">
                    {copied === (c.id || String(i)) ? <Check size={11} className="text-[#10B981]" /> : <Copy size={11} />}
                    {copied === (c.id || String(i)) ? 'Copied!' : 'Copy'}
                  </button>
                </motion.div>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

// ── AUTOMATION RULES ───────────────────────────────────────────────────────────
function AutomationRulesTab({ token }: any) {
  const METRICS = [
    { id: 'ctr',       label: 'CTR (%)',         unit: '%' },
    { id: 'cpa',       label: 'CPA ($)',          unit: '$' },
    { id: 'roas',      label: 'ROAS (x)',         unit: 'x' },
    { id: 'spend',     label: 'Daily Spend ($)',  unit: '$' },
    { id: 'frequency', label: 'Ad Frequency',     unit: 'x' },
    { id: 'cpm',       label: 'CPM ($)',          unit: '$' },
  ];
  const ACTIONS = [
    { id: 'pause',          label: 'Pause Campaign' },
    { id: 'scale_up',       label: 'Increase Budget 20%' },
    { id: 'scale_down',     label: 'Decrease Budget 20%' },
    { id: 'duplicate',      label: 'Duplicate Top Ad' },
    { id: 'refresh',        label: 'Refresh Creative' },
    { id: 'notify',         label: 'Send Admin Alert' },
  ];
  const OPERATORS = ['<', '>', '=', '<=', '>='];

  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', metric: 'ctr', operator: '<', threshold: 1, action: 'pause', platforms: [] as string[] });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.mcGetRules(token).then((d: any) => setRules(d.rules || [])).finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Rule name required'); return; }
    setSaving(true);
    try {
      const r = await api.mcCreateRule(token, form);
      setRules(prev => [r.rule, ...prev]);
      setShowForm(false);
      setForm({ name: '', metric: 'ctr', operator: '<', threshold: 1, action: 'pause', platforms: [] });
      toast.success('✅ Automation rule created!');
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleToggle = async (rule: any) => {
    try {
      const updated = await api.mcUpdateRule(token, rule.id, { status: rule.status === 'active' ? 'paused' : 'active' });
      setRules(prev => prev.map(r => r.id === rule.id ? updated.rule : r));
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.mcDeleteRule(token, id);
      setRules(prev => prev.filter(r => r.id !== id));
      toast.success('Rule deleted');
    } catch (err: any) { toast.error(err.message); }
  };

  const metricLabel = (m: string) => METRICS.find(x => x.id === m)?.label || m;
  const actionLabel = (a: string) => ACTIONS.find(x => x.id === a)?.label || a;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Automation Rules</h3>
          <p className="text-xs text-white/40 mt-0.5">Rules run every 6 hours against all active campaigns</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}>
          <Plus size={14} /> New Rule
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-[#7B5FFF]/25 bg-[#0A0A0A] p-5 space-y-4">
            <h4 className="text-sm font-bold text-white">Create Automation Rule</h4>
            <div>
              <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Rule Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Pause low CTR ads"
                className="w-full bg-[#111] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/40" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Metric (IF)</label>
                <select value={form.metric} onChange={e => setForm(f => ({ ...f, metric: e.target.value }))}
                  className="w-full bg-[#111] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/40">
                  {METRICS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Operator</label>
                <select value={form.operator} onChange={e => setForm(f => ({ ...f, operator: e.target.value }))}
                  className="w-full bg-[#111] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/40">
                  {OPERATORS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Value</label>
                <input type="number" step="0.1" value={form.threshold} onChange={e => setForm(f => ({ ...f, threshold: +e.target.value }))}
                  className="w-full bg-[#111] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/40" />
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Action (THEN)</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ACTIONS.map(a => (
                  <button key={a.id} onClick={() => setForm(f => ({ ...f, action: a.id }))}
                    className={`p-2.5 rounded-xl text-left border text-xs font-semibold transition-all ${form.action === a.id ? 'border-[#7B5FFF]/40 bg-[#7B5FFF]/15 text-[#C4AEFF]' : 'border-white/[0.07] text-white/45 hover:border-white/20 hover:text-white/70'}`}>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Preview */}
            <div className="p-3 rounded-xl border border-[#00C4FF]/20 bg-[#00C4FF]/08">
              <p className="text-xs text-white/60">
                <span className="text-[#7B5FFF] font-bold">IF</span> {metricLabel(form.metric)} {form.operator} {form.threshold}&nbsp;
                <span className="text-[#D63DF6] font-bold">THEN</span> {actionLabel(form.action)}
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
        {loading ? <div className="h-24 bg-white/[0.03] rounded-xl animate-pulse" /> :
         rules.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-dashed border-white/[0.07]">
            <Settings size={28} className="text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No automation rules yet</p>
            <p className="text-white/20 text-xs mt-1">Rules auto-optimize your campaigns every 6 hours</p>
          </div>
        ) : rules.map((rule: any) => (
          <motion.div key={rule.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center gap-4 p-4 rounded-2xl border border-white/[0.07] bg-[#0A0A0A] hover:border-white/[0.11] transition-all">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white mb-1">{rule.name}</p>
              <p className="text-xs text-white/40">
                <span style={{ color: '#7B5FFF' }}>IF</span> {metricLabel(rule.metric)} {rule.operator} {rule.threshold}&nbsp;
                <span style={{ color: '#D63DF6' }}>THEN</span> {actionLabel(rule.action)}
              </p>
            </div>
            <div className="text-right flex-shrink-0 text-xs text-white/30">
              {rule.triggerCount > 0 && <p>{rule.triggerCount}× triggered</p>}
              {rule.lastTriggered && <p>{new Date(rule.lastTriggered).toLocaleDateString()}</p>}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => handleToggle(rule)} className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${rule.status === 'active' ? 'text-[#10B981] border-[#10B981]/25 bg-[#10B981]/10' : 'text-white/30 border-white/[0.08]'}`}>
                {rule.status === 'active' ? '● Active' : '○ Paused'}
              </button>
              <button onClick={() => handleDelete(rule.id)} className="p-1.5 text-white/25 hover:text-[#FF5252] rounded-lg hover:bg-[#FF5252]/10 transition-all"><Trash2 size={13} /></button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── AI AGENTS ──────────────────────────────────────────────────────────────────
function AIAgentsTab({ token, agents, onRefresh }: any) {
  const [triggering, setTriggering] = useState<string | null>(null);

  const handleTrigger = async (agentId: string) => {
    setTriggering(agentId);
    try {
      await api.mcTriggerAgent(token, agentId);
      toast.success('🤖 Agent triggered — running analysis…');
      setTimeout(onRefresh, 3500);
    } catch (err: any) { toast.error(err.message); }
    finally { setTimeout(() => setTriggering(null), 3500); }
  };

  const STATUS_STYLE: Record<string, any> = {
    idle:    { color: '#6B7280', dot: '#6B7280', label: 'Idle' },
    running: { color: '#10B981', dot: '#10B981', label: 'Running', pulse: true },
    queued:  { color: '#F59E0B', dot: '#F59E0B', label: 'Queued' },
    error:   { color: '#FF5252', dot: '#FF5252', label: 'Error' },
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">AI Agent Fleet</h3>
          <p className="text-xs text-white/40 mt-0.5">8 specialized agents powering your marketing automation</p>
        </div>
        <button onClick={onRefresh} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors px-3 py-2 rounded-xl hover:bg-white/[0.04]">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(agents || Array(8).fill(null)).map((agent: any, i: number) => {
          const Icon = agent ? (AGENT_ICONS[agent.icon] || Brain) : Brain;
          const color = agent?.color || '#7B5FFF';
          const ss = STATUS_STYLE[agent?.status] || STATUS_STYLE.idle;
          const isTriggering = triggering === agent?.id;

          return (
            <motion.div key={agent?.id || i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="rounded-2xl border border-white/[0.07] bg-[#0A0A0A] p-5 hover:border-white/[0.12] transition-all relative overflow-hidden group">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: `radial-gradient(ellipse 50% 50% at 100% 0%, ${color}06, transparent)` }} />

              {agent ? (
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                        <Icon size={18} style={{ color }} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{agent.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ss.pulse ? 'animate-pulse' : ''}`} style={{ background: ss.dot }} />
                          <span className="text-[10px] font-semibold capitalize" style={{ color: ss.color }}>{ss.label}</span>
                          {agent.tasksCompleted > 0 && <span className="text-[10px] text-white/25">· {agent.tasksCompleted} tasks</span>}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => handleTrigger(agent.id)} disabled={isTriggering || agent.status === 'running'}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all disabled:opacity-40"
                      style={{ borderColor: `${color}35`, color, background: `${color}10` }}>
                      {isTriggering ? <div className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" /> : <Play size={10} />}
                      {isTriggering ? 'Running' : 'Trigger'}
                    </button>
                  </div>
                  <p className="text-xs text-white/45 leading-relaxed mb-3">{agent.role}</p>
                  {agent.currentTask && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#10B981]/08 border border-[#10B981]/15">
                      <Activity size={10} className="text-[#10B981] flex-shrink-0 animate-pulse" />
                      <p className="text-[10px] text-white/60 truncate">{agent.currentTask}</p>
                    </div>
                  )}
                  {agent.lastRun && !agent.currentTask && (
                    <p className="text-[10px] text-white/25">Last run: {new Date(agent.lastRun).toLocaleString()}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-3"><div className="w-11 h-11 rounded-xl bg-white/[0.04] animate-pulse" /><div className="flex-1 space-y-2"><div className="h-3 bg-white/[0.05] rounded animate-pulse" /><div className="h-2 bg-white/[0.03] rounded animate-pulse w-2/3" /></div></div>
                  <div className="h-3 bg-white/[0.04] rounded animate-pulse" />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── ANALYTICS ─────────────────────────────────────────────────────────────────
function AnalyticsTab({ token }: any) {
  const uid = useId().replace(/:/g, '');
  const gSpendId  = `gSpend-${uid}`;
  const gStreamsId = `gStreams-${uid}`;
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    api.mcGetAnalytics(token).then((d: any) => {
      setAnalytics(d);
      // Generate insight strings from data
      const pb = d.platformBreakdown || [];
      const best = pb.sort((a: any, b: any) => b.streams - a.streams)[0];
      const ins: string[] = [];
      if (best) ins.push(`🏆 ${best.platform} is your top-performing platform with ${best.streams.toLocaleString()} streams influenced.`);
      if (d.totals?.ctr > 1.5) ins.push(`📈 CTR of ${d.totals.ctr}% is above industry average (1.2%) — strong creative performance.`);
      if (d.totals?.roi > 100) ins.push(`💰 ROI of ${d.totals.roi}% exceeds benchmark — consider scaling top campaigns.`);
      if (d.summary?.active > 0) ins.push(`⚡ ${d.summary.active} active campaign${d.summary.active > 1 ? 's' : ''} currently running — Optimization Agent monitoring performance.`);
      if (ins.length === 0) ins.push('🤖 Launch your first campaign to generate AI-powered performance insights.');
      setInsights(ins);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  const t = analytics?.totals || {};
  const ts = analytics?.timeSeries || [];
  const pb = analytics?.platformBreakdown || [];
  const PLATFORM_COLORS: Record<string, string> = { tiktok: '#FF0050', instagram: '#E1306C', meta: '#1877F2', youtube: '#FF0000', spotify: '#1DB954', google: '#4285F4' };

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Spend',   value: loading ? '—' : `$${(t.spend || 0).toLocaleString()}`,         color: '#00C4FF' },
          { label: 'Impressions',   value: loading ? '—' : (t.impressions || 0).toLocaleString(),          color: '#7B5FFF' },
          { label: 'Clicks',        value: loading ? '—' : (t.clicks || 0).toLocaleString(),               color: '#D63DF6' },
          { label: 'CTR',           value: loading ? '—' : `${t.ctr || 0}%`,                               color: '#F59E0B' },
          { label: 'Streams',       value: loading ? '—' : (t.streams || 0).toLocaleString(),              color: '#1DB954' },
          { label: 'ROI',           value: loading ? '—' : `${t.roi || 0}%`,                               color: '#FF5252' },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-xl border border-white/[0.07] p-3.5 bg-[#0A0A0A] text-center">
            <p className="text-lg font-black text-white leading-none">{kpi.value}</p>
            <p className="text-[10px] mt-1 font-semibold uppercase tracking-wider" style={{ color: kpi.color }}>{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Spend over time */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#0A0A0A] p-5">
          <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-4">Spend & Streams — 14 Day</p>
          {loading ? <div className="h-48 bg-white/[0.03] rounded-xl animate-pulse" /> : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={ts}>
                <defs>
                  <linearGradient id={gSpendId}  x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#7B5FFF" stopOpacity={0.3} /><stop offset="95%" stopColor="#7B5FFF" stopOpacity={0} /></linearGradient>
                  <linearGradient id={gStreamsId} x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#1DB954" stopOpacity={0.3} /><stop offset="95%" stopColor="#1DB954" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} axisLine={false} tickLine={false} width={35} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="spend"   stroke="#7B5FFF" strokeWidth={2} fill={`url(#${gSpendId})`} />
                <Area type="monotone" dataKey="streams" stroke="#1DB954" strokeWidth={2} fill={`url(#${gStreamsId})`} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Platform breakdown */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#0A0A0A] p-5">
          <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-4">Performance by Platform</p>
          {loading ? <div className="h-48 bg-white/[0.03] rounded-xl animate-pulse" /> :
           pb.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-white/20 text-sm">No platform data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={pb}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="platform" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} axisLine={false} tickLine={false} width={35} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="clicks" fill="#7B5FFF" radius={[4,4,0,0]} />
                <Bar dataKey="streams" fill="#D63DF6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* AI Insights */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Brain size={14} className="text-[#7B5FFF]" />
          <p className="text-xs font-bold text-white/60 uppercase tracking-wider">AI Insights</p>
        </div>
        <div className="space-y-2">
          {loading ? Array(2).fill(null).map((_, i) => <div key={i} className="h-12 bg-white/[0.03] rounded-xl animate-pulse" />) :
           insights.map((ins, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
              className="flex items-start gap-3 p-3.5 rounded-xl border border-[#7B5FFF]/15 bg-[#7B5FFF]/05">
              <Sparkles size={12} className="text-[#7B5FFF] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-white/65 leading-relaxed">{ins}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Campaigns table */}
      {(analytics?.campaigns || []).length > 0 && (
        <div>
          <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">Campaign Details</p>
          <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-white/[0.06]" style={{ background: '#0D0D0D' }}>
                {['Campaign','Artist','Platforms','Budget','Status','Spend','Streams'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-white/35 uppercase tracking-wider">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-white/[0.04]">
                {analytics.campaigns.map((c: any) => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-semibold text-white truncate max-w-[120px]">{c.trackName || '—'}</td>
                    <td className="px-4 py-3 text-white/50">{c.artistName}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {(c.platforms || []).slice(0,2).map((p: string) => (
                          <span key={p} className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                            style={{ background: `${PLATFORM_COLORS[p] || '#7B5FFF'}18`, color: PLATFORM_COLORS[p] || '#7B5FFF' }}>{p}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">${c.dailyBudget}/d</td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3 text-white/50">${(c.metrics?.spend || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-white/50">{(c.metrics?.streams || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── USER TARGETING ─────────────────────────────────────────────────────────────
function UserTargetingTab({ token }: any) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.mcGetTargetUsers(token).then((d: any) => setUsers(d.users || [])).finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (user: any) => {
    setToggling(user.id);
    try {
      await api.mcToggleUserCampaign(token, user.id, { enabled: !user.campaignEnabled });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, campaignEnabled: !u.campaignEnabled } : u));
      toast.success(`${!user.campaignEnabled ? '✅ Enabled' : '⏸ Disabled'} campaigns for ${user.name}`);
    } catch (err: any) { toast.error(err.message); }
    finally { setToggling(null); }
  };

  const PLAN_COLORS: Record<string, string> = { pro: '#D63DF6', growth: '#7B5FFF', starter: '#6B7280' };
  const filtered = users.filter(u => {
    const matchSearch = !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchPlan   = planFilter === 'all' || u.plan === planFilter;
    return matchSearch && matchPlan;
  });

  const enabledCount = users.filter(u => u.campaignEnabled).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white">User Campaign Access</h3>
          <p className="text-xs text-white/40 mt-0.5">{enabledCount} of {users.length} users have campaigns enabled</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…"
              className="bg-[#0D0D0D] border border-white/[0.08] rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/40 w-48" />
          </div>
          <select value={planFilter} onChange={e => setPlanFilter(e.target.value)}
            className="bg-[#0D0D0D] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7B5FFF]/40">
            <option value="all">All Plans</option>
            <option value="pro">Pro</option>
            <option value="growth">Growth</option>
            <option value="starter">Starter</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
        {loading ? (
          <div className="divide-y divide-white/[0.04]">
            {Array(6).fill(null).map((_, i) => <div key={i} className="h-16 bg-white/[0.02] animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Users size={24} className="text-white/20 mx-auto mb-2" />
            <p className="text-white/30 text-sm">No users found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead><tr className="border-b border-white/[0.06]" style={{ background: '#0D0D0D' }}>
              {['User','Plan','Joined','Campaigns'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-white/35 uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((user: any) => (
                <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: `${PLAN_COLORS[user.plan] || '#6B7280'}25` }}>
                        {user.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white leading-none">{user.name}</p>
                        <p className="text-[10px] text-white/35 mt-0.5">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full capitalize"
                      style={{ background: `${PLAN_COLORS[user.plan] || '#6B7280'}18`, color: PLAN_COLORS[user.plan] || '#6B7280' }}>
                      {user.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/35">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggle(user)} disabled={toggling === user.id}
                      className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold border transition-all disabled:opacity-50 ${user.campaignEnabled ? 'text-[#10B981] border-[#10B981]/25 bg-[#10B981]/10' : 'text-white/35 border-white/[0.08] hover:border-white/20'}`}>
                      {toggling === user.id ? (
                        <div className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" />
                      ) : user.campaignEnabled ? (
                        <ToggleRight size={14} />
                      ) : (
                        <ToggleLeft size={14} />
                      )}
                      {user.campaignEnabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── ROOT COMPONENT ─────────────────────────────────────────────────────────────
export function AdminMarketingConsole() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('control');
  const [campaigns, setCampaigns] = useState<any[] | null>(null);
  const [agents, setAgents]       = useState<any[] | null>(null);
  const [analytics, setAnalytics] = useState<any | null>(null);

  const loadAll = useCallback(async () => {
    if (!token) return;
    await Promise.allSettled([
      api.mcGetCampaigns(token).then((d: any) => setCampaigns(d.campaigns || [])).catch(() => setCampaigns([])),
      api.mcGetAgents(token).then((d: any) => setAgents(d.agents || [])).catch(() => setAgents([])),
      api.mcGetAnalytics(token).then((d: any) => setAnalytics(d)).catch(() => {}),
    ]);
  }, [token]);

  useEffect(() => { loadAll(); }, [loadAll]);

  if (!token) return null;

  return (
    <div className="min-h-screen bg-black p-4 md:p-6 lg:p-8">
      {/* Page header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}>
                <Brain size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white tracking-tight">AI Marketing Console</h1>
                <p className="text-xs text-white/35">Automated campaigns · AI agents · Creative generation · Analytics</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#10B981]/20 bg-[#10B981]/10">
              <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              <span className="text-[10px] font-semibold text-[#10B981] uppercase tracking-wider">8 Agents Online</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#D63DF6]/20 bg-[#D63DF6]/10">
              <Shield size={10} className="text-[#D63DF6]" />
              <span className="text-[10px] font-semibold text-[#D63DF6] uppercase tracking-wider">Admin Only</span>
            </div>
          </div>
        </div>

        {/* Gradient accent line */}
        <div className="h-px mt-4 rounded-full" style={{ background: 'linear-gradient(90deg, #7B5FFF, #D63DF6, #FF5252, transparent)' }} />
      </motion.div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map(tab => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border flex-shrink-0 ${
                isActive ? 'text-white border-[#D63DF6]/30' : 'text-white/40 border-transparent hover:text-white/70 hover:bg-white/[0.04]'
              }`}
              style={isActive ? { background: 'linear-gradient(135deg, rgba(123,95,255,0.15), rgba(214,61,246,0.08))' } : {}}>
              <TabIcon size={13} className={isActive ? 'text-[#D63DF6]' : ''} />
              {tab.label}
              {tab.badge && (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                  style={isActive ? { background: '#D63DF6', color: '#fff' } : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.22 }}>
          {activeTab === 'control'   && <ControlCenterTab token={token} campaigns={campaigns} agents={agents} analytics={analytics} onRefresh={loadAll} />}
          {activeTab === 'builder'   && <CampaignBuilderTab token={token} />}
          {activeTab === 'creatives' && <CreativeGeneratorTab token={token} />}
          {activeTab === 'rules'     && <AutomationRulesTab token={token} />}
          {activeTab === 'agents'    && <AIAgentsTab token={token} agents={agents} onRefresh={loadAll} />}
          {activeTab === 'analytics' && <AnalyticsTab token={token} />}
          {activeTab === 'targeting' && <UserTargetingTab token={token} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
