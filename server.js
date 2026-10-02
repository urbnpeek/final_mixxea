/**
 * MIXXEA RECORDS -- Main Server
 * Express.js backend powering the label website + admin panel
 */

require('dotenv').config();
const express    = require('express');
const session    = require('express-session');
const helmet     = require('helmet');
const cors       = require('cors');
const path       = require('path');
const fs         = require('fs');
const crypto     = require('crypto');
const { requireAdmin } = require('./src/api/middleware');
const { router: seoRouter, generateSitemap } = require('./src/api/seo');
const db = require('./src/api/db');
const pages = require('./src/render/publicPages');
const { publicDetailPath } = require('./src/lib/publicDetail');

// -- Ensure upload directories exist (silently skip if read-only, e.g. Vercel) --
const uploadDirs = ['public/uploads/audio','public/uploads/artwork','public/uploads/news','public/uploads/contracts'];
uploadDirs.forEach(dir => {
  try { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }
  catch (e) { /* read-only filesystem (Vercel) -- skip */ }
});

const app  = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// SESSION_SECRET should be set in Vercel environment variables.
// Falls back to a default so the function doesn't crash while env vars are being configured.

if (isProduction) {
  app.set('trust proxy', 1);
}

const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'"],
  scriptSrcAttr: ["'unsafe-inline'"],
  styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
  imgSrc: ["'self'", 'data:', 'https:', 'https://*.public.blob.vercel-storage.com'],
  mediaSrc: ["'self'", 'blob:', 'data:', 'https:'],
  connectSrc: ["'self'"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  frameAncestors: ["'self'"],
};

if (isProduction) {
  cspDirectives.upgradeInsecureRequests = [];
}

// -- Security & middleware --
app.use(helmet({
  contentSecurityPolicy: {
    directives: cspDirectives,
  },
}));
app.use(cors());
// Resend signs the raw body. This route must stay ahead of express.json()
// so the Svix check sees the exact bytes, not a re-serialized object.
app.post(
  '/api/webhooks/resend',
  express.raw({ type: () => true, limit: '2mb' }),
  require('./src/api/resendWebhook').handleResendWebhook
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api', (req, res, next) => {
  res.set('X-Robots-Tag', 'noindex, nofollow');
  next();
});
// -- Dynamic sitemap (must come before static middleware intercepts /sitemap.xml) --
app.get('/sitemap.xml', async (req, res) => {
  try {
    const xml = await generateSitemap();
    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.send(xml);
  } catch (e) {
    console.error('[SEO] sitemap error:', e);
    res.status(500).send('<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>');
  }
});

// -- SEO API (schema.json endpoints) --
app.use('/api/seo', seoRouter);

function sendHtml(res, status, html, cacheControl) {
  res.status(status);
  res.set('Cache-Control', cacheControl || 'no-store, no-cache, must-revalidate');
  if (status === 404 || status === 410) {
    res.set('X-Robots-Tag', 'noindex, nofollow');
  }
  res.type('html').send(html);
}

function redirectTo(res, location) {
  res.redirect(301, location);
}

app.get(['/booking', '/agency', '/freqvault'], (req, res) => {
  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  redirectTo(res, '/booking-agency' + query);
});

app.get('/roster', (req, res) => {
  redirectTo(res, '/#roster');
});

app.get('/artists', (req, res) => {
  redirectTo(res, '/electronic-music-artists');
});

app.get('/', async (req, res, next) => {
  try {
    const [artists, releases, events, news] = await Promise.all([
      db.get('artists'),
      db.get('releases'),
      db.get('events'),
      db.get('news'),
    ]);
    const html = pages.injectHome(fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8'), {
      artists, releases, events, news,
    });
    sendHtml(res, 200, html);
  } catch (e) {
    console.error('[pages] home', e);
    next();
  }
});

app.get('/booking-agency', async (req, res) => {
  try {
    const artists = await db.get('artists');
    const selected = Array.isArray(req.query.artist) ? req.query.artist[0] : req.query.artist;
    const html = pages.injectBooking(
      fs.readFileSync(path.join(__dirname, 'public', 'booking-agency.html'), 'utf8'),
      artists,
      selected
    );
    sendHtml(res, 200, html);
  } catch (e) {
    console.error('[pages] booking', e);
    sendHtml(res, 500, 'Booking page unavailable.');
  }
});

app.get('/electronic-music-artists', async (req, res) => {
  try {
    const artists = await db.get('artists');
    const html = pages.injectRoster(
      fs.readFileSync(path.join(__dirname, 'public', 'electronic-music-artists.html'), 'utf8'),
      artists
    );
    sendHtml(res, 200, html);
  } catch (e) {
    console.error('[pages] roster', e);
    sendHtml(res, 500, 'Roster page unavailable.');
  }
});

