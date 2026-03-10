// ─── MIXXEA Release Workflow Constants ────────────────────────────────────────
// Shared between dashboard (artist-facing) and admin components.

import {
  FileText, Clock, Pencil, Search, CircleAlert, CircleCheck,
  List, Send, Loader, Globe, Calendar, CircleX, CirclePause,
  OctagonAlert, Archive,
} from 'lucide-react';

// ── 14-stage professional release lifecycle ────────────────────────────────────
export const STATUS_MAP: Record<string, {
  label: string;
  artistLabel: string;
  color: string;
  bg: string;
  icon: any;
  adminMeaning: string;
}> = {
  draft: {
    label: 'Draft', artistLabel: 'Draft',
    color: '#9CA3AF', bg: '#9CA3AF15', icon: FileText,
    adminMeaning: 'Not submitted yet',
  },
  in_progress: {
    label: 'In Progress', artistLabel: 'In Progress',
    color: '#F59E0B', bg: '#F59E0B15', icon: Pencil,
    adminMeaning: 'Artist still working',
  },
  submitted: {
    label: 'Submitted', artistLabel: 'Awaiting MIXXEA Review',
    color: '#F59E0B', bg: '#F59E0B15', icon: Clock,
    adminMeaning: 'New submission — needs your review',
  },
  under_review: {
    label: 'Under Review', artistLabel: 'MIXXEA is Reviewing',
    color: '#7B5FFF', bg: '#7B5FFF15', icon: Search,
    adminMeaning: 'Being actively reviewed by team',
  },
  needs_changes: {
    label: 'Needs Changes', artistLabel: 'Action Required — Check Notes',
    color: '#00C4FF', bg: '#00C4FF15', icon: CircleAlert,
    adminMeaning: 'Waiting on artist corrections',
  },
  // Legacy alias
  needs_info: {
    label: 'Needs Changes', artistLabel: 'Action Required — Check Notes',
    color: '#00C4FF', bg: '#00C4FF15', icon: CircleAlert,
    adminMeaning: 'Waiting on artist corrections',
  },
  approved: {
    label: 'Approved', artistLabel: 'Approved by MIXXEA',
    color: '#10B981', bg: '#10B98115', icon: CircleCheck,
    adminMeaning: 'Ready to queue for distribution',
  },
  queued_for_submission: {
    label: 'Queued for Distribution', artistLabel: 'In Distribution Queue',
    color: '#7B5FFF', bg: '#7B5FFF15', icon: List,
    adminMeaning: 'Admin to submit to AMPSUITE',
  },
  submitted_to_ampsuite: {
    label: 'Sent to Distributor', artistLabel: 'Submitted to Distributor',
    color: '#D63DF6', bg: '#D63DF615', icon: Send,
    adminMeaning: 'Entered into AMPSUITE manually',
  },
  delivery_in_progress: {
    label: 'Delivery in Progress', artistLabel: 'Being Delivered to Stores',
    color: '#D63DF6', bg: '#D63DF615', icon: Loader,
    adminMeaning: 'AMPSUITE delivering to DSPs',
  },
  delivered_to_dsp: {
    label: 'Delivered to DSPs', artistLabel: 'Delivered — Going Live Soon',
    color: '#00C4FF', bg: '#00C4FF15', icon: Globe,
    adminMeaning: 'DSPs received the delivery',
  },
  scheduled: {
    label: 'Scheduled', artistLabel: 'Scheduled for Release',
    color: '#10B981', bg: '#10B98115', icon: Calendar,
    adminMeaning: 'Confirmed release date on DSPs',
  },
  live: {
    label: 'Live', artistLabel: 'Live on All Selected Stores',
    color: '#10B981', bg: '#10B98115', icon: CircleCheck,
    adminMeaning: 'Live on all selected DSPs',
  },
  // Legacy alias
  distributed: {
    label: 'Distributed', artistLabel: 'Live on All Selected Stores',
    color: '#10B981', bg: '#10B98115', icon: Globe,
    adminMeaning: 'Fully distributed',
  },
  rejected: {
    label: 'Rejected', artistLabel: 'Not Approved — See Notes',
    color: '#FF5252', bg: '#FF525215', icon: CircleX,
    adminMeaning: 'Release rejected',
  },
  on_hold: {
    label: 'On Hold', artistLabel: 'On Hold',
    color: '#F59E0B', bg: '#F59E0B15', icon: CirclePause,
    adminMeaning: 'Paused — admin decision needed',
  },
  takedown_requested: {
    label: 'Takedown Requested', artistLabel: 'Takedown in Progress',
    color: '#FF5252', bg: '#FF525215', icon: OctagonAlert,
    adminMeaning: 'Awaiting AMPSUITE takedown',
  },
  takedown_completed: {
    label: 'Taken Down', artistLabel: 'Removed from Stores',
    color: '#6B7280', bg: '#6B728015', icon: Archive,
    adminMeaning: 'Removed from all DSPs',
  },
};

