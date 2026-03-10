// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — Admin Marketing Center
//  Tabs: Email Campaigns · Announcements · Promo Codes · Push Notifications
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../dashboard/AuthContext';
import * as api from '../dashboard/api';
import { toast } from 'sonner';
import {
  Mail, Megaphone, Tag, Bell, Send, Plus, Trash2, Edit3, X,
  RefreshCw, Check, Copy, Users, Zap, Calendar, Globe,
  CheckCircle, AlertCircle, Info, Star,
} from 'lucide-react';

const TABS = [
  { id: 'email',         label: 'Email Campaigns', icon: Mail },
  { id: 'announcements', label: 'Announcements',   icon: Megaphone },
  { id: 'promo',         label: 'Promo Codes',      icon: Tag },
  { id: 'push',          label: 'Push Notify',      icon: Bell },
];

const SEGMENTS = [
  { id: 'all',      label: 'All Users',        icon: '👥' },
  { id: 'artists',  label: 'Artists Only',     icon: '🎤' },
  { id: 'labels',   label: 'Labels Only',      icon: '🏷️' },
  { id: 'curators', label: 'Curators Only',    icon: '🎧' },
  { id: 'growth',   label: 'Growth Plan',      icon: '📈' },
  { id: 'pro',      label: 'Pro Plan',         icon: '⭐' },
  { id: 'starter',  label: 'Starter Plan',     icon: '🆓' },
];

const EMAIL_TEMPLATES = [
  { label: 'New Feature Announcement', subject: '🚀 New on MIXXEA — {Feature Name}', content: '<p>We just launched <strong>{Feature Name}</strong> to help you grow your music career faster.</p><p>Here\'s what you can do with it:</p><ul><li>{Feature benefit 1}</li><li>{Feature benefit 2}</li></ul><p><a href="https://www.mixxea.com/dashboard">Check it out →</a></p>' },
  { label: 'Campaign Promotion', subject: '🎯 Double Reach This Weekend Only', content: '<p>This weekend, we\'re running a special promotion on our TikTok UGC and Playlist Pitching campaigns.</p><p><strong>Get 20% more reach for the same credit cost.</strong></p><p><a href="https://www.mixxea.com/dashboard/promotions">Start a Campaign →</a></p>' },
  { label: 'Upgrade Nudge', subject: '⚡ You\'re missing out on {Feature} — Upgrade Now', content: '<p>Hi, you\'re on the Starter plan. Here\'s what you\'re missing:</p><ul><li>Playlist pitching to 1,000+ curators</li><li>TikTok & Instagram UGC campaigns</li><li>Dedicated account manager</li></ul><p><a href="https://www.mixxea.com/dashboard/credits">Upgrade Your Plan →</a></p>' },
  { label: 'Monthly Newsletter', subject: '📊 Your MIXXEA Update — {Month}', content: '<p>Here\'s what happened this month at MIXXEA:</p><ul><li>{Update 1}</li><li>{Update 2}</li><li>{Update 3}</li></ul><p>Keep creating. We\'re here to help you grow.</p>' },
];

const ANN_TYPES = [
  { id: 'info',    label: 'Info',    color: '#00C4FF', icon: Info },
  { id: 'success', label: 'Success', color: '#10B981', icon: CheckCircle },
  { id: 'warning', label: 'Warning', color: '#F59E0B', icon: AlertCircle },
  { id: 'promo',   label: 'Promo',   color: '#D63DF6', icon: Star },
];

const PROMO_TYPES = [
  { id: 'credits',      label: 'Free Credits',    desc: 'Add X credits to user account' },
  { id: 'discount_pct', label: 'Discount %',       desc: 'X% off credit purchase or plan' },
  { id: 'free_plan',    label: 'Plan Upgrade',     desc: 'Unlock plan tier for free period' },
];

function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }); };
  return { copied, copy };
}

