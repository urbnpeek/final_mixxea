// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — Admin Creator Network
//  Multi-platform talent database:
//  Spotify Playlists · Apple Music · TikTok · YouTube · Instagram ·
//  Press/Blogs · Radio · Podcasts
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../dashboard/AuthContext';
import * as api from '../dashboard/api';
import { toast } from 'sonner';
import {
  Search, Plus, X, Edit3, Trash2, Filter, RefreshCw,
  Star, Check, ExternalLink, Music, Radio, TrendingUp,
  Instagram, Youtube, Globe, Mic, Headphones, Users,
  ChevronDown, ChevronUp, Zap, Save, BarChart2, MapPin,
  Mail, Tag, Eye, Copy, CheckCircle,
} from 'lucide-react';
import { SpotifyImporter } from './SpotifyImporter';

// ── Platform Config ───────────────────────────────────────────────────────────
const PLATFORMS: Record<string, {
  label: string; icon: any; color: string; bg: string;
  followerLabel: string; postLabel: string; fields: string[];
}> = {
  spotify_playlist: {
    label: 'Spotify Playlist', icon: Music,      color: '#1DB954', bg: '#1DB95415',
    followerLabel: 'Playlist Followers', postLabel: 'Placement Cost',
    fields: ['playlistName', 'playlistFollowers', 'acceptanceRate'],
  },
  apple_playlist: {
    label: 'Apple Music',     icon: Music,      color: '#FA586A', bg: '#FA586A15',
    followerLabel: 'Playlist Followers', postLabel: 'Placement Cost',
    fields: ['playlistName', 'playlistFollowers'],
  },
  tiktok: {
    label: 'TikTok',          icon: TrendingUp, color: '#FF0050', bg: '#FF005015',
    followerLabel: 'Followers', postLabel: 'Cost / Post',
    fields: ['avgViews', 'engagementRate'],
  },
  youtube: {
    label: 'YouTube',         icon: Youtube,    color: '#FF0000', bg: '#FF000015',
    followerLabel: 'Subscribers', postLabel: 'Cost / Video',
    fields: ['channelName', 'avgVideoViews', 'subscriberCount'],
  },
  instagram: {
    label: 'Instagram',       icon: Instagram,  color: '#E1306C', bg: '#E1306C15',
    followerLabel: 'Followers', postLabel: 'Cost / Post',
    fields: ['engagementRate', 'avgViews'],
  },
  press: {
    label: 'Press / Blog',    icon: Globe,      color: '#F59E0B', bg: '#F59E0B15',
    followerLabel: 'Monthly Visitors', postLabel: 'Cost / Feature',
    fields: ['publicationName', 'monthlyVisitors', 'domainAuthority'],
  },
  radio: {
    label: 'Radio Station',   icon: Radio,      color: '#7B5FFF', bg: '#7B5FFF15',
    followerLabel: 'Weekly Listeners', postLabel: 'Cost / Spin',
    fields: [],
  },
  podcast: {
    label: 'Podcast',         icon: Headphones, color: '#D63DF6', bg: '#D63DF615',
    followerLabel: 'Monthly Downloads', postLabel: 'Cost / Mention',
    fields: ['avgViews'],
  },
};

const TIERS: Record<string, { label: string; color: string; min: number; max: number }> = {
  nano:     { label: 'Nano',     color: '#6B7280', min: 1_000,     max: 10_000   },
  micro:    { label: 'Micro',    color: '#00C4FF', min: 10_000,    max: 100_000  },
  standard: { label: 'Standard', color: '#7B5FFF', min: 100_000,   max: 500_000  },
  premium:  { label: 'Premium',  color: '#D63DF6', min: 500_000,   max: 2_000_000},
  elite:    { label: 'Elite',    color: '#F59E0B', min: 2_000_000, max: Infinity },
};

const GENRES_LIST = [
  'Afrobeats','Hip-Hop','R&B','Pop','Electronic','House','Techno',
  'Trap','Drill','Amapiano','Dancehall','Reggae','Lo-Fi','Jazz',
  'Soul','Gospel','Rock','Alternative','Latin','K-Pop','Indie',
  'Deep House','Tech House','EDM','Country','Classical','World Music',
];

