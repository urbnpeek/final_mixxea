import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './AuthContext';
import * as api from './api';
import { toast } from 'sonner';
import {
  Users, UserPlus, Trash2, Mail, Music, BarChart3, Zap,
  Crown, X, Send, Radio, Copy, Check, AlertCircle, Shield
} from 'lucide-react';

const roleColors: Record<string, string> = {
  artist: '#7B5FFF',
  label: '#00C4FF',
  curator: '#D63DF6',
};

function InviteModal({ onClose, onInvite }: { onClose: () => void; onInvite: (email: string, name: string) => Promise<void> }) {
  const [form, setForm] = useState({ email: '', artistName: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim()) { toast.error('Email is required'); return; }
    setLoading(true);
    try {
      await onInvite(form.email, form.artistName);
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-[#111111] border border-white/[0.08] rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-bold text-lg">Invite Artist</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors"><X size={20} /></button>
        </div>

        <div className="bg-[#7B5FFF]/10 border border-[#7B5FFF]/20 rounded-xl p-4 mb-6">
          <p className="text-white/70 text-sm leading-relaxed">
            The artist will receive an email with an invite code. They'll use it when signing up to join your label team on MIXXEA.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Artist Email *</label>
            <input
              type="email" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/50"
              placeholder="artist@email.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Artist Name (optional)</label>
            <input
              value={form.artistName}
              onChange={e => setForm(f => ({ ...f, artistName: e.target.value }))}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/50"
              placeholder="Artist stage name"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-white/50 hover:text-white bg-white/[0.05] transition-all">
              Cancel
            </button>
            <button
              type="submit" disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all"
              style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}
            >
              <Send size={14} /> {loading ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export function TeamPage() {
  const { token, user } = useAuth();
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [lastInvite, setLastInvite] = useState<{ code: string; email: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token || user?.role !== 'label') return;
    api.getTeam(token)
      .then(d => setTeam(d.team || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, user?.role]);

  const handleInvite = async (email: string, artistName: string) => {
    const data = await api.inviteTeamMember(token!, email, artistName);
    toast.success(`✅ Invite sent to ${email}!`);
    setLastInvite({ code: data.inviteCode, email });
    setShowInvite(false);
  };

  const handleRemove = async (memberId: string, memberName: string) => {
    if (!confirm(`Remove ${memberName} from your team?`)) return;
    setRemoving(memberId);
    try {
      await api.removeTeamMember(token!, memberId);
      setTeam(prev => prev.filter(m => m.userId !== memberId));
      toast.success(`${memberName} removed from your team`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRemoving(null);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Invite code copied!');
  };

  if (user?.role !== 'label') {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        <div className="text-center py-20">
          <Shield size={48} className="text-white/20 mx-auto mb-4" />
          <h1 className="text-white text-xl font-bold mb-2">Label Accounts Only</h1>
          <p className="text-white/40 text-sm max-w-xs mx-auto">
            Team management is available for label accounts. Upgrade your account type in Settings to access this feature.
          </p>
        </div>
      </div>
    );
  }

  const totalReleases = team.reduce((s, m) => s + (m.releaseCount || 0), 0);
  const totalCampaigns = team.reduce((s, m) => s + (m.campaignCount || 0), 0);

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Label Roster</h1>
          <p className="text-white/40 text-sm mt-1">Manage your signed artists and label team</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-all"
          style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}
        >
          <UserPlus size={15} /> Invite Artist
        </button>
      </div>

      {/* Label Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Artists on Roster', value: team.length, icon: Users, color: '#7B5FFF' },
          { label: 'Total Releases', value: totalReleases, icon: Music, color: '#D63DF6' },
          { label: 'Total Campaigns', value: totalCampaigns, icon: BarChart3, color: '#00C4FF' },
          { label: 'Label Credits', value: user.credits?.toLocaleString(), icon: Zap, color: '#F59E0B' },
        ].map(s => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[#111111] border border-white/[0.06] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/40 text-xs font-medium">{s.label}</span>
              <s.icon size={14} style={{ color: s.color }} />
            </div>
            <div className="text-2xl font-black text-white">{s.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Last Invite Code */}
      <AnimatePresence>
        {lastInvite && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="mb-6 p-4 bg-[#10B981]/10 border border-[#10B981]/20 rounded-2xl flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <Check size={20} className="text-[#10B981] flex-shrink-0" />
              <div>
                <p className="text-white font-semibold text-sm">Invite sent to {lastInvite.email}!</p>
                <p className="text-white/50 text-xs mt-0.5">Share this backup code if needed:</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <code className="text-white font-mono font-bold text-sm bg-black/30 px-3 py-1.5 rounded-lg tracking-widest">{lastInvite.code}</code>
              <button onClick={() => copyCode(lastInvite.code)}
                className="p-1.5 rounded-lg text-white/50 hover:text-white bg-white/[0.05] transition-all">
                {copied ? <Check size={14} className="text-[#10B981]" /> : <Copy size={14} />}
              </button>
            </div>
            <button onClick={() => setLastInvite(null)} className="text-white/30 hover:text-white"><X size={16} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Roster */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-white/[0.03] rounded-2xl animate-pulse" />)}
        </div>
      ) : team.length === 0 ? (
        <div className="text-center py-16 bg-[#111111] border border-white/[0.06] border-dashed rounded-2xl">
          <Users size={40} className="text-white/15 mx-auto mb-4" />
          <h3 className="text-white/60 font-semibold mb-1">Your roster is empty</h3>
          <p className="text-white/30 text-sm mb-6 max-w-xs mx-auto">
            Invite artists to your label. They'll receive an email with a signup invite code.
          </p>
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white mx-auto hover:opacity-90 transition-all"
            style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}
          >
            <UserPlus size={14} /> Invite Your First Artist
          </button>
        </div>
      ) : (
        <div className="bg-[#111111] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.04] hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4">
            {['Artist', 'Role', 'Releases', 'Campaigns', ''].map(h => (
              <div key={h} className="text-xs font-medium text-white/30 uppercase tracking-wider">{h}</div>
            ))}
          </div>
          <div className="divide-y divide-white/[0.04]">
            {team.map(member => (
              <motion.div
                key={member.userId}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="px-5 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-all"
              >
                {/* Avatar + Name */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${roleColors[member.role] || '#7B5FFF'}, #D63DF6)` }}>
                    {(member.name || 'A').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-white font-semibold text-sm truncate">{member.name}</div>
                    <div className="text-white/40 text-xs truncate">{member.email}</div>
                  </div>
                </div>

                {/* Role */}
                <div className="hidden sm:block">
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold capitalize" style={{ background: `${roleColors[member.role] || '#7B5FFF'}20`, color: roleColors[member.role] || '#7B5FFF' }}>
                    {member.role}
                  </span>
                </div>

                {/* Releases */}
                <div className="hidden sm:flex items-center gap-1.5 text-white/50 text-sm">
                  <Music size={13} className="text-[#D63DF6]" />{member.releaseCount || 0}
                </div>

                {/* Campaigns */}
                <div className="hidden sm:flex items-center gap-1.5 text-white/50 text-sm">
                  <BarChart3 size={13} className="text-[#00C4FF]" />{member.campaignCount || 0}
                </div>

                {/* Actions */}
                <button
                  onClick={() => handleRemove(member.userId, member.name)}
                  disabled={removing === member.userId}
                  className="text-white/20 hover:text-[#FF5252] transition-colors disabled:opacity-30 p-1"
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-white/[0.04] bg-white/[0.01] flex items-center justify-between">
            <span className="text-white/30 text-xs">{team.length} artist{team.length !== 1 ? 's' : ''} on your roster</span>
            <button onClick={() => setShowInvite(true)} className="flex items-center gap-1.5 text-xs text-[#7B5FFF] hover:text-[#D63DF6] transition-colors font-medium">
              <UserPlus size={12} /> Add Artist
            </button>
          </div>
        </div>
      )}

      {/* How It Works */}
      <div className="mt-6 grid sm:grid-cols-3 gap-4">
        {[
          { step: '01', title: 'Invite Artists', desc: 'Send email invites with a unique signup code', icon: Mail, color: '#7B5FFF' },
          { step: '02', title: 'Artists Sign Up', desc: 'Artists use the code to join your label on MIXXEA', icon: Users, color: '#D63DF6' },
          { step: '03', title: 'Manage Together', desc: 'View their releases, analytics, and campaigns in one place', icon: Crown, color: '#00C4FF' },
        ].map(s => (
          <div key={s.step} className="bg-[#111111] border border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${s.color}20` }}>
                <s.icon size={15} style={{ color: s.color }} />
              </div>
              <span className="text-white/20 text-xs font-mono font-bold">{s.step}</span>
            </div>
            <h3 className="text-white font-bold text-sm mb-1">{s.title}</h3>
            <p className="text-white/40 text-xs leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showInvite && (
          <InviteModal onClose={() => setShowInvite(false)} onInvite={handleInvite} />
        )}
      </AnimatePresence>
    </div>
  );
}
