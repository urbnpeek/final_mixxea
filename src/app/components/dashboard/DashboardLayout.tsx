import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './AuthContext';
import { OnboardingModal } from './OnboardingModal';
import * as api from './api';
import {
  LayoutDashboard, Music, Megaphone, BookOpen, BarChart3, Globe, Scissors,
  MessageSquare, Zap, Settings, ChevronDown, LogOut, Menu, Bell, ChevronRight,
  User, Shield, Radio, Users, Lock
} from 'lucide-react';
import mixxeaLogo from '../../../assets/d262559c0b7675722d6c420c935f7d8c758fea4f.png';
import { planHasAccess } from './PlanGate';
import { CurrencySelector } from '../mixxea/CurrencySelector';

function buildNavSections(role: string) {
  const sections: any[] = [
    {
      title: 'Platform',
      items: [
        { label: 'Overview',     icon: LayoutDashboard, path: '/dashboard' },
        { label: 'Distribution', icon: Music,           path: '/dashboard/distribution' },
        { label: 'Analytics',    icon: BarChart3,       path: '/dashboard/analytics' },
        { label: 'Smart Pages',  icon: Globe,           path: '/dashboard/smart-pages' },
      ],
    },
    {
      title: 'Marketing',
      items: [
        { label: 'Promotions',           icon: Megaphone, path: '/dashboard/promotions' },
        { label: 'Playlist Marketplace', icon: Radio,     path: '/dashboard/marketplace', requiredPlan: 'growth' },
      ],
    },
    {
      title: 'Publishing',
      items: [
        { label: 'Publishing Admin', icon: BookOpen, path: '/dashboard/publishing',    requiredPlan: 'growth' },
        { label: 'Royalty Splits',   icon: Scissors, path: '/dashboard/royalty-splits', requiredPlan: 'growth' },
      ],
    },
    {
      title: 'Account',
      items: [
        { label: 'Messages', icon: MessageSquare, path: '/dashboard/messages' },
        { label: 'Credits',  icon: Zap,           path: '/dashboard/credits' },
        { label: 'Settings', icon: Settings,      path: '/dashboard/settings' },
      ],
    },
  ];

  // Add Team section for label accounts
  if (role === 'label') {
    sections.splice(2, 0, {
      title: 'Label',
      items: [
        { label: 'Artist Roster', icon: Users, path: '/dashboard/team' },
      ],
    });
  }

  return sections;
}

const roleColors: Record<string, string> = {
  artist:  'from-[#7B5FFF] to-[#D63DF6]',
  label:   'from-[#00C4FF] to-[#7B5FFF]',
  curator: 'from-[#D63DF6] to-[#FF5252]',
};

