import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../dashboard/AuthContext';
import * as api from '../dashboard/api';
import { toast } from 'sonner';
import {
  Users, Search, X, RefreshCw, Zap, Ticket, Megaphone, Shield,
  Plus, Minus, ChevronDown, Check, UserCheck, Crown, Music2,
  Calendar, Mail
} from 'lucide-react';

const ROLE_CONFIG: Record<string, any> = {
  artist: { label: 'Artist', color: '#7B5FFF', icon: Music2 },
  label: { label: 'Label', color: '#00C4FF', icon: Crown },
  curator: { label: 'Curator', color: '#D63DF6', icon: UserCheck },
};

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
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
        className="bg-[#0D0D0D] border border-white/[0.08] rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <div>
            <h2 className="text-sm font-bold text-white">Adjust Credits</h2>
            <p className="text-xs text-white/40 mt-0.5">{user.name} · {user.credits.toLocaleString()} current balance</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Quick presets */}
          <div>
            <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">Quick Select</label>
            <div className="grid grid-cols-3 gap-2">
              {presets.map(p => (
                <button key={p} onClick={() => setAmount(p)}
                  className={`py-2 rounded-xl text-sm font-bold transition-all border ${
                    amount === p
                      ? p > 0
                        ? 'bg-[#10B981]/20 border-[#10B981]/40 text-[#10B981]'
                        : 'bg-[#FF5252]/20 border-[#FF5252]/40 text-[#FF5252]'
                      : 'border-white/[0.08] text-white/50 hover:border-white/20 hover:text-white bg-transparent'
                  }`}>
                  {p > 0 ? `+${p}` : p}
                </button>
              ))}
            </div>
          </div>

          {/* Custom amount */}
          <div>
            <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">Custom Amount</label>
            <div className="flex items-center gap-2">
              <button onClick={() => setAmount(a => a - 10)}
                className="p-2.5 bg-[#FF5252]/10 border border-[#FF5252]/20 rounded-xl text-[#FF5252] hover:bg-[#FF5252]/20 transition-all">
                <Minus size={14} />
              </button>
              <input type="number" value={amount} onChange={e => setAmount(parseInt(e.target.value) || 0)}
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-center text-lg font-bold text-white focus:outline-none focus:border-[#7B5FFF]/50"
              />
              <button onClick={() => setAmount(a => a + 10)}
                className="p-2.5 bg-[#10B981]/10 border border-[#10B981]/20 rounded-xl text-[#10B981] hover:bg-[#10B981]/20 transition-all">
                <Plus size={14} />
              </button>
            </div>
            <div className="mt-2 text-center">
              <span className="text-xs text-white/30">New balance: </span>
              <span className="text-xs font-bold" style={{ color: amount >= 0 ? '#10B981' : '#FF5252' }}>
                {Math.max(0, user.credits + amount).toLocaleString()} credits
              </span>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">Reason (optional)</label>
            <input value={reason} onChange={e => setReason(e.target.value)}
              placeholder="e.g. Compensation for issue, bonus reward..."
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50"
            />
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

export function AdminUsers() {
  const { token, user: adminUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [creditModalUser, setCreditModalUser] = useState<any>(null);
  const [updatingAdmin, setUpdatingAdmin] = useState<string | null>(null);

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
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUpdatingAdmin(null);
    }
  };

  const filtered = users.filter(u => {
    const matchSearch = !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const formatDate = (iso: string) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="p-5 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">User Management</h1>
          <p className="text-white/40 text-sm mt-1">{users.length} registered users on MIXXEA</p>
        </div>
        <button onClick={loadUsers} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] rounded-xl text-white/60 hover:text-white text-xs font-medium transition-all">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
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
      </div>

      {/* Users grid */}
      {loading ? (
        <div className="space-y-3">
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
          <div className="hidden lg:grid lg:grid-cols-[1fr_1fr_100px_80px_80px_120px] gap-4 px-4 py-2 text-[11px] text-white/30 uppercase tracking-wider">
            <span>User</span>
            <span>Email</span>
            <span>Role</span>
            <span>Credits</span>
            <span>Tickets</span>
            <span>Actions</span>
          </div>

          {filtered.map(u => {
            const rc = ROLE_CONFIG[u.role] || ROLE_CONFIG.artist;
            return (
              <motion.div key={u.id} layout
                className="bg-[#0D0D0D] border border-white/[0.06] rounded-xl hover:border-white/10 transition-all">
                <div className="flex flex-wrap lg:grid lg:grid-cols-[1fr_1fr_100px_80px_80px_120px] gap-4 items-center px-4 py-4">
                  {/* Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                      style={{ background: `linear-gradient(135deg, ${rc.color}40, ${rc.color}20)`, border: `1px solid ${rc.color}30` }}>
                      {u.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-white truncate">{u.name}</p>
                        {u.isAdmin && <Shield size={11} className="text-[#D63DF6] flex-shrink-0" />}
                      </div>
                      <p className="text-[10px] text-white/30">{formatDate(u.joinedAt)}</p>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-center gap-1.5 min-w-0 lg:flex">
                    <Mail size={11} className="text-white/30 flex-shrink-0" />
                    <span className="text-xs text-white/50 truncate">{u.email}</span>
                  </div>

                  {/* Role */}
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-medium capitalize"
                      style={{ background: `${rc.color}15`, color: rc.color }}>
                      <rc.icon size={10} />
                      {u.role}
                    </span>
                  </div>

                  {/* Credits */}
                  <div className="flex items-center gap-1">
                    <Zap size={11} className="text-[#00C4FF]" />
                    <span className="text-sm font-bold text-white">{(u.credits || 0).toLocaleString()}</span>
                  </div>

                  {/* Tickets */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Ticket size={10} className="text-white/30" />
                      <span className="text-xs text-white/50">{u.ticketCount || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Megaphone size={10} className="text-white/30" />
                      <span className="text-xs text-white/50">{u.campaignCount || 0}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => setCreditModalUser(u)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-[#00C4FF]/10 border border-[#00C4FF]/20 rounded-lg text-[#00C4FF] text-[11px] font-semibold hover:bg-[#00C4FF]/20 transition-all">
                      <Zap size={10} /> Credits
                    </button>
                    <button
                      onClick={() => toggleAdmin(u.id, u.isAdmin)}
                      disabled={updatingAdmin === u.id || u.id === adminUser?.id}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border disabled:opacity-40 ${
                        u.isAdmin
                          ? 'bg-[#D63DF6]/10 border-[#D63DF6]/20 text-[#D63DF6] hover:bg-[#D63DF6]/20'
                          : 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white hover:border-white/20'
                      }`}>
                      <Shield size={10} />
                      {updatingAdmin === u.id ? '...' : u.isAdmin ? 'Admin' : 'Promote'}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Credit modal */}
      <AnimatePresence>
        {creditModalUser && (
          <CreditModal
            user={creditModalUser}
            onSave={(data: any) => handleAdjustCredits(creditModalUser.id, data)}
            onClose={() => setCreditModalUser(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
