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
      { id: 'hold-icon', title: 'American Icon', artist: 'Ray Sam & Wally Lopez', catNo: 'MXX-055', status: 'out', date: '2018-08-06', beatport: 'https://www.beatport.com/release/american-icon/2350827' },
      { id: 'hold-054', title: 'Untitled', artist: 'David Hopperman', catNo: 'MXX-054', status: 'out', date: '2018-01-01' },
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
  const love = once.releases.find((release) => release.title === 'Love & Fake');
  assert(love.catNo === 'MXR010', 'love cat ' + love.catNo);
  assert(love.status === 'out', 'confirmed love still draft');
  assert(love.date === '2019-07-01' && love.releaseDate === '2019-07-01', 'love date ' + love.date);
  assert(formatCatalogueDate(love.date) === '01 Jul 2019', 'love date render');
  assert(love.label === 'Mixxea Records', 'love label');
  assert(love.artist === 'David Hopperman; Jayy Dee', 'love artist ' + love.artist);
  assert(!love.spotify && !(love.links && love.links.spotify), 'unknown spotify still set');
  assert(!love.apple && !(love.links && love.links.apple), 'unknown apple still set');
  assert(love.beatport === 'https://www.beatport.com/release/love-fake/2629699', 'love beatport ' + love.beatport);
  assert(love.artwork === 'https://geo-media.beatport.com/image_size/1400x1400/4d239b09-e750-4c67-9151-ac33e6b6c055.jpg', 'love artwork');
  assert(!love.title.includes('[CONFIRM]'), 'confirm marker kept in title');
  const gotta = once.releases.find((release) => release.title === 'Gotta Be the One');
  assert(gotta.catNo === 'AJR007' && gotta.status === 'out', 'gotta ' + gotta.catNo + ' ' + gotta.status);
  assert(gotta.date === '2017-08-07', 'gotta date ' + gotta.date);
  assert(gotta.artist === 'David Hopperman; The Subject', 'gotta artist ' + gotta.artist);
  assert(gotta.beatport === 'https://www.beatport.com/release/gotta-be-the-one/6841378', 'gotta beatport');
  assert(!gotta.spotify, 'gotta spotify invented');
  const remix = once.releases.find((release) => release.title === 'American Icon (Remixes)');
  assert(remix && remix.catNo === 'FSR004' && remix.status === 'out', 'remix missing');
  assert(remix.artist === 'Wally Lopez' && remix.date === '2018-09-03', 'remix credit');
  assert(remix.beatport === 'https://www.beatport.com/release/american-icon-remixes/6844691', 'remix beatport');
  assert(remix.artwork.includes('ba21e77a-34d7-48c0-bfe2-c8cec75823f4'), 'remix artwork');
  const heldIcon = once.releases.find((release) => release.id === 'hold-icon');
  const held054 = once.releases.find((release) => release.id === 'hold-054');
  assert(heldIcon.status === 'draft' && heldIcon.catNo === 'MXX-055' && heldIcon.title === 'American Icon', 'held icon published');
  assert(held054.status === 'draft' && held054.catNo === 'MXX-054', 'held 054 published');
  assert(!once.releases.some((release) => release.catNo === 'FSR001'), 'original american icon added');
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
  assert(!hidden, 'confirmed love release is hidden: ' + hidden);
  assert(releaseHiddenReason(heldIcon, once.artists) === 'draft', 'held icon is public');
  assert(releaseHiddenReason(held054, once.artists) === 'draft', 'held 054 is public');
  const { visibleReleases } = require('../src/lib/rosterCatalog');
  const { renderReleaseIndex, renderReleasePage } = require('../src/render/catalogPages');
  const shown = visibleReleases(once.releases, once.artists);
  assert(shown.some((release) => release.catNo === 'MXR010'), 'love not public');
  assert(shown.some((release) => release.catNo === 'AJR007'), 'gotta not public');
  assert(shown.some((release) => release.catNo === 'FSR004'), 'remix not public');
  assert(!shown.some((release) => release.catNo === 'MXX-054' || release.catNo === 'MXX-055' || release.title === 'American Icon'), 'held release is public');
  const index = renderReleaseIndex(shown, {});
  for (const cat of ['MXR010', 'AJR007', 'FSR004']) assert(index.includes('>' + cat + '<') || index.includes('>' + cat + '</'), 'index cat ' + cat);
  assert(index.includes('>MXR010<') && index.includes('>AJR007<') && index.includes('>FSR004<'), 'catalogue numbers missing');
  assert(!index.includes('MXX-052') && !index.includes('MXX-007') && !index.includes('MXX-057') && !index.includes('MXX-054') && !index.includes('MXX-055'), 'old cat rendered');
  assert(!index.includes('american-icon/2350827'), 'held beatport link rendered');
  const lovePage = renderReleasePage(love, once.artists, { relatedReleases: [] });
  assert(lovePage.includes('>MXR010<'), 'love page cat');
  assert(lovePage.includes('https://www.beatport.com/release/love-fake/2629699'), 'love page link');
  assert(!lovePage.includes('open.spotify.com/track'), 'love page invented spotify');
  assert(!lovePage.includes('music.apple.com'), 'love page invented apple');
  assert(!lovePage.includes('Ray Sam'), 'ray sam credit');
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
