/**
 * Public catalog rules.
 * A release, show, or pool track is public only when every credited name
 * is on the current artist roster. News is public unless it shouts a name
 * that is not on that roster. Nothing here adds bios, venues, or claims.
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

function visibleReleases(releases, artists) {
  const names = rosterNames(artists);
  return (Array.isArray(releases) ? releases : []).filter((release) => {
    if (!release) return false;
    const status = String(release.status || '').toLowerCase();
    if (status === 'draft' || status === 'hidden' || status === 'cancelled') return false;
    if (!creditedToRoster(release.artist, names)) return false;
    return !shoutedOffRoster(`${release.title || ''} ${release.description || ''}`, names);
  });
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
  const names = rosterNames(artists);
  return (Array.isArray(news) ? news : []).filter((item) => {
    if (!item) return false;
    if (String(item.status || '').toLowerCase() !== 'published') return false;
    if (item.artist && !creditedToRoster(item.artist, names)) return false;
    return !shoutedOffRoster(`${item.title || ''} ${item.body || ''} ${item.artist || ''}`, names);
  });
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
  visibleReleases,
  visibleEvents,
  visibleNews,
  visibleTracks,
};
