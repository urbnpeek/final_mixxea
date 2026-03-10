import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../dashboard/AuthContext';
import * as api from '../dashboard/api';
import { useNavigate } from 'react-router';
import {
  Bell, Users, Megaphone, Ticket, Music, Package, Radio,
  CheckCheck, Trash2, RefreshCw, Filter, X, ArrowRight,
  AlertCircle, Inbox, BellOff, Eye,
} from 'lucide-react';

// ── Notification type config ───────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; link: string }> = {
  new_signup:         { label: 'New Signup',        icon: Users,     color: '#00C4FF', link: '/admin/users'     },
  campaign_submitted: { label: 'Campaign Request',  icon: Megaphone, color: '#F59E0B', link: '/admin/campaigns' },
  ticket_created:     { label: 'Support Ticket',    icon: Ticket,    color: '#D63DF6', link: '/admin/tickets'   },
  release_submitted:  { label: 'Release Submitted', icon: Music,     color: '#7B5FFF', link: '/admin/releases'  },
  order_created:      { label: 'New Order',         icon: Package,   color: '#FF5252', link: '/admin/orders'    },
  pitch_submitted:    { label: 'Pitch Request',     icon: Radio,     color: '#10B981', link: '/admin/pitches'   },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] || { label: 'Notification', icon: Bell, color: '#7B5FFF', link: '/admin' };
}

