import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../dashboard/AuthContext';
import * as api from '../dashboard/api';
import { useNavigate } from 'react-router';
import {
  Users, Ticket, Megaphone, Zap, TrendingUp, Clock,
  AlertCircle, CheckCircle, Circle, ArrowRight, Activity, Music
} from 'lucide-react';

const statusConfig: Record<string, any> = {
  open: { label: 'Open', color: '#10B981', bg: '#10B98115', icon: Circle },
  in_progress: { label: 'In Progress', color: '#7B5FFF', bg: '#7B5FFF15', icon: Clock },
  resolved: { label: 'Resolved', color: '#6B7280', bg: '#6B728015', icon: CheckCircle },
  closed: { label: 'Closed', color: '#4B5563', bg: '#4B556315', icon: CheckCircle },
};

const priorityConfig: Record<string, any> = {
  high: { color: '#EF4444', label: 'High' },
  medium: { color: '#F59E0B', label: 'Medium' },
  low: { color: '#6B7280', label: 'Low' },
};

function StatCard({ title, value, sub, icon: Icon, color, delay = 0 }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="bg-[#0D0D0D] border border-white/[0.06] rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-[0.04]" style={{ background: color, transform: 'translate(30%, -30%)' }} />
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      <div className="text-2xl font-black text-white mb-1">{value}</div>
      <div className="text-xs text-white/40">{title}</div>
      {sub && <div className="text-[11px] mt-1.5" style={{ color }}>{sub}</div>}
    </motion.div>
  );
}

