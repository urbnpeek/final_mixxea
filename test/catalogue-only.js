/**
 * Label catalogue releases by artists who are not on the roster.
 * Uses a temporary KV directory and does not call Redis.
 * Run: node test/catalogue-only.js
 */
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mixxea-catalogue-'));
process.env.KV_LOCAL_DIR = tmp;
process.env.ADMIN_LOGIN_EMAIL = 'fuad@example.test';
process.env.ADMIN_PASSWORD = 'correct-horse';
process.env.SESSION_SECRET = 'catalogue-test-secret';
process.env.CANONICAL_BASE_URL = 'https://www.mixxea.com';
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
delete process.env.BLOB_READ_WRITE_TOKEN;
delete process.env.VERCEL_ENV;

const { releaseHiddenReason, visibleReleases, catalogueOnlyArtistSlugs } = require('../src/lib/rosterCatalog');
const { normalizeRelease, legacyRelease } = require('../src/lib/contentModel');
const { renderReleasePage, renderReleaseIndex, releaseJsonLd } = require('../src/render/catalogPages');
const { renderHome } = require('../src/render/homePage');
const blocks = require('../src/render/blocks');
const app = require('../server');

const ROSTER = [
  { id: 'eddie-bitar', name: 'Eddie Bitar', slug: 'eddie-bitar' },
  { id: 'david-hopperman', name: 'David Hopperman', slug: 'david-hopperman' },
  { id: 'wally-lopez', name: 'Wally Lopez', slug: 'wally-lopez' },
  { id: 's1nce', name: 'S1NCE', slug: 's1nce' },
  { id: 'fl3x', name: 'FL3X', slug: 'fl3x' },
];

function assert(condition, message) {
  if (!condition) {
    const error = new Error(message);
    error.name = 'AssertionError';
    throw error;
  }
}

