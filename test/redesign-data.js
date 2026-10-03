/**
 * Redesign transform: deletes, drafts, bookable flags, and a second pass that is a no-op.
 * Does not contact Redis.
 */
const { spawnSync } = require('child_process');
const path = require('path');
const { transform, creditNames, restoreCollections } = require('../src/lib/redesignData');
const { formatCatalogueDate } = require('../src/render/publicPages');
const { releaseHiddenReason } = require('../src/lib/rosterCatalog');
const { renderHome } = require('../src/render/homePage');

function assert(condition, message) {
  if (!condition) {
    const error = new Error(message);
    error.name = 'AssertionError';
    throw error;
  }
}

function fixture() {
  return {
    artists: [
      { id: 'david-hopperman', name: 'David Hopperman', slug: 'david-hopperman', bookingEmail: 'booking@mixxea,com', type: 'booking', status: 'signed' },
      { id: 'wally-lopez', name: 'Wally Lopez', slug: 'wally-lopez', country: 'SP', status: 'signed' },
      { id: 'eddie-bitar', name: 'Eddie Bitar', slug: 'eddie-bitar', status: 'signed' },
      { id: 'other-artist', name: 'Other Artist', slug: 'other-artist', bookable: true, status: 'signed' },
      { id: 'vexr', name: 'VEXR', slug: 'vexr', status: 'signed' },
      { id: 'lyda', name: 'LYDA', slug: 'lyda', status: 'signed' },
    ],
    releases: [
      { id: 'mxa004', title: 'Grind System EP', artist: 'VEXR', catNo: 'MXA004', status: 'draft' },
      { id: 'mxa005', title: 'Void Protocol', artist: 'LYDA', catNo: 'MXA005', status: 'out' },
      { id: 'love', title: 'Love & Fake [CONFIRM]', artist: 'David Hopperman feat. Jayy Dee', catNo: 'MXX-052', status: 'out', date: '2019-07-01 [CONFIRM]', spotify: 'https://open.spotify.com/track/secret', beatport: 'https://www.beatport.com/track/x/1' },
      { id: 'fixed-mail-release', title: 'Gotta Be the One', artist: 'David Hopperman feat. The Subject', catNo: 'MXX-007', status: 'draft', date: '2017-08-07', beatport: 'https://www.beatport.com/track/y/1', spotify: '' },
    ],
    news: [
      { id: 'n-vexr', title: 'Night with VEXR', status: 'published', body: 'VEXR played.' },
      { id: 'n-ok', title: 'David Hopperman Joins the Mixxea Artist Roster', status: 'published', category: 'artists', date: '2026-06-17', body: 'On the roster.' },
    ],
    events: [{ id: 'e1', artist: 'LYDA', venue: 'Club', date: '2026-12-01', status: 'confirmed' }],
    categories: [],
  };
}

