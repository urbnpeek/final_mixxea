/**
 * releaseLink.js - approved-demo "release details" links.
 *
 * Approving a demo creates a random 256-bit token. Only its SHA-256 hash and an
 * expiry are stored on the demo (demo.release), so a Redis dump does not
 * contain usable links. The artist opens /release/<token>, fills in release
 * details and uploads the WAV (and optional artwork) straight to private
 * storage from the browser.
 */
const crypto = require('crypto');

const DEFAULT_TTL_DAYS = 30;
const WAV_MAX_BYTES = 500 * 1024 * 1024;
const ARTWORK_MAX_BYTES = 20 * 1024 * 1024;
const WAV_TYPES = ['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave'];
const ARTWORK_TYPES = ['image/jpeg', 'image/png'];
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

function ttlDays(env = process.env) {
  const n = parseInt(env.RELEASE_LINK_TTL_DAYS, 10);
  return Number.isFinite(n) && n >= 1 && n <= 90 ? n : DEFAULT_TTL_DAYS;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token), 'utf8').digest('hex');
}

/** New link for a demo. Returns the raw token (only ever put in the email) and the stored fields. */
function createReleaseLink(now = new Date(), env = process.env) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + ttlDays(env) * 86400000).toISOString();
  return { token, tokenHash: hashToken(token), expiresAt };
}

function safeEqualHex(a, b) {
  const x = Buffer.from(String(a || ''), 'hex');
  const y = Buffer.from(String(b || ''), 'hex');
  return x.length === 32 && y.length === 32 && crypto.timingSafeEqual(x, y);
}

/**
 * Find the demo a token belongs to.
 * Returns { demo, index } or { error: 'invalid' | 'expired' | 'revoked' }.
 */
function findDemoByToken(demos, token, now = new Date()) {
  if (!TOKEN_RE.test(String(token || ''))) return { error: 'invalid' };
  const h = hashToken(token);
  const index = (demos || []).findIndex((d) => d && d.release && safeEqualHex(d.release.tokenHash, h));
  if (index === -1) return { error: 'invalid' };
  const demo = demos[index];
  if (demo.status !== 'approved') return { error: 'revoked' };
  const exp = Date.parse(demo.release.expiresAt || '');
  if (!Number.isFinite(exp) || exp <= now.getTime()) return { error: 'expired' };
  return { demo, index };
}

function releaseUrl(appUrl, token) {
  return `${String(appUrl || '').replace(/\/+$/, '')}/release/${token}`;
}

/** Admin-facing progress for an approved demo. Never includes the token hash. */
function releaseProgress(demo) {
  const r = (demo && demo.release) || null;
  if (!r) return { linkSent: false, detailsReceived: false, wavReceived: false };
  return {
    linkSent: Boolean(r.linkSentAt),
    linkSentAt: r.linkSentAt || null,
    linkSentCount: r.linkSentCount || 0,
    emailedTo: r.emailedTo || null,
    expiresAt: r.expiresAt || null,
    expired: r.expiresAt ? Date.parse(r.expiresAt) <= Date.now() : false,
    detailsReceived: Boolean(r.submittedAt),
    submittedAt: r.submittedAt || null,
    wavReceived: Boolean(r.wav && r.wav.pathname),
    artworkReceived: Boolean(r.artwork && r.artwork.pathname),
  };
}

/** Copy of demo.release safe to send to the admin UI (no token hash, file refs replaced by admin routes). */
function presentRelease(demo) {
  const r = demo && demo.release;
  if (!r) return null;
  const { tokenHash, ...rest } = r;
  const out = { ...rest, progress: releaseProgress(demo) };
  if (out.wav) out.wav = { name: out.wav.name || 'track.wav', size: out.wav.size || null, href: `/api/demos/${demo.id}/release-file/wav` };
  if (out.artwork) out.artwork = { name: out.artwork.name || 'artwork', size: out.artwork.size || null, href: `/api/demos/${demo.id}/release-file/artwork` };
  return out;
}

/** What the public form may show back to the artist (prefill). */
function prefillFor(demo) {
  return {
    artistName: demo.artistName || '',
    legalName: demo.realName || '',
    email: demo.email || '',
    country: demo.country || '',
    trackTitle: demo.trackTitle || '',
    version: demo.version || 'Original Mix',
    genre: demo.genre || '',
    bpm: demo.bpm || '',
    musKey: demo.musKey || '',
    submitted: Boolean(demo.release && demo.release.submittedAt),
    expiresAt: demo.release ? demo.release.expiresAt : null,
  };
}

function uploadPrefix(demoId) {
  return `private/releases/${demoId}/`;
}

/** Rules for a client upload pathname: right folder, right extension. */
function checkUploadPath(demoId, pathname, kind) {
  const p = String(pathname || '');
  if (!p.startsWith(uploadPrefix(demoId)) || p.includes('..')) return 'Upload path not allowed';
  const name = p.slice(uploadPrefix(demoId).length);
  if (kind === 'wav') return /^wav-[\w.-]{1,120}\.wav$/i.test(name) ? null : 'Only .wav files are accepted';
  if (kind === 'artwork') return /^artwork-[\w.-]{1,120}\.(jpe?g|png)$/i.test(name) ? null : 'Artwork must be .jpg or .png';
  return 'Unknown upload type';
}

function uploadRules(kind) {
  return kind === 'wav'
    ? { allowedContentTypes: WAV_TYPES, maximumSizeInBytes: WAV_MAX_BYTES }
    : { allowedContentTypes: ARTWORK_TYPES, maximumSizeInBytes: ARTWORK_MAX_BYTES };
}

function clean(v, max = 200) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISRC_RE = /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/;

function cleanFileRef(demoId, ref, kind) {
  if (!ref || typeof ref !== 'object') return { ref: null };
  const pathname = clean(ref.pathname, 300);
  const err = checkUploadPath(demoId, pathname, kind);
  if (err) return { error: err };
  const size = Number(ref.size);
  const max = uploadRules(kind).maximumSizeInBytes;
  if (Number.isFinite(size) && (size <= 0 || size > max)) return { error: kind === 'wav' ? 'WAV must be under 500 MB' : 'Artwork must be under 20 MB' };
  const url = clean(ref.url, 500);
  if (url) {
    try {
      const u = new URL(url);
      if (u.protocol !== 'https:' || !u.hostname.endsWith('.blob.vercel-storage.com')) return { error: 'Unexpected file location' };
    } catch (e) { return { error: 'Unexpected file location' }; }
  }
  return { ref: { pathname, url: url || null, size: Number.isFinite(size) ? size : null, name: clean(ref.name, 160) || null } };
}

/**
 * Validate the artist's submission. Returns { ok: true, details, wav, artwork } or { ok: false, errors }.
 */
function validateReleaseSubmission(body, demo) {
  const b = body || {};
  const errors = {};
  const details = {
    legalName: clean(b.legalName, 160),
    artistName: clean(b.artistName, 120),
    email: clean(b.email, 200).toLowerCase(),
    phone: clean(b.phone, 40),
    country: clean(b.country, 80),
    featuredArtists: clean(b.featuredArtists, 300),
    trackTitle: clean(b.trackTitle, 160),
    version: clean(b.version, 80) || 'Original Mix',
    isrc: clean(b.isrc, 20).toUpperCase().replace(/[-\s]/g, ''),
    genre: clean(b.genre, 60),
    bpm: b.bpm === '' || b.bpm == null ? null : Number(b.bpm),
    musKey: clean(b.musKey, 20),
    notes: clean(b.notes, 2000),
    credits: [],
  };
  if (details.legalName.length < 2) errors.legalName = 'Legal name is required';
  if (details.artistName.length < 1) errors.artistName = 'Artist name is required';
  if (!EMAIL_RE.test(details.email)) errors.email = 'Enter a valid email';
  if (details.phone && !/^[+\d][\d\s().-]{5,}$/.test(details.phone)) errors.phone = 'Enter a valid phone number';
  if (details.country.length < 2) errors.country = 'Country is required';
  if (details.trackTitle.length < 1) errors.trackTitle = 'Track title is required';
  if (details.isrc && !ISRC_RE.test(details.isrc)) errors.isrc = 'ISRC looks like CC-XXX-YY-NNNNN (12 characters)';
  if (details.bpm !== null && (!Number.isFinite(details.bpm) || details.bpm < 40 || details.bpm > 250)) errors.bpm = 'BPM between 40 and 250';

  const credits = Array.isArray(b.credits) ? b.credits.slice(0, 20) : [];
  let total = 0;
  for (const c of credits) {
    const name = clean(c && c.name, 120);
    const role = ['writer', 'producer', 'writer_producer'].includes(c && c.role) ? c.role : '';
    const share = Number(c && c.share);
    if (!name && !role && !(c && c.share)) continue;
    if (!name || !role || !Number.isFinite(share) || share <= 0 || share > 100) {
      errors.credits = 'Each credit needs a name, a role and a share between 0 and 100%';
      break;
    }
    total += share;
    details.credits.push({ name, role, share: Math.round(share * 100) / 100 });
  }
  if (!errors.credits) {
    if (!details.credits.length) errors.credits = 'Add at least one writer or producer';
    else if (Math.abs(total - 100) > 0.01) errors.credits = `Shares must add up to 100% (now ${Math.round(total * 100) / 100}%)`;
  }

  const demoId = demo && demo.id;
  const wav = cleanFileRef(demoId, b.wav, 'wav');
  if (wav.error) errors.wav = wav.error;
  else if (!wav.ref) errors.wav = 'Upload the WAV master';
  const artwork = cleanFileRef(demoId, b.artwork, 'artwork');
  if (artwork.error) errors.artwork = artwork.error;

  if (b.confirm !== true && b.confirm !== 'true') errors.confirm = 'Please confirm the details are correct';

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, details, wav: wav.ref, artwork: artwork.ref };
}

module.exports = {
  DEFAULT_TTL_DAYS,
  WAV_MAX_BYTES,
  ARTWORK_MAX_BYTES,
  WAV_TYPES,
  ARTWORK_TYPES,
  ttlDays,
  hashToken,
  createReleaseLink,
  findDemoByToken,
  releaseUrl,
  releaseProgress,
  presentRelease,
  prefillFor,
  uploadPrefix,
  checkUploadPath,
  uploadRules,
  validateReleaseSubmission,
};
