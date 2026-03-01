import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from './AuthContext';
import * as api from './api';
import { toast } from 'sonner';
import { TrendingUp, Play, Download, Heart, Users, DollarSign, BarChart3, Globe, RefreshCw } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1A1A1A] border border-white/[0.1] rounded-xl p-3 shadow-2xl text-xs">
        <p className="text-white/50 mb-2 font-medium">{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-white/60 capitalize">{p.name}:</span>
            <span className="text-white font-bold">{typeof p.value === 'number' && p.value > 100 ? p.value.toLocaleString() : p.name === 'streaming' || p.name === 'downloads' || p.name === 'publishing' ? `$${p.value?.toFixed(2)}` : p.value?.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const StatCard = ({ icon: Icon, label, value, sub, color, trend }: any) => (
  <motion.div whileHover={{ y: -2 }} className="bg-[#111111] border border-white/[0.06] rounded-2xl p-5 relative overflow-hidden">
    <div className="flex items-start justify-between mb-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}>
        <Icon size={18} style={{ color }} />
      </div>
      {trend && <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium"><TrendingUp size={11} />{trend}</div>}
    </div>
    <div className="text-2xl font-bold text-white">{value}</div>
    <div className="text-xs text-white/40 mt-1">{label}</div>
    {sub && <div className="text-[11px] text-white/25 mt-0.5">{sub}</div>}
  </motion.div>
);

export function AnalyticsPage() {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'streams' | 'revenue' | 'platforms'>('streams');

  useEffect(() => {
    if (!token) return;
    api.getAnalytics(token).then(d => setData(d)).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  const handleSync = async () => {
    if (!token || syncing) return;
    setSyncing(true);
    try {
      const fresh = await api.refreshAnalytics(token);
      setData(fresh);
      toast.success('📊 Analytics synced from DSPs!');
    } catch (err: any) {
      toast.error('Sync failed: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        <div className="mb-8"><div className="h-8 w-48 bg-white/[0.05] rounded-xl animate-pulse mb-2" /><div className="h-4 w-72 bg-white/[0.03] rounded-lg animate-pulse" /></div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">{[1,2,3,4,5,6].map(i => <div key={i} className="h-28 bg-white/[0.03] rounded-2xl animate-pulse" />)}</div>
        <div className="h-80 bg-white/[0.03] rounded-2xl animate-pulse" />
      </div>
    );
  }

  const ov = data?.overview || {};

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-white/40 text-sm mt-1">Detailed insights across all platforms and releases</p>
        </div>
        <div className="flex items-center gap-3">
          {data?.lastSynced && (
            <span className="text-xs text-white/30">
              Last synced: {new Date(data.lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-white/[0.08] text-white/60 hover:text-white hover:border-[#00C4FF]/30 disabled:opacity-50 transition-all"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin text-[#00C4FF]' : ''} />
            {syncing ? 'Syncing...' : 'Sync DSPs'}
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard icon={Play} label="Total Streams" value={ov.totalStreams?.toLocaleString() || '0'} sub="All time, all platforms" color="#7B5FFF" trend="+18%" />
        <StatCard icon={DollarSign} label="Total Revenue" value={`$${ov.totalRevenue?.toFixed(2) || '0.00'}`} sub="Streaming + Downloads + Publishing" color="#10B981" trend="+12%" />
        <StatCard icon={Users} label="Monthly Listeners" value={ov.monthlyListeners?.toLocaleString() || '0'} sub="Unique listeners this month" color="#00C4FF" trend="+8%" />
        <StatCard icon={Heart} label="Total Saves" value={ov.totalSaves?.toLocaleString() || '0'} sub="Across all platforms" color="#D63DF6" trend="+22%" />
        <StatCard icon={Download} label="Downloads" value={ov.totalDownloads?.toLocaleString() || '0'} sub="Paid and free downloads" color="#FF5252" trend="+5%" />
        <StatCard icon={TrendingUp} label="Followers" value={ov.followerCount?.toLocaleString() || '0'} sub="Total across platforms" color="#F59E0B" trend="+15%" />
      </div>

      {/* Chart Tabs */}
      <div className="bg-[#111111] border border-white/[0.06] rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex gap-1 p-1 bg-white/[0.04] rounded-xl">
            {(['streams', 'revenue', 'platforms'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all capitalize ${activeTab === t ? 'bg-[#7B5FFF] text-white' : 'text-white/50 hover:text-white'}`}>
                {t === 'streams' ? '🎵 Streams' : t === 'revenue' ? '💰 Revenue' : '🌐 Platforms'}
              </button>
            ))}
          </div>
          <span className="text-xs text-white/30">Data updated daily</span>
        </div>

        {activeTab === 'streams' && (
          <div>
            <div className="flex items-center gap-4 mb-4 text-xs text-white/40 flex-wrap">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#7B5FFF]" />Streams</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#00C4FF]" />Saves</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#D63DF6]" />Downloads</span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data?.streamData || []} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <defs>
                  {[['streamGrad', '#7B5FFF'], ['saveGrad', '#00C4FF'], ['dlGrad', '#D63DF6']].map(([id, color]) => (
                    <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="streams" stroke="#7B5FFF" strokeWidth={2} fill="url(#streamGrad)" />
                <Area type="monotone" dataKey="saves" stroke="#00C4FF" strokeWidth={2} fill="url(#saveGrad)" />
                <Area type="monotone" dataKey="downloads" stroke="#D63DF6" strokeWidth={2} fill="url(#dlGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'revenue' && (
          <div>
            <div className="flex items-center gap-4 mb-4 text-xs text-white/40 flex-wrap">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />Streaming</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#7B5FFF]" />Downloads</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#00C4FF]" />Publishing</span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data?.revenueData || []} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toFixed(0)}`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="streaming" fill="#10B981" radius={[3,3,0,0]} />
                <Bar dataKey="downloads" fill="#7B5FFF" radius={[3,3,0,0]} />
                <Bar dataKey="publishing" fill="#00C4FF" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'platforms' && (
          <div className="flex flex-col lg:flex-row gap-6 items-center">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={data?.platformData || []} cx="50%" cy="50%" outerRadius={100} dataKey="streams" nameKey="platform" paddingAngle={3}>
                  {(data?.platformData || []).map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: any) => val.toLocaleString()} />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-full lg:w-72 space-y-2 flex-shrink-0">
              {(data?.platformData || []).map((p: any) => {
                const total = (data?.platformData || []).reduce((s: number, d: any) => s + d.streams, 0);
                const pct = total > 0 ? ((p.streams / total) * 100).toFixed(1) : '0.0';
                return (
                  <div key={p.platform} className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
                    <span className="text-xs text-white/60 flex-1">{p.platform}</span>
                    <span className="text-xs text-white/40">{p.streams.toLocaleString()}</span>
                    <div className="w-20 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: p.color }} />
                    </div>
                    <span className="text-xs text-white/40 w-10 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Geographic Data */}
      <div className="bg-[#111111] border border-white/[0.06] rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-5">
          <Globe size={17} className="text-[#00C4FF]" />
          <h2 className="text-sm font-semibold text-white">Top Markets</h2>
        </div>
        <div className="space-y-3">
          {(data?.geoData || []).map((g: any, i: number) => {
            const colors = ['#00C4FF', '#7B5FFF', '#D63DF6', '#FF5252', '#F59E0B', '#10B981', '#6B7280'];
            return (
              <div key={g.country} className="flex items-center gap-4">
                <span className="text-white/30 text-xs w-5 text-center">{i + 1}</span>
                <span className="text-sm text-white/70 flex-1">{g.country}</span>
                <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden max-w-[200px]">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${g.percentage}%` }} transition={{ delay: i * 0.08, duration: 0.6 }}
                    className="h-full rounded-full" style={{ background: colors[i] || '#6B7280' }} />
                </div>
                <span className="text-xs text-white/40 w-8 text-right">{g.percentage}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}