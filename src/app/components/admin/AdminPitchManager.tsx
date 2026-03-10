// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — Admin Pitch Manager
//  Tabs: Incoming Pitches · Curator Network · Placement Tracker
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../dashboard/AuthContext';
import * as api from '../dashboard/api';
import { toast } from 'sonner';
import {
  Radio, CheckCircle, XCircle, Clock, RefreshCw, Search, X, Plus, User,
  Music, Star, Zap, Globe, Instagram, Users, Save, Trash2, Edit3,
  ChevronDown, ChevronUp, ExternalLink, ThumbsUp, ThumbsDown, Eye,
  MessageCircle, Filter, MapPin, Calendar,
} from 'lucide-react';

const PITCH_STATUS: Record<string, any> = {
  pending:   { label: 'Pending',   color: '#F59E0B', bg: '#F59E0B12', icon: Clock },
  reviewing: { label: 'Reviewing', color: '#00C4FF', bg: '#00C4FF12', icon: Eye },
  accepted:  { label: 'Accepted',  color: '#10B981', bg: '#10B98112', icon: CheckCircle },
  rejected:  { label: 'Rejected',  color: '#FF5252', bg: '#FF525212', icon: XCircle },
};

const TIER_CFG: Record<string, { label: string; color: string; bg: string }> = {
  editorial: { label: 'Editorial',  color: '#F59E0B', bg: '#F59E0B12' },
  premium:   { label: 'Premium',    color: '#D63DF6', bg: '#D63DF612' },
  standard:  { label: 'Standard',   color: '#7B5FFF', bg: '#7B5FFF12' },
};

