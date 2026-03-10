import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './AuthContext';
import * as api from './api';
import { toast } from 'sonner';
import {
  Music, Plus, Upload, Globe, CircleCheck, Clock, CircleX, FileText,
  Trash2, Pencil, X, Search, Disc, Radio, ChevronDown, ChevronUp,
  Headphones, FileAudio, CircleAlert, ArrowLeft, ArrowRight,
  Calendar, Shield, Users, Save, Send, Image, CirclePause,
  Archive, List, Loader, Copy,
} from 'lucide-react';
import { AlbumArtGenerator } from './AlbumArtGenerator';
import {
  STATUS_MAP, STORES, GENRES, LANGUAGES, RELEASE_TYPES, TERRITORIES,
  computeCompleteness, getStatusCfg,
} from './releaseConstants';

// ── Step definitions ───────────────────────────────────────────────────────────
const STEPS = [
  { title: 'Release Basics',     icon: Disc,          desc: 'Title, type & label info' },
  { title: 'Artists & Identity', icon: Users,         desc: 'Artists, genre, cover art' },
  { title: 'Release Dates',      icon: Calendar,      desc: 'Dates & territory' },
  { title: 'Rights',             icon: Shield,        desc: 'Copyright & phonographic' },
  { title: 'Tracks',             icon: Music,         desc: 'Track listing & audio' },
  { title: 'Contributors',       icon: Users,         desc: 'Credits per track' },
  { title: 'Platforms',          icon: Globe,         desc: 'Select DSPs' },
  { title: 'Review & Submit',    icon: Send,          desc: 'Legal & submit' },
];

const FIELD = 'w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50';
const LABEL = 'block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider';

function mkTrack() {
  return { title: '', isrc: '', explicit: false, previewStart: '0:00', duration: '', lyrics: '', fileName: '', fileSize: '', composer: '', lyricist: '', producer: '', remixer: '', publisher: '' };
}

// ── Step 1: Release Basics ─────────────────────────────────────────────────────
function Step1({ form, set }: any) {
  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL}>Release Title *</label>
          <input value={form.title} onChange={e => set({ title: e.target.value })} className={FIELD} placeholder="e.g. Summer Vibes" />
        </div>
        <div>
          <label className={LABEL}>Version / Mix Title</label>
          <input value={form.versionTitle} onChange={e => set({ versionTitle: e.target.value })} className={FIELD} placeholder="e.g. Radio Edit, Extended Mix" />
        </div>
        <div>
          <label className={LABEL}>Release Type *</label>
          <select value={form.type} onChange={e => set({ type: e.target.value })} className={FIELD + ' cursor-pointer'}>
            {RELEASE_TYPES.map(t => <option key={t} value={t} className="bg-[#111]">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL}>Label Name *</label>
          <input value={form.label} onChange={e => set({ label: e.target.value })} className={FIELD} placeholder="Your label or artist name" />
        </div>
        <div className="sm:col-span-2">
          <label className={LABEL}>Catalog Number <span className="text-white/25 normal-case font-normal">— optional, leave blank if unsure</span></label>
          <input value={form.catalogNumber} onChange={e => set({ catalogNumber: e.target.value })} className={FIELD} placeholder="e.g. MX-2025-001" />
        </div>
      </div>
      <div className="p-3 bg-[#7B5FFF]/10 border border-[#7B5FFF]/20 rounded-xl text-xs text-[#7B5FFF]">
        💡 The label name will appear on all DSP stores as the credited label. Use your artist name if you're self-releasing.
      </div>
    </div>
  );
}