function request(port, method, urlPath, { body, cookie } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = {};
    if (payload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    if (cookie) headers.Cookie = cookie;
    const req = http.request({ hostname: '127.0.0.1', port, path: urlPath, method, headers }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try { json = JSON.parse(text); } catch { json = null; }
        resolve({ status: res.statusCode, headers: res.headers, body: text, json });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function authCookie(res) {
  const raw = res.headers['set-cookie'] || [];
  const list = Array.isArray(raw) ? raw : [raw];
  const found = list.find((item) => item.startsWith('mixxea_auth='));
  if (!found) throw new Error('missing auth cookie');
  return found.split(';')[0];
}

function h1Count(html) {
  return (String(html).match(/<h1\b/gi) || []).length;
}

function jsonLd(html) {
  const match = String(html).match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert(match, 'missing json-ld');
  return JSON.parse(match[1]);
}

function recordingOf(data) {
  const graph = data && data['@graph'] ? data['@graph'] : [data];
  return graph.find((node) => node && (node['@type'] === 'MusicRecording' || node['@type'] === 'MusicAlbum'));
}

async function main() {
  const failures = [];
  async function check(name, fn) {
    try {
      await fn();
      console.log('ok  ' + name);
    } catch (error) {
      failures.push(name + ': ' + error.message);
      console.error('FAIL ' + name + ': ' + error.message);
    }
  }

  const kenta = {
    title: 'Dirty Circuit',
    artist: 'KENTA',
    slug: 'kenta-dirty-circuit',
    status: 'out',
    catalogueOnly: true,
    date: '2026-04-01',
    description: 'KENTA on Mixxea Records.',
    type: 'single',
    artwork: '/og/mixxea-og.jpg',
    cover: { url: '/og/mixxea-og.jpg', thumbUrl: '/og/mixxea-og.jpg', alt: 'Dirty Circuit cover artwork' },
  };
  const benny = {
    title: 'Something Else',
    artist: 'Bennyhews',
    slug: 'bennyhews-something-else',
    status: 'published',
    date: '2026-05-01',
    type: 'single',
  };

  await check('catalogueOnly public release passes the roster gate', async () => {
    assert(releaseHiddenReason(kenta, ROSTER) === '', releaseHiddenReason(kenta, ROSTER));
    assert(releaseHiddenReason({ ...kenta, title: 'KENTA — Dirty Circuit' }, ROSTER) === '', 'artist name in the title hid the release');
    const visible = visibleReleases([kenta, benny], ROSTER);
    assert(visible.some((item) => item.slug === 'kenta-dirty-circuit'), 'flagged release dropped');
    assert(visible.length === 1, 'unflagged release leaked: ' + visible.map((item) => item.artist).join(','));
  });

  await check('non-roster release without the flag stays hidden', async () => {
    assert(releaseHiddenReason(benny, ROSTER) === 'artist is not on the roster', releaseHiddenReason(benny, ROSTER));
    assert(releaseHiddenReason({ ...kenta, catalogueOnly: false }, ROSTER) === 'artist is not on the roster', 'false flag passed');
    assert(releaseHiddenReason({ ...kenta, catalogueOnly: undefined, status: 'draft' }, ROSTER) === 'draft', 'draft status changed');
  });

  await check('all-caps artist name is allowed only for catalogueOnly', async () => {
    const shouted = { ...kenta, description: 'With a VEXR guest.' };
    assert(releaseHiddenReason(shouted, ROSTER) === 'title or description uses an all-caps name that is not on the roster', releaseHiddenReason(shouted, ROSTER));
    const rosterRelease = {
      title: 'Night with VEXR',
      artist: 'Eddie Bitar',
      status: 'out',
      catalogueOnly: false,
    };
    assert(releaseHiddenReason(rosterRelease, ROSTER) === 'title or description uses an all-caps name that is not on the roster', 'roster all-caps guard dropped');
    const scheduled = { ...kenta, status: 'scheduled', publishedAt: '2999-01-01T00:00:00.000Z' };
    assert(releaseHiddenReason(scheduled, ROSTER) === 'scheduled', releaseHiddenReason(scheduled, ROSTER));
  });

  await check('catalogue artists are not given profile slugs when they are off roster', async () => {
    const slugs = catalogueOnlyArtistSlugs([
      kenta,
      { ...benny, catalogueOnly: true },
      { title: 'Naka', artist: 'S1NCE', status: 'out', catalogueOnly: true },
    ], ROSTER);
    assert(slugs.has('kenta'), 'kenta slug missing');
    assert(slugs.has('bennyhews'), 'bennyhews slug missing');
    assert(!slugs.has('s1nce'), 'roster artist was treated as catalogue-only');
  });

  await check('stored flag defaults false and round-trips through validation', async () => {
    const created = normalizeRelease({
      title: 'Dirty Circuit',
      artist: 'KENTA',
      catalogueOnly: 'true',
      action: 'publish',
      hacked: true,
    }, null, { name: 'Admin' });
    assert(created.catalogueOnly === true, 'flag not stored');
    assert(created.rev === 1, 'rev ' + created.rev);
    assert(!created.hacked, 'unknown field stored');
    const kept = normalizeRelease({ title: 'Dirty Circuit', artist: 'KENTA', action: 'publish' }, created, { name: 'Admin' });
    assert(kept.catalogueOnly === true, 'omitted flag cleared');
    assert(kept.rev === 2, 'rev did not advance');
    const cleared = normalizeRelease({ title: 'Dirty Circuit', artist: 'KENTA', catalogueOnly: 'false', action: 'publish' }, kept, { name: 'Admin' });
    assert(cleared.catalogueOnly === false, 'unchecked flag stayed on');
    assert(legacyRelease({ title: 'Old', artist: 'KENTA', status: 'out' }).catalogueOnly === false, 'legacy default');
    assert(legacyRelease({ title: 'Old', artist: 'KENTA', status: 'out', catalogueOnly: true }).catalogueOnly === true, 'legacy flag dropped');
  });

  await check('artist name renders as plain text and structured data stays a name', async () => {
    const page = renderReleasePage(kenta, ROSTER, { relatedReleases: [] });
    assert(h1Count(page) === 1, 'h1 count ' + h1Count(page));
    assert(page.includes('rel="canonical" href="https://www.mixxea.com/releases/kenta-dirty-circuit"'), 'canonical');
    assert(!page.includes('/artists/kenta'), page.match(/\/artists\/[^"']*/g));
    assert(!page.includes('href="/artists/'), 'release page linked an artist profile');
    const artistLine = page.match(/<p class="h3 release-artist"[^>]*>[\s\S]*?<\/p>/);
    assert(artistLine && artistLine[0].includes('KENTA') && !artistLine[0].includes('<a'), artistLine && artistLine[0]);
    const data = jsonLd(page);
    const recording = recordingOf(data);
    assert(recording && recording['@type'] === 'MusicRecording', JSON.stringify(recording));
    assert(recording.byArtist && recording.byArtist.name === 'KENTA', JSON.stringify(recording.byArtist));
    assert(!recording.byArtist.url, 'byArtist gained a url');
    assert(!JSON.stringify(recording.byArtist).includes('/artists/'), 'byArtist links a profile');
    const album = releaseJsonLd({ ...kenta, type: 'album' });
    assert(album['@type'] === 'MusicAlbum', album['@type']);
    assert(album.byArtist.name === 'KENTA' && !album.byArtist.url, JSON.stringify(album.byArtist));
    const card = blocks.releaseCard(kenta);
    assert(card.includes('<div class="who">KENTA</div>'), card);
    assert(!card.includes('/artists/'), card);
    const home = renderHome({ artists: ROSTER, releases: [kenta, benny], news: [], events: [] });
    assert(h1Count(home) === 1, 'home h1 ' + h1Count(home));
    assert(home.includes('<div class="who">KENTA</div>'), 'homepage card missing');
    assert(!home.includes('/artists/kenta'), 'homepage linked the catalogue artist');
    assert(home.includes('googletagmanager.com') && home.includes('G-MEVRRCQQ5T') && home.includes('1331927570650344'), 'tracking markup changed');
    const index = renderReleaseIndex(visibleReleases([kenta, benny], ROSTER), {});
    assert(index.includes('Dirty Circuit') && index.includes('KENTA'), 'index dropped the release');
    assert(!index.includes('/artists/kenta'), 'index linked the catalogue artist');
    assert(h1Count(index) === 1, 'index h1 ' + h1Count(index));
  });

  const server = await new Promise((resolve) => {
    const handle = app.listen(0, '127.0.0.1', () => resolve(handle));
  });
  const port = server.address().port;
  let adminCookie = '';

  await check('admin form offers the catalogue checkbox', async () => {
    const page = await request(port, 'GET', '/admin');
    assert(page.status === 200, 'status ' + page.status);
    assert(page.body.includes('Label catalogue release — artist not on roster, no artist page'), 'checkbox label missing');
    assert(page.body.includes('id="rel-catalogue-only"'), 'checkbox missing');
    const script = fs.readFileSync(path.join(__dirname, '../public/js/admin.js'), 'utf8');
    assert(script.includes('catalogueOnly'), 'admin save does not send the flag');
  });

  await check('POST and PUT accept the flag and keep rev', async () => {
    const login = await request(port, 'POST', '/api/auth/admin/login', {
      body: { email: 'fuad@example.test', password: 'correct-horse' },
    });
    assert(login.status === 200, login.body);
    adminCookie = authCookie(login);
    const created = await request(port, 'POST', '/api/releases', {
      cookie: adminCookie,
      body: {
        title: 'Dirty Circuit',
        artist: 'KENTA',
        action: 'publish',
        type: 'single',
        catalogueOnly: true,
        description: 'KENTA on Mixxea Records.',
        artwork: 'https://www.mixxea.com/og/mixxea-og.jpg',
        coverAlt: 'Dirty Circuit cover artwork',
      },
    });
    assert(created.status === 201, created.body);
    assert(created.json.catalogueOnly === true, JSON.stringify(created.json.catalogueOnly));
    assert(created.json.rev === 1, 'rev ' + created.json.rev);
    assert(created.json.slug === 'kenta-dirty-circuit', created.json.slug);
    const hidden = await request(port, 'POST', '/api/releases', {
      cookie: adminCookie,
      body: {
        title: 'Something Else',
        artist: 'Bennyhews',
        action: 'publish',
        type: 'single',
        catalogueOnly: false,
      },
    });
    assert(hidden.status === 201, hidden.body);
    assert(hidden.json.catalogueOnly === false, 'flag default');
    const stale = await request(port, 'PUT', '/api/releases/' + hidden.json.id, {
      cookie: adminCookie,
      body: {
        title: 'Something Else',
        artist: 'Bennyhews',
        action: 'publish',
        catalogueOnly: true,
        rev: 0,
      },
    });
    assert(stale.status === 409, 'stale rev ' + stale.status + ' ' + stale.body);
    assert(stale.json.code === 'reload', JSON.stringify(stale.json));
    const published = await request(port, 'PUT', '/api/releases/' + hidden.json.id, {
      cookie: adminCookie,
      body: {
        title: 'Something Else',
        artist: 'Bennyhews',
        action: 'publish',
        catalogueOnly: true,
        rev: hidden.json.rev,
        description: 'Bennyhews on the label.',
      },
    });
    assert(published.status === 200, published.body);
    assert(published.json.catalogueOnly === true, 'put did not store the flag');
    assert(published.json.rev === hidden.json.rev + 1, 'rev ' + published.json.rev);
    const artists = await request(port, 'GET', '/api/artists');
    assert(Array.isArray(artists.json) && !artists.json.some((artist) => /kenta|bennyhews/i.test(artist.name || '')), 'catalogue artist record was created');
  });

  await check('public pages, sitemap, and unknown slugs', async () => {
    const list = await request(port, 'GET', '/api/releases');
    assert(list.body.includes('Dirty Circuit'), 'public list hid the catalogue release');
    assert(list.body.includes('Something Else'), 'flagged Bennyhews release hid');
    const page = await request(port, 'GET', '/releases/kenta-dirty-circuit');
    assert(page.status === 200, 'release ' + page.status);
    assert(h1Count(page.body) === 1, 'h1 ' + h1Count(page.body));
    assert(page.body.includes('rel="canonical" href="https://www.mixxea.com/releases/kenta-dirty-circuit"'), 'canonical');
    assert(!page.body.includes('/artists/kenta'), 'detail linked the artist');
    assert(page.body.includes('MusicRecording'), 'missing MusicRecording');
    const data = jsonLd(page.body);
    const recording = recordingOf(data);
    assert(recording.byArtist.name === 'KENTA' && !recording.byArtist.url, JSON.stringify(recording.byArtist));
    assert(page.body.includes('googletagmanager.com') && page.body.includes('G-MEVRRCQQ5T') && page.body.includes('1331927570650344'), 'tracking missing');
    const other = await request(port, 'GET', '/releases/bennyhews-something-else');
    assert(other.status === 200, 'bennyhews ' + other.status);
    assert(!other.body.includes('/artists/bennyhews'), 'bennyhews artist link');
    const missing = await request(port, 'GET', '/releases/not-a-real-release');
    assert(missing.status === 404, 'unknown release ' + missing.status);
    const artist = await request(port, 'GET', '/artists/kenta');
    assert(artist.status === 404, 'artist page ' + artist.status);
    assert(!artist.body.includes('KENTA is listed'), artist.body.slice(0, 400));
    const bennyArtist = await request(port, 'GET', '/artists/bennyhews');
    assert(bennyArtist.status === 404, 'bennyhews artist ' + bennyArtist.status);
    const home = await request(port, 'GET', '/');
    assert(home.status === 200, 'home ' + home.status);
    assert(home.body.includes('Dirty Circuit'), 'homepage card missing');
    assert(!home.body.includes('/artists/kenta'), 'homepage artist link');
    assert(h1Count(home.body) === 1, 'home h1 ' + h1Count(home.body));
    const index = await request(port, 'GET', '/releases');
    assert(index.status === 200, 'index ' + index.status);
    assert(index.body.includes('/releases/kenta-dirty-circuit'), 'index missing release');
    assert(!index.body.includes('/artists/kenta'), 'index artist link');
    const map = await request(port, 'GET', '/sitemap.xml');
    assert(map.status === 200, 'sitemap ' + map.status);
    assert(map.body.includes('https://www.mixxea.com/releases/kenta-dirty-circuit'), 'sitemap missing release');
    assert(map.body.includes('https://www.mixxea.com/releases/bennyhews-something-else'), 'sitemap missing second release');
    assert(map.body.includes('https://www.mixxea.com/releases</loc>'), 'sitemap index url changed');
    assert(!map.body.includes('/artists/kenta'), 'sitemap listed kenta');
    assert(!map.body.includes('/artists/bennyhews'), 'sitemap listed bennyhews');
    const schema = await request(port, 'GET', '/api/seo/schema.json');
    assert(schema.status === 200, 'schema ' + schema.status);
    assert(schema.body.includes('Dirty Circuit'), 'schema dropped the release');
    assert(!schema.body.includes('/artists/kenta'), 'schema linked the artist');
    const album = (schema.json['@graph'] || []).find((node) => node.name === 'Dirty Circuit');
    assert(album && album.byArtist && album.byArtist.name === 'KENTA' && !album.byArtist.url, JSON.stringify(album && album.byArtist));
  });

  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  if (failures.length) {
    throw new Error(failures.length + ' failed\n' + failures.join('\n'));
  }
  console.log('catalogue-only: 8 passed');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });
