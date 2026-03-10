// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — Admin Users & Clients (Enhanced)
//  Full user management: credits · plan · suspend · delete · email · export · detail
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../dashboard/AuthContext';
import * as api from '../dashboard/api';
import { toast } from 'sonner';
import {
  Users, Search, X, RefreshCw, Zap, Ticket, Megaphone, Shield,
  Plus, Minus, ChevronDown, Check, UserCheck, Crown, Music2,
  Calendar, Mail, Ban, Trash2, Eye, Download, SlidersHorizontal,
  AlertTriangle, CheckCircle, XCircle, Star,
} from 'lucide-react';
import { AdminUserDetail } from './AdminUserDetail';

const ROLE_CONFIG: Record<string, any> = {
  artist:  { label: 'Artist',  color: '#7B5FFF', icon: Music2 },
  label:   { label: 'Label',   color: '#00C4FF', icon: Crown },
  curator: { label: 'Curator', color: '#D63DF6', icon: UserCheck },
};

const PLAN_CONFIG: Record<string, any> = {
  starter: { label: 'Starter', color: '#6B7280' },
  growth:  { label: 'Growth',  color: '#7B5FFF' },
  pro:     { label: 'Pro',     color: '#D63DF6' },
};

// ── Credit Adjustment Modal ────────────────────────────────────────────────────
function CreditModal({ user, onSave, onClose }: any) {
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const presets = [50, 100, 250, 500, -50, -100];

  const handleSave = async () => {
    if (!amount || amount === 0) { toast.error('Enter an amount'); return; }
    setSaving(true);
    try {
      await onSave({ amount, reason: reason || `Admin credit adjustment: ${amount > 0 ? '+' : ''}${amount}` });
      onClose();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
        className="bg-[#0D0D0D] border border-white/[0.08] rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <div>
            <h2 className="text-sm font-bold text-white">Adjust Credits</h2>
            <p className="text-xs text-white/40 mt-0.5">{user.name} · {(user.credits || 0).toLocaleString()} current balance</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">Quick Select</label>
            <div className="grid grid-cols-3 gap-2">
              {presets.map(p => (
                <button key={p} onClick={() => setAmount(p)}
                  className={`py-2 rounded-xl text-sm font-bold transition-all border ${amount === p ? p > 0 ? 'bg-[#10B981]/20 border-[#10B981]/40 text-[#10B981]' : 'bg-[#FF5252]/20 border-[#FF5252]/40 text-[#FF5252]' : 'border-white/[0.08] text-white/50 hover:border-white/20 hover:text-white bg-transparent'}`}>
                  {p > 0 ? `+${p}` : p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">Custom Amount</label>
            <div className="flex items-center gap-2">
              <button onClick={() => setAmount(a => a - 10)} className="p-2.5 bg-[#FF5252]/10 border border-[#FF5252]/20 rounded-xl text-[#FF5252] hover:bg-[#FF5252]/20 transition-all"><Minus size={14} /></button>
              <input type="number" value={amount} onChange={e => setAmount(parseInt(e.target.value) || 0)}
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-center text-lg font-bold text-white focus:outline-none focus:border-[#7B5FFF]/50" />
              <button onClick={() => setAmount(a => a + 10)} className="p-2.5 bg-[#10B981]/10 border border-[#10B981]/20 rounded-xl text-[#10B981] hover:bg-[#10B981]/20 transition-all"><Plus size={14} /></button>
            </div>
            <div className="mt-2 text-center">
              <span className="text-xs text-white/30">New balance: </span>
              <span className="text-xs font-bold" style={{ color: amount >= 0 ? '#10B981' : '#FF5252' }}>
                {Math.max(0, (user.credits || 0) + amount).toLocaleString()} credits
              </span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">Reason (optional)</label>
            <input value={reason} onChange={e => setReason(e.target.value)}
              placeholder="e.g. Compensation for issue, bonus reward..."
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50" />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium text-white/60 bg-white/[0.05] hover:bg-white/[0.08] transition-all">Cancel</button>
            <button onClick={handleSave} disabled={saving || amount === 0}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              style={{ background: amount >= 0 ? 'linear-gradient(135deg, #10B981, #00C4FF)' : 'linear-gradient(135deg, #FF5252, #D63DF6)' }}>
              {saving ? 'Saving...' : amount >= 0 ? `Grant ${amount} Credits` : `Deduct ${Math.abs(amount)} Credits`}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Delete Confirm Modal ────────────────────────────────────────────────────────
function DeleteConfirmModal({ user, onConfirm, onClose }: any) {
  const [confirm, setConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const handleDelete = async () => {
    if (confirm !== user.name) { toast.error('Type the user name to confirm'); return; }
    setDeleting(true);
    try { await onConfirm(); onClose(); }
    catch (err: any) { toast.error(err.message); setDeleting(false); }
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#0D0D0D] border border-[#FF5252]/30 rounded-2xl w-full max-w-md">
        <div className="p-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF5252]/15 flex items-center justify-center"><AlertTriangle size={18} className="text-[#FF5252]" /></div>
            <div>
              <h2 className="text-sm font-bold text-white">Delete User Account</h2>
              <p className="text-xs text-[#FF5252]/80 mt-0.5">This action is permanent and cannot be undone</p>
            </div>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="p-3 bg-[#FF5252]/10 border border-[#FF5252]/20 rounded-xl">
            <p className="text-sm font-semibold text-white">{user.name}</p>
            <p className="text-xs text-white/40">{user.email} · {user.plan} plan</p>
          </div>
          <div className="space-y-2 text-xs text-white/50">
            <p className="font-semibold text-white/70">This will permanently delete:</p>
            <ul className="space-y-1 ml-4">
              <li>• User account and credentials</li>
              <li>• All notifications and notes</li>
              <li>• Credit balance and history</li>
              <li>• Session tokens</li>
            </ul>
            <p className="text-white/30 italic">Releases, tickets, and campaigns are preserved for records.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">Type "{user.name}" to confirm</label>
            <input value={confirm} onChange={e => setConfirm(e.target.value)} placeholder={user.name}
              className="w-full bg-white/[0.04] border border-[#FF5252]/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#FF5252]/60" />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium text-white/60 bg-white/[0.05] hover:bg-white/[0.08] transition-all">Cancel</button>
            <button onClick={handleDelete} disabled={deleting || confirm !== user.name}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40 hover:opacity-90 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #FF5252, #D63DF6)' }}>
              <Trash2 size={14} /> {deleting ? 'Deleting...' : 'Delete Account'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function AdminUsers() {
  const { token, user: adminUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [creditModalUser, setCreditModalUser] = useState<any>(null);
  const [deleteModalUser, setDeleteModalUser] = useState<any>(null);
  const [updatingAdmin, setUpdatingAdmin] = useState<string | null>(null);
  const [suspending, setSuspending] = useState<string | null>(null);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const loadUsers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.adminGetUsers(token);
      setUsers(data.users || []);
    } catch (err: any) {
      toast.error('Failed to load users: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, [token]);

  const handleAdjustCredits = async (userId: string, data: { amount: number; reason: string }) => {
    const { newBalance } = await api.adminAdjustCredits(token!, userId, data);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, credits: newBalance } : u));
    toast.success(`Credits updated: ${data.amount > 0 ? '+' : ''}${data.amount}`);
  };

  const toggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    if (userId === adminUser?.id) { toast.error("You can't modify your own admin status"); return; }
    setUpdatingAdmin(userId);
    try {
      await api.adminUpdateUser(token!, userId, { isAdmin: !currentIsAdmin });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isAdmin: !currentIsAdmin } : u));
      toast.success(currentIsAdmin ? 'Admin access revoked' : 'Admin access granted');
    } catch (err: any) { toast.error(err.message); }
    finally { setUpdatingAdmin(null); }
  };

  const handleSuspend = async (userId: string, isSuspended: boolean) => {
    setSuspending(userId);
    try {
      const reason = !isSuspended ? prompt('Reason for suspension (optional):') || '' : '';
      const r = await api.adminSuspendUser(token!, userId, { suspended: !isSuspended, reason });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...r.user } : u));
      toast.success(!isSuspended ? '🚫 User suspended' : '✅ User unsuspended');
    } catch (err: any) { toast.error(err.message); }
    finally { setSuspending(null); }
  };

  const handleDelete = async (userId: string) => {
    await api.adminDeleteUser(token!, userId);
    setUsers(prev => prev.filter(u => u.id !== userId));
    toast.success('User account permanently deleted');
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const r = await api.adminExportUsers(token!);
      const data = r.users || [];
      const headers = ['ID', 'Name', 'Email', 'Role', 'Plan', 'Credits', 'Admin', 'Suspended', 'Verified', 'Joined'];
      const rows = data.map((u: any) => [u.id, u.name, u.email, u.role, u.plan, u.credits, u.isAdmin, u.suspended, u.verified, u.joinedAt]);
      const csv = [headers, ...rows].map(r => r.map((c: any) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `mixxea-users-${new Date().toISOString().split('T')[0]}.csv`; a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${data.length} users`);
    } catch (err: any) { toast.error('Export failed: ' + err.message); }
    finally { setExporting(false); }
  };

  const handleUserUpdated = (updatedUser: any) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u));
  };

  const filtered = users.filter(u => {
    const matchSearch = !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchPlan = planFilter === 'all' || u.plan === planFilter;
    const matchStatus = statusFilter === 'all' || (statusFilter === 'suspended' && u.suspended) || (statusFilter === 'active' && !u.suspended) || (statusFilter === 'admin' && u.isAdmin);
    return matchSearch && matchRole && matchPlan && matchStatus;
  });

  const formatDate = (iso: string) => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  // Stats
  const totalAdmins = users.filter(u => u.isAdmin).length;
  const totalSuspended = users.filter(u => u.suspended).length;
  const totalPro = users.filter(u => u.plan === 'pro').length;
  const totalGrowth = users.filter(u => u.plan === 'growth').length;

  return (
    <div className="p-5 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Users & Clients</h1>
          <p className="text-white/40 text-sm mt-1">{users.length} registered users on MIXXEA</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-2 px-3 py-2 bg-[#10B981]/10 border border-[#10B981]/20 hover:bg-[#10B981]/20 rounded-xl text-[#10B981] text-xs font-medium transition-all">
            <Download size={13} className={exporting ? 'animate-pulse' : ''} />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
          <button onClick={loadUsers} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] rounded-xl text-white/60 hover:text-white text-xs font-medium transition-all">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        {[
          { label: 'Total Users', value: users.length, color: '#00C4FF' },
          { label: 'Pro Plan', value: totalPro, color: '#D63DF6' },
          { label: 'Growth Plan', value: totalGrowth, color: '#7B5FFF' },
          { label: 'Admins', value: totalAdmins, color: '#F59E0B' },
          { label: 'Suspended', value: totalSuspended, color: '#FF5252' },
        ].map(s => (
          <div key={s.label} className="p-3 bg-[#0D0D0D] border border-white/[0.06] rounded-xl text-center cursor-pointer hover:border-white/10 transition-all">
            <div className="text-xl font-black text-white">{s.value}</div>
            <div className="text-[10px] mt-0.5" style={{ color: s.color }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="flex items-center gap-2 bg-[#111111] border border-white/[0.06] rounded-xl px-3 py-2 flex-1 min-w-[200px]">
          <Search size={13} className="text-white/30 flex-shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..."
            className="bg-transparent text-sm text-white placeholder-white/30 focus:outline-none w-full" />
          {search && <button onClick={() => setSearch('')}><X size={13} className="text-white/30 hover:text-white" /></button>}
        </div>
        <div className="flex gap-1 p-1 bg-[#111111] border border-white/[0.06] rounded-xl">
          {['all', 'artist', 'label', 'curator'].map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${roleFilter === r ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:text-white'}`}>
              {r}
            </button>
          ))}
        </div>
        <div className="flex gap-1 p-1 bg-[#111111] border border-white/[0.06] rounded-xl">
          {['all', 'starter', 'growth', 'pro'].map(p => (
            <button key={p} onClick={() => setPlanFilter(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${planFilter === p ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:text-white'}`}>
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-1 p-1 bg-[#111111] border border-white/[0.06] rounded-xl">
          {[{ id: 'all', label: 'All' }, { id: 'active', label: 'Active' }, { id: 'suspended', label: 'Suspended' }, { id: 'admin', label: 'Admin' }].map(s => (
            <button key={s.id} onClick={() => setStatusFilter(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === s.id ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:text-white'}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users list */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-20 bg-white/[0.03] rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Users size={28} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/40 text-sm">No users match your filters</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Table header */}
          <div className="hidden lg:grid lg:grid-cols-[1.5fr_1.5fr_90px_80px_80px_80px_160px] gap-3 px-4 py-2 text-[10px] text-white/25 uppercase tracking-wider">
            <span>User</span><span>Email</span><span>Role / Plan</span><span>Credits</span><span>Tickets</span><span>Status</span><span>Actions</span>
          </div>

          {filtered.map(u => {
            const rc = ROLE_CONFIG[u.role] || ROLE_CONFIG.artist;
            const pc = PLAN_CONFIG[u.plan] || PLAN_CONFIG.starter;
            return (
              <motion.div key={u.id} layout
                className={`bg-[#0D0D0D] border rounded-xl hover:border-white/10 transition-all ${u.suspended ? 'border-[#FF5252]/20 bg-[#FF5252]/[0.02]' : 'border-white/[0.06]'}`}>
                <div className="flex flex-wrap lg:grid lg:grid-cols-[1.5fr_1.5fr_90px_80px_80px_80px_160px] gap-3 items-center px-4 py-4">
                  {/* Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative flex-shrink-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white"
                        style={{ background: `linear-gradient(135deg, ${rc.color}40, ${rc.color}20)`, border: `1px solid ${rc.color}30` }}>
                        {u.name?.charAt(0).toUpperCase()}
                      </div>
                      {u.suspended && <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#FF5252] border border-black" title="Suspended" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-white truncate">{u.name}</p>
                        {u.isAdmin && <Shield size={10} className="text-[#D63DF6] flex-shrink-0" />}
                        {u.verified && <CheckCircle size={10} className="text-[#10B981] flex-shrink-0" />}
                      </div>
                      <p className="text-[10px] text-white/30">{formatDate(u.joinedAt)}</p>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Mail size={11} className="text-white/25 flex-shrink-0" />
                    <span className="text-xs text-white/50 truncate">{u.email}</span>
                  </div>

                  {/* Role + Plan */}
                  <div className="flex flex-col gap-1">
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg font-medium capitalize w-fit"
                      style={{ background: `${rc.color}15`, color: rc.color }}>
                      <rc.icon size={9} />{u.role}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-lg font-medium capitalize w-fit"
                      style={{ background: `${pc.color}15`, color: pc.color }}>{u.plan || 'starter'}</span>
                  </div>

                  {/* Credits */}
                  <div className="flex items-center gap-1">
                    <Zap size={11} className="text-[#00C4FF]" />
                    <span className="text-sm font-bold text-white">{(u.credits || 0).toLocaleString()}</span>
                  </div>

                  {/* Tickets */}
                  <div className="flex flex-col gap-1 text-xs text-white/40">
                    <div className="flex items-center gap-1"><Ticket size={10} />{u.ticketCount || 0}</div>
                    <div className="flex items-center gap-1"><Megaphone size={10} />{u.campaignCount || 0}</div>
                  </div>

                  {/* Status */}
                  <div>
                    {u.suspended ? (
                      <span className="text-[10px] px-2 py-1 rounded-lg bg-[#FF5252]/15 text-[#FF5252] font-semibold">Suspended</span>
                    ) : (
                      <span className="text-[10px] px-2 py-1 rounded-lg bg-[#10B981]/15 text-[#10B981] font-semibold">Active</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* View Detail */}
                    <button onClick={() => setDetailUserId(u.id)}
                      className="p-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white/50 hover:text-white hover:border-white/20 transition-all" title="View Profile">
                      <Eye size={12} />
                    </button>
                    {/* Adjust Credits */}
                    <button onClick={() => setCreditModalUser(u)}
                      className="p-1.5 bg-[#00C4FF]/10 border border-[#00C4FF]/20 rounded-lg text-[#00C4FF] hover:bg-[#00C4FF]/20 transition-all" title="Adjust Credits">
                      <Zap size={12} />
                    </button>
                    {/* Suspend / Unsuspend */}
                    <button
                      onClick={() => handleSuspend(u.id, !!u.suspended)}
                      disabled={suspending === u.id || u.id === adminUser?.id}
                      className={`p-1.5 rounded-lg transition-all border disabled:opacity-40 ${u.suspended ? 'bg-[#10B981]/10 border-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/20' : 'bg-[#F59E0B]/10 border-[#F59E0B]/20 text-[#F59E0B] hover:bg-[#F59E0B]/20'}`}
                      title={u.suspended ? 'Unsuspend' : 'Suspend'}>
                      {u.suspended ? <UserCheck size={12} /> : <Ban size={12} />}
                    </button>
                    {/* Toggle Admin */}
                    <button
                      onClick={() => toggleAdmin(u.id, u.isAdmin)}
                      disabled={updatingAdmin === u.id || u.id === adminUser?.id}
                      className={`p-1.5 rounded-lg text-[11px] font-semibold transition-all border disabled:opacity-40 ${u.isAdmin ? 'bg-[#D63DF6]/10 border-[#D63DF6]/20 text-[#D63DF6] hover:bg-[#D63DF6]/20' : 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white hover:border-white/20'}`}
                      title={u.isAdmin ? 'Revoke Admin' : 'Make Admin'}>
                      <Shield size={12} />
                    </button>
                    {/* Delete */}
                    {u.id !== adminUser?.id && !u.isAdmin && (
                      <button onClick={() => setDeleteModalUser(u)}
                        className="p-1.5 bg-[#FF5252]/10 border border-[#FF5252]/20 rounded-lg text-[#FF5252] hover:bg-[#FF5252]/20 transition-all" title="Delete User">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {creditModalUser && (
          <CreditModal
            user={creditModalUser}
            onSave={(data: any) => handleAdjustCredits(creditModalUser.id, data)}
            onClose={() => setCreditModalUser(null)}
          />
        )}
        {deleteModalUser && (
          <DeleteConfirmModal
            user={deleteModalUser}
            onConfirm={() => handleDelete(deleteModalUser.id)}
            onClose={() => setDeleteModalUser(null)}
          />
        )}
      </AnimatePresence>

      {/* User Detail Drawer */}
      <AnimatePresence>
        {detailUserId && (
          <AdminUserDetail
            userId={detailUserId}
            onClose={() => setDetailUserId(null)}
            onUserUpdated={handleUserUpdated}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
