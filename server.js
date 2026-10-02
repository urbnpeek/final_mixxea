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
const { versionHtml } = require('./src/lib/assetVersion');

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
  scriptSrc: [
    "'self'",
    (req, res) => `'nonce-${res.locals.cspNonce}'`,
    'https://www.googletagmanager.com',
    'https://connect.facebook.net',
    'https://cdnjs.cloudflare.com',
  ],
  scriptSrcAttr: ["'unsafe-inline'"],
  styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
  imgSrc: [
    "'self'",
    'data:',
    'https://*.public.blob.vercel-storage.com',
    'https://*.google-analytics.com',
    'https://*.googletagmanager.com',
    'https://www.facebook.com',
  ],
  mediaSrc: ["'self'", 'blob:', 'data:', 'https:'],
  connectSrc: [
    "'self'",
    'https://*.google-analytics.com',
    'https://*.analytics.google.com',
    'https://analytics.google.com',
    'https://*.googletagmanager.com',
    'https://www.google.com',
    'https://stats.g.doubleclick.net',
    'https://www.facebook.com',
  ],
  frameSrc: ['https://open.spotify.com', 'https://w.soundcloud.com', 'https://www.youtube-nocookie.com'],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  frameAncestors: ["'self'"],
};

// Helmet's default CSP turns this on. Keep it for production, and leave HTTP
// local servers alone so a browser check can load the page.
cspDirectives.upgradeInsecureRequests = isProduction ? [] : null;

// Preview deployments inject the Vercel Toolbar. Production keeps the §7
// policy plus the analytics hosts already listed above.
if (process.env.VERCEL_ENV === 'preview') {
  cspDirectives.scriptSrc.push('https://vercel.live');
  cspDirectives.styleSrc.push('https://vercel.live');
  cspDirectives.fontSrc.push('https://vercel.live', 'https://assets.vercel.com');
  cspDirectives.connectSrc.push('https://vercel.live', 'wss://ws-us3.pusher.com');
  cspDirectives.imgSrc.push('https://vercel.live', 'https://vercel.com', 'blob:');
  cspDirectives.frameSrc.push('https://vercel.live');
}

app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
});

