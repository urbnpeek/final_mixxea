/**
 * Public catalog rules.
 * A release, show, or pool track is public only when every credited name
 * is on the current artist roster, unless that release is catalogueOnly.
 * catalogueOnly is a per-release flag for label catalogue titles whose
 * artist is not on the roster (KENTA, Bennyhews, and the same kind of
 * credit later). A public catalogueOnly release is listed with the
 * catalogue. It does not create an artist profile, an /artists/<slug>
 * page, or a sitemap artist URL.
 * News is public when it is published. Optional artist tags must point at
 * the roster. All-caps words in a post do not hide it. Nothing here adds
 * bios, venues, or claims.
 *
 * All-caps heuristic (releases, shows, and pool tracks — not news):
 * An ALL-CAPS word of 4 or more letters hides the record when it is not a
 * roster name and not a brand word (see BRAND_WORDS). It keeps leftover
 * placeholder or off-roster shouty names off public pages — the fake acts
 * removed from this catalogue, such as VEXR and LYDA — even when the main
 * credit field looks clean. Title case such as "Dirty Circuit" is not a
 * shout. A catalogueOnly release's own artist name is allowed, so KENTA
 * in that release's title or description does not hide it. Any other
 * unknown ALL-CAPS word still does.
 */

const slugify = require('../utils/slugify');

const { applyReleaseFixes, ensureConfirmedReleases } = require('./redesignData');
const { scrubConfirm } = require('./scrubConfirm');

const BRAND_WORDS = new Set([
  'mixxea',
  'records',
  'freqvault',
  'freq',
  'vault',
  'news',
  'label',
  'booking',
  'agency',
  'roster',
]);

function rosterNames(artists) {
  const names = new Set();
  for (const artist of Array.isArray(artists) ? artists : []) {
    const name = String(artist && artist.name || '').trim().toLowerCase();
    if (name) names.add(name);
  }
  return names;
}

