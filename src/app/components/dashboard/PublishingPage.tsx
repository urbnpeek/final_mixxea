import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './AuthContext';
import * as api from './api';
import { toast } from 'sonner';
import { BookOpen, Plus, CheckCircle, Clock, AlertCircle, DollarSign, Globe, X, Edit3, Music } from 'lucide-react';
import { planHasAccess, UpgradeWall } from './PlanGate';

const TERRITORIES = ['Worldwide', 'United States', 'United Kingdom', 'Canada', 'Nigeria', 'Ghana', 'South Africa', 'Germany', 'France', 'Australia', 'Brazil', 'Japan', 'South Korea'];
const GENRES = ['Afrobeats', 'Afro-Pop', 'Hip-Hop', 'R&B / Soul', 'Pop', 'Electronic', 'House', 'Gospel', 'Jazz', 'Classical', 'Rock', 'Latin', 'Amapiano', 'Other'];

const statusConfig: Record<string, any> = {
  pending: { label: 'Pending', color: '#F59E0B', bg: '#F59E0B15', icon: Clock },
  registered: { label: 'Registered', color: '#7B5FFF', bg: '#7B5FFF15', icon: CheckCircle },
  active: { label: 'Active', color: '#10B981', bg: '#10B98115', icon: CheckCircle },
  disputed: { label: 'Disputed', color: '#EF4444', bg: '#EF444415', icon: AlertCircle },
};

