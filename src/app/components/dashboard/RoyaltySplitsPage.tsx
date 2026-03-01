import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './AuthContext';
import * as api from './api';
import { toast } from 'sonner';
import { Scissors, Plus, Users, DollarSign, Edit3, X, AlertCircle, CheckCircle } from 'lucide-react';
import { planHasAccess, UpgradeWall } from './PlanGate';

const ROLES = ['Artist', 'Producer', 'Co-Writer', 'Songwriter', 'Mixer', 'Mastering Engineer', 'Feature Artist', 'Label', 'Manager', 'Publisher'];

export function RoyaltySplitsPage() {
  const { token, user } = useAuth();
  const [splits, setSplits] = useState<any[]>([]);
  const [releases, setReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const defaultCollaborator = { name: '', email: '', role: 'Artist', percentage: 0 };
  const [form, setForm] = useState({
    releaseId: '',
    releaseTitle: '',
    collaborators: [{ ...defaultCollaborator, name: user?.name || '', role: 'Artist', percentage: 100 }],
  });

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.getSplits(token).then(d => setSplits(d.splits || [])).catch(() => {}),
      api.getReleases(token).then(d => setReleases(d.releases || [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [token]);

  const totalPct = form.collaborators.reduce((s, c) => s + (parseFloat(String(c.percentage)) || 0), 0);
  const isValid = Math.abs(totalPct - 100) < 0.01;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) { toast.error('Percentages must add up to 100%'); return; }
    setSaving(true);
    try {
      const selectedRelease = releases.find(r => r.id === form.releaseId);
      const payload = { ...form, releaseTitle: selectedRelease?.title || form.releaseTitle };
      if (editingId) {
        const { split } = await api.updateSplit(token!, editingId, payload);
        setSplits(prev => prev.map(s => s.id === editingId ? split : s));
        toast.success('Split updated!');
      } else {
        const { split } = await api.createSplit(token!, payload);
        setSplits(prev => [split, ...prev]);
        toast.success('Royalty split created!');
      }
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm({ releaseId: '', releaseTitle: '', collaborators: [{ ...defaultCollaborator, name: user?.name || '', role: 'Artist', percentage: 100 }] });
    setEditingId(null);
  };

  const openEdit = (s: any) => {
    setForm({ releaseId: s.releaseId || '', releaseTitle: s.releaseTitle || '', collaborators: s.collaborators || [] });
    setEditingId(s.id);
    setShowModal(true);
  };

  const addCollaborator = () => setForm(f => ({ ...f, collaborators: [...f.collaborators, { ...defaultCollaborator }] }));
  const updateCollaborator = (i: number, field: string, val: any) => setForm(f => ({
    ...f, collaborators: f.collaborators.map((c, idx) => idx === i ? { ...c, [field]: val } : c)
  }));
  const removeCollaborator = (i: number) => setForm(f => ({ ...f, collaborators: f.collaborators.filter((_, idx) => idx !== i) }));

  const splitEvenly = () => {
    const pct = parseFloat((100 / form.collaborators.length).toFixed(2));
    setForm(f => ({ ...f, collaborators: f.collaborators.map((c, i) => ({ ...c, percentage: i === f.collaborators.length - 1 ? 100 - pct * (f.collaborators.length - 1) : pct })) }));
  };

  if (!planHasAccess(user?.plan || 'starter', 'growth')) {
    return (
      <UpgradeWall
        requiredPlan="growth"
        featureName="Royalty Splits"
        featureDesc="Assign and automate royalty splits between collaborators, producers, and songwriters — available on Growth and above."
      />
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Royalty Splits</h1>
          <p className="text-white/40 text-sm mt-1">Manage revenue splits with collaborators, producers & publishers</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white text-sm hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #10B981, #00C4FF)' }}>
          <Plus size={16} /> New Split
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{splits.length}</div>
          <div className="text-xs text-white/40 mt-1">Total Splits</div>
        </div>
        <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{splits.reduce((s, sp) => s + (sp.collaborators?.length || 0), 0)}</div>
          <div className="text-xs text-white/40 mt-1">Collaborators</div>
        </div>
        <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-4">
          <div className="text-2xl font-bold text-[#10B981]">{splits.filter(s => s.status === 'active').length}</div>
          <div className="text-xs text-white/40 mt-1">Active Splits</div>
        </div>
      </div>

      {/* How it works */}
      <div className="mb-6 p-5 bg-gradient-to-r from-[#10B981]/5 to-[#00C4FF]/5 border border-[#10B981]/15 rounded-2xl">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><DollarSign size={14} className="text-[#10B981]" /> How Royalty Splits Work</h3>
        <div className="grid sm:grid-cols-3 gap-4 text-xs text-white/50">
          <div><span className="text-[#10B981] font-medium">1. Create Split</span> — Define collaborators and their exact percentage of royalties.</div>
          <div><span className="text-[#10B981] font-medium">2. We Collect</span> — MIXXEA collects all royalties from global DSPs and publishers.</div>
          <div><span className="text-[#10B981] font-medium">3. Auto-Pay</span> — Each collaborator receives their share directly to their account.</div>
        </div>
      </div>

      {/* Splits List */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-32 bg-white/[0.03] rounded-2xl animate-pulse" />)}</div>
      ) : splits.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-[#10B981]/10 flex items-center justify-center mx-auto mb-4">
            <Scissors size={28} className="text-[#10B981]" />
          </div>
          <h3 className="text-white font-semibold mb-2">No splits created</h3>
          <p className="text-white/40 text-sm mb-6">Create royalty splits to automatically share revenue with collaborators</p>
          <button onClick={() => setShowModal(true)} className="px-6 py-3 rounded-xl font-semibold text-white text-sm"
            style={{ background: 'linear-gradient(135deg, #10B981, #00C4FF)' }}>
            Create Your First Split
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {splits.map(split => (
            <motion.div key={split.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-[#111111] border border-white/[0.06] rounded-2xl p-5 hover:border-white/10 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-white">{split.releaseTitle || 'Untitled Release'}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${split.status === 'active' ? 'bg-[#10B981]/15 text-[#10B981]' : 'bg-white/[0.06] text-white/40'}`}>
                      {split.status}
                    </span>
                  </div>
                  <p className="text-xs text-white/40 mt-0.5">{split.collaborators?.length || 0} collaborators · Created {new Date(split.createdAt).toLocaleDateString()}</p>
                </div>
                <button onClick={() => openEdit(split)} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.05] transition-all">
                  <Edit3 size={15} />
                </button>
              </div>

              {/* Split visualization */}
              <div className="mb-3">
                <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                  {(split.collaborators || []).map((c: any, i: number) => {
                    const colors = ['#7B5FFF', '#00C4FF', '#D63DF6', '#FF5252', '#10B981', '#F59E0B'];
                    return (
                      <div key={i} className="h-full transition-all" style={{ width: `${c.percentage}%`, background: colors[i % colors.length] }} title={`${c.name}: ${c.percentage}%`} />
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {(split.collaborators || []).map((c: any, i: number) => {
                  const colors = ['#7B5FFF', '#00C4FF', '#D63DF6', '#FF5252', '#10B981', '#F59E0B'];
                  return (
                    <div key={i} className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-3 py-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: colors[i % colors.length] }} />
                      <span className="text-xs text-white/70">{c.name}</span>
                      <span className="text-xs text-white/40">{c.role}</span>
                      <span className="text-xs font-bold" style={{ color: colors[i % colors.length] }}>{c.percentage}%</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
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
                <h2 className="text-lg font-bold text-white">{editingId ? 'Edit Split' : 'New Royalty Split'}</h2>
                <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white"><X size={20} /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Link to Release</label>
                  <select value={form.releaseId} onChange={e => setForm(f => ({ ...f, releaseId: e.target.value }))}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#10B981]/50">
                    <option value="" className="bg-[#111111]">— Select release (optional) —</option>
                    {releases.map(r => <option key={r.id} value={r.id} className="bg-[#111111]">{r.title}</option>)}
                  </select>
                </div>

                {/* Collaborators */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Collaborators & Splits</label>
                    <div className="flex gap-3">
                      <button type="button" onClick={splitEvenly} className="text-xs text-[#10B981] hover:text-[#00C4FF]">Split Evenly</button>
                      <button type="button" onClick={addCollaborator} className="text-xs text-[#7B5FFF] hover:text-[#D63DF6] flex items-center gap-1">
                        <Plus size={12} /> Add
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {form.collaborators.map((c, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: ['#7B5FFF','#00C4FF','#D63DF6','#FF5252','#10B981','#F59E0B'][i % 6] }} />
                        <input value={c.name} onChange={e => updateCollaborator(i, 'name', e.target.value)} placeholder="Full name"
                          className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#10B981]/50" />
                        <input value={c.email} onChange={e => updateCollaborator(i, 'email', e.target.value)} placeholder="Email (opt)"
                          className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#10B981]/50" />
                        <select value={c.role} onChange={e => updateCollaborator(i, 'role', e.target.value)}
                          className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-2 text-xs text-white focus:outline-none w-32">
                          {ROLES.map(r => <option key={r} value={r} className="bg-[#111111]">{r}</option>)}
                        </select>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <input type="number" value={c.percentage} onChange={e => updateCollaborator(i, 'percentage', parseFloat(e.target.value) || 0)} min={0} max={100} step={0.1}
                            className="w-16 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-2 text-sm text-white text-center focus:outline-none focus:border-[#10B981]/50" />
                          <span className="text-white/40 text-sm">%</span>
                        </div>
                        {form.collaborators.length > 1 && (
                          <button type="button" onClick={() => removeCollaborator(i)} className="text-white/30 hover:text-[#FF5252] flex-shrink-0"><X size={14} /></button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Total indicator */}
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(totalPct, 100)}%`, background: isValid ? '#10B981' : totalPct > 100 ? '#FF5252' : '#F59E0B' }} />
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs font-semibold flex-shrink-0 ${isValid ? 'text-[#10B981]' : 'text-[#FF5252]'}`}>
                      {isValid ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
                      {totalPct.toFixed(1)}% / 100%
                    </div>
                  </div>
                </div>

                {/* Split Preview */}
                {form.collaborators.length > 0 && (
                  <div>
                    <div className="flex h-4 rounded-lg overflow-hidden gap-0.5">
                      {form.collaborators.map((c, i) => {
                        const colors = ['#7B5FFF', '#00C4FF', '#D63DF6', '#FF5252', '#10B981', '#F59E0B'];
                        return c.percentage > 0 ? (
                          <div key={i} className="h-full transition-all" style={{ width: `${Math.min(c.percentage, 100)}%`, background: colors[i % colors.length] }} />
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl text-sm font-medium text-white/60 bg-white/[0.05] hover:bg-white/[0.08] transition-all">Cancel</button>
                  <button type="submit" disabled={saving || !isValid} className="flex-1 py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #10B981, #00C4FF)' }}>
                    {saving ? 'Saving...' : editingId ? 'Update Split' : 'Create Split'}
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