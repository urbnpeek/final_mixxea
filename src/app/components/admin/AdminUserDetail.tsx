// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — Admin User Detail Modal
//  Full profile: stats · releases · campaigns · tickets · notes · credit log
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../dashboard/AuthContext';
import * as api from '../dashboard/api';
import { toast } from 'sonner';
import {
  X, User, Mail, Shield, Crown, Zap, Music, Megaphone, Ticket,
  Radio, Clock, CheckCircle, XCircle, Globe, Star, Calendar,
  MessageSquare, Send, AlertTriangle, FileText, TrendingUp,
  ChevronRight, Plus, Tag, Pencil, RefreshCw, Ban, UserCheck,
} from 'lucide-react';

const PLAN_CFG: Record<string, { label: string; color: string }> = {
  starter: { label: 'Starter', color: '#6B7280' },
  growth:  { label: 'Growth',  color: '#7B5FFF' },
  pro:     { label: 'Pro',     color: '#D63DF6' },
};

const ROLE_CFG: Record<string, { label: string; color: string }> = {
  artist:  { label: 'Artist',  color: '#7B5FFF' },
  label:   { label: 'Label',   color: '#00C4FF' },
  curator: { label: 'Curator', color: '#D63DF6' },
};

const STATUS_COLOR: Record<string, string> = {
  open: '#10B981', in_progress: '#7B5FFF', resolved: '#6B7280', closed: '#4B5563',
  pending_review: '#F59E0B', active: '#10B981', completed: '#6B7280', rejected: '#FF5252',
  submitted: '#F59E0B', live: '#10B981', distributed: '#7B5FFF', draft: '#6B7280',
};

function TabBtn({ active, onClick, label, count }: any) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${active ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:text-white'}`}>
      {label}{count !== undefined && <span className="ml-1.5 text-[10px] opacity-60">({count})</span>}
    </button>
  );
}

interface Props { userId: string; onClose: () => void; onUserUpdated?: (u: any) => void; }

