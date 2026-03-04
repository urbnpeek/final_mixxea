import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './AuthContext';
import * as api from './api';
import { toast } from 'sonner';
import {
  Music, Plus, Upload, Globe, CheckCircle, Clock, XCircle, FileText, Trash2, Edit3, X,
  Search, Disc, Radio, ChevronDown, ChevronUp, Headphones, FileAudio, AlertCircle, Sparkles,
} from 'lucide-react';
import { AlbumArtGenerator } from './AlbumArtGenerator';

// ── Full DSP catalogue ─────────────────────────────────────────────────────────
const STORES = [
  { id: 'spotify',       name: 'Spotify',        color: '#1DB954' },
  { id: 'apple_music',   name: 'Apple Music',     color: '#FA586A' },
  { id: 'youtube_music', name: 'YouTube Music',   color: '#FF0000' },
  { id: 'amazon_music',  name: 'Amazon Music',    color: '#FF9900' },
  { id: 'tidal',         name: 'TIDAL',           color: '#00FFFF' },
  { id: 'deezer',        name: 'Deezer',          color: '#A238FF' },
  { id: 'tiktok',        name: 'TikTok',          color: '#FF0050' },
  { id: 'pandora',       name: 'Pandora',         color: '#00A0EE' },
  { id: 'soundcloud',    name: 'SoundCloud',      color: '#FF5500' },
  { id: 'audiomack',     name: 'Audiomack',       color: '#FFA500' },
  { id: 'boomplay',      name: 'Boomplay',        color: '#FF3333' },
  { id: 'anghami',       name: 'Anghami',         color: '#9B59B6' },
  { id: 'beatport',      name: 'Beatport',        color: '#01FF95' },
  { id: 'traxsource',    name: 'Traxsource',      color: '#FF6B00' },
  { id: 'junodownload',  name: 'Juno Download',   color: '#E8C84A' },
  { id: 'shazam',        name: 'Shazam',          color: '#0066FF' },
  { id: 'facebook',      name: 'Facebook / Meta', color: '#1877F2' },
  { id: 'instagram',     name: 'Instagram',       color: '#E1306C' },
  { id: 'napster',       name: 'Napster',         color: '#00B0D8' },
  { id: 'kkbox',         name: 'KKBOX',           color: '#00C462' },
  { id: 'yandex',        name: 'Yandex Music',    color: '#FFCC00' },
  { id: 'joox',          name: 'JOOX',            color: '#1DB99B' },
  { id: 'gaana',         name: 'Gaana',           color: '#FF1A44' },
  { id: 'jiosaavn',      name: 'JioSaavn',        color: '#02B543' },
];

// ── Expanded genre list ────────────────────────────────────────────────────────
const GENRES = [
  'Afrobeats', 'Afro-Pop', 'Afro House', 'Amapiano',
  'Hip-Hop', 'Trap', 'R&B / Soul', 'Pop',
  'Electronic', 'House', 'Tech House', 'Techno',
  'Deep House', 'Melodic Techno / House', 'Afro / Latin House',
  'Drum & Bass', 'Jungle', 'Dubstep', 'Garage / UK Bass',
  'Ambient / Downtempo', 'Lo-Fi Hip-Hop',
  'Dancehall / Reggae', 'Soca', 'Reggaeton / Latin Urban',
  'Gospel / Worship', 'Jazz', 'Blues', 'Soul / Funk',
  'Classical', 'Rock', 'Alternative / Indie',
  'Country', 'Folk', 'Latin', 'K-Pop',
  'Highlife', 'Kizomba / Zouk', 'Afrobeats Fusion',
  'Organic House', 'Progressive House', 'Psytrance',
  'Drill', 'Grime', 'Other',
];

const TYPES = ['single', 'ep', 'album', 'mixtape'];

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  draft:     { label: 'Draft',       color: '#9CA3AF', bg: '#9CA3AF20', icon: FileText },
  submitted: { label: 'In Review',   color: '#F59E0B', bg: '#F59E0B20', icon: Clock },
  needs_info:{ label: 'Needs Info',  color: '#00C4FF', bg: '#00C4FF20', icon: AlertCircle },
  live:      { label: 'Live',        color: '#10B981', bg: '#10B98120', icon: CheckCircle },
  distributed:{ label: 'Distributed',color: '#7B5FFF', bg: '#7B5FFF20', icon: Globe },
  rejected:  { label: 'Rejected',    color: '#EF4444', bg: '#EF444420', icon: XCircle },
};

