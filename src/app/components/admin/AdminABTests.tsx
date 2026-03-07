// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — Feature 10: A/B Test Manager (Admin)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../dashboard/AuthContext';
import * as api from '../dashboard/api';
import { toast } from 'sonner';
import { PlusCircle, BarChart2, Play, Pause, Trophy, X, TrendingUp, Eye, MousePointerClick, Zap } from 'lucide-react';

const ELEMENTS = ['Hero Headline', 'CTA Button Text', 'Pricing Display', 'Hero Sub-headline', 'Feature Section Title', 'Nav CTA', 'Auth Page Headline'];

export function AdminABTests() {
  const { token } = useAuth();
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', element: ELEMENTS[0], variantA: '', variantB: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.getABTests(token).then((r: any) => setTests(r.tests || [])).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  const handleCreate = async () => {
    if (!form.name || !form.variantA || !form.variantB) { toast.error('All fields required'); return; }
    setCreating(true);
    try {
      const r = await api.createABTest(token!, form) as any;
      setTests(prev => [r.test, ...prev]);
      setShowCreate(false);
      setForm({ name: '', element: ELEMENTS[0], variantA: '', variantB: '' });
      toast.success('A/B test created!');
    } catch (err: any) { toast.error(err.message); }
    finally { setCreating(false); }
  };

  const handleDeclareWinner = async (test: any, winner: 'A' | 'B') => {
    try {
      const r = await api.updateABTest(token!, test.id, { winnerId: winner, status: 'completed' }) as any;
      setTests(prev => prev.map(t => t.id === test.id ? r.test : t));
      toast.success(`Variant ${winner} declared winner!`);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleToggle = async (test: any) => {
    const newStatus = test.status === 'active' ? 'paused' : 'active';
    try {
      const r = await api.updateABTest(token!, test.id, { status: newStatus }) as any;
      setTests(prev => prev.map(t => t.id === test.id ? r.test : t));
    } catch (err: any) { toast.error(err.message); }
  };

  const winnerVariant = (test: any) => {
    if (test.statsA.cvr > test.statsB.cvr) return 'A';
    if (test.statsB.cvr > test.statsA.cvr) return 'B';
    return null;
  };

  const uplift = (test: any) => {
    const base = test.statsA.cvr;
    if (!base) return 0;
    return +(((test.statsB.cvr - base) / base) * 100).toFixed(1);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white mb-1">A/B Tests</h1>
          <p className="text-white/40 text-sm">Test landing page variants to optimize conversion rates</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
          <PlusCircle size={14} /> New Test
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Active Tests', value: tests.filter(t => t.status === 'active').length, color: '#10B981' },
          { label: 'Completed', value: tests.filter(t => t.status === 'completed').length, color: '#7B5FFF' },
          { label: 'Total Tests', value: tests.length, color: '#00C4FF' },
        ].map(s => (
          <div key={s.label} className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-4">
            <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-white/40 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-[#111] border border-white/[0.1] rounded-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-white">Create A/B Test</h3>
                <button onClick={() => setShowCreate(false)} className="text-white/30 hover:text-white"><X size={16} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-white/50 font-medium mb-1.5 block">Test Name</label>
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Hero Headline Test - March"
                    className="w-full px-4 py-3 bg-[#0D0D0D] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#7B5FFF]/50" />
                </div>
                <div>
                  <label className="text-xs text-white/50 font-medium mb-1.5 block">Element to Test</label>
                  <select value={form.element} onChange={e => setForm(p => ({ ...p, element: e.target.value }))}
                    className="w-full px-4 py-3 bg-[#0D0D0D] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:border-[#7B5FFF]/50">
                    {ELEMENTS.map(e => <option key={e} value={e} className="bg-[#111]">{e}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/50 font-medium mb-1.5 block">Variant A (Control)</label>
                    <input value={form.variantA} onChange={e => setForm(p => ({ ...p, variantA: e.target.value }))}
                      placeholder="e.g. Distribute Your Music"
                      className="w-full px-3 py-2.5 bg-[#0D0D0D] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#7B5FFF]/50" />
                  </div>
                  <div>
                    <label className="text-xs text-white/50 font-medium mb-1.5 block">Variant B (Test)</label>
                    <input value={form.variantB} onChange={e => setForm(p => ({ ...p, variantB: e.target.value }))}
                      placeholder="e.g. Launch Your Music Career"
                      className="w-full px-3 py-2.5 bg-[#0D0D0D] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#7B5FFF]/50" />
                  </div>
                </div>
                <button onClick={handleCreate} disabled={creating}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
                  {creating ? 'Creating…' : 'Start Test'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tests list */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="w-8 h-8 rounded-full border-2 border-[#7B5FFF] border-t-transparent animate-spin" /></div>
      ) : tests.length === 0 ? (
        <div className="text-center py-20">
          <BarChart2 size={40} className="text-white/20 mx-auto mb-3" />
          <p className="text-white/40">No tests yet. Create your first A/B test to start optimizing conversions.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tests.map(test => {
            const winner = winnerVariant(test);
            const up = uplift(test);
            return (
              <motion.div key={test.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-white">{test.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${test.status === 'active' ? 'text-[#10B981] bg-[#10B981]/15' : test.status === 'completed' ? 'text-[#7B5FFF] bg-[#7B5FFF]/15' : 'text-[#F59E0B] bg-[#F59E0B]/15'}`}>
                        {test.status}
                      </span>
                    </div>
                    <div className="text-xs text-white/40">Testing: {test.element}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {test.status !== 'completed' && (
                      <button onClick={() => handleToggle(test)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.05] transition-all">
                        {test.status === 'active' ? <><Pause size={11} /> Pause</> : <><Play size={11} /> Resume</>}
                      </button>
                    )}
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-4">
                  {(['A', 'B'] as const).map(v => {
                    const stats = v === 'A' ? test.statsA : test.statsB;
                    const text = v === 'A' ? test.variantA : test.variantB;
                    const isWinner = (test.winnerId || winner) === v;
                    return (
                      <div key={v} className={`p-4 rounded-xl border transition-all ${isWinner ? 'border-[#10B981]/30' : 'border-white/[0.06]'}`}
                        style={isWinner ? { background: 'rgba(16,185,129,0.05)' } : { background: '#050505' }}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-black px-2 py-0.5 rounded-md ${v === 'A' ? 'bg-[#00C4FF]/20 text-[#00C4FF]' : 'bg-[#D63DF6]/20 text-[#D63DF6]'}`}>
                              Variant {v}
                            </span>
                            {isWinner && test.status === 'completed' && <Trophy size={12} className="text-[#F59E0B]" />}
                          </div>
                          {test.status === 'active' && !test.winnerId && (
                            <button onClick={() => handleDeclareWinner(test, v)}
                              className="text-[10px] text-white/30 hover:text-[#10B981] border border-white/[0.06] hover:border-[#10B981]/40 px-2 py-0.5 rounded-lg transition-all">
                              Declare winner
                            </button>
                          )}
                        </div>
                        <div className="text-xs text-white/60 mb-3 italic">"{text}"</div>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: 'Impressions', value: stats.impressions, icon: Eye },
                            { label: 'Clicks', value: stats.clicks, icon: MousePointerClick },
                            { label: 'CVR', value: `${stats.cvr}%`, icon: Zap },
                          ].map(s => (
                            <div key={s.label} className="text-center">
                              <div className="text-sm font-black text-white">{s.value}</div>
                              <div className="text-[9px] text-white/30">{s.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {up !== 0 && (
                  <div className={`mt-3 text-xs font-semibold flex items-center gap-1 ${up > 0 ? 'text-[#10B981]' : 'text-[#FF5252]'}`}>
                    <TrendingUp size={11} />
                    Variant B has {Math.abs(up)}% {up > 0 ? 'higher' : 'lower'} conversion rate
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