// ── Pitch Row ────────────────────────────────────────────────────────────────
function PitchRow({ pitch, onAction }: { pitch: any; onAction: (id: string, status: string, extra?: any) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [reason, setReason] = useState('');
  const sc = PITCH_STATUS[pitch.status] || PITCH_STATUS.pending;

  return (
    <div className={`bg-[#0D0D0D] border rounded-2xl overflow-hidden transition-all ${pitch.status === 'pending' ? 'border-[#F59E0B]/25 shadow-[0_0_16px_#F59E0B06]' : 'border-white/[0.06]'}`}>
      {pitch.status === 'pending' && (
        <div className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B]/08 border-b border-[#F59E0B]/15">
          <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
          <span className="text-[11px] font-semibold text-[#F59E0B] uppercase tracking-wider">Awaiting Review</span>
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#7B5FFF]/15 flex items-center justify-center flex-shrink-0">
            <Radio size={18} className="text-[#7B5FFF]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="font-bold text-white text-sm">{pitch.trackTitle || 'Untitled Track'}</p>
              <span className="text-[11px] px-2 py-0.5 rounded-lg font-semibold" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/40 flex-wrap">
              <User size={10} />
              <span className="font-medium text-white/60">{pitch.artistName || 'Unknown Artist'}</span>
              <span className="text-white/20">·</span>
              <span>{pitch.artistEmail || '—'}</span>
              <span className="text-white/20">·</span>
              <span className="text-[#D63DF6] font-medium">{pitch.playlistName || pitch.curatorName || 'Direct Pitch'}</span>
            </div>
            {pitch.message && <p className="text-xs text-white/50 mt-2 leading-relaxed line-clamp-2">{pitch.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5 flex-shrink-0 items-end">
            <div className="flex items-center gap-1 text-[10px] text-white/25">
              <Zap size={9} className="text-[#00C4FF]" />{pitch.creditCost || 0} cr
            </div>
            <div className="flex items-center gap-1 text-[10px] text-white/25">
              <Calendar size={9} />{new Date(pitch.createdAt).toLocaleDateString()}
            </div>
            <button onClick={() => setExpanded(!expanded)} className="text-white/30 hover:text-white/60">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {/* Actions for pending */}
        {pitch.status === 'pending' && (
          <div className="flex gap-2 mt-4 flex-wrap">
            <button onClick={() => onAction(pitch.id, 'accepted', { playlistUrl: '' })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #10B981, #00C4FF)' }}>
              <ThumbsUp size={11} /> Accept
            </button>
            <button onClick={() => onAction(pitch.id, 'reviewing')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#00C4FF]/15 border border-[#00C4FF]/30 text-[#00C4FF]">
              <Eye size={11} /> Reviewing
            </button>
            <button onClick={() => onAction(pitch.id, 'rejected', { reason: 'Not a fit for our playlists at this time.' })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#FF5252]/15 border border-[#FF5252]/30 text-[#FF5252]">
              <ThumbsDown size={11} /> Decline
            </button>
          </div>
        )}
      </div>

      {/* Expanded: accept with playlist URL */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/[0.05] overflow-hidden">
            <div className="p-4 space-y-3">
              {pitch.status === 'reviewing' && (
                <div className="space-y-2">
                  <label className="text-[11px] text-white/40 uppercase tracking-wider font-semibold">Playlist URL (on acceptance)</label>
                  <div className="flex gap-2">
                    <input value={playlistUrl} onChange={e => setPlaylistUrl(e.target.value)}
                      placeholder="https://open.spotify.com/playlist/…"
                      className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#10B981]/40" />
                    <button onClick={() => onAction(pitch.id, 'accepted', { playlistUrl })}
                      className="px-3 py-2 rounded-xl text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg,#10B981,#00C4FF)' }}>
                      <CheckCircle size={13} />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input value={reason} onChange={e => setReason(e.target.value)}
                      placeholder="Rejection reason…"
                      className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#FF5252]/40" />
                    <button onClick={() => onAction(pitch.id, 'rejected', { reason })}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-[#FF5252]/15 border border-[#FF5252]/30 text-[#FF5252]">
                      <ThumbsDown size={13} />
                    </button>
                  </div>
                </div>
              )}
              {pitch.status === 'accepted' && pitch.playlistUrl && (
                <a href={pitch.playlistUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-[#10B981] hover:underline">
                  <ExternalLink size={11} /> View Playlist
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Curator Card ────────────────────────────────────────────────────────────
function CuratorCard({ curator, onEdit, onDelete }: any) {
  const tc = TIER_CFG[curator.tier] || TIER_CFG.standard;
  return (
    <div className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-4 hover:border-white/15 transition-all">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#7B5FFF]/15 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-[#7B5FFF]">{curator.name?.charAt(0)?.toUpperCase() || 'C'}</span>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-white text-sm truncate">{curator.name}</p>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: tc.bg, color: tc.color }}>{tc.label}</span>
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => onEdit(curator)} className="p-1.5 text-white/30 hover:text-white rounded-lg hover:bg-white/[0.06] transition-all">
            <Edit3 size={13} />
          </button>
          <button onClick={() => onDelete(curator.id)} className="p-1.5 text-white/30 hover:text-[#FF5252] rounded-lg hover:bg-[#FF5252]/10 transition-all">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        {[
          { label: 'Followers', value: curator.totalFollowers?.toLocaleString() || '0' },
          { label: 'Accept Rate', value: `${curator.acceptanceRate || 0}%` },
          { label: 'Response', value: curator.responseTime || 'N/A' },
        ].map(m => (
          <div key={m.label} className="bg-white/[0.03] rounded-xl p-2">
            <p className="text-sm font-bold text-white">{m.value}</p>
            <p className="text-[10px] text-white/30 mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {(curator.genres || []).slice(0, 3).map((g: string) => (
          <span key={g} className="text-[10px] px-2 py-0.5 bg-[#7B5FFF]/10 text-[#7B5FFF] rounded-lg">{g}</span>
        ))}
        {curator.email && <span className="text-[10px] text-white/30 ml-auto">{curator.email}</span>}
      </div>
    </div>
  );
}

// ── Add/Edit Curator Modal ────────────────────────────────────────────────────
function CuratorModal({ curator, onSave, onClose }: any) {
  const isEdit = !!curator?.id;
  const [form, setForm] = useState({
    name: curator?.name || '', email: curator?.email || '',
    genres: (curator?.genres || []).join(', '),
    totalFollowers: curator?.totalFollowers || 0,
    acceptanceRate: curator?.acceptanceRate || 0,
    tier: curator?.tier || 'standard',
    responseTime: curator?.responseTime || '3-5 days',
    spotifyUrl: curator?.spotifyUrl || '', notes: curator?.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const handle = async () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    setSaving(true);
    try {
      await onSave({ ...form, genres: form.genres.split(',').map((g: string) => g.trim()).filter(Boolean) });
      onClose();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        className="bg-[#0D0D0D] border border-white/[0.08] rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <h2 className="text-sm font-bold text-white">{isEdit ? 'Edit Curator' : 'Add Curator'}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          {[
            { key: 'name', label: 'Curator Name *', placeholder: 'LoFi Dreams, Afrobeats Hub…' },
            { key: 'email', label: 'Email', placeholder: 'curator@example.com' },
            { key: 'genres', label: 'Genres (comma-separated)', placeholder: 'Hip-Hop, R&B, Afrobeats' },
            { key: 'spotifyUrl', label: 'Spotify Profile URL', placeholder: 'https://open.spotify.com/user/…' },
            { key: 'responseTime', label: 'Response Time', placeholder: '3-5 days' },
            { key: 'notes', label: 'Internal Notes', placeholder: 'Any notes about working with this curator…' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">{f.label}</label>
              <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/40" />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Total Followers</label>
              <input type="number" value={form.totalFollowers} onChange={e => setForm(p => ({ ...p, totalFollowers: parseInt(e.target.value) || 0 }))}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/40" />
            </div>
            <div>
              <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Acceptance Rate %</label>
              <input type="number" min="0" max="100" value={form.acceptanceRate} onChange={e => setForm(p => ({ ...p, acceptanceRate: parseInt(e.target.value) || 0 }))}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/40" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Tier</label>
            <div className="flex gap-2">
              {Object.entries(TIER_CFG).map(([k, v]) => (
                <button key={k} onClick={() => setForm(p => ({ ...p, tier: k }))}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all border ${form.tier === k ? 'text-white border-transparent' : 'border-white/[0.08] text-white/40'}`}
                  style={form.tier === k ? { background: v.bg, color: v.color, borderColor: `${v.color}40` } : {}}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-white/[0.06] flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium text-white/60 bg-white/[0.05]">Cancel</button>
          <button onClick={handle} disabled={saving}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}>
            {saving ? 'Saving…' : isEdit ? 'Update Curator' : 'Add Curator'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function AdminPitchManager() {
  const { token } = useAuth();
  const [tab, setTab] = useState<'pitches' | 'curators' | 'placements'>('pitches');
  const [pitches, setPitches] = useState<any[]>([]);
  const [curators, setCurators] = useState<any[]>([]);
  const [placements, setPlacements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCuratorModal, setShowCuratorModal] = useState(false);
  const [editingCurator, setEditingCurator] = useState<any>(null);
  const [showAddPlacement, setShowAddPlacement] = useState(false);
  const [newPlacement, setNewPlacement] = useState({ artistName: '', trackTitle: '', playlistName: '', curatorName: '', followers: 0, playlistUrl: '', streamsAttributed: 0 });
  const [savingPlacement, setSavingPlacement] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [p, c, pl] = await Promise.all([
        api.adminGetAllPitches(token).catch(() => ({ pitches: [] })),
        api.adminGetCuratorsNetwork(token).catch(() => ({ curators: [] })),
        api.adminGetPlacements(token).catch(() => ({ placements: [] })),
      ]);
      setPitches(p.pitches || []);
      setCurators(c.curators || []);
      setPlacements(pl.placements || []);
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handlePitchAction = async (id: string, status: string, extra: any = {}) => {
    try {
      await api.adminUpdatePitchStatus(token!, id, { status, ...extra });
      setPitches(prev => prev.map(p => p.id === id ? { ...p, status, ...extra } : p));
      toast.success(status === 'accepted' ? '🎉 Pitch accepted — artist notified!' : status === 'rejected' ? 'Pitch declined & credits refunded' : 'Status updated');
    } catch (err: any) { toast.error(err.message); }
  };

  const handleSaveCurator = async (data: any) => {
    if (editingCurator?.id) {
      const r = await api.adminUpdateCuratorNetwork(token!, editingCurator.id, data);
      setCurators(prev => prev.map(c => c.id === editingCurator.id ? r.curator : c));
      toast.success('Curator updated!');
    } else {
      const r = await api.adminAddCuratorNetwork(token!, data);
      setCurators(prev => [r.curator, ...prev]);
      toast.success('Curator added to network!');
    }
    setEditingCurator(null);
  };

  const handleDeleteCurator = async (id: string) => {
    try {
      await api.adminDeleteCuratorNetwork(token!, id);
      setCurators(prev => prev.filter(c => c.id !== id));
      toast.success('Curator removed');
    } catch (err: any) { toast.error(err.message); }
  };

  const handleAddPlacement = async () => {
    if (!newPlacement.artistName || !newPlacement.trackTitle) { toast.error('Artist and track required'); return; }
    setSavingPlacement(true);
    try {
      const r = await api.adminCreatePlacement(token!, { ...newPlacement, addedAt: new Date().toISOString() });
      setPlacements(prev => [r.placement, ...prev]);
      setNewPlacement({ artistName: '', trackTitle: '', playlistName: '', curatorName: '', followers: 0, playlistUrl: '', streamsAttributed: 0 });
      setShowAddPlacement(false);
      toast.success('✅ Placement recorded!');
    } catch (err: any) { toast.error(err.message); }
    finally { setSavingPlacement(false); }
  };

  const pendingPitches = pitches.filter(p => p.status === 'pending').length;

  const filteredPitches = pitches.filter(p => {
    const term = search.toLowerCase();
    const matchSearch = !search || (p.artistName || '').toLowerCase().includes(term) || (p.trackTitle || '').toLowerCase().includes(term) || (p.playlistName || '').toLowerCase().includes(term);
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const TABS = [
    { id: 'pitches', label: 'Incoming Pitches', count: pendingPitches },
    { id: 'curators', label: 'Curator Network', count: curators.length },
    { id: 'placements', label: 'Placement Tracker', count: placements.length },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Pitch Manager</h1>
        <p className="text-white/40 text-sm mt-1">Manage all playlist pitches, curator relationships, and confirmed placements.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[#0A0A0A] border border-white/[0.06] rounded-2xl">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === t.id ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
            style={tab === t.id ? { background: 'linear-gradient(135deg,#7B5FFF20,#D63DF620)', border: '1px solid #7B5FFF30' } : {}}>
            {t.label}
            {t.count > 0 && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold" style={tab === t.id ? { background: '#7B5FFF', color: '#fff' } : { background: 'rgba(255,255,255,0.08)', color: '#fff' }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="w-8 h-8 rounded-full border-2 border-[#7B5FFF] border-t-transparent animate-spin" /></div>
      ) : (
        <>
          {/* PITCHES TAB */}
          {tab === 'pitches' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-2 bg-[#111] border border-white/[0.06] rounded-xl px-3 py-2 flex-1 min-w-[200px]">
                  <Search size={13} className="text-white/30" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search artist, track, playlist…"
                    className="bg-transparent text-sm text-white placeholder-white/30 focus:outline-none w-full" />
                  {search && <button onClick={() => setSearch('')}><X size={13} className="text-white/30" /></button>}
                </div>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  className="bg-[#111] border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-white/70 focus:outline-none">
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="reviewing">Reviewing</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="space-y-3">
                {filteredPitches.length === 0 ? (
                  <div className="text-center py-12">
                    <Radio size={28} className="text-white/15 mx-auto mb-3" />
                    <p className="text-white/40 text-sm">No pitches found</p>
                  </div>
                ) : filteredPitches.map(p => (
                  <PitchRow key={p.id} pitch={p} onAction={handlePitchAction} />
                ))}
              </div>
            </div>
          )}

          {/* CURATORS TAB */}
          {tab === 'curators' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-white/40">{curators.length} curators in network</span>
                  <span className="text-xs text-[#10B981]">{curators.filter(c => c.status === 'active').length} active</span>
                </div>
                <button onClick={() => { setEditingCurator(null); setShowCuratorModal(true); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}>
                  <Plus size={14} /> Add Curator
                </button>
              </div>
              {curators.length === 0 ? (
                <div className="text-center py-12 bg-[#0D0D0D] border border-white/[0.06] rounded-2xl">
                  <Users size={28} className="text-white/15 mx-auto mb-3" />
                  <p className="text-white/40 text-sm mb-4">No curators in network yet</p>
                  <button onClick={() => setShowCuratorModal(true)}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}>
                    Add Your First Curator
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {curators.map(c => (
                    <CuratorCard key={c.id} curator={c}
                      onEdit={(cur: any) => { setEditingCurator(cur); setShowCuratorModal(true); }}
                      onDelete={handleDeleteCurator} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PLACEMENTS TAB */}
          {tab === 'placements' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/40">{placements.length} confirmed placements</span>
                <button onClick={() => setShowAddPlacement(!showAddPlacement)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #10B981, #00C4FF)' }}>
                  <Plus size={14} /> Record Placement
                </button>
              </div>

              <AnimatePresence>
                {showAddPlacement && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    className="bg-[#0D0D0D] border border-[#10B981]/25 rounded-2xl p-5 space-y-4">
                    <h3 className="text-sm font-bold text-white">Record New Placement</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: 'artistName', label: 'Artist Name', placeholder: 'Artist name' },
                        { key: 'trackTitle', label: 'Track Title', placeholder: 'Song title' },
                        { key: 'playlistName', label: 'Playlist Name', placeholder: 'Playlist name' },
                        { key: 'curatorName', label: 'Curator Name', placeholder: 'Curator name' },
                        { key: 'playlistUrl', label: 'Playlist URL', placeholder: 'https://open.spotify.com/playlist/…' },
                      ].map(f => (
                        <div key={f.key} className={f.key === 'playlistUrl' ? 'col-span-2' : ''}>
                          <label className="block text-[11px] text-white/40 mb-1">{f.label}</label>
                          <input value={(newPlacement as any)[f.key]} onChange={e => setNewPlacement(p => ({ ...p, [f.key]: e.target.value }))}
                            placeholder={f.placeholder}
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#10B981]/40" />
                        </div>
                      ))}
                      <div>
                        <label className="block text-[11px] text-white/40 mb-1">Playlist Followers</label>
                        <input type="number" value={newPlacement.followers} onChange={e => setNewPlacement(p => ({ ...p, followers: parseInt(e.target.value) || 0 }))}
                          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#10B981]/40" />
                      </div>
                      <div>
                        <label className="block text-[11px] text-white/40 mb-1">Streams Attributed</label>
                        <input type="number" value={newPlacement.streamsAttributed} onChange={e => setNewPlacement(p => ({ ...p, streamsAttributed: parseInt(e.target.value) || 0 }))}
                          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#10B981]/40" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setShowAddPlacement(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/60 bg-white/[0.05]">Cancel</button>
                      <button onClick={handleAddPlacement} disabled={savingPlacement}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg,#10B981,#00C4FF)' }}>
                        {savingPlacement ? 'Saving…' : 'Record Placement'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {placements.length === 0 ? (
                <div className="text-center py-12 bg-[#0D0D0D] border border-white/[0.06] rounded-2xl">
                  <CheckCircle size={28} className="text-white/15 mx-auto mb-3" />
                  <p className="text-white/40 text-sm">No placements recorded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {placements.map(pl => (
                    <div key={pl.id} className="bg-[#0D0D0D] border border-white/[0.07] rounded-2xl p-4 flex items-center gap-4">
                      <div className="w-9 h-9 rounded-xl bg-[#10B981]/15 flex items-center justify-center flex-shrink-0">
                        <CheckCircle size={16} className="text-[#10B981]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-sm truncate">{pl.trackTitle} — {pl.artistName}</p>
                        <div className="flex items-center gap-2 text-xs text-white/40 flex-wrap mt-0.5">
                          <span className="text-[#10B981]">{pl.playlistName}</span>
                          {pl.curatorName && <><span className="text-white/20">·</span><span>{pl.curatorName}</span></>}
                          {pl.followers > 0 && <><span className="text-white/20">·</span><span>{pl.followers.toLocaleString()} followers</span></>}
                          {pl.streamsAttributed > 0 && <><span className="text-white/20">·</span><span className="text-[#00C4FF]">+{pl.streamsAttributed.toLocaleString()} streams</span></>}
                        </div>
                      </div>
                      {pl.playlistUrl && (
                        <a href={pl.playlistUrl} target="_blank" rel="noopener noreferrer"
                          className="text-white/30 hover:text-[#10B981] transition-colors flex-shrink-0">
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <span className="text-[10px] text-white/25 flex-shrink-0">
                        {new Date(pl.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Curator Modal */}
      <AnimatePresence>
        {showCuratorModal && (
          <CuratorModal curator={editingCurator}
            onSave={handleSaveCurator}
            onClose={() => { setShowCuratorModal(false); setEditingCurator(null); }} />
        )}
      </AnimatePresence>
    </div>
  );
}