// ── Step 2: Artists & Identity ─────────────────────────────────────────────────
function Step2({ form, set, token, user }: any) {
  const coverRef = useRef<HTMLInputElement>(null);
  const [showArtGen, setShowArtGen] = useState(false);

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL}>Primary Artist *</label>
          <input value={form.artist} onChange={e => set({ artist: e.target.value })} className={FIELD} placeholder="Main artist / band name" />
        </div>
        <div>
          <label className={LABEL}>Featured Artists</label>
          <input value={form.featuredArtists} onChange={e => set({ featuredArtists: e.target.value })} className={FIELD} placeholder="Comma-separated: Artist A, Artist B" />
        </div>
        <div>
          <label className={LABEL}>Primary Genre *</label>
          <select value={form.genre} onChange={e => set({ genre: e.target.value })} className={FIELD + ' cursor-pointer'}>
            <option value="" className="bg-[#111]">Select genre</option>
            {GENRES.map(g => <option key={g} value={g} className="bg-[#111]">{g}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL}>Sub-Genre</label>
          <input value={form.subgenre} onChange={e => set({ subgenre: e.target.value })} className={FIELD} placeholder="e.g. Melodic House, Afrobeat Pop" />
        </div>
        <div>
          <label className={LABEL}>Primary Language *</label>
          <select value={form.language} onChange={e => set({ language: e.target.value })} className={FIELD + ' cursor-pointer'}>
            {LANGUAGES.map(l => <option key={l} value={l} className="bg-[#111]">{l}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3 self-end pb-2">
          <button type="button"
            onClick={() => set({ explicit: !form.explicit })}
            className={`relative w-11 h-6 rounded-full transition-all flex-shrink-0 ${form.explicit ? 'bg-[#FF5252]' : 'bg-white/10'}`}>
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${form.explicit ? 'left-6' : 'left-1'}`} />
          </button>
          <div>
            <p className="text-sm text-white font-medium">Explicit Content</p>
            <p className="text-xs text-white/40">Mark as explicit (E) on all platforms</p>
          </div>
        </div>
      </div>

      {/* Cover Art */}
      <div>
        <label className={LABEL}>Cover Artwork</label>
        <div className="flex items-start gap-4">
          <div className="w-24 h-24 rounded-xl border border-white/[0.08] bg-white/[0.03] flex items-center justify-center flex-shrink-0 overflow-hidden">
            {form.coverArt
              ? <img src={form.coverArt} alt="Cover" className="w-full h-full object-cover rounded-xl" />
              : <Image size={24} className="text-white/20" />}
          </div>
          <div className="flex-1 space-y-2">
            <input ref={coverRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 10 * 1024 * 1024) { toast.error('Cover art must be under 10MB'); return; }
                const reader = new FileReader();
                reader.onload = () => set({ coverArt: reader.result as string, coverArtFileName: file.name });
                reader.readAsDataURL(file);
                toast.success(`Cover art attached: ${file.name}`);
              }} />
            <button type="button" onClick={() => coverRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white hover:bg-white/[0.08] transition-all">
              <Upload size={14} /> Upload Artwork
            </button>
            <button type="button" onClick={() => setShowArtGen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#7B5FFF]/10 border border-[#7B5FFF]/20 rounded-xl text-sm text-[#7B5FFF] hover:bg-[#7B5FFF]/20 transition-all">
              <Music size={14} /> Generate with AI
            </button>
            <p className="text-xs text-white/30">Required: 3000×3000 px minimum, JPG or PNG, RGB colour space</p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showArtGen && (
          <AlbumArtGenerator
            artistName={form.artist} releaseTitle={form.title}
            plan={(user as any)?.plan || 'starter'} credits={(user as any)?.credits || 0}
            token={token!}
            onUse={url => { set({ coverArt: url, coverArtFileName: 'ai-generated.png' }); setShowArtGen(false); }}
            onClose={() => setShowArtGen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Step 3: Release Dates ──────────────────────────────────────────────────────
function Step3({ form, set }: any) {
  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL}>Release Date *</label>
          <input type="date" value={form.releaseDate} onChange={e => set({ releaseDate: e.target.value })} className={FIELD} />
          <p className="text-xs text-white/30 mt-1">Minimum 7 days from today recommended</p>
        </div>
        <div>
          <label className={LABEL}>Pre-Order Date <span className="text-white/25 normal-case font-normal">— optional</span></label>
          <input type="date" value={form.preOrderDate} onChange={e => set({ preOrderDate: e.target.value })} className={FIELD} />
          <p className="text-xs text-white/30 mt-1">Must be before release date</p>
        </div>
        <div>
          <label className={LABEL}>Original Release Date <span className="text-white/25 normal-case font-normal">— for re-releases</span></label>
          <input type="date" value={form.originalReleaseDate} onChange={e => set({ originalReleaseDate: e.target.value })} className={FIELD} />
          <p className="text-xs text-white/30 mt-1">Leave blank for new releases</p>
        </div>
        <div>
          <label className={LABEL}>Territory Rights</label>
          <select value={form.territory} onChange={e => set({ territory: e.target.value })} className={FIELD + ' cursor-pointer'}>
            {TERRITORIES.map(t => <option key={t.id} value={t.id} className="bg-[#111]">{t.label}</option>)}
          </select>
        </div>
      </div>
      <div className="p-3 bg-[#00C4FF]/10 border border-[#00C4FF]/20 rounded-xl text-xs text-[#00C4FF] space-y-1">
        <p className="font-semibold">📅 Release Date Guidelines</p>
        <p>• Standard releases: allow 5–10 business days for delivery to DSPs</p>
        <p>• Beatport / Traxsource: allow 4–6 weeks for electronic music platforms</p>
        <p>• Pre-orders: available on Apple Music & Amazon Music only</p>
      </div>
    </div>
  );
}

// ── Step 4: Rights & Metadata ──────────────────────────────────────────────────
function Step4({ form, set }: any) {
  const yr = new Date().getFullYear();
  return (
    <div className="space-y-5">
      <div className="space-y-4">
        <div>
          <label className={LABEL}>Copyright Line (©) *</label>
          <input value={form.copyrightLine} onChange={e => set({ copyrightLine: e.target.value })} className={FIELD}
            placeholder={`© ${yr} ${form.artist || 'Artist Name'}`} />
          <p className="text-xs text-white/30 mt-1">Covers the composition / songwriting rights</p>
        </div>
        <div>
          <label className={LABEL}>Phonographic Copyright Line (℗) *</label>
          <input value={form.phonographicLine} onChange={e => set({ phonographicLine: e.target.value })} className={FIELD}
            placeholder={`℗ ${yr} ${form.label || 'Label Name'}`} />
          <p className="text-xs text-white/30 mt-1">Covers the sound recording / master rights</p>
        </div>
        <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl space-y-2">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Auto-fill helpers</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => set({ copyrightLine: `© ${yr} ${form.artist || 'Artist Name'}` })}
              className="px-3 py-1.5 rounded-lg text-xs text-[#7B5FFF] bg-[#7B5FFF]/10 hover:bg-[#7B5FFF]/20 transition-all">
              Auto © with Artist
            </button>
            <button type="button" onClick={() => set({ phonographicLine: `℗ ${yr} ${form.label || 'Label Name'}` })}
              className="px-3 py-1.5 rounded-lg text-xs text-[#D63DF6] bg-[#D63DF6]/10 hover:bg-[#D63DF6]/20 transition-all">
              Auto ℗ with Label
            </button>
          </div>
        </div>
        {form.upc && (
          <div className="p-3 bg-[#10B981]/10 border border-[#10B981]/20 rounded-xl text-xs">
            <p className="text-[#10B981] font-semibold">UPC Assigned by MIXXEA</p>
            <p className="text-white/60 font-mono mt-1">{form.upc}</p>
          </div>
        )}
      </div>
      <div className="p-3 bg-[#7B5FFF]/10 border border-[#7B5FFF]/20 rounded-xl text-xs text-[#7B5FFF]">
        💡 ISRC codes will be assigned per-track in the next step. UPC will be assigned by MIXXEA upon approval.
      </div>
    </div>
  );
}

// ── Step 5: Tracks ─────────────────────────────────────────────────────────────
function Step5({ form, set }: any) {
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  const updateTrack = (i: number, field: string, val: any) =>
    set({ tracks: form.tracks.map((t: any, idx: number) => idx === i ? { ...t, [field]: val } : t) });
  const addTrack = () => set({ tracks: [...form.tracks, mkTrack()] });
  const removeTrack = (i: number) => set({ tracks: form.tracks.filter((_: any, idx: number) => idx !== i) });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/40">Add all tracks for this release. Audio files are required for distribution.</p>
        <button type="button" onClick={addTrack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#7B5FFF] bg-[#7B5FFF]/10 hover:bg-[#7B5FFF]/20 transition-all">
          <Plus size={12} /> Add Track
        </button>
      </div>

      {form.tracks.map((track: any, i: number) => (
        <div key={i} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-white/30 text-xs w-6 font-bold">{i + 1}.</span>
            <input value={track.title} onChange={e => updateTrack(i, 'title', e.target.value)}
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50"
              placeholder="Track title *" />
            {form.tracks.length > 1 && (
              <button type="button" onClick={() => removeTrack(i)} className="text-white/30 hover:text-[#FF5252] transition-colors p-1">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">ISRC</label>
              <input value={track.isrc} onChange={e => updateTrack(i, 'isrc', e.target.value)}
                className="w-full mt-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50 font-mono"
                placeholder="ISRC code" />
            </div>
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Duration</label>
              <input value={track.duration} onChange={e => updateTrack(i, 'duration', e.target.value)}
                className="w-full mt-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50 text-center"
                placeholder="3:30" />
            </div>
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Preview Start</label>
              <input value={track.previewStart} onChange={e => updateTrack(i, 'previewStart', e.target.value)}
                className="w-full mt-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50 text-center"
                placeholder="0:30" />
            </div>
            <div className="flex items-end gap-2 pb-0.5">
              <button type="button" onClick={() => updateTrack(i, 'explicit', !track.explicit)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${track.explicit ? 'bg-[#FF5252]/15 border-[#FF5252]/30 text-[#FF5252]' : 'bg-white/[0.04] border-white/[0.08] text-white/40'}`}>
                {track.explicit ? '🅴 Explicit' : 'Clean'}
              </button>
            </div>
          </div>
          {/* Audio upload */}
          <div className="flex items-center gap-2">
            <input ref={el => { fileRefs.current[i] = el; }} type="file" accept="audio/*,.wav,.mp3,.flac,.aiff,.aac" className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                updateTrack(i, 'fileName', file.name);
                updateTrack(i, 'fileSize', `${(file.size / 1024 / 1024).toFixed(1)} MB`);
                toast.success(`Audio attached: ${file.name}`);
              }} />
            <button type="button" onClick={() => fileRefs.current[i]?.click()}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${track.fileName ? 'bg-[#10B981]/15 border-[#10B981]/30 text-[#10B981]' : 'bg-white/[0.04] border-white/[0.08] text-white/40 hover:text-white hover:border-white/20'}`}>
              <FileAudio size={12} />
              {track.fileName ? `${track.fileName.replace(/\.[^.]+$/, '')} (${track.fileSize})` : 'Upload Audio File'}
            </button>
            {track.fileName && <span className="text-[10px] text-[#10B981]">✓ WAV/FLAC preferred</span>}
          </div>
          {/* Lyrics */}
          <div>
            <label className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Lyrics <span className="normal-case font-normal text-white/25">— optional</span></label>
            <textarea value={track.lyrics} onChange={e => updateTrack(i, 'lyrics', e.target.value)} rows={2}
              className="w-full mt-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50 resize-none"
              placeholder="Paste lyrics here..." />
          </div>
        </div>
      ))}

      <div className="p-3 bg-white/[0.03] border border-white/[0.05] rounded-xl text-xs text-white/40">
        💡 Upload WAV (24-bit, 44.1kHz+) or FLAC for best quality. MP3 is accepted at 320kbps minimum.
      </div>
    </div>
  );
}

// ── Step 6: Contributors ───────────────────────────────────────────────────────
function Step6({ form, set }: any) {
  const updateTrack = (i: number, field: string, val: string) =>
    set({ tracks: form.tracks.map((t: any, idx: number) => idx === i ? { ...t, [field]: val } : t) });

  return (
    <div className="space-y-4">
      <p className="text-xs text-white/40">Enter publishing and production credits for each track. These appear on DSPs and in royalty systems.</p>
      {form.tracks.map((track: any, i: number) => (
        <div key={i} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-white/70">{i + 1}. {track.title || `Track ${i + 1}`}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { field: 'composer',  label: 'Composer / Songwriter' },
              { field: 'lyricist',  label: 'Lyricist' },
              { field: 'producer',  label: 'Producer' },
              { field: 'remixer',   label: 'Remixer' },
              { field: 'publisher', label: 'Publisher / PRO' },
            ].map(({ field, label }) => (
              <div key={field}>
                <label className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">{label}</label>
                <input value={track[field] || ''} onChange={e => updateTrack(i, field, e.target.value)}
                  className="w-full mt-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50"
                  placeholder={label} />
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="p-3 bg-[#7B5FFF]/10 border border-[#7B5FFF]/20 rounded-xl text-xs text-[#7B5FFF]">
        💡 For tracks with no remixer or lyricist, leave those fields blank. Composer and Producer are the most important fields.
      </div>
    </div>
  );
}

// ── Step 7: Platforms ──────────────────────────────────────────────────────────
function Step7({ form, set }: any) {
  const toggle = (id: string) =>
    set({ stores: form.stores.includes(id) ? form.stores.filter((s: string) => s !== id) : [...form.stores, id] });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">
          DSP Platforms — <span className="text-[#7B5FFF]">{form.stores.length}/{STORES.length} selected</span>
        </label>
        <div className="flex gap-2 text-xs">
          <button type="button" onClick={() => set({ stores: STORES.map(s => s.id) })}
            className="px-2.5 py-1 rounded-lg bg-[#7B5FFF]/20 text-[#7B5FFF] hover:bg-[#7B5FFF]/30 transition-all font-semibold">
            All
          </button>
          <button type="button" onClick={() => set({ stores: [] })}
            className="px-2.5 py-1 rounded-lg bg-white/[0.05] text-white/40 hover:text-white transition-all">
            Clear
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {STORES.map(s => (
          <button key={s.id} type="button" onClick={() => toggle(s.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${form.stores.includes(s.id) ? 'text-white border-transparent' : 'border-white/[0.08] text-white/40 hover:text-white hover:border-white/20'}`}
            style={form.stores.includes(s.id) ? { background: `${s.color}25`, color: s.color, borderColor: `${s.color}40` } : {}}>
            {s.name}
          </button>
        ))}
      </div>
      {form.stores.length === 0 && <p className="text-xs text-[#FF5252]">⚠️ Select at least one platform to distribute</p>}
    </div>
  );
}

