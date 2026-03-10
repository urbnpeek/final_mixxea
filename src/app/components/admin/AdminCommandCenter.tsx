// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — Admin Command Center (replaces AdminOverview)
//  Live agency ops dashboard: SLA alerts · KPI stats · work board · activity feed
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import { useAuth } from '../dashboard/AuthContext';
import * as api from '../dashboard/api';
import { toast } from 'sonner';
import {
  AlertTriangle, Clock, CheckCircle, Play, Zap, Users, TrendingUp,
  Music, Radio, Instagram, Youtube, Globe, Mic, DollarSign,
  RefreshCw, Bell, Megaphone, ArrowRight, BarChart2, Package,
  ShieldCheck, Activity, Circle, ChevronRight, Star,
  ClipboardList, SlidersHorizontal, Shield,
} from 'lucide-react';

// ── Color helpers ────────────────────────────────────────────────────────────
const ACCENT = { cyan: '#00C4FF', purple: '#7B5FFF', magenta: '#D63DF6', coral: '#FF5252', green: '#10B981', amber: '#F59E0B' };

const SVC_MAP: Record<string, any> = {
  spotify_growth:    { label: 'Spotify Growth',    icon: Music,       color: '#1DB954' },
  playlist_pitching: { label: 'Playlist Pitching',  icon: Radio,       color: '#7B5FFF' },
  tiktok_ugc:        { label: 'TikTok UGC',         icon: TrendingUp,  color: '#FF0050' },
  ig_ugc:            { label: 'Instagram UGC',       icon: Instagram,   color: '#E1306C' },
  youtube_ads:       { label: 'YouTube Ads',         icon: Youtube,     color: '#FF0000' },
  meta_ads:          { label: 'Meta / Google Ads',   icon: Globe,       color: '#1877F2' },
  pr_press:          { label: 'PR & Press',          icon: Mic,         color: '#F59E0B' },
  sync_licensing:    { label: 'Sync Licensing',      icon: DollarSign,  color: '#10B981' },
  distribution:      { label: 'Distribution',        icon: Package,     color: '#00C4FF' },
  pitch:             { label: 'Playlist Pitch',      icon: Radio,       color: '#D63DF6' },
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pending_review: { label: 'Pending Review', color: '#F59E0B', bg: '#F59E0B12' },
  needs_info:     { label: 'Needs Info',     color: '#00C4FF', bg: '#00C4FF12' },
  active:         { label: 'Active',         color: '#10B981', bg: '#10B98112' },
  paused:         { label: 'Paused',         color: '#9CA3AF', bg: '#9CA3AF12' },
  completed:      { label: 'Completed',      color: '#6B7280', bg: '#6B728012' },
  rejected:       { label: 'Rejected',       color: '#FF5252', bg: '#FF525212' },
  submitted:      { label: 'Submitted',      color: '#F59E0B', bg: '#F59E0B12' },
  live:           { label: 'Live',           color: '#10B981', bg: '#10B98112' },
  distributed:    { label: 'Distributed',   color: '#7B5FFF', bg: '#7B5FFF12' },
  pending:        { label: 'Pending',        color: '#F59E0B', bg: '#F59E0B12' },
  reviewing:      { label: 'Reviewing',      color: '#00C4FF', bg: '#00C4FF12' },
  accepted:       { label: 'Accepted',       color: '#10B981', bg: '#10B98112' },
};

function slaAge(createdAt: string): { hours: number; label: string; color: string; urgent: boolean } {
  const ms = Date.now() - new Date(createdAt).getTime();
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(hours / 24);
  const urgent = hours > 48;
  const warning = hours > 24;
  return {
    hours,
    label: days > 0 ? `${days}d ${hours % 24}h` : hours > 0 ? `${hours}h` : 'Just now',
    color: urgent ? ACCENT.coral : warning ? ACCENT.amber : ACCENT.green,
    urgent,
  };
}

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color, onClick }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={`bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-5 relative overflow-hidden ${onClick ? 'cursor-pointer hover:border-white/20 transition-all' : ''}`}
    >
      <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-[0.06]" style={{ background: color, transform: 'translate(30%,-30%)' }} />
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon size={16} style={{ color }} />
        </div>
        {onClick && <ChevronRight size={14} className="text-white/20" />}
      </div>
      <div className="text-2xl font-black text-white mb-0.5">{value}</div>
      <div className="text-xs text-white/40 font-medium">{label}</div>
      {sub && <div className="text-[11px] mt-1.5 font-semibold" style={{ color }}>{sub}</div>}
    </motion.div>
  );
}

