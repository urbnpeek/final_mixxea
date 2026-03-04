import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../dashboard/AuthContext';
import * as api from '../dashboard/api';
import { toast } from 'sonner';
import {
  Music, CheckCircle, Clock, XCircle, Globe, Search, ChevronDown, ChevronUp,
  Disc, Radio, FileText, RefreshCw, User, Headphones, X, Save, AlertCircle,
  ThumbsUp, Edit3,
} from 'lucide-react';

const STATUS_CFG: Record<string, any> = {
  draft:       { label: 'Draft',        color: '#6B7280', bg: '#6B728018', icon: FileText },
  submitted:   { label: 'Pending Review',color: '#F59E0B', bg: '#F59E0B18', icon: Clock },
  needs_info:  { label: 'Needs Info',   color: '#00C4FF', bg: '#00C4FF18', icon: AlertCircle },
  live:        { label: 'Live',         color: '#10B981', bg: '#10B98118', icon: CheckCircle },
  distributed: { label: 'Distributed', color: '#7B5FFF', bg: '#7B5FFF18', icon: Globe },
  rejected:    { label: 'Rejected',     color: '#FF5252', bg: '#FF525218', icon: XCircle },
};

const ALL_STORES: Record<string, string> = {
  spotify:'Spotify', apple_music:'Apple Music', youtube_music:'YouTube Music',
  amazon_music:'Amazon Music', tidal:'TIDAL', deezer:'Deezer', tiktok:'TikTok',
  pandora:'Pandora', soundcloud:'SoundCloud', audiomack:'Audiomack',
  boomplay:'Boomplay', anghami:'Anghami', beatport:'Beatport',
  traxsource:'Traxsource', junodownload:'Juno Download', shazam:'Shazam',
  facebook:'Facebook / Meta', instagram:'Instagram', napster:'Napster',
};