export function DashboardLayout() {
  const { user, token, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // ── Session guard ─────────────────────────────────────────────────────────
  // After AuthContext finishes loading, verify the session is actually valid.
  // We do this here (not in AuthContext) so that data-fetching API calls on
  // dashboard pages that fail for non-auth reasons don't trigger a logout.
  useEffect(() => {
    if (isLoading) return; // still initialising — wait

    if (!token) {
      // No token at all → go to login
      navigate('/auth', { replace: true });
      return;
    }

    // Verify the stored token is still accepted by the server.
    api.verifyToken(token)
      .then(({ user: u }) => {
        // Token is valid — nothing to do (user is already set in AuthContext)
        if (!u) throw new Error('no user returned');
      })
      .catch(() => {
        // Token rejected → clear session and redirect
        logout();
        navigate('/auth', { replace: true });
      });
    // Run once per mount (token doesn't change mid-session under normal use)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  // Show onboarding for new users
  useEffect(() => {
    if (user && !(user as any).onboardingCompleted) {
      const t = setTimeout(() => setShowOnboarding(true), 800);
      return () => clearTimeout(t);
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-[#7B5FFF] border-t-transparent animate-spin" />
          <span className="text-white/40 text-sm">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const navSections = buildNavSections(user.role);

  const handleLogout = () => { logout(); navigate('/'); };

  const SidebarContent = ({ forceExpanded = false }: { forceExpanded?: boolean }) => {
    const expanded = forceExpanded || sidebarOpen;
    return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-white/[0.06]">
        <img src={mixxeaLogo} alt="MIXXEA" className="h-8 w-8 flex-shrink-0" />
        {expanded && <span className="text-lg font-bold text-white tracking-tight">MIXXEA</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {navSections.map(section => (
          <div key={section.title}>
            {expanded && (
              <p className="text-[10px] font-semibold text-white/25 uppercase tracking-[0.15em] px-2 mb-2">{section.title}</p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item: any) => {
                const isActive = item.path === '/dashboard'
                  ? location.pathname === '/dashboard'
                  : location.pathname.startsWith(item.path);
                const isLocked = item.requiredPlan && !planHasAccess(user.plan || 'starter', item.requiredPlan);
                return (
                  <Link
                    key={item.path} to={item.path}
                    onClick={() => setMobileSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group ${isActive ? 'bg-gradient-to-r from-[#7B5FFF]/20 to-[#D63DF6]/10 border border-[#7B5FFF]/20 text-white' : isLocked ? 'text-white/30 hover:text-white/50 hover:bg-white/[0.03]' : 'text-white/50 hover:text-white hover:bg-white/[0.05]'}`}
                  >
                    <item.icon size={17} className={`flex-shrink-0 ${isActive ? 'text-[#7B5FFF]' : isLocked ? 'text-white/25' : 'group-hover:text-white/80'}`} />
                    {expanded && <span className="text-sm font-medium flex-1">{item.label}</span>}
                    {expanded && isLocked && <Lock size={11} className="text-white/25 flex-shrink-0" />}
                    {isActive && expanded && !isLocked && <ChevronRight size={13} className="ml-auto text-[#7B5FFF]/60" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Credits indicator */}
      {expanded && (
        <div className="mx-3 mb-3 p-3 rounded-xl bg-gradient-to-r from-[#7B5FFF]/10 to-[#D63DF6]/10 border border-[#7B5FFF]/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/50 font-medium">Credits</span>
            <Zap size={12} className="text-[#00C4FF]" />
          </div>
          <div className="text-xl font-bold text-white">{user.credits?.toLocaleString() || 0}</div>
          <Link to="/dashboard/credits" className="text-xs text-[#7B5FFF] hover:text-[#D63DF6] transition-colors mt-1 inline-block">Buy more →</Link>
        </div>
      )}

      {/* User info */}
      <div className="border-t border-white/[0.06] p-3">
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.05] transition-all"
          >
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${roleColors[user.role] || 'from-[#7B5FFF] to-[#D63DF6]'} flex items-center justify-center flex-shrink-0`}>
              <span className="text-white text-xs font-bold">{user.name?.charAt(0)?.toUpperCase()}</span>
            </div>
            {expanded && (
              <>
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{user.name}</div>
                  <div className="text-xs text-white/40 capitalize">{user.role} · {user.plan}</div>
                </div>
                <ChevronDown size={14} className={`text-white/40 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </>
            )}
          </button>

          <AnimatePresence>
            {userMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                className="absolute bottom-full left-0 right-0 mb-2 bg-[#1A1A1A] border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl z-50"
              >
                <Link to="/dashboard/settings" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/[0.05] transition-all">
                  <User size={14} /> Profile & Settings
                </Link>
                <Link to="/dashboard/credits" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/[0.05] transition-all">
                  <Shield size={14} /> Buy Credits
                </Link>
                {user.role === 'label' && (
                  <Link to="/dashboard/team" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/[0.05] transition-all">
                    <Users size={14} /> Artist Roster
                  </Link>
                )}
                {(user as any).isAdmin && (
                  <Link to="/admin" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-[#D63DF6]/10 transition-all" style={{ color: '#D63DF6' }}>
                    <Shield size={14} /> Admin Panel
                  </Link>
                )}
                <div className="border-t border-white/[0.06]" />
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#FF5252]/80 hover:text-[#FF5252] hover:bg-[#FF5252]/5 transition-all">
                  <LogOut size={14} /> Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
  };

  return (
    <div className="min-h-screen bg-[#050505] flex">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col flex-shrink-0 bg-[#0D0D0D] border-r border-white/[0.06] transition-all duration-300 ${sidebarOpen ? 'w-60' : 'w-[68px]'}`}
        style={{ position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar — always renders expanded content */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileSidebarOpen(false)} className="fixed inset-0 bg-black/70 z-40 lg:hidden" />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: 'spring', damping: 25 }} className="fixed left-0 top-0 bottom-0 w-64 bg-[#0D0D0D] border-r border-white/[0.06] z-50 lg:hidden flex flex-col">
              <SidebarContent forceExpanded />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-[#050505]/90 backdrop-blur-xl border-b border-white/[0.06] px-4 lg:px-6 py-4 flex items-center gap-4">
          {/* Desktop toggle — only affects desktop collapsed sidebar */}
          <button
            onClick={() => {
              if (window.innerWidth >= 1024) {
                setSidebarOpen(s => !s);
              } else {
                setMobileSidebarOpen(s => !s);
              }
            }}
            className="text-white/50 hover:text-white transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          {/* Quick nav pills */}
          <div className="hidden md:flex items-center gap-2">
            <Link to="/dashboard/marketplace"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${location.pathname === '/dashboard/marketplace' ? 'bg-[#7B5FFF]/20 text-[#7B5FFF] border border-[#7B5FFF]/30' : 'text-white/40 hover:text-white hover:bg-white/[0.05]'}`}>
              <Radio size={12} /> Marketplace
            </Link>
            {user.role === 'label' && (
              <Link to="/dashboard/team"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${location.pathname === '/dashboard/team' ? 'bg-[#00C4FF]/20 text-[#00C4FF] border border-[#00C4FF]/30' : 'text-white/40 hover:text-white hover:bg-white/[0.05]'}`}>
                <Users size={12} /> Roster
              </Link>
            )}
          </div>
          {/* Currency selector */}
          <CurrencySelector variant="dark" />
          <button className="relative text-white/50 hover:text-white transition-colors">
            <Bell size={18} />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#D63DF6] rounded-full text-[9px] flex items-center justify-center text-white font-bold">3</span>
          </button>
          <div className="flex items-center gap-2 pl-2 border-l border-white/[0.08]">
            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${roleColors[user.role] || 'from-[#7B5FFF] to-[#D63DF6]'} flex items-center justify-center`}>
              <span className="text-white text-[11px] font-bold">{user.name?.charAt(0)?.toUpperCase()}</span>
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-semibold text-white leading-none">{user.name}</div>
              <div className="text-[11px] text-white/40 capitalize mt-0.5">{user.role}</div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Onboarding Modal */}
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingModal onComplete={() => setShowOnboarding(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
