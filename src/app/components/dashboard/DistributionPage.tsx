import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './AuthContext';
import * as api from './api';
import { toast } from 'sonner';
import {
  Music, Plus, Upload, Globe, CheckCircle, Clock, XCircle, FileText, Trash2, Edit3, X,
  ChevronDown, Search, Filter, Disc, Radio
} from 'lucide-react';

const STORES = [
  { id: 'spotify', name: 'Spotify', color: '#1DB954' },
  { id: 'apple_music', name: 'Apple Music', color: '#FA586A' },
  { id: 'youtube_music', name: 'YouTube Music', color: '#FF0000' },
  { id: 'amazon_music', name: 'Amazon Music', color: '#FF9900' },
  { id: 'tidal', name: 'TIDAL', color: '#00FFFF' },
  { id: 'deezer', name: 'Deezer', color: '#A238FF' },
  { id: 'tiktok', name: 'TikTok', color: '#FF0050' },
  { id: 'pandora', name: 'Pandora', color: '#00A0EE' },
  { id: 'soundcloud', name: 'SoundCloud', color: '#FF5500' },
  { id: 'audiomack', name: 'Audiomack', color: '#FFA500' },
  { id: 'boomplay', name: 'Boomplay', color: '#FF3333' },
  { id: 'anghami', name: 'Anghami', color: '#9B59B6' },
];

const GENRES = ['Afrobeats', 'Afro-Pop', 'Hip-Hop', 'R&B / Soul', 'Pop', 'Electronic', 'House', 'Dancehall / Reggae', 'Trap', 'Gospel', 'Jazz', 'Classical', 'Rock', 'Latin', 'Amapiano', 'Other'];
const TYPES = ['single', 'ep', 'album', 'mixtape'];

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  draft: { label: 'Draft', color: '#9CA3AF', bg: '#9CA3AF20', icon: FileText },
  submitted: { label: 'In Review', color: '#F59E0B', bg: '#F59E0B20', icon: Clock },
  live: { label: 'Live', color: '#10B981', bg: '#10B98120', icon: CheckCircle },
  rejected: { label: 'Rejected', color: '#EF4444', bg: '#EF444420', icon: XCircle },
};

