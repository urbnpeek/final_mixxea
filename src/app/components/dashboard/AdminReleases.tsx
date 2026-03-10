import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../dashboard/AuthContext';
import * as api from '../dashboard/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import {
  Music, Search, RefreshCw, User, Headphones, X, Save, AlertCircle,
  ChevronDown, ChevronUp, ExternalLink, Disc, Radio, Clock,
} from 'lucide-react';
import { STATUS_MAP, STORES, computeCompleteness, getStatusCfg } from '../dashboard/releaseConstants';

// ── Priority ordering for the inbox ───────────────────────────────────────────
const STATUS_PRIORITY: Record<string, number> = {
  submitted: 0,
  needs_changes: 1,
  needs_info: 1,
  under_review: 2,
  approved: 3,
  queued_for_submission: 4,
  submitted_to_ampsuite: 5,
  delivery_in_progress: 6,
  delivered_to_dsp: 7,
  scheduled: 8,
  live: 9,
  distributed: 9,
  rejected: 10,
  on_hold: 11,
  takedown_requested: 12,
  takedown_completed: 13,
  draft: 14,
  in_progress: 14,
};

// ── Quick-review modal (inline status change) ─────────────────────────────────
function QuickReviewModal({ release, onSave, onClose }: { release: any; onSave: (d: any) => Promise<void>; onClose: () => void }) {
  const [status, setStatus] = useState(release.status);
  const [adminNotes, setAdminNotes] = useState(release.adminNotes || '');
  const [saving, setSaving] = useState(false);

  const QUICK_STATUSES = [
    { id: 'under_review',          label: 'Mark Under Review',    color: '#7B5FFF' },
    { id: 'needs_changes',         label: 'Request Changes',      color: '#00C4FF' },
    { id: 'approved',              label: 'Approve',              color: '#10B981' },
    { id: 'queued_for_submission', label: 'Queue for Distrib.',   color: '#7B5FFF' },
    { id: 'submitted_to_ampsuite', label: 'Submitted to AMPSUITE',color: '#D63DF6' },
    { id: 'live',                  label: 'Mark Live ✓',          color: '#10B981' },
    { id: 'rejected',              label: 'Reject',               color: '#FF5252' },
    { id: 'on_hold',               label: 'On Hold',              color: '#F59E0B' },
  ];

  const handle = async () => {
    setSaving(true);
    try { await onSave({ status, adminNotes }); onClose(); }
    catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#0D0D0D] border border-white/[0.08] rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <div>
            <h2 className="text-sm font-bold text-white">Quick Review</h2>
            <p className="text-xs text-white/40 mt-0.5">{release.userName} · {release.title}</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/50 mb-3 uppercase tracking-wider">Set Status</label>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_STATUSES.map(s => (
                <button key={s.id} onClick={() => setStatus(s.id)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all border text-left ${status === s.id ? 'text-white border-transparent' : 'border-white/[0.08] text-white/40 hover:border-white/20'}`}
                  style={status === s.id ? { background: `${s.color}25`, color: s.color, borderColor: `${s.color}50` } : {}}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">
              {status === 'rejected' || status === 'needs_changes' ? 'Message to Artist *' : 'Note to Artist (optional)'}
            </label>
            <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={3}
              placeholder={status === 'rejected' ? 'Explain the reason for rejection...' : status === 'needs_changes' ? 'What corrections are needed?' : 'Optional note for the artist...'}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50 resize-none" />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium text-white/60 bg-white/[0.05] hover:bg-white/[0.08] transition-all">Cancel</button>
            <button onClick={handle} disabled={saving}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: status === 'rejected' ? 'linear-gradient(135deg,#FF5252,#D63DF6)' : status === 'live' || status === 'approved' ? 'linear-gradient(135deg,#10B981,#00C4FF)' : 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
              <Save size={14} />{saving ? 'Saving...' : 'Save & Notify Artist'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Release row ────────────────────────────────────────────────────────────────
function ReleaseRow({ release, onReview, onDetail }: { release: any; onReview: () => void; onDetail: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const sc = getStatusCfg(release.status);
  const { score } = computeCompleteness(release);
  const scoreColor = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#FF5252';
  const isPending = release.status === 'submitted';
  const needsAction = release.status === 'needs_changes' || release.status === 'needs_info';
  const uploadedTracks = (release.tracks || []).filter((t: any) => t.fileName);

  const formatTime = (iso: string) => {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const d = Math.floor(diff / 86400000), h = Math.floor(diff / 3600000), m = Math.floor(diff / 60000);
    if (d > 0) return `${d}d ago`; if (h > 0) return `${h}h ago`; if (m > 0) return `${m}m ago`; return 'Just now';
  };

  return (
    <motion.div layout className={`bg-[#0D0D0D] border rounded-2xl overflow-hidden transition-all ${isPending ? 'border-[#F59E0B]/30 shadow-[0_0_20px_#F59E0B06]' : needsAction ? 'border-[#00C4FF]/20' : 'border-white/[0.06]'}`}>
      {isPending && (
        <div className="flex items-center gap-2 px-5 py-1.5 bg-[#F59E0B]/10 border-b border-[#F59E0B]/20">
          <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
          <span className="text-[10px] font-semibold text-[#F59E0B] uppercase tracking-wider">Awaiting Your Review</span>
          <span className="ml-auto text-[10px] text-[#F59E0B]/60">{formatTime(release.updatedAt || release.createdAt)}</span>
        </div>
      )}
      {needsAction && (
        <div className="flex items-center gap-2 px-5 py-1.5 bg-[#00C4FF]/10 border-b border-[#00C4FF]/20">
          <AlertCircle size={10} className="text-[#00C4FF]" />
          <span className="text-[10px] font-semibold text-[#00C4FF] uppercase tracking-wider">Waiting for Artist Response</span>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Cover / type icon */}
          <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-[#7B5FFF]/20 to-[#D63DF6]/20 flex items-center justify-center">
            {release.coverArt
              ? <img src={release.coverArt} alt="" className="w-full h-full object-cover" />
              : release.type === 'album' ? <Disc size={20} className="text-[#7B5FFF]" /> : release.type === 'ep' ? <Radio size={20} className="text-[#D63DF6]" /> : <Music size={20} className="text-[#7B5FFF]" />}
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-bold text-white text-sm">{release.title}</h3>
              {release.versionTitle && <span className="text-[11px] text-white/30">({release.versionTitle})</span>}
              <span className="text-[10px] px-2 py-0.5 rounded-lg font-semibold capitalize" style={{ background: sc.bg, color: sc.color }}>
                <sc.icon size={9} className="inline mr-1" />{sc.label}
              </span>
              <span className="text-[10px] text-white/30 capitalize">{release.type}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-white/40 mb-2 flex-wrap">
              <User size={10} />
              <span className="font-medium text-white/60">{release.userName}</span>
              <span className="text-white/20">·</span>
              <span>{release.userEmail}</span>
              {release.genre && <><span className="text-white/20">·</span><span className="text-[#7B5FFF]">{release.genre}</span></>}
            </div>

            <div className="flex items-center gap-3 text-[10px] text-white/30 flex-wrap">
              <span>{release.stores?.length || 0} platforms</span>
              {release.tracks?.length > 0 && (
                <span>{release.tracks.length} track{release.tracks.length !== 1 ? 's' : ''}
                  {uploadedTracks.length > 0 && <span className="text-[#10B981] ml-1">· {uploadedTracks.length} audio</span>}
                </span>
              )}
              {release.releaseDate && <span>Release: {new Date(release.releaseDate).toLocaleDateString()}</span>}
              {release.label && <span>Label: {release.label}</span>}
              {/* Completeness badge */}
              <span className="font-semibold" style={{ color: scoreColor }}>{score}% complete</span>
              {release.ampsuite?.referenceId && <span className="text-[#D63DF6]">AMP: {release.ampsuite.referenceId}</span>}
            </div>

            {release.adminNotes && (
              <div className={`mt-2 px-3 py-1.5 rounded-xl text-[11px] ${release.status === 'rejected' ? 'bg-[#FF5252]/10 border border-[#FF5252]/20 text-[#FF5252]' : 'bg-[#00C4FF]/10 border border-[#00C4FF]/20 text-[#00C4FF]'}`}>
                {release.adminNotes}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1.5 flex-shrink-0 items-end">
            <button onClick={onDetail}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#7B5FFF]/10 border border-[#7B5FFF]/20 text-[#7B5FFF] hover:bg-[#7B5FFF]/20 transition-all">
              <ExternalLink size={11} /> Full Review
            </button>
            <button onClick={onReview}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white/[0.05] border border-white/[0.08] text-white/60 hover:text-white transition-all">
              Quick Update
            </button>
            <button onClick={() => setExpanded(!expanded)} className="text-white/30 hover:text-white/60 p-1 transition-colors">
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/[0.05] overflow-hidden">
            <div className="p-5 grid sm:grid-cols-2 gap-5 text-xs">
              <div>
                <p className="font-semibold text-white/40 uppercase tracking-wider mb-2">Tracks</p>
                {(release.tracks || []).length === 0
                  ? <p className="text-white/30 italic">No tracks listed</p>
                  : (release.tracks || []).map((t: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 mb-1">
                      <span className="text-white/30 w-4">{i + 1}.</span>
                      <span className="text-white/70 flex-1">{t.title || '(Untitled)'}</span>
                      {t.isrc && <span className="text-white/30 font-mono text-[10px]">{t.isrc}</span>}
                      {t.fileName && <span className="text-[#10B981] flex items-center gap-0.5"><Headphones size={10} /></span>}
                    </div>
                  ))}
              </div>
              <div>
                <p className="font-semibold text-white/40 uppercase tracking-wider mb-2">Platforms ({release.stores?.length || 0})</p>
                <div className="flex flex-wrap gap-1">
                  {(release.stores || []).slice(0, 12).map((id: string) => {
                    const s = STORES.find(s => s.id === id);
                    return s ? <span key={id} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${s.color}20`, color: s.color }}>{s.name}</span> : null;
                  })}
                  {(release.stores?.length || 0) > 12 && <span className="text-[9px] text-white/30">+{release.stores.length - 12}</span>}
                </div>
                {release.ampsuite?.referenceId && (
                  <div className="mt-3">
                    <p className="font-semibold text-white/40 uppercase tracking-wider mb-1">AMPsuite</p>
                    <p className="text-[#D63DF6] font-mono text-[10px]">{release.ampsuite.referenceId}</p>
                    {release.ampsuite.deliveryResult && <p className="text-white/40 text-[10px]">Result: {release.ampsuite.deliveryResult}</p>}
                  </div>
                )}
              </div>
              <div className="sm:col-span-2 text-white/30 flex flex-wrap gap-4 text-[10px]">
                <span>Created: {new Date(release.createdAt).toLocaleString()}</span>
                <span>Updated: {new Date(release.updatedAt || release.createdAt).toLocaleString()}</span>
                <span>ID: {release.id?.slice(0, 12).toUpperCase()}</span>
                {release.statusHistory?.length > 0 && <span>{release.statusHistory.length} status change{release.statusHistory.length !== 1 ? 's' : ''}</span>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function AdminReleases() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [releases, setReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('submitted');
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!token) return;
    try {
      const d = await api.adminGetReleases(token);
      setReleases(d.releases || []);
    } catch (err: any) { toast.error(`Failed to load releases: ${err.message}`); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, [token]);

  const handleSave = async (releaseId: string, data: any) => {
    const { release } = await api.adminUpdateRelease(token!, releaseId, data);
    setReleases(prev => prev.map(r => r.id === releaseId ? { ...r, ...release } : r));
    toast.success(`✅ Updated → ${getStatusCfg(data.status).label}. Artist notified.`);
  };

  const filtered = releases.filter(r => {
    const matchSearch = !search ||
      r.title?.toLowerCase().includes(search.toLowerCase()) ||
      r.artist?.toLowerCase().includes(search.toLowerCase()) ||
      r.userName?.toLowerCase().includes(search.toLowerCase()) ||
      r.userEmail?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || r.status === filterStatus || (filterStatus === 'needs_changes' && r.status === 'needs_info');
    return matchSearch && matchStatus;
  });

  const pendingCount  = releases.filter(r => r.status === 'submitted').length;
  const actionCount   = releases.filter(r => r.status === 'needs_changes' || r.status === 'needs_info').length;
  const activeCount   = releases.filter(r => ['under_review','approved','queued_for_submission','submitted_to_ampsuite','delivery_in_progress','delivered_to_dsp','scheduled'].includes(r.status)).length;
  const liveCount     = releases.filter(r => r.status === 'live' || r.status === 'distributed').length;

  const FILTER_TABS = [
    { id: 'all',                   label: 'All',             count: releases.length },
    { id: 'submitted',             label: 'Pending',         count: pendingCount },
    { id: 'needs_changes',         label: 'Needs Changes',   count: actionCount },
    { id: 'under_review',          label: 'Under Review',    count: releases.filter(r => r.status === 'under_review').length },
    { id: 'approved',              label: 'Approved',        count: releases.filter(r => r.status === 'approved').length },
    { id: 'queued_for_submission', label: 'Queued',          count: releases.filter(r => r.status === 'queued_for_submission').length },
    { id: 'submitted_to_ampsuite', label: 'In AMPSUITE',     count: releases.filter(r => r.status === 'submitted_to_ampsuite').length },
    { id: 'live',                  label: 'Live',            count: liveCount },
    { id: 'rejected',              label: 'Rejected',        count: releases.filter(r => r.status === 'rejected').length },
    { id: 'on_hold',               label: 'On Hold',         count: releases.filter(r => r.status === 'on_hold').length },
    { id: 'draft',                 label: 'Drafts',          count: releases.filter(r => r.status === 'draft' || r.status === 'in_progress').length },
  ];

  return (
    <div className="p-5 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Distribution Inbox</h1>
          <p className="text-white/40 text-sm mt-1">Review and manage all release submissions
            {pendingCount > 0 && <span className="ml-2 px-2 py-0.5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] text-xs font-bold">{pendingCount} pending</span>}
          </p>
        </div>
        <button onClick={() => { setRefreshing(true); load(); }} disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white/60 hover:text-white transition-all">
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Alert banner */}
      {pendingCount > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="mb-5 p-4 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-2xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#F59E0B]/20 flex items-center justify-center flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-[#F59E0B] animate-ping" />
          </div>
          <div>
            <span className="text-white font-semibold text-sm">{pendingCount} release{pendingCount !== 1 ? 's' : ''} awaiting review</span>
            <span className="text-white/40 text-xs ml-2">Click "Full Review" to open the detailed review page</span>
          </div>
        </motion.div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Pending Review', value: pendingCount,  color: '#F59E0B' },
          { label: 'Needs Changes',  value: actionCount,   color: '#00C4FF' },
          { label: 'Active Delivery',value: activeCount,   color: '#D63DF6' },
          { label: 'Live',           value: liveCount,     color: '#10B981' },
        ].map(s => (
          <div key={s.label} className="bg-[#0D0D0D] border border-white/[0.06] rounded-xl p-3">
            <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[10px] text-white/40 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title, artist, user or email..."
            className="w-full bg-[#0D0D0D] border border-white/[0.06] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-[#0D0D0D] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/50">
          {FILTER_TABS.map(t => (
            <option key={t.id} value={t.id} className="bg-[#0D0D0D]">{t.label} ({t.count})</option>
          ))}
        </select>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap mb-5 overflow-x-auto pb-1">
        {FILTER_TABS.slice(0, 8).map(t => {
          const sc = getStatusCfg(t.id === 'all' ? 'draft' : t.id);
          return (
            <button key={t.id} onClick={() => setFilterStatus(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all border flex-shrink-0 ${filterStatus === t.id ? 'border-transparent text-white' : 'border-white/[0.06] bg-[#0D0D0D] text-white/50 hover:text-white'}`}
              style={filterStatus === t.id ? { background: t.id === 'all' ? '#7B5FFF' : sc.bg, borderColor: t.id === 'all' ? '#7B5FFF' : `${sc.color}30`, color: t.id === 'all' ? '#fff' : sc.color } : {}}>
              {t.id !== 'all' && <sc.icon size={10} />}
              {t.label}
              <span className="ml-0.5 opacity-60">{t.count}</span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-white/[0.03] rounded-2xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-[#7B5FFF]/10 flex items-center justify-center mx-auto mb-4">
            <Music size={28} className="text-[#7B5FFF]" />
          </div>
          <h3 className="text-white font-semibold mb-2">No releases found</h3>
          <p className="text-white/40 text-sm">
            {filterStatus === 'submitted' ? 'No pending submissions at the moment.' : 'No releases match your filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered
            .sort((a, b) => {
              const pa = STATUS_PRIORITY[a.status] ?? 99, pb = STATUS_PRIORITY[b.status] ?? 99;
              if (pa !== pb) return pa - pb;
              return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
            })
            .map(r => (
              <ReleaseRow
                key={r.id}
                release={r}
                onReview={() => setReviewing(r)}
                onDetail={() => navigate(`/admin/releases/${r.id}`)}
              />
            ))}
        </div>
      )}

      {/* Quick review modal */}
      <AnimatePresence>
        {reviewing && (
          <QuickReviewModal
            release={reviewing}
            onSave={(data) => handleSave(reviewing.id, data)}
            onClose={() => setReviewing(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
