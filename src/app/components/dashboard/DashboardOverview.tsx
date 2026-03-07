import { useEffect, useState, useId } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { useAuth } from './AuthContext';
import * as api from './api';
import { Music, Megaphone, BookOpen, Zap, TrendingUp, Play, Plus, ArrowRight, Globe, Scissors, GraduationCap, Users, CalendarDays, Gift } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const StatCard = ({ icon: Icon, label, value, sub, color, trend }: any) => (
  <motion.div whileHover={{ y: -2 }} className="bg-[#111111] border border-white/[0.06] rounded-2xl p-5 relative overflow-hidden group">
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `linear-gradient(135deg, ${color}08, transparent)` }} />
    <div className="flex items-start justify-between mb-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}>
        <Icon size={18} style={{ color }} />
      </div>
      {trend && (
        <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
          <TrendingUp size={11} />
          <span>{trend}</span>
        </div>
      )}
    </div>
    <div className="text-2xl font-bold text-white mb-1">{value}</div>
    <div className="text-sm text-white/50">{label}</div>
    {sub && <div className="text-xs text-white/30 mt-1">{sub}</div>}
  </motion.div>
);

const QuickActionCard = ({ icon: Icon, label, desc, to, color }: any) => (
  <Link to={to}>
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
      className="bg-[#111111] border border-white/[0.06] rounded-xl p-4 flex items-center gap-4 hover:border-white/20 transition-all cursor-pointer group"
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-white">{label}</div>
        <div className="text-xs text-white/40 truncate">{desc}</div>
      </div>
      <ArrowRight size={14} className="text-white/20 group-hover:text-white/60 transition-colors" />
    </motion.div>
  </Link>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1A1A1A] border border-white/[0.1] rounded-xl p-3 shadow-2xl">
        <p className="text-white/50 text-xs mb-2">{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-white/70 capitalize">{p.name}:</span>
            <span className="text-white font-semibold">{p.value?.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function DashboardOverview() {
  const { user, token } = useAuth();
  const uid = useId().replace(/:/g, '');
  const streamGradId = `streamGrad-${uid}`;
  const saveGradId = `saveGrad-${uid}`;
  const [analytics, setAnalytics] = useState<any>(null);
  const [releases, setReleases] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.getAnalytics(token).then(d => setAnalytics(d)).catch(() => {}),
      api.getReleases(token).then(d => setReleases(d.releases || [])).catch(() => {}),
      api.getCampaigns(token).then(d => setCampaigns(d.campaigns || [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [token]);

  const statusColors: Record<string, string> = {
    draft: '#6B7280', submitted: '#F59E0B', live: '#10B981', rejected: '#EF4444', active: '#10B981', paused: '#F59E0B', completed: '#6B7280',
  };

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-white/40 text-sm mb-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">
            Welcome back, <span className="bg-gradient-to-r from-[#00C4FF] via-[#7B5FFF] to-[#D63DF6] bg-clip-text text-transparent">{user?.name}</span> 👋
          </h1>
          <p className="text-white/40 mt-1 text-sm capitalize">{user?.role} · {user?.plan} Plan</p>
        </motion.div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Play} label="Total Streams"
          value={loading ? '—' : (analytics?.overview?.totalStreams?.toLocaleString() || '0')}
          sub={analytics?.overview?.totalStreams > 0 ? 'All time · all platforms' : 'Upload & distribute a release'}
          color="#00C4FF"
          trend={analytics?.overview?.totalStreams > 0 ? undefined : undefined}
        />
        <StatCard
          icon={TrendingUp} label="Revenue"
          value={loading ? '—' : `$${analytics?.overview?.totalRevenue?.toFixed(2) || '0.00'}`}
          sub={analytics?.overview?.totalRevenue > 0 ? 'Streaming + downloads + publishing' : 'Grows with your releases'}
          color="#10B981"
        />
        <StatCard
          icon={Music} label="Releases"
          value={releases.length}
          sub={releases.length > 0 ? `${releases.filter(r => r.status === 'live' || r.status === 'distributed').length} live / distributed` : 'No releases yet'}
          color="#7B5FFF"
        />
        <StatCard
          icon={Megaphone} label="Active Campaigns"
          value={campaigns.filter(c => c.status === 'active').length}
          sub={campaigns.length > 0 ? `${campaigns.length} total campaigns` : 'No campaigns yet'}
          color="#D63DF6"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Stream Chart */}
        <div className="lg:col-span-2 bg-[#111111] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-white">Stream Performance</h2>
              <p className="text-xs text-white/40 mt-0.5">Monthly streams across all platforms</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-white/40">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#7B5FFF]" />Streams</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#00C4FF]" />Saves</span>
            </div>
          </div>
          {loading ? (
            <div className="h-48 flex items-center justify-center text-white/30 text-sm">Loading chart...</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={analytics?.streamData || []} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id={streamGradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7B5FFF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7B5FFF" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id={saveGradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00C4FF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00C4FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area key="streams" type="monotone" dataKey="streams" stroke="#7B5FFF" strokeWidth={2} fill={`url(#${streamGradId})`} />
                <Area key="saves" type="monotone" dataKey="saves" stroke="#00C4FF" strokeWidth={2} fill={`url(#${saveGradId})`} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-white px-1">Quick Actions</h2>
          <div className="space-y-2.5">
            <QuickActionCard icon={Plus} label="Upload Release" desc="Distribute to 150+ stores" to="/dashboard/distribution" color="#7B5FFF" />
            <QuickActionCard icon={Megaphone} label="New Campaign" desc="Spotify, TikTok, YouTube & more" to="/dashboard/promotions" color="#D63DF6" />
            <QuickActionCard icon={BookOpen} label="Register Work" desc="Collect your publishing royalties" to="/dashboard/publishing" color="#00C4FF" />
            <QuickActionCard icon={Globe} label="Edit Smart Page" desc="Your public artist profile" to="/dashboard/smart-pages" color="#FF5252" />
            <QuickActionCard icon={Scissors} label="Create Split" desc="Manage collaborator splits" to="/dashboard/royalty-splits" color="#10B981" />
            <QuickActionCard icon={GraduationCap} label="MIXXEA Academy" desc="Learn music business essentials" to="/dashboard/academy" color="#F59E0B" />
            <QuickActionCard icon={Users} label="Community" desc="Connect with fellow artists" to="/dashboard/community" color="#7B5FFF" />
            <QuickActionCard icon={Gift} label="Referral Program" desc="Earn credits for every invite" to="/dashboard/referrals" color="#D63DF6" />
            <QuickActionCard icon={CalendarDays} label="Release Calendar" desc="View all scheduled releases" to="/dashboard/calendar" color="#00C4FF" />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        {/* Recent Releases */}
        <div className="bg-[#111111] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Recent Releases</h2>
            <Link to="/dashboard/distribution" className="text-xs text-[#7B5FFF] hover:text-[#D63DF6] transition-colors">View all →</Link>
          </div>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 bg-white/[0.03] rounded-xl animate-pulse" />)}</div>
          ) : releases.length === 0 ? (
            <div className="text-center py-8">
              <Music size={28} className="text-white/20 mx-auto mb-3" />
              <p className="text-white/40 text-sm">No releases yet</p>
              <Link to="/dashboard/distribution" className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#7B5FFF] hover:text-[#D63DF6] transition-colors">
                <Plus size={12} /> Upload your first release
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {releases.slice(0, 4).map(r => (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-all">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#7B5FFF]/30 to-[#D63DF6]/30 flex items-center justify-center flex-shrink-0">
                    <Music size={15} className="text-[#7B5FFF]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{r.title}</div>
                    <div className="text-xs text-white/40">{r.type} · {r.genre || 'No genre'}</div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-lg font-medium capitalize" style={{ background: `${statusColors[r.status] || '#6B7280'}20`, color: statusColors[r.status] || '#6B7280' }}>{r.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Campaigns */}
        <div className="bg-[#111111] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Active Campaigns</h2>
            <Link to="/dashboard/promotions" className="text-xs text-[#7B5FFF] hover:text-[#D63DF6] transition-colors">View all →</Link>
          </div>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 bg-white/[0.03] rounded-xl animate-pulse" />)}</div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-8">
              <Megaphone size={28} className="text-white/20 mx-auto mb-3" />
              <p className="text-white/40 text-sm">No campaigns running</p>
              <Link to="/dashboard/promotions" className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#D63DF6] hover:text-[#FF5252] transition-colors">
                <Plus size={12} /> Launch your first campaign
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {campaigns.filter(c => c.status === 'active').slice(0, 4).map(c => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-all">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#D63DF6]/20 to-[#FF5252]/20 flex items-center justify-center flex-shrink-0">
                    <Megaphone size={15} className="text-[#D63DF6]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{c.name}</div>
                    <div className="text-xs text-white/40 capitalize">{c.type?.replace(/_/g, ' ')}</div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-lg font-medium capitalize bg-emerald-500/10 text-emerald-400">{c.status}</span>
                </div>
              ))}
              {campaigns.filter(c => c.status === 'active').length === 0 && (
                <p className="text-white/30 text-sm text-center py-4">No active campaigns</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}