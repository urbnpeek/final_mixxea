// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — Feature 12: Curator Network Directory
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './AuthContext';
import * as api from './api';
import { toast } from 'sonner';
import { Search, Send, CheckCircle, Star, Music, TrendingUp, Clock, Users, X, Filter, Shield, Zap } from 'lucide-react';

const tierColors: Record<string, string> = { elite: '#F59E0B', pro: '#7B5FFF', standard: '#555' };
const tierLabels: Record<string, string> = { elite: '⭐ Elite', pro: '💎 Pro', standard: 'Standard' };

export function CuratorDirectoryPage() {
  const { token, user } = useAuth();
  const [curators, setCurators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [pitching, setPitching] = useState<string | null>(null);
  const [pitched, setPitched] = useState<Set<string>>(new Set());
  const [pitchModal, setPitchModal] = useState<any>(null);
  const [pitchForm, setPitchForm] = useState({ releaseTitle: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.getCurators(token, search, tierFilter)
      .then((r: any) => setCurators(r.curators || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, search, tierFilter]);

  const handlePitch = async () => {
    if (!pitchForm.releaseTitle.trim()) { toast.error('Release title required'); return; }
    setSubmitting(true);
    try {
      await api.directPitch(token!, { curatorId: pitchModal.id, ...pitchForm });
      setPitched(prev => new Set([...prev, pitchModal.id]));
      setPitchModal(null);
      setPitchForm({ releaseTitle: '', message: '' });
      toast.success(`Pitch sent to ${pitchModal.name}! 5 credits deducted.`);
    } catch (err: any) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  const credits = (user as any)?.credits || 0;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white mb-1">Curator Directory</h1>
        <p className="text-white/40 text-sm">Pitch directly to verified playlist curators — 5 credits per pitch</p>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by genre (Hip-Hop, EDM, Pop…)"
            className="w-full pl-10 pr-4 py-3 bg-[#0D0D0D] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#7B5FFF]/50" />
        </div>
        <div className="flex gap-2">
          {['', 'elite', 'pro', 'standard'].map(t => (
            <button key={t} onClick={() => setTierFilter(t)}
              className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${tierFilter === t ? 'text-white border-transparent' : 'text-white/40 bg-[#0D0D0D] border-white/[0.07] hover:text-white'}`}
              style={tierFilter === t ? { background: t ? `${tierColors[t]}25` : 'linear-gradient(135deg,#7B5FFF,#D63DF6)', borderColor: t ? `${tierColors[t]}50` : 'transparent', color: t ? tierColors[t] : '#fff' } : {}}>
              {t === '' ? 'All Tiers' : tierLabels[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Credits reminder */}
      <div className="flex items-center gap-2 p-3 bg-[#0D0D0D] border border-white/[0.06] rounded-xl">
        <Zap size={13} className="text-[#00C4FF]" />
        <span className="text-xs text-white/50">Your credits: <span className="text-white font-bold">{credits}</span></span>
        <span className="text-xs text-white/30 ml-1">· 5 credits per direct pitch</span>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="w-8 h-8 rounded-full border-2 border-[#7B5FFF] border-t-transparent animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {curators.map((curator, i) => {
            const isPitched = pitched.has(curator.id);
            return (
              <motion.div key={curator.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-5 hover:border-white/[0.15] transition-all flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-lg text-white"
                      style={{ background: `linear-gradient(135deg,${tierColors[curator.tier]},${tierColors[curator.tier]}88)` }}>
                      {curator.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-white">{curator.name}</span>
                        {curator.verified && <Shield size={11} className="text-[#00C4FF]" />}
                      </div>
                      <div className="text-xs text-white/40">{curator.genre}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0"
                    style={{ color: tierColors[curator.tier], background: `${tierColors[curator.tier]}20` }}>
                    {tierLabels[curator.tier]}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: 'Followers', value: curator.followers },
                    { label: 'Accept Rate', value: `${curator.acceptanceRate}%` },
                    { label: 'Reply Time', value: curator.avgReplyTime },
                  ].map(s => (
                    <div key={s.label} className="bg-[#050505] rounded-xl p-2.5 text-center">
                      <div className="text-sm font-bold text-white">{s.value}</div>
                      <div className="text-[9px] text-white/30 mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Genre tags */}
                <div className="flex flex-wrap gap-1.5 mb-4 flex-1">
                  {curator.genres.slice(0, 3).map((g: string) => (
                    <span key={g} className="text-[10px] px-2 py-1 bg-[#050505] border border-white/[0.06] rounded-lg text-white/50">{g}</span>
                  ))}
                </div>

                {/* Action */}
                <button onClick={() => { if (isPitched) return; setPitchModal(curator); }}
                  disabled={isPitched || credits < 5}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${isPitched ? 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 cursor-default' : credits < 5 ? 'bg-[#0D0D0D] text-white/30 border border-white/[0.06] cursor-not-allowed' : 'text-white hover:opacity-90'}`}
                  style={!isPitched && credits >= 5 ? { background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' } : {}}>
                  {isPitched ? <><CheckCircle size={12} className="inline mr-1" /> Pitched!</> : credits < 5 ? 'Need 5 credits' : <><Send size={12} className="inline mr-1" /> Pitch (5 credits)</>}
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pitch Modal */}
      <AnimatePresence>
        {pitchModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPitchModal(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111] border border-white/[0.1] rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base font-bold text-white">Pitch to {pitchModal.name}</h3>
                  <p className="text-xs text-white/40">{pitchModal.genre} · {pitchModal.followers} followers · {pitchModal.acceptanceRate}% acceptance</p>
                </div>
                <button onClick={() => setPitchModal(null)} className="text-white/30 hover:text-white"><X size={16} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-white/50 font-medium mb-1.5 block">Release Title *</label>
                  <input value={pitchForm.releaseTitle} onChange={e => setPitchForm(p => ({ ...p, releaseTitle: e.target.value }))}
                    placeholder="e.g. Midnight Dreams"
                    className="w-full px-4 py-3 bg-[#0D0D0D] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#7B5FFF]/50" />
                </div>
                <div>
                  <label className="text-xs text-white/50 font-medium mb-1.5 block">Message to curator (optional)</label>
                  <textarea value={pitchForm.message} onChange={e => setPitchForm(p => ({ ...p, message: e.target.value }))}
                    placeholder="Why is this track perfect for their playlist? Keep it concise and personal…"
                    rows={3}
                    className="w-full px-4 py-3 bg-[#0D0D0D] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#7B5FFF]/50 resize-none" />
                </div>
                <div className="p-3 bg-[#050505] rounded-xl text-xs text-white/50">
                  💡 This will deduct <span className="text-white font-semibold">5 credits</span> from your balance ({credits} remaining)
                </div>
                <button onClick={handlePitch} disabled={submitting || !pitchForm.releaseTitle.trim()}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
                  {submitting ? 'Sending…' : 'Send Pitch (5 credits)'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
