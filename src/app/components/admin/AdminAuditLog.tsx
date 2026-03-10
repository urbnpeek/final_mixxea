// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — Admin Audit Log
//  Full audit trail of all admin actions across the platform
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../dashboard/AuthContext';
import * as api from '../dashboard/api';
import { toast } from 'sonner';
import {
  FileText, Search, X, RefreshCw, User, Shield, Zap, Ticket,
  Megaphone, Music, Settings, Mail, Ban, UserCheck, Crown,
  Trash2, ChevronDown, ChevronUp, Filter, Activity, Download,
} from 'lucide-react';

const ACTION_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  user_suspended:            { label: 'User Suspended',         icon: Ban,         color: '#FF5252' },
  user_unsuspended:          { label: 'User Unsuspended',       icon: UserCheck,   color: '#10B981' },
  user_plan_changed:         { label: 'Plan Changed',           icon: Crown,       color: '#7B5FFF' },
  user_deleted:              { label: 'User Deleted',           icon: Trash2,      color: '#FF5252' },
  user_email_sent:           { label: 'Email Sent',             icon: Mail,        color: '#00C4FF' },
  users_exported:            { label: 'Users Exported',         icon: Download,    color: '#F59E0B' },
  campaign_approved:         { label: 'Campaign Approved',      icon: Megaphone,   color: '#10B981' },
  campaign_rejected:         { label: 'Campaign Rejected',      icon: Megaphone,   color: '#FF5252' },
  release_approved:          { label: 'Release Approved',       icon: Music,       color: '#10B981' },
  release_rejected:          { label: 'Release Rejected',       icon: Music,       color: '#FF5252' },
  platform_settings_updated: { label: 'Settings Updated',       icon: Settings,    color: '#D63DF6' },
  credits_adjusted:          { label: 'Credits Adjusted',       icon: Zap,         color: '#00C4FF' },
  ticket_replied:            { label: 'Ticket Replied',         icon: Ticket,      color: '#D63DF6' },
  admin_promoted:            { label: 'Admin Promoted',         icon: Shield,      color: '#D63DF6' },
  admin_demoted:             { label: 'Admin Demoted',          icon: Shield,      color: '#FF5252' },
};

const ACTION_TYPES = ['all', ...new Set(Object.keys(ACTION_CONFIG))];