function formatTime(iso: string) {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 1) return `${days} days ago`;
  if (days === 1) return 'Yesterday';
  if (hrs > 0) return `${hrs}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'Just now';
}

function formatDate(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

type FilterType = 'all' | 'unread' | 'new_signup' | 'campaign_submitted' | 'ticket_created' | 'release_submitted' | 'order_created';

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all',                label: 'All' },
  { value: 'unread',             label: 'Unread' },
  { value: 'new_signup',         label: 'Signups' },
  { value: 'campaign_submitted', label: 'Campaigns' },
  { value: 'ticket_created',     label: 'Tickets' },
  { value: 'release_submitted',  label: 'Releases' },
  { value: 'order_created',      label: 'Orders' },
];

export function AdminNotifications() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    api.adminGetNotifications(token)
      .then(d => setNotifications(d.notifications || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const markAllRead = async () => {
    if (!token) return;
    await api.adminReadNotifications(token, []).catch(console.error);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotif = async (id: string) => {
    if (!token) return;
    await api.adminDeleteNotification(token, id).catch(console.error);
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (selected === id) setSelected(null);
  };

  const clearAll = async () => {
    if (!token) return;
    setClearing(true);
    await api.adminDeleteNotification(token, 'all').catch(console.error);
    setNotifications([]);
    setSelected(null);
    setClearing(false);
  };

  const markRead = async (id: string) => {
    if (!token) return;
    await api.adminReadNotifications(token, [id]).catch(console.error);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleOpen = (n: any) => {
    setSelected(n.id);
    if (!n.read) markRead(n.id);
  };

  const filtered = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.read;
    return n.type === filter;
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const selectedNotif = notifications.find(n => n.id === selected);

  // Group notifications by date
  const grouped: Record<string, any[]> = {};
  filtered.forEach(n => {
    const d = new Date(n.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    let label: string;
    if (d.toDateString() === today.toDateString()) label = 'Today';
    else if (d.toDateString() === yesterday.toDateString()) label = 'Yesterday';
    else label = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(n);
  });

  return (
    <div className="p-5 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-black text-white tracking-tight">Admin Notifications</h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold rounded-full text-black" style={{ background: '#D63DF6' }}>
                {unreadCount} new
              </span>
            )}
          </div>
          <p className="text-white/40 text-sm">
            Real-time alerts for signups, service requests &amp; support tickets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load}
            className="p-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white/50 hover:text-white hover:bg-white/[0.06] transition-all">
            <RefreshCw size={15} />
          </button>
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              className="flex items-center gap-2 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white/60 hover:text-white hover:bg-white/[0.06] transition-all text-sm font-medium">
              <CheckCheck size={14} />
              <span className="hidden sm:inline">Mark all read</span>
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={clearAll} disabled={clearing}
              className="flex items-center gap-2 px-3 py-2 bg-[#FF5252]/10 border border-[#FF5252]/20 rounded-xl text-[#FF5252] hover:bg-[#FF5252]/20 transition-all text-sm font-medium">
              <Trash2 size={14} />
              <span className="hidden sm:inline">Clear all</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total', value: notifications.length, color: '#7B5FFF' },
          { label: 'Unread', value: unreadCount, color: '#D63DF6' },
          { label: 'Signups', value: notifications.filter(n => n.type === 'new_signup').length, color: '#00C4FF' },
          { label: 'Service Requests', value: notifications.filter(n => n.type !== 'new_signup').length, color: '#F59E0B' },
        ].map(s => (
          <div key={s.label} className="bg-[#0D0D0D] border border-white/[0.06] rounded-2xl p-4">
            <div className="text-2xl font-black mb-1" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-white/40">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
        <Filter size={13} className="text-white/30 flex-shrink-0 mr-1" />
        {FILTERS.map(f => {
          const count = f.value === 'all' ? notifications.length
            : f.value === 'unread' ? notifications.filter(n => !n.read).length
            : notifications.filter(n => n.type === f.value).length;
          return (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                filter === f.value
                  ? 'bg-[#7B5FFF]/20 border border-[#7B5FFF]/30 text-white'
                  : 'bg-white/[0.03] border border-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.06]'
              }`}>
              {f.label}
              {count > 0 && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                  filter === f.value ? 'bg-[#7B5FFF] text-white' : 'bg-white/10 text-white/60'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main content — master/detail layout */}
      <div className="flex gap-4 min-h-[500px]">
        {/* List panel */}
        <div className={`${selectedNotif ? 'hidden lg:flex' : 'flex'} flex-col flex-1 bg-[#0D0D0D] border border-white/[0.06] rounded-2xl overflow-hidden`}>
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <RefreshCw size={20} className="text-white/20 mx-auto mb-3 animate-spin" />
                <p className="text-white/30 text-sm">Loading…</p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center py-16">
                {filter === 'unread' ? (
                  <>
                    <CheckCheck size={28} className="text-[#10B981] mx-auto mb-3" />
                    <p className="text-white/60 font-medium mb-1">All caught up!</p>
                    <p className="text-white/30 text-sm">No unread notifications</p>
                  </>
                ) : (
                  <>
                    <Inbox size={28} className="text-white/20 mx-auto mb-3" />
                    <p className="text-white/40 text-sm">No notifications</p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
              {Object.entries(grouped).map(([dateLabel, items]) => (
                <div key={dateLabel}>
                  <div className="px-4 py-2 bg-black/30 sticky top-0">
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{dateLabel}</span>
                  </div>
                  {items.map(n => {
                    const cfg = getTypeConfig(n.type);
                    const Icon = cfg.icon;
                    const isSelected = selected === n.id;
                    return (
                      <motion.div key={n.id} layout
                        onClick={() => handleOpen(n)}
                        className={`flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-colors group ${
                          isSelected ? 'bg-[#7B5FFF]/10 border-l-2 border-[#7B5FFF]' : 'hover:bg-white/[0.03]'
                        } ${!n.read ? 'bg-[#D63DF6]/[0.03]' : ''}`}>
                        {/* Icon */}
                        <div className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center"
                          style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}30` }}>
                          <Icon size={14} style={{ color: cfg.color }} />
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-0.5">
                            <p className={`text-sm font-semibold leading-tight ${!n.read ? 'text-white' : 'text-white/70'}`}>
                              {n.title}
                            </p>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {!n.read && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.color }} />}
                              <button onClick={e => { e.stopPropagation(); deleteNotif(n.id); }}
                                className="opacity-0 group-hover:opacity-100 p-0.5 text-white/20 hover:text-[#FF5252] transition-all">
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                          <p className="text-[11px] text-white/40 line-clamp-1 mb-1">{n.message}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                              style={{ background: `${cfg.color}18`, color: cfg.color }}>
                              {cfg.label}
                            </span>
                            <span className="text-[10px] text-white/25">{formatTime(n.createdAt)}</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selectedNotif && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-full lg:w-[380px] flex-shrink-0 bg-[#0D0D0D] border border-white/[0.06] rounded-2xl overflow-hidden flex flex-col"
            >
              {/* Detail header */}
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06]">
                <span className="text-sm font-bold text-white">Notification Detail</span>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => deleteNotif(selectedNotif.id)}
                    className="p-1.5 text-white/30 hover:text-[#FF5252] hover:bg-[#FF5252]/10 rounded-lg transition-all">
                    <Trash2 size={13} />
                  </button>
                  <button onClick={() => setSelected(null)}
                    className="p-1.5 text-white/30 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all">
                    <X size={13} />
                  </button>
                </div>
              </div>

              {/* Detail body */}
              <div className="flex-1 overflow-y-auto p-4">
                {(() => {
                  const n = selectedNotif;
                  const cfg = getTypeConfig(n.type);
                  const Icon = cfg.icon;
                  return (
                    <>
                      {/* Type badge + icon */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                          style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}30` }}>
                          <Icon size={20} style={{ color: cfg.color }} />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                            style={{ background: `${cfg.color}20`, color: cfg.color }}>
                            {cfg.label}
                          </span>
                          <p className="text-white font-bold text-sm mt-1 leading-tight">{n.title}</p>
                        </div>
                      </div>

                      {/* Message */}
                      <p className="text-sm text-white/60 mb-4 leading-relaxed">{n.message}</p>

                      {/* Timestamp */}
                      <div className="flex items-center gap-2 mb-4 text-xs text-white/30">
                        <Bell size={10} />
                        <span>{formatDate(n.createdAt)}</span>
                        {n.read && <span className="flex items-center gap-1 ml-auto text-[#10B981]"><Eye size={10} /> Read</span>}
                      </div>

                      {/* Details table */}
                      {n.details && Object.keys(n.details).length > 0 && (
                        <div className="bg-black/30 border border-white/[0.06] rounded-xl p-3 mb-4">
                          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Details</p>
                          <div className="space-y-2">
                            {Object.entries(n.details).map(([k, v]) => (
                              <div key={k} className="flex items-center justify-between text-xs gap-3">
                                <span className="text-white/40">{k}</span>
                                <span className="text-white font-medium text-right truncate max-w-[160px]">{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* User email */}
                      {n.userEmail && (
                        <div className="bg-[#00C4FF]/06 border border-[#00C4FF]/15 rounded-xl p-3 mb-4">
                          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">User Email</p>
                          <p className="text-sm text-[#00C4FF] font-medium">{n.userEmail}</p>
                        </div>
                      )}

                      {/* CTA */}
                      <button
                        onClick={() => navigate(n.link || cfg.link)}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                        style={{ background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}99)` }}>
                        View in {cfg.label.split(' ')[0]} Panel
                        <ArrowRight size={14} />
                      </button>
                    </>
                  );
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