// -- Security & middleware --
app.use(helmet({
  contentSecurityPolicy: {
    directives: cspDirectives,
  },
  strictTransportSecurity: isProduction ? undefined : false,
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

function stampHtml(res, html) {
  const nonce = res.locals.cspNonce || '';
  const versioned = versionHtml(String(html)).replace(/__CSP_NONCE__/g, nonce);
  return versioned.replace(/<script\b([^>]*)>/gi, (match, attrs) => {
    if (/\bsrc\s*=/i.test(attrs) || /\bnonce\s*=/i.test(attrs)) return match;
    return `<script${attrs} nonce="${nonce}">`;
  });
}

function sendHtml(res, status, html, cacheControl) {
  res.status(status);
  res.set('Cache-Control', cacheControl || 'no-store, no-cache, must-revalidate');
  if (status === 404 || status === 410) {
    res.set('X-Robots-Tag', 'noindex, nofollow');
  }
  res.type('html').send(stampHtml(res, html));
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
    const html = require('./src/render/homePage').renderHome({ artists, releases, events, news });
    sendHtml(res, 200, html, 'public, s-maxage=300, stale-while-revalidate=86400');
  } catch (e) {
    console.error('[pages] home', e);
    next();
  }
});

app.get('/booking-agency', async (req, res) => {
  try {
    const artists = await db.get('artists');
    const selected = Array.isArray(req.query.artist) ? req.query.artist[0] : req.query.artist;
    const html = pages.applyChrome(pages.injectBooking(
      fs.readFileSync(path.join(__dirname, 'public', 'booking-agency.html'), 'utf8'),
      artists,
      selected
    ), '/booking-agency');
    sendHtml(res, 200, html);
  } catch (e) {
    console.error('[pages] booking', e);
    sendHtml(res, 500, 'Booking page unavailable.');
  }
});

app.get('/electronic-music-artists', async (req, res) => {
  try {
    const artists = await db.get('artists');
    const html = pages.applyChrome(pages.injectRoster(
      fs.readFileSync(path.join(__dirname, 'public', 'electronic-music-artists.html'), 'utf8'),
      artists
    ), '/electronic-music-artists');
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

app.get('/index.html', (req, res) => {
  res.redirect(301, '/');
});

app.get('/admin', (req, res) => {
  const file = path.join(__dirname, 'public', 'index.html');
  const html = fs.readFileSync(file, 'utf8')
    .replace(/<meta name="robots"[^>]*>/i, '<meta name="robots" content="noindex, nofollow">');
  res.set('X-Robots-Tag', 'noindex, nofollow');
  sendHtml(res, 200, html, 'no-store');
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
app.use('/api/staff',        require('./src/api/staff'));
app.use('/api/supabase',     require('./src/api/supabase'));
app.use('/api/dj-pool',      require('./src/api/djPool'));

function blobToken() {
  return process.env.BLOB_READ_WRITE_TOKEN || '';
}

// Diagnostic: Blob storage. GET only lists. POST is the write probe and stays admin-only.
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

app.get('/api/db-status', requireAdmin, async (req, res) => {
  const { isRedisConfigured, getRedisConfig } = require('./src/api/db');
  const cfg = getRedisConfig();
  if (!isRedisConfigured()) {
    return res.json({ configured: false, urlPresent: Boolean(cfg.url), tokenPresent: Boolean(cfg.token) });
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
    const html = pages.applyChrome(fs.readFileSync(path.join(__dirname, 'public', fileName), 'utf8'), routePath);
    sendHtml(res, 200, html);
  });
});

app.get('/portal', (req, res) => {
  sendHtml(res, 200, require('./src/render/catalogPages').renderPortal());
});

const serveSeoDetail = (folder) => (req, res) => {
  const filePath = publicDetailPath(folder, req.params.slug);
  if (filePath && fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  sendHtml(res, 404, pages.renderNotFound());
};

app.get('/events/:slug', serveSeoDetail('events'));

const PUBLIC_PAGE_CACHE = 'public, s-maxage=300, stale-while-revalidate=86400';
const catalog = require('./src/render/catalogPages');
const contentStore = require('./src/lib/contentStore');
const { releaseHiddenReason, newsHiddenReason, visibleReleases, visibleNews } = require('./src/lib/rosterCatalog');
const { verifyPreviewToken } = require('./src/api/middleware');
const { publicCategory } = require('./src/lib/categories');

async function locateRecord(kind, slug, list) {
  const indexed = await contentStore.getBySlug(kind, slug);
  if (indexed) return indexed;
  const doc = (Array.isArray(list) ? list : []).find((item) => {
    const current = kind === 'release' ? pages.releaseSlug(item) : pages.newsSlug(item);
    return current === slug || (Array.isArray(item.previousSlugs) && item.previousSlugs.includes(slug));
  });
  if (!doc) return null;
  const current = kind === 'release' ? pages.releaseSlug(doc) : pages.newsSlug(doc);
  return { doc, redirect: current !== slug };
}

app.get('/releases', async (req, res) => {
  try {
    const [releases, artists] = await Promise.all([db.get('releases'), db.get('artists')]);
    sendHtml(res, 200, catalog.renderReleaseIndex(visibleReleases(releases, artists), req.query), PUBLIC_PAGE_CACHE);
  } catch (e) {
    console.error('[pages] releases', e);
    sendHtml(res, 500, pages.renderNotFound());
  }
});

app.get('/releases/:slug', async (req, res) => {
  try {
    const [releases, artists, news] = await Promise.all([db.get('releases'), db.get('artists'), db.get('news')]);
    const found = await locateRecord('release', req.params.slug, releases);
    if (!found) {
      sendHtml(res, 404, pages.renderNotFound());
      return;
    }
    const preview = verifyPreviewToken(req.query.preview, 'release', found.doc.id);
    if (found.redirect) {
      const next = '/releases/' + pages.releaseSlug(found.doc) + (preview ? '?preview=' + encodeURIComponent(String(req.query.preview)) : '');
      redirectTo(res, next);
      return;
    }
    const hidden = releaseHiddenReason(found.doc, artists);
    if (hidden && !preview) {
      sendHtml(res, 404, pages.renderNotFound());
      return;
    }
    const relatedNews = visibleNews(news, artists).filter((post) =>
      Array.isArray(post.relatedReleaseIds) && post.relatedReleaseIds.includes(found.doc.id)
    ).slice(0, 3);
    const catalogue = visibleReleases(releases, artists).filter((item) => pages.releaseSlug(item) !== pages.releaseSlug(found.doc));
    const sameArtist = catalogue.filter((item) => String(item.artist || '').toLowerCase() === String(found.doc.artist || '').toLowerCase());
    const relatedReleases = sameArtist.concat(catalogue.filter((item) => !sameArtist.includes(item))).slice(0, 4);
    sendHtml(
      res,
      200,
      catalog.renderReleasePage(found.doc, artists, { preview: Boolean(preview), relatedNews, relatedReleases }),
      preview || hidden ? 'no-store' : PUBLIC_PAGE_CACHE
    );
  } catch (e) {
    console.error('[pages] release', e);
    sendHtml(res, 500, pages.renderNotFound());
  }
});

app.get('/news', async (req, res) => {
  try {
    const [news, artists] = await Promise.all([db.get('news'), db.get('artists')]);
    sendHtml(res, 200, catalog.renderNewsIndex(visibleNews(news, artists), req.query), PUBLIC_PAGE_CACHE);
  } catch (e) {
    console.error('[pages] news index', e);
    sendHtml(res, 500, pages.renderNotFound());
  }
});

app.get('/news/category/:cat', async (req, res) => {
  try {
    const category = publicCategory(req.params.cat);
    if (!category) {
      sendHtml(res, 404, pages.renderNotFound());
      return;
    }
    if (category.slug !== String(req.params.cat).toLowerCase()) {
      res.redirect(301, `/news/category/${category.slug}`);
      return;
    }
    const [news, artists] = await Promise.all([db.get('news'), db.get('artists')]);
    const published = visibleNews(news, artists);
    const posts = published.filter((item) => {
      const cat = publicCategory(item.category);
      return cat && cat.slug === category.slug;
    });
    sendHtml(res, 200, catalog.renderNewsCategory(category, posts, req.query, published), PUBLIC_PAGE_CACHE);
  } catch (e) {
    console.error('[pages] news category', e);
    sendHtml(res, 500, pages.renderNotFound());
  }
});

app.get('/dj-pool*', (req, res) => {
  const html = fs.readFileSync(path.join(__dirname, 'public', 'dj-pool.html'), 'utf8');
  sendHtml(res, 200, html, 'no-store, no-cache, must-revalidate');
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
  try {
    const [allNews, artists, releases] = await Promise.all([db.get('news'), db.get('artists'), db.get('releases')]);
    const found = await locateRecord('post', req.params.slug, allNews);
    if (!found) {
      sendHtml(res, 404, pages.renderNotFound());
      return;
    }
    const preview = verifyPreviewToken(req.query.preview, 'post', found.doc.id);
    if (found.redirect) {
      const next = '/news/' + pages.newsSlug(found.doc) + (preview ? '?preview=' + encodeURIComponent(String(req.query.preview)) : '');
      redirectTo(res, next);
      return;
    }
    const hidden = newsHiddenReason(found.doc, artists);
    if (hidden && !preview) {
      sendHtml(res, 404, pages.renderNotFound());
      return;
    }
    const relatedId = found.doc.relatedReleaseIds && found.doc.relatedReleaseIds[0];
    const relatedRelease = relatedId ? releases.find((item) => item.id === relatedId) : null;
    sendHtml(
      res,
      200,
      pages.renderNewsArticle(found.doc, { preview: Boolean(preview), relatedRelease }),
      preview || hidden ? 'no-store' : PUBLIC_PAGE_CACHE
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
