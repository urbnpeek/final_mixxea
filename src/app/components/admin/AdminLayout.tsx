import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../dashboard/AuthContext';
import * as api from '../dashboard/api';
import {
  LayoutDashboard, Ticket, Megaphone, Users, Shield, LogOut,
  Menu, X, ChevronRight, Bell, Settings, ExternalLink, Zap, Activity, Search, Music
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/admin',            label: 'Overview',     icon: LayoutDashboard, exact: true },
  { path: '/admin/releases',   label: 'Releases',     icon: Music,           badge: 'releases' },
  { path: '/admin/tickets',    label: 'Ticket Queue', icon: Ticket,          badge: 'queue' },
  { path: '/admin/campaigns',  label: 'Campaigns',    icon: Megaphone },
  { path: '/admin/users',      label: 'Users',        icon: Users },
  { path: '/admin/seo',        label: 'SEO',          icon: Search },
  { path: '/admin/tracking',   label: 'Tracking',     icon: Activity },
];

export function AdminLayout() {
  const { user, logout, token, isLoading } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminNotifs, setAdminNotifs] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    const load = () => api.adminGetNotifications(token).then(d => setAdminNotifs(d.notifications || [])).catch(() => {});
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

  // Navigate imperatively only inside an effect — never during render
  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [isLoading, user, navigate]);

  // While auth is resolving, show nothing (avoids flash)
  if (isLoading) return null;

  // Not logged in — useEffect will redirect; render nothing in the meantime
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
                  <span className="text-[10px] text-[#D63DF6] font-semibold uppercase tracking-wider">Admin Panel</span>
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

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <NavLink key={item.path}
              to={item.path}
              end={item.exact}
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
                  <item.icon size={16} className={isActive ? 'text-[#D63DF6]' : 'group-hover:text-white/80'} />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight size={12} className="text-[#D63DF6]" />}
                </>
              )}
            </NavLink>
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
              <span className="text-white/40 text-sm">MIXXEA Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
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
                      <span className="text-sm font-bold text-white">Admin Notifications</span>
                      <button onClick={() => setNotifOpen(false)} className="text-white/30 hover:text-white"><X size={14} /></button>
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-white/[0.04]">
                      {adminNotifs.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <Bell size={24} className="text-white/20 mx-auto mb-2" />
                          <p className="text-white/40 text-sm">No notifications</p>
                        </div>
                      ) : adminNotifs.slice(0, 20).map((n: any) => (
                        <div key={n.id}
                          className={`px-4 py-3 hover:bg-white/[0.03] transition-colors cursor-pointer ${!n.read ? 'bg-[#7B5FFF]/05' : ''}`}
                          onClick={() => { setNotifOpen(false); if (n.link) navigate(n.link); }}>
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                              {n.type === 'release_submitted' ? <Music size={13} className="text-[#7B5FFF]" /> : <Bell size={13} className="text-[#D63DF6]" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className={`text-xs font-semibold ${!n.read ? 'text-white' : 'text-white/70'}`}>{n.title}</p>
                                {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-[#D63DF6] flex-shrink-0 mt-1" />}
                              </div>
                              <p className="text-[11px] text-white/40 mt-0.5 line-clamp-2">{n.message}</p>
                              <p className="text-[10px] text-white/25 mt-1">{formatTime(n.createdAt)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 py-2.5 border-t border-white/[0.06]">
                      <button onClick={() => { setNotifOpen(false); navigate('/admin/releases'); }}
                        className="w-full text-center text-xs text-[#7B5FFF] hover:text-[#D63DF6] transition-colors">
                        Go to Distribution Inbox →
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