const COUNTRIES = [
  'United States','United Kingdom','Nigeria','Ghana','South Africa','Kenya',
  'Canada','France','Germany','Brazil','Mexico','Australia','Japan',
  'South Korea','Indonesia','India','UAE','Sweden','Netherlands','Spain',
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function inferTier(followers: number): string {
  for (const [key, t] of Object.entries(TIERS)) {
    if (followers >= t.min && followers < t.max) return key;
  }
  return 'nano';
}

// ── Creator Card ──────────────────────────────────────────────────────────────
function CreatorCard({ creator, onEdit, onDelete, onSelect, selected }: any) {
  const plat = PLATFORMS[creator.platform] || PLATFORMS.tiktok;
  const PIcon = plat.icon;
  const tier = TIERS[creator.tier || inferTier(creator.followers || 0)] || TIERS.micro;
  const followers = creator.followers || creator.playlistFollowers || creator.subscriberCount || creator.monthlyVisitors || 0;

  return (
    <motion.div layout
      className={`bg-[#0D0D0D] border rounded-2xl p-4 hover:border-white/20 transition-all cursor-pointer relative ${selected ? 'border-[#7B5FFF]/60 shadow-[0_0_20px_#7B5FFF12]' : 'border-white/[0.07]'}`}
      onClick={() => onSelect(creator.id)}>

      {selected && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#7B5FFF] flex items-center justify-center">
          <Check size={10} className="text-white" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: plat.bg }}>
          <PIcon size={18} style={{ color: plat.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-white truncate">{creator.name}</p>
            {creator.verified && <CheckCircle size={11} className="text-[#00C4FF] flex-shrink-0" />}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: plat.bg, color: plat.color }}>
              {plat.label}
            </span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ color: tier.color, background: `${tier.color}18` }}>
              {tier.label}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-white/[0.03] rounded-xl p-2 text-center">
          <p className="text-sm font-black text-white">{fmtNum(followers)}</p>
          <p className="text-[9px] text-white/30 mt-0.5">{plat.followerLabel.split(' ')[0]}</p>
        </div>
        {creator.engagementRate > 0 && (
          <div className="bg-white/[0.03] rounded-xl p-2 text-center">
            <p className="text-sm font-black" style={{ color: plat.color }}>{creator.engagementRate}%</p>
            <p className="text-[9px] text-white/30 mt-0.5">Eng. Rate</p>
          </div>
        )}
        {creator.costPerPost > 0 ? (
          <div className="bg-white/[0.03] rounded-xl p-2 text-center">
            <p className="text-sm font-black text-white">${creator.costPerPost}</p>
            <p className="text-[9px] text-white/30 mt-0.5">Cost/Post</p>
          </div>
        ) : creator.acceptanceRate > 0 ? (
          <div className="bg-white/[0.03] rounded-xl p-2 text-center">
            <p className="text-sm font-black text-[#10B981]">{creator.acceptanceRate}%</p>
            <p className="text-[9px] text-white/30 mt-0.5">Accept</p>
          </div>
        ) : null}
      </div>

      {/* Genres */}
      {(creator.genres || []).length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {creator.genres.slice(0, 3).map((g: string) => (
            <span key={g} className="text-[9px] px-1.5 py-0.5 bg-white/[0.04] border border-white/[0.06] rounded-md text-white/50">{g}</span>
          ))}
          {creator.genres.length > 3 && <span className="text-[9px] text-white/25">+{creator.genres.length - 3}</span>}
        </div>
      )}

      {/* Meta + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] text-white/30">
          {creator.country && <><MapPin size={9} /><span>{creator.country}</span></>}
          {creator.pastCampaigns > 0 && <span className="text-[#7B5FFF]">{creator.pastCampaigns} campaigns</span>}
        </div>
        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
          {creator.profileUrl && (
            <a href={creator.profileUrl} target="_blank" rel="noopener noreferrer"
              className="p-1 text-white/30 hover:text-white transition-colors">
              <ExternalLink size={12} />
            </a>
          )}
          <button onClick={() => onEdit(creator)} className="p-1 text-white/30 hover:text-white transition-colors">
            <Edit3 size={12} />
          </button>
          <button onClick={() => onDelete(creator.id)} className="p-1 text-white/30 hover:text-[#FF5252] transition-colors">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Add/Edit Creator Modal ────────────────────────────────────────────────────
function CreatorModal({ creator, onSave, onClose }: any) {
  const isEdit = !!creator?.id;
  const [form, setForm] = useState({
    platform: creator?.platform || 'tiktok',
    name: creator?.name || '',
    handle: creator?.handle || '',
    email: creator?.email || '',
    contactName: creator?.contactName || '',
    profileUrl: creator?.profileUrl || '',
    followers: creator?.followers || 0,
    engagementRate: creator?.engagementRate || 0,
    avgViews: creator?.avgViews || 0,
    genres: (creator?.genres || []).join(', '),
    niche: creator?.niche || '',
    country: creator?.country || '',
    language: creator?.language || 'English',
    tier: creator?.tier || 'micro',
    costPerPost: creator?.costPerPost || 0,
    costPerPlacement: creator?.costPerPlacement || 0,
    acceptanceRate: creator?.acceptanceRate || 0,
    avgResponseDays: creator?.avgResponseDays || 3,
    notes: creator?.notes || '',
    verified: creator?.verified || false,
    // Platform-specific
    playlistName: creator?.playlistName || '',
    playlistFollowers: creator?.playlistFollowers || 0,
    channelName: creator?.channelName || '',
    subscriberCount: creator?.subscriberCount || 0,
    avgVideoViews: creator?.avgVideoViews || 0,
    publicationName: creator?.publicationName || '',
    monthlyVisitors: creator?.monthlyVisitors || 0,
    domainAuthority: creator?.domainAuthority || 0,
  });
  const [saving, setSaving] = useState(false);
  const plat = PLATFORMS[form.platform] || PLATFORMS.tiktok;

  const handle = async () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    setSaving(true);
    try {
      await onSave({
        ...form,
        genres: form.genres.split(',').map((g: string) => g.trim()).filter(Boolean),
        tier: form.tier || inferTier(form.followers),
      });
      onClose();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        className="bg-[#0D0D0D] border border-white/[0.08] rounded-2xl w-full max-w-2xl my-4">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <h2 className="text-sm font-bold text-white">{isEdit ? 'Edit Creator' : 'Add Creator / Influencer'}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">

          {/* Platform Selector */}
          <div>
            <label className="block text-[11px] text-white/40 mb-2 uppercase tracking-wider font-semibold">Platform *</label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(PLATFORMS).map(([key, p]) => {
                const PIcon = p.icon;
                return (
                  <button key={key} onClick={() => setForm(f => ({ ...f, platform: key }))}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-semibold transition-all ${form.platform === key ? 'text-white border-transparent' : 'border-white/[0.07] text-white/40 hover:text-white/70 hover:border-white/15'}`}
                    style={form.platform === key ? { background: p.bg, borderColor: `${p.color}40` } : {}}>
                    <PIcon size={16} style={{ color: form.platform === key ? p.color : undefined }} />
                    <span className="text-center leading-tight" style={{ fontSize: '9px' }}>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Core Info */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'name',        label: 'Creator / Channel Name *', placeholder: 'LoFi Dreams', full: false },
              { key: 'handle',      label: 'Handle / Username',         placeholder: '@lofiDreams', full: false },
              { key: 'contactName', label: 'Contact Name',              placeholder: 'John Doe',    full: false },
              { key: 'email',       label: 'Contact Email',             placeholder: 'email@domain.com', full: false },
              { key: 'profileUrl',  label: 'Profile / Channel URL',     placeholder: 'https://…',   full: true },
              { key: 'niche',       label: 'Niche / Content Type',      placeholder: 'Music Reviews, Lo-Fi Vibes…', full: false },
            ].map(f => (
              <div key={f.key} className={f.full ? 'col-span-2' : ''}>
                <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">{f.label}</label>
                <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/40" />
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">{plat.followerLabel} *</label>
              <input type="number" value={form.followers} onChange={e => setForm(p => ({ ...p, followers: parseInt(e.target.value) || 0 }))}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/40" />
            </div>
            <div>
              <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Engagement Rate %</label>
              <input type="number" step="0.1" min="0" max="100" value={form.engagementRate}
                onChange={e => setForm(p => ({ ...p, engagementRate: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/40" />
            </div>
            <div>
              <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Avg Views / Post</label>
              <input type="number" value={form.avgViews} onChange={e => setForm(p => ({ ...p, avgViews: parseInt(e.target.value) || 0 }))}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/40" />
            </div>
            <div>
              <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">{plat.postLabel} (USD)</label>
              <input type="number" value={form.costPerPost} onChange={e => setForm(p => ({ ...p, costPerPost: parseInt(e.target.value) || 0 }))}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/40" />
            </div>
            <div>
              <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Acceptance Rate %</label>
              <input type="number" min="0" max="100" value={form.acceptanceRate}
                onChange={e => setForm(p => ({ ...p, acceptanceRate: parseInt(e.target.value) || 0 }))}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/40" />
            </div>
            <div>
              <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Avg Response (days)</label>
              <input type="number" min="1" max="60" value={form.avgResponseDays}
                onChange={e => setForm(p => ({ ...p, avgResponseDays: parseInt(e.target.value) || 3 }))}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B5FFF]/40" />
            </div>
          </div>

          {/* Platform-specific fields */}
          {form.platform === 'spotify_playlist' || form.platform === 'apple_playlist' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Playlist Name</label>
                <input value={form.playlistName} onChange={e => setForm(p => ({ ...p, playlistName: e.target.value }))}
                  placeholder="LoFi Hip-Hop Radio"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Playlist Followers</label>
                <input type="number" value={form.playlistFollowers}
                  onChange={e => setForm(p => ({ ...p, playlistFollowers: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none" />
              </div>
            </div>
          ) : form.platform === 'youtube' ? (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Channel Name</label>
                <input value={form.channelName} onChange={e => setForm(p => ({ ...p, channelName: e.target.value }))}
                  placeholder="Music Discovery Hub"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Subscribers</label>
                <input type="number" value={form.subscriberCount}
                  onChange={e => setForm(p => ({ ...p, subscriberCount: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Avg Video Views</label>
                <input type="number" value={form.avgVideoViews}
                  onChange={e => setForm(p => ({ ...p, avgVideoViews: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none" />
              </div>
            </div>
          ) : form.platform === 'press' ? (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Publication Name</label>
                <input value={form.publicationName} onChange={e => setForm(p => ({ ...p, publicationName: e.target.value }))}
                  placeholder="HipHopDX, HighSnobiety…"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Monthly Visitors</label>
                <input type="number" value={form.monthlyVisitors}
                  onChange={e => setForm(p => ({ ...p, monthlyVisitors: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Domain Authority</label>
                <input type="number" min="0" max="100" value={form.domainAuthority}
                  onChange={e => setForm(p => ({ ...p, domainAuthority: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none" />
              </div>
            </div>
          ) : null}

          {/* Tier + Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-white/40 mb-2 uppercase tracking-wider font-semibold">Tier</label>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(TIERS).map(([k, t]) => (
                  <button key={k} onClick={() => setForm(p => ({ ...p, tier: k }))}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all ${form.tier === k ? 'text-white border-transparent' : 'border-white/[0.08] text-white/40'}`}
                    style={form.tier === k ? { background: `${t.color}20`, borderColor: `${t.color}40`, color: t.color } : {}}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-white/40 mb-2 uppercase tracking-wider font-semibold">Country</label>
              <select value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white/80 focus:outline-none">
                <option value="" className="bg-[#111]">— Select country —</option>
                {COUNTRIES.map(c => <option key={c} value={c} className="bg-[#111]">{c}</option>)}
              </select>
            </div>
          </div>

          {/* Genres */}
          <div>
            <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Genres (comma-separated)</label>
            <input value={form.genres} onChange={e => setForm(p => ({ ...p, genres: e.target.value }))}
              placeholder="Hip-Hop, Afrobeats, R&B"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/40" />
            <div className="flex flex-wrap gap-1 mt-2">
              {GENRES_LIST.slice(0, 12).map(g => (
                <button key={g} onClick={() => {
                  const current = form.genres.split(',').map(x => x.trim()).filter(Boolean);
                  const has = current.includes(g);
                  const next = has ? current.filter(x => x !== g) : [...current, g];
                  setForm(p => ({ ...p, genres: next.join(', ') }));
                }}
                  className={`text-[10px] px-2 py-0.5 rounded-md transition-all border ${form.genres.includes(g) ? 'border-[#7B5FFF]/40 bg-[#7B5FFF]/15 text-[#7B5FFF]' : 'border-white/[0.06] text-white/40 hover:text-white/70'}`}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Notes + Verified */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">Internal Notes</label>
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                rows={2} placeholder="Working relationship notes, past collab details…"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none resize-none" />
            </div>
            <div>
              <label className="block text-[11px] text-white/40 mb-2 uppercase tracking-wider font-semibold">Verified</label>
              <button onClick={() => setForm(p => ({ ...p, verified: !p.verified }))}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-all ${form.verified ? 'bg-[#00C4FF]/15 border-[#00C4FF]/40 text-[#00C4FF]' : 'border-white/[0.08] text-white/40'}`}>
                <CheckCircle size={14} /> {form.verified ? 'Verified' : 'Unverified'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/[0.06] flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium text-white/60 bg-white/[0.05]">Cancel</button>
          <button onClick={handle} disabled={saving}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
            <Save size={14} />{saving ? 'Saving…' : isEdit ? 'Update Creator' : 'Add to Network'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Filter Bar ────────────────────────────────────────────────────────────────
function FilterBar({ filters, onChange }: { filters: any; onChange: (k: string, v: any) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <div className="flex items-center gap-2 bg-[#111] border border-white/[0.06] rounded-xl px-3 py-2 flex-1 min-w-[200px]">
        <Search size={13} className="text-white/30 flex-shrink-0" />
        <input value={filters.search} onChange={e => onChange('search', e.target.value)}
          placeholder="Search by name, handle, niche, genre…"
          className="bg-transparent text-sm text-white placeholder-white/30 focus:outline-none w-full" />
        {filters.search && <button onClick={() => onChange('search', '')}><X size={13} className="text-white/30" /></button>}
      </div>
      <select value={filters.platform} onChange={e => onChange('platform', e.target.value)}
        className="bg-[#111] border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-white/70 focus:outline-none">
        <option value="all">All Platforms</option>
        {Object.entries(PLATFORMS).map(([k, p]) => <option key={k} value={k} className="bg-[#111]">{p.label}</option>)}
      </select>
      <select value={filters.tier} onChange={e => onChange('tier', e.target.value)}
        className="bg-[#111] border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-white/70 focus:outline-none">
        <option value="all">All Tiers</option>
        {Object.entries(TIERS).map(([k, t]) => <option key={k} value={k} className="bg-[#111]">{t.label} ({fmtNum(t.min)}+)</option>)}
      </select>
      <select value={filters.genre} onChange={e => onChange('genre', e.target.value)}
        className="bg-[#111] border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-white/70 focus:outline-none">
        <option value="all">All Genres</option>
        {GENRES_LIST.map(g => <option key={g} value={g} className="bg-[#111]">{g}</option>)}
      </select>
      <select value={filters.country} onChange={e => onChange('country', e.target.value)}
        className="bg-[#111] border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-white/70 focus:outline-none">
        <option value="all">All Countries</option>
        {COUNTRIES.map(c => <option key={c} value={c} className="bg-[#111]">{c}</option>)}
      </select>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function AdminCreatorNetwork() {
  const { token } = useAuth();
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCreator, setEditingCreator] = useState<any>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({ search: '', platform: 'all', tier: 'all', genre: 'all', country: 'all' });
  const [activePlatformTab, setActivePlatformTab] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showSpotifyImporter, setShowSpotifyImporter] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const d = await api.adminGetCreatorNetwork(token);
      setCreators(d.creators || []);
    } catch (err: any) { console.log('[CreatorNetwork] error:', err); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const updateFilter = (k: string, v: any) => setFilters(p => ({ ...p, [k]: v }));

  const filtered = useMemo(() => {
    return creators.filter(c => {
      const term = filters.search.toLowerCase();
      const matchSearch = !filters.search ||
        c.name?.toLowerCase().includes(term) ||
        c.handle?.toLowerCase().includes(term) ||
        c.niche?.toLowerCase().includes(term) ||
        (c.genres || []).some((g: string) => g.toLowerCase().includes(term)) ||
        c.publicationName?.toLowerCase().includes(term) ||
        c.playlistName?.toLowerCase().includes(term);
      const matchPlatform = filters.platform === 'all' || c.platform === filters.platform;
      const matchTab = activePlatformTab === 'all' || c.platform === activePlatformTab;
      const matchTier = filters.tier === 'all' || c.tier === filters.tier;
      const matchGenre = filters.genre === 'all' || (c.genres || []).includes(filters.genre);
      const matchCountry = filters.country === 'all' || c.country === filters.country;
      return matchSearch && matchPlatform && matchTab && matchTier && matchGenre && matchCountry;
    });
  }, [creators, filters, activePlatformTab]);

  const handleSave = async (data: any) => {
    if (editingCreator?.id) {
      const r = await api.adminUpdateCreator(token!, editingCreator.id, data);
      setCreators(prev => prev.map(c => c.id === editingCreator.id ? r.creator : c));
      toast.success('Creator updated!');
    } else {
      const r = await api.adminAddCreator(token!, data);
      setCreators(prev => [r.creator, ...prev]);
      toast.success(`✅ ${r.creator.name} added to network!`);
    }
    setEditingCreator(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this creator from the network?')) return;
    await api.adminDeleteCreator(token!, id);
    setCreators(prev => prev.filter(c => c.id !== id));
    toast.success('Creator removed');
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Platform counts
  const platformCounts = useMemo(() => {
    const counts: Record<string, number> = { all: creators.length };
    for (const c of creators) { counts[c.platform] = (counts[c.platform] || 0) + 1; }
    return counts;
  }, [creators]);

  // Total network reach
  const totalReach = useMemo(() =>
    creators.reduce((sum, c) => sum + (c.followers || c.playlistFollowers || c.subscriberCount || c.monthlyVisitors || 0), 0)
  , [creators]);

  const PLATFORM_TABS = [
    { id: 'all', label: 'All', color: '#7B5FFF' },
    ...Object.entries(PLATFORMS).map(([k, p]) => ({ id: k, label: p.label.split(' ')[0], color: p.color })),
  ];

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Creator Network</h1>
          <p className="text-white/40 text-sm mt-1">
            {creators.length} creators · <span className="text-[#7B5FFF]">{fmtNum(totalReach)} total reach</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#00C4FF,#7B5FFF)' }}
              onClick={() => toast.info(`${selected.size} creators selected — assign to a campaign in Campaign Runner`)}>
              <Zap size={13} /> Assign to Campaign ({selected.size})
            </button>
          )}
          <button onClick={() => { setRefreshing(true); load(); }} disabled={refreshing}
            className="p-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white/40 hover:text-white transition-all disabled:opacity-50">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
          {/* Spotify Import button */}
          <button onClick={() => setShowSpotifyImporter(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-black"
            style={{ background: '#1DB954' }}>
            <Music size={14} /> Import from Spotify
          </button>
          <button onClick={() => { setEditingCreator(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
            <Plus size={14} /> Add Creator
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
        {Object.entries(PLATFORMS).map(([key, p]) => {
          const PIcon = p.icon;
          const count = platformCounts[key] || 0;
          return (
            <button key={key}
              onClick={() => setActivePlatformTab(activePlatformTab === key ? 'all' : key)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all ${activePlatformTab === key ? 'border-transparent' : 'border-white/[0.06] hover:border-white/15'}`}
              style={activePlatformTab === key ? { background: p.bg, borderColor: `${p.color}30` } : { background: '#0D0D0D' }}>
              <PIcon size={18} style={{ color: activePlatformTab === key ? p.color : '#ffffff40' }} />
              <span className="text-lg font-black text-white">{count}</span>
              <span className="text-[9px] text-white/30 text-center leading-tight">{p.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <FilterBar filters={filters} onChange={updateFilter} />

      {/* Selection bar */}
      {selected.size > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-3 bg-[#7B5FFF]/10 border border-[#7B5FFF]/25 rounded-2xl">
          <CheckCircle size={14} className="text-[#7B5FFF]" />
          <p className="text-sm font-semibold text-white flex-1">{selected.size} creator{selected.size !== 1 ? 's' : ''} selected</p>
          <button onClick={() => setSelected(new Set())} className="text-xs text-white/40 hover:text-white">Clear</button>
        </motion.div>
      )}

      {/* Grid / List */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-48 bg-white/[0.03] rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-[#0A0A0A] border border-white/[0.05] rounded-2xl">
          <Users size={36} className="text-white/10 mx-auto mb-4" />
          <p className="text-white/30 text-sm mb-4">
            {creators.length === 0 ? 'No creators in your network yet' : 'No creators match your filters'}
          </p>
          {creators.length === 0 && (
            <button onClick={() => setShowModal(true)}
              className="px-6 py-3 rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
              Add Your First Creator
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/30">{filtered.length} creator{filtered.length !== 1 ? 's' : ''}</p>
            {selected.size > 0 && <p className="text-xs text-[#7B5FFF]">{selected.size} selected</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(creator => (
              <CreatorCard
                key={creator.id}
                creator={creator}
                selected={selected.has(creator.id)}
                onSelect={toggleSelect}
                onEdit={(c: any) => { setEditingCreator(c); setShowModal(true); }}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <CreatorModal
            creator={editingCreator}
            onSave={handleSave}
            onClose={() => { setShowModal(false); setEditingCreator(null); }}
          />
        )}
        {showSpotifyImporter && (
          <SpotifyImporter
            onImported={(newCreators) => {
              setCreators(prev => [...newCreators, ...prev]);
              setShowSpotifyImporter(false);
            }}
            onClose={() => setShowSpotifyImporter(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}