export function DistributionPage() {
  const { token, user } = useAuth();
  const [releases, setReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [saving, setSaving] = useState(false);

  const defaultForm = {
    title: '', artist: user?.name || '', type: 'single', genre: '', releaseDate: '',
    description: '', label: '', explicit: false, language: 'English',
    stores: STORES.map(s => s.id), tracks: [{ title: '', duration: '' }],
  };
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    if (!token) return;
    api.getReleases(token).then(d => setReleases(d.releases || [])).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Release title is required'); return; }
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
      setForm(defaultForm);
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
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSubmitForDistribution = async (id: string) => {
    try {
      const { release } = await api.updateRelease(token!, id, { status: 'submitted' });
      setReleases(prev => prev.map(r => r.id === id ? release : r));
      toast.success('Submitted for distribution review!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const openEdit = (r: any) => {
    setForm({ ...defaultForm, ...r });
    setEditingId(r.id);
    setShowModal(true);
  };

  const filtered = releases.filter(r => {
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase()) || r.artist?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const addTrack = () => setForm(f => ({ ...f, tracks: [...f.tracks, { title: '', duration: '' }] }));
  const removeTrack = (i: number) => setForm(f => ({ ...f, tracks: f.tracks.filter((_: any, idx: number) => idx !== i) }));
  const updateTrack = (i: number, field: string, val: string) => setForm(f => ({ ...f, tracks: f.tracks.map((t: any, idx: number) => idx === i ? { ...t, [field]: val } : t) }));

  const toggleStore = (id: string) => {
    setForm(f => ({
      ...f,
      stores: f.stores.includes(id) ? f.stores.filter((s: string) => s !== id) : [...f.stores, id],
    }));
  };

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Releases', value: releases.length, color: '#7B5FFF' },
          { label: 'Live', value: releases.filter(r => r.status === 'live').length, color: '#10B981' },
          { label: 'In Review', value: releases.filter(r => r.status === 'submitted').length, color: '#F59E0B' },
          { label: 'Drafts', value: releases.filter(r => r.status === 'draft').length, color: '#6B7280' },
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
        <div className="flex gap-2">
          {['all', 'draft', 'submitted', 'live', 'rejected'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all capitalize ${filterStatus === s ? 'bg-[#7B5FFF] text-white' : 'bg-[#111111] border border-white/[0.06] text-white/50 hover:text-white'}`}>
              {s === 'all' ? 'All' : s}
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
            <Plus size={15} className="inline mr-2" />Upload Release
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const sc = statusConfig[r.status] || statusConfig.draft;
            const StatusIcon = sc.icon;
            return (
              <motion.div key={r.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-[#111111] border border-white/[0.06] rounded-2xl p-4 hover:border-white/10 transition-all"
              >
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
                    <p className="text-sm text-white/50 mt-0.5">{r.artist} {r.genre && `· ${r.genre}`}</p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-xs text-white/30">{r.stores?.length || 0} stores</span>
                      {r.releaseDate && <span className="text-xs text-white/30">Release: {new Date(r.releaseDate).toLocaleDateString()}</span>}
                      {r.tracks?.length > 0 && <span className="text-xs text-white/30">{r.tracks.length} track{r.tracks.length !== 1 ? 's' : ''}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {r.status === 'draft' && (
                      <button onClick={() => handleSubmitForDistribution(r.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-[#7B5FFF]/20 hover:bg-[#7B5FFF]/40 border border-[#7B5FFF]/30 transition-all">
                        <Upload size={11} className="inline mr-1" />Submit
                      </button>
                    )}
                    <button onClick={() => openEdit(r)} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.05] transition-all">
                      <Edit3 size={15} />
                    </button>
                    <button onClick={() => handleDelete(r.id)} className="p-2 rounded-lg text-white/40 hover:text-[#FF5252] hover:bg-[#FF5252]/10 transition-all">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
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
          <p className="text-xs text-white/40 mt-0.5">Spotify · Apple Music · YouTube Music · Amazon · TIDAL · Deezer · TikTok · Pandora · Boomplay · Audiomack + 140 more</p>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.97 }}
              className="bg-[#111111] border border-white/[0.08] rounded-2xl w-full max-w-2xl my-6"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
                <h2 className="text-lg font-bold text-white">{editingId ? 'Edit Release' : 'New Release'}</h2>
                <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white"><X size={20} /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Release Title *</label>
                    <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50"
                      placeholder="e.g. Summer Vibes" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Artist Name *</label>
                    <input value={form.artist} onChange={e => setForm(f => ({ ...f, artist: e.target.value }))} required
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50"
                      placeholder="Artist or band name" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Release Type</label>
                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/50 capitalize">
                      {TYPES.map(t => <option key={t} value={t} className="bg-[#111111]">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Genre</label>
                    <select value={form.genre} onChange={e => setForm(f => ({ ...f, genre: e.target.value }))}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/50">
                      <option value="" className="bg-[#111111]">Select genre</option>
                      {GENRES.map(g => <option key={g} value={g} className="bg-[#111111]">{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Release Date</label>
                    <input type="date" value={form.releaseDate} onChange={e => setForm(f => ({ ...f, releaseDate: e.target.value }))}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Label (optional)</label>
                    <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50"
                      placeholder="Label name or leave blank" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Description / Credits</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50 resize-none"
                    placeholder="Produced by... Written by... Mixed by..." />
                </div>

                {/* Tracks */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Tracks</label>
                    <button type="button" onClick={addTrack} className="text-xs text-[#7B5FFF] hover:text-[#D63DF6] flex items-center gap-1">
                      <Plus size={12} /> Add Track
                    </button>
                  </div>
                  <div className="space-y-2">
                    {form.tracks.map((track: any, i: number) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-white/30 text-xs w-5 text-right flex-shrink-0">{i + 1}.</span>
                        <input value={track.title} onChange={e => updateTrack(i, 'title', e.target.value)}
                          className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50"
                          placeholder="Track title" />
                        <input value={track.duration} onChange={e => updateTrack(i, 'duration', e.target.value)}
                          className="w-20 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50"
                          placeholder="3:45" />
                        {form.tracks.length > 1 && (
                          <button type="button" onClick={() => removeTrack(i)} className="text-white/30 hover:text-[#FF5252]"><X size={14} /></button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stores */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Stores ({form.stores.length} selected)</label>
                    <div className="flex gap-2 text-xs">
                      <button type="button" onClick={() => setForm(f => ({ ...f, stores: STORES.map(s => s.id) }))} className="text-[#7B5FFF]">All</button>
                      <span className="text-white/20">·</span>
                      <button type="button" onClick={() => setForm(f => ({ ...f, stores: [] }))} className="text-white/40">None</button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {STORES.map(s => (
                      <button key={s.id} type="button" onClick={() => toggleStore(s.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${form.stores.includes(s.id) ? 'border-transparent text-white' : 'border-white/[0.08] text-white/40 hover:text-white hover:border-white/20 bg-transparent'}`}
                        style={form.stores.includes(s.id) ? { background: `${s.color}25`, color: s.color, borderColor: `${s.color}40` } : {}}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input type="checkbox" id="explicit" checked={form.explicit} onChange={e => setForm(f => ({ ...f, explicit: e.target.checked }))} className="accent-[#7B5FFF] w-4 h-4" />
                  <label htmlFor="explicit" className="text-sm text-white/60">Explicit content</label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl text-sm font-medium text-white/60 bg-white/[0.05] hover:bg-white/[0.08] transition-all">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}>
                    {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Release'}
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