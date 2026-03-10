import { useState, useEffect, useRef } from 'react';
import { useNavigate, NavLink, Outlet } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../dashboard/AuthContext';
import * as api from '../dashboard/api';
import {
  LayoutDashboard, Ticket, Megaphone, Users, Shield, LogOut,
  Menu, X, ChevronRight, Bell, Settings, ExternalLink, Zap, Activity,
  Search, Music, TrendingUp, BarChart2, Eye, Package, Radio,
  DollarSign, Globe, FileText, Layers, Network, Clapperboard,
  ClipboardList, SlidersHorizontal,
} from 'lucide-react';

// ── Per-type notification icon/color map ──────────────────────────────────────
const NOTIF_TYPE_CONFIG: Record<string, { icon: any; color: string }> = {
  new_signup:         { icon: Users,     color: '#00C4FF' },
  campaign_submitted: { icon: Megaphone, color: '#F59E0B' },
  ticket_created:     { icon: Ticket,    color: '#D63DF6' },
  release_submitted:  { icon: Music,     color: '#7B5FFF' },
  order_created:      { icon: Package,   color: '#FF5252' },
  pitch_submitted:    { icon: Radio,     color: '#10B981' },
};

function getNotifCfg(type: string) {
  return NOTIF_TYPE_CONFIG[type] || { icon: Bell, color: '#7B5FFF' };
}

const TYPE_COLORS: Record<string, string> = {
  user: '#00C4FF', ticket: '#D63DF6', campaign: '#F59E0B', release: '#7B5FFF',
};

const NAV_GROUPS = [
  {
    label: 'AGENCY OPERATIONS',
    items: [
      { path: '/admin',                label: 'Command Center',   icon: LayoutDashboard, exact: true },
      { path: '/admin/orders',         label: 'Orders Queue',     icon: Package,         badge: 'orders' },
      { path: '/admin/pitches',        label: 'Pitch Manager',    icon: Radio,           badge: 'pitches' },
      { path: '/admin/releases',       label: 'Distribution',     icon: Music,           badge: 'releases' },
    ],
  },
  {
    label: 'CAMPAIGNS & MEDIA',
    items: [
      { path: '/admin/campaigns',      label: 'Campaigns',        icon: Megaphone },
      { path: '/admin/campaign-runner',label: 'Campaign Runner',  icon: Clapperboard },
      { path: '/admin/creator-network',label: 'Creator Network',  icon: Network },
    ],
  },
  {
    label: 'CLIENT MANAGEMENT',
    items: [
      { path: '/admin/users',          label: 'Users & Clients',  icon: Users },
      { path: '/admin/tickets',        label: 'Ticket Queue',     icon: Ticket,  badge: 'queue' },
      { path: '/admin/reports',        label: 'Client Reports',   icon: FileText },
      { path: '/admin/notifications',  label: 'Notifications',    icon: Bell,    badge: 'notifs' },
    ],
  },
  {
    label: 'REVENUE & GROWTH',
    items: [
      { path: '/admin/revenue',        label: 'Revenue Center',   icon: DollarSign },
      { path: '/admin/marketing',      label: 'Marketing & Comms',icon: Zap },
      { path: '/admin/website',        label: 'Website Control',  icon: Globe },
    ],
  },
  {
    label: 'SEO & ANALYTICS',
    items: [
      { path: '/admin/seo',            label: 'SEO Dashboard',    icon: Search },
      { path: '/admin/seo/daily',      label: 'Daily SEO',        icon: TrendingUp },
      { path: '/admin/seo/competitors',label: 'Competitor Spy',   icon: Eye },
      { path: '/admin/ab-tests',       label: 'A/B Tests',        icon: BarChart2 },
      { path: '/admin/tracking',       label: 'Tracking',         icon: Activity },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { path: '/admin/platform-settings', label: 'Platform Settings', icon: SlidersHorizontal },
      { path: '/admin/audit-log',         label: 'Audit Log',          icon: ClipboardList },
    ],
  },
];