export function PublishingPage() {
  const { token, user } = useAuth();
  const [works, setWorks] = useState<any[]>([]);
  const [releases, setReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const defaultForm = {
    title: '', writers: [{ name: user?.name || '', role: 'songwriter', percentage: 100 }],
    publishers: [{ name: 'MIXXEA Publishing', percentage: 0 }],
    releaseId: '', iswc: '', genre: '', territories: ['Worldwide'],
  };
  const [form, setForm] = useState<any>(defaultForm);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.getWorks(token).then(d => setWorks(d.works || [])).catch(() => {}),
      api.getReleases(token).then(d => setReleases(d.releases || [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Work title required'); return; }
    setSaving(true);
    try {
      if (editingId) {
        const { work } = await api.updateWork(token!, editingId, form);
        setWorks(prev => prev.map(w => w.id === editingId ? work : w));
        toast.success('Work updated!');
      } else {
        const { work } = await api.createWork(token!, form);
        setWorks(prev => [work, ...prev]);
        toast.success('Work registered for publishing!');
      }
      setShowModal(false);
      setForm(defaultForm);
      setEditingId(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (w: any) => {
    setForm({ ...defaultForm, ...w });
    setEditingId(w.id);
    setShowModal(true);
  };

  const addWriter = () => setForm((f: any) => ({ ...f, writers: [...f.writers, { name: '', role: 'songwriter', percentage: 0 }] }));
  const updateWriter = (i: number, field: string, val: any) => setForm((f: any) => ({ ...f, writers: f.writers.map((w: any, idx: number) => idx === i ? { ...w, [field]: val } : w) }));
  const removeWriter = (i: number) => setForm((f: any) => ({ ...f, writers: f.writers.filter((_: any, idx: number) => idx !== i) }));

  const totalRoyalties = works.reduce((s, w) => s + (w.royaltiesEarned || 0), 0);

  if (!planHasAccess(user?.plan || 'starter', 'growth')) {
    return (
      <UpgradeWall
        requiredPlan="growth"
        featureName="Publishing Administration"
        featureDesc="Register your works, manage ISWC codes, track publishing royalties and collect what you're owed — available on Growth and above."
      />
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Publishing Administration</h1>
          <p className="text-white/40 text-sm mt-1">Register and manage your publishing rights & royalties</p>
        </div>
        <button onClick={() => { setForm(defaultForm); setEditingId(null); setShowModal(true); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white text-sm hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #00C4FF, #7B5FFF)' }}>
          <Plus size={16} /> Register Work
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{works.length}</div>
          <div className="text-xs text-white/40 mt-1">Registered Works</div>
        </div>
        <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-4">
          <div className="text-2xl font-bold text-[#10B981]">{works.filter(w => w.status === 'active' || w.status === 'registered').length}</div>
          <div className="text-xs text-white/40 mt-1">Active Rights</div>
        </div>
        <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-4">
          <div className="text-2xl font-bold text-white">${totalRoyalties.toFixed(2)}</div>
          <div className="text-xs text-white/40 mt-1">Total Royalties</div>
        </div>
        <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-4">
          <div className="text-2xl font-bold text-[#F59E0B]">{works.filter(w => w.status === 'pending').length}</div>
          <div className="text-xs text-white/40 mt-1">Pending Review</div>
        </div>
      </div>

      {/* Publishing Info Banner */}
      <div className="mb-6 p-5 bg-gradient-to-r from-[#00C4FF]/5 to-[#7B5FFF]/5 border border-[#00C4FF]/15 rounded-2xl">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#00C4FF]/15 flex items-center justify-center flex-shrink-0">
            <Globe size={18} className="text-[#00C4FF]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">MIXXEA Publishing Administration</h3>
            <p className="text-xs text-white/50 leading-relaxed">We register and collect publishing royalties from performance, mechanical, synchronization, and digital rights. Works are registered with PROs including ASCAP, BMI, SESAC, and international collection societies worldwide.</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {['ASCAP', 'BMI', 'SESAC', 'PRS', 'SOCAN', 'APRA', 'BUMA/STEMRA', 'PPL'].map(p => (
                <span key={p} className="text-[10px] px-2 py-0.5 bg-white/[0.06] border border-white/[0.08] rounded text-white/50 font-medium">{p}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Works List */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-white/[0.03] rounded-2xl animate-pulse" />)}</div>
      ) : works.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-[#00C4FF]/10 flex items-center justify-center mx-auto mb-4">
            <BookOpen size={28} className="text-[#00C4FF]" />
          </div>
          <h3 className="text-white font-semibold mb-2">No works registered</h3>
          <p className="text-white/40 text-sm mb-6">Register your compositions to start collecting publishing royalties worldwide</p>
          <button onClick={() => setShowModal(true)} className="px-6 py-3 rounded-xl font-semibold text-white text-sm"
            style={{ background: 'linear-gradient(135deg, #00C4FF, #7B5FFF)' }}>
            Register Your First Work
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {works.map(w => {
            const sc = statusConfig[w.status] || statusConfig.pending;
            const StatusIcon = sc.icon;
            return (
              <motion.div key={w.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-[#111111] border border-white/[0.06] rounded-2xl p-5 hover:border-white/10 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00C4FF]/20 to-[#7B5FFF]/20 flex items-center justify-center flex-shrink-0">
                    <Music size={18} className="text-[#00C4FF]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <h3 className="font-semibold text-white">{w.title}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-lg font-medium" style={{ background: sc.bg, color: sc.color }}>
                        <StatusIcon size={10} className="inline mr-1" />{sc.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/40">
                      <span>Writers: {w.writers?.map((wr: any) => `${wr.name} (${wr.percentage}%)`).join(', ')}</span>
                      {w.iswc && <span>ISWC: {w.iswc}</span>}
                      <span>{w.territories?.join(', ')}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1.5 text-sm">
                        <DollarSign size={12} className="text-[#10B981]" />
                        <span className="text-[#10B981] font-semibold">${(w.royaltiesEarned || 0).toFixed(2)}</span>
                        <span className="text-white/30">earned</span>
                      </div>
                      <span className="text-xs text-white/30">{new Date(w.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button onClick={() => openEdit(w)} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.05] transition-all flex-shrink-0">
                    <Edit3 size={15} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
              className="bg-[#111111] border border-white/[0.08] rounded-2xl w-full max-w-2xl my-6"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
                <h2 className="text-lg font-bold text-white">{editingId ? 'Edit Work' : 'Register New Work'}</h2>
                <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white"><X size={20} /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Work Title *</label>
                    <input value={form.title} onChange={e => setForm((f: any) => ({ ...f, title: e.target.value }))} required
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#00C4FF]/50"
                      placeholder="Song or composition title" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Genre</label>
                    <select value={form.genre} onChange={e => setForm((f: any) => ({ ...f, genre: e.target.value }))}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00C4FF]/50">
                      <option value="" className="bg-[#111111]">Select genre</option>
                      {GENRES.map(g => <option key={g} value={g} className="bg-[#111111]">{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Link to Release</label>
                    <select value={form.releaseId} onChange={e => setForm((f: any) => ({ ...f, releaseId: e.target.value }))}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00C4FF]/50">
                      <option value="" className="bg-[#111111]">— Optional —</option>
                      {releases.map(r => <option key={r.id} value={r.id} className="bg-[#111111]">{r.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">ISWC (if known)</label>
                    <input value={form.iswc} onChange={e => setForm((f: any) => ({ ...f, iswc: e.target.value }))}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#00C4FF]/50"
                      placeholder="T-123.456.789-C" />
                  </div>
                </div>

                {/* Writers */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Writers & Split</label>
                    <button type="button" onClick={addWriter} className="text-xs text-[#00C4FF] hover:text-[#7B5FFF] flex items-center gap-1">
                      <Plus size={12} /> Add Writer
                    </button>
                  </div>
                  <div className="space-y-2">
                    {form.writers.map((w: any, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <input value={w.name} onChange={e => updateWriter(i, 'name', e.target.value)} placeholder="Writer name"
                          className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#00C4FF]/50" />
                        <select value={w.role} onChange={e => updateWriter(i, 'role', e.target.value)}
                          className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00C4FF]/50 w-32">
                          {['songwriter', 'composer', 'producer', 'co-writer', 'publisher'].map(r => <option key={r} value={r} className="bg-[#111111] capitalize">{r}</option>)}
                        </select>
                        <input type="number" value={w.percentage} onChange={e => updateWriter(i, 'percentage', parseFloat(e.target.value))} min={0} max={100} placeholder="%"
                          className="w-16 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#00C4FF]/50" />
                        <span className="text-white/40 text-sm">%</span>
                        {form.writers.length > 1 && <button type="button" onClick={() => removeWriter(i)} className="text-white/30 hover:text-[#FF5252]"><X size={14} /></button>}
                      </div>
                    ))}
                    <div className="text-xs text-white/30 mt-1">
                      Total: <span className={`font-semibold ${form.writers.reduce((s: number, w: any) => s + (w.percentage || 0), 0) === 100 ? 'text-[#10B981]' : 'text-[#FF5252]'}`}>
                        {form.writers.reduce((s: number, w: any) => s + (w.percentage || 0), 0)}%
                      </span> (must equal 100%)
                    </div>
                  </div>
                </div>

                {/* Territories */}
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wider">Registration Territories</label>
                  <div className="flex flex-wrap gap-2">
                    {TERRITORIES.map(t => (
                      <button key={t} type="button"
                        onClick={() => setForm((f: any) => ({ ...f, territories: f.territories.includes(t) ? f.territories.filter((x: string) => x !== t) : [...f.territories, t] }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${form.territories.includes(t) ? 'border-[#00C4FF]/50 bg-[#00C4FF]/10 text-[#00C4FF]' : 'border-white/[0.08] text-white/40 hover:border-white/20'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl text-sm font-medium text-white/60 bg-white/[0.05] hover:bg-white/[0.08] transition-all">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #00C4FF, #7B5FFF)' }}>
                    {saving ? 'Saving...' : editingId ? 'Update Work' : 'Register Work'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}