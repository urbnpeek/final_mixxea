/**
 * Pure catalogue transform for the V02 redesign.
 * Shared by the preview read path and scripts/migrate-redesign-data.js.
 * Does not read or write KV.
 */

const slugify = require('../utils/slugify');

const BOOKING_EMAIL = 'booking@mixxea.com';
const NAKA_SPOTIFY = 'https://open.spotify.com/track/4ltsIrgI1ohN3NPDQ4O4ZH';

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
    genre: 'Techno',
    city: 'Berlin',
    country: 'DE',
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

const CATEGORIES = [
  { slug: 'label', name: 'Label', description: '', accent: 'label' },
  { slug: 'agency', name: 'Agency', description: '', accent: 'agency' },
  { slug: 'releases', name: 'Releases', description: '', accent: 'label' },
  { slug: 'artists', name: 'Artists', description: '', accent: 'label' },
];

const DRAFT_CATS = new Set(['MXX-052', 'MXX-007', 'MXX-054', 'MXX-055', 'MXX-057']);

const UNCONFIRMED_LINKS = {
  'MXX-092': ['apple', 'beatport', 'soundcloud', 'bandcamp'],
  'MXX-087': ['apple', 'beatport', 'soundcloud', 'bandcamp'],
  'MXX-052': ['spotify', 'apple', 'soundcloud', 'bandcamp'],
  'MXX-007': ['spotify', 'apple', 'soundcloud', 'bandcamp'],
  'MXX-054': ['spotify', 'apple', 'beatport', 'soundcloud', 'bandcamp'],
  'MXX-055': ['spotify', 'apple', 'beatport', 'soundcloud', 'bandcamp'],
  'MXX-057': ['spotify', 'apple', 'beatport', 'soundcloud', 'bandcamp'],
};

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

function catKey(release) {
  return String(release && release.catNo || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
}

function catLabel(release) {
  const raw = String(release && release.catNo || '').trim().toUpperCase();
  if (/^MXX-?\d+$/.test(raw.replace(/\s/g, ''))) {
    const digits = raw.replace(/\D/g, '');
    return 'MXX-' + digits.padStart(3, '0');
  }
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
    for (const name of part.split(/\s*(?:,|\/|&|\+)\s*|\s+\band\b\s+/i)) {
      const trimmed = name.trim();
      if (trimmed) names.push(trimmed);
    }
  }
  return names;
}

function spotifyEmbedId(url) {
  const match = String(url || '').match(/open\.spotify\.com\/(?:embed\/)?(?:track|album)\/([A-Za-z0-9]+)/);
  return match ? match[1] : '';
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
    beatport: '',
    soundcloud: '',
    bandcamp: '',
    youtube: '',
  };
  const artwork = `/img/covers/${spec.catNo}_1600.webp`;
  const artworkThumb = `/img/covers/${spec.catNo}_600.webp`;
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
    catNo: 'MXX-092',
    date: '2025-07-01',
    spotify: NAKA_SPOTIFY,
    ogImage: '/og/og-release-mxx-092.jpg',
  }),
  launchRelease({
    id: 'mxx-087',
    slug: 'fl3x-corazon',
    title: 'Corazon',
    artist: 'FL3X',
    catNo: 'MXX-087',
    date: '2025-03-07',
    spotify: '',
  }),
];

function artworkMissing(release) {
  const url = String(release.artwork || (release.cover && release.cover.url) || '');
  return !url || url.startsWith('/uploads/');
}

function applyReleaseFixes(release) {
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
  if (cat === 'MXX-092' || cat === 'MXX-087') {
    if (!next.status || next.status === 'draft') next.status = 'out';
    if (artworkMissing(next)) {
      next.artwork = `/img/covers/${cat}_1600.webp`;
      next.artworkThumb = `/img/covers/${cat}_600.webp`;
      next.cover = {
        url: next.artwork,
        thumbUrl: next.artworkThumb,
        alt: `${next.title} by ${next.artist}, cover artwork`,
        w: 1600,
        h: 1600,
      };
    } else if (!next.artworkThumb) {
      next.artworkThumb = `/img/covers/${cat}_600.webp`;
    }
    if (cat === 'MXX-092' && !next.spotify && !((next.links || {}).spotify)) {
      next.spotify = NAKA_SPOTIFY;
      next.links = { ...(next.links || {}), spotify: NAKA_SPOTIFY };
    }
    if (cat === 'MXX-092' && !next.ogImage) next.ogImage = '/og/og-release-mxx-092.jpg';
    if (!next.genre) next.genre = 'Afro House';
    if (!next.date) next.date = cat === 'MXX-092' ? '2025-07-01' : '2025-03-07';
  }
  const spotify = next.spotify || (next.links && next.links.spotify) || '';
  if (!next.embed && spotify) {
    const id = spotifyEmbedId(spotify);
    if (id) next.embed = { provider: 'spotify', id };
  }
  return next;
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
      bookable: true,
      bookingEmail: BOOKING_EMAIL,
      featured: profile.featured,
      onRoster: true,
      type: profile.type,
      photo: profile.photo,
      photoAlt: current.photoAlt || profile.photoAlt,
    };
  }
  for (const label of LABEL_ARTISTS) {
    const exists = list.some((artist) => artistKey(artist) === label.slug || String(artist.name || '').trim().toLowerCase() === label.name.toLowerCase());
    if (!exists) list.push({ ...label });
  }
  return list;
}

function transformReleases(releases) {
  const list = asList(releases).filter((release) => release && !isFakeRelease(release)).map(applyReleaseFixes);
  for (const launch of LAUNCH) {
    const index = list.findIndex((release) => catLabel(release) === launch.catNo);
    if (index === -1) {
      list.push(clone(launch));
      continue;
    }
    list[index] = applyReleaseFixes({ ...launch, ...list[index], id: list[index].id || launch.id, catNo: launch.catNo });
  }
  return list;
}

function transformNews(news) {
  return asList(news).filter((item) => item && !mentionsFake(item)).map((item) => ({ ...item }));
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
  return {
    artists: transformArtists(clone(source.artists)),
    releases: transformReleases(clone(source.releases)),
    news: transformNews(clone(source.news)),
    events: transformEvents(clone(source.events)),
    categories: transformCategories(clone(source.categories)),
  };
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
  LAUNCH,
  transform,
  transformCollection,
  diffPlan,
  touchedRecords,
  isFakeArtist,
  isFakeRelease,
  creditNames,
};