app.get('/artists/:slug', async (req, res) => {
  try {
    const [artists, releases, events] = await Promise.all([
      db.get('artists'),
      db.get('releases'),
      db.get('events'),
    ]);
    const artist = pages.findArtist(artists, req.params.slug);
    if (!artist) {
      sendHtml(res, 404, pages.renderArtistNotFound());
      return;
    }
    const canonical = pages.artistSlug(artist);
    if (canonical && canonical !== req.params.slug) {
      redirectTo(res, '/artists/' + canonical);
      return;
    }
    sendHtml(res, 200, pages.renderArtistPage({ artist, artists, releases, events }));
  } catch (e) {
    console.error('[pages] artist', e);
    sendHtml(res, 500, pages.renderArtistNotFound());
  }
});

// JS files: never cache so updates deploy immediately
app.use('/js', express.static(path.join(__dirname, 'public', 'js'), { maxAge: 0, etag: false }));
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders(res, filePath) {
    // Long cache for fingerprinted assets
    if (/\.(css|woff2?|ttf|otf|eot|svg|png|jpg|jpeg|gif|ico|webp)$/.test(filePath)) {
      res.set('Cache-Control', 'public, max-age=2592000, immutable');
    }
  }
}));

// -- Sessions --
app.use(session({
  name: 'mixxea.sid',
  secret: process.env.SESSION_SECRET || 'mixxea-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: 1000 * 60 * 60 * 24  // 24 hours
  }
}));

// -- API Routes --
app.use('/api/auth',         require('./src/api/auth'));
app.use('/api/releases',     require('./src/api/releases'));
app.use('/api/artists',      require('./src/api/artists'));
app.use('/api/demos',        require('./src/api/demos'));
app.use('/api/bookings',     require('./src/api/bookings'));
app.use('/api/newsletter',   require('./src/api/newsletter'));
app.use('/api/contact',      require('./src/api/contact'));
app.use('/api/inbox',        require('./src/api/inbox'));
app.use('/api/events',       require('./src/api/events'));
app.use('/api/royalties',    require('./src/api/royalties'));
app.use('/api/contracts',    require('./src/api/contracts'));
app.use('/api/promoters',    require('./src/api/promoters'));
app.use('/api/news',         require('./src/api/news'));
app.use('/api/supabase',     require('./src/api/supabase'));
app.use('/api/dj-pool',      require('./src/api/djPool'));

function blobToken() {
  return process.env.BLOB_READ_WRITE_TOKEN || '';
}

// Diagnostic: Blob storage. GET only lists (no writes). POST uploads a probe and deletes it.
app.get('/api/blob-status', requireAdmin, async (req, res) => {
  const token = blobToken();
  if (!token) return res.json({ configured: false });
  try {
    const { list } = require('@vercel/blob');
    await list({ token, limit: 1, abortSignal: AbortSignal.timeout(4000) });
    res.json({ configured: true, reachable: true });
  } catch (e) {
    res.json({ configured: true, reachable: false });
  }
});

app.post('/api/blob-status', requireAdmin, async (req, res) => {
  const token = blobToken();
  if (!token) return res.json({ configured: false, writeOk: false });
  const { put, del } = require('@vercel/blob');
  const pathname = '__ping__/' + Date.now().toString(36) + '-' + crypto.randomBytes(8).toString('hex') + '.txt';
  let url = '';
  let writeOk = false;
  try {
    const created = await put(pathname, 'ok', {
      access: 'public',
      token,
      addRandomSuffix: true,
      abortSignal: AbortSignal.timeout(8000),
    });
    url = created && created.url ? created.url : '';
    writeOk = Boolean(url);
  } catch (e) {
    writeOk = false;
  }
  if (url) {
    let removed = false;
    for (let attempt = 0; attempt < 2 && !removed; attempt++) {
      try {
        await del(url, { token, abortSignal: AbortSignal.timeout(8000) });
        removed = true;
      } catch (e) { /* retry cleanup once */ }
    }
    if (!removed) writeOk = false;
  }
  res.json({ configured: true, writeOk });
});

// Diagnostic: Redis/KV. GET only PINGs. POST writes a short-lived key and deletes it.
app.get('/api/db-status', requireAdmin, async (req, res) => {
  const { isRedisConfigured, getRedisConfig } = require('./src/api/db');
  const cfg = getRedisConfig();
  if (!isRedisConfigured()) {
    return res.json({
      configured: false,
      urlPresent: Boolean(cfg.url),
      tokenPresent: Boolean(cfg.token),
    });
  }
  try {
    const pingRes = await fetch(cfg.url, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + cfg.token, 'Content-Type': 'application/json' },
      body: JSON.stringify(['PING']),
      signal: AbortSignal.timeout(4000),
    });
    let pong = false;
    try {
      const json = await pingRes.json();
      pong = Boolean(json && json.result === 'PONG');
    } catch (e) {
      pong = false;
    }
    res.json({ configured: true, reachable: Boolean(pingRes.ok && pong) });
  } catch (e) {
    res.json({ configured: true, reachable: false });
  }
});