function main() {
  const once = transform(fixture());
  const names = once.artists.map((artist) => artist.name);
  assert(!names.includes('VEXR') && !names.includes('LYDA'), 'fake artists remain');
  assert(once.artists.some((artist) => artist.slug === 's1nce' && artist.onRoster === false && artist.bookable === false), 'S1NCE missing');
  const hop = once.artists.find((artist) => artist.slug === 'david-hopperman');
  assert(hop.bookable === true, 'hopperman bookable');
  assert(hop.bookingEmail === 'booking@mixxea.com', 'email not fixed');
  assert(hop.country === 'FR' && hop.city === 'Marseille', 'hopperman place');
  const wally = once.artists.find((artist) => artist.slug === 'wally-lopez');
  assert(wally.country === 'ES' && wally.bookable === true, 'wally');
  assert(once.artists.find((artist) => artist.slug === 'eddie-bitar').bookable === true, 'eddie');
  assert(!once.releases.some((release) => /MXA00[45]/.test(release.catNo)), 'fake releases remain');
  const love = once.releases.find((release) => release.catNo === 'MXX-052');
  assert(love.status === 'draft', 'unconfirmed date still public');
  assert(love.date === '2019' && love.releaseDate === '2019', 'unconfirmed date not year-only: ' + love.date);
  assert(formatCatalogueDate(love.date) === '2019', 'year renders as a full date');
  assert(!love.spotify, 'unconfirmed spotify still set');
  assert(love.beatport, 'confirmed beatport cleared');
  assert(!love.title.includes('[CONFIRM]'), 'confirm marker kept in title');
  assert(once.artists.find((artist) => artist.slug === 'other-artist').bookable === false, 'other artist bookable');
  assert(!JSON.stringify(once).includes('[CONFIRM]'), 'confirm marker would be written');
  assert(creditNames(love).includes('David Hopperman') && creditNames(love).includes('Jayy Dee'), 'feat split');
  const naka = once.releases.find((release) => release.catNo === 'MXX-092');
  const corazon = once.releases.find((release) => release.catNo === 'MXX-087');
  assert(naka && naka.status === 'out' && naka.spotify.includes('4ltsIrgI1ohN3NPDQ4O4ZH'), 'naka launch');
  assert(corazon && corazon.status === 'out' && corazon.spotify === 'https://open.spotify.com/track/0McK0zrgqBM0xx8scNhegq', 'corazon spotify');
  assert(corazon.embed && corazon.embed.provider === 'spotify' && corazon.embed.id === '0McK0zrgqBM0xx8scNhegq', 'corazon embed');
  assert(!once.news.some((item) => /vexr/i.test(item.title)), 'fake news remains');
  assert(once.news.length === 1, 'real news dropped');
  assert(once.events.length === 0, 'fake event remains');
  assert(once.categories.some((item) => item.slug === 'label'), 'categories');

  const hidden = releaseHiddenReason(love, once.artists);
  assert(hidden === 'draft', 'draft love release is public: ' + hidden);
  const nakaHidden = releaseHiddenReason(naka, once.artists);
  assert(!nakaHidden, 'naka hidden: ' + nakaHidden);

  const mapped = transform({
    artists: [],
    releases: [],
    news: [
      { id: 'a', title: 'Agency note', category: 'FreqVault', status: 'published', image: '/uploads/artwork/a.png' },
      { id: 'b', title: 'Artist note', category: 'artist-news', status: 'published' },
      { id: 'c', title: 'Release note', category: 'Release News', status: 'published' },
      { id: 'd', title: 'Label note', category: 'label-news', status: 'published' },
      { id: 'e', title: 'Show note', category: 'events', status: 'published' },
    ],
    events: [],
    categories: [],
  });
  assert(mapped.news.map((item) => item.category).join(',') === 'agency,artists,releases,label,agency', mapped.news.map((item) => item.category).join(','));
  assert(mapped.news[0].image === '', 'upload image kept');

  const twice = transform(once);
  assert(JSON.stringify(twice) === JSON.stringify(once), 'second pass is not stable');

  const already = transform({
    artists: [{ id: 'david-hopperman', name: 'David Hopperman', slug: 'david-hopperman', status: 'signed', bookingEmail: 'booking@mixxea.com', bookable: true, genre: 'Afro / Melodic House', city: 'Marseille', country: 'FR', featured: 1, onRoster: true, type: 'booking', photo: '/img/roster/david-hopperman.webp', photoAlt: 'David Hopperman, portrait' }],
    releases: [{ id: 'mxa004', title: 'Grind System EP', artist: 'VEXR', catNo: 'MXA004', status: 'draft' }],
    news: [],
    events: [],
    categories: once.categories,
  });
  assert(already.artists.find((artist) => artist.slug === 'david-hopperman').bookingEmail === 'booking@mixxea.com', 'fixed email reverted');
  assert(!already.releases.some((release) => release.catNo === 'MXA004'), 'draft fake release survived');

  const html = renderHome(once);
  for (const banned of ['VEXR', 'LYDA', 'MXA004', 'MXA005', 'Est. 2024', '[CONFIRM]', 'EXAMPLE', 'booking@mixxea,com']) {
    assert(!html.includes(banned), 'homepage contains ' + banned);
  }
  assert(html.includes('booking@mixxea.com'), 'booking address missing');
  assert(html.includes('Since 2013'), 'founding line missing');
  assert(!html.includes('[CONFIRM'), 'homepage renders a confirm marker');

  const backup = {
    plan: [
      { action: 'change', collection: 'artists', id: 'david-hopperman' },
      { action: 'add', collection: 'artists', id: 's1nce' },
    ],
    touched: {
      artists: [
        { id: 'david-hopperman', name: 'David Hopperman', bookable: false },
        { id: 's1nce', name: 'S1NCE' },
      ],
    },
  };
  const rolled = restoreCollections({
    artists: [
      { id: 'david-hopperman', name: 'David Hopperman', bookable: true },
      { id: 's1nce', name: 'S1NCE' },
    ],
    releases: [],
    news: [],
    events: [],
    categories: [],
  }, backup);
  assert(rolled.artists.find((artist) => artist.id === 'david-hopperman').bookable === false, 'restore did not revert');
  assert(!rolled.artists.some((artist) => artist.id === 's1nce'), 'restore kept an added record');
  assert(html.includes('/booking-agency?artist=david-hopperman'), 'hopperman book link');
  assert(html.includes('/booking-agency?artist=wally-lopez'), 'wally book link');
  assert(html.includes('/booking-agency?artist=eddie-bitar'), 'eddie book link');
  assert(!html.includes('/booking-agency?artist=s1nce'), 'label-only book link');
  const demos = html.split('id="demos"')[1] || '';
  assert(demos.includes('ar@mixxea.com') && demos.includes('info@mixxea.com'), 'demos emails');
  assert(!html.split('id="demos"')[0].includes('ar@mixxea.com'), 'ar@ outside demos');
  assert(!html.split('id="demos"')[0].includes('info@mixxea.com'), 'info@ outside demos');

  const dry = spawnSync(process.execPath, ['scripts/migrate-redesign-data.js', '--fixtures', 'test/fixtures/redesign'], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
  });
  assert(dry.status === 0, dry.stderr || dry.stdout);
  assert(dry.stdout.includes('delete  artists  vexr'), dry.stdout);
  assert(dry.stdout.includes('delete  releases  mxa005-drafted'), dry.stdout);
  assert(dry.stdout.includes('no changes written'), dry.stdout);
  assert(!dry.stdout.includes('applied'), dry.stdout);
  console.log('ok  redesign transform');
}

main();
