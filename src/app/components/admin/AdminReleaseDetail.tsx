import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../dashboard/AuthContext';
import * as api from '../dashboard/api';
import { toast } from 'sonner';
import {
  ArrowLeft, CircleCheck, Clock, CircleX, Globe, FileText, CircleAlert,
  Music, Disc, Radio, Headphones, Copy, RefreshCw, User, Send, Save,
  Search, List, Loader, Calendar, CirclePause, OctagonAlert, Archive,
  Pencil, ChevronDown, ChevronUp, Link, Plus, Tag, Trash2, X,
} from 'lucide-react';
import {
  STATUS_MAP, STORES, STORE_MAP, computeCompleteness, getStatusCfg,
  AMPSUITE_CHECKLIST,
} from '../dashboard/releaseConstants';

// ── Copy-to-clipboard helper ───────────────────────────────────────────────────
function CopyBtn({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const doCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={doCopy}
      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all flex-shrink-0 ${copied ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-white/[0.05] text-white/40 hover:text-white hover:bg-white/[0.08]'}`}>
      <Copy size={10} />{copied ? 'Copied!' : (label || 'Copy')}
    </button>
  );
}

function MetaRow({ label, value, copyable }: { label: string; value: any; copyable?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-white/[0.04]">
      <span className="text-xs text-white/40 flex-shrink-0 w-36">{label}</span>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-xs text-white flex-1 min-w-0 break-words">{value}</span>
        {copyable && <CopyBtn value={String(value)} />}
      </div>
    </div>
  );
}

// ── Admin action modal ─────────────────────────────────────────────────────────
function ActionModal({ action, onConfirm, onClose }: { action: { label: string; toStatus: string; needsNote: boolean; warning?: string }; onConfirm: (note: string) => Promise<void>; onClose: () => void }) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const sc = getStatusCfg(action.toStatus);

  const handle = async () => {
    if (action.needsNote && !note.trim()) { toast.error('A message to the artist is required'); return; }
    setSaving(true);
    try { await onConfirm(note); onClose(); }
    catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/85 z-[60] flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }}
        className="bg-[#111] border border-white/[0.08] rounded-2xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">{action.label}</h3>
            <span className="text-xs px-2 py-0.5 rounded-lg mt-1 inline-block" style={{ background: sc.bg, color: sc.color }}>→ {sc.label}</span>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={16} /></button>
        </div>
        {action.warning && <p className="text-xs text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-xl p-3">{action.warning}</p>}
        <div>
          <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">
            {action.needsNote ? 'Message to Artist *' : 'Message to Artist (optional)'}
          </label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={4}
            placeholder={action.needsNote ? 'Explain what the artist needs to do or know...' : 'Optional note for the artist...'}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50 resize-none" />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-white/60 bg-white/[0.05] hover:bg-white/[0.08] transition-all">Cancel</button>
          <button onClick={handle} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:opacity-90"
            style={{ background: action.toStatus === 'rejected' || action.toStatus === 'on_hold' ? 'linear-gradient(135deg,#FF5252,#D63DF6)' : action.toStatus === 'live' || action.toStatus === 'approved' ? 'linear-gradient(135deg,#10B981,#00C4FF)' : 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
            {saving ? 'Saving...' : 'Confirm'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function AdminReleaseDetail() {
  const { releaseId } = useParams<{ releaseId: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [release, setRelease] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeAction, setActiveAction] = useState<any | null>(null);
  const [savingAmp, setSavingAmp] = useState(false);
  const [ampForm, setAmpForm] = useState<any>({});
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [dspLinks, setDspLinks] = useState<{ platform: string; url: string }[]>([]);
  const [noteText, setNoteText] = useState('');
  const [noteTag, setNoteTag] = useState('general');
  const [savingNote, setSavingNote] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string>('metadata');

  const load = async () => {
    try {
      const d = await api.adminGetRelease(token!, releaseId!);
      const r = d.release;
      setRelease(r);
      setAmpForm(r.ampsuite || {});
      setChecklist(r.ampsuite?.checklist || {});
      setDspLinks(r.ampsuite?.dspLinks || []);
    } catch (err: any) { toast.error(`Failed to load release: ${err.message}`); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (token && releaseId) load(); }, [token, releaseId]);

  // ── Admin action handler ─────────────────────────────────────────────────────
  const doAction = async (toStatus: string, note: string) => {
    const { release: updated } = await api.adminUpdateRelease(token!, releaseId!, {
      status: toStatus,
      adminNotes: note || undefined,
    });
    setRelease(updated);
    toast.success(`✅ Status → ${getStatusCfg(toStatus).label}. Artist notified.`);
  };

  // ── Save AMPsuite bridge data ─────────────────────────────────────────────────
  const saveAmpData = async () => {
    setSavingAmp(true);
    try {
      const ampData = { ...ampForm, checklist, dspLinks };
      const { release: updated } = await api.adminUpdateRelease(token!, releaseId!, { ampsuite: ampData });
      setRelease(updated);
      toast.success('AMPsuite data saved!');
    } catch (err: any) { toast.error(err.message); }
    finally { setSavingAmp(false); }
  };

  // ── Add internal note ────────────────────────────────────────────────────────
  const addNote = async () => {
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      const { release: updated } = await api.adminAddReleaseNote(token!, releaseId!, { text: noteText, tag: noteTag });
      setRelease(updated);
      setNoteText('');
      toast.success('Note added');
    } catch (err: any) { toast.error(err.message); }
    finally { setSavingNote(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader size={24} className="animate-spin text-[#7B5FFF]" />
    </div>
  );
  if (!release) return <div className="p-6 text-white/40">Release not found.</div>;

  const sc = getStatusCfg(release.status);
  const { score, missing } = computeCompleteness(release);
  const scoreColor = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#FF5252';

  // ── Action buttons definition ────────────────────────────────────────────────
  const ADMIN_ACTIONS = [
    // Review stage
    { label: 'Mark Under Review',   toStatus: 'under_review',          needsNote: false, group: 'review',   color: '#7B5FFF' },
    { label: 'Request Changes',     toStatus: 'needs_changes',          needsNote: true,  group: 'review',   color: '#00C4FF' },
    { label: 'Approve Metadata',    toStatus: 'approved',               needsNote: false, group: 'review',   color: '#10B981' },
    // Distribution stage
    { label: 'Queue for Distribution', toStatus: 'queued_for_submission',needsNote: false, group: 'distrib',  color: '#7B5FFF' },
    { label: 'Mark Submitted to AMPSUITE', toStatus: 'submitted_to_ampsuite', needsNote: false, group: 'distrib', color: '#D63DF6' },
    { label: 'Mark Delivery in Progress', toStatus: 'delivery_in_progress',   needsNote: false, group: 'distrib', color: '#D63DF6' },
    { label: 'Mark Delivered to DSPs', toStatus: 'delivered_to_dsp',    needsNote: false, group: 'distrib',  color: '#00C4FF' },
    { label: 'Mark Scheduled',      toStatus: 'scheduled',              needsNote: false, group: 'distrib',  color: '#10B981' },
    { label: 'Mark Live ✓',         toStatus: 'live',                   needsNote: false, group: 'distrib',  color: '#10B981' },
    // Critical
    { label: 'Reject',              toStatus: 'rejected',               needsNote: true,  group: 'critical', color: '#FF5252', warning: '⚠️ This will notify the artist that their release was rejected.' },
    { label: 'Put On Hold',         toStatus: 'on_hold',                needsNote: true,  group: 'critical', color: '#F59E0B' },
    { label: 'Request Takedown',    toStatus: 'takedown_requested',     needsNote: true,  group: 'critical', color: '#FF5252', warning: '⚠️ This will initiate a takedown process across all DSPs.' },
  ];

  const formatTime = (iso: string) => {
    if (!iso) return '';
    return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
    <div className="bg-[#0D0D0D] border border-white/[0.06] rounded-2xl overflow-hidden">
      <button className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-all"
        onClick={() => setExpandedSection(expandedSection === id ? '' : id)}>
        <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">{title}</span>
        {expandedSection === id ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/30" />}
      </button>
      <AnimatePresence>
        {expandedSection === id && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="border-t border-white/[0.05] overflow-hidden">
            <div className="p-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Top bar */}
      <div className="flex items-start gap-4 mb-6">
        <button onClick={() => navigate('/admin/releases')}
          className="flex items-center gap-2 px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white/60 hover:text-white transition-all flex-shrink-0">
          <ArrowLeft size={14} /> Releases
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-black text-white truncate">{release.title}</h1>
            {release.versionTitle && <span className="text-white/40 text-sm">({release.versionTitle})</span>}
            <span className="text-xs px-2.5 py-1 rounded-xl font-semibold flex-shrink-0" style={{ background: sc.bg, color: sc.color }}>
              <sc.icon size={10} className="inline mr-1" />{sc.label}
            </span>
          </div>
          <p className="text-sm text-white/40 mt-0.5">
            {release.userName} &lt;{release.userEmail}&gt; · <span className="capitalize">{release.type}</span> · {release.artist}
          </p>
        </div>
        <button onClick={load} className="p-2 rounded-xl bg-white/[0.05] text-white/40 hover:text-white transition-all flex-shrink-0">
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* LEFT: Main content */}
        <div className="lg:col-span-2 space-y-4">

          {/* Admin Notes Panel */}
          {release.adminNotes && (
            <div className={`p-4 rounded-2xl border text-sm ${release.status === 'rejected' ? 'bg-[#FF5252]/10 border-[#FF5252]/20 text-[#FF5252]' : 'bg-[#00C4FF]/10 border-[#00C4FF]/20 text-[#00C4FF]'}`}>
              <p className="font-semibold text-xs uppercase tracking-wider mb-1">Last Admin Note to Artist</p>
              <p>{release.adminNotes}</p>
            </div>
          )}

          {/* Metadata */}
          <Section id="metadata" title="Release Metadata">
            <div className="space-y-0">
              <MetaRow label="Release Title" value={release.title} copyable />
              <MetaRow label="Version" value={release.versionTitle} copyable />
              <MetaRow label="Release Type" value={release.type} />
              <MetaRow label="Primary Artist" value={release.artist} copyable />
              <MetaRow label="Featured Artists" value={release.featuredArtists} copyable />
              <MetaRow label="Label" value={release.label} copyable />
              <MetaRow label="Genre" value={release.genre} />
              <MetaRow label="Sub-Genre" value={release.subgenre} />
              <MetaRow label="Language" value={release.language} />
              <MetaRow label="Release Date" value={release.releaseDate} />
              <MetaRow label="Pre-Order Date" value={release.preOrderDate} />
              <MetaRow label="Original Release" value={release.originalReleaseDate} />
              <MetaRow label="Territory" value={release.territory} />
              <MetaRow label="Copyright ©" value={release.copyrightLine} copyable />
              <MetaRow label="Phonographic ℗" value={release.phonographicLine} copyable />
              <MetaRow label="Catalog No." value={release.catalogNumber} copyable />
              <MetaRow label="UPC" value={release.upc} copyable />
              <MetaRow label="Explicit" value={release.explicit ? 'Yes' : 'No'} />
              <MetaRow label="Release ID" value={release.id?.slice(0, 12).toUpperCase()} copyable />
              <MetaRow label="Submitted" value={formatTime(release.updatedAt || release.createdAt)} />
            </div>
            {/* Copy metadata block */}
            <div className="mt-3">
              <CopyBtn
                value={[
                  `Title: ${release.title}${release.versionTitle ? ` (${release.versionTitle})` : ''}`,
                  `Artist: ${release.artist}`,
                  release.featuredArtists ? `Featuring: ${release.featuredArtists}` : '',
                  `Label: ${release.label}`,
                  `Type: ${release.type}`,
                  `Genre: ${release.genre}`,
                  `Language: ${release.language}`,
                  `Release Date: ${release.releaseDate}`,
                  `Copyright: ${release.copyrightLine}`,
                  `Phonographic: ${release.phonographicLine}`,
                  `Catalog: ${release.catalogNumber}`,
                  `UPC: ${release.upc || 'TBD'}`,
                  `Explicit: ${release.explicit ? 'Yes' : 'No'}`,
                ].filter(Boolean).join('\n')}
                label="Copy Full Metadata Block"
              />
            </div>
          </Section>

          {/* Tracks */}
          <Section id="tracks" title={`Tracks (${(release.tracks || []).length})`}>
            {(release.tracks || []).length === 0
              ? <p className="text-xs text-white/30 italic">No tracks listed</p>
              : (release.tracks || []).map((t: any, i: number) => (
                <div key={i} className="mb-4 p-3 bg-white/[0.03] border border-white/[0.05] rounded-xl">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-xs font-bold text-white">{i + 1}. {t.title || '(Untitled)'}</span>
                      {t.explicit && <span className="ml-2 text-[9px] text-[#FF5252] border border-[#FF5252]/40 rounded px-1">E</span>}
                    </div>
                    <div className="flex gap-1.5">
                      {t.isrc && <CopyBtn value={t.isrc} label={`ISRC: ${t.isrc}`} />}
                      {t.fileName && <span className="flex items-center gap-1 text-[10px] text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded-lg"><Headphones size={9} />{t.fileName}</span>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-white/40">
                    {t.duration && <span>Duration: {t.duration}</span>}
                    {t.previewStart && <span>Preview: {t.previewStart}</span>}
                    {t.composer && <span>Composer: {t.composer}</span>}
                    {t.producer && <span>Producer: {t.producer}</span>}
                    {t.lyricist && <span>Lyricist: {t.lyricist}</span>}
                    {t.remixer && <span>Remixer: {t.remixer}</span>}
                    {t.publisher && <span>Publisher: {t.publisher}</span>}
                  </div>
                  {t.lyrics && (
                    <div className="mt-2">
                      <p className="text-[9px] text-white/30 uppercase font-semibold mb-1">Lyrics excerpt</p>
                      <p className="text-[10px] text-white/40 whitespace-pre-wrap line-clamp-3">{t.lyrics}</p>
                    </div>
                  )}
                </div>
              ))}
          </Section>

          {/* Platforms */}
          <Section id="platforms" title={`Platforms (${(release.stores || []).length})`}>
            <div className="flex flex-wrap gap-1.5">
              {(release.stores || []).map((id: string) => {
                const s = STORES.find(s => s.id === id);
                return s ? (
                  <span key={id} className="text-[10px] px-2 py-1 rounded-lg font-medium"
                    style={{ background: `${s.color}20`, color: s.color }}>{s.name}</span>
                ) : null;
              })}
            </div>
          </Section>

          {/* Status History */}
          <Section id="history" title="Status History">
            {(!release.statusHistory || release.statusHistory.length === 0)
              ? <p className="text-xs text-white/30 italic">No status changes recorded yet</p>
              : (
                <div className="relative pl-4">
                  <div className="absolute left-1.5 top-0 bottom-0 w-px bg-white/[0.08]" />
                  {[...release.statusHistory].reverse().map((h: any, i: number) => {
                    const toSc = getStatusCfg(h.to);
                    return (
                      <div key={h.id || i} className="relative mb-4 last:mb-0">
                        <div className="absolute -left-[13px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-[#0D0D0D]" style={{ background: toSc.color }} />
                        <div className="pl-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold" style={{ color: toSc.color }}>{toSc.label}</span>
                            <span className="text-[10px] text-white/30">{formatTime(h.changedAt)}</span>
                          </div>
                          {h.note && <p className="text-[11px] text-white/50 mt-0.5 italic">"{h.note}"</p>}
                        </div>
                      </div>
                    );
                  })}
                  {/* Initial status */}
                  <div className="relative">
                    <div className="absolute -left-[13px] top-1.5 w-2.5 h-2.5 rounded-full bg-white/20 border-2 border-[#0D0D0D]" />
                    <div className="pl-2">
                      <span className="text-xs text-white/40">Release created</span>
                      <span className="text-[10px] text-white/30 ml-2">{formatTime(release.createdAt)}</span>
                    </div>
                  </div>
                </div>
              )}
          </Section>
        </div>

        {/* RIGHT: Sidebar */}
        <div className="space-y-4">

          {/* Completeness Score */}
          <div className="bg-[#0D0D0D] border border-white/[0.06] rounded-2xl p-4">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Release Completeness</p>
            <div className="flex items-center gap-3 mb-3">
              <div className="text-3xl font-black" style={{ color: scoreColor }}>{score}%</div>
              <div className="flex-1">
                <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: scoreColor }} />
                </div>
              </div>
            </div>
            {missing.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] text-white/30 uppercase font-semibold">Missing</p>
                {missing.map(m => <p key={m} className="text-[11px] text-[#F59E0B]">• {m}</p>)}
              </div>
            )}
          </div>

          {/* Admin Actions */}
          <div className="bg-[#0D0D0D] border border-white/[0.06] rounded-2xl p-4">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Admin Actions</p>

            {(['review', 'distrib', 'critical'] as const).map(group => (
              <div key={group} className="mb-4 last:mb-0">
                <p className="text-[9px] text-white/25 uppercase tracking-widest font-semibold mb-2">
                  {group === 'review' ? '— Review' : group === 'distrib' ? '— Distribution' : '— Critical'}
                </p>
                <div className="space-y-1.5">
                  {ADMIN_ACTIONS.filter(a => a.group === group).map(action => {
                    const isCurrent = release.status === action.toStatus;
                    return (
                      <button key={action.toStatus}
                        onClick={() => setActiveAction(action)}
                        disabled={isCurrent}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all border ${isCurrent ? 'border-transparent opacity-50 cursor-default' : 'border-white/[0.06] hover:border-white/20 hover:bg-white/[0.03]'}`}
                        style={isCurrent ? { background: `${action.color}20`, color: action.color } : { color: action.color }}>
                        {isCurrent ? '✓ ' : ''}{action.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* AMPsuite Bridge */}
          <div className="bg-[#0D0D0D] border border-[#D63DF6]/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Send size={14} className="text-[#D63DF6]" />
              <p className="text-xs font-semibold text-white uppercase tracking-wider">AMPsuite Bridge Mode</p>
            </div>

            <div className="space-y-3 mb-4">
              {[
                { key: 'referenceId',   label: 'AMPSUITE Reference ID', placeholder: 'e.g. AMP-2025-00123' },
                { key: 'submittedBy',   label: 'Submitted By (operator)', placeholder: 'Your name' },
                { key: 'submittedAt',   label: 'Submitted At', placeholder: '', type: 'datetime-local' },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">{label}</label>
                    {ampForm[key] && <CopyBtn value={ampForm[key]} />}
                  </div>
                  <input type={type || 'text'} value={ampForm[key] || ''} onChange={e => setAmpForm((f: any) => ({ ...f, [key]: e.target.value }))}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder-white/25 focus:outline-none focus:border-[#D63DF6]/50 font-mono"
                    placeholder={placeholder} />
                </div>
              ))}
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider font-semibold block mb-1">AMPSUITE Notes</label>
                <textarea value={ampForm.notes || ''} onChange={e => setAmpForm((f: any) => ({ ...f, notes: e.target.value }))}
                  rows={3} placeholder="Delivery notes, issues, special instructions..."
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder-white/25 focus:outline-none focus:border-[#D63DF6]/50 resize-none" />
              </div>
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider font-semibold block mb-1">Delivery Result</label>
                <select value={ampForm.deliveryResult || ''} onChange={e => setAmpForm((f: any) => ({ ...f, deliveryResult: e.target.value }))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D63DF6]/50">
                  <option value="" className="bg-[#111]">-- Select result</option>
                  <option value="pending" className="bg-[#111]">Pending</option>
                  <option value="successful" className="bg-[#111]">✓ Successful</option>
                  <option value="partial" className="bg-[#111]">⚠ Partial</option>
                  <option value="failed" className="bg-[#111]">✗ Failed</option>
                </select>
              </div>
            </div>

            {/* Submission Checklist */}
            <div className="mb-4">
              <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold mb-2">Submission Checklist</p>
              <div className="space-y-1.5">
                {AMPSUITE_CHECKLIST.map(item => (
                  <label key={item.id} className="flex items-center gap-2 cursor-pointer">
                    <div className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-all ${checklist[item.id] ? 'bg-[#10B981] border-[#10B981]' : 'border-white/20'}`}
                      onClick={() => setChecklist(c => ({ ...c, [item.id]: !c[item.id] }))}>
                      {checklist[item.id] && <CircleCheck size={10} className="text-white" />}
                    </div>
                    <span className={`text-[11px] transition-all ${checklist[item.id] ? 'text-white/40 line-through' : 'text-white/60'}`}>{item.label}</span>
                  </label>
                ))}
              </div>
              <div className="mt-2 text-[10px] text-white/30">
                {Object.values(checklist).filter(Boolean).length}/{AMPSUITE_CHECKLIST.length} completed
              </div>
            </div>

            {/* DSP Live Links */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">DSP Live Links</p>
                <button onClick={() => setDspLinks(l => [...l, { platform: '', url: '' }])}
                  className="text-[10px] text-[#7B5FFF] flex items-center gap-1 hover:text-white transition-colors">
                  <Plus size={10} /> Add
                </button>
              </div>
              {dspLinks.map((link, i) => (
                <div key={i} className="flex items-center gap-1.5 mb-1.5">
                  <input value={link.platform} onChange={e => setDspLinks(l => l.map((x, idx) => idx === i ? { ...x, platform: e.target.value } : x))}
                    className="w-24 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-[10px] text-white placeholder-white/25 focus:outline-none focus:border-[#7B5FFF]/50"
                    placeholder="Spotify" />
                  <input value={link.url} onChange={e => setDspLinks(l => l.map((x, idx) => idx === i ? { ...x, url: e.target.value } : x))}
                    className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-[10px] text-white placeholder-white/25 focus:outline-none focus:border-[#7B5FFF]/50 font-mono"
                    placeholder="https://open.spotify.com/..." />
                  {link.url && <CopyBtn value={link.url} />}
                  <button onClick={() => setDspLinks(l => l.filter((_, idx) => idx !== i))} className="text-white/20 hover:text-[#FF5252] transition-colors">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>

            <button onClick={saveAmpData} disabled={savingAmp}
              className="w-full py-2.5 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #D63DF6, #7B5FFF)' }}>
              {savingAmp ? <><Loader size={12} className="inline animate-spin mr-1" />Saving...</> : <><Save size={12} className="inline mr-1" />Save AMPsuite Data</>}
            </button>
          </div>

          {/* Internal Notes */}
          <div className="bg-[#0D0D0D] border border-white/[0.06] rounded-2xl p-4">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Internal Notes <span className="font-normal text-white/20">(admin only)</span></p>

            {/* Existing notes */}
            {(release.internalNotes || []).length > 0 && (
              <div className="space-y-2 mb-3">
                {[...release.internalNotes].reverse().map((n: any) => {
                  const tagColor = n.tag === 'urgent' ? '#FF5252' : n.tag === 'billing' ? '#F59E0B' : n.tag === 'legal' ? '#D63DF6' : '#6B7280';
                  return (
                    <div key={n.id} className="p-2.5 bg-white/[0.03] border border-white/[0.04] rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase" style={{ background: `${tagColor}20`, color: tagColor }}>{n.tag}</span>
                        <span className="text-[9px] text-white/25">{formatTime(n.createdAt)}</span>
                      </div>
                      <p className="text-xs text-white/60">{n.text}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add note */}
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={2}
              placeholder="Add an internal note..."
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder-white/25 focus:outline-none focus:border-[#7B5FFF]/50 resize-none mb-2" />
            <div className="flex items-center gap-2">
              <select value={noteTag} onChange={e => setNoteTag(e.target.value)}
                className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none">
                {['general', 'urgent', 'billing', 'legal', 'technical'].map(t => (
                  <option key={t} value={t} className="bg-[#111]">{t}</option>
                ))}
              </select>
              <button onClick={addNote} disabled={savingNote || !noteText.trim()}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#7B5FFF]/20 hover:bg-[#7B5FFF]/40 border border-[#7B5FFF]/30 transition-all disabled:opacity-40">
                {savingNote ? 'Adding...' : 'Add Note'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Modal */}
      <AnimatePresence>
        {activeAction && (
          <ActionModal
            action={activeAction}
            onConfirm={(note) => doAction(activeAction.toStatus, note)}
            onClose={() => setActiveAction(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}