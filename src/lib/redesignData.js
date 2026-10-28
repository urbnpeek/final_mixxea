/**
 * Pure catalogue transform for the V02 redesign.
 * Shared by the preview read path and scripts/migrate-redesign-data.js.
 * Does not read or write KV.
 */

const fs = require('fs');
const path = require('path');
const slugify = require('../utils/slugify');
const { scrubConfirm } = require('./scrubConfirm');

const BOOKING_EMAIL = 'booking@mixxea.com';
const NAKA_SPOTIFY = 'https://open.spotify.com/track/4ltsIrgI1ohN3NPDQ4O4ZH';
const CORAZON_SPOTIFY = 'https://open.spotify.com/track/0McK0zrgqBM0xx8scNhegq';

const CATEGORY_ALIASES = {
  agency: 'agency',
  freqvault: 'agency',
  events: 'agency',
  artists: 'artists',
  'artist-news': 'artists',
  'artist news': 'artists',
  releases: 'releases',
  'release-news': 'releases',
  'release news': 'releases',
  label: 'label',
  'label-news': 'label',
  'label news': 'label',
};

const ROSTER_PROFILES = [
  {
    slug: 'david-hopperman',
    name: 'David Hopperman',
    genre: 'Afro / Melodic House',
    city: 'Marseille',
    country: 'FR',
    bookable: true,
    bookingEmail: BOOKING_EMAIL,
    featured: 1,
    onRoster: true,
    type: 'booking',
    photo: '/img/roster/david-hopperman.webp',
    photoAlt: 'David Hopperman, portrait',
  },
  {
    slug: 'wally-lopez',
    name: 'Wally Lopez',
    genre: 'House / Tech House',
    city: 'Madrid',
    country: 'ES',
    bookable: true,
    bookingEmail: BOOKING_EMAIL,
    featured: 2,
    onRoster: true,
    type: 'both',
    photo: '/img/roster/wally-lopez.webp',
    photoAlt: 'Wally Lopez, portrait',
  },
  {
    slug: 'eddie-bitar',
    name: 'Eddie Bitar',
    // Genre TBC; no location on file. Neutral everywhere (profile, cards, schema).
    genre: 'Electronic music artist (genre TBC)',
    city: undefined,
    country: undefined,
    location: undefined,
    bookable: true,
    bookingEmail: BOOKING_EMAIL,
    featured: 3,
    onRoster: true,
    type: 'booking',
    photo: '/img/roster/eddie-bitar.webp',
    photoAlt: 'Eddie Bitar, portrait',
  },
];

const LABEL_ARTISTS = [
  { id: 's1nce', name: 'S1NCE', slug: 's1nce', type: 'label', onRoster: false, bookable: false, status: 'signed' },
  { id: 'fl3x', name: 'FL3X', slug: 'fl3x', type: 'label', onRoster: false, bookable: false, status: 'signed' },
];

// Search descriptions. Separate from biography. No line breaks.
const ARTIST_META_DESCRIPTIONS = {
  'david-hopperman': 'David Hopperman blends French Touch with refined house sensibilities. Read his Mixxea artist profile: biography, releases and booking via booking@mixxea.com.',
  'wally-lopez': 'Wally Lopez is a Spanish house DJ, producer and radio host with a career spanning over two decades. Mixxea artist profile, releases and booking enquiries.',
  'eddie-bitar': 'Eddie Bitar is an electronic music artist on the Mixxea roster. Read his profile and send booking enquiries to FreqVault Agency: booking@mixxea.com.',
  's1nce': 'S1NCE is an artist on the Mixxea Records roster. See the Mixxea artist profile, releases including Naka, and booking enquiries via booking@mixxea.com.',
  'fl3x': 'FL3X is an artist on the Mixxea Records roster. See the Mixxea artist profile, releases including Corazon, and booking enquiries via booking@mixxea.com.',
};

const CATEGORIES = [
  { slug: 'label', name: 'Label', description: '', accent: 'label' },
  { slug: 'agency', name: 'Agency', description: '', accent: 'agency' },
  { slug: 'releases', name: 'Releases', description: '', accent: 'label' },
  { slug: 'artists', name: 'Artists', description: '', accent: 'label' },
];

const DRAFT_CATS = new Set(['MXX-007', 'MXX-054', 'MXX-055', 'MXX-057']);

// Confirmed on the 20 Oct 2026 Beatport sheet. catNo is the Beatport catalogue
// number. Spotify, Apple Music, and Deezer are unknown and stay empty.
const CONFIRMED_RELEASES = [
  {
    id: 'fsr004',
    slug: 'wally-lopez-american-icon-remixes',
    title: 'American Icon (Remixes)',
    artist: 'Wally Lopez',
    label: 'Mixxea Records',
    date: '2018-09-03',
    catNo: 'FSR004',
    beatport: 'https://www.beatport.com/release/american-icon-remixes/6844691',
    artwork: 'https://geo-media.beatport.com/image_size/1400x1400/ba21e77a-34d7-48c0-bfe2-c8cec75823f4.jpg',
    aliases: ['MXX-057', 'FSR004'],
  },
  {
    id: 'ajr007',
    slug: 'david-hopperman-gotta-be-the-one',
    title: 'Gotta Be the One',
    artist: 'David Hopperman; The Subject',
    label: 'Mixxea Records',
    date: '2017-08-07',
    catNo: 'AJR007',
    // Document title only. The shared "{title} — {artist} | Mixxea Records"
    // template stays, so other release titles are unchanged. H1 stays the track title.
    seoTitle: 'Gotta Be the One — David Hopperman; The Subject | Mixxea',
    beatport: 'https://www.beatport.com/release/gotta-be-the-one/6841378',
    artwork: 'https://geo-media.beatport.com/image_size/1400x1400/934f516a-cdce-4a30-a3c7-8c96b6c7bdc3.jpg',
    aliases: ['MXX-007', 'AJR007'],
  },
  {
    id: 'mxr010',
    slug: 'david-hopperman-love-fake',
    title: 'Love & Fake',
    artist: 'David Hopperman; Jayy Dee',
    label: 'Mixxea Records',
    date: '2019-07-01',
    catNo: 'MXR010',
    beatport: 'https://www.beatport.com/release/love-fake/2629699',
    artwork: 'https://geo-media.beatport.com/image_size/1400x1400/4d239b09-e750-4c67-9151-ac33e6b6c055.jpg',
    aliases: ['MXX-052', 'MXR010'],
  },
];

const UNCONFIRMED_LINKS = {
  'MXX-092': ['apple', 'beatport', 'soundcloud', 'bandcamp'],
  'MXX-087': ['apple', 'beatport', 'soundcloud', 'bandcamp'],
  'MXX-052': ['spotify', 'apple', 'soundcloud', 'bandcamp'],
  'MXX-007': ['spotify', 'apple', 'soundcloud', 'bandcamp'],
  'MXX-054': ['spotify', 'apple', 'beatport', 'soundcloud', 'bandcamp'],
  'MXX-055': ['spotify', 'apple', 'beatport', 'soundcloud', 'bandcamp'],
  'MXX-057': ['spotify', 'apple', 'beatport', 'soundcloud', 'bandcamp'],
};

// Covers that belong to the three confirmed releases. Copying any of them
// onto another title is the shared-artwork failure. American Icon's
// ba21e77a file is the one that was showing up on the older pages.
const RESERVED_ART = [
  'ba21e77a-34d7-48c0-bfe2-c8cec75823f4',
  '934f516a-cdce-4a30-a3c7-8c96b6c7bdc3',
  '4d239b09-e750-4c67-9151-ac33e6b6c055',
];

// Spotify ids already stored for one release. A copy on a different title
// is dropped instead of repeated.
const SPOTIFY_OWNER = {
  '4ltsIrgI1ohN3NPDQ4O4ZH': 'FSR40',
  '0McK0zrgqBM0xx8scNhegq': 'FSR037',
  '2KlYubUf1bfOgQcjYetjUm': 'FSR43',
  '0l1BIKCEKaC5xOmsxTT6L4': 'FSR42',
};

// Beatport catalogue numbers confirmed 21 Oct 2026. Artwork and Spotify come
// from that release's own stored record, or from a cover file already in the
// repo. Beatport CDN images are not introduced here.
const BEATPORT_CATALOGUE = [
  {
    id: 'fsr43',
    slug: 'kenta-dirty-circuit',
    title: 'Dirty Circuit',
    titles: ['dirty circuit'],
    artist: 'KENTA',
    aliases: ['MXX-091', 'FSR43'],
    catNo: 'FSR43',
    beatport: 'https://www.beatport.com/release/dirty-circuit/6851284',
    date: '2025-06-30',
    promote: false,
    clearUnconfirmed: false,
    spotify: '',
  },
  {
    id: 'fsr42',
    slug: 'bennyhews-something-else',
    title: 'Something Else',
    titles: ['something else'],
    artist: 'Bennyhews',
    aliases: ['FSR42'],
    catNo: 'FSR42',
    beatport: 'https://www.beatport.com/release/something-else/6779285',
    date: '2025-06-30',
    promote: false,
    clearUnconfirmed: false,
    spotify: '',
  },
  {
    id: 'fsr40',
    slug: 's1nce-naka',
    title: 'Naka',
    titles: ['naka'],
    artist: 'S1NCE',
    aliases: ['MXX-092', 'FSR40'],
    catNo: 'FSR40',
    beatport: 'https://www.beatport.com/release/naka/6851275',
    date: '2025-07-01',
    promote: true,
    clearUnconfirmed: true,
    spotify: NAKA_SPOTIFY,
    genre: 'Afro House',
    localCover: {
      full: '/img/covers/MXX-092_1600.webp',
      thumb: '/img/covers/MXX-092_600.webp',
      og: '/og/og-release-mxx-092.jpg',
    },
  },
  {
    id: 'fsr037',
    slug: 'fl3x-corazon',
    title: 'Corazon',
    titles: ['corazon'],
    artist: 'FL3X',
    aliases: ['MXX-087', 'FSR037'],
    catNo: 'FSR037',
    beatport: 'https://www.beatport.com/release/corazon/6851269',
    date: '2025-03-07',
    promote: true,
    clearUnconfirmed: true,
    spotify: CORAZON_SPOTIFY,
    genre: 'Afro House',
    localCover: {
      full: '/img/covers/MXX-087_1600.webp',
      thumb: '/img/covers/MXX-087_600.webp',
    },
  },
];

function clone(value) {
  return JSON.parse(JSON.stringify(value == null ? null : value));
}

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function artistKey(artist) {
  const slug = slugify(artist && (artist.slug || artist.name));
  return slug || String(artist && artist.id || '').toLowerCase();
}

function collapseMeta(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function explicitArtistDescription(artist) {
  const approved = ARTIST_META_DESCRIPTIONS[artistKey(artist)];
  if (approved) return approved;
  return collapseMeta(artist && artist.description);
}

function catKey(release) {
  return String(release && release.catNo || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
}

function catLabel(release) {
  const raw = String(release && release.catNo || '').trim().toUpperCase();
  const compact = raw.replace(/\s+/g, '');
  if (/^MXX-?\d+$/.test(compact)) {
    const digits = raw.replace(/\D/g, '');
    return 'MXX-' + digits.padStart(3, '0');
  }
  const fsr = compact.match(/^FSR-?(\d+)$/);
  if (fsr) return 'FSR' + fsr[1];
  return raw;
}

function isFakeArtist(artist) {
  const slug = artistKey(artist);
  const name = String(artist && artist.name || '').trim().toLowerCase();
  return slug === 'vexr' || slug === 'lyda' || name === 'vexr' || name === 'lyda';
}

function isFakeRelease(release) {
  const cat = catKey(release);
  if (cat === 'MXA004' || cat === 'MXA005') return true;
  const title = String(release && release.title || '').trim().toLowerCase();
  const artist = String(release && release.artist || '').trim().toLowerCase();
  if (title === 'grind system ep' && (artist === 'vexr' || cat === 'MXA004')) return true;
  if (title === 'void protocol' && (artist === 'lyda' || cat === 'MXA005')) return true;
  return false;
}

function mentionsFake(record) {
  const text = JSON.stringify(record || {});
  return /\bVEXR\b/i.test(text) || /\bLYDA\b/i.test(text);
}

function creditNames(release) {
  if (Array.isArray(release && release.artists) && release.artists.length) {
    return release.artists.map((name) => String(name).trim()).filter(Boolean);
  }
  const raw = String(release && release.artist || '');
  const names = [];
  for (const part of raw.split(/\s+(?:feat\.?|ft\.?|featuring)\s+/i)) {
    for (const name of part.split(/\s*(?:;|,|\/|&|\+)\s*|\s+\band\b\s+/i)) {
      const trimmed = name.trim();
      if (trimmed) names.push(trimmed);
    }
  }
  return names;
}

function spotifyEmbedId(url) {
  const match = String(url || '').match(/open\.spotify\.com\/(?:embed\/)?track\/([A-Za-z0-9]+)/);
  return match ? match[1] : '';
}

function spotifyId(url) {
  const match = String(url || '').match(/open\.spotify\.com\/(?:embed\/)?(?:track|album)\/([A-Za-z0-9]+)/);
  return match ? match[1] : '';
}

function plainTitle(value) {
  return scrubConfirm(String(value || '')).trim().toLowerCase();
}

function matchesConfirmed(release, spec) {
  if (!release || !spec) return false;
  if (plainTitle(release.title) === spec.title.toLowerCase()) return true;
  return spec.aliases.includes(catLabel(release));
}

function confirmedRecord(spec) {
  const links = {
    spotify: '',
    apple: '',
    beatport: spec.beatport,
    soundcloud: '',
    bandcamp: '',
    youtube: '',
  };
  return {
    id: spec.id,
    slug: spec.slug,
    title: spec.title,
    artist: spec.artist,
    artists: creditNames({ artist: spec.artist }),
    label: spec.label,
    date: spec.date,
    releaseDate: spec.date,
    catNo: spec.catNo,
    status: 'out',
    description: '',
    artwork: spec.artwork,
    artworkThumb: spec.artwork,
    cover: {
      url: spec.artwork,
      thumbUrl: spec.artwork,
      alt: `${spec.title} by ${spec.artist}, cover artwork`,
    },
    ...links,
    links,
    embed: null,
    ...(spec.seoTitle ? { seo: { title: spec.seoTitle } } : {}),
  };
}

function applyConfirmedRelease(release) {
  const spec = CONFIRMED_RELEASES.find((item) => matchesConfirmed(release, item));
  if (!spec) return null;
  const next = confirmedRecord(spec);
  if (release && release.id) next.id = release.id;
  return scrubConfirm(next);
}

function ensureConfirmedReleases(releases) {
  const list = asList(releases).filter(Boolean).map(clone);
  for (const spec of CONFIRMED_RELEASES) {
    if (!list.some((release) => matchesConfirmed(release, spec))) list.push(confirmedRecord(spec));
  }
  return list;
}

function emptyLinks(release, keys) {
  const links = release.links && typeof release.links === 'object' ? { ...release.links } : {};
  for (const key of keys) {
    release[key] = '';
    links[key] = '';
  }
  release.links = links;
}

function launchRelease(spec) {
  const links = {
    spotify: spec.spotify || '',
    apple: '',
    beatport: spec.beatport || '',
    soundcloud: '',
    bandcamp: '',
    youtube: '',
  };
  const artwork = spec.artwork || '';
  const artworkThumb = spec.artworkThumb || artwork;
  return {
    id: spec.id,
    slug: spec.slug,
    title: spec.title,
    artist: spec.artist,
    artists: [spec.artist],
    genre: 'Afro House',
    catNo: spec.catNo,
    date: spec.date,
    releaseDate: spec.date,
    status: 'out',
    label: 'Mixxea Records',
    type: 'single',
    format: 'single',
    description: '',
    artwork,
    artworkThumb,
    cover: {
      url: artwork,
      thumbUrl: artworkThumb,
      alt: `${spec.title} by ${spec.artist}, cover artwork`,
      w: 1600,
      h: 1600,
    },
    ...links,
    links,
    embed: spec.spotify ? { provider: 'spotify', id: spotifyEmbedId(spec.spotify) } : null,
    ogImage: spec.ogImage || '',
  };
}

const LAUNCH = [
  launchRelease({
    id: 'mxx-092',
    slug: 's1nce-naka',
    title: 'Naka',
    artist: 'S1NCE',
    catNo: 'FSR40',
    date: '2025-07-01',
    spotify: NAKA_SPOTIFY,
    beatport: 'https://www.beatport.com/release/naka/6851275',
    artwork: '/img/covers/MXX-092_1600.webp',
    artworkThumb: '/img/covers/MXX-092_600.webp',
    ogImage: '/og/og-release-mxx-092.jpg',
  }),
  launchRelease({
    id: 'mxx-087',
    slug: 'fl3x-corazon',
    title: 'Corazon',
    artist: 'FL3X',
    catNo: 'FSR037',
    date: '2025-03-07',
    spotify: CORAZON_SPOTIFY,
    beatport: 'https://www.beatport.com/release/corazon/6851269',
    artwork: '/img/covers/MXX-087_1600.webp',
    artworkThumb: '/img/covers/MXX-087_600.webp',
  }),
];

function canonicalCategorySlug(value) {
  return CATEGORY_ALIASES[String(value || '').trim().toLowerCase()] || '';
}

function stripUploadUrl(value) {
  const url = String(value || '').trim();
  if (!url || /\/uploads\//i.test(url)) return '';
  return url;
}

function namesMatch(release, artist) {
  const wanted = String(artist || '').trim().toLowerCase();
  if (!wanted) return false;
  if (creditNames(release).some((name) => name.toLowerCase() === wanted)) return true;
  return String(release && release.artist || '').trim().toLowerCase() === wanted;
}

function matchesBeatport(release, spec) {
  if (!release || !spec) return false;
  const cat = catLabel(release);
  if (cat && spec.aliases.includes(cat)) return true;
  return spec.titles.includes(plainTitle(release.title)) && namesMatch(release, spec.artist);
}

function beatportSpecFor(release) {
  return BEATPORT_CATALOGUE.find((spec) => matchesBeatport(release, spec)) || null;
}

function storedFlag(value) {
  return value === true || value === 'true' || value === 1 || value === '1' || value === 'on';
}

function cleanArtUrl(url) {
  const text = String(url || '').trim();
  if (!text || /\/uploads\//i.test(text)) return '';
  if (RESERVED_ART.some((id) => text.includes(id))) return '';
  if (/^https?:\/\//i.test(text)) return text;
  if (text.startsWith('/') && !text.startsWith('//')) return text;
  return '';
}

function fileUrl(urlPath) {
  const text = String(urlPath || '');
  if (!text.startsWith('/') || text.startsWith('//') || text.includes('..')) return '';
  const file = path.join(__dirname, '../../public', text.replace(/^\/+/, ''));
  return fs.existsSync(file) ? text : '';
}

function ownedSpotify(release, spec) {
  const url = String((release && release.spotify) || (release && release.links && release.links.spotify) || '').trim();
  const id = spotifyId(url);
  const owner = SPOTIFY_OWNER[id];
  if (url && /^https?:\/\//i.test(url) && (!owner || owner === spec.catNo)) return url;
  if (spec.spotify) return spec.spotify;
  return '';
}

function ownedArtwork(release, spec) {
  const full = cleanArtUrl(release && release.artwork) || cleanArtUrl(release && release.cover && release.cover.url);
  const thumb = cleanArtUrl(release && release.artworkThumb) || cleanArtUrl(release && release.cover && release.cover.thumbUrl);
  const og = cleanArtUrl(release && release.ogImage);
  const alt = (release && release.cover && release.cover.alt) || `${(release && release.title) || spec.title} by ${(release && release.artist) || spec.artist}, cover artwork`;
  if (full) {
    return {
      artwork: full,
      artworkThumb: thumb || full,
      cover: {
        url: full,
        thumbUrl: thumb || full,
        alt,
        ...(release.cover && release.cover.w ? { w: release.cover.w } : {}),
        ...(release.cover && release.cover.h ? { h: release.cover.h } : {}),
      },
      ogImage: og || fileUrl(spec.localCover && spec.localCover.og),
    };
  }
  const localFull = fileUrl(spec.localCover && spec.localCover.full);
  const localThumb = fileUrl(spec.localCover && spec.localCover.thumb) || localFull;
  if (!localFull) return { artwork: '', artworkThumb: '', cover: null, ogImage: og || fileUrl(spec.localCover && spec.localCover.og) };
  return {
    artwork: localFull,
    artworkThumb: localThumb,
    cover: {
      url: localFull,
      thumbUrl: localThumb,
      alt: `${spec.title} by ${spec.artist}, cover artwork`,
      w: 1600,
      h: 1600,
    },
    ogImage: og || fileUrl(spec.localCover && spec.localCover.og),
  };
}

function applyBeatportCatalogue(release) {
  const spec = beatportSpecFor(release);
  if (!spec) return null;
  const next = { ...release };
  const previousLinks = next.links && typeof next.links === 'object' ? next.links : {};
  const spotify = ownedSpotify(release, spec);
  const art = ownedArtwork(release, spec);
  const cleared = spec.clearUnconfirmed;
  next.catNo = spec.catNo;
  next.label = 'Mixxea Records';
  next.date = spec.date;
  next.releaseDate = spec.date;
  if (!next.slug) next.slug = spec.slug;
  if (!next.id) next.id = spec.id;
  if (!next.title) next.title = spec.title;
  if (!next.artist) next.artist = spec.artist;
  next.artists = creditNames(next);
  if (storedFlag(release && release.catalogueOnly)) next.catalogueOnly = true;
  else delete next.catalogueOnly;
  if (spec.promote && (!next.status || next.status === 'draft')) next.status = 'out';
  if (spec.genre && !next.genre) next.genre = spec.genre;
  if (!next.format && next.type) next.format = next.type === 'remix' ? 'remixes' : next.type;
  next.spotify = spotify;
  next.apple = cleared ? '' : (next.apple || previousLinks.apple || '');
  next.beatport = spec.beatport;
  next.soundcloud = cleared ? '' : (next.soundcloud || previousLinks.soundcloud || '');
  next.bandcamp = cleared ? '' : (next.bandcamp || previousLinks.bandcamp || '');
  next.youtube = next.youtube || previousLinks.youtube || '';
  next.links = {
    spotify,
    apple: next.apple,
    beatport: spec.beatport,
    soundcloud: next.soundcloud,
    bandcamp: next.bandcamp,
    youtube: next.youtube,
  };
  const track = spotifyEmbedId(spotify);
  next.embed = track ? { provider: 'spotify', id: track } : null;
  next.artwork = art.artwork;
  next.artworkThumb = art.artworkThumb;
  next.cover = art.cover;
  if (art.ogImage) next.ogImage = art.ogImage;
  else if (next.ogImage && RESERVED_ART.some((id) => String(next.ogImage).includes(id))) next.ogImage = '';
  return scrubConfirm(next);
}

function applyReleaseFixes(release) {
  const confirmed = applyConfirmedRelease(release);
  if (confirmed) return confirmed;
  const beatport = applyBeatportCatalogue(release);
  if (beatport) return beatport;
  const next = { ...release };
  const label = catLabel(next);
  if (label) next.catNo = label;
  if (!next.slug) next.slug = slugify(`${next.artist || 'release'}-${next.title || 'untitled'}`) || next.id;
  next.artists = creditNames(next);
  if (!next.format && next.type) next.format = next.type === 'remix' ? 'remixes' : next.type;
  const cat = catLabel(next);
  const clear = UNCONFIRMED_LINKS[cat] || [];
  if (clear.length) emptyLinks(next, clear);
  if (DRAFT_CATS.has(cat)) next.status = 'draft';
  if (DRAFT_CATS.has(cat)) {
    const year = String(next.date || next.releaseDate || '').match(/\d{4}/);
    next.date = year ? year[0] : '';
    next.releaseDate = next.date;
  }
  const spotify = next.spotify || (next.links && next.links.spotify) || '';
  if (!next.embed && spotify) {
    const id = spotifyEmbedId(spotify);
    if (id) next.embed = { provider: 'spotify', id };
  } else if (next.embed && next.embed.id && !spotifyEmbedId(spotify) && /\/album\//.test(spotify)) {
    next.embed = null;
  }
  return scrubConfirm(next);
}

function matchesProfile(artist, profile) {
  if (artistKey(artist) === profile.slug) return true;
  if (String(artist.name || '').trim().toLowerCase() === profile.name.toLowerCase()) return true;
  const blob = `${artistKey(artist)} ${String(artist.name || '')} ${String(artist.id || '')}`.toLowerCase();
  if (profile.slug === 'david-hopperman') return blob.includes('hopperman');
  if (profile.slug === 'wally-lopez') return blob.includes('wally') && blob.includes('lopez');
  if (profile.slug === 'eddie-bitar') return blob.includes('bitar');
  return false;
}

function transformArtists(artists) {
  const list = asList(artists).filter((artist) => artist && !isFakeArtist(artist)).map((artist) => ({ ...artist }));
  for (const profile of ROSTER_PROFILES) {
    const index = list.findIndex((artist) => matchesProfile(artist, profile));
    if (index === -1) {
      list.push({
        id: profile.slug,
        name: profile.name,
        slug: profile.slug,
        status: 'signed',
        ...profile,
      });
      continue;
    }
    const current = list[index];
    list[index] = {
      ...current,
      slug: current.slug || profile.slug,
      genre: profile.genre,
      city: profile.city,
      country: profile.country,
      ...('location' in profile ? { location: profile.location } : {}),
      bookable: true,
      bookingEmail: BOOKING_EMAIL,
      featured: profile.featured,
      onRoster: true,
      type: profile.type,
      photo: profile.photo,
      photoAlt: current.photoAlt || profile.photoAlt,
      description: explicitArtistDescription({ ...current, slug: current.slug || profile.slug }),
    };
  }
  for (const label of LABEL_ARTISTS) {
    const index = list.findIndex((artist) => artistKey(artist) === label.slug || String(artist.name || '').trim().toLowerCase() === label.name.toLowerCase());
    if (index === -1) list.push({ ...label });
    else list[index] = { ...list[index], description: explicitArtistDescription({ ...list[index], slug: list[index].slug || label.slug }) };
  }
  const roster = new Set(ROSTER_PROFILES.map((profile) => profile.slug));
  for (const artist of list) {
    if (!roster.has(artistKey(artist)) && !ROSTER_PROFILES.some((profile) => matchesProfile(artist, profile))) {
      artist.bookable = false;
    }
  }
  return list.map((artist) => scrubConfirm({
    ...artist,
    description: explicitArtistDescription(artist),
  }));
}

function transformReleases(releases) {
  const list = ensureConfirmedReleases(asList(releases).filter((release) => release && !isFakeRelease(release))).map(applyReleaseFixes);
  for (const launch of LAUNCH) {
    const spec = BEATPORT_CATALOGUE.find((item) => item.slug === launch.slug);
    const index = list.findIndex((release) => (spec && matchesBeatport(release, spec)) || release.id === launch.id);
    if (index === -1) {
      list.push(applyReleaseFixes(clone(launch)));
      continue;
    }
    list[index] = applyReleaseFixes({
      ...launch,
      ...list[index],
      id: list[index].id || launch.id,
      slug: list[index].slug || launch.slug,
    });
  }
  return list;
}

function transformNews(news) {
  return asList(news).filter((item) => item && !mentionsFake(item)).map((item) => {
    const next = { ...item };
    const category = canonicalCategorySlug(next.category);
    if (category) next.category = category;
    next.image = stripUploadUrl(next.image);
    if (next.ogImage) next.ogImage = stripUploadUrl(next.ogImage);
    if (next.cover) {
      next.cover = {
        ...next.cover,
        url: stripUploadUrl(next.cover.url),
        thumbUrl: stripUploadUrl(next.cover.thumbUrl),
      };
    }
    return next;
  });
}

function transformEvents(events) {
  return asList(events).filter((item) => item && !mentionsFake(item)).map((item) => ({ ...item }));
}

function transformCategories(categories) {
  const list = asList(categories).map((item) => ({ ...item }));
  for (const category of CATEGORIES) {
    if (!list.some((item) => String(item.slug || '').toLowerCase() === category.slug)) list.push({ ...category });
  }
  return list;
}

function transform(data) {
  const source = data || {};
  return scrubConfirm({
    artists: transformArtists(clone(source.artists)),
    releases: transformReleases(clone(source.releases)),
    news: transformNews(clone(source.news)),
    events: transformEvents(clone(source.events)),
    categories: transformCategories(clone(source.categories)),
  });
}

function restoreCollections(current, backup) {
  const next = {
    artists: asList(current.artists).map(clone),
    releases: asList(current.releases).map(clone),
    news: asList(current.news).map(clone),
    events: asList(current.events).map(clone),
    categories: asList(current.categories).map(clone),
  };
  const touched = (backup && backup.touched) || {};
  for (const row of asList(backup && backup.plan)) {
    const list = next[row.collection];
    if (!list) continue;
    const saved = asList(touched[row.collection]).find((item) => recordId(item, row.collection) === row.id);
    const index = list.findIndex((item) => recordId(item, row.collection) === row.id);
    if (row.action === 'add') {
      if (index !== -1) list.splice(index, 1);
      continue;
    }
    if (!saved) continue;
    if (index === -1) list.push(clone(saved));
    else list[index] = clone(saved);
  }
  return next;
}

function transformCollection(name, records) {
  const input = { artists: [], releases: [], news: [], events: [], categories: [] };
  input[name] = records;
  return transform(input)[name];
}

function recordId(record, fallback) {
  return String(record && (record.id || record.slug || record.catNo || record.name) || fallback);
}

function diffLists(before, after, label) {
  const left = asList(before);
  const right = asList(after);
  const used = new Set();
  const rows = [];
  for (const record of left) {
    const id = recordId(record, label);
    const matchIndex = right.findIndex((item, index) => !used.has(index) && recordId(item, label) === id);
    if (matchIndex === -1) {
      rows.push({ action: 'delete', collection: label, id, title: record.name || record.title || record.catNo || id });
      continue;
    }
    used.add(matchIndex);
    const next = right[matchIndex];
    const fields = fieldChanges(record, next);
    if (fields.length) {
      rows.push({
        action: 'change',
        collection: label,
        id,
        title: next.name || next.title || next.catNo || id,
        fields,
      });
    }
  }
  right.forEach((record, index) => {
    if (used.has(index)) return;
    const id = recordId(record, label);
    rows.push({ action: 'add', collection: label, id, title: record.name || record.title || record.catNo || id });
  });
  return rows;
}

function fieldChanges(before, after) {
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  const fields = [];
  for (const key of [...keys].sort()) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) fields.push(key);
  }
  return fields;
}

function diffPlan(before, after) {
  return [
    ...diffLists(before.artists, after.artists, 'artists'),
    ...diffLists(before.releases, after.releases, 'releases'),
    ...diffLists(before.news, after.news, 'news'),
    ...diffLists(before.events, after.events, 'events'),
    ...diffLists(before.categories, after.categories, 'categories'),
  ];
}

function touchedRecords(before, after, plan) {
  const backup = { artists: [], releases: [], news: [], events: [], categories: [] };
  for (const row of plan) {
    const source = row.action === 'add' ? after : before;
    const list = asList(source[row.collection]);
    const record = list.find((item) => recordId(item, row.collection) === row.id);
    if (record) backup[row.collection].push(clone(record));
  }
  return backup;
}

module.exports = {
  BOOKING_EMAIL,
  CATEGORIES,
  CATEGORY_ALIASES,
  LAUNCH,
  canonicalCategorySlug,
  transform,
  transformCollection,
  applyReleaseFixes,
  ensureConfirmedReleases,
  diffPlan,
  touchedRecords,
  restoreCollections,
  isFakeArtist,
  isFakeRelease,
  creditNames,
  explicitArtistDescription,
};