// ── Step 8: Review & Submit ────────────────────────────────────────────────────
function Step8({ form, set }: any) {
  const { score, missing } = computeCompleteness(form);
  const scoreColor = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#FF5252';

  return (
    <div className="space-y-5">
      {/* Completeness score */}
      <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Release Completeness</p>
          <span className="text-lg font-black" style={{ color: scoreColor }}>{score}%</span>
        </div>
        <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: scoreColor }} />
        </div>
        {missing.length > 0 && (
          <div className="mt-3 space-y-1">
            <p className="text-[10px] text-white/40 uppercase font-semibold">Missing fields</p>
            {missing.map(m => <p key={m} className="text-xs text-[#F59E0B]">• {m}</p>)}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="grid sm:grid-cols-2 gap-3 text-xs">
        {[
          { label: 'Title', value: form.title || '—' },
          { label: 'Artist', value: form.artist || '—' },
          { label: 'Type', value: form.type },
          { label: 'Genre', value: form.genre || '—' },
          { label: 'Release Date', value: form.releaseDate || '—' },
          { label: 'Platforms', value: `${form.stores.length} selected` },
          { label: 'Tracks', value: `${form.tracks.length} track${form.tracks.length !== 1 ? 's' : ''}` },
          { label: 'Audio Files', value: `${form.tracks.filter((t: any) => t.fileName).length}/${form.tracks.length} uploaded` },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between p-2.5 bg-white/[0.03] border border-white/[0.04] rounded-lg">
            <span className="text-white/40">{label}</span>
            <span className="text-white font-medium truncate ml-2 max-w-[150px]">{value}</span>
          </div>
        ))}
      </div>

      {/* Legal confirmations */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Legal Confirmations</p>
        {[
          { field: 'confirmRights',        label: 'I confirm that I own or control all rights to this release, including master recordings and compositions.' },
          { field: 'confirmAccuracy',      label: 'I confirm that all metadata, credits, and information provided are accurate and complete to the best of my knowledge.' },
          { field: 'confirmAuthorization', label: 'I authorise MIXXEA to distribute this release on my behalf to the selected platforms under our distribution agreement.' },
        ].map(({ field, label }) => (
          <label key={field} className="flex items-start gap-3 cursor-pointer p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl hover:bg-white/[0.04] transition-all">
            <div className={`w-5 h-5 rounded flex-shrink-0 mt-0.5 flex items-center justify-center border transition-all ${(form as any)[field] ? 'bg-[#10B981] border-[#10B981]' : 'border-white/20 bg-white/[0.03]'}`}
              onClick={() => set({ [field]: !(form as any)[field] })}>
              {(form as any)[field] && <CircleCheck size={12} className="text-white" />}
            </div>
            <span className="text-xs text-white/60 leading-relaxed">{label}</span>
          </label>
        ))}
      </div>

      {score < 60 && (
        <div className="p-3 bg-[#FF5252]/10 border border-[#FF5252]/20 rounded-xl text-xs text-[#FF5252]">
          ⚠️ Your release is less than 60% complete. Please go back and fill in the required fields before submitting.
        </div>
      )}
    </div>
  );
}

