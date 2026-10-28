/**
 * Redesign transform: deletes, drafts, bookable flags, and a second pass that is a no-op.
 * Does not contact Redis.
 */
const { spawnSync } = require('child_process');
const path = require('path');
const { transform, creditNames, restoreCollections } = require('../src/lib/redesignData');
const { formatCatalogueDate, renderArtistPage } = require('../src/render/publicPages');
const { renderNewsIndex, renderNewsCategory } = require('../src/render/catalogPages');
const { releaseHiddenReason } = require('../src/lib/rosterCatalog');
const { renderHome } = require('../src/render/homePage');

function assert(condition, message) {
  if (!condition) {
    const error = new Error(message);
    error.name = 'AssertionError';
    throw error;
  }
}

function decodeHtml(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function decodedMeta(html) {
  const match = html.match(/<meta name="description" content="([^"]*)"/);
  assert(match, 'meta description missing');
  return decodeHtml(match[1]);
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
  const naka = once.releases.find((release) => release.title === 'Naka');
  const corazon = once.releases.find((release) => release.title === 'Corazon');
  assert(naka && naka.catNo === 'FSR40' && naka.status === 'out' && naka.spotify.includes('4ltsIrgI1ohN3NPDQ4O4ZH'), 'naka launch');
  assert(naka.beatport === 'https://www.beatport.com/release/naka/6851275', 'naka beatport ' + naka.beatport);
  assert(naka.label === 'Mixxea Records', 'naka label');
  assert(naka.artwork === '/img/covers/MXX-092_1600.webp', 'naka artwork ' + naka.artwork);
  assert(!String(naka.artwork).includes('ba21e77a'), 'naka uses icon art');
  assert(corazon && corazon.catNo === 'FSR037' && corazon.status === 'out' && corazon.spotify === 'https://open.spotify.com/track/0McK0zrgqBM0xx8scNhegq', 'corazon spotify');
  assert(corazon.beatport === 'https://www.beatport.com/release/corazon/6851269', 'corazon beatport');
  assert(corazon.artwork === '/img/covers/MXX-087_1600.webp', 'corazon artwork ' + corazon.artwork);
  assert(corazon.embed && corazon.embed.provider === 'spotify' && corazon.embed.id === '0McK0zrgqBM0xx8scNhegq', 'corazon embed');
  assert(corazon.artwork !== naka.artwork, 'naka and corazon share artwork');
  assert(!once.releases.some((release) => String(release.beatport || '').includes('5107702') || String(release.beatport || '').includes('4946866')), 'fishermen beatport id');
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

  const icon = 'https://geo-media.beatport.com/image_size/1400x1400/ba21e77a-34d7-48c0-bfe2-c8cec75823f4.jpg';
  const sharedSpotify = 'https://open.spotify.com/track/4ltsIrgI1ohN3NPDQ4O4ZH';
  const older = transform({
    artists: once.artists,
    releases: [
      { id: 'kenta', title: 'Dirty Circuit', artist: 'KENTA', slug: 'kenta-dirty-circuit', catNo: 'MXX-091', status: 'published', catalogueOnly: true, date: '2025-06-30', genre: 'Tech House', artwork: icon, cover: { url: icon, thumbUrl: icon, alt: 'shared' }, spotify: sharedSpotify, beatport: 'https://www.beatport.com/release/dirty-circuit/5107702', label: 'Fishermen Records' },
      { id: 'benny', title: 'Something Else', artist: 'Bennyhews', slug: 'bennyhews-something-else', status: 'published', catalogueOnly: true, date: '2025-06-30', genre: 'Tech House', artwork: icon, spotify: sharedSpotify, beatport: 'https://www.beatport.com/release/something-else/6779285' },
      { id: 'mxx-092', title: 'Naka', artist: 'S1NCE', slug: 's1nce-naka', catNo: 'MXX-092', status: 'out', artwork: icon, spotify: sharedSpotify, beatport: 'https://www.beatport.com/release/naka/5107702' },
      { id: 'mxx-087', title: 'Corazon', artist: 'FL3X', slug: 'fl3x-corazon', catNo: 'MXX-087', status: 'out', artwork: icon, spotify: 'https://open.spotify.com/track/2KlYubUf1bfOgQcjYetjUm', beatport: 'https://www.beatport.com/release/corazon/4946866' },
    ],
    news: [],
    events: [],
    categories: [],
  });
  const byTitle = (title) => older.releases.find((release) => release.title === title);
  const dirty = byTitle('Dirty Circuit');
  const something = byTitle('Something Else');
  const nakaFixed = byTitle('Naka');
  const corazonFixed = byTitle('Corazon');
  assert(dirty.catNo === 'FSR43' && dirty.label === 'Mixxea Records' && dirty.catalogueOnly === true, 'dirty cat');
  assert(dirty.beatport === 'https://www.beatport.com/release/dirty-circuit/6851284', 'dirty beatport');
  assert(!dirty.artwork && !dirty.cover, 'dirty kept the shared icon: ' + dirty.artwork);
  assert(!dirty.spotify, 'dirty kept another release spotify');
  assert(something.catNo === 'FSR42' && something.catalogueOnly === true, 'something cat');
  assert(something.beatport === 'https://www.beatport.com/release/something-else/6779285', 'something beatport');
  assert(!something.artwork && !something.spotify, 'something kept shared assets');
  assert(nakaFixed.catNo === 'FSR40' && nakaFixed.artwork === '/img/covers/MXX-092_1600.webp', 'naka local art');
  assert(nakaFixed.spotify.includes('4ltsIrgI1ohN3NPDQ4O4ZH') && nakaFixed.beatport.endsWith('/6851275'), 'naka links');
  assert(corazonFixed.catNo === 'FSR037' && corazonFixed.artwork === '/img/covers/MXX-087_1600.webp', 'corazon local art');
  assert(corazonFixed.spotify.includes('0McK0zrgqBM0xx8scNhegq') && corazonFixed.beatport.endsWith('/6851269'), 'corazon links');
  assert(!older.artists.some((artist) => /kenta|bennyhews/i.test(artist.slug || artist.name || '')), 'catalogue artist page added');
  const ownArt = 'https://zirwxbdwhxlhzqwo.public.blob.vercel-storage.com/artwork/46336b45-5b97-41ca-b88f-9db3172a515c.webp';
  const ownThumb = 'https://zirwxbdwhxlhzqwo.public.blob.vercel-storage.com/artwork/e8d747e0-8291-4ed2-a31a-e1379ab95308.webp';
  const kept = transform({
    artists: [],
    releases: [{
      id: 'kenta',
      title: 'Dirty Circuit',
      artist: 'KENTA',
      slug: 'kenta-dirty-circuit',
      catNo: 'MXX-091',
      status: 'published',
      catalogueOnly: true,
      genre: 'Tech House',
      artwork: ownArt,
      cover: { url: ownArt, thumbUrl: ownThumb, alt: 'Dirty Circuit by KENTA, cover artwork', w: 1600, h: 1600 },
      spotify: 'https://open.spotify.com/track/2KlYubUf1bfOgQcjYetjUm',
      beatport: 'https://www.beatport.com/release/dirty-circuit/6851284',
    }],
    news: [],
    events: [],
    categories: [],
  });
  const keptDirty = kept.releases.find((release) => release.title === 'Dirty Circuit');
  assert(keptDirty.artwork === ownArt && keptDirty.cover.thumbUrl === ownThumb, 'stored kenta art replaced');
  assert(keptDirty.spotify.includes('2KlYubUf1bfOgQcjYetjUm'), 'stored kenta spotify dropped');
  assert(keptDirty.catNo === 'FSR43', 'stored kenta cat');
  const dirtyPage = renderReleasePage(dirty, older.artists, { relatedReleases: [] });
  const dirtyCover = dirtyPage.split('class="release-cover">')[1].split('class="release-info"')[0];
  assert(dirtyCover.includes('Artwork pending'), 'dirty placeholder missing');
  assert(!dirtyCover.includes('ba21e77a'), 'dirty cover is the icon');
  assert(dirtyPage.includes('>FSR43<'), 'dirty page cat');
  assert(dirtyPage.includes('https://www.beatport.com/release/dirty-circuit/6851284'), 'dirty page beatport');
  assert(!dirtyPage.includes('/artists/kenta'), 'dirty artist page');
  const nakaPage = renderReleasePage(nakaFixed, older.artists, { relatedReleases: [] });
  assert(nakaPage.includes('/img/covers/MXX-092_1600.webp') && nakaPage.includes('>FSR40<'), 'naka page');
  assert(nakaPage.includes('/6851275') && !nakaPage.includes('5107702'), 'naka page beatport');
  const confirmedStill = older.releases.find((release) => release.catNo === 'FSR004');
  assert(confirmedStill && confirmedStill.artwork.includes('ba21e77a') && confirmedStill.beatport.endsWith('/6844691'), 'confirmed remix changed');
  assert(older.releases.find((release) => release.catNo === 'AJR007').artwork.includes('934f516a'), 'gotta changed');
  assert(older.releases.find((release) => release.catNo === 'MXR010').artwork.includes('4d239b09'), 'love changed');

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
  const eddie = once.artists.find((artist) => artist.slug === 'eddie-bitar');
  const since = once.artists.find((artist) => artist.slug === 's1nce');
  const flex = once.artists.find((artist) => artist.slug === 'fl3x');
  assert(hop.description === 'David Hopperman blends French Touch with refined house sensibilities. Read his Mixxea artist profile: biography, releases and booking via booking@mixxea.com.', hop.description);
  assert(wally.description === 'Wally Lopez is a Spanish house DJ, producer and radio host with a career spanning over two decades. Mixxea artist profile, releases and booking enquiries.', wally.description);
  assert(eddie.description === 'Eddie Bitar is an electronic music artist on the Mixxea roster. Read his profile and send booking enquiries to FreqVault Agency: booking@mixxea.com.', eddie.description);
  assert(!/berlin|techno|minimal|psytrance|city/i.test(eddie.description), eddie.description);
  assert(eddie.genre === 'Electronic music artist (genre TBC)', eddie.genre);
  assert(!eddie.city && !eddie.country && !eddie.location, 'Eddie Bitar must have no location');
  {
    const { renderArtistPage } = require('../src/render/publicPages');
    const page = typeof renderArtistPage === 'function' ? String(renderArtistPage({ artist: eddie, artists: once.artists, releases: once.releases || [], events: once.events || [] }) || '') : '';
    if (page) {
      assert(page.includes('Electronic music artist (genre TBC)'), 'Eddie profile genre');
      assert(!/Techno|Berlin|"DE"/.test(page), 'Eddie profile still shows old genre/location');
    }
    const eddieTile = html.split('Eddie Bitar').slice(1).join('').slice(0, 600);
    assert(!/Techno|Berlin/.test(eddieTile), 'home card shows old genre/location');
  }
  assert(since.description.includes('releases including Naka') && since.description.includes('booking@mixxea.com'), since.description);
  assert(flex.description.includes('releases including Corazon'), flex.description);
  for (const artist of [hop, wally, eddie, since, flex]) {
    assert(!/[\r\n]/.test(artist.description), artist.slug + ' description has a newline');
    assert(artist.description.length >= 120 && artist.description.length <= 160, artist.slug + ' ' + artist.description.length);
  }
  const hopPage = renderArtistPage({
    artist: { ...hop, bio: 'Biography\r\nDavid Hopperman has established himself.\r\nAvailable for festivals, clubs, private events.' },
    artists: once.artists,
    releases: [],
    events: [],
  });
  const hopMeta = decodedMeta(hopPage);
  assert(hopMeta === hop.description, hopMeta);
  assert(!hopMeta.includes('Available for festivals'), 'availability claim in meta');
  assert(hopPage.includes('Available for festivals, clubs, private events.'), 'biography removed');
  assert(hopPage.includes('<h1>David Hopperman</h1>'), 'artist H1 changed');
  assert(hopPage.includes('<title>David Hopperman | Mixxea Artist Profile</title>'), 'artist title changed');
  assert(hopPage.includes('href="https://www.mixxea.com/artists/david-hopperman"'), 'artist canonical changed');
  const wallyPage = renderArtistPage({
    artist: { ...wally, bio: 'Available for festivals, clubs, private events.\n\nSpanish house DJ.' },
    artists: once.artists,
    releases: [],
    events: [],
  });
  assert(decodedMeta(wallyPage) === wally.description, decodedMeta(wallyPage));
  assert(!decodedMeta(wallyPage).includes('Available for festivals'), 'wally availability claim in meta');
  const wallyBio = 'Wally Lopez is one of Spain\'s most influential electronic music artists.\n\nAvailable for festivals, clubs, private events, and special performances worldwide.';
  const wallyBody = renderArtistPage({
    artist: { ...wally, bio: wallyBio },
    artists: once.artists,
    releases: [],
    events: [],
  });
  assert(wallyBody.includes('one of Spain'), 'wally biography removed');
  assert(!wallyBody.includes('Available for festivals, clubs, private events, and special performances worldwide.'), 'wally availability sentence remains');
  assert(!wallyBody.includes('special performances worldwide'), 'wally availability sentence remains');

  function assertReleaseMeta(release, artists) {
    const html = renderReleasePage(release, artists, { relatedReleases: [] });
    const meta = decodedMeta(html);
    const block = (html.match(/class="platforms">([\s\S]*?)<\/div>/) || ['', ''])[1];
    const labels = [...block.matchAll(/>([^<]+)<\/a>/g)].map((item) => decodeHtml(item[1])).filter(Boolean);
    assert(meta.length >= 120 && meta.length <= 160, (release.slug || release.title) + ' ' + meta.length + ' ' + meta);
    assert(!/[\r\n]/.test(meta), 'newline in release meta');
    assert(meta.startsWith(release.title + ' by '), meta);
    assert(meta.includes('on Mixxea Records, the independent electronic music label.'), meta);
    const info = html.slice(html.indexOf('release-info'), html.indexOf('Also on Mixxea'));
    if (/\bcredits?\b/i.test(info) && labels.length) {
      assert(meta.endsWith('Release details, credits and links to listen.'), meta);
    } else {
      assert(!/\bcredits?\b/i.test(meta), meta);
      labels.forEach((label) => assert(meta.includes(label), (release.slug || release.title) + ' missing ' + label + ' :: ' + meta));
    }
    const titleTag = decodeHtml((html.match(/<title>([^<]*)<\/title>/) || ['', ''])[1]);
    if (release.slug === 'david-hopperman-gotta-be-the-one') {
      assert(titleTag.length <= 60, titleTag + ' ' + titleTag.length);
      assert(titleTag.includes('David Hopperman') && titleTag.includes('The Subject'), titleTag);
      assert(html.includes('<h1 class="d-l">Gotta Be the One</h1>'), 'gotta h1 changed');
    } else {
      assert(html.includes('| Mixxea Records</title>'), 'release title changed');
    }
    if (['FSR004', 'FSR40', 'FSR037', 'MXR010'].includes(release.catNo)) {
      assert(meta.includes('Cat. no. ' + release.catNo + '.'), meta);
    }
    if (['FSR43', 'FSR42', 'AJR007'].includes(release.catNo)) {
      // SEO 28 Oct 2026: these cat. nos now go in the meta (within 160 characters).
      assert(meta.includes(release.catNo) && meta.length <= 160, meta);
    }
    assert(html.includes('/releases/' + (release.slug || '')), 'release canonical changed');
  }
  for (const release of shown) assertReleaseMeta(release, once.artists);
  for (const release of [dirty, something, nakaFixed, corazonFixed]) assertReleaseMeta(release, older.artists);
  const credited = renderReleasePage({
    title: 'Night Drive',
    artist: 'Ada',
    slug: 'ada-night-drive',
    description: 'Credits: Ada wrote the track.',
    beatport: 'https://www.beatport.com/release/night-drive/1',
    date: '2025-01-02',
    catNo: 'MXX-100',
  }, [], {});
  assert(decodedMeta(credited).includes('Release details, credits and links to listen.'), decodedMeta(credited));
  const news = renderNewsIndex([], {});
  assert(decodedMeta(news) === 'News from Mixxea Records and FreqVault Agency: label releases, artist roster announcements and booking agency updates from the Mixxea team.', decodedMeta(news));
  assert(news.includes('<h1 class="d-l">News.</h1>'), 'news H1 changed');
  const agency = renderNewsCategory({ slug: 'agency', name: 'Agency', label: 'Agency', description: '' }, [], {}, []);
  assert(decodedMeta(agency) === 'Agency news from FreqVault Agency, the booking arm of Mixxea Records: roster additions, artist announcements and booking updates. booking@mixxea.com', decodedMeta(agency));
  assert(!agency.includes('class="body-l"'), 'agency page gained a visible intro');
  assert(agency.includes('<title>Agency | Mixxea News</title>'), 'agency title changed');
  const releasesIndex = renderReleaseIndex(shown, {});
  assert(decodedMeta(releasesIndex) === 'All releases from Mixxea Records, the independent electronic music label, including remixes, with links to listen on Spotify and Beatport.', decodedMeta(releasesIndex));
  assert(!/artist credits|\bEPs?\b|singles/i.test(decodedMeta(releasesIndex)), decodedMeta(releasesIndex));
  assert(releasesIndex.includes('<h1 class="d-l">Releases.</h1>'), 'releases H1 changed');

  assert(html.includes('<title>Mixxea Records &amp; FreqVault Agency: Label &amp; Booking</title>'), 'homepage title');
  assert(html.includes('class="h-title"'), 'homepage H1 removed');
  assert(!html.includes('Electronic Music Label'), 'old homepage title');
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

  const beatport = spawnSync(process.execPath, ['scripts/migrate-beatport-catnos.js', '--fixtures', 'test/fixtures/beatport-catnos'], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
  });
  assert(beatport.status === 0, beatport.stderr || beatport.stdout);
  for (const line of ['FSR43', 'FSR42', 'FSR40', 'FSR037', 'FSR004', 'AJR007', 'MXR010', '6851284', '6779285', '6851275', '6851269', 'second pass: no further differences', 'no changes written', 'redis: not contacted']) {
    assert(beatport.stdout.includes(line), 'beatport dry-run missing ' + line);
  }
  assert(!beatport.stdout.includes('5107702') && !beatport.stdout.includes('4946866'), 'fishermen id in dry-run');
  assert(!beatport.stdout.includes('LEAKED'), beatport.stdout);
  const blocked = spawnSync(process.execPath, ['scripts/migrate-beatport-catnos.js'], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
    env: { ...process.env, KV_REST_API_URL: 'https://example.upstash.io', KV_REST_API_TOKEN: 'secret' },
  });
  assert(blocked.status !== 0 && /production KV/.test(blocked.stderr), blocked.stderr || blocked.stdout);

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
