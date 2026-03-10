// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — Admin Website Control Panel
//  Live-edit hero, stats, testimonials, FAQs without redeployment
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../dashboard/AuthContext';
import * as api from '../dashboard/api';
import { toast } from 'sonner';
import {
  Globe, Save, RefreshCw, Plus, Trash2, Edit3, X,
  ChevronUp, ChevronDown, Star, MessageSquare, HelpCircle,
  BarChart2, Zap, Check, Eye, EyeOff, Layout,
} from 'lucide-react';

const TABS = [
  { id: 'hero',         label: 'Hero',         icon: Layout },
  { id: 'stats',        label: 'Stats',        icon: BarChart2 },
  { id: 'testimonials', label: 'Testimonials', icon: MessageSquare },
  { id: 'faqs',         label: 'FAQs',         icon: HelpCircle },
];

function SectionCard({ children, title, icon: Icon }: any) {
  return (
    <div className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/[0.06]">
        <Icon size={14} className="text-[#7B5FFF]" />
        <h3 className="text-sm font-bold text-white">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export function AdminWebsiteControl() {
  const { token } = useAuth();
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('hero');
  const [editingTestimonial, setEditingTestimonial] = useState<any>(null);
  const [editingFaq, setEditingFaq] = useState<any>(null);

  useEffect(() => {
    if (!token) return;
    api.adminGetWebsiteContent(token)
      .then(d => setContent(d.content))
      .catch(() => toast.error('Failed to load website content'))
      .finally(() => setLoading(false));
  }, [token]);

  const save = async (section?: string, data?: any) => {
    setSaving(true);
    try {
      const patch = section ? { [section]: data ?? (content as any)[section] } : content;
      const r = await api.adminUpdateWebsiteContent(token!, patch);
      setContent(r.content);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast.success('✅ Website updated — live immediately!');
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const updateHero = (key: string, value: string) => {
    setContent((c: any) => ({ ...c, hero: { ...c.hero, [key]: value } }));
  };

  const updateStat = (i: number, key: string, value: string) => {
    setContent((c: any) => {
      const stats = [...(c.stats || [])];
      stats[i] = { ...stats[i], [key]: value };
      return { ...c, stats };
    });
  };

  const addStat = () => {
    setContent((c: any) => ({ ...c, stats: [...(c.stats || []), { label: 'New Stat', value: '0+' }] }));
  };

  const removeStat = (i: number) => {
    setContent((c: any) => ({ ...c, stats: (c.stats || []).filter((_: any, idx: number) => idx !== i) }));
  };

  const saveTestimonial = (t: any) => {
    setContent((c: any) => {
      const existing = c.testimonials || [];
      const idx = existing.findIndex((e: any) => e.id === t.id);
      const updated = idx >= 0
        ? existing.map((e: any, i: number) => i === idx ? t : e)
        : [...existing, { ...t, id: crypto.randomUUID() }];
      return { ...c, testimonials: updated };
    });
    setEditingTestimonial(null);
  };

  const removeTestimonial = (id: string) => {
    setContent((c: any) => ({ ...c, testimonials: (c.testimonials || []).filter((t: any) => t.id !== id) }));
  };

  const saveFaq = (f: any) => {
    setContent((c: any) => {
      const existing = c.faqs || [];
      const idx = existing.findIndex((e: any) => e.id === f.id);
      const updated = idx >= 0
        ? existing.map((e: any, i: number) => i === idx ? f : e)
        : [...existing, { ...f, id: crypto.randomUUID() }];
      return { ...c, faqs: updated };
    });
    setEditingFaq(null);
  };

  const removeFaq = (id: string) => {
    setContent((c: any) => ({ ...c, faqs: (c.faqs || []).filter((f: any) => f.id !== id) }));
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-[#7B5FFF] border-t-transparent animate-spin" /></div>;
  }

  if (!content) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Website Control</h1>
          <p className="text-white/40 text-sm mt-1">Edit live website content. Changes apply immediately — no redeployment needed.</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="https://www.mixxea.com" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white/60 hover:text-white text-xs font-medium transition-all">
            <Eye size={13} /> View Site
          </a>
          <button onClick={() => save()}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ background: saved ? 'linear-gradient(135deg,#10B981,#00C4FF)' : 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
            {saving ? <RefreshCw size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save All Changes'}
          </button>
        </div>
      </div>

      {/* Live indicator */}
      <div className="flex items-center gap-2 p-3 bg-[#10B981]/08 border border-[#10B981]/20 rounded-xl">
        <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
        <p className="text-xs text-[#10B981] font-semibold">All changes are live on mixxea.com — visible to visitors immediately after saving.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[#0A0A0A] border border-white/[0.06] rounded-2xl">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === t.id ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
            style={activeTab === t.id ? { background: 'linear-gradient(135deg,#7B5FFF20,#D63DF620)', border: '1px solid #7B5FFF30' } : {}}>
            <t.icon size={13} />
            {t.label}
          </button>
        ))}
      </div>

      {/* HERO */}
      {activeTab === 'hero' && (
        <SectionCard title="Hero Section" icon={Layout}>
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Main Headline</label>
              <input value={content.hero?.headline || ''} onChange={e => updateHero('headline', e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-lg font-bold text-white focus:outline-none focus:border-[#7B5FFF]/40" />
            </div>
            <div>
              <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Subheadline</label>
              <textarea value={content.hero?.subheadline || ''} onChange={e => updateHero('subheadline', e.target.value)}
                rows={2} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/40 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">CTA Button Text</label>
                <input value={content.hero?.ctaText || ''} onChange={e => updateHero('ctaText', e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/40" />
              </div>
              <div>
                <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">CTA URL</label>
                <input value={content.hero?.ctaUrl || ''} onChange={e => updateHero('ctaUrl', e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/40" />
              </div>
            </div>
            {/* Preview */}
            <div className="p-4 bg-black border border-white/[0.08] rounded-xl">
              <p className="text-[10px] text-white/30 mb-3 uppercase tracking-wider">Live Preview</p>
              <div className="text-center">
                <h2 className="text-2xl font-black text-white mb-2" style={{ background: 'linear-gradient(90deg,#00C4FF,#7B5FFF,#D63DF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {content.hero?.headline || 'Headline'}
                </h2>
                <p className="text-sm text-white/60 mb-4">{content.hero?.subheadline}</p>
                <span className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
                  {content.hero?.ctaText || 'CTA'}
                </span>
              </div>
            </div>
            <button onClick={() => save('hero')} disabled={saving}
              className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
              {saving ? 'Saving…' : 'Save Hero Section'}
            </button>
          </div>
        </SectionCard>
      )}

      {/* STATS */}
      {activeTab === 'stats' && (
        <SectionCard title="Social Proof Stats" icon={BarChart2}>
          <div className="space-y-3">
            {(content.stats || []).map((stat: any, i: number) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <input value={stat.value} onChange={e => updateStat(i, 'value', e.target.value)}
                    placeholder="10,000+"
                    className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-[#7B5FFF]/40" />
                  <input value={stat.label} onChange={e => updateStat(i, 'label', e.target.value)}
                    placeholder="Artists"
                    className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white/70 focus:outline-none focus:border-[#7B5FFF]/40" />
                </div>
                <button onClick={() => removeStat(i)} className="text-white/30 hover:text-[#FF5252] transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <button onClick={addStat}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-white/[0.08] text-white/50 hover:text-white hover:border-white/20 transition-all">
                <Plus size={13} /> Add Stat
              </button>
              <button onClick={() => save('stats')} disabled={saving}
                className="flex-1 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
                {saving ? 'Saving…' : 'Save Stats'}
              </button>
            </div>
            {/* Preview */}
            <div className="p-4 bg-black border border-white/[0.08] rounded-xl">
              <p className="text-[10px] text-white/30 mb-3 uppercase tracking-wider">Live Preview</p>
              <div className="flex gap-4 flex-wrap">
                {(content.stats || []).map((s: any, i: number) => (
                  <div key={i} className="text-center">
                    <p className="text-xl font-black text-white">{s.value}</p>
                    <p className="text-xs text-white/40">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      {/* TESTIMONIALS */}
      {activeTab === 'testimonials' && (
        <SectionCard title="Testimonials" icon={MessageSquare}>
          <div className="space-y-4">
            <div className="space-y-3">
              {(content.testimonials || []).map((t: any) => (
                <div key={t.id} className="flex items-start gap-3 p-4 bg-[#111] border border-white/[0.06] rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-[#7B5FFF]/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-[#7B5FFF]">{t.name?.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-white">{t.name}</p>
                      <span className="text-xs text-white/40">{t.role}</span>
                    </div>
                    <p className="text-xs text-white/60 leading-relaxed">{t.text}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => setEditingTestimonial(t)} className="p-1.5 text-white/30 hover:text-white rounded-lg hover:bg-white/[0.06]">
                      <Edit3 size={12} />
                    </button>
                    <button onClick={() => removeTestimonial(t.id)} className="p-1.5 text-white/30 hover:text-[#FF5252] rounded-lg hover:bg-[#FF5252]/10">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditingTestimonial({ id: null, name: '', role: '', text: '' })}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-white/[0.08] text-white/50 hover:text-white hover:border-white/20 transition-all">
                <Plus size={13} /> Add Testimonial
              </button>
              <button onClick={() => save('testimonials')} disabled={saving}
                className="flex-1 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
                {saving ? 'Saving…' : 'Save Testimonials'}
              </button>
            </div>
          </div>
        </SectionCard>
      )}

      {/* FAQs */}
      {activeTab === 'faqs' && (
        <SectionCard title="FAQ Section" icon={HelpCircle}>
          <div className="space-y-4">
            <div className="space-y-3">
              {(content.faqs || []).map((f: any) => (
                <div key={f.id} className="p-4 bg-[#111] border border-white/[0.06] rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white mb-1">{f.q}</p>
                      <p className="text-xs text-white/50 leading-relaxed">{f.a}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => setEditingFaq(f)} className="p-1.5 text-white/30 hover:text-white rounded-lg hover:bg-white/[0.06]">
                        <Edit3 size={12} />
                      </button>
                      <button onClick={() => removeFaq(f.id)} className="p-1.5 text-white/30 hover:text-[#FF5252] rounded-lg hover:bg-[#FF5252]/10">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditingFaq({ id: null, q: '', a: '' })}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-white/[0.08] text-white/50 hover:text-white hover:border-white/20 transition-all">
                <Plus size={13} /> Add FAQ
              </button>
              <button onClick={() => save('faqs')} disabled={saving}
                className="flex-1 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
                {saving ? 'Saving…' : 'Save FAQs'}
              </button>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Testimonial Edit Modal */}
      <AnimatePresence>
        {editingTestimonial && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="bg-[#0D0D0D] border border-white/[0.08] rounded-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
                <h2 className="text-sm font-bold text-white">{editingTestimonial.id ? 'Edit Testimonial' : 'Add Testimonial'}</h2>
                <button onClick={() => setEditingTestimonial(null)} className="text-white/40 hover:text-white"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { key: 'name', label: 'Name', placeholder: 'Marcus J.' },
                  { key: 'role', label: 'Role', placeholder: 'Independent Artist' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider">{f.label}</label>
                    <input value={editingTestimonial[f.key]} onChange={e => setEditingTestimonial((t: any) => ({ ...t, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/40" />
                  </div>
                ))}
                <div>
                  <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider">Testimonial Text</label>
                  <textarea value={editingTestimonial.text} onChange={e => setEditingTestimonial((t: any) => ({ ...t, text: e.target.value }))}
                    rows={3} placeholder="What they said about MIXXEA…"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/40 resize-none" />
                </div>
              </div>
              <div className="p-5 border-t border-white/[0.06] flex gap-3">
                <button onClick={() => setEditingTestimonial(null)} className="flex-1 py-3 rounded-xl text-sm font-medium text-white/60 bg-white/[0.05]">Cancel</button>
                <button onClick={() => saveTestimonial(editingTestimonial)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>Save</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAQ Edit Modal */}
      <AnimatePresence>
        {editingFaq && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="bg-[#0D0D0D] border border-white/[0.08] rounded-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
                <h2 className="text-sm font-bold text-white">{editingFaq.id ? 'Edit FAQ' : 'Add FAQ'}</h2>
                <button onClick={() => setEditingFaq(null)} className="text-white/40 hover:text-white"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider">Question</label>
                  <input value={editingFaq.q} onChange={e => setEditingFaq((f: any) => ({ ...f, q: e.target.value }))}
                    placeholder="How does distribution work?"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/40" />
                </div>
                <div>
                  <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider">Answer</label>
                  <textarea value={editingFaq.a} onChange={e => setEditingFaq((f: any) => ({ ...f, a: e.target.value }))}
                    rows={4} placeholder="Your answer…"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/40 resize-none" />
                </div>
              </div>
              <div className="p-5 border-t border-white/[0.06] flex gap-3">
                <button onClick={() => setEditingFaq(null)} className="flex-1 py-3 rounded-xl text-sm font-medium text-white/60 bg-white/[0.05]">Cancel</button>
                <button onClick={() => saveFaq(editingFaq)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>Save</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