export function getStatusCfg(status: string) {
  return STATUS_MAP[status] || STATUS_MAP.draft;
}

// ── Full DSP catalogue ─────────────────────────────────────────────────────────
export const STORES = [
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

export const STORE_MAP: Record<string, string> = Object.fromEntries(STORES.map(s => [s.id, s.name]));

// ── Genre list ─────────────────────────────────────────────────────────────────
export const GENRES = [
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

export const LANGUAGES = [
  'English', 'Spanish', 'French', 'Portuguese', 'German',
  'Italian', 'Arabic', 'Swahili', 'Yoruba', 'Igbo',
  'Hausa', 'Twi', 'Afrikaans', 'Zulu', 'Amharic',
  'Japanese', 'Korean', 'Mandarin', 'Hindi', 'Instrumental', 'Other',
];

export const RELEASE_TYPES = ['single', 'ep', 'album', 'mixtape', 'compilation'];

export const TERRITORIES = [
  { id: 'worldwide',     label: 'Worldwide — All Territories' },
  { id: 'north_america', label: 'North America' },
  { id: 'europe',        label: 'Europe' },
  { id: 'africa',        label: 'Africa' },
  { id: 'asia_pacific',  label: 'Asia Pacific' },
  { id: 'latin_america', label: 'Latin America' },
  { id: 'middle_east',   label: 'Middle East & North Africa' },
];

// ── AMPSUITE manual submission checklist template ──────────────────────────────
export const AMPSUITE_CHECKLIST = [
  { id: 'release_created',    label: 'Release created in AMPSUITE' },
  { id: 'audio_uploaded',     label: 'Audio files uploaded (WAV/FLAC)' },
  { id: 'cover_uploaded',     label: 'Cover art uploaded (3000×3000 JPG, RGB)' },
  { id: 'metadata_verified',  label: 'All metadata verified and saved' },
  { id: 'isrc_entered',       label: 'ISRC codes entered for each track' },
  { id: 'upc_entered',        label: 'UPC assigned or requested' },
  { id: 'release_date_set',   label: 'Release date confirmed on all platforms' },
  { id: 'delivery_confirmed', label: 'Delivery confirmed by AMPSUITE system' },
  { id: 'dsp_emails_received',label: 'DSP confirmation emails received' },
  { id: 'live_links_verified',label: 'Live links verified on all platforms' },
];

// ── Completeness scoring ───────────────────────────────────────────────────────
export function computeCompleteness(r: any): { score: number; missing: string[] } {
  const checks = [
    { label: 'Release title',        ok: !!r.title?.trim() },
    { label: 'Artist name',          ok: !!r.artist?.trim() },
    { label: 'Genre',                ok: !!r.genre?.trim() },
    { label: 'Release date',         ok: !!r.releaseDate },
    { label: 'Cover artwork',        ok: !!r.coverArtFileName || !!r.coverArt },
    { label: 'At least one track',   ok: Array.isArray(r.tracks) && r.tracks.length > 0 && !!r.tracks[0]?.title },
    { label: 'Audio files attached', ok: Array.isArray(r.tracks) && r.tracks.length > 0 && r.tracks.every((t: any) => !!t.fileName) },
    { label: 'Copyright line (©)',    ok: !!r.copyrightLine?.trim() },
    { label: 'Label name',           ok: !!r.label?.trim() },
    { label: 'DSP platforms selected',ok: Array.isArray(r.stores) && r.stores.length > 0 },
    { label: 'Language',             ok: !!r.language },
    { label: 'Legal confirmations',  ok: !!(r.confirmRights && r.confirmAccuracy && r.confirmAuthorization) },
  ];
  const completed = checks.filter(c => c.ok);
  const missing   = checks.filter(c => !c.ok).map(c => c.label);
  return { score: Math.round((completed.length / checks.length) * 100), missing };
}