// ── Release Wizard Modal ───────────────────────────────────────────────────────
function ReleaseWizard({ editingRelease, userProp, token, onSaved, onClose }: {
  editingRelease: any; userProp: any; token: string; onSaved: (r: any) => void; onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(editingRelease?.id || null);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);

  const makeDefault = () => ({
    title: '', versionTitle: '', type: 'single', label: userProp?.name || '', catalogNumber: '',
    artist: userProp?.name || '', featuredArtists: '', genre: '', subgenre: '', language: 'English',
    explicit: false, coverArt: '', coverArtFileName: '',
    releaseDate: '', preOrderDate: '', originalReleaseDate: '', territory: 'worldwide',
    copyrightLine: '', phonographicLine: '',
    tracks: [mkTrack()],
    stores: STORES.map(s => s.id),
    confirmRights: false, confirmAccuracy: false, confirmAuthorization: false,
    description: '',
  });

  const [form, setForm] = useState<any>(() => {
    if (editingRelease) return { ...makeDefault(), ...editingRelease };
    return makeDefault();
  });

  const patchForm = (patch: any) => setForm((f: any) => ({ ...f, ...patch }));

  const autoSave = async (formData = form) => {
    if (!formData.title?.trim()) return;
    setAutoSaving(true);
    try {
      if (editingId) {
        const { release } = await api.updateRelease(token, editingId, formData);
        onSaved(release);
      } else {
        const { release } = await api.createRelease(token, formData);
        setEditingId(release.id);
        onSaved(release);
      }
    } catch { /* silent */ }
    finally { setAutoSaving(false); }
  };

  const goNext = async () => {
    await autoSave();
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };
  const goPrev = () => setStep(s => Math.max(s - 1, 0));

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await autoSave();
      toast.success('Draft saved!');
    } finally { setSaving(false); }
  };

  const handleSubmit = async () => {
    if (!form.title?.trim()) { toast.error('Release title is required'); return; }
    if (!form.confirmRights || !form.confirmAccuracy || !form.confirmAuthorization) {
      toast.error('Please complete all legal confirmations'); return;
    }
    if (form.stores.length === 0) { toast.error('Select at least one platform'); return; }
    setSaving(true);
    try {
      const payload = { ...form, status: 'submitted' };
      let release: any;
      if (editingId) {
        ({ release } = await api.updateRelease(token, editingId, payload));
      } else {
        ({ release } = await api.createRelease(token, payload));
      }
      onSaved(release);
      toast.success('🚀 Release submitted for review! We\'ll notify you once approved.');
      onClose();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const stepProps = { form, set: patchForm, token, user: userProp };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
        className="bg-[#0D0D0D] border border-white/[0.08] rounded-2xl w-full max-w-2xl my-6">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <div>
            <h2 className="text-base font-bold text-white">{editingRelease?.id ? 'Edit Release' : 'New Release'}</h2>
            <p className="text-xs text-white/40 mt-0.5">{STEPS[step].desc}</p>
          </div>
          <div className="flex items-center gap-3">
            {autoSaving && <span className="text-xs text-white/30 flex items-center gap-1"><Loader size={11} className="animate-spin" />Saving...</span>}
            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors"><X size={18} /></button>
          </div>
        </div>

        {/* Step indicators */}
        <div className="px-5 pt-4">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = i < step;
              const active = i === step;
              return (
                <div key={i} className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => i < step && setStep(i)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${active ? 'text-white bg-[#7B5FFF]/20 border border-[#7B5FFF]/40' : done ? 'text-[#10B981] cursor-pointer hover:bg-white/[0.03]' : 'text-white/30 cursor-default'}`}>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${active ? 'bg-[#7B5FFF]' : done ? 'bg-[#10B981]' : 'bg-white/10'}`}>
                      {done ? '✓' : i + 1}
                    </div>
                    <span className="hidden sm:block">{s.title}</span>
                  </button>
                  {i < STEPS.length - 1 && <div className={`w-3 h-px ${i < step ? 'bg-[#10B981]/40' : 'bg-white/10'}`} />}
                </div>
              );
            })}
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#7B5FFF] to-[#D63DF6] rounded-full transition-all"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
        </div>

        {/* Step content */}
        <div className="p-5">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }}>
              {step === 0 && <Step1 {...stepProps} />}
              {step === 1 && <Step2 {...stepProps} />}
              {step === 2 && <Step3 {...stepProps} />}
              {step === 3 && <Step4 {...stepProps} />}
              {step === 4 && <Step5 {...stepProps} />}
              {step === 5 && <Step6 {...stepProps} />}
              {step === 6 && <Step7 {...stepProps} />}
              {step === 7 && <Step8 {...stepProps} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between p-5 border-t border-white/[0.06]">
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button onClick={goPrev}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white/60 hover:text-white transition-all">
                <ArrowLeft size={14} /> Back
              </button>
            )}
            <button onClick={handleSaveDraft} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-2.5 text-xs text-white/40 hover:text-white transition-all">
              <Save size={12} /> Save Draft
            </button>
          </div>
          {step < STEPS.length - 1 ? (
            <button onClick={goNext}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}>
              Next <ArrowRight size={14} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #10B981, #00C4FF)' }}>
              <Send size={14} /> {saving ? 'Submitting...' : 'Submit for Review'}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Release card (list view) ───────────────────────────────────────────────────
function ReleaseCard({ r, onEdit, onDelete, onSubmit }: { r: any; onEdit: () => void; onDelete: () => void; onSubmit: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const sc = getStatusCfg(r.status);
  const Icon = sc.icon;
  const uploadedTracks = (r.tracks || []).filter((t: any) => t.fileName);
  const { score } = computeCompleteness(r);

  const isActionable = r.status === 'needs_changes' || r.status === 'needs_info';
  const isDraft = r.status === 'draft' || r.status === 'in_progress';

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`bg-[#111] border rounded-2xl overflow-hidden transition-all ${isActionable ? 'border-[#00C4FF]/30' : 'border-white/[0.06] hover:border-white/10'}`}>

      {isActionable && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-[#00C4FF]/10 border-b border-[#00C4FF]/20">
          <CircleAlert size={11} className="text-[#00C4FF]" />
          <span className="text-[11px] font-semibold text-[#00C4FF] uppercase tracking-wider">Action Required — Please Check Admin Notes</span>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-[#7B5FFF]/30 to-[#D63DF6]/30 flex items-center justify-center">
            {r.coverArt
              ? <img src={r.coverArt} alt="" className="w-full h-full object-cover" />
              : r.type === 'album' ? <Disc size={20} className="text-[#7B5FFF]" /> : r.type === 'ep' ? <Radio size={20} className="text-[#D63DF6]" /> : <Music size={20} className="text-[#7B5FFF]" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-white text-sm truncate">{r.title}</h3>
              {r.versionTitle && <span className="text-xs text-white/30">({r.versionTitle})</span>}
              <span className="text-[11px] px-2 py-0.5 rounded-lg font-medium flex-shrink-0" style={{ background: sc.bg, color: sc.color }}>
                <Icon size={9} className="inline mr-1" />{sc.artistLabel}
              </span>
            </div>
            <p className="text-xs text-white/50 mt-0.5">{r.artist}{r.genre && ` · ${r.genre}`} · <span className="capitalize">{r.type}</span></p>
            <div className="flex items-center gap-3 mt-1 flex-wrap text-[11px] text-white/30">
              <span>{r.stores?.length || 0} platforms</span>
              {r.tracks?.length > 0 && <span>{r.tracks.length} track{r.tracks.length !== 1 ? 's' : ''}{uploadedTracks.length > 0 && ` · ${uploadedTracks.length} audio`}</span>}
              {r.releaseDate && <span>Release: {new Date(r.releaseDate).toLocaleDateString()}</span>}
              <span className="font-medium" style={{ color: score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#FF5252' }}>{score}% complete</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isDraft && (
              <button onClick={onSubmit}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-[#7B5FFF]/20 hover:bg-[#7B5FFF]/40 border border-[#7B5FFF]/30 transition-all">
                <Upload size={11} className="inline mr-1" />Submit
              </button>
            )}
            <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.05] transition-all">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <button onClick={onEdit} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.05] transition-all">
              <Pencil size={14} />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg text-white/40 hover:text-[#FF5252] hover:bg-[#FF5252]/10 transition-all">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/[0.05] overflow-hidden">
            <div className="p-4 space-y-4">
              {r.adminNotes && (
                <div className={`p-3 rounded-xl text-xs border ${r.status === 'rejected' ? 'bg-[#FF5252]/10 border-[#FF5252]/20 text-[#FF5252]' : 'bg-[#00C4FF]/10 border-[#00C4FF]/20 text-[#00C4FF]'}`}>
                  <p className="font-semibold mb-1">Note from MIXXEA Team</p>
                  <p>{r.adminNotes}</p>
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-white/40 font-semibold uppercase tracking-wider mb-2">Tracks</p>
                  {(r.tracks || []).map((t: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-white/60 mb-1">
                      <span className="text-white/30">{i + 1}.</span>
                      <span className="flex-1">{t.title || '(Untitled)'}</span>
                      {t.fileName && <span className="text-[#10B981] flex items-center gap-1"><Headphones size={10} />Audio</span>}
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-white/40 font-semibold uppercase tracking-wider mb-2">Metadata</p>
                  <div className="space-y-1 text-white/50">
                    {r.copyrightLine && <p>© {r.copyrightLine}</p>}
                    {r.phonographicLine && <p>℗ {r.phonographicLine}</p>}
                    {r.label && <p>Label: {r.label}</p>}
                    {r.territory && <p>Territory: {r.territory}</p>}
                    <p>ID: {r.id?.slice(0, 8).toUpperCase()}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main DistributionPage ─────────────────────────────────────────────────────
export function DistributionPage() {
  const { token, user } = useAuth();
  const [releases, setReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [editingRelease, setEditingRelease] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    if (!token) return;
    api.getReleases(token).then(d => setReleases(d.releases || [])).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this release? This cannot be undone.')) return;
    try {
      await api.deleteRelease(token!, id);
      setReleases(prev => prev.filter(r => r.id !== id));
      toast.success('Release deleted');
    } catch (err: any) { toast.error(err.message); }
  };

  const handleSubmitForReview = async (id: string) => {
    try {
      const { release } = await api.updateRelease(token!, id, { status: 'submitted' });
      setReleases(prev => prev.map(r => r.id === id ? release : r));
      toast.success('🚀 Submitted for review! We\'ll notify you once approved.');
    } catch (err: any) { toast.error(err.message); }
  };

  const handleSaved = (release: any) => {
    setReleases(prev => {
      const existing = prev.find(r => r.id === release.id);
      return existing ? prev.map(r => r.id === release.id ? release : r) : [release, ...prev];
    });
  };

  const filtered = releases.filter(r => {
    const matchSearch = !search || r.title?.toLowerCase().includes(search.toLowerCase()) || r.artist?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || r.status === filterStatus || (filterStatus === 'live' && r.status === 'distributed');
    return matchSearch && matchStatus;
  });

  // Status counts for filter tabs
  const liveStatuses = ['live', 'distributed', 'scheduled', 'delivered_to_dsp'];
  const inProgressStatuses = ['submitted', 'under_review', 'approved', 'queued_for_submission', 'submitted_to_ampsuite', 'delivery_in_progress'];

  const FILTER_TABS = [
    { id: 'all',            label: 'All',          count: releases.length },
    { id: 'draft',          label: 'Drafts',       count: releases.filter(r => r.status === 'draft' || r.status === 'in_progress').length },
    { id: 'submitted',      label: 'In Review',    count: releases.filter(r => inProgressStatuses.includes(r.status)).length },
    { id: 'needs_changes',  label: 'Action Needed',count: releases.filter(r => r.status === 'needs_changes' || r.status === 'needs_info').length },
    { id: 'live',           label: 'Live',         count: releases.filter(r => liveStatuses.includes(r.status)).length },
    { id: 'rejected',       label: 'Rejected',     count: releases.filter(r => r.status === 'rejected').length },
  ];

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Distribution</h1>
          <p className="text-white/40 text-sm mt-1">Distribute your music to 150+ stores worldwide</p>
        </div>
        <button onClick={() => { setEditingRelease(null); setShowWizard(true); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white text-sm transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}>
          <Plus size={16} /> New Release
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Releases', value: releases.length,                                                   color: '#7B5FFF' },
          { label: 'Live',           value: releases.filter(r => liveStatuses.includes(r.status)).length,      color: '#10B981' },
          { label: 'In Review',      value: releases.filter(r => inProgressStatuses.includes(r.status)).length,color: '#F59E0B' },
          { label: 'Action Needed',  value: releases.filter(r => r.status === 'needs_changes' || r.status === 'needs_info').length, color: '#00C4FF' },
        ].map(s => (
          <div key={s.label} className="bg-[#111] border border-white/[0.06] rounded-xl p-4">
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-white/40 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search releases..."
            className="w-full bg-[#111] border border-white/[0.06] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {FILTER_TABS.map(t => (
            <button key={t.id} onClick={() => setFilterStatus(t.id)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${filterStatus === t.id ? 'bg-[#7B5FFF] text-white' : 'bg-[#111] border border-white/[0.06] text-white/50 hover:text-white'}`}>
              {t.label} <span className="ml-1 opacity-60">{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Release list */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-white/[0.03] rounded-2xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-[#7B5FFF]/10 flex items-center justify-center mx-auto mb-4">
            <Music size={28} className="text-[#7B5FFF]" />
          </div>
          <h3 className="text-white font-semibold mb-2">{search || filterStatus !== 'all' ? 'No releases match' : 'No releases yet'}</h3>
          <p className="text-white/40 text-sm mb-6">Upload your first release to distribute worldwide</p>
          <button onClick={() => setShowWizard(true)} className="px-6 py-3 rounded-xl font-semibold text-white text-sm" style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}>
            <Plus size={15} className="inline mr-2" />New Release
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <ReleaseCard key={r.id} r={r}
              onEdit={() => { setEditingRelease(r); setShowWizard(true); }}
              onDelete={() => handleDelete(r.id)}
              onSubmit={() => handleSubmitForReview(r.id)} />
          ))}
        </div>
      )}

      {/* Footer banner */}
      <div className="mt-6 p-4 bg-[#111] border border-white/[0.06] rounded-2xl flex items-center gap-4">
        <Globe size={20} className="text-[#00C4FF] flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-white">Distributed to 150+ platforms worldwide</p>
          <p className="text-xs text-white/40 mt-0.5">Spotify · Apple Music · YouTube Music · TIDAL · Deezer · TikTok · Beatport · Traxsource + 140 more</p>
        </div>
      </div>

      {/* Wizard */}
      <AnimatePresence>
        {showWizard && (
          <ReleaseWizard
            editingRelease={editingRelease}
            userProp={user}
            token={token!}
            onSaved={handleSaved}
            onClose={() => { setShowWizard(false); setEditingRelease(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}