// ── Email Campaign Tab ────────────────────────────────────────────────────────
function EmailTab({ token }: { token: string }) {
  const [segment, setSegment] = useState('all');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const applyTemplate = (t: any) => { setSubject(t.subject); setContent(t.content); };

  const handleSend = async () => {
    if (!subject.trim() || !content.trim()) { toast.error('Subject and content are required'); return; }
    if (!confirm(`Send to segment "${SEGMENTS.find(s => s.id === segment)?.label}"? This cannot be undone.`)) return;
    setSending(true);
    try {
      const r = await api.adminSendMarketingEmail(token, { segment, subject, content });
      setLastResult(r);
      toast.success(`✅ Email sent to ${r.sent} / ${r.total} users!`);
    } catch (err: any) { toast.error(err.message); }
    finally { setSending(false); }
  };

  return (
    <div className="space-y-6">
      {/* Templates */}
      <div>
        <p className="text-[11px] text-white/40 uppercase tracking-wider font-semibold mb-3">Quick Templates</p>
        <div className="grid grid-cols-2 gap-2">
          {EMAIL_TEMPLATES.map(t => (
            <button key={t.label} onClick={() => applyTemplate(t)}
              className="p-3 bg-[#0D0D0D] border border-white/[0.07] hover:border-[#7B5FFF]/40 rounded-xl text-left transition-all">
              <p className="text-xs font-semibold text-white/80">{t.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Segment Selector */}
      <div>
        <p className="text-[11px] text-white/40 uppercase tracking-wider font-semibold mb-3">Send To</p>
        <div className="flex flex-wrap gap-2">
          {SEGMENTS.map(s => (
            <button key={s.id} onClick={() => setSegment(s.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${segment === s.id ? 'text-white border-[#7B5FFF]/40' : 'text-white/50 border-white/[0.07] hover:text-white/80 hover:border-white/20'}`}
              style={segment === s.id ? { background: '#7B5FFF20' } : {}}>
              <span>{s.icon}</span>{s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Compose */}
      <div className="space-y-3">
        <div>
          <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Subject Line *</label>
          <input value={subject} onChange={e => setSubject(e.target.value)}
            placeholder="Your email subject…"
            className="w-full bg-[#0D0D0D] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/40" />
        </div>
        <div>
          <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Email Content (HTML allowed)</label>
          <textarea value={content} onChange={e => setContent(e.target.value)}
            rows={8} placeholder="Write your email content here. HTML tags like <p>, <strong>, <ul>, <a> are supported."
            className="w-full bg-[#0D0D0D] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/40 resize-none font-mono" />
        </div>
      </div>

      {lastResult && (
        <div className="flex items-center gap-3 p-3 bg-[#10B981]/10 border border-[#10B981]/20 rounded-xl">
          <CheckCircle size={14} className="text-[#10B981]" />
          <p className="text-sm text-white/70">Last send: <span className="font-bold text-[#10B981]">{lastResult.sent} emails delivered</span> out of {lastResult.total} users</p>
        </div>
      )}

      <button onClick={handleSend} disabled={sending || !subject.trim() || !content.trim()}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold text-white disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}>
        <Send size={15} />{sending ? `Sending to ${SEGMENTS.find(s => s.id === segment)?.label}…` : `Send Campaign to ${SEGMENTS.find(s => s.id === segment)?.label}`}
      </button>
    </div>
  );
}

// ── Announcements Tab ─────────────────────────────────────────────────────────
function AnnouncementsTab({ token }: { token: string }) {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ text: '', emoji: '📣', cta: '', ctaUrl: '', type: 'info', active: true, expiresAt: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.adminGetAnnouncements(token).then(d => setAnnouncements(d.announcements || [])).finally(() => setLoading(false));
  }, [token]);

  const handleCreate = async () => {
    if (!form.text.trim()) { toast.error('Announcement text required'); return; }
    setSaving(true);
    try {
      const r = await api.adminCreateAnnouncement(token, form);
      setAnnouncements(prev => [r.announcement, ...prev]);
      setShowForm(false);
      setForm({ text: '', emoji: '📣', cta: '', ctaUrl: '', type: 'info', active: true, expiresAt: '' });
      toast.success('✅ Announcement created — now live on dashboard!');
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleToggle = async (ann: any) => {
    try {
      const r = await api.adminUpdateAnnouncement(token, ann.id, { active: !ann.active });
      setAnnouncements(prev => prev.map(a => a.id === ann.id ? r.announcement : a));
      toast.success(r.announcement.active ? 'Announcement activated' : 'Announcement deactivated');
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.adminDeleteAnnouncement(token, id);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      toast.success('Announcement deleted');
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/40">{announcements.filter(a => a.active).length} active</p>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
          <Plus size={14} /> New Announcement
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="bg-[#0D0D0D] border border-[#7B5FFF]/25 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">Create Announcement</h3>
            <div className="grid grid-cols-4 gap-2">
              {ANN_TYPES.map(t => (
                <button key={t.id} onClick={() => setForm(p => ({ ...p, type: t.id }))}
                  className={`py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${form.type === t.id ? 'text-white border-transparent' : 'border-white/[0.08] text-white/40'}`}
                  style={form.type === t.id ? { background: `${t.color}20`, borderColor: `${t.color}40`, color: t.color } : {}}>
                  <t.icon size={11} />{t.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={form.emoji} onChange={e => setForm(p => ({ ...p, emoji: e.target.value }))}
                className="w-16 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white text-center focus:outline-none" />
              <input value={form.text} onChange={e => setForm(p => ({ ...p, text: e.target.value }))}
                placeholder="Announcement text — e.g. TikTok UGC campaigns are now live! 🔥"
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/40" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input value={form.cta} onChange={e => setForm(p => ({ ...p, cta: e.target.value }))}
                placeholder="CTA text (e.g. Learn More)"
                className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/40" />
              <input value={form.ctaUrl} onChange={e => setForm(p => ({ ...p, ctaUrl: e.target.value }))}
                placeholder="CTA URL (e.g. /dashboard/promotions)"
                className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/40" />
            </div>
            <div className="flex items-center gap-3">
              <input type="datetime-local" value={form.expiresAt} onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))}
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white/70 focus:outline-none" />
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={e => setForm(p => ({ ...p, active: e.target.checked }))} className="sr-only" />
                <div className={`w-10 h-5 rounded-full transition-colors ${form.active ? 'bg-[#10B981]' : 'bg-white/10'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white m-0.5 transition-transform ${form.active ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
                <span className="text-xs text-white/60">Active</span>
              </label>
            </div>
            {/* Preview */}
            {form.text && (
              <div className="p-3 rounded-xl border" style={{ background: `${ANN_TYPES.find(t => t.id === form.type)?.color}10`, borderColor: `${ANN_TYPES.find(t => t.id === form.type)?.color}25` }}>
                <p className="text-sm font-semibold text-white">{form.emoji} {form.text}</p>
                {form.cta && <span className="text-xs text-[#7B5FFF] mt-1">{form.cta} →</span>}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl text-sm text-white/60 bg-white/[0.05]">Cancel</button>
              <button onClick={handleCreate} disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
                {saving ? 'Creating…' : 'Create Announcement'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {loading ? <div className="h-20 bg-white/[0.03] rounded-xl animate-pulse" /> :
          announcements.length === 0 ? (
            <div className="text-center py-10 text-white/30 text-sm">No announcements yet</div>
          ) : announcements.map(ann => {
            const tc = ANN_TYPES.find(t => t.id === ann.type) || ANN_TYPES[0];
            return (
              <div key={ann.id} className="flex items-start gap-3 p-4 bg-[#0D0D0D] border border-white/[0.07] rounded-2xl">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${tc.color}15` }}>
                  <tc.icon size={14} style={{ color: tc.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{ann.emoji} {ann.text}</p>
                  {ann.cta && <p className="text-xs text-[#7B5FFF] mt-0.5">{ann.cta} → {ann.ctaUrl}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${ann.active ? 'text-[#10B981] bg-[#10B981]/15' : 'text-white/30 bg-white/[0.05]'}`}>
                      {ann.active ? '● Live' : '○ Inactive'}
                    </span>
                    {ann.expiresAt && <span className="text-[10px] text-white/30">Expires {new Date(ann.expiresAt).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => handleToggle(ann)} className={`p-1.5 rounded-lg transition-all ${ann.active ? 'text-[#10B981] hover:bg-[#10B981]/10' : 'text-white/30 hover:text-white/60'}`}>
                    <Globe size={13} />
                  </button>
                  <button onClick={() => handleDelete(ann.id)} className="p-1.5 text-white/30 hover:text-[#FF5252] rounded-lg hover:bg-[#FF5252]/10">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ── Promo Codes Tab ───────────────────────────────────────────────────────────
function PromoTab({ token }: { token: string }) {
  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', type: 'credits', value: 100, maxUses: 100, description: '', expiresAt: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.adminGetPromoCodes(token).then(d => setPromos(d.promos || [])).finally(() => setLoading(false));
  }, [token]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const r = await api.adminCreatePromoCode(token, form);
      setPromos(prev => [r.promo, ...prev]);
      setShowForm(false);
      setForm({ code: '', type: 'credits', value: 100, maxUses: 100, description: '', expiresAt: '' });
      toast.success(`✅ Promo code "${r.promo.code}" created!`);
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (code: string) => {
    try {
      await api.adminDeletePromoCode(token, code);
      setPromos(prev => prev.filter(p => p.code !== code));
      toast.success('Promo code deleted');
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/40">{promos.filter(p => p.active).length} active codes</p>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg,#00C4FF,#7B5FFF)' }}>
          <Plus size={14} /> Generate Code
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="bg-[#0D0D0D] border border-[#00C4FF]/25 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">Generate Promo Code</h3>
            <div className="grid grid-cols-3 gap-2">
              {PROMO_TYPES.map(t => (
                <button key={t.id} onClick={() => setForm(p => ({ ...p, type: t.id }))}
                  className={`p-3 rounded-xl text-left border transition-all ${form.type === t.id ? 'border-[#7B5FFF]/40 bg-[#7B5FFF]/10' : 'border-white/[0.07] bg-[#111] hover:border-white/20'}`}>
                  <p className="text-xs font-bold text-white mb-0.5">{t.label}</p>
                  <p className="text-[10px] text-white/40">{t.desc}</p>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider">Code (leave blank = auto)</label>
                <input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="MIXXEA2026"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white font-mono placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/40" />
              </div>
              <div>
                <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider">{form.type === 'credits' ? 'Credits Amount' : 'Discount %'}</label>
                <input type="number" value={form.value} onChange={e => setForm(p => ({ ...p, value: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/40" />
              </div>
              <div>
                <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider">Max Uses</label>
                <input type="number" value={form.maxUses} onChange={e => setForm(p => ({ ...p, maxUses: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/40" />
              </div>
              <div>
                <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider">Expires At</label>
                <input type="datetime-local" value={form.expiresAt} onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white/70 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider">Description</label>
              <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="e.g. Welcome bonus for email subscribers"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/40" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl text-sm text-white/60 bg-white/[0.05]">Cancel</button>
              <button onClick={handleCreate} disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#00C4FF,#7B5FFF)' }}>
                {saving ? 'Creating…' : 'Generate Code'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {loading ? <div className="h-20 bg-white/[0.03] rounded-xl animate-pulse" /> :
          promos.length === 0 ? (
            <div className="text-center py-10 text-white/30 text-sm">No promo codes yet</div>
          ) : promos.map(p => {
            const { copied, copy } = useCopy(p.code);
            const usePct = Math.round((p.uses / p.maxUses) * 100);
            return (
              <div key={p.code} className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <code className="text-lg font-black text-white tracking-widest">{p.code}</code>
                      <button onClick={copy} className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white transition-colors">
                        {copied ? <Check size={10} className="text-[#10B981]" /> : <Copy size={10} />}
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${p.active ? 'text-[#10B981] bg-[#10B981]/15' : 'text-white/30 bg-white/[0.05]'}`}>
                        {p.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/40 flex-wrap">
                      <span className="text-[#7B5FFF] font-medium">
                        {p.type === 'credits' ? `+${p.value} credits` : p.type === 'discount_pct' ? `${p.value}% off` : 'Plan upgrade'}
                      </span>
                      <span className="text-white/20">·</span>
                      <span>{p.uses} / {p.maxUses} uses</span>
                      {p.expiresAt && <><span className="text-white/20">·</span><span>Expires {new Date(p.expiresAt).toLocaleDateString()}</span></>}
                    </div>
                    <div className="mt-2 h-1.5 bg-white/[0.06] rounded-full overflow-hidden w-full max-w-xs">
                      <div className="h-full rounded-full bg-[#7B5FFF]" style={{ width: `${Math.min(usePct, 100)}%` }} />
                    </div>
                  </div>
                  <button onClick={() => handleDelete(p.code)} className="p-1.5 text-white/30 hover:text-[#FF5252] rounded-lg hover:bg-[#FF5252]/10 flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ── Push Notification Tab ──────────────────────────────────────────────────────
function PushTab({ token }: { token: string }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const [segment, setSegment] = useState<'all' | 'specific'>('all');
  const [userId, setUserId] = useState('');
  const [sending, setSending] = useState(false);

  const QUICK_NOTIFICATIONS = [
    { title: '🎉 New Campaign Launched!', message: 'Your campaign is now live. Check your dashboard for updates.', link: '/dashboard/promotions' },
    { title: '⚡ Credit Bonus Added', message: "We've added bonus credits to your account. Start a campaign today!", link: '/dashboard/credits' },
    { title: '📊 Campaign Results Ready', message: 'Your campaign report is ready. See how your music performed.', link: '/dashboard/promotions' },
    { title: '🎵 Release Approved!', message: 'Your release has been approved and is now distributing to all platforms.', link: '/dashboard/distribution' },
  ];

  const handleSend = async () => {
    if (!title || !message) { toast.error('Title and message required'); return; }
    setSending(true);
    try {
      await api.adminPushNotify(token, { userId: segment === 'specific' ? userId : undefined, title, message, link: link || undefined, type: 'admin' });
      toast.success(segment === 'all' ? '🔔 Notification sent to all users!' : `🔔 Notification sent to user!`);
      setTitle(''); setMessage(''); setLink(''); setUserId('');
    } catch (err: any) { toast.error(err.message); }
    finally { setSending(false); }
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] text-white/40 uppercase tracking-wider font-semibold mb-3">Quick Templates</p>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_NOTIFICATIONS.map(n => (
            <button key={n.title} onClick={() => { setTitle(n.title); setMessage(n.message); setLink(n.link); }}
              className="p-3 bg-[#0D0D0D] border border-white/[0.07] hover:border-[#7B5FFF]/40 rounded-xl text-left transition-all">
              <p className="text-xs font-semibold text-white/80 truncate">{n.title}</p>
              <p className="text-[10px] text-white/40 mt-0.5 truncate">{n.message}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        {[{ id: 'all', label: '📢 Send to All' }, { id: 'specific', label: '👤 Specific User' }].map(s => (
          <button key={s.id} onClick={() => setSegment(s.id as any)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${segment === s.id ? 'text-white border-[#7B5FFF]/40 bg-[#7B5FFF]/10' : 'text-white/40 border-white/[0.08]'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {segment === 'specific' && (
        <input value={userId} onChange={e => setUserId(e.target.value)} placeholder="User ID (from Users panel)"
          className="w-full bg-[#0D0D0D] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/40" />
      )}

      <div className="space-y-3">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Notification title…"
          className="w-full bg-[#0D0D0D] border border-white/[0.08] rounded-xl px-4 py-3 text-sm font-semibold text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/40" />
        <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} placeholder="Notification message…"
          className="w-full bg-[#0D0D0D] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/40 resize-none" />
        <input value={link} onChange={e => setLink(e.target.value)} placeholder="Link URL (e.g. /dashboard/promotions)"
          className="w-full bg-[#0D0D0D] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/40" />
      </div>

      <button onClick={handleSend} disabled={sending || !title || !message}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold text-white disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #D63DF6, #FF5252)' }}>
        <Bell size={15} />{sending ? 'Sending…' : segment === 'all' ? 'Send to All Users' : 'Send to User'}
      </button>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function AdminMarketingCenter() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('email');

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Marketing Center</h1>
        <p className="text-white/40 text-sm mt-1">Email campaigns, site announcements, promo codes, and push notifications.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[#0A0A0A] border border-white/[0.06] rounded-2xl overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${activeTab === t.id ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
            style={activeTab === t.id ? { background: 'linear-gradient(135deg,#7B5FFF20,#D63DF620)', border: '1px solid #7B5FFF30' } : {}}>
            <t.icon size={13} />{t.label}
          </button>
        ))}
      </div>

      <div className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-6">
        {token && (
          <>
            {activeTab === 'email'         && <EmailTab token={token} />}
            {activeTab === 'announcements' && <AnnouncementsTab token={token} />}
            {activeTab === 'promo'         && <PromoTab token={token} />}
            {activeTab === 'push'          && <PushTab token={token} />}
          </>
        )}
      </div>
    </div>
  );
}