app.post('/api/db-status', requireAdmin, async (req, res) => {
  const { isRedisConfigured, getRedisConfig } = require('./src/api/db');
  const cfg = getRedisConfig();
  if (!isRedisConfigured()) return res.json({ configured: false, writeOk: false });
  const testKey = 'db:__ping__:' + Date.now().toString(36) + ':' + crypto.randomBytes(8).toString('hex');
  let writeOk = false;
  try {
    const setRes = await fetch(cfg.url, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + cfg.token, 'Content-Type': 'application/json' },
      body: JSON.stringify(['SET', testKey, 'ok', 'EX', '30']),
      signal: AbortSignal.timeout(4000),
    });
    const getRes = await fetch(cfg.url + '/get/' + encodeURIComponent(testKey), {
      headers: { Authorization: 'Bearer ' + cfg.token },
      signal: AbortSignal.timeout(4000),
    });
    let value = null;
    try {
      const json = await getRes.json();
      value = json && json.result;
    } catch (e) {
      value = null;
    }
    writeOk = Boolean(setRes.ok && getRes.ok && value === 'ok');
  } catch (e) {
    writeOk = false;
  } finally {
    try {
      await fetch(cfg.url, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + cfg.token, 'Content-Type': 'application/json' },
        body: JSON.stringify(['DEL', testKey]),
        signal: AbortSignal.timeout(4000),
      });
    } catch (e) {
      writeOk = false;
    }
  }
  res.json({ configured: true, writeOk });
});

app.use('/api', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.status(404).json({ error: 'Not found' });
});

// -- Serve SEO pages --
const seoPageRoutes = new Map([
  ['/record-label',              'record-label.html'],
  ['/artist-management',         'artist-management.html'],
  ['/submit-demo',               'submit-demo.html']
]);

seoPageRoutes.forEach((fileName, routePath) => {
  app.get(routePath, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', fileName));
  });
});

const serveSeoDetail = (folder) => (req, res) => {
  const filePath = publicDetailPath(folder, req.params.slug);
  if (filePath && fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  sendHtml(res, 404, pages.renderNotFound());
};

app.get('/releases/:slug', serveSeoDetail('releases'));
app.get('/events/:slug',   serveSeoDetail('events'));

app.get('/dj-pool*', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.sendFile(path.join(__dirname, 'public', 'dj-pool.html'));
});

// -- Google Search Console HTML file verification --
app.get('/google:token([0-9a-zA-Z_-]+).html', (req, res) => {
  const envToken = process.env.GOOGLE_SITE_VERIFICATION;
  if (!envToken || req.params.token !== envToken) {
    sendHtml(res, 404, pages.renderNotFound());
    return;
  }
  res.type('text/html').send(`google-site-verification: google${envToken}.html`);
});

// -- Server-side rendered news article pages (/news/:slug) --
app.get('/news/:slug', async (req, res) => {
  const slugify = require('./src/utils/slugify');
  const slug = req.params.slug;

  try {
    const { visibleNews } = require('./src/lib/rosterCatalog');
    const [allNews, artists] = await Promise.all([db.get('news'), db.get('artists')]);
    const article = visibleNews(allNews, artists).find(n =>
      (n.slug || slugify(n.title)) === slug
    );

    if (!article) {
      sendHtml(res, 404, pages.renderNotFound());
      return;
    }

    const articleSlug = article.slug || slugify(article.title);
    if (articleSlug && articleSlug !== slug) {
      redirectTo(res, '/news/' + articleSlug);
      return;
    }

    sendHtml(
      res,
      200,
      pages.renderNewsArticle(article),
      'public, s-maxage=3600, stale-while-revalidate=86400'
    );
  } catch (e) {
    console.error('[SEO] news SSR error:', e);
    sendHtml(res, 500, pages.renderNotFound());
  }
});

app.get('*', (req, res) => {
  sendHtml(res, 404, pages.renderNotFound());
});

// -- Error handler --
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

// -- Start (local dev) / export (Vercel) --
if (require.main === module) {
  app.listen(PORT, () => {
    console.log('\n[MIXXEA] Server running');
    console.log('  Local:  http://localhost:' + PORT);
    console.log('  Admin:  http://localhost:' + PORT + '  (click Admin button)');
    console.log('  API:    http://localhost:' + PORT + '/api/\n');
  });
}

module.exports = app;