// ── Kanban Column ────────────────────────────────────────────────────────────
function KanbanColumn({ title, color, items, onView }: { title: string; color: string; items: any[]; onView: (id: string) => void }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
        <span className="text-xs font-bold text-white/60 uppercase tracking-wider">{title}</span>
        <span className="ml-auto text-xs font-bold px-1.5 py-0.5 rounded-md" style={{ background: `${color}20`, color }}>{items.length}</span>
      </div>
      <div className="space-y-2">
        {items.slice(0, 5).map(item => {
          const svc = SVC_MAP[item.type || item._type] || SVC_MAP.distribution;
          const SvcIcon = svc.icon;
          const sla = slaAge(item.createdAt || item.submittedAt || new Date().toISOString());
          return (
            <motion.div key={item.id} layout
              className="bg-[#111] border border-white/[0.06] rounded-xl p-3 cursor-pointer hover:border-white/20 hover:bg-white/[0.03] transition-all group"
              onClick={() => onView(item.id)}>
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${svc.color}20` }}>
                  <SvcIcon size={13} style={{ color: svc.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{item.userName || item.artistName || 'Unknown'}</p>
                  <p className="text-[10px] text-white/40 truncate">{svc.label}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] font-semibold" style={{ color: sla.color }}>{sla.label} ago</span>
                {sla.urgent && <span className="text-[9px] font-bold text-[#FF5252] bg-[#FF5252]/15 px-1.5 py-0.5 rounded">OVERDUE</span>}
              </div>
            </motion.div>
          );
        })}
        {items.length > 5 && (
          <div className="text-center py-2 text-xs text-white/30">+{items.length - 5} more</div>
        )}
        {items.length === 0 && (
          <div className="bg-[#0A0A0A] border border-white/[0.04] rounded-xl p-3 text-center">
            <p className="text-[11px] text-white/20">Empty</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Activity Item ────────────────────────────────────────────────────────────
function ActivityItem({ order }: { order: any }) {
  const svc = SVC_MAP[order.type || order._type] || SVC_MAP.distribution;
  const SvcIcon = svc.icon;
  const sla = slaAge(order.createdAt || new Date().toISOString());
  const sc = STATUS_CFG[order.status] || STATUS_CFG.pending_review;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/[0.04] last:border-0">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${svc.color}15` }}>
        <SvcIcon size={14} style={{ color: svc.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs font-semibold text-white">{order.userName || order.artistName || 'Unknown'}</p>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
        </div>
        <p className="text-[11px] text-white/40 mt-0.5 truncate">{svc.label}</p>
      </div>
      <span className="text-[10px] text-white/25 flex-shrink-0">{sla.label}</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function AdminCommandCenter() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [s, o, r] = await Promise.all([
        api.adminGetStats(token).catch(() => null),
        api.adminGetOrders(token).catch(() => ({ orders: [] })),
        api.adminGetRevenue(token).catch(() => null),
      ]);
      setStats(s);
      setOrders(o?.orders || []);
      setRevenue(r);
    } catch (err: any) {
      console.log('[CommandCenter] load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  const handleRefresh = () => { setRefreshing(true); load(); };

  // Group orders for kanban
  const isPending   = (o: any) => ['pending_review', 'submitted', 'pending'].includes(o.status);
  const isActive    = (o: any) => ['active', 'reviewing'].includes(o.status);
  const isNeedsInfo = (o: any) => o.status === 'needs_info';
  const isDone      = (o: any) => ['completed', 'accepted', 'live', 'distributed'].includes(o.status);

  const pending   = orders.filter(isPending);
  const active    = orders.filter(isActive);
  const needsInfo = orders.filter(isNeedsInfo);
  const done      = orders.filter(isDone);
  const overdue   = orders.filter(o => isPending(o) && slaAge(o.createdAt || o.submittedAt || '').hours > 48);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-[#D63DF6] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Command Center</h1>
          <p className="text-white/40 text-sm mt-1">{today}</p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] rounded-xl text-white/60 hover:text-white text-xs font-medium transition-all disabled:opacity-50">
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* SLA Alert Strip */}
      <AnimatePresence>
        {overdue.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 p-4 rounded-2xl border border-[#FF5252]/30 bg-[#FF5252]/08">
            <div className="w-2 h-2 rounded-full bg-[#FF5252] animate-pulse flex-shrink-0" />
            <AlertTriangle size={14} className="text-[#FF5252] flex-shrink-0" />
            <p className="text-sm font-semibold text-white">
              <span className="text-[#FF5252]">{overdue.length} order{overdue.length > 1 ? 's' : ''} overdue</span>
              {' '}— submitted over 48 hours ago and awaiting action.
            </p>
            <button onClick={() => navigate('/admin/orders')}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-[#FF5252] bg-[#FF5252]/15 border border-[#FF5252]/30 hover:bg-[#FF5252]/25 transition-all whitespace-nowrap">
              View Queue <ArrowRight size={10} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Pending Orders" value={pending.length} sub={overdue.length > 0 ? `${overdue.length} overdue` : 'All on time'} icon={Clock} color={overdue.length > 0 ? ACCENT.coral : ACCENT.amber} onClick={() => navigate('/admin/orders')} />
        <StatCard label="Active Campaigns" value={active.length} sub="Currently live" icon={Play} color={ACCENT.green} onClick={() => navigate('/admin/campaigns')} />
        <StatCard label="Total Users" value={stats?.totalUsers || 0} sub={`+${stats?.recentUsers?.length || 0} recent`} icon={Users} color={ACCENT.cyan} onClick={() => navigate('/admin/users')} />
        <StatCard label="MRR" value={`$${revenue?.mrr || '0.00'}`} sub={`${revenue?.planCounts?.growth || 0} Growth · ${revenue?.planCounts?.pro || 0} Pro`} icon={TrendingUp} color={ACCENT.purple} onClick={() => navigate('/admin/revenue')} />
        <StatCard label="Open Tickets" value={stats?.openTickets || 0} sub={stats?.inProgressTickets > 0 ? `${stats.inProgressTickets} in progress` : 'All clear'} icon={Bell} color={ACCENT.magenta} onClick={() => navigate('/admin/tickets')} />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Orders Queue', desc: 'Review all submissions', icon: Package, color: ACCENT.cyan, path: '/admin/orders' },
          { label: 'Pitch Manager', desc: 'Manage playlist pitches', icon: Radio, color: ACCENT.purple, path: '/admin/pitches' },
          { label: 'Marketing', desc: 'Email & announcements', icon: Megaphone, color: ACCENT.magenta, path: '/admin/marketing' },
          { label: 'Website Control', desc: 'Edit live content', icon: Globe, color: ACCENT.amber, path: '/admin/website' },
        ].map(a => (
          <button key={a.label} onClick={() => navigate(a.path)}
            className="flex items-center gap-3 p-4 bg-[#0D0D0D] border border-white/[0.07] hover:border-white/20 rounded-2xl text-left transition-all group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${a.color}18` }}>
              <a.icon size={16} style={{ color: a.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white group-hover:text-white transition-colors truncate">{a.label}</p>
              <p className="text-[11px] text-white/40 truncate">{a.desc}</p>
            </div>
            <ChevronRight size={14} className="text-white/20 group-hover:text-white/60 transition-colors ml-auto flex-shrink-0" />
          </button>
        ))}
      </div>

      {/* System + Admin Links Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button onClick={() => navigate('/admin/platform-settings')}
          className="flex items-center gap-4 p-4 bg-[#0D0D0D] border border-white/[0.07] hover:border-[#7B5FFF]/30 rounded-2xl text-left transition-all group">
          <div className="w-10 h-10 rounded-xl bg-[#7B5FFF]/15 flex items-center justify-center flex-shrink-0">
            <SlidersHorizontal size={18} className="text-[#7B5FFF]" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Platform Settings</p>
            <p className="text-xs text-white/40">Feature flags · SLA · Maintenance mode · User defaults</p>
          </div>
          <ChevronRight size={14} className="text-white/20 group-hover:text-[#7B5FFF] transition-colors ml-auto" />
        </button>
        <button onClick={() => navigate('/admin/audit-log')}
          className="flex items-center gap-4 p-4 bg-[#0D0D0D] border border-white/[0.07] hover:border-[#D63DF6]/30 rounded-2xl text-left transition-all group">
          <div className="w-10 h-10 rounded-xl bg-[#D63DF6]/15 flex items-center justify-center flex-shrink-0">
            <ClipboardList size={18} className="text-[#D63DF6]" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Audit Log</p>
            <p className="text-xs text-white/40">Full history of all admin actions across the platform</p>
          </div>
          <ChevronRight size={14} className="text-white/20 group-hover:text-[#D63DF6] transition-colors ml-auto" />
        </button>
      </div>

      {/* Main Body: Kanban + Activity Feed */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Kanban Work Board */}
        <div className="xl:col-span-2 bg-[#080808] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-white">Work Board</h2>
            <button onClick={() => navigate('/admin/orders')}
              className="text-xs text-[#7B5FFF] hover:text-[#D63DF6] transition-colors flex items-center gap-1">
              Full Queue <ArrowRight size={11} />
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            <KanbanColumn title="New Orders" color={ACCENT.amber} items={pending} onView={() => navigate('/admin/orders')} />
            <KanbanColumn title="In Progress" color={ACCENT.green} items={active} onView={() => navigate('/admin/campaigns')} />
            <KanbanColumn title="Awaiting Client" color={ACCENT.cyan} items={needsInfo} onView={() => navigate('/admin/orders')} />
            <KanbanColumn title="Completed" color="#6B7280" items={done} onView={() => navigate('/admin/orders')} />
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="bg-[#080808] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <Activity size={14} className="text-[#D63DF6]" />
            <h2 className="text-sm font-bold text-white flex-1">Recent Activity</h2>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              <span className="text-[10px] text-[#10B981] font-semibold">Live</span>
            </div>
          </div>
          <div className="space-y-0 max-h-96 overflow-y-auto">
            {orders.slice(0, 15).map(o => <ActivityItem key={o.id} order={o} />)}
            {orders.length === 0 && (
              <div className="text-center py-8">
                <Circle size={24} className="text-white/10 mx-auto mb-2" />
                <p className="text-white/30 text-sm">No activity yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Revenue Snapshot */}
      {revenue && (
        <div className="bg-[#080808] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-white">Revenue Snapshot</h2>
            <button onClick={() => navigate('/admin/revenue')}
              className="text-xs text-[#7B5FFF] hover:text-[#D63DF6] transition-colors flex items-center gap-1">
              Full Report <ArrowRight size={11} />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'MRR', value: `$${revenue.mrr}`, color: ACCENT.purple },
              { label: 'Credit Revenue', value: `$${revenue.creditRevenue}`, color: ACCENT.cyan },
              { label: 'Total Revenue', value: `$${revenue.totalRevenue}`, color: ACCENT.green },
              { label: 'Pro / Growth Users', value: `${revenue.planCounts?.pro || 0} / ${revenue.planCounts?.growth || 0}`, color: ACCENT.magenta },
            ].map(m => (
              <div key={m.label} className="bg-[#0D0D0D] border border-white/[0.07] rounded-xl p-4">
                <p className="text-xl font-black" style={{ color: m.color }}>{m.value}</p>
                <p className="text-[11px] text-white/40 mt-1">{m.label}</p>
              </div>
            ))}
          </div>
          {/* Simple MRR bar chart */}
          {revenue.monthlyMrr?.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] text-white/30 mb-3 uppercase tracking-wider font-semibold">6-Month MRR Trend</p>
              <div className="flex items-end gap-2 h-16">
                {revenue.monthlyMrr.map((m: any, i: number) => {
                  const max = Math.max(...revenue.monthlyMrr.map((x: any) => x.mrr), 1);
                  const pct = Math.max((m.mrr / max) * 100, 4);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full rounded-t-md transition-all" style={{ height: `${pct}%`, background: i === revenue.monthlyMrr.length - 1 ? 'linear-gradient(180deg,#7B5FFF,#D63DF6)' : '#ffffff15' }} />
                      <span className="text-[9px] text-white/30">{m.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}