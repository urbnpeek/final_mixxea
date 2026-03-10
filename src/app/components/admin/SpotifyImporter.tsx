// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — Spotify Playlist Importer
//  Search Spotify's entire catalog of public playlists and import them
//  directly into the Creator Network — no user login required (Client Creds).
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../dashboard/AuthContext';
import * as api from '../dashboard/api';
import { toast } from 'sonner';
import {
  Search, Music, X, Check, Plus, RefreshCw, Download,
  ExternalLink, Users, Play, ChevronLeft, ChevronRight,
  Tag, Layers, Grid3x3, Filter, CheckSquare, Square,
  Globe, Sparkles, TrendingUp, AlertCircle, Link,
} from 'lucide-react';

// ── Helper ─────────────────────────────────────────────────────────────────────
function fmtNum(n: number) {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function tierFor(followers: number) {
  if (followers >= 2_000_000) return { label: 'Elite',    color: '#F59E0B' };
  if (followers >= 500_000)   return { label: 'Premium',  color: '#D63DF6' };
  if (followers >= 100_000)   return { label: 'Standard', color: '#7B5FFF' };
  if (followers >= 10_000)    return { label: 'Micro',    color: '#00C4FF' };
  return                              { label: 'Nano',     color: '#6B7280' };
}

// ── Tabs ───────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'search',    label: 'Keyword Search',    icon: Search },
  { id: 'browse',   label: 'Browse by Genre',    icon: Grid3x3 },
  { id: 'user',     label: 'By Curator Profile', icon: Users },
  { id: 'direct',   label: 'Paste URL / ID',     icon: Link },
];