export function AdminUserDetail({ userId, onClose, onUserUpdated }: Props) {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'releases' | 'campaigns' | 'tickets' | 'pitches' | 'notes' | 'credits'>('overview');

  // Action states
  const [emailModal, setEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteTag, setNoteTag] = useState('general');
  const [addingNote, setAddingNote] = useState(false);
  const [suspending, setSuspending] = useState(false);
  const [planModal, setPlanModal] = useState(false);
  const [newPlan, setNewPlan] = useState('');
  const [planReason, setPlanReason] = useState('');
  const [changingPlan, setChangingPlan] = useState(false);

  const load = async () => {
    if (!token) return;
    try {
      const r = await api.adminGetUserProfile(token, userId);
      setData(r);
      setNewPlan(r.user?.plan || 'starter');
    } catch (err: any) {
      toast.error('Failed to load user profile: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [userId, token]);

  const handleSuspend = async () => {
    if (!data?.user) return;
    const willSuspend = !data.user.suspended;
    const reason = willSuspend ? prompt('Reason for suspension (optional):') || '' : '';
    setSuspending(true);
    try {
      const r = await api.adminSuspendUser(token!, userId, { suspended: willSuspend, reason });
      setData((prev: any) => ({ ...prev, user: r.user }));
      onUserUpdated?.(r.user);
      toast.success(willSuspend ? '🚫 User suspended' : '✅ User unsuspended');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSuspending(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) { toast.error('Subject and message are required'); return; }
    setSendingEmail(true);
    try {
      await api.adminEmailUser(token!, userId, { subject: emailSubject, message: emailBody });
      toast.success('✅ Email sent to ' + data?.user?.name);
      setEmailModal(false);
      setEmailSubject(''); setEmailBody('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) { toast.error('Note cannot be empty'); return; }
    setAddingNote(true);
    try {
      const r = await api.adminAddUserNote(token!, userId, { note: noteText, tag: noteTag });
      setData((prev: any) => ({ ...prev, notes: r.notes }));
      setNoteText('');
      toast.success('Note added');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAddingNote(false);
    }
  };

  const handleChangePlan = async () => {
    setChangingPlan(true);
    try {
      const r = await api.adminChangeUserPlan(token!, userId, { plan: newPlan, reason: planReason });
      setData((prev: any) => ({ ...prev, user: r.user }));
      onUserUpdated?.(r.user);
      setPlanModal(false);
      setPlanReason('');
      toast.success(`✅ Plan changed to ${newPlan}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setChangingPlan(false);
    }
  };

  const formatDate = (iso: string) => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  const formatTime = (iso: string) => {
    if (!iso) return '';
    const ms = Date.now() - new Date(iso).getTime();
    const m = Math.floor(ms / 60000); const h = Math.floor(m / 60); const d = Math.floor(h / 24);
    return d > 0 ? `${d}d ago` : h > 0 ? `${h}h ago` : m > 0 ? `${m}m ago` : 'Just now';
  };

  const user = data?.user;
  const planCfg = PLAN_CFG[user?.plan] || PLAN_CFG.starter;
  const roleCfg = ROLE_CFG[user?.role] || ROLE_CFG.artist;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-start justify-end">
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="h-full w-full max-w-2xl bg-[#0A0A0A] border-l border-white/[0.08] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-2">
            <User size={16} className="text-white/40" />
            <span className="text-sm font-bold text-white">User Profile</span>
          </div>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white hover:bg-white/[0.05] rounded-xl transition-all">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-[#7B5FFF] border-t-transparent animate-spin" />
          </div>
        ) : !user ? (
          <div className="flex-1 flex items-center justify-center text-white/30">User not found</div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* User hero */}
            <div className="p-6 border-b border-white/[0.05]">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${roleCfg.color}40, ${roleCfg.color}20)`, border: `1.5px solid ${roleCfg.color}30` }}>
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-black text-white">{user.name}</h2>
                    {user.isAdmin && <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-lg bg-[#D63DF6]/15 text-[#D63DF6] font-semibold"><Shield size={9} /> Admin</span>}
                    {user.suspended && <span className="text-[10px] px-1.5 py-0.5 rounded-lg bg-[#FF5252]/15 text-[#FF5252] font-semibold">Suspended</span>}
                    {user.verified && <span className="text-[10px] px-1.5 py-0.5 rounded-lg bg-[#10B981]/15 text-[#10B981] font-semibold">✓ Verified</span>}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Mail size={11} className="text-white/30" />
                    <span className="text-sm text-white/50">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-[11px] px-2 py-0.5 rounded-lg font-semibold" style={{ background: `${roleCfg.color}18`, color: roleCfg.color }}>{roleCfg.label}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-lg font-semibold" style={{ background: `${planCfg.color}18`, color: planCfg.color }}>{planCfg.label} Plan</span>
                    <span className="text-[11px] text-white/30">Joined {formatDate(user.joinedAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => setEmailModal(true)}
                    className="p-2 bg-[#7B5FFF]/10 border border-[#7B5FFF]/20 rounded-xl text-[#7B5FFF] hover:bg-[#7B5FFF]/20 transition-all" title="Send Email">
                    <Send size={14} />
                  </button>
                  <button onClick={() => setPlanModal(true)}
                    className="p-2 bg-[#00C4FF]/10 border border-[#00C4FF]/20 rounded-xl text-[#00C4FF] hover:bg-[#00C4FF]/20 transition-all" title="Change Plan">
                    <Crown size={14} />
                  </button>
                  <button onClick={handleSuspend} disabled={suspending}
                    className={`p-2 rounded-xl transition-all border ${user.suspended ? 'bg-[#10B981]/10 border-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/20' : 'bg-[#FF5252]/10 border-[#FF5252]/20 text-[#FF5252] hover:bg-[#FF5252]/20'}`}
                    title={user.suspended ? 'Unsuspend User' : 'Suspend User'}>
                    {user.suspended ? <UserCheck size={14} /> : <Ban size={14} />}
                  </button>
                  <button onClick={load} className="p-2 bg-white/[0.04] border border-white/[0.06] rounded-xl text-white/40 hover:text-white transition-all" title="Refresh">
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>

              {/* Stats bar */}
              <div className="grid grid-cols-4 gap-3 mt-5">
                {[
                  { label: 'Credits', value: (user.credits || 0).toLocaleString(), color: '#00C4FF', icon: Zap },
                  { label: 'Releases', value: data.stats?.totalReleases || 0, color: '#7B5FFF', icon: Music },
                  { label: 'Campaigns', value: data.stats?.totalCampaigns || 0, color: '#F59E0B', icon: Megaphone },
                  { label: 'Tickets', value: data.stats?.totalTickets || 0, color: '#D63DF6', icon: Ticket },
                ].map(s => (
                  <div key={s.label} className="p-3 bg-[#111111] border border-white/[0.06] rounded-xl text-center">
                    <s.icon size={14} className="mx-auto mb-1" style={{ color: s.color }} />
                    <div className="text-lg font-black text-white">{s.value}</div>
                    <div className="text-[10px] text-white/40">{s.label}</div>
                  </div>
                ))}
              </div>

              {user.suspended && user.suspendReason && (
                <div className="mt-3 px-3 py-2 bg-[#FF5252]/10 border border-[#FF5252]/20 rounded-xl">
                  <p className="text-xs text-[#FF5252]"><span className="font-semibold">Suspension Reason:</span> {user.suspendReason}</p>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 px-5 py-3 border-b border-white/[0.05] overflow-x-auto flex-shrink-0 bg-[#080808]">
              <TabBtn active={tab === 'overview'} onClick={() => setTab('overview')} label="Overview" />
              <TabBtn active={tab === 'releases'} onClick={() => setTab('releases')} label="Releases" count={data.releases?.length} />
              <TabBtn active={tab === 'campaigns'} onClick={() => setTab('campaigns')} label="Campaigns" count={data.campaigns?.length} />
              <TabBtn active={tab === 'tickets'} onClick={() => setTab('tickets')} label="Tickets" count={data.tickets?.length} />
              <TabBtn active={tab === 'pitches'} onClick={() => setTab('pitches')} label="Pitches" count={data.pitches?.length} />
              <TabBtn active={tab === 'notes'} onClick={() => setTab('notes')} label="Notes" count={data.notes?.length} />
              <TabBtn active={tab === 'credits'} onClick={() => setTab('credits')} label="Credits" />
            </div>

            {/* Tab content */}
            <div className="p-5">

              {/* Overview */}
              {tab === 'overview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'User ID', value: user.id?.slice(0, 16) + '...' },
                      { label: 'Role', value: user.role },
                      { label: 'Plan', value: user.plan || 'starter' },
                      { label: 'Credits', value: (user.credits || 0).toLocaleString() },
                      { label: 'Credits Spent', value: (data.stats?.creditSpent || 0).toLocaleString() },
                      { label: 'Credits Received', value: (data.stats?.creditsReceived || 0).toLocaleString() },
                      { label: 'Admin', value: user.isAdmin ? 'Yes' : 'No' },
                      { label: 'Verified', value: user.verified ? 'Yes' : 'No' },
                      { label: 'Suspended', value: user.suspended ? 'Yes' : 'No' },
                      { label: 'Joined', value: formatDate(user.joinedAt) },
                    ].map(item => (
                      <div key={item.label} className="p-3 bg-[#111111] border border-white/[0.05] rounded-xl">
                        <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">{item.label}</div>
                        <div className="text-sm font-semibold text-white capitalize">{item.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Recent notifications */}
                  {(data.notifications || []).length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Recent Notifications</p>
                      <div className="space-y-2">
                        {(data.notifications || []).slice(0, 5).map((n: any) => (
                          <div key={n.id} className="px-3 py-2.5 bg-[#111111] border border-white/[0.05] rounded-xl">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium text-white">{n.title}</p>
                              <span className="text-[10px] text-white/25">{formatTime(n.createdAt)}</span>
                            </div>
                            <p className="text-[11px] text-white/40 mt-0.5 line-clamp-1">{n.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Releases */}
              {tab === 'releases' && (
                <div className="space-y-2">
                  {(data.releases || []).length === 0 ? (
                    <div className="text-center py-12 text-white/30">
                      <Music size={28} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No releases yet</p>
                    </div>
                  ) : (data.releases || []).map((r: any) => {
                    const sc = STATUS_COLOR[r.status] || '#6B7280';
                    return (
                      <div key={r.id} className="px-4 py-3 bg-[#111111] border border-white/[0.05] rounded-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{r.title}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-white/40">
                              <span className="capitalize">{r.type}</span>
                              {r.genre && <><span className="text-white/20">·</span><span>{r.genre}</span></>}
                              <span className="text-white/20">·</span>
                              <span>{formatDate(r.createdAt)}</span>
                            </div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-lg font-semibold capitalize ml-3" style={{ background: `${sc}18`, color: sc }}>{r.status?.replace('_', ' ')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Campaigns */}
              {tab === 'campaigns' && (
                <div className="space-y-2">
                  {(data.campaigns || []).length === 0 ? (
                    <div className="text-center py-12 text-white/30">
                      <Megaphone size={28} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No campaigns yet</p>
                    </div>
                  ) : (data.campaigns || []).map((c: any) => {
                    const sc = STATUS_COLOR[c.status] || '#6B7280';
                    return (
                      <div key={c.id} className="px-4 py-3 bg-[#111111] border border-white/[0.05] rounded-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-white/40">
                              <span className="capitalize">{c.type?.replace('_', ' ')}</span>
                              <span className="text-white/20">·</span>
                              <Zap size={9} className="text-[#00C4FF]" />
                              <span>{c.creditCost} cr</span>
                              <span className="text-white/20">·</span>
                              <span>{formatDate(c.createdAt)}</span>
                            </div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-lg font-semibold capitalize ml-3" style={{ background: `${sc}18`, color: sc }}>{c.status?.replace('_', ' ')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tickets */}
              {tab === 'tickets' && (
                <div className="space-y-2">
                  {(data.tickets || []).length === 0 ? (
                    <div className="text-center py-12 text-white/30">
                      <Ticket size={28} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No support tickets</p>
                    </div>
                  ) : (data.tickets || []).map((t: any) => {
                    const sc = STATUS_COLOR[t.status] || '#6B7280';
                    return (
                      <div key={t.id} className="px-4 py-3 bg-[#111111] border border-white/[0.05] rounded-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{t.subject}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-white/40">
                              <span className="capitalize">{t.category}</span>
                              <span className="text-white/20">·</span>
                              <MessageSquare size={9} />
                              <span>{t.messageCount || 0} messages</span>
                              <span className="text-white/20">·</span>
                              <span>{formatDate(t.createdAt)}</span>
                            </div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-lg font-semibold capitalize ml-3" style={{ background: `${sc}18`, color: sc }}>{t.status?.replace('_', ' ')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pitches */}
              {tab === 'pitches' && (
                <div className="space-y-2">
                  {(data.pitches || []).length === 0 ? (
                    <div className="text-center py-12 text-white/30">
                      <Radio size={28} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No pitches yet</p>
                    </div>
                  ) : (data.pitches || []).map((p: any) => {
                    const sc = STATUS_COLOR[p.status] || '#6B7280';
                    return (
                      <div key={p.id} className="px-4 py-3 bg-[#111111] border border-white/[0.05] rounded-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{p.trackTitle || '(untitled)'}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-white/40">
                              <span>{p.playlistName}</span>
                              <span className="text-white/20">·</span>
                              <span>{formatDate(p.createdAt)}</span>
                            </div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-lg font-semibold capitalize ml-3" style={{ background: `${sc}18`, color: sc }}>{p.status}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Notes */}
              {tab === 'notes' && (
                <div className="space-y-4">
                  {/* Add note */}
                  <div className="p-4 bg-[#111111] border border-white/[0.06] rounded-xl space-y-3">
                    <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Add Internal Note</p>
                    <div className="flex gap-2">
                      {['general', 'warning', 'vip', 'billing', 'technical'].map(t => (
                        <button key={t} onClick={() => setNoteTag(t)}
                          className={`text-[10px] px-2 py-1 rounded-lg capitalize font-medium transition-all ${noteTag === t ? 'bg-[#7B5FFF]/20 border border-[#7B5FFF]/30 text-[#7B5FFF]' : 'bg-white/[0.04] border border-white/[0.06] text-white/40 hover:text-white'}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                    <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={3}
                      placeholder="Internal note (not visible to user)..."
                      className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/40 resize-none" />
                    <button onClick={handleAddNote} disabled={addingNote || !noteText.trim()}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-all"
                      style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}>
                      <Plus size={12} /> {addingNote ? 'Adding...' : 'Add Note'}
                    </button>
                  </div>

                  {/* Existing notes */}
                  {(data.notes || []).length === 0 ? (
                    <div className="text-center py-8 text-white/30 text-sm">No internal notes yet</div>
                  ) : (data.notes || []).map((n: any) => (
                    <div key={n.id} className="px-4 py-3 bg-[#111111] border border-white/[0.05] rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-lg font-semibold capitalize ${n.tag === 'warning' ? 'bg-[#FF5252]/15 text-[#FF5252]' : n.tag === 'vip' ? 'bg-[#F59E0B]/15 text-[#F59E0B]' : n.tag === 'billing' ? 'bg-[#00C4FF]/15 text-[#00C4FF]' : 'bg-white/[0.06] text-white/40'}`}>{n.tag || 'general'}</span>
                        <span className="text-[10px] text-white/25">{formatTime(n.createdAt)}</span>
                      </div>
                      <p className="text-sm text-white/70 leading-relaxed">{n.note}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Credits */}
              {tab === 'credits' && (
                <div className="space-y-3">
                  <div className="p-4 bg-[#111111] border border-white/[0.06] rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-white/40">Current Balance</p>
                        <p className="text-3xl font-black text-white mt-1">{(user.credits || 0).toLocaleString()}</p>
                      </div>
                      <Zap size={32} className="text-[#00C4FF] opacity-30" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="p-2.5 bg-[#10B981]/10 border border-[#10B981]/20 rounded-xl text-center">
                        <p className="text-xs text-[#10B981] font-semibold">Received</p>
                        <p className="text-lg font-black text-white">{(data.stats?.creditsReceived || 0).toLocaleString()}</p>
                      </div>
                      <div className="p-2.5 bg-[#FF5252]/10 border border-[#FF5252]/20 rounded-xl text-center">
                        <p className="text-xs text-[#FF5252] font-semibold">Spent</p>
                        <p className="text-lg font-black text-white">{(data.stats?.creditSpent || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {(data.creditLog || []).length === 0 ? (
                    <div className="text-center py-8 text-white/30 text-sm">No credit transactions</div>
                  ) : (data.creditLog || []).map((t: any, i: number) => (
                    <div key={i} className="px-4 py-3 bg-[#111111] border border-white/[0.05] rounded-xl flex items-center gap-3">
                      <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: t.type === 'credit' ? '#10B98118' : '#FF525218' }}>
                        {t.type === 'credit' ? <Plus size={12} className="text-[#10B981]" /> : <Zap size={12} className="text-[#FF5252]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white">{t.reason || t.description || 'Credit transaction'}</p>
                        <p className="text-[10px] text-white/30">{formatDate(t.createdAt)}</p>
                      </div>
                      <span className="font-bold text-sm flex-shrink-0" style={{ color: t.type === 'credit' ? '#10B981' : '#FF5252' }}>
                        {t.type === 'credit' ? '+' : '-'}{Math.abs(t.amount || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Email Modal */}
      <AnimatePresence>
        {emailModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0D0D0D] border border-white/[0.08] rounded-2xl w-full max-w-lg">
              <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
                <div>
                  <h3 className="text-sm font-bold text-white">Email {user?.name}</h3>
                  <p className="text-xs text-white/40 mt-0.5">{user?.email}</p>
                </div>
                <button onClick={() => setEmailModal(false)} className="text-white/40 hover:text-white"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">Subject</label>
                  <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)}
                    placeholder="Email subject..."
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">Message</label>
                  <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={6}
                    placeholder="Write your message to the user..."
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50 resize-none" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setEmailModal(false)} className="flex-1 py-3 rounded-xl text-sm font-medium text-white/60 bg-white/[0.05] hover:bg-white/[0.08] transition-all">Cancel</button>
                  <button onClick={handleSendEmail} disabled={sendingEmail}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}>
                    <Send size={14} /> {sendingEmail ? 'Sending...' : 'Send Email'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Plan Change Modal */}
      <AnimatePresence>
        {planModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0D0D0D] border border-white/[0.08] rounded-2xl w-full max-w-sm">
              <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
                <h3 className="text-sm font-bold text-white">Change Plan — {user?.name}</h3>
                <button onClick={() => setPlanModal(false)} className="text-white/40 hover:text-white"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {['starter', 'growth', 'pro'].map(p => {
                    const cfg = PLAN_CFG[p];
                    return (
                      <button key={p} onClick={() => setNewPlan(p)}
                        className={`py-3 px-2 rounded-xl text-xs font-semibold capitalize transition-all border ${newPlan === p ? 'text-white border-transparent' : 'border-white/[0.08] text-white/40 hover:border-white/20'}`}
                        style={newPlan === p ? { background: `${cfg.color}25`, color: cfg.color, borderColor: `${cfg.color}50` } : {}}>
                        {p}
                      </button>
                    );
                  })}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">Reason (optional)</label>
                  <input value={planReason} onChange={e => setPlanReason(e.target.value)}
                    placeholder="e.g. Promotional upgrade, support compensation..."
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setPlanModal(false)} className="flex-1 py-3 rounded-xl text-sm font-medium text-white/60 bg-white/[0.05] hover:bg-white/[0.08] transition-all">Cancel</button>
                  <button onClick={handleChangePlan} disabled={changingPlan || newPlan === user?.plan}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #00C4FF, #7B5FFF)' }}>
                    {changingPlan ? 'Updating...' : `Set ${newPlan}`}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
