// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — Admin Revenue Center
//  MRR · Credit revenue · Plan breakdown · Top clients · Stripe health
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../dashboard/AuthContext';
import * as api from '../dashboard/api';
import {
  TrendingUp, Users, Zap, Crown, Star, RefreshCw,
  DollarSign, BarChart2, CreditCard, ArrowUp, Music2,
  UserCheck, ChevronRight,
} from 'lucide-react';

const PLAN_CFG: Record<string, { label: string; color: string; icon: any; price: string }> = {
  starter: { label: 'Starter', color: '#6B7280', icon: Music2,    price: 'Free' },
  growth:  { label: 'Growth',  color: '#7B5FFF', icon: TrendingUp, price: '$39/mo' },
  pro:     { label: 'Pro',     color: '#D63DF6', icon: Crown,      price: '$149/mo' },
};

function StatCard({ label, value, sub, icon: Icon, color, delay = 0 }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-[0.05]" style={{ background: color, transform: 'translate(30%,-30%)' }} />
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      <div className="text-2xl font-black text-white mb-1">{value}</div>
      <div className="text-xs text-white/40">{label}</div>
      {sub && <div className="text-[11px] mt-1.5 font-semibold" style={{ color }}>{sub}</div>}
    </motion.div>
  );
}

export function AdminRevenueCenter() {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!token) return;
    try {
      const r = await api.adminGetRevenue(token);
      setData(r);
    } catch (err) { console.log('[Revenue] load error:', err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, [token]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-[#7B5FFF] border-t-transparent animate-spin" /></div>;
  }

  const maxMrr = Math.max(...(data?.monthlyMrr || []).map((m: any) => m.mrr + m.credits), 1);
  const totalPaid = (data?.planCounts?.growth || 0) + (data?.planCounts?.pro || 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Revenue Center</h1>
          <p className="text-white/40 text-sm mt-1">Subscription revenue, credit sales, and client overview.</p>
        </div>
        <button onClick={() => { setRefreshing(true); load(); }} disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] rounded-xl text-white/60 hover:text-white text-xs font-medium transition-all disabled:opacity-50">
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Monthly Recurring Revenue" value={`$${data?.mrr || '0.00'}`} sub="Active subscriptions" icon={DollarSign} color="#7B5FFF" delay={0} />
        <StatCard label="Credit Revenue" value={`$${data?.creditRevenue || '0.00'}`} sub="All-time purchases" icon={Zap} color="#00C4FF" delay={0.05} />
        <StatCard label="Total Revenue" value={`$${data?.totalRevenue || '0.00'}`} sub="MRR + Credits" icon={TrendingUp} color="#10B981" delay={0.1} />
        <StatCard label="Total Users" value={data?.totalUsers || 0} sub={`${data?.newUsersThisMonth || 0} this month`} icon={Users} color="#D63DF6" delay={0.15} />
      </div>

      {/* Plan Distribution + MRR Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Plan Breakdown */}
        <div className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-5">
          <h2 className="text-sm font-bold text-white mb-5">Plan Distribution</h2>
          <div className="space-y-4">
            {Object.entries(PLAN_CFG).map(([key, cfg]) => {
              const count = (data?.planCounts || {})[key] || 0;
              const total = data?.totalUsers || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <cfg.icon size={13} style={{ color: cfg.color }} />
                      <span className="text-sm text-white font-medium">{cfg.label}</span>
                      <span className="text-xs text-white/40">{cfg.price}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{count}</span>
                      <span className="text-xs text-white/30">({pct}%)</span>
                    </div>
                  </div>
                  <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.2 }}
                      className="h-full rounded-full" style={{ background: cfg.color }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 pt-4 border-t border-white/[0.06]">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-xl font-black" style={{ color: '#D63DF6' }}>{totalPaid}</p>
                <p className="text-xs text-white/40 mt-0.5">Paying Subscribers</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-black text-white">{data?.planCounts?.starter || 0}</p>
                <p className="text-xs text-white/40 mt-0.5">Free Tier Users</p>
              </div>
            </div>
          </div>
        </div>

        {/* MRR Chart */}
        <div className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-5">
          <h2 className="text-sm font-bold text-white mb-5">6-Month Revenue Trend</h2>
          {(data?.monthlyMrr || []).length === 0 ? (
            <div className="flex items-center justify-center h-32 text-white/30 text-sm">No data yet</div>
          ) : (
            <div>
              <div className="flex items-end gap-2 h-36">
                {(data.monthlyMrr || []).map((m: any, i: number) => {
                  const total = m.mrr + m.credits;
                  const mrrPct = Math.max((m.mrr / maxMrr) * 100, 2);
                  const creditPct = Math.max((m.credits / maxMrr) * 100, 2);
                  const isCurrent = i === (data.monthlyMrr.length - 1);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                      <div className="text-[9px] text-white/0 group-hover:text-white/60 transition-all text-center">${Math.round(total)}</div>
                      <div className="w-full flex flex-col justify-end" style={{ height: '100px' }}>
                        <div className="w-full rounded-sm mb-0.5 transition-all" style={{ height: `${creditPct}%`, background: isCurrent ? '#00C4FF' : '#00C4FF30' }} />
                        <div className="w-full rounded-t-md transition-all" style={{ height: `${mrrPct}%`, background: isCurrent ? 'linear-gradient(180deg,#7B5FFF,#D63DF6)' : '#7B5FFF30' }} />
                      </div>
                      <span className="text-[9px] text-white/30">{m.month}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-4 text-[10px] text-white/40">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-[#7B5FFF]" />MRR</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-[#00C4FF]" />Credits</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Clients */}
      {(data?.topUsers || []).length > 0 && (
        <div className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-5">
          <h2 className="text-sm font-bold text-white mb-5">Top Revenue Clients</h2>
          <div className="space-y-2">
            {data.topUsers.map((u: any, i: number) => {
              const planCfg = PLAN_CFG[u.plan] || PLAN_CFG.starter;
              return (
                <div key={u.id} className="flex items-center gap-4 p-3 bg-[#111] border border-white/[0.05] rounded-xl hover:border-white/15 transition-all">
                  <div className="text-sm font-bold text-white/30 w-5 text-center flex-shrink-0">{i + 1}</div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${planCfg.color}20` }}>
                    <span className="text-xs font-bold" style={{ color: planCfg.color }}>{u.name?.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{u.name}</p>
                    <p className="text-[11px] text-white/40 truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-lg" style={{ background: `${planCfg.color}18`, color: planCfg.color }}>
                      {planCfg.label}
                    </span>
                    <span className="text-xs font-bold" style={{ color: planCfg.color }}>{planCfg.price}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