// ── Playlist Result Card ───────────────────────────────────────────────────────
function PlaylistCard({ pl, selected, onToggle, onPreview }: {
  pl: any; selected: boolean; onToggle: () => void; onPreview: () => void;
}) {
  const tier = tierFor(pl.followers || 0);

  return (
    <motion.div layout
      className={`relative bg-[#0E0E0E] rounded-2xl overflow-hidden border cursor-pointer transition-all hover:border-white/20 ${selected ? 'border-[#1DB954]/50 shadow-[0_0_18px_#1DB95412]' : 'border-white/[0.07]'}`}
      onClick={onToggle}>

      {/* Checkbox overlay */}
      <div className="absolute top-2.5 right-2.5 z-10">
        {selected
          ? <div className="w-5 h-5 rounded-full bg-[#1DB954] flex items-center justify-center shadow-lg"><Check size={10} className="text-black" /></div>
          : <div className="w-5 h-5 rounded-full border border-white/20 bg-black/40 backdrop-blur-sm" />
        }
      </div>

      {/* Cover Art */}
      <div className="relative w-full aspect-square bg-[#1DB954]/10 overflow-hidden">
        {pl.imageUrl ? (
          <img src={pl.imageUrl} alt={pl.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music size={32} className="text-[#1DB954]/40" />
          </div>
        )}
        {/* Track count badge */}
        <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm rounded-lg px-2 py-0.5 flex items-center gap-1">
          <Play size={8} className="text-white/60" />
          <span className="text-[10px] text-white/60">{pl.trackCount} tracks</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-xs font-bold text-white leading-tight line-clamp-2 mb-1">{pl.name}</p>
        <p className="text-[10px] text-white/40 truncate mb-2">by {pl.owner?.name || 'Spotify'}</p>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-white">{fmtNum(pl.followers || 0)}</p>
            <p className="text-[9px] text-white/30">followers</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{ color: tier.color, background: `${tier.color}18` }}>
              {tier.label}
            </span>
            <button onClick={e => { e.stopPropagation(); onPreview(); }}
              className="flex items-center gap-1 text-[9px] text-[#1DB954] hover:text-white transition-colors">
              <ExternalLink size={8} /> Open
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Importer ──────────────────────────────────────────────────────────────
export function SpotifyImporter({ onImported, onClose }: { onImported: (creators: any[]) => void; onClose: () => void }) {
  const { token } = useAuth();

  // ── State ──
  const [tab, setTab]         = useState('search');
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [total, setTotal]     = useState(0);
  const [offset, setOffset]   = useState(0);
  const LIMIT                 = 20;
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [costPerPlacement, setCostPerPlacement] = useState(0);

  // Genre browse
  const [categories, setCategories] = useState<any[]>([]);
  const [catLoading, setCatLoading] = useState(false);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  // User playlists
  const [userId, setUserId] = useState('');

  // Direct paste
  const [directInput, setDirectInput] = useState('');
  const [directResult, setDirectResult] = useState<any | null>(null);
  const [directLoading, setDirectLoading] = useState(false);

  const queryRef = useRef(query);
  queryRef.current = query;

  // ── Load categories once ──────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    setCatLoading(true);
    api.spotifyGetCategories(token).then(d => {
      setCategories(d.categories || []);
    }).catch(err => {
      console.error('[SpotifyImporter] categories:', err);
      toast.error('Could not load Spotify genres — check API credentials');
    }).finally(() => setCatLoading(false));
  }, [token]);

  // ── Search ────────────────────────────────────────────────────────────────
  const runSearch = useCallback(async (q: string, off = 0) => {
    if (!q.trim() || !token) return;
    setLoading(true);
    setResults([]);
    try {
      const d = await api.spotifySearch(token, q, LIMIT, off);
      setResults(d.playlists || []);
      setTotal(d.total || 0);
      setOffset(off);
    } catch (err: any) {
      console.error('[SpotifyImporter] search:', err);
      toast.error(`Spotify search failed: ${err.message}`);
    } finally { setLoading(false); }
  }, [token]);

  // ── Browse category ────────────────────────────────────────────────────────
  const browseCategory = useCallback(async (catId: string, off = 0) => {
    if (!token) return;
    setLoading(true);
    setResults([]);
    try {
      const d = await api.spotifyGetCategoryPlaylists(token, catId, LIMIT, off);
      setResults(d.playlists || []);
      setTotal(d.total || 0);
      setOffset(off);
    } catch (err: any) {
      console.error('[SpotifyImporter] browse:', err);
      toast.error(`Browse failed: ${err.message}`);
    } finally { setLoading(false); }
  }, [token]);

  // ── User playlists ─────────────────────────────────────────────────────────
  const loadUserPlaylists = useCallback(async (uid: string) => {
    if (!uid.trim() || !token) return;
    setLoading(true);
    setResults([]);
    try {
      const d = await api.spotifyGetUserPlaylists(token, uid.trim());
      setResults(d.playlists || []);
      setTotal(d.total || 0);
      setOffset(0);
    } catch (err: any) {
      console.error('[SpotifyImporter] user:', err);
      toast.error(`Could not load user playlists: ${err.message}`);
    } finally { setLoading(false); }
  }, [token]);

  // ── Direct fetch ───────────────────────────────────────────────────────────
  const fetchDirect = useCallback(async () => {
    if (!directInput.trim() || !token) return;
    setDirectLoading(true);
    setDirectResult(null);
    try {
      const d = await api.spotifyGetPlaylist(token, directInput.trim());
      setDirectResult(d.playlist);
    } catch (err: any) {
      console.error('[SpotifyImporter] direct:', err);
      toast.error(`Playlist not found: ${err.message}`);
    } finally { setDirectLoading(false); }
  }, [directInput, token]);

  // ── Selection ──────────────────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === results.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(results.map(p => p.id)));
    }
  };

  // ── Import ─────────────────────────────────────────────────────────────────
  const handleImport = async () => {
    if (selected.size === 0) { toast.error('Select at least one playlist'); return; }
    const allResults = [...results, ...(directResult ? [directResult] : [])];
    const toImport   = allResults.filter(p => selected.has(p.id));
    setImporting(true);
    try {
      const r = await api.spotifyImport(token!, toImport, costPerPlacement);
      toast.success(`✅ Imported ${r.imported} playlist${r.imported !== 1 ? 's' : ''}${r.skipped > 0 ? ` (${r.skipped} already in network)` : ''}`);
      onImported(r.importedItems || []);
      setSelected(new Set());
    } catch (err: any) {
      toast.error(`Import failed: ${err.message}`);
    } finally { setImporting(false); }
  };

  // ── Keyboard search ────────────────────────────────────────────────────────
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') runSearch(query);
  };

  const totalPages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-stretch justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        className="bg-[#080808] border border-white/[0.08] rounded-2xl w-full max-w-5xl flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#1DB954]/15 flex items-center justify-center">
              <Music size={16} className="text-[#1DB954]" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">Spotify Playlist Importer</h2>
              <p className="text-[11px] text-white/40">Fetch any public playlist → Creator Network</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {selected.size > 0 && (
              <div className="flex items-center gap-2">
                <div>
                  <label className="block text-[9px] text-white/30 mb-0.5">Cost/Placement (USD)</label>
                  <input type="number" min="0" value={costPerPlacement}
                    onChange={e => setCostPerPlacement(parseInt(e.target.value) || 0)}
                    className="w-20 bg-white/[0.06] border border-white/[0.10] rounded-lg px-2 py-1 text-xs text-white focus:outline-none" />
                </div>
                <button onClick={handleImport} disabled={importing}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#1DB954,#1aa34a)' }}>
                  <Download size={13} />
                  {importing ? 'Importing…' : `Import ${selected.size} Selected`}
                </button>
              </div>
            )}
            <button onClick={onClose} className="p-1.5 text-white/40 hover:text-white rounded-xl hover:bg-white/[0.06]"><X size={16} /></button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 px-5 pt-3 flex-shrink-0">
          {TABS.map(t => {
            const TIcon = t.icon;
            return (
              <button key={t.id} onClick={() => { setTab(t.id); setResults([]); setSelected(new Set()); }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${tab === t.id ? 'bg-[#1DB954]/15 text-[#1DB954]' : 'text-white/40 hover:text-white/70 hover:bg-white/[0.05]'}`}>
                <TIcon size={12} />{t.label}
              </button>
            );
          })}
        </div>

        {/* ── Search Controls ── */}
        <div className="px-5 py-3 flex-shrink-0">
          {tab === 'search' && (
            <div className="flex gap-2">
              <div className="flex items-center gap-2 flex-1 bg-[#111] border border-white/[0.08] rounded-xl px-3 py-2.5">
                <Search size={13} className="text-white/30 flex-shrink-0" />
                <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={onKeyDown}
                  placeholder="Search: hip-hop, afrobeats, lo-fi, house, R&B…"
                  className="flex-1 bg-transparent text-sm text-white placeholder-white/30 focus:outline-none" />
                {query && <button onClick={() => { setQuery(''); setResults([]); }}><X size={13} className="text-white/30" /></button>}
              </div>
              <button onClick={() => runSearch(query)} disabled={loading || !query.trim()}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 flex items-center gap-2"
                style={{ background: 'linear-gradient(135deg,#1DB954,#1aa34a)' }}>
                {loading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                Search
              </button>
            </div>
          )}

          {tab === 'browse' && (
            <div>
              <p className="text-xs text-white/40 mb-3">Choose a Spotify genre category to browse editorial playlists:</p>
              {catLoading ? (
                <div className="flex gap-2 flex-wrap">
                  {[1,2,3,4,5,6].map(i => <div key={i} className="h-8 w-24 bg-white/[0.05] rounded-xl animate-pulse" />)}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {categories.map(cat => (
                    <button key={cat.id}
                      onClick={() => { setSelectedCat(cat.id); browseCategory(cat.id); }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${selectedCat === cat.id ? 'border-transparent bg-[#1DB954]/20 text-[#1DB954]' : 'border-white/[0.07] text-white/50 hover:text-white hover:border-white/20'}`}>
                      {cat.iconUrl && <img src={cat.iconUrl} alt="" className="w-4 h-4 rounded object-cover opacity-70" />}
                      {cat.name}
                    </button>
                  ))}
                  {categories.length === 0 && (
                    <div className="flex items-center gap-2 text-sm text-white/40">
                      <AlertCircle size={14} />
                      <span>Could not load categories — check your Spotify API credentials in Supabase secrets</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'user' && (
            <div className="flex gap-2">
              <div className="flex items-center gap-2 flex-1 bg-[#111] border border-white/[0.08] rounded-xl px-3 py-2.5">
                <Users size={13} className="text-white/30 flex-shrink-0" />
                <input value={userId} onChange={e => setUserId(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && loadUserPlaylists(userId)}
                  placeholder="Spotify user ID or profile URL (e.g. spotify:user:spotify)"
                  className="flex-1 bg-transparent text-sm text-white placeholder-white/30 focus:outline-none" />
              </div>
              <button onClick={() => loadUserPlaylists(userId)} disabled={loading || !userId.trim()}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#1DB954,#1aa34a)' }}>
                {loading ? <RefreshCw size={14} className="animate-spin" /> : 'Load Playlists'}
              </button>
            </div>
          )}

          {tab === 'direct' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex items-center gap-2 flex-1 bg-[#111] border border-white/[0.08] rounded-xl px-3 py-2.5">
                  <Link size={13} className="text-white/30 flex-shrink-0" />
                  <input value={directInput} onChange={e => setDirectInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && fetchDirect()}
                    placeholder="Paste playlist URL or ID — e.g. https://open.spotify.com/playlist/37i9dQZF1DX..."
                    className="flex-1 bg-transparent text-sm text-white placeholder-white/30 focus:outline-none" />
                  {directInput && <button onClick={() => { setDirectInput(''); setDirectResult(null); }}><X size={13} className="text-white/30" /></button>}
                </div>
                <button onClick={fetchDirect} disabled={directLoading || !directInput.trim()}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 flex items-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#1DB954,#1aa34a)' }}>
                  {directLoading ? <RefreshCw size={14} className="animate-spin" /> : 'Fetch'}
                </button>
              </div>
              <AnimatePresence>
                {directResult && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${selected.has(directResult.id) ? 'border-[#1DB954]/50 bg-[#1DB954]/08' : 'border-white/[0.08] bg-white/[0.03] hover:border-white/20'}`}
                    onClick={() => toggleSelect(directResult.id)}>
                    {directResult.imageUrl && (
                      <img src={directResult.imageUrl} alt={directResult.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white">{directResult.name}</p>
                      <p className="text-xs text-white/40 mt-0.5">by {directResult.owner?.name}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className="text-[#1DB954] font-bold">{fmtNum(directResult.followers)} followers</span>
                        <span className="text-white/30">{directResult.trackCount} tracks</span>
                        <span className="text-white/30 capitalize">{tierFor(directResult.followers).label}</span>
                      </div>
                      {directResult.description && (
                        <p className="text-[11px] text-white/30 mt-1 line-clamp-1">{directResult.description}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {selected.has(directResult.id)
                        ? <div className="w-6 h-6 rounded-full bg-[#1DB954] flex items-center justify-center"><Check size={12} className="text-black" /></div>
                        : <div className="w-6 h-6 rounded-full border border-white/20" />
                      }
                      <a href={directResult.externalUrl} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1 text-[11px] text-[#1DB954] hover:underline">
                        <ExternalLink size={10} /> Open in Spotify
                      </a>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* ── Results ── */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 min-h-0">
          {results.length > 0 && (
            <>
              {/* Bulk actions bar */}
              <div className="flex items-center justify-between mb-3 sticky top-0 bg-[#080808]/95 backdrop-blur-sm py-2 z-10">
                <div className="flex items-center gap-3">
                  <button onClick={toggleAll}
                    className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors">
                    {selected.size === results.length
                      ? <><CheckSquare size={13} className="text-[#1DB954]" /> Deselect all</>
                      : <><Square size={13} /> Select all ({results.length})</>
                    }
                  </button>
                  {selected.size > 0 && (
                    <span className="text-xs font-bold text-[#1DB954]">{selected.size} selected</span>
                  )}
                </div>
                <p className="text-[11px] text-white/30">
                  {total > 0 ? `${total.toLocaleString()} total results · page ${currentPage} of ${totalPages}` : `${results.length} results`}
                </p>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {results.map(pl => (
                  <PlaylistCard
                    key={pl.id}
                    pl={pl}
                    selected={selected.has(pl.id)}
                    onToggle={() => toggleSelect(pl.id)}
                    onPreview={() => window.open(pl.externalUrl, '_blank')}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-5">
                  <button disabled={currentPage <= 1 || loading}
                    onClick={() => {
                      const newOffset = offset - LIMIT;
                      if (tab === 'search') runSearch(query, newOffset);
                      else if (tab === 'browse' && selectedCat) browseCategory(selectedCat, newOffset);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-white/50 bg-white/[0.05] hover:bg-white/[0.10] disabled:opacity-30 transition-all">
                    <ChevronLeft size={13} /> Prev
                  </button>
                  <span className="text-xs text-white/40">Page {currentPage} / {totalPages}</span>
                  <button disabled={currentPage >= totalPages || loading}
                    onClick={() => {
                      const newOffset = offset + LIMIT;
                      if (tab === 'search') runSearch(query, newOffset);
                      else if (tab === 'browse' && selectedCat) browseCategory(selectedCat, newOffset);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-white/50 bg-white/[0.05] hover:bg-white/[0.10] disabled:opacity-30 transition-all">
                    Next <ChevronRight size={13} />
                  </button>
                </div>
              )}
            </>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden border border-white/[0.05] animate-pulse">
                  <div className="aspect-square bg-white/[0.04]" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-white/[0.05] rounded" />
                    <div className="h-2 w-2/3 bg-white/[0.03] rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && results.length === 0 && tab !== 'direct' && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#1DB954]/10 flex items-center justify-center mb-4">
                <Music size={28} className="text-[#1DB954]/60" />
              </div>
              <p className="text-white/30 text-sm mb-2">
                {tab === 'search'
                  ? 'Search for Spotify playlists by genre, artist, mood or keyword'
                  : tab === 'browse'
                  ? 'Select a genre category above to browse editorial playlists'
                  : 'Enter a Spotify user ID or profile URL above'}
              </p>
              {tab === 'search' && (
                <div className="flex flex-wrap gap-2 justify-center mt-3">
                  {['afrobeats','hip-hop','lo-fi','house','R&B','drill','amapiano','dancehall'].map(suggestion => (
                    <button key={suggestion} onClick={() => { setQuery(suggestion); runSearch(suggestion); }}
                      className="px-3 py-1.5 rounded-xl text-xs text-[#1DB954] border border-[#1DB954]/25 hover:bg-[#1DB954]/10 transition-all">
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Bottom Import Bar ── */}
        {selected.size > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 px-5 py-3 border-t border-white/[0.07] bg-[#1DB954]/05 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#1DB954] animate-pulse" />
              <span className="text-sm font-bold text-white">{selected.size} playlist{selected.size !== 1 ? 's' : ''} selected</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-white/40">Default cost/placement:</label>
              <input type="number" min="0" value={costPerPlacement}
                onChange={e => setCostPerPlacement(parseInt(e.target.value) || 0)}
                className="w-20 bg-white/[0.06] border border-white/[0.10] rounded-lg px-2 py-1 text-xs text-white focus:outline-none" />
              <span className="text-xs text-white/30">USD (can edit per creator later)</span>
            </div>
            <div className="ml-auto flex gap-2">
              <button onClick={() => setSelected(new Set())} className="px-3 py-2 text-xs text-white/40 hover:text-white">Clear</button>
              <button onClick={handleImport} disabled={importing}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-black disabled:opacity-50"
                style={{ background: '#1DB954' }}>
                <Download size={14} />
                {importing ? 'Importing…' : `Import ${selected.size} to Creator Network`}
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