export function AdminOverview() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    api.adminGetStats(token)
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const formatTime = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-white/[0.03] rounded-2xl animate-pulse" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          {[1,2].map(i => <div key={i} className="h-64 bg-white/[0.03] rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <AlertCircle size={28} className="text-[#FF5252] mx-auto mb-3" />
          <p className="text-white font-medium mb-1">Failed to load stats</p>
          <p className="text-white/40 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const urgentTickets = (stats?.openTickets || 0) + (stats?.inProgressTickets || 0);
  const pendingCampaigns = stats?.pendingCampaigns || 0;

  return (
    <div className="p-5 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white tracking-tight">Command Center</h1>
        <p className="text-white/40 text-sm mt-1">Platform overview · {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Pending releases banner */}
      {(stats?.pendingReleases || 0) > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 bg-[#7B5FFF]/10 border border-[#7B5FFF]/30 rounded-2xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#7B5FFF]/20 flex items-center justify-center flex-shrink-0">
            <Music size={15} className="text-[#7B5FFF]" />
          </div>
          <div className="flex-1">
            <span className="text-white font-semibold text-sm">{stats.pendingReleases} release{stats.pendingReleases !== 1 ? 's' : ''} pending distribution review</span>
            <span className="text-white/40 text-xs ml-2">Artists are waiting for approval</span>
          </div>
          <button onClick={() => navigate('/admin/releases')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7B5FFF]/20 border border-[#7B5FFF]/30 rounded-lg text-[#7B5FFF] text-xs font-semibold hover:bg-[#7B5FFF]/30 transition-all">
            Review <ArrowRight size={12} />
          </button>
        </motion.div>
      )}

      {/* Pending campaigns banner */}
      {pendingCampaigns > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-2xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#F59E0B]/20 flex items-center justify-center flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-[#F59E0B] animate-ping" />
          </div>
          <div className="flex-1">
            <span className="text-white font-semibold text-sm">{pendingCampaigns} campaign{pendingCampaigns !== 1 ? 's' : ''} awaiting your review</span>
            <span className="text-white/40 text-xs ml-2">Credits are held — approve or reject to resolve</span>
          </div>
          <button onClick={() => navigate('/admin/campaigns')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F59E0B]/20 border border-[#F59E0B]/30 rounded-lg text-[#F59E0B] text-xs font-semibold hover:bg-[#F59E0B]/30 transition-all">
            Review Now <ArrowRight size={12} />
          </button>
        </motion.div>
      )}

      {/* Urgency banner */}
      {urgentTickets > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="mb-5 p-4 bg-[#FF5252]/10 border border-[#FF5252]/20 rounded-2xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#FF5252]/20 flex items-center justify-center flex-shrink-0">
            <AlertCircle size={16} className="text-[#FF5252]" />
          </div>
          <div className="flex-1">
            <span className="text-white font-semibold text-sm">{urgentTickets} ticket{urgentTickets !== 1 ? 's' : ''} need attention</span>
            <span className="text-white/40 text-xs ml-2">({stats?.openTickets} open · {stats?.inProgressTickets} in progress)</span>
          </div>
          <button onClick={() => navigate('/admin/tickets')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF5252]/20 border border-[#FF5252]/30 rounded-lg text-[#FF5252] text-xs font-semibold hover:bg-[#FF5252]/30 transition-all">
            View Queue <ArrowRight size={12} />
          </button>
        </motion.div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard title="Total Users"       value={stats?.totalUsers || 0}                        sub="on platform"      icon={Users}    color="#00C4FF" delay={0} />
        <StatCard title="Pending Releases"  value={stats?.pendingReleases || 0}                   sub={`${stats?.totalReleases || 0} total releases`} icon={Music} color="#7B5FFF" delay={0.05} />
        <StatCard title="Open Tickets"      value={stats?.openTickets || 0}                       sub={`${stats?.totalTickets || 0} total`} icon={Ticket}   color="#D63DF6" delay={0.08} />
        <StatCard title="Pending Campaigns" value={pendingCampaigns}                               sub={`${stats?.activeCampaigns || 0} active · ${stats?.totalCampaigns || 0} total`} icon={Megaphone} color="#F59E0B" delay={0.1} />
        <StatCard title="Credits in System" value={(stats?.totalCreditsInSystem || 0).toLocaleString()} sub="across all users" icon={Zap}     color="#FF5252" delay={0.15} />
      </div>

      {/* Two-column layout */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent Tickets */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-[#0D0D0D] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-white/[0.05]">
            <div className="flex items-center gap-2">
              <Ticket size={15} className="text-[#D63DF6]" />
              <h2 className="text-sm font-bold text-white">Recent Tickets</h2>
            </div>
            <button onClick={() => navigate('/admin/tickets')}
              className="text-xs text-[#D63DF6] hover:text-white transition-colors flex items-center gap-1">
              View all <ArrowRight size={11} />
            </button>
          </div>
          <div className="divide-y divide-white/[0.03]">
            {(stats?.recentTickets || []).slice(0, 5).map((ticket: any) => {
              const sc = statusConfig[ticket.status] || statusConfig.open;
              const pc = priorityConfig[ticket.priority] || priorityConfig.medium;
              return (
                <div key={ticket.id} className="px-5 py-3.5 hover:bg-white/[0.02] transition-colors cursor-pointer"
                  onClick={() => navigate('/admin/tickets')}>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{ticket.subject}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] px-1.5 py-0.5 rounded font-medium" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                        <span className="text-[11px] text-white/30">{ticket.category}</span>
                        <span className="text-[11px] text-white/25">{formatTime(ticket.createdAt)}</span>
                      </div>
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: pc.color }} title={pc.label} />
                  </div>
                </div>
              );
            })}
            {(!stats?.recentTickets || stats.recentTickets.length === 0) && (
              <div className="px-5 py-8 text-center text-white/30 text-sm">No tickets yet</div>
            )}
          </div>
        </motion.div>

        {/* Recent Users */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-[#0D0D0D] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-white/[0.05]">
            <div className="flex items-center gap-2">
              <Users size={15} className="text-[#00C4FF]" />
              <h2 className="text-sm font-bold text-white">Recent Signups</h2>
            </div>
            <button onClick={() => navigate('/admin/users')}
              className="text-xs text-[#00C4FF] hover:text-white transition-colors flex items-center gap-1">
              View all <ArrowRight size={11} />
            </button>
          </div>
          <div className="divide-y divide-white/[0.03]">
            {(stats?.recentUsers || []).slice(0, 5).map((u: any) => (
              <div key={u.id} className="px-5 py-3.5 hover:bg-white/[0.02] transition-colors cursor-pointer"
                onClick={() => navigate('/admin/users')}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                    style={{ background: `linear-gradient(135deg, #7B5FFF, #D63DF6)` }}>
                    {u.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{u.name}</p>
                    <p className="text-[11px] text-white/30 truncate">{u.email}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-white/50 capitalize px-2 py-0.5 bg-white/[0.04] rounded-lg">{u.role}</div>
                    <div className="text-[10px] text-white/25 mt-1">{formatTime(u.joinedAt)}</div>
                  </div>
                </div>
              </div>
            ))}
            {(!stats?.recentUsers || stats.recentUsers.length === 0) && (
              <div className="px-5 py-8 text-center text-white/30 text-sm">No users yet</div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Quick actions */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Distribution Inbox', sub: `${stats?.pendingReleases || 0} pending`, path: '/admin/releases', color: '#7B5FFF', icon: Music },
          { label: 'Campaign Management', sub: `${stats?.pendingCampaigns || 0} pending`, path: '/admin/campaigns', color: '#F59E0B', icon: Megaphone },
          { label: 'Ticket Queue', sub: `${stats?.openTickets || 0} open`, path: '/admin/tickets', color: '#D63DF6', icon: Ticket },
          { label: 'User Management', sub: `${stats?.totalUsers || 0} users`, path: '/admin/users', color: '#00C4FF', icon: Users },
        ].map(item => (
          <button key={item.path} onClick={() => navigate(item.path)}
            className="p-4 bg-[#0D0D0D] border border-white/[0.06] rounded-2xl hover:border-white/15 transition-all text-left group">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: `${item.color}15` }}>
              <item.icon size={15} style={{ color: item.color }} />
            </div>
            <div className="text-sm font-semibold text-white group-hover:text-white">{item.label}</div>
            <div className="text-xs text-white/40 mt-0.5">{item.sub}</div>
          </button>
        ))}
      </motion.div>
    </div>
  );
}