function EntryRow({ entry, expanded, onToggle }: any) {
  const cfg = ACTION_CONFIG[entry.action] || { label: entry.action?.replace(/_/g, ' '), icon: Activity, color: '#7B5FFF' };
  const Icon = cfg.icon;
  const metaKeys = Object.keys(entry.meta || {}).filter(k => !['userId'].includes(k));

  const formatTime = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const ms = Date.now() - d.getTime();
    const m = Math.floor(ms / 60000); const h = Math.floor(m / 60); const days = Math.floor(h / 24);
    const rel = days > 0 ? `${days}d ago` : h > 0 ? `${h}h ago` : m > 0 ? `${m}m ago` : 'Just now';
    const abs = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    return `${rel} · ${abs}`;
  };

  return (
    <motion.div layout className="bg-[#0D0D0D] border border-white/[0.06] rounded-xl overflow-hidden hover:border-white/10 transition-all">
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}25` }}>
          <Icon size={13} style={{ color: cfg.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white">{cfg.label}</span>
            {entry.meta?.userName && (
              <span className="text-xs text-white/40">on <span className="text-white/60">{entry.meta.userName}</span></span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-white/30">
            <Shield size={9} className="text-[#D63DF6]" />
            <span className="text-white/50">{entry.adminName || 'Admin'}</span>
            <span className="text-white/20">·</span>
            <span>{formatTime(entry.createdAt)}</span>
          </div>
        </div>
        <div className="flex-shrink-0 text-white/25">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {expanded && metaKeys.length > 0 && (
        <div className="border-t border-white/[0.04] px-4 py-3 bg-white/[0.01]">
          <div className="grid grid-cols-2 gap-2">
            {metaKeys.map(k => (
              <div key={k} className="flex flex-col">
                <span className="text-[10px] text-white/30 uppercase tracking-wider">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                <span className="text-xs text-white/70 mt-0.5 break-all">{String(entry.meta[k])}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-white/[0.04]">
            <span className="text-[10px] text-white/25 font-mono">ID: {entry.id?.slice(0, 16)}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export function AdminAuditLog() {
  const { token } = useAuth();
  const [log, setLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const r = await api.adminGetAuditLog(token);
      setLog(r.log || []);
    } catch (err: any) {
      toast.error('Failed to load audit log: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [token]);

  const filtered = log.filter(e => {
    const matchSearch = !search ||
      e.action?.toLowerCase().includes(search.toLowerCase()) ||
      e.adminName?.toLowerCase().includes(search.toLowerCase()) ||
      JSON.stringify(e.meta || {}).toLowerCase().includes(search.toLowerCase());
    const matchAction = actionFilter === 'all' || e.action === actionFilter;
    return matchSearch && matchAction;
  });

  const downloadCSV = () => {
    const rows = [
      ['Timestamp', 'Action', 'Admin', 'Details'],
      ...filtered.map(e => [
        new Date(e.createdAt).toISOString(),
        e.action || '',
        e.adminName || '',
        JSON.stringify(e.meta || {}),
      ]),
    ];
    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `mixxea-audit-${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} entries`);
  };

  // Unique actions for filter
  const uniqueActions = [...new Set(log.map(e => e.action).filter(Boolean))];

  const groupByDay = (entries: any[]) => {
    const groups: Record<string, any[]> = {};
    for (const e of entries) {
      const day = new Date(e.createdAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      if (!groups[day]) groups[day] = [];
      groups[day].push(e);
    }
    return groups;
  };

  const grouped = groupByDay(filtered);

  return (
    <div className="p-5 lg:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Audit Log</h1>
          <p className="text-white/40 text-sm mt-1">{log.length} total admin actions recorded</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={downloadCSV} disabled={filtered.length === 0}
            className="flex items-center gap-2 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white/60 hover:text-white text-xs font-medium transition-all disabled:opacity-40">
            <Download size={13} /> Export CSV
          </button>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white/60 hover:text-white text-xs font-medium transition-all">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Actions', value: log.length, color: '#7B5FFF' },
          { label: 'Today', value: log.filter(e => new Date(e.createdAt).toDateString() === new Date().toDateString()).length, color: '#00C4FF' },
          { label: 'This Week', value: log.filter(e => Date.now() - new Date(e.createdAt).getTime() < 7 * 86400000).length, color: '#F59E0B' },
          { label: 'Unique Actions', value: uniqueActions.length, color: '#D63DF6' },
        ].map(s => (
          <div key={s.label} className="p-3 bg-[#0D0D0D] border border-white/[0.06] rounded-xl">
            <div className="text-2xl font-black text-white">{s.value}</div>
            <div className="text-[10px] mt-0.5" style={{ color: s.color }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="flex items-center gap-2 bg-[#111111] border border-white/[0.06] rounded-xl px-3 py-2 flex-1 min-w-[220px]">
          <Search size={13} className="text-white/30 flex-shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search actions, admins, or details..."
            className="bg-transparent text-sm text-white placeholder-white/30 focus:outline-none w-full" />
          {search && <button onClick={() => setSearch('')}><X size={13} className="text-white/30 hover:text-white" /></button>}
        </div>
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)}
          className="bg-[#111111] border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-white/70 focus:outline-none min-w-[160px]">
          <option value="all" className="bg-[#111111]">All Actions</option>
          {uniqueActions.map(a => (
            <option key={a} value={a} className="bg-[#111111]">{(ACTION_CONFIG[a]?.label || a?.replace(/_/g, ' '))}</option>
          ))}
        </select>
      </div>

      {/* Log */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-16 bg-white/[0.03] rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FileText size={32} className="text-white/15 mx-auto mb-3" />
          <p className="text-white/30 text-sm">{log.length === 0 ? 'No audit entries yet. Admin actions will be logged here.' : 'No entries match your filters.'}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([day, entries]) => (
            <div key={day}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-white/[0.05]" />
                <span className="text-[10px] text-white/30 font-semibold uppercase tracking-widest">{day}</span>
                <div className="h-px flex-1 bg-white/[0.05]" />
              </div>
              <div className="space-y-2">
                {entries.map(entry => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    expanded={expandedId === entry.id}
                    onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}