/**
 * P0 SEO route checks. Uses local JSON data and does not call Redis.
 * Run: node test/seo-routes.js
 */
const fs = require('fs');
const http = require('http');
const path = require('path');

process.env.CANONICAL_BASE_URL = 'https://mixxea.com';
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;

const dataDir = path.join(__dirname, '../data');
const backups = {};

function writeCollection(name, data) {
  const file = path.join(dataDir, name);
  if (!Object.prototype.hasOwnProperty.call(backups, name)) {
    backups[name] = fs.readFileSync(file, 'utf8');
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function restoreCollections() {
  for (const [name, content] of Object.entries(backups)) {
    fs.writeFileSync(path.join(dataDir, name), content);
  }
}

function request(port, urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.get({ hostname: '127.0.0.1', port, path: urlPath }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks).toString('utf8'),
        });
      });
    });
    req.on('error', reject);
  });
}

function assert(condition, message) {
  if (!condition) {
    const error = new Error(message);
    error.name = 'AssertionError';
    throw error;
  }
}

function canonicals(html) {
  return html.match(/<link rel="canonical"[^>]*>/g) || [];
}

async function main() {
  writeCollection('artists.json', [
    { id: 'lyda', name: 'Lyda', slug: 'lyda', status: 'signed', genre: 'Techno', type: 'both' },
  ]);
  writeCollection('releases.json', [
    { title: 'Grind System EP', slug: 'grind-system-ep', artist: 'Lyda', status: 'out', date: '2025-06-01' },
    { title: 'Void Protocol', slug: 'void-protocol', artist: 'Lyda', status: 'out', date: '2025-02-12' },
  ]);
  writeCollection('news.json', [{
    id: 'n1',
    title: 'Lyda joins the roster',
    slug: 'lyda-joins-the-roster',
    status: 'published',
    category: 'Roster',
    author: 'Mixxea Team',
    date: '2026-06-17',
    body: 'Lyda is now listed for bookings.\n\nThe roster page has the profile.',
  }]);
  writeCollection('events.json', []);

  const app = require('../server');
  const server = await new Promise((resolve) => {
    const handle = app.listen(0, '127.0.0.1', () => resolve(handle));
  });
  const port = server.address().port;
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

  await check('unknown path is a real 404', async () => {
    const res = await request(port, '/this-page-should-not-exist-xyz123');
    assert(res.status === 404, 'status ' + res.status);
    assert(/noindex/i.test(res.headers['x-robots-tag'] || ''), 'missing X-Robots-Tag');
    assert(/noindex/i.test(res.body), 'missing noindex meta');
    assert(!res.body.includes('class="h-title"'), 'homepage H1 shell');
    assert(!res.body.includes('Mixxea &amp; Freq Vault | Electronic Music Label'), 'homepage title');
    assert(!res.body.includes('Mixxea & Freq Vault | Electronic Music Label'), 'homepage title');
    assert(canonicals(res.body).length === 0, '404 should not canonicalize');
  });

  await check('/admin is not the homepage', async () => {
    const res = await request(port, '/admin');
    assert(res.status === 404, 'status ' + res.status);
    assert(/noindex/i.test(res.body), 'missing noindex');
    assert(!res.body.includes('class="h-title"'), 'homepage shell');
  });

  await check('/api/ is not the homepage', async () => {
    const res = await request(port, '/api/');
    assert(res.status === 404, 'status ' + res.status);
    assert(/json/i.test(res.headers['content-type'] || ''), 'content-type ' + res.headers['content-type']);
    assert(/noindex/i.test(res.headers['x-robots-tag'] || ''), 'missing X-Robots-Tag');
    assert(!res.body.includes('<h1'), 'HTML homepage');
    assert(!res.body.includes('MIXXEA'), 'homepage copy');
  });

  await check('/pricing is not a soft 404', async () => {
    const res = await request(port, '/pricing');
    assert(res.status === 404, 'status ' + res.status);
    assert(/noindex/i.test(res.body), 'missing noindex');
  });

  await check('dead release URLs 404', async () => {
    for (const slug of ['grind-system-ep', 'void-protocol']) {
      const res = await request(port, '/releases/' + slug);
      assert(res.status === 404, slug + ' status ' + res.status);
      assert(/noindex/i.test(res.body), slug + ' missing noindex');
    }
  });

  await check('sitemap omits release 404s and uses www', async () => {
    const res = await request(port, '/sitemap.xml');
    assert(res.status === 200, 'status ' + res.status);
    assert(!res.body.includes('/releases/grind-system-ep'), 'lists /releases/grind-system-ep');
    assert(!res.body.includes('/releases/void-protocol'), 'lists /releases/void-protocol');
    assert(res.body.includes('https://www.mixxea.com/news/lyda-joins-the-roster'), 'missing news url');
    assert(res.body.includes('https://www.mixxea.com/artists/lyda'), 'missing artist url');
    assert(res.body.includes('https://www.mixxea.com/booking-agency'), 'missing booking url');
    assert(!res.body.includes('https://mixxea.com/'), 'apex loc leaked');
  });

  await check('robots sitemap host is www', async () => {
    const res = await request(port, '/robots.txt');
    assert(res.status === 200, 'status ' + res.status);
    assert(res.body.includes('Sitemap: https://www.mixxea.com/sitemap.xml'), res.body);
  });

  await check('news article SSR has self canonical and article H1', async () => {
    const res = await request(port, '/news/lyda-joins-the-roster');
    assert(res.status === 200, 'status ' + res.status);
    const links = canonicals(res.body);
    assert(links.length === 1, 'canonical count ' + links.length + ' ' + links.join(' | '));
    assert(links[0].includes('https://www.mixxea.com/news/lyda-joins-the-roster'), links[0]);
    assert(res.body.includes('<h1 class="article-title">Lyda joins the roster</h1>'), 'missing article H1');
    assert(res.body.includes('Lyda is now listed for bookings.'), 'missing article body');
    assert(!res.body.includes('class="h-title"'), 'homepage H1 leaked');
    assert(/name="robots" content="index,follow"/.test(res.body), 'robots meta');
    assert(res.body.includes('GTM-KCNCSXM7'), 'GTM removed');
    assert(res.body.includes('G-MEVRRCQQ5T'), 'GA4 removed');
  });

  await check('missing news is 404', async () => {
    const res = await request(port, '/news/not-a-real-article');
    assert(res.status === 404, 'status ' + res.status);
    assert(/noindex/i.test(res.body), 'missing noindex');
    assert(!res.body.includes('class="h-title"'), 'homepage shell');
  });

  await check('public pages stay 200 with www canonicals', async () => {
    const pages = [
      ['/', 'https://www.mixxea.com/'],
      ['/booking-agency', 'https://www.mixxea.com/booking-agency'],
      ['/record-label', 'https://www.mixxea.com/record-label'],
      ['/artist-management', 'https://www.mixxea.com/artist-management'],
      ['/electronic-music-artists', 'https://www.mixxea.com/electronic-music-artists'],
      ['/submit-demo', 'https://www.mixxea.com/submit-demo'],
      ['/artists/lyda', 'https://www.mixxea.com/artists/lyda'],
    ];
    for (const [urlPath, canonical] of pages) {
      const res = await request(port, urlPath);
      assert(res.status === 200, urlPath + ' status ' + res.status);
      const links = canonicals(res.body);
      assert(links.length === 1, urlPath + ' canonical count ' + links.length);
      assert(links[0].includes(canonical), urlPath + ' ' + links[0]);
    }
    const home = await request(port, '/');
    assert(home.body.includes('class="h-title"'), 'home H1 missing');
    assert(home.body.includes('booking@mixxea.com'), 'booking email changed');
    assert(home.body.includes('GTM-KCNCSXM7'), 'GTM removed');
    assert(home.body.includes('href="/news/lyda-joins-the-roster"'), 'news card is not linked');
  });

  await check('api collection still responds', async () => {
    const res = await request(port, '/api/artists');
    assert(res.status === 200, 'status ' + res.status);
    assert(res.body.includes('Lyda'), res.body.slice(0, 200));
    assert(/noindex/i.test(res.headers['x-robots-tag'] || ''), 'api should be noindex');
  });

  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  if (failures.length) {
    throw new Error(failures.join('\n'));
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    restoreCollections();
  });