// ── Track with audio upload ────────────────────────────────────────────────────
function TrackRow({ track, index, total, onChange, onRemove }: {
  track: any; index: number; total: number;
  onChange: (field: string, val: string) => void;
  onRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl">
      <span className="text-white/30 text-xs w-5 text-right flex-shrink-0">{index + 1}.</span>
      <input
        value={track.title}
        onChange={e => onChange('title', e.target.value)}
        className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50"
        placeholder="Track title"
      />
      <input
        value={track.duration}
        onChange={e => onChange('duration', e.target.value)}
        className="w-16 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50 text-center"
        placeholder="3:30"
      />
      {/* Audio file upload */}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        title={track.fileName || 'Upload audio file'}
        className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all border flex-shrink-0 ${
          track.fileName
            ? 'bg-[#10B981]/15 border-[#10B981]/30 text-[#10B981]'
            : 'bg-white/[0.04] border-white/[0.08] text-white/40 hover:text-white hover:border-white/20'
        }`}
      >
        <FileAudio size={13} />
        <span className="max-w-[80px] truncate">{track.fileName ? track.fileName.replace(/\.[^.]+$/, '') : 'Audio'}</span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="audio/*,.wav,.mp3,.flac,.aiff,.aac,.m4a"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) {
            onChange('fileName', file.name);
            onChange('fileSize', `${(file.size / 1024 / 1024).toFixed(1)} MB`);
            toast.success(`✅ "${file.name}" attached to track ${index + 1}`);
          }
        }}
      />
      {total > 1 && (
        <button type="button" onClick={onRemove} className="text-white/30 hover:text-[#FF5252] flex-shrink-0">
          <X size={14} />
        </button>
      )}
    </div>
  );
}

// ── DSP selector step ──────────────────────────────────────────────────────────
function DSPSelector({ selected, onChange }: { selected: string[]; onChange: (stores: string[]) => void }) {
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
  const allSelected = selected.length === STORES.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">
          DSP Platforms
          <span className="ml-2 text-[#7B5FFF] font-bold">{selected.length}/{STORES.length}</span>
        </label>
        <div className="flex gap-2 text-xs">
          <button type="button"
            onClick={() => onChange(STORES.map(s => s.id))}
            className="px-2.5 py-1 rounded-lg bg-[#7B5FFF]/20 text-[#7B5FFF] hover:bg-[#7B5FFF]/30 transition-all font-semibold">
            Select All
          </button>
          <button type="button"
            onClick={() => onChange([])}
            className="px-2.5 py-1 rounded-lg bg-white/[0.05] text-white/40 hover:text-white transition-all">
            Clear
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
        {STORES.map(s => (
          <button key={s.id} type="button" onClick={() => toggle(s.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              selected.includes(s.id)
                ? 'text-white border-transparent'
                : 'border-white/[0.08] text-white/40 hover:text-white hover:border-white/20 bg-transparent'
            }`}
            style={selected.includes(s.id) ? { background: `${s.color}25`, color: s.color, borderColor: `${s.color}40` } : {}}
          >
            {s.name}
          </button>
        ))}
      </div>
      {selected.length === 0 && (
        <p className="text-xs text-[#FF5252] mt-2">⚠️ Select at least one platform</p>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function DistributionPage() {
  const { token, user } = useAuth();
  const [releases, setReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showArtGen, setShowArtGen] = useState(false);

  const defaultForm = {
    title: '', artist: user?.name || '', type: 'single', genre: '', releaseDate: '',
    description: '', label: '', explicit: false, language: 'English',
    stores: STORES.map(s => s.id),
    tracks: [{ title: '', duration: '', fileName: '', fileSize: '' }],
    coverArt: '',
  };
  const [form, setForm] = useState(defaultForm);
  const coverRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) return;
    api.getReleases(token).then(d => setReleases(d.releases || [])).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Release title is required'); return; }
    if (form.stores.length === 0) { toast.error('Select at least one DSP platform'); return; }
    setSaving(true);
    try {
      if (editingId) {
        const { release } = await api.updateRelease(token!, editingId, form);
        setReleases(prev => prev.map(r => r.id === editingId ? release : r));
        toast.success('Release updated!');
      } else {
        const { release } = await api.createRelease(token!, form);
        setReleases(prev => [release, ...prev]);
        toast.success('Release created! Submit for distribution when ready.');
      }
      setShowModal(false);
      setForm({ ...defaultForm, artist: user?.name || '' });
      setEditingId(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this release?')) return;
    try {
      await api.deleteRelease(token!, id);
      setReleases(prev => prev.filter(r => r.id !== id));
      toast.success('Release deleted');
    } catch (err: any) { toast.error(err.message); }
  };

  const handleSubmitForDistribution = async (id: string) => {
    try {
      const { release } = await api.updateRelease(token!, id, { status: 'submitted' });
      setReleases(prev => prev.map(r => r.id === id ? release : r));
      toast.success('🚀 Submitted for distribution review! We\'ll notify you once approved.');
    } catch (err: any) { toast.error(err.message); }
  };

  const openEdit = (r: any) => {
    setForm({ ...defaultForm, ...r, tracks: r.tracks?.length > 0 ? r.tracks : defaultForm.tracks });
    setEditingId(r.id);
    setShowModal(true);
  };

  const filtered = releases.filter(r => {
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase()) || r.artist?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const addTrack = () => setForm(f => ({ ...f, tracks: [...f.tracks, { title: '', duration: '', fileName: '', fileSize: '' }] }));
  const removeTrack = (i: number) => setForm(f => ({ ...f, tracks: f.tracks.filter((_: any, idx: number) => idx !== i) }));
  const updateTrack = (i: number, field: string, val: string) =>
    setForm(f => ({ ...f, tracks: f.tracks.map((t: any, idx: number) => idx === i ? { ...t, [field]: val } : t) }));

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Distribution</h1>
          <p className="text-white/40 text-sm mt-1">Distribute your music to 150+ stores worldwide</p>
        </div>
        <button
          onClick={() => { setForm({ ...defaultForm, artist: user?.name || '' }); setEditingId(null); setShowModal(true); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white text-sm transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}
        >
          <Plus size={16} /> New Release
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total Releases', value: releases.length,                                          color: '#7B5FFF' },
          { label: 'Live',           value: releases.filter(r => r.status === 'live' || r.status === 'distributed').length, color: '#10B981' },
          { label: 'In Review',      value: releases.filter(r => r.status === 'submitted').length,    color: '#F59E0B' },
          { label: 'Needs Info',     value: releases.filter(r => r.status === 'needs_info').length,   color: '#00C4FF' },
          { label: 'Drafts',         value: releases.filter(r => r.status === 'draft').length,        color: '#6B7280' },
        ].map(s => (
          <div key={s.label} className="bg-[#111111] border border-white/[0.06] rounded-xl p-4">
            <div className="text-2xl font-bold text-white">{s.value}</div>
            <div className="text-xs text-white/40 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search releases..."
            className="w-full bg-[#111111] border border-white/[0.06] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'draft', 'submitted', 'needs_info', 'live', 'rejected'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all capitalize ${filterStatus === s ? 'bg-[#7B5FFF] text-white' : 'bg-[#111111] border border-white/[0.06] text-white/50 hover:text-white'}`}>
              {s === 'all' ? 'All' : s === 'needs_info' ? 'Needs Info' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Releases */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-white/[0.03] rounded-2xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-[#7B5FFF]/10 flex items-center justify-center mx-auto mb-4">
            <Music size={28} className="text-[#7B5FFF]" />
          </div>
          <h3 className="text-white font-semibold mb-2">{search || filterStatus !== 'all' ? 'No releases match' : 'No releases yet'}</h3>
          <p className="text-white/40 text-sm mb-6">Upload your first release to distribute worldwide</p>
          <button onClick={() => setShowModal(true)} className="px-6 py-3 rounded-xl font-semibold text-white text-sm" style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}>
            <Plus size={15} className="inline mr-2" />New Release
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const sc = statusConfig[r.status] || statusConfig.draft;
            const StatusIcon = sc.icon;
            const isExpanded = expandedId === r.id;
            const uploadedTracks = (r.tracks || []).filter((t: any) => t.fileName);
            return (
              <motion.div key={r.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-[#111111] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-white/10 transition-all"
              >
                <div className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#7B5FFF]/30 to-[#D63DF6]/30 flex items-center justify-center flex-shrink-0">
                      {r.type === 'album' ? <Disc size={22} className="text-[#7B5FFF]" /> : r.type === 'ep' ? <Radio size={22} className="text-[#D63DF6]" /> : <Music size={22} className="text-[#7B5FFF]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-white">{r.title}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-lg capitalize" style={{ background: sc.bg, color: sc.color }}>
                          <StatusIcon size={10} className="inline mr-1" />{sc.label}
                        </span>
                        <span className="text-xs text-white/30 capitalize">{r.type}</span>
                      </div>
                      <p className="text-sm text-white/50 mt-0.5">{r.artist}{r.genre && ` · ${r.genre}`}</p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-xs text-white/30">{r.stores?.length || 0} platforms</span>
                        {r.releaseDate && <span className="text-xs text-white/30">Release: {new Date(r.releaseDate).toLocaleDateString()}</span>}
                        {r.tracks?.length > 0 && (
                          <span className="text-xs text-white/30">
                            {r.tracks.length} track{r.tracks.length !== 1 ? 's' : ''}
                            {uploadedTracks.length > 0 && <span className="text-[#10B981] ml-1">· {uploadedTracks.length} audio uploaded</span>}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {r.status === 'draft' && (
                        <button onClick={() => handleSubmitForDistribution(r.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-[#7B5FFF]/20 hover:bg-[#7B5FFF]/40 border border-[#7B5FFF]/30 transition-all">
                          <Upload size={11} className="inline mr-1" />Submit
                        </button>
                      )}
                      <button onClick={() => setExpandedId(isExpanded ? null : r.id)}
                        className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.05] transition-all">
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      <button onClick={() => openEdit(r)} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.05] transition-all">
                        <Edit3 size={15} />
                      </button>
                      <button onClick={() => handleDelete(r.id)} className="p-2 rounded-lg text-white/40 hover:text-[#FF5252] hover:bg-[#FF5252]/10 transition-all">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded detail */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="border-t border-white/[0.05] overflow-hidden">
                      <div className="p-4 grid sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-white/40 uppercase tracking-wider mb-2 font-semibold">Tracks</p>
                          <div className="space-y-1.5">
                            {(r.tracks || []).map((t: any, i: number) => (
                              <div key={i} className="flex items-center gap-2 text-xs text-white/60">
                                <span className="text-white/30 w-4">{i+1}.</span>
                                <span className="flex-1">{t.title || '(Untitled)'}</span>
                                {t.duration && <span className="text-white/30">{t.duration}</span>}
                                {t.fileName && <span className="flex items-center gap-1 text-[#10B981]"><Headphones size={10} />{t.fileName}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-white/40 uppercase tracking-wider mb-2 font-semibold">Platforms ({r.stores?.length || 0})</p>
                          <div className="flex flex-wrap gap-1">
                            {(r.stores || []).slice(0, 12).map((id: string) => {
                              const s = STORES.find(s => s.id === id);
                              return s ? (
                                <span key={id} className="text-[10px] px-2 py-0.5 rounded font-medium"
                                  style={{ background: `${s.color}20`, color: s.color }}>
                                  {s.name}
                                </span>
                              ) : null;
                            })}
                            {(r.stores?.length || 0) > 12 && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.05] text-white/40">+{r.stores.length - 12} more</span>
                            )}
                          </div>
                        </div>
                        {r.description && (
                          <div className="sm:col-span-2">
                            <p className="text-xs text-white/40 uppercase tracking-wider mb-1 font-semibold">Credits / Notes</p>
                            <p className="text-white/50 text-xs leading-relaxed">{r.description}</p>
                          </div>
                        )}
                        {r.adminNotes && (
                          <div className="sm:col-span-2 p-3 bg-[#00C4FF]/10 border border-[#00C4FF]/20 rounded-xl">
                            <p className="text-xs text-[#00C4FF] font-semibold mb-0.5">Admin Note</p>
                            <p className="text-xs text-white/60">{r.adminNotes}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* DSP Info Banner */}
      <div className="mt-6 p-4 bg-[#111111] border border-white/[0.06] rounded-2xl flex items-center gap-4">
        <Globe size={20} className="text-[#00C4FF] flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-white">Distributed to 150+ platforms worldwide</p>
          <p className="text-xs text-white/40 mt-0.5">Spotify · Apple Music · YouTube Music · Amazon · TIDAL · Deezer · TikTok · Beatport · Traxsource · Pandora · Boomplay + 140 more</p>
        </div>
      </div>

      {/* Album Art Generator */}
      <AnimatePresence>
        {showArtGen && (
          <AlbumArtGenerator
            artistName={form.artist}
            releaseTitle={form.title}
            plan={(user as any)?.plan || 'starter'}
            credits={(user as any)?.credits || 0}
            token={token!}
            onUse={dataUrl => setForm(f => ({ ...f, coverArt: dataUrl }))}
            onClose={() => setShowArtGen(false)}
          />
        )}
      </AnimatePresence>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.97 }}
              className="bg-[#111111] border border-white/[0.08] rounded-2xl w-full max-w-2xl my-6">
              <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
                <div>
                  <h2 className="text-lg font-bold text-white">{editingId ? 'Edit Release' : 'New Release'}</h2>
                  <p className="text-xs text-white/40 mt-0.5">Fill in your release info and select platforms for distribution</p>
                </div>
                <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white"><X size={20} /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">

                {/* ── Release info ── */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">Release Title *</label>
                    <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50"
                      placeholder="e.g. Summer Vibes" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">Artist Name *</label>
                    <input value={form.artist} onChange={e => setForm(f => ({ ...f, artist: e.target.value }))} required
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50"
                      placeholder="Artist or band name" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">Release Type</label>
                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/50">
                      {TYPES.map(t => <option key={t} value={t} className="bg-[#111111]">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">Genre</label>
                    <select value={form.genre} onChange={e => setForm(f => ({ ...f, genre: e.target.value }))}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/50">
                      <option value="" className="bg-[#111111]">Select genre</option>
                      {GENRES.map(g => <option key={g} value={g} className="bg-[#111111]">{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">Release Date</label>
                    <input type="date" value={form.releaseDate} onChange={e => setForm(f => ({ ...f, releaseDate: e.target.value }))}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">Label (optional)</label>
                    <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50"
                      placeholder="Label name or self-released" />
                  </div>
                </div>

                {/* Cover art */}
                <div>
                  <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">Cover Art</label>
                  <div className="flex items-start gap-3">
                    {/* Preview */}
                    <div className="flex-shrink-0 relative group">
                      {form.coverArt ? (
                        <img src={form.coverArt} alt="Cover" className="w-20 h-20 rounded-xl object-cover border border-white/[0.1]" />
                      ) : (
                        <div className="w-20 h-20 rounded-xl border border-dashed border-white/20 bg-white/[0.03] flex items-center justify-center">
                          <Music size={22} className="text-white/20" />
                        </div>
                      )}
                      {form.coverArt && (
                        <button onClick={() => setForm(f => ({ ...f, coverArt: '' }))}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#FF5252] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X size={10} className="text-white" />
                        </button>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <input value={form.coverArt} onChange={e => setForm(f => ({ ...f, coverArt: e.target.value }))}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50"
                        placeholder="Paste image URL (3000×3000px, square)" />
                      {/* Generate button */}
                      <button type="button" onClick={() => setShowArtGen(true)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                        style={{ background: 'linear-gradient(135deg,rgba(123,95,255,0.2),rgba(214,61,246,0.15))', border: '1px solid rgba(123,95,255,0.35)', color: '#D63DF6' }}>
                        <Sparkles size={14} />
                        Generate Cover Art with AI
                      </button>
                      <p className="text-[10px] text-white/25 leading-relaxed">
                        Requirements: square, min 3000×3000px, RGB, JPEG or PNG · No text or logo near edges · No explicit content
                      </p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">Description / Credits</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50 resize-none"
                    placeholder="Produced by... Written by... Mixed by... Mastered by..." />
                </div>

                {/* ── Tracks with audio upload ── */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Tracks & Audio Files</label>
                      <p className="text-[10px] text-white/30 mt-0.5">Add track info · Upload WAV / MP3 / FLAC files per track</p>
                    </div>
                    <button type="button" onClick={addTrack} className="flex items-center gap-1 text-xs text-[#7B5FFF] hover:text-[#D63DF6] transition-colors">
                      <Plus size={12} /> Add Track
                    </button>
                  </div>
                  <div className="space-y-2">
                    {form.tracks.map((track: any, i: number) => (
                      <TrackRow
                        key={i} track={track} index={i} total={form.tracks.length}
                        onChange={(field, val) => updateTrack(i, field, val)}
                        onRemove={() => removeTrack(i)}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-white/20 mt-2 flex items-center gap-1">
                    <FileAudio size={10} /> Accepted: WAV, MP3, FLAC, AIFF, AAC · Max 500MB per file
                  </p>
                </div>

                {/* ── DSP selector ── */}
                <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                  <DSPSelector selected={form.stores} onChange={stores => setForm(f => ({ ...f, stores }))} />
                </div>

                {/* Explicit */}
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="explicit" checked={form.explicit} onChange={e => setForm(f => ({ ...f, explicit: e.target.checked }))} className="accent-[#7B5FFF] w-4 h-4" />
                  <label htmlFor="explicit" className="text-sm text-white/60">Contains explicit content (E label will be applied)</label>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl text-sm font-medium text-white/60 bg-white/[0.05] hover:bg-white/[0.08] transition-all">Cancel</button>
                  <button type="submit" disabled={saving || form.stores.length === 0}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}>
                    {saving ? 'Saving...' : editingId ? 'Save Changes' : `Create Release → ${form.stores.length} platforms`}
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