// ── Global Search Component ────────────────────────────────────────────────────
function GlobalSearch({ token }: { token: string | null }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', keyHandler); };
  }, []);

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      if (!token) return;
      setSearching(true);
      try {
        const r = await api.adminGlobalSearch(token, query);
        setResults(r.results || []);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, token]);

  const handleSelect = (result: any) => {
    navigate(result.url);
    setOpen(false);
    setQuery('');
    setResults([]);
  };

  const TYPE_LABELS: Record<string, string> = { user: '👤', ticket: '🎫', campaign: '📣', release: '🎵' };

  return (
    <div className="relative" ref={containerRef}>
      <button onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.04] border border-white/[0.06] rounded-xl text-white/30 hover:text-white/60 hover:border-white/10 transition-all text-xs">
        <Search size={12} />
        <span className="hidden sm:inline">Search...</span>
        <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 bg-white/[0.06] rounded font-mono">⌘K</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.97 }}
              className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-[#111111] border border-white/[0.10] rounded-2xl shadow-2xl z-50 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
                <Search size={14} className="text-white/30 flex-shrink-0" />
                <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
                  placeholder="Search users, tickets, campaigns, releases..."
                  className="flex-1 bg-transparent text-sm text-white placeholder-white/30 focus:outline-none" />
                {searching && <div className="w-3.5 h-3.5 rounded-full border border-[#7B5FFF] border-t-transparent animate-spin flex-shrink-0" />}
                {query && <button onClick={() => { setQuery(''); setResults([]); }}><X size={13} className="text-white/30 hover:text-white" /></button>}
              </div>

              {results.length > 0 ? (
                <div className="max-h-80 overflow-y-auto">
                  {['user', 'ticket', 'campaign', 'release'].map(type => {
                    const typeResults = results.filter(r => r.type === type);
                    if (!typeResults.length) return null;
                    return (
                      <div key={type}>
                        <div className="px-4 pt-3 pb-1.5 text-[10px] text-white/25 font-semibold uppercase tracking-widest">{type}s</div>
                        {typeResults.map(result => (
                          <button key={result.id} onClick={() => handleSelect(result)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.04] transition-all text-left">
                            <span className="text-base flex-shrink-0">{TYPE_LABELS[result.type]}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{result.title}</p>
                              <p className="text-xs text-white/40 truncate">{result.subtitle}</p>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-lg flex-shrink-0 capitalize font-medium"
                              style={{ background: `${TYPE_COLORS[result.type] || '#7B5FFF'}18`, color: TYPE_COLORS[result.type] || '#7B5FFF' }}>
                              {result.badge?.replace('_', ' ')}
                            </span>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ) : query.length >= 2 && !searching ? (
                <div className="px-4 py-8 text-center">
                  <Search size={20} className="text-white/20 mx-auto mb-2" />
                  <p className="text-sm text-white/30">No results for "{query}"</p>
                </div>
              ) : query.length < 2 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-xs text-white/25">Type at least 2 characters to search</p>
                  <div className="mt-3 flex flex-wrap gap-2 justify-center">
                    {['Users', 'Tickets', 'Campaigns', 'Releases'].map(s => (
                      <span key={s} className="text-[10px] px-2 py-1 bg-white/[0.04] rounded-lg text-white/30">{s}</span>
                    ))}
                  </div>
                </div>
              ) : null}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AdminLayout() {
  const { user, logout, token, isLoading } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminNotifs, setAdminNotifs] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [ordersBadge, setOrdersBadge] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    const load = () => {
      api.adminGetNotifications(token).then(d => setAdminNotifs(d.notifications || [])).catch(() => {});
      api.adminGetOrders(token).then(d => {
        const pending = (d.orders || []).filter((o: any) => ['pending_review','submitted','pending'].includes(o.status)).length;
        setOrdersBadge(pending);
      }).catch(() => {});
    };
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unreadCount = adminNotifs.filter(n => !n.read).length;

  const handleOpenNotifs = () => {
    setNotifOpen(o => !o);
    if (!notifOpen && unreadCount > 0) {
      api.adminReadNotifications(token!, []).then(() => setAdminNotifs(prev => prev.map(n => ({ ...n, read: true })))).catch(() => {});
    }
  };

  const formatTime = (iso: string) => {
    if (!iso) return '';
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (days > 0) return `${days}d ago`;
    if (hrs > 0) return `${hrs}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return 'Just now';
  };

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [isLoading, user, navigate]);

  if (isLoading) return null;
  if (!user) return null;

  if (!(user as any).isAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#FF5252]/10 border border-[#FF5252]/20 flex items-center justify-center mx-auto mb-4">
            <Shield size={28} className="text-[#FF5252]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Admin Access Required</h1>
          <p className="text-white/40 text-sm mb-6">You don't have permission to access this panel.</p>
          <div className="flex flex-col gap-3 items-center">
            <button onClick={() => navigate('/admin/bootstrap')}
              className="px-6 py-3 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}>
              Request Admin Access
            </button>
            <button onClick={() => navigate('/dashboard')}
              className="px-6 py-2 text-sm text-white/50 hover:text-white transition-colors">
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex">
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setMobileOpen(false)} />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: mobileOpen ? 0 : undefined }}
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 flex flex-col bg-[#080808] border-r border-white/[0.06] z-50 transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo */}
        <div className="p-5 border-b border-white/[0.06]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #00C4FF, #7B5FFF, #D63DF6)' }}>
                <span className="text-white text-xs font-black">MX</span>
              </div>
              <div>
                <span className="text-white font-bold text-sm tracking-tight">MIXXEA</span>
                <div className="flex items-center gap-1.5">
                  <Shield size={9} className="text-[#D63DF6]" />
                  <span className="text-[10px] text-[#D63DF6] font-semibold uppercase tracking-wider">Agency OS</span>
                </div>
              </div>
            </div>
            <button onClick={() => setMobileOpen(false)} className="lg:hidden text-white/40 hover:text-white">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Admin badge */}
        <div className="px-4 py-3 border-b border-white/[0.04]">
          <div className="flex items-center gap-2.5 p-2.5 bg-[#D63DF6]/10 border border-[#D63DF6]/20 rounded-xl">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#D63DF6] to-[#FF5252] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[10px] font-bold">{user.name?.charAt(0).toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-[#D63DF6] font-medium">Super Admin</p>
            </div>
          </div>
        </div>

        {/* Alert badges */}
        {ordersBadge > 0 && (
          <div className="mx-3 mt-2 flex items-center gap-2 px-3 py-2 bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-xl cursor-pointer" onClick={() => navigate('/admin/orders')}>
            <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
            <span className="text-[11px] font-semibold text-[#F59E0B]">{ordersBadge} order{ordersBadge !== 1 ? 's' : ''} pending</span>
          </div>
        )}
        {unreadCount > 0 && (
          <div className="mx-3 mt-1.5 flex items-center gap-2 px-3 py-2 bg-[#D63DF6]/10 border border-[#D63DF6]/20 rounded-xl cursor-pointer" onClick={() => navigate('/admin/notifications')}>
            <div className="w-1.5 h-1.5 rounded-full bg-[#D63DF6] animate-pulse" />
            <span className="text-[11px] font-semibold text-[#D63DF6]">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto mt-2">
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest px-3 mb-1.5">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map(item => (
                  <NavLink key={item.path}
                    to={item.path}
                    end={(item as any).exact}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                        isActive
                          ? 'bg-gradient-to-r from-[#D63DF6]/20 to-[#7B5FFF]/10 text-white border border-[#D63DF6]/20'
                          : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon size={15} className={isActive ? 'text-[#D63DF6]' : 'group-hover:text-white/80'} />
                        <span className="flex-1 text-sm">{item.label}</span>
                        {item.path === '/admin/orders' && ordersBadge > 0 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#F59E0B] text-black">{ordersBadge}</span>
                        )}
                        {item.path === '/admin/notifications' && unreadCount > 0 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#D63DF6] text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>
                        )}
                        {isActive && <ChevronRight size={11} className="text-[#D63DF6]" />}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="p-3 border-t border-white/[0.06] space-y-1">
          <NavLink to="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-white/[0.04] transition-all">
            <ExternalLink size={15} />
            <span>User Dashboard</span>
          </NavLink>
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-[#FF5252] hover:bg-[#FF5252]/10 transition-all">
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-5 py-4 bg-black/80 backdrop-blur-xl border-b border-white/[0.05]">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden text-white/50 hover:text-white p-1">
              <Menu size={20} />
            </button>
            <div className="hidden lg:flex items-center gap-2">
              <Shield size={14} className="text-[#D63DF6]" />
              <span className="text-white/40 text-sm">MIXXEA Agency OS</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Global Search */}
            <GlobalSearch token={token} />

            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#10B981]/10 border border-[#10B981]/20 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              <span className="text-[#10B981] text-xs font-medium">Live</span>
            </div>

            {/* Admin notification bell */}
            <div className="relative" ref={notifRef}>
              <button onClick={handleOpenNotifs}
                className="relative p-2 text-white/40 hover:text-white hover:bg-white/[0.05] rounded-xl transition-all">
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-[#D63DF6] rounded-full text-[9px] flex items-center justify-center text-white font-bold px-0.5">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notifOpen && (
                  <motion.div initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.97 }}
                    className="absolute right-0 top-full mt-2 w-80 bg-[#111111] border border-white/[0.08] rounded-2xl shadow-2xl z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">Admin Notifications</span>
                        {unreadCount > 0 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#D63DF6] text-white">{unreadCount}</span>
                        )}
                      </div>
                      <button onClick={() => setNotifOpen(false)} className="text-white/30 hover:text-white"><X size={14} /></button>
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-white/[0.04]">
                      {adminNotifs.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <Bell size={24} className="text-white/20 mx-auto mb-2" />
                          <p className="text-white/40 text-sm">No notifications yet</p>
                          <p className="text-white/20 text-xs mt-1">You'll be alerted on new signups &amp; service requests</p>
                        </div>
                      ) : adminNotifs.slice(0, 15).map((n: any) => {
                        const cfg = getNotifCfg(n.type);
                        const Icon = cfg.icon;
                        return (
                          <div key={n.id}
                            className={`px-4 py-3 hover:bg-white/[0.03] transition-colors cursor-pointer ${!n.read ? 'bg-[#D63DF6]/[0.04] border-l-2 border-[#D63DF6]/40' : ''}`}
                            onClick={() => { setNotifOpen(false); if (n.link) navigate(n.link); }}>
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center"
                                style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}30` }}>
                                <Icon size={12} style={{ color: cfg.color }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <p className={`text-xs font-semibold ${!n.read ? 'text-white' : 'text-white/70'}`}>{n.title}</p>
                                  {!n.read && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1" style={{ background: cfg.color }} />}
                                </div>
                                <p className="text-[11px] text-white/40 mt-0.5 line-clamp-2">{n.message}</p>
                                <p className="text-[10px] text-white/25 mt-1">{formatTime(n.createdAt)}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="px-4 py-2.5 border-t border-white/[0.06]">
                      <button onClick={() => { setNotifOpen(false); navigate('/admin/notifications'); }}
                        className="w-full text-center text-xs text-[#7B5FFF] hover:text-[#D63DF6] transition-colors font-medium">
                        View All Notifications →
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}