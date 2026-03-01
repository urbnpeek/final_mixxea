import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './AuthContext';
import * as api from './api';
import { toast } from 'sonner';
import {
  Music, Search, Filter, Zap, Users, CheckCircle, Clock, XCircle,
  ChevronRight, Disc3, X, Send, Star, TrendingUp, Radio
} from 'lucide-react';
import { planHasAccess, UpgradeWall } from './PlanGate';

const GENRES = ['All', 'Hip-Hop', 'R&B', 'Pop', 'Electronic', 'Afrobeats', 'Lo-Fi', 'Reggaeton', 'Indie', 'World'];

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  icon: Clock      },
  reviewing: { label: 'Reviewing', color: '#00C4FF', bg: 'rgba(0,196,255,0.1)',   icon: Star       },
  accepted:  { label: 'Accepted',  color: '#10B981', bg: 'rgba(16,185,129,0.1)', icon: CheckCircle },
  rejected:  { label: 'Not Selected', color: '#FF5252', bg: 'rgba(255,82,82,0.1)', icon: XCircle   },
};

function PitchModal({ playlist, curator, onClose, onSubmit, balance }: any) {
  const [form, setForm] = useState({ trackTitle: '', message: '', releaseLink: '' });
  const [submitting, setSubmitting] = useState(false);
  const cost = playlist.creditCost || 30;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.trackTitle.trim()) { toast.error('Track title is required'); return; }
    if (balance < cost) { toast.error('Insufficient credits'); return; }
    setSubmitting(true);
    try {
      await onSubmit({ ...form, playlistId: playlist.id, curatorId: curator.id, playlistName: playlist.name, curatorName: curator.name, creditCost: cost });
      toast.success(`🎸 Pitch submitted to "${playlist.name}"!`);
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
        className="w-full max-w-lg bg-[#111111] border border-white/[0.08] rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-white font-bold text-lg">Submit Pitch</h2>
            <p className="text-white/40 text-sm mt-0.5">Pitching to <span className="text-white/70">{playlist.name}</span></p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Playlist info */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-white font-semibold text-sm">{playlist.name}</div>
              <div className="text-white/40 text-xs mt-0.5">by {curator.name}</div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end">
                <Zap size={12} className="text-[#00C4FF]" />
                <span className="text-white font-bold">{cost}</span>
              </div>
              <div className="text-white/30 text-xs">credits</div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-white/40">
            <span className="flex items-center gap-1"><Users size={11} />{playlist.followers?.toLocaleString()} followers</span>
            <span>{playlist.genre}</span>
          </div>
          <p className="text-white/30 text-xs mt-2">Accepts: {playlist.accepts}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Track Title *</label>
            <input
              value={form.trackTitle}
              onChange={e => setForm(f => ({ ...f, trackTitle: e.target.value }))}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/50"
              placeholder="e.g. Summer Nights (feat. Artist)"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Streaming Link (optional)</label>
            <input
              value={form.releaseLink}
              onChange={e => setForm(f => ({ ...f, releaseLink: e.target.value }))}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/50"
              placeholder="https://open.spotify.com/track/..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Pitch Message *</label>
            <textarea
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              rows={4}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/50 resize-none"
              placeholder="Tell the curator why your track fits their playlist. Include genre, mood, and any relevant achievements or context..."
              required
            />
            <p className="text-white/25 text-xs mt-1">Tip: Be specific about how your track fits this playlist's vibe</p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-white/40">
              Balance: <span className="text-white font-bold">{balance.toLocaleString()}</span> credits
              {balance < cost && <span className="text-[#FF5252] ml-2">— Insufficient</span>}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-white/40 hover:text-white bg-white/[0.05] transition-all">Cancel</button>
              <button
                type="submit"
                disabled={submitting || balance < cost}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}
              >
                <Send size={14} />
                {submitting ? 'Sending...' : `Pitch for ${cost} cr`}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export function PlaylistMarketplacePage() {
  const { token, user } = useAuth();
  const [curators, setCurators] = useState<any[]>([]);
  const [myPitches, setMyPitches] = useState<any[]>([]);
  const [receivedPitches, setReceivedPitches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'browse' | 'mypitches' | 'received'>('browse');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [search, setSearch] = useState('');
  const [pitchModal, setPitchModal] = useState<{ playlist: any; curator: any } | null>(null);
  const [creditBalance, setCreditBalance] = useState(user?.credits || 0);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.getMarketplaceCurators(token).catch(() => ({ curators: [] })),
      api.getMyPitches(token).catch(() => ({ pitches: [] })),
      (user?.role === 'curator' ? api.getReceivedPitches(token) : Promise.resolve({ pitches: [] })).catch(() => ({ pitches: [] })),
      api.getCredits(token).catch(() => ({ balance: 0 })),
    ]).then(([curatorsData, pitchesData, receivedData, creditsData]) => {
      setCurators(curatorsData.curators || []);
      setMyPitches(pitchesData.pitches || []);
      setReceivedPitches(receivedData.pitches || []);
      setCreditBalance(creditsData.balance || 0);
    }).finally(() => setLoading(false));
  }, [token, user?.role]);

  // ── Plan gate — Starter users cannot access Playlist Marketplace ──────────
  if (!planHasAccess(user?.plan || 'starter', 'growth')) {
    return (
      <UpgradeWall
        requiredPlan="growth"
        featureName="Playlist Marketplace"
        featureDesc="Pitch your music directly to curators and get placed on editorial playlists — available on Growth and above."
      />
    );
  }

  const handlePitchSubmit = async (data: any) => {
    await api.submitPitch(token!, data);
    const pitchesData = await api.getMyPitches(token!);
    setMyPitches(pitchesData.pitches || []);
    const creditsData = await api.getCredits(token!);
    setCreditBalance(creditsData.balance || 0);
  };

  const handleUpdatePitch = async (pitchId: string, updates: any) => {
    await api.updatePitch(token!, pitchId, updates);
    const received = await api.getReceivedPitches(token!);
    setReceivedPitches(received.pitches || []);
    toast.success('Pitch updated');
  };

  const filteredCurators = curators.filter(c => {
    const matchGenre = selectedGenre === 'All' || c.genre?.includes(selectedGenre);
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.playlists?.some((p: any) => p.name.toLowerCase().includes(search.toLowerCase()));
    return matchGenre && matchSearch;
  });

  const tabs = [
    { id: 'browse', label: 'Browse Playlists', count: null },
    { id: 'mypitches', label: 'My Pitches', count: myPitches.length },
    ...(user?.role === 'curator' ? [{ id: 'received', label: 'Received Pitches', count: receivedPitches.filter(p => p.status === 'pending').length }] : []),
  ];

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Playlist Marketplace</h1>
          <p className="text-white/40 text-sm mt-1">Pitch your music directly to playlist curators</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#111111] border border-[#7B5FFF]/20 rounded-xl">
          <Zap size={14} className="text-[#00C4FF]" />
          <span className="text-white font-bold">{creditBalance.toLocaleString()}</span>
          <span className="text-white/40 text-sm">credits</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl mb-6 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-gradient-to-r from-[#7B5FFF] to-[#D63DF6] text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
          >
            {tab.label}
            {tab.count !== null && tab.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-[#7B5FFF]/20 text-[#7B5FFF]'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Browse Tab */}
      {activeTab === 'browse' && (
        <div>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-[#111111] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/40"
                placeholder="Search playlists or curators..."
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {GENRES.map(g => (
                <button
                  key={g}
                  onClick={() => setSelectedGenre(g)}
                  className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition-all ${selectedGenre === g ? 'bg-[#7B5FFF] text-white' : 'bg-white/[0.05] text-white/50 hover:text-white border border-white/[0.08]'}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map(i => <div key={i} className="h-64 bg-white/[0.03] rounded-2xl animate-pulse" />)}
            </div>
          ) : filteredCurators.length === 0 ? (
            <div className="text-center py-16">
              <Radio size={36} className="text-white/20 mx-auto mb-3" />
              <p className="text-white/40">No curators found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCurators.map(curator => (
                <motion.div
                  key={curator.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#111111] border border-white/[0.06] rounded-2xl overflow-hidden"
                >
                  {/* Curator Header */}
                  <div className="px-5 py-4 flex items-center gap-3 border-b border-white/[0.04]">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}>
                      {curator.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-white font-bold text-sm">{curator.name}</div>
                      <div className="text-white/40 text-xs">{curator.genre}</div>
                    </div>
                    <div className="ml-auto flex items-center gap-1 text-xs text-white/30">
                      <Music size={11} />{curator.playlists?.length || 0} playlists
                    </div>
                  </div>

                  {/* Playlists */}
                  <div className="divide-y divide-white/[0.04]">
                    {(curator.playlists || []).map((playlist: any) => (
                      <div key={playlist.id} className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-all group">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#7B5FFF]/20 to-[#D63DF6]/20 flex-shrink-0">
                          <Disc3 size={16} className="text-[#D63DF6]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-semibold text-sm">{playlist.name}</div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-white/40 text-xs flex items-center gap-1">
                              <Users size={10} />{playlist.followers?.toLocaleString()} followers
                            </span>
                            <span className="text-white/30 text-xs">{playlist.genre}</span>
                          </div>
                          <p className="text-white/25 text-xs mt-0.5 truncate">Accepts: {playlist.accepts}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right">
                            <div className="flex items-center gap-1 justify-end">
                              <Zap size={11} className="text-[#00C4FF]" />
                              <span className="text-white font-bold text-sm">{playlist.creditCost}</span>
                            </div>
                            <div className="text-white/25 text-xs">credits</div>
                          </div>
                          <button
                            onClick={() => setPitchModal({ playlist, curator })}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-all hover:opacity-90"
                            style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}
                          >
                            <Send size={11} /> Pitch
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Pitches Tab */}
      {activeTab === 'mypitches' && (
        <div>
          {myPitches.length === 0 ? (
            <div className="text-center py-16">
              <Send size={36} className="text-white/20 mx-auto mb-3" />
              <p className="text-white/40 text-sm font-medium">No pitches submitted yet</p>
              <p className="text-white/25 text-xs mt-1 mb-4">Browse playlists and submit your first pitch</p>
              <button onClick={() => setActiveTab('browse')} className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}>
                Browse Playlists
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myPitches.map(pitch => {
                const s = STATUS_CONFIG[pitch.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                const Icon = s.icon;
                return (
                  <motion.div
                    key={pitch.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#111111] border border-white/[0.06] rounded-2xl p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1.5" style={{ background: s.bg, color: s.color }}>
                            <Icon size={11} /> {s.label}
                          </div>
                          <span className="text-white/30 text-xs">{new Date(pitch.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="text-white font-bold text-sm truncate">{pitch.trackTitle}</div>
                        <div className="text-white/50 text-xs mt-0.5">
                          → <span className="text-white/70">{pitch.playlistName}</span>
                          <span className="text-white/30 mx-1">by</span>{pitch.curatorName}
                        </div>
                        {pitch.message && (
                          <p className="text-white/30 text-xs mt-2 line-clamp-2">{pitch.message}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-white/30 text-xs flex-shrink-0">
                        <Zap size={11} className="text-[#00C4FF]" />
                        {pitch.creditCost}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Received Pitches Tab (Curator only) */}
      {activeTab === 'received' && user?.role === 'curator' && (
        <div>
          {receivedPitches.length === 0 ? (
            <div className="text-center py-16">
              <Disc3 size={36} className="text-white/20 mx-auto mb-3" />
              <p className="text-white/40 text-sm">No pitches received yet</p>
              <p className="text-white/25 text-xs mt-1">Artists will pitch their tracks to your playlists here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {receivedPitches.map(pitch => {
                const s = STATUS_CONFIG[pitch.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                const Icon = s.icon;
                return (
                  <motion.div key={pitch.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-[#111111] border border-white/[0.06] rounded-2xl p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1.5" style={{ background: s.bg, color: s.color }}>
                            <Icon size={11} /> {s.label}
                          </div>
                        </div>
                        <div className="text-white font-bold">{pitch.trackTitle}</div>
                        <div className="text-white/40 text-xs mt-0.5">by {pitch.artistName} → {pitch.playlistName}</div>
                      </div>
                      <span className="text-white/25 text-xs">{new Date(pitch.createdAt).toLocaleDateString()}</span>
                    </div>
                    {pitch.message && (
                      <p className="text-white/50 text-sm bg-white/[0.03] rounded-lg p-3 mb-3">{pitch.message}</p>
                    )}
                    {pitch.status === 'pending' && (
                      <div className="flex gap-2">
                        <button onClick={() => handleUpdatePitch(pitch.id, { status: 'reviewing' })}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#00C4FF]/30 text-[#00C4FF] hover:bg-[#00C4FF]/10 transition-all">
                          <Star size={11} /> Reviewing
                        </button>
                        <button onClick={() => handleUpdatePitch(pitch.id, { status: 'accepted' })}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#10B981]/30 text-[#10B981] hover:bg-[#10B981]/10 transition-all">
                          <CheckCircle size={11} /> Accept
                        </button>
                        <button onClick={() => handleUpdatePitch(pitch.id, { status: 'rejected' })}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#FF5252]/30 text-[#FF5252] hover:bg-[#FF5252]/10 transition-all">
                          <XCircle size={11} /> Decline
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Pitch Modal */}
      <AnimatePresence>
        {pitchModal && (
          <PitchModal
            playlist={pitchModal.playlist}
            curator={pitchModal.curator}
            onClose={() => setPitchModal(null)}
            onSubmit={handlePitchSubmit}
            balance={creditBalance}
          />
        )}
      </AnimatePresence>
    </div>
  );
}