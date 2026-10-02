/**
 * Whitelist and normalise release / news records.
 * Unknown request fields are dropped. Slugs freeze once a record has been public.
 */

const crypto = require('crypto');
const slugify = require('../utils/slugify');
const { categoryByInput } = require('./categories');

const RELEASE_TYPES = new Set(['single', 'ep', 'album', 'compilation', 'remix']);
const PUBLIC_RELEASE_STATUSES = new Set(['published', 'scheduled', 'soon', 'pre', 'out']);
const RELEASE_STATUSES = new Set(['draft', 'published', 'unpublished', 'scheduled', 'soon', 'pre', 'out', 'archived', 'hidden', 'cancelled']);
const POST_STATUSES = new Set(['draft', 'published', 'unpublished', 'scheduled']);

function clip(value, max) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  return text.slice(0, max);
}

function cleanUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

function cleanSlug(value) {
  return slugify(value).slice(0, 96);
}

function cleanIdList(value) {
  let list = value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      list = parsed;
    } catch {
      list = trimmed.split(',');
    }
  }
  if (!Array.isArray(list)) return [];
  const ids = [];
  for (const item of list) {
    const id = String(item || '').trim();
    if (id && /^[a-zA-Z0-9_-]{1,80}$/.test(id) && !ids.includes(id)) ids.push(id);
  }
  return ids.slice(0, 24);
}

function cleanTracks(value) {
  let list = value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      list = JSON.parse(trimmed);
    } catch {
      list = trimmed.split('\n').map((line) => {
        const [title, artist, duration, isrc] = line.split('|').map((part) => part.trim());
        return { title, artist, duration, isrc };
      });
    }
  }
  if (!Array.isArray(list)) return [];
  return list.map((track) => ({
    title: clip(track && track.title, 200),
    artist: clip(track && track.artist, 200),
    duration: clip(track && track.duration, 32),
    isrc: clip(track && track.isrc, 32),
  })).filter((track) => track.title).slice(0, 50);
}

function asBool(value) {
  return value === true || value === 'true' || value === '1' || value === 'on';
}

function asInt(value) {
  if (value === '' || value == null) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

function actorName(actor) {
  if (!actor) return 'Admin';
  return clip(actor.name || actor.email || 'Admin', 120) || 'Admin';
}

function releaseSlug(artist, title) {
  return cleanSlug(`${artist || 'release'}-${title || 'untitled'}`) || 'release';
}

function nextReleaseStatus(body, previous) {
  const action = String(body.action || '').toLowerCase();
  if (action === 'publish') return 'published';
  if (action === 'unpublish') return 'unpublished';
  if (action === 'draft' || action === 'save-draft') return 'draft';
  const status = String(body.status || (previous && previous.status) || 'draft').toLowerCase();
  return RELEASE_STATUSES.has(status) ? status : 'draft';
}

function nextPostStatus(body, previous) {
  const action = String(body.action || '').toLowerCase();
  if (action === 'publish') return 'published';
  if (action === 'unpublish') return 'unpublished';
  if (action === 'draft' || action === 'save-draft') return 'draft';
  const status = String(body.status || (previous && previous.status) || 'draft').toLowerCase();
  return POST_STATUSES.has(status) ? status : 'draft';
}

function linkBag(body, previous) {
  const src = body.links && typeof body.links === 'object' ? body.links : {};
  const prev = previous && previous.links && typeof previous.links === 'object' ? previous.links : {};
  const pick = (key) => {
    if (Object.prototype.hasOwnProperty.call(body, key) || Object.prototype.hasOwnProperty.call(src, key)) {
      const value = Object.prototype.hasOwnProperty.call(body, key) ? body[key] : src[key];
      return cleanUrl(value);
    }
    return cleanUrl(prev[key] || (previous && previous[key]) || '');
  };
  return {
    spotify: pick('spotify'),
    apple: pick('apple'),
    beatport: pick('beatport'),
    soundcloud: pick('soundcloud'),
    bandcamp: pick('bandcamp'),
    youtube: pick('youtube'),
  };
}

function coverFrom(body, previous, uploads) {
  const prevCover = previous && previous.cover && typeof previous.cover === 'object' ? previous.cover : {};
  const url = (uploads && uploads.artwork) || cleanUrl(body.artwork) || prevCover.url || (previous && cleanUrl(previous.artwork)) || '';
  const thumbUrl = (uploads && uploads.artworkThumb) || prevCover.thumbUrl || '';
  const alt = clip(body.coverAlt || body.alt || (body.cover && body.cover.alt) || prevCover.alt || '', 180);
  const w = asInt(body.coverW || (body.cover && body.cover.w) || prevCover.w);
  const h = asInt(body.coverH || (body.cover && body.cover.h) || prevCover.h);
  if (!url && !thumbUrl) return null;
  return {
    url,
    thumbUrl,
    alt,
    ...(w ? { w } : {}),
    ...(h ? { h } : {}),
  };
}

function seoFrom(body, previous, uploads) {
  const src = body.seo && typeof body.seo === 'object' ? body.seo : {};
  const prev = previous && previous.seo && typeof previous.seo === 'object' ? previous.seo : {};
  const title = clip(body.seoTitle || src.title || '', 60);
  const description = clip(body.seoDescription || src.description || '', 160);
  const ogImage = (uploads && uploads.ogImage) || cleanUrl(body.ogImage || src.ogImage || prev.ogImage || '');
  const seo = {};
  if (title) seo.title = title;
  if (description) seo.description = description;
  if (ogImage) seo.ogImage = ogImage;
  return seo;
}

function stableId(prefix, parts) {
  const hash = crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 24);
  return `${prefix}-${hash}`;
}

function applySlugChange(previous, slug, status) {
  const wasPublic = previous && PUBLIC_RELEASE_STATUSES.has(String(previous.status || '').toLowerCase());
  const frozen = Boolean(previous && (previous.slugFrozen || wasPublic));
  let previousSlugs = previous && Array.isArray(previous.previousSlugs) ? previous.previousSlugs.filter(Boolean) : [];
  if (previous && previous.slug && previous.slug !== slug && (frozen || PUBLIC_RELEASE_STATUSES.has(status))) {
    if (!previousSlugs.includes(previous.slug)) previousSlugs = previousSlugs.concat(previous.slug);
  }
  previousSlugs = previousSlugs.filter((item) => item !== slug);
  const slugFrozen = frozen || PUBLIC_RELEASE_STATUSES.has(status) || status === 'published';
  return { previousSlugs, slugFrozen };
}

function normalizeRelease(body, previous, actor, uploads) {
  const source = body || {};
  const title = clip(source.title || (previous && previous.title) || '', 200);
  const artist = clip(source.artist || (previous && previous.artist) || '', 200);
  if (!title || !artist) {
    const error = new Error('Title and artist are required');
    error.status = 400;
    throw error;
  }
  const status = nextReleaseStatus(source, previous);
  let slug = cleanSlug(source.slug);
  const wasPublic = previous && PUBLIC_RELEASE_STATUSES.has(String(previous.status || '').toLowerCase());
  if (!slug) {
    if (previous && previous.slug && (wasPublic || previous.slugFrozen)) slug = previous.slug;
    else slug = releaseSlug(artist, title);
  }
  const { previousSlugs, slugFrozen } = applySlugChange(previous, slug, status);
  const links = linkBag(source, previous);
  const cover = coverFrom(source, previous, uploads);
  if ((uploads && (uploads.artwork || uploads.artworkThumb || uploads.ogImage)) && !(cover && cover.alt)) {
    const error = new Error('Alt text is required for the cover image');
    error.status = 400;
    throw error;
  }
  const now = new Date().toISOString();
  const who = actorName(actor);
  const date = clip(source.releaseDate || source.date || (previous && (previous.releaseDate || previous.date)) || '', 10);
  let publishedAt = previous && previous.publishedAt || '';
  if (PUBLIC_RELEASE_STATUSES.has(status)) publishedAt = publishedAt || now;
  if (status === 'draft' || status === 'unpublished' || status === 'archived') publishedAt = '';
  const expectedRev = previous ? Number(previous.rev) || 0 : 0;
  return {
    id: (previous && previous.id) || source.id || crypto.randomUUID(),
    slug,
    previousSlugs,
    slugFrozen,
    title,
    artist,
    artistIds: cleanIdList(source.artistIds != null ? source.artistIds : (previous && previous.artistIds)),
    type: RELEASE_TYPES.has(String(source.type || '').toLowerCase())
      ? String(source.type).toLowerCase()
      : ((previous && previous.type) || 'single'),
    catNo: source.catNo != null ? clip(source.catNo, 40) : clip(previous && previous.catNo, 40),
    label: clip(source.label || (previous && previous.label) || 'Mixxea Records', 80),
    genre: source.genre != null ? clip(source.genre, 80) : clip(previous && previous.genre, 80),
    bpm: asInt(source.bpm != null && source.bpm !== '' ? source.bpm : (previous && previous.bpm)),
    key: source.key != null ? clip(source.key, 16) : clip(previous && previous.key, 16),
    releaseDate: date,
    date,
    status,
    publishedAt,
    description: clip(source.description != null ? source.description : (previous && previous.description) || '', 20000),
    artwork: (cover && cover.url) || '',
    cover,
    audioPreview: (uploads && uploads.audio) || (previous && previous.audioPreview) || '',
    spotify: links.spotify,
    beatport: links.beatport,
    apple: links.apple,
    soundcloud: links.soundcloud,
    bandcamp: links.bandcamp,
    youtube: links.youtube,
    links,
    tracks: cleanTracks(source.tracks != null ? source.tracks : (previous && previous.tracks)),
    seo: seoFrom(source, previous, uploads),
    featured: source.featured != null ? asBool(source.featured) : Boolean(previous && previous.featured),
    createdAt: (previous && previous.createdAt) || now,
    createdBy: (previous && previous.createdBy) || who,
    updatedAt: now,
    updatedBy: who,
    rev: expectedRev + 1,
  };
}

function normalizePost(body, previous, actor, uploads) {
  const source = body || {};
  const title = clip(source.title || (previous && previous.title) || '', 200);
  if (!title) {
    const error = new Error('Title is required');
    error.status = 400;
    throw error;
  }
  const category = categoryByInput(source.category || (previous && previous.category) || 'release-news');
  if (!category) {
    const error = new Error('Choose one of the five news categories');
    error.status = 400;
    throw error;
  }
  const status = nextPostStatus(source, previous);
  let slug = cleanSlug(source.slug);
  const wasPublic = previous && String(previous.status || '') === 'published';
  if (!slug) {
    if (previous && previous.slug && (wasPublic || previous.slugFrozen)) slug = previous.slug;
    else slug = cleanSlug(title) || 'news';
  }
  const { previousSlugs, slugFrozen } = applySlugChange(
    previous ? { ...previous, status: wasPublic ? 'published' : previous.status } : null,
    slug,
    status === 'published' ? 'published' : status
  );
  const coverUploads = {
    artwork: uploads && (uploads.image || uploads.artwork),
    artworkThumb: uploads && (uploads.imageThumb || uploads.artworkThumb),
    ogImage: uploads && uploads.ogImage,
  };
  const cover = coverFrom(source, previous, coverUploads);
  if ((coverUploads.artwork || coverUploads.artworkThumb || coverUploads.ogImage) && !(cover && cover.alt)) {
    const error = new Error('Alt text is required for the cover image');
    error.status = 400;
    throw error;
  }
  const now = new Date().toISOString();
  const who = actorName(actor);
  const bodyText = clip(source.body != null ? source.body : (previous && previous.body) || '', 100000);
  const excerpt = clip(source.excerpt != null ? source.excerpt : (previous && previous.excerpt) || '', 200);
  let publishedAt = previous && previous.publishedAt || '';
  if (status === 'published') publishedAt = publishedAt || now;
  if (status === 'draft' || status === 'unpublished') publishedAt = '';
  const date = clip(source.date || (status === 'published' ? (publishedAt || now).slice(0, 10) : (previous && previous.date) || ''), 10);
  const expectedRev = previous ? Number(previous.rev) || 0 : 0;
  return {
    id: (previous && previous.id) || source.id || crypto.randomUUID(),
    slug,
    previousSlugs,
    slugFrozen,
    title,
    excerpt,
    body: bodyText,
    category: category.slug,
    artistIds: cleanIdList(source.artistIds != null ? source.artistIds : (previous && previous.artistIds)),
    artist: source.artist != null ? clip(source.artist, 200) : clip(previous && previous.artist, 200),
    author: clip(source.author || (previous && previous.author) || who || 'Mixxea Team', 120),
    authorId: (actor && actor.id) || (previous && previous.authorId) || '',
    date,
    status,
    publishedAt,
    image: (cover && cover.url) || '',
    cover,
    seo: seoFrom(source, previous, coverUploads),
    relatedReleaseIds: cleanIdList(source.relatedReleaseIds != null ? source.relatedReleaseIds : (previous && previous.relatedReleaseIds)),
    createdAt: (previous && previous.createdAt) || now,
    createdBy: (previous && previous.createdBy) || who,
    updatedAt: now,
    updatedBy: who,
    rev: expectedRev + 1,
  };
}

function legacyRelease(raw) {
  const title = clip(raw && raw.title, 200);
  const artist = clip(raw && raw.artist, 200);
  const id = (raw && raw.id) || stableId('rel', [artist, title, (raw && raw.date) || '', (raw && raw.catNo) || '']);
  const slug = cleanSlug((raw && raw.slug) || releaseSlug(artist, title)) || id;
  const now = new Date().toISOString();
  const links = linkBag(raw || {}, null);
  const artwork = cleanUrl(raw && raw.artwork) || (raw && String(raw.artwork || '').startsWith('/') ? String(raw.artwork) : '');
  return {
    id,
    slug,
    previousSlugs: Array.isArray(raw && raw.previousSlugs) ? raw.previousSlugs : [],
    slugFrozen: PUBLIC_RELEASE_STATUSES.has(String(raw && raw.status || '').toLowerCase()),
    title,
    artist,
    artistIds: cleanIdList(raw && raw.artistIds),
    type: RELEASE_TYPES.has(String(raw && raw.type || '').toLowerCase()) ? String(raw.type).toLowerCase() : 'single',
    catNo: clip(raw && raw.catNo, 40),
    label: clip((raw && raw.label) || 'Mixxea Records', 80),
    genre: clip(raw && raw.genre, 80),
    bpm: asInt(raw && raw.bpm),
    key: clip(raw && raw.key, 16),
    releaseDate: clip(raw && (raw.releaseDate || raw.date), 10),
    date: clip(raw && (raw.date || raw.releaseDate), 10),
    status: RELEASE_STATUSES.has(String(raw && raw.status || '').toLowerCase()) ? String(raw.status).toLowerCase() : 'draft',
    publishedAt: raw && raw.publishedAt || (PUBLIC_RELEASE_STATUSES.has(String(raw && raw.status || '').toLowerCase()) ? (raw.createdAt || now) : ''),
    description: clip(raw && raw.description, 20000),
    artwork,
    cover: artwork ? { url: artwork, thumbUrl: '', alt: clip(raw && raw.coverAlt, 180) || title } : null,
    audioPreview: raw && raw.audioPreview || '',
    ...links,
    links,
    tracks: cleanTracks(raw && raw.tracks),
    seo: (raw && raw.seo) || {},
    featured: Boolean(raw && raw.featured),
    createdAt: (raw && raw.createdAt) || now,
    createdBy: (raw && raw.createdBy) || 'migration',
    updatedAt: (raw && raw.updatedAt) || (raw && raw.createdAt) || now,
    updatedBy: (raw && raw.updatedBy) || 'migration',
    rev: Number(raw && raw.rev) || 1,
  };
}

function legacyPost(raw) {
  const title = clip(raw && raw.title, 200);
  const id = (raw && raw.id) || stableId('post', [title, (raw && raw.date) || '', (raw && raw.createdAt) || '']);
  const slug = cleanSlug((raw && raw.slug) || title) || id;
  const category = categoryByInput(raw && raw.category) || { slug: 'label-news', label: 'Label News' };
  const now = new Date().toISOString();
  const image = (raw && raw.image) || '';
  const status = String(raw && raw.status || '').toLowerCase() === 'published' ? 'published' : 'draft';
  return {
    id,
    slug,
    previousSlugs: Array.isArray(raw && raw.previousSlugs) ? raw.previousSlugs : [],
    slugFrozen: status === 'published',
    title,
    excerpt: clip(raw && raw.excerpt, 200),
    body: clip(raw && raw.body, 100000),
    category: category.slug,
    artistIds: cleanIdList(raw && raw.artistIds),
    artist: clip(raw && raw.artist, 200),
    author: clip((raw && raw.author) || 'Mixxea Team', 120),
    authorId: (raw && raw.authorId) || '',
    date: clip(raw && raw.date, 10),
    status,
    publishedAt: raw && raw.publishedAt || (status === 'published' ? ((raw && raw.createdAt) || now) : ''),
    image,
    cover: image ? { url: image, thumbUrl: '', alt: title } : null,
    seo: (raw && raw.seo) || {},
    relatedReleaseIds: cleanIdList(raw && raw.relatedReleaseIds),
    createdAt: (raw && raw.createdAt) || now,
    createdBy: (raw && raw.createdBy) || 'migration',
    updatedAt: (raw && raw.updatedAt) || (raw && raw.createdAt) || now,
    updatedBy: (raw && raw.updatedBy) || 'migration',
    rev: Number(raw && raw.rev) || 1,
  };
}

function reloadMessage(info) {
  const who = (info && info.updatedBy) || 'someone else';
  const when = info && info.updatedAt ? new Date(info.updatedAt) : null;
  const hm = when && !Number.isNaN(when.getTime()) ? when.toISOString().slice(11, 16) : '';
  return hm ? `Reload; edited by ${who} at ${hm}` : `Reload; edited by ${who}`;
}

module.exports = {
  PUBLIC_RELEASE_STATUSES,
  normalizeRelease,
  normalizePost,
  legacyRelease,
  legacyPost,
  reloadMessage,
  cleanSlug,
  releaseSlug,
  stableId,
};
