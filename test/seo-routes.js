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
    { id: 'nera', name: 'Nera', slug: 'nera', status: 'signed', genre: 'Techno', type: 'both' },
  ]);
  writeCollection('releases.json', [
    { title: 'North Signal', slug: 'north-signal', artist: 'Nera', status: 'out', date: '2025-06-01', updatedAt: '2026-09-01T15:00:00.000Z', type: 'ep', artwork: '/favicon.svg' },
    { title: 'Quiet Line', slug: 'quiet-line', artist: 'Nera', status: 'out', type: 'single', date: '2025-02-12', updatedAt: '2026-04-02T00:00:00.000Z' },
  ]);
  writeCollection('news.json', [{
    id: 'n1',
    title: 'Nera joins the roster',
    slug: 'nera-joins-the-roster',
    status: 'published',
    category: 'label-news',
    author: 'Mixxea Team',
    date: '2026-06-17',
    updatedAt: '2026-08-02T10:00:00.000Z',
    body: 'Nera is now listed for bookings.\n\nThe roster page has the profile.',
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
    assert(res.status === 200, 'status ' + res.status);
    assert(/noindex/i.test(res.headers['x-robots-tag'] || ''), 'admin header noindex');
    assert(/noindex/i.test(res.body), 'admin meta noindex');
    assert(res.body.includes('Admin Login'), 'admin shell');
    assert(!res.body.includes('One house. Two doors.'), 'public homepage');
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

  await check('release pages are server rendered', async () => {
    const ep = await request(port, '/releases/north-signal');
    assert(ep.status === 200, 'ep status ' + ep.status);
    assert(ep.body.includes('MusicAlbum'), 'missing MusicAlbum');
    assert(ep.body.includes('North Signal'), 'missing title');
    assert(!ep.body.includes('class="h-title"'), 'homepage shell');
    const single = await request(port, '/releases/quiet-line');
    assert(single.status === 200, 'single status ' + single.status);
    assert(single.body.includes('MusicRecording'), 'single should use MusicRecording');
    const missing = await request(port, '/releases/not-a-real-release');
    assert(missing.status === 404, 'missing status ' + missing.status);
    assert(/noindex/i.test(missing.body), 'missing noindex');
  });

  await check('sitemap lists live releases and uses www', async () => {
    const res = await request(port, '/sitemap.xml');
    assert(res.status === 200, 'status ' + res.status);
    assert(res.body.includes('https://www.mixxea.com/releases/north-signal'), 'missing release url');
    assert(res.body.includes('https://www.mixxea.com/releases/quiet-line'), 'missing second release');
    assert(res.body.includes('<lastmod>2026-09-01</lastmod>'), 'release lastmod should use updatedAt');
    assert(res.body.includes('https://www.mixxea.com/releases</loc>'), 'missing releases index');
    assert(res.body.includes('https://www.mixxea.com/news</loc>'), 'missing news index');
    assert(res.body.includes('https://www.mixxea.com/news/category/label'), 'missing category');
    assert(!res.body.includes('/news/category/release-news'), 'empty legacy category');
    assert(res.body.includes('https://www.mixxea.com/news/nera-joins-the-roster'), 'missing news url');
    assert(res.body.includes('<lastmod>2026-08-02</lastmod>'), 'news lastmod should use updatedAt');
    assert(res.body.includes('https://www.mixxea.com/artists/nera'), 'missing artist url');
    assert(res.body.includes('https://www.mixxea.com/booking-agency'), 'missing booking url');
    assert(!res.body.includes('https://mixxea.com/'), 'apex loc leaked');
    assert(!res.body.includes('google.com/ping'), 'sitemap ping leaked');
  });

  await check('robots sitemap host is www', async () => {
    const res = await request(port, '/robots.txt');
    assert(res.status === 200, 'status ' + res.status);
    assert(res.body.includes('Sitemap: https://www.mixxea.com/sitemap.xml'), res.body);
    assert(res.body.includes('Disallow: /*?preview='), 'preview urls should stay out of the index');
  });

  await check('news article SSR has self canonical and article H1', async () => {
    const res = await request(port, '/news/nera-joins-the-roster');
    assert(res.status === 200, 'status ' + res.status);
    const links = canonicals(res.body);
    assert(links.length === 1, 'canonical count ' + links.length + ' ' + links.join(' | '));
    assert(links[0].includes('https://www.mixxea.com/news/nera-joins-the-roster'), links[0]);
    assert(res.body.includes('<h1 class="a-h1 article-title">Nera joins the roster</h1>'), 'missing article H1');
    assert(res.body.includes('Nera is now listed for bookings.'), 'missing article body');
    assert(res.body.includes('BlogPosting'), 'missing BlogPosting');
    assert(!res.body.includes('class="h-title"'), 'homepage H1 leaked');
    assert(/name="robots" content="index,follow"/.test(res.body), 'robots meta');
    assert(!res.body.includes('GTM-KCNCSXM7'), 'GTM still present');
    assert(res.body.includes('G-MEVRRCQQ5T'), 'GA4 id missing');
    assert(!res.body.includes('G-BQW5PQ4Y99'), 'second GA4 property loaded');
    assert(!res.body.includes('G-PW4MLCMX1L'), 'freqvault property loaded');
    assert(res.body.includes("analytics_storage:'denied'"), 'consent default missing');
    assert(!/<script[^>]+src="[^"]*fbevents\.js/.test(res.body), 'pixel script tag present');
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
      ['/artists/nera', 'https://www.mixxea.com/artists/nera'],
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
    assert(!home.body.includes('GTM-KCNCSXM7'), 'GTM still present');
    assert(home.body.includes('G-MEVRRCQQ5T'), 'GA4 id missing');
    const adUpdate = home.body.indexOf("ad_storage:marketing?'granted':'denied'");
    const gaConfig = home.body.indexOf("gtag('config','G-MEVRRCQQ5T')");
    assert(adUpdate !== -1 && gaConfig !== -1 && adUpdate < gaConfig, 'stored ad consent runs before config');
    assert(home.body.includes('data-cookie-settings'), 'cookie settings missing');
    assert(home.body.includes('/css/site.css?v='), 'css is not versioned');
    assert(home.body.includes('href="/news/nera-joins-the-roster"'), 'news card is not linked');
    assert(home.body.includes('href="/releases/north-signal"'), 'release card is not linked');
    assert(home.body.includes('href="/releases"'), 'all releases link missing');
    assert(home.body.includes('href="/news"'), 'all news link missing');
  });

  await check('privacy page, cookie redirects, and sitemap', async () => {
    const page = await request(port, '/privacy');
    assert(page.status === 200, 'status ' + page.status);
    assert(page.body.includes('Freq Grup SRL'), 'controller missing');
    assert(page.body.includes('id="cookies"'), 'cookies anchor missing');
    assert(page.body.includes('data-cookie-settings'), 'cookie settings control missing');
    assert(page.body.includes('Change cookie settings'), 'change settings label missing');
    assert(page.body.includes('href="/privacy"'), 'footer privacy link missing');
    assert(!page.body.includes('[CONFIRM'), 'confirm marker rendered');
    assert(!page.body.includes('/api/bookings/inquire'), 'removed inquire route described');
    assert(page.body.includes('invitation only'), 'artist accounts wording');
    assert(page.body.includes('invitation-only service for approved DJs'), 'dj pool wording');
    assert(page.body.includes('Lawful basis: contract.'), 'dj pool basis');
    assert(page.body.includes('Resend is the only email provider'), 'resend wording');
    assert(page.body.includes('The minimum age is 16'), 'age missing');
    assert(page.body.includes('stored privately'), 'private files wording');
    assert(page.body.includes('unsubscribe link'), 'unsubscribe missing');
    assert(page.body.includes('Last updated 5 October 2026'), 'date missing');
    assert(/name="robots" content="index,follow"/.test(page.body), 'production robots');
    assert(!page.body.includes('Draft for approval'), 'draft banner leaked outside preview');
    assert(!/noindex/i.test(page.headers['x-robots-tag'] || ''), 'preview robots header leaked');
    assert(String(page.headers['cache-control'] || '').includes('s-maxage=300'), 'production cache');

    process.env.VERCEL_ENV = 'preview';
    try {
      const draft = await request(port, '/privacy');
      assert(draft.body.includes('Draft for approval'), 'draft banner missing on preview');
      assert(/name="robots" content="noindex, nofollow"/.test(draft.body), 'preview noindex meta');
      assert(/noindex/i.test(draft.headers['x-robots-tag'] || ''), 'preview X-Robots-Tag');
      assert(String(draft.headers['cache-control'] || '').includes('no-store'), 'preview cache');
    } finally {
      delete process.env.VERCEL_ENV;
    }

    for (const urlPath of ['/cookies', '/cookie-policy']) {
      const res = await request(port, urlPath);
      assert(res.status === 301, urlPath + ' status ' + res.status);
      assert(res.headers.location === '/privacy#cookies', urlPath + ' location ' + res.headers.location);
    }

    const sitemap = await request(port, '/sitemap.xml');
    assert(sitemap.body.includes('https://www.mixxea.com/privacy</loc>'), 'sitemap privacy url');
  });

  await check('landing heroes keep the redesign grid and drop SEO notes', async () => {
    const css = fs.readFileSync(path.join(__dirname, '../public/css/site.css'), 'utf8');
    assert(css.includes('.hero-grid:has(> .hero-card)'), 'shared landing hero grid rule missing');
    assert(css.includes('.landing-hero h1'), 'landing hero type missing');
    const banned = [
      'Primary keyword target',
      'What This Page Covers',
      'Questions Searchers Ask',
      'AI-Readable Structure',
      'Entity Clarity',
      'Conversion Path',
      'crawl paths',
      'submission-intent',
      'hidden homepage topic',
      'Answer-first blocks',
      'Explore Main Platform',
      'Use Contact Flow',
    ];
    for (const urlPath of ['/booking-agency', '/submit-demo', '/record-label', '/artist-management', '/electronic-music-artists']) {
      const res = await request(port, urlPath);
      assert(res.status === 200, urlPath + ' status ' + res.status);
      assert(res.body.includes('landing-hero'), urlPath + ' missing landing-hero');
      assert(res.body.includes('hero-copy'), urlPath + ' missing hero-copy');
      assert(res.body.includes('hero-card'), urlPath + ' missing hero-card');
      for (const phrase of banned) {
        assert(!res.body.includes(phrase), urlPath + ' still has: ' + phrase);
      }
    }
    const demo = await request(port, '/submit-demo');
    assert(demo.body.includes('href="/submit.html"'), 'demo form link missing');
    assert(demo.body.includes('<strong>Demos</strong>'), 'demos card title missing');
    assert(demo.body.includes('Submit a Demo to Mixxea'), 'demo H1 keyword changed');
  });

  await check('api collection still responds', async () => {
    const res = await request(port, '/api/artists');
    assert(res.status === 200, 'status ' + res.status);
    assert(res.body.includes('Nera'), res.body.slice(0, 200));
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