function nameTokens(value) {
  return String(value || '')
    .toLowerCase()
    .split(/[,;/&+]|\band\b/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function creditedToRoster(value, names) {
  const tokens = nameTokens(value);
  if (!tokens.length || !names || !names.size) return false;
  return tokens.every((token) => names.has(token));
}

function shoutedOffRoster(text, names, extraAllowed) {
  const tokens = String(text || '').match(/\b[A-Z]{4,}\b/g) || [];
  return tokens.some((token) => {
    const key = token.toLowerCase();
    if (names && names.has(key)) return false;
    if (BRAND_WORDS.has(key)) return false;
    if (extraAllowed && extraAllowed.has(key)) return false;
    return true;
  });
}

function isCatalogueOnly(release) {
  const value = release && release.catalogueOnly;
  return value === true || value === 'true' || value === 1 || value === '1' || value === 'on';
}

function catalogueArtistWords(release) {
  const allowed = new Set();
  const words = String(primaryCredit(release && release.artist) || '').match(/[A-Za-z0-9]+/g) || [];
  for (const word of words) {
    if (word.length >= 4) allowed.add(word.toLowerCase());
  }
  return allowed;
}

function catalogueOnlyArtistSlugs(releases, artists) {
  const names = rosterNames(artists);
  const slugs = new Set();
  for (const release of Array.isArray(releases) ? releases : []) {
    if (!isCatalogueOnly(release)) continue;
    const credit = String(primaryCredit(release && release.artist) || '').trim();
    if (!credit) continue;
    const tokens = nameTokens(credit);
    if (tokens.length && tokens.every((token) => names.has(token))) continue;
    const slug = slugify(credit);
    if (slug) slugs.add(slug);
  }
  return slugs;
}

const PUBLIC_RELEASE_STATUSES = new Set(['published', 'scheduled', 'soon', 'pre', 'out']);

function rosterIds(artists) {
  const ids = new Set();
  for (const artist of Array.isArray(artists) ? artists : []) {
    const id = String(artist && artist.id || '').trim();
    if (id) ids.add(id);
  }
  return ids;
}

function primaryCredit(value) {
  return String(value || '').split(/\b(?:feat\.?|ft\.?|featuring)\b/i)[0];
}

function creditsOk(record, artists) {
  const names = rosterNames(artists);
  const listed = Array.isArray(record && record.artists) ? record.artists.map((name) => String(name).trim().toLowerCase()).filter(Boolean) : [];
  if (listed.length) return listed.some((name) => names.has(name));
  const ids = Array.isArray(record && record.artistIds) ? record.artistIds.filter(Boolean) : [];
  if (ids.length) {
    const known = rosterIds(artists);
    return ids.every((id) => known.has(id));
  }
  return creditedToRoster(primaryCredit(record && record.artist), names);
}

function releaseHiddenReason(release, artists) {
  if (!release) return 'missing';
  const status = String(release.status || '').toLowerCase();
  if (!PUBLIC_RELEASE_STATUSES.has(status)) {
    if (status === 'unpublished') return 'unpublished';
    if (status === 'archived') return 'archived';
    if (status === 'cancelled') return 'cancelled';
    if (status === 'hidden') return 'hidden';
    return 'draft';
  }
  if (status === 'scheduled' && release.publishedAt && Date.parse(release.publishedAt) > Date.now()) {
    return 'scheduled';
  }
  const catalogueOnly = isCatalogueOnly(release);
  if (!catalogueOnly && !creditsOk(release, artists)) return 'artist is not on the roster';
  const allowed = catalogueOnly ? catalogueArtistWords(release) : null;
  if (shoutedOffRoster(`${release.title || ''} ${release.description || ''}`, rosterNames(artists), allowed)) {
    return 'title or description uses an all-caps name that is not on the roster';
  }
  return '';
}

function newsHiddenReason(item, artists) {
  if (!item) return 'missing';
  const status = String(item.status || '').toLowerCase();
  if (status !== 'published' && status !== 'scheduled') {
    if (status === 'unpublished') return 'unpublished';
    return 'draft';
  }
  if (item.publishedAt && Date.parse(item.publishedAt) > Date.now()) return 'scheduled';
  const ids = Array.isArray(item.artistIds) ? item.artistIds.filter(Boolean) : [];
  if (ids.length) {
    if (!creditsOk(item, artists)) return 'tagged artist is not on the roster';
    return '';
  }
  if (item.artist && !creditedToRoster(item.artist, rosterNames(artists))) {
    return 'artist is not on the roster';
  }
  return '';
}

function visibleReleases(releases, artists) {
  return ensureConfirmedReleases(releases)
    .map((release) => applyReleaseFixes(release))
    .filter((release) => !releaseHiddenReason(release, artists));
}

function visibleEvents(events, artists) {
  const names = rosterNames(artists);
  return scrubConfirm((Array.isArray(events) ? events : []).filter((event) => {
    if (!event) return false;
    const status = String(event.status || '').toLowerCase();
    if (status === 'cancelled' || status === 'hidden') return false;
    if (!creditedToRoster(event.artist, names)) return false;
    return !shoutedOffRoster(`${event.venue || ''} ${event.artist || ''}`, names);
  }));
}

function visibleNews(news, artists) {
  return (Array.isArray(news) ? news : [])
    .map((item) => scrubConfirm(item))
    .filter((item) => !newsHiddenReason(item, artists));
}

function visibleTracks(tracks, artists) {
  const names = rosterNames(artists);
  return (Array.isArray(tracks) ? tracks : []).filter((track) => {
    if (!track) return false;
    if (!creditedToRoster(track.artist, names)) return false;
    return !shoutedOffRoster(`${track.title || ''} ${track.artist || ''}`, names);
  });
}

module.exports = {
  rosterNames,
  nameTokens,
  creditedToRoster,
  isCatalogueOnly,
  catalogueOnlyArtistSlugs,
  releaseHiddenReason,
  newsHiddenReason,
  visibleReleases,
  visibleEvents,
  visibleNews,
  visibleTracks,
};