// ── Admin action modal ─────────────────────────────────────────────────────────
function ReviewModal({ release, onSave, onClose }: { release: any; onSave: (d: any) => Promise<void>; onClose: () => void }) {
  const [status, setStatus] = useState(release.status);
  const [adminNotes, setAdminNotes] = useState(release.adminNotes || '');
  const [saving, setSaving] = useState(false);

  const STATUSES = [
    { id: 'submitted',   label: 'Keep in Review', color: '#F59E0B' },
    { id: 'needs_info',  label: 'Request Info',   color: '#00C4FF' },
    { id: 'live',        label: 'Approve → Live', color: '#10B981' },
    { id: 'distributed', label: 'Distributed ✓',  color: '#7B5FFF' },
    { id: 'rejected',    label: 'Reject',         color: '#FF5252' },
  ];

  const handle = async () => {
    setSaving(true);
    try {
      await onSave({ status, adminNotes });
      onClose();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#0D0D0D] border border-white/[0.08] rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <div>
            <h2 className="text-sm font-bold text-white">Review Release</h2>
            <p className="text-xs text-white/40 mt-0.5">{release.userName} · {release.title}</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Status picker */}
          <div>
            <label className="block text-xs font-semibold text-white/50 mb-3 uppercase tracking-wider">Set Status</label>
            <div className="grid grid-cols-2 gap-2">
              {STATUSES.map(s => (
                <button key={s.id} onClick={() => setStatus(s.id)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all border text-left ${status === s.id ? 'text-white border-transparent' : 'border-white/[0.08] text-white/40 hover:border-white/20'}`}
                  style={status === s.id ? { background: `${s.color}25`, color: s.color, borderColor: `${s.color}50` } : {}}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes to artist */}
          <div>
            <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">
              {status === 'rejected' || status === 'needs_info' ? 'Message to Artist *' : 'Note to Artist (optional)'}
            </label>
            <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={4}
              placeholder={status === 'rejected' ? 'Explain why the release was rejected...' : status === 'needs_info' ? 'What info do you need from the artist?' : 'Optional notes for the artist...'}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50 resize-none" />
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium text-white/60 bg-white/[0.05] hover:bg-white/[0.08] transition-all">Cancel</button>
            <button onClick={handle} disabled={saving}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: status === 'rejected' ? 'linear-gradient(135deg, #FF5252, #D63DF6)' : status === 'live' || status === 'distributed' ? 'linear-gradient(135deg, #10B981, #00C4FF)' : 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}>
              <Save size={14} />{saving ? 'Saving...' : 'Save & Notify Artist'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Release row ────────────────────────────────────────────────────────────────
function ReleaseRow({ release, onReview }: { release: any; onReview: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const sc = STATUS_CFG[release.status] || STATUS_CFG.draft;
  const isPending = release.status === 'submitted';
  const needsInfo = release.status === 'needs_info';
  const uploadedTracks = (release.tracks || []).filter((t: any) => t.fileName);

  const formatTime = (iso: string) => {
    if (!iso) return '';
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (days > 0) return `${days}d ago`;
    if (hrs > 0) return `${hrs}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return 'Just now';
  };

  return (
    <motion.div layout className={`bg-[#0D0D0D] border rounded-2xl overflow-hidden transition-all ${isPending ? 'border-[#F59E0B]/30 shadow-[0_0_20px_#F59E0B08]' : needsInfo ? 'border-[#00C4FF]/20' : 'border-white/[0.06]'}`}>
      {isPending && (
        <div className="flex items-center gap-2 px-5 py-2 bg-[#F59E0B]/10 border-b border-[#F59E0B]/20">
          <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
          <span className="text-[11px] font-semibold text-[#F59E0B] uppercase tracking-wider">Awaiting Your Review</span>
          <span className="ml-auto text-[10px] text-[#F59E0B]/60">{formatTime(release.updatedAt || release.createdAt)}</span>
        </div>
      )}
      {needsInfo && (
        <div className="flex items-center gap-2 px-5 py-2 bg-[#00C4FF]/10 border-b border-[#00C4FF]/20">
          <AlertCircle size={11} className="text-[#00C4FF]" />
          <span className="text-[11px] font-semibold text-[#00C4FF] uppercase tracking-wider">Waiting for Artist Response</span>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-[#7B5FFF]/20 to-[#D63DF6]/20">
            {release.type === 'album' ? <Disc size={20} className="text-[#7B5FFF]" /> : release.type === 'ep' ? <Radio size={20} className="text-[#D63DF6]" /> : <Music size={20} className="text-[#7B5FFF]" />}
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-bold text-white text-sm">{release.title}</h3>
              <span className="text-[11px] px-2 py-0.5 rounded-lg font-semibold capitalize" style={{ background: sc.bg, color: sc.color }}>
                <sc.icon size={10} className="inline mr-1" />{sc.label}
              </span>
              <span className="text-[11px] text-white/30 capitalize">{release.type}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/40 mb-2 flex-wrap">
              <User size={11} />
              <span className="font-medium text-white/60">{release.userName}</span>
              <span className="text-white/20">·</span>
              <span>{release.userEmail}</span>
              {release.genre && <><span className="text-white/20">·</span><span className="text-[#7B5FFF]">{release.genre}</span></>}
            </div>

            {/* Quick stats */}
            <div className="flex items-center gap-3 text-[11px] text-white/30 flex-wrap">
              <span>{release.stores?.length || 0} platforms</span>
              {release.tracks?.length > 0 && (
                <span>{release.tracks.length} track{release.tracks.length !== 1 ? 's' : ''}
                  {uploadedTracks.length > 0 && <span className="text-[#10B981] ml-1">· {uploadedTracks.length} audio files</span>}
                </span>
              )}
              {release.releaseDate && <span>Release: {new Date(release.releaseDate).toLocaleDateString()}</span>}
              {release.label && <span>Label: {release.label}</span>}
              {release.explicit && <span className="text-[#FF5252]">Explicit</span>}
            </div>

            {/* Rejection / admin note */}
            {release.adminNotes && (
              <div className={`mt-2 px-3 py-1.5 rounded-xl text-xs ${release.status === 'rejected' ? 'bg-[#FF5252]/10 border border-[#FF5252]/20 text-[#FF5252]' : 'bg-[#00C4FF]/10 border border-[#00C4FF]/20 text-[#00C4FF]'}`}>
                <span className="font-semibold">Note:</span> {release.adminNotes}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 flex-shrink-0 items-end">
            <button onClick={onReview}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${isPending || needsInfo ? 'text-white hover:opacity-90' : 'bg-white/[0.05] border border-white/[0.08] text-white/60 hover:text-white'}`}
              style={isPending || needsInfo ? { background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' } : {}}>
              {isPending ? <><ThumbsUp size={12} /> Review</> : <><Edit3 size={12} /> Update</>}
            </button>
            <button onClick={() => setExpanded(!expanded)} className="text-white/30 hover:text-white/60 transition-colors">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/[0.05] overflow-hidden">
            <div className="p-5 grid sm:grid-cols-2 gap-5">
              {/* Tracks */}
              <div>
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Tracks</p>
                <div className="space-y-1.5">
                  {(release.tracks || []).length === 0 ? (
                    <p className="text-xs text-white/30 italic">No tracks listed</p>
                  ) : (release.tracks || []).map((t: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="text-white/30 w-4">{i+1}.</span>
                      <span className="text-white/70 flex-1">{t.title || '(Untitled)'}</span>
                      {t.duration && <span className="text-white/30">{t.duration}</span>}
                      {t.fileName && (
                        <span className="flex items-center gap-1 text-[#10B981]">
                          <Headphones size={10} /><span className="truncate max-w-[100px]">{t.fileName}</span>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Stores */}
              <div>
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Platforms ({release.stores?.length || 0})</p>
                <div className="flex flex-wrap gap-1">
                  {(release.stores || []).slice(0, 16).map((id: string) => (
                    <span key={id} className="text-[10px] px-2 py-0.5 rounded bg-white/[0.05] text-white/50">
                      {ALL_STORES[id] || id}
                    </span>
                  ))}
                  {(release.stores?.length || 0) > 16 && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.05] text-white/30">+{release.stores.length - 16} more</span>
                  )}
                </div>
              </div>

              {/* Description */}
              {release.description && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">Credits / Notes</p>
                  <p className="text-xs text-white/50 leading-relaxed">{release.description}</p>
                </div>
              )}

              {/* Meta */}
              <div className="sm:col-span-2 flex flex-wrap gap-4 text-xs text-white/30">
                <span>Submitted: {new Date(release.updatedAt || release.createdAt).toLocaleString()}</span>
                <span>Created: {new Date(release.createdAt).toLocaleString()}</span>
                <span>ID: {release.id?.slice(0, 8).toUpperCase()}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main admin releases component ──────────────────────────────────────────────
export function AdminReleases() {
  const { token } = useAuth();
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
    } catch (err: any) {
      toast.error(`Failed to load releases: ${err.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [token]);

  const handleRefresh = () => { setRefreshing(true); load(); };

  const handleSave = async (releaseId: string, data: any) => {
    const { release } = await api.adminUpdateRelease(token!, releaseId, data);
    setReleases(prev => prev.map(r => r.id === releaseId ? { ...r, ...release } : r));
    const sc = STATUS_CFG[data.status] || STATUS_CFG.draft;
    toast.success(`✅ Release updated → ${sc.label}. Artist notified.`);
  };

  const filtered = releases.filter(r => {
    const matchSearch = !search ||
      r.title?.toLowerCase().includes(search.toLowerCase()) ||
      r.artist?.toLowerCase().includes(search.toLowerCase()) ||
      r.userName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const pendingCount = releases.filter(r => r.status === 'submitted').length;
  const needsInfoCount = releases.filter(r => r.status === 'needs_info').length;

  const FILTER_TABS = [
    { id: 'all',         label: 'All',         count: releases.length },
    { id: 'submitted',   label: 'Pending',      count: pendingCount },
    { id: 'needs_info',  label: 'Needs Info',   count: needsInfoCount },
    { id: 'live',        label: 'Live',         count: releases.filter(r => r.status === 'live').length },
    { id: 'distributed', label: 'Distributed',  count: releases.filter(r => r.status === 'distributed').length },
    { id: 'rejected',    label: 'Rejected',     count: releases.filter(r => r.status === 'rejected').length },
    { id: 'draft',       label: 'Drafts',       count: releases.filter(r => r.status === 'draft').length },
  ];

  return (
    <div className="p-5 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Distribution Inbox</h1>
          <p className="text-white/40 text-sm mt-1">
            Review and manage release submissions
            {pendingCount > 0 && <span className="ml-2 px-2 py-0.5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] text-xs font-bold">{pendingCount} pending</span>}
          </p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white/60 hover:text-white transition-all">
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Pending banner */}
      {pendingCount > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="mb-5 p-4 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-2xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#F59E0B]/20 flex items-center justify-center flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-[#F59E0B] animate-ping" />
          </div>
          <div className="flex-1">
            <span className="text-white font-semibold text-sm">{pendingCount} release{pendingCount !== 1 ? 's' : ''} awaiting review</span>
            <span className="text-white/40 text-xs ml-2">Review and approve/reject to notify the artist</span>
          </div>
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        {FILTER_TABS.filter(t => t.id !== 'all').map(t => {
          const sc = STATUS_CFG[t.id] || { color: '#6B7280', bg: '#6B728018' };
          return (
            <button key={t.id} onClick={() => setFilterStatus(t.id)}
              className={`p-3 rounded-xl border transition-all text-left ${filterStatus === t.id ? 'border-transparent' : 'border-white/[0.06] bg-[#0D0D0D]'}`}
              style={filterStatus === t.id ? { background: sc.bg, borderColor: `${sc.color}30` } : {}}>
              <div className="text-xl font-black text-white">{t.count}</div>
              <div className="text-[10px] text-white/40 mt-0.5">{t.label}</div>
            </button>
          );
        })}
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title, artist or user..."
            className="w-full bg-[#0D0D0D] border border-white/[0.06] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-[#0D0D0D] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/50">
          {FILTER_TABS.map(t => (
            <option key={t.id} value={t.id} className="bg-[#0D0D0D]">{t.label} ({t.count})</option>
          ))}
        </select>
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
          {filtered.map(r => (
            <ReleaseRow
              key={r.id}
              release={r}
              onReview={() => setReviewing(r)}
            />
          ))}
        </div>
      )}

      {/* Review modal */}
      <AnimatePresence>
        {reviewing && (
          <ReviewModal
            release={reviewing}
            onSave={(data) => handleSave(reviewing.id, data)}
            onClose={() => setReviewing(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}


