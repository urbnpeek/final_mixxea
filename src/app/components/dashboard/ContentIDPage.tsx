// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — Feature 7: Music Fingerprinting / Content ID
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './AuthContext';
import * as api from './api';
import { toast } from 'sonner';
import { Shield, Plus, AlertCircle, CheckCircle, Eye, DollarSign, Trash2, Youtube, Tv2, X, ChevronDown, ChevronUp } from 'lucide-react';

const PLATFORMS = ['YouTube', 'Facebook', 'TikTok', 'Instagram', 'Twitch'];
const platformIcons: Record<string, string> = { YouTube: '▶', Facebook: 'f', TikTok: '♪', Instagram: '◎', Twitch: '⚡' };
const platformColors: Record<string, string> = { YouTube: '#FF0000', Facebook: '#1877F2', TikTok: '#FF0050', Instagram: '#E1306C', Twitch: '#9146FF' };

export function ContentIDPage() {
  const { token } = useAuth();
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ releaseTitle: '', isrc: '', platforms: ['YouTube', 'Facebook', 'TikTok'] });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.getContentID(token).then((r: any) => setTracks(r.tracks || [])).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  const handleRegister = async () => {
    if (!form.releaseTitle.trim()) { toast.error('Release title required'); return; }
    setSubmitting(true);
    try {
      const r = await api.registerContentID(token!, form) as any;
      setTracks(prev => [r.track, ...prev]);
      setShowForm(false);
      setForm({ releaseTitle: '', isrc: '', platforms: ['YouTube', 'Facebook', 'TikTok'] });
      toast.success(`"${form.releaseTitle}" registered for Content ID monitoring`);
    } catch (err: any) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (trackId: string) => {
    try {
      await api.deleteContentID(token!, trackId);
      setTracks(prev => prev.filter(t => t.id !== trackId));
      toast.success('Track removed from monitoring');
    } catch (err: any) { toast.error(err.message); }
  };

  const totalDetections = tracks.reduce((s, t) => s + (t.detections?.length || 0), 0);
  const totalRevenue = tracks.reduce((s, t) => s + (t.revenueRecovered || 0), 0);
  const totalClaims = tracks.reduce((s, t) => s + (t.claimsCount || 0), 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white mb-1">Content ID & Protection</h1>
          <p className="text-white/40 text-sm">Monitor unauthorized use of your music across platforms</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
          <Plus size={14} /> Register Track
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Protected Tracks', value: tracks.length, color: '#7B5FFF', icon: Shield },
          { label: 'Total Detections', value: totalDetections, color: '#F59E0B', icon: Eye },
          { label: 'Claims Filed', value: totalClaims, color: '#00C4FF', icon: AlertCircle },
          { label: 'Revenue Recovered', value: `$${totalRevenue.toFixed(2)}`, color: '#10B981', icon: DollarSign },
        ].map(s => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/40">{s.label}</span>
              <s.icon size={14} style={{ color: s.color }} />
            </div>
            <div className="text-xl font-black text-white">{s.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Register form modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111] border border-white/[0.1] rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-white">Register Track for Content ID</h3>
                <button onClick={() => setShowForm(false)} className="text-white/30 hover:text-white"><X size={16} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-white/50 font-medium mb-1.5 block">Release Title *</label>
                  <input value={form.releaseTitle} onChange={e => setForm(p => ({ ...p, releaseTitle: e.target.value }))}
                    placeholder="e.g. Midnight Dreams"
                    className="w-full px-4 py-3 bg-[#0D0D0D] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#7B5FFF]/50" />
                </div>
                <div>
                  <label className="text-xs text-white/50 font-medium mb-1.5 block">ISRC Code (optional)</label>
                  <input value={form.isrc} onChange={e => setForm(p => ({ ...p, isrc: e.target.value }))}
                    placeholder="e.g. QMXXX2400001"
                    className="w-full px-4 py-3 bg-[#0D0D0D] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#7B5FFF]/50" />
                </div>
                <div>
                  <label className="text-xs text-white/50 font-medium mb-2 block">Monitor on Platforms</label>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map(p => {
                      const active = form.platforms.includes(p);
                      return (
                        <button key={p} onClick={() => setForm(prev => ({ ...prev, platforms: active ? prev.platforms.filter(x => x !== p) : [...prev.platforms, p] }))}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                          style={active ? { color: '#fff', background: platformColors[p] + '30', borderColor: platformColors[p] + '60' } : { color: '#555', background: '#0D0D0D', borderColor: 'rgba(255,255,255,0.07)' }}>
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button onClick={handleRegister} disabled={submitting || !form.releaseTitle.trim()}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
                  {submitting ? 'Registering…' : 'Register for Protection'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tracks list */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="w-8 h-8 rounded-full border-2 border-[#7B5FFF] border-t-transparent animate-spin" /></div>
      ) : tracks.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(123,95,255,0.1)' }}>
            <Shield size={28} className="text-[#7B5FFF]" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Tracks Protected Yet</h3>
          <p className="text-white/40 text-sm mb-6 max-w-sm mx-auto">Register your releases to monitor unauthorized use and automatically file claims on your behalf.</p>
          <button onClick={() => setShowForm(true)}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
            Register Your First Track
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tracks.map(track => (
            <motion.div key={track.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,rgba(123,95,255,0.2),rgba(0,196,255,0.2))' }}>
                  <Shield size={18} className="text-[#7B5FFF]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-bold text-white truncate">{track.releaseTitle}</span>
                    <span className="text-[10px] text-[#10B981] bg-[#10B981]/15 px-2 py-0.5 rounded-full font-semibold capitalize flex-shrink-0">{track.status}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-white/40">
                    {track.isrc && <span className="font-mono">{track.isrc}</span>}
                    <span>{track.detections?.length || 0} detections</span>
                    <span>${(track.revenueRecovered || 0).toFixed(2)} recovered</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setExpanded(expanded === track.id ? null : track.id)}
                    className="text-white/30 hover:text-white p-1.5 hover:bg-white/[0.05] rounded-lg transition-all">
                    {expanded === track.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  <button onClick={() => handleDelete(track.id)}
                    className="text-[#FF5252]/50 hover:text-[#FF5252] p-1.5 hover:bg-[#FF5252]/10 rounded-lg transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Platform badges */}
              <div className="px-4 pb-3 flex gap-1.5 flex-wrap">
                {(track.platforms || []).map((p: string) => (
                  <span key={p} className="text-[10px] px-2 py-1 rounded-md font-semibold"
                    style={{ color: platformColors[p] || '#fff', background: (platformColors[p] || '#555') + '20' }}>
                    {p}
                  </span>
                ))}
              </div>

              {/* Expanded detections */}
              <AnimatePresence>
                {expanded === track.id && track.detections?.length > 0 && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                    className="overflow-hidden border-t border-white/[0.05]">
                    <div className="p-4 space-y-2">
                      <div className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Detections</div>
                      {track.detections.map((d: any) => (
                        <div key={d.id} className="flex items-center gap-3 p-3 bg-[#050505] rounded-xl">
                          <span className="text-sm font-bold w-8 h-8 flex items-center justify-center rounded-lg"
                            style={{ background: (platformColors[d.platform] || '#555') + '20', color: platformColors[d.platform] || '#fff' }}>
                            {platformIcons[d.platform] || '?'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-white truncate">{d.videoTitle}</div>
                            <div className="text-[10px] text-white/40">{d.views?.toLocaleString()} views · {new Date(d.detectedAt).toLocaleDateString()}</div>
                          </div>
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${d.status === 'claimed' ? 'text-[#10B981] bg-[#10B981]/15' : 'text-[#F59E0B] bg-[#F59E0B]/15'}`}>
                            {d.status === 'claimed' ? '✓ Claimed' : 'Detected'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
