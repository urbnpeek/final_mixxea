/**
 * Public catalog rules.
 * A release, show, or pool track is public only when every credited name
 * is on the current artist roster. News is public when it is published.
 * Optional artist tags must point at the roster. All-caps words in a post
 * do not hide it. Nothing here adds bios, venues, or claims.
 */

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
    .split(/[,/&+]|\band\b/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function creditedToRoster(value, names) {
  const tokens = nameTokens(value);
  if (!tokens.length || !names || !names.size) return false;
  return tokens.every((token) => names.has(token));
}

function shoutedOffRoster(text, names) {
  const tokens = String(text || '').match(/\b[A-Z]{4,}\b/g) || [];
  return tokens.some((token) => {
    const key = token.toLowerCase();
    return !names.has(key) && !BRAND_WORDS.has(key);
  });
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

function creditsOk(record, artists) {
  const ids = Array.isArray(record && record.artistIds) ? record.artistIds.filter(Boolean) : [];
  if (ids.length) {
    const known = rosterIds(artists);
    return ids.every((id) => known.has(id));
  }
  return creditedToRoster(record && record.artist, rosterNames(artists));
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
  if (!creditsOk(release, artists)) return 'artist is not on the roster';
  if (shoutedOffRoster(`${release.title || ''} ${release.description || ''}`, rosterNames(artists))) {
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
  return (Array.isArray(releases) ? releases : []).filter((release) => !releaseHiddenReason(release, artists));
}

function visibleEvents(events, artists) {
  const names = rosterNames(artists);
  return (Array.isArray(events) ? events : []).filter((event) => {
    if (!event) return false;
    const status = String(event.status || '').toLowerCase();
    if (status === 'cancelled' || status === 'hidden') return false;
    if (!creditedToRoster(event.artist, names)) return false;
    return !shoutedOffRoster(`${event.venue || ''} ${event.artist || ''}`, names);
  });
}

function visibleNews(news, artists) {
  return (Array.isArray(news) ? news : []).filter((item) => !newsHiddenReason(item, artists));
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
  releaseHiddenReason,
  newsHiddenReason,
  visibleReleases,
  visibleEvents,
  visibleNews,
  visibleTracks,
};
