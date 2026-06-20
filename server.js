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
const { router: seoRouter, generateSitemap } = require('./src/api/seo');

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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
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

// -- Data store (JSON files -- swap for DB later) --
const db = require('./src/api/db');

// -- API Routes --
app.use('/api/auth',         require('./src/api/auth'));
app.use('/api/releases',     require('./src/api/releases'));
app.use('/api/artists',      require('./src/api/artists'));
app.use('/api/demos',        require('./src/api/demos'));
app.use('/api/bookings',     require('./src/api/bookings'));
app.use('/api/newsletter',   require('./src/api/newsletter'));
app.use('/api/contact',      require('./src/api/contact'));
app.use('/api/events',       require('./src/api/events'));
app.use('/api/royalties',    require('./src/api/royalties'));
app.use('/api/contracts',    require('./src/api/contracts'));
app.use('/api/promoters',    require('./src/api/promoters'));
app.use('/api/news',         require('./src/api/news'));
app.use('/api/supabase',     require('./src/api/supabase'));
app.use('/api/dj-pool',      require('./src/api/djPool'));

// Diagnostic: check Blob storage connectivity
app.get('/api/blob-status', async (req, res) => {
  const token = process.env.BLOB_READ_WRITE_TOKEN || '';
  if (!token) return res.json({ configured: false, reason: 'BLOB_READ_WRITE_TOKEN not set' });
  try {
    const { put, del } = require('@vercel/blob');
    const { url } = await put('__ping__/test.txt', 'ok', { access: 'public', token });
    await del(url, { token });
    res.json({ configured: true, tokenStart: token.slice(0, 20) + '...', uploadOk: true });
  } catch (e) {
    res.json({ configured: true, tokenStart: token.slice(0, 20) + '...', uploadOk: false, error: e.message });
  }
});

// Diagnostic: check Redis/KV connectivity
app.get('/api/db-status', async (req, res) => {
  const { isRedisConfigured, getRedisConfig } = require('./src/api/db');
  const cfg = getRedisConfig();
  const configured = isRedisConfigured();
  if (!configured) {
    return res.json({ configured: false, urlPresent: Boolean(cfg.url), tokenPresent: Boolean(cfg.token) });
  }
  try {
    const testKey = 'db:__ping__';
    const setRes = await fetch(cfg.url, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + cfg.token, 'Content-Type': 'application/json' },
      body: JSON.stringify(['SET', testKey, 'ok'])
    });
    const getRes = await fetch(`${cfg.url}/get/${encodeURIComponent(testKey)}`, {
      headers: { Authorization: 'Bearer ' + cfg.token }
    });
    const getJson = await getRes.json();
    res.json({ configured: true, setStatus: setRes.status, getStatus: getRes.status, pingResult: getJson.result });
  } catch (e) {
    res.json({ configured: true, error: e.message });
  }
});

// -- Serve SEO pages --
const seoPageRoutes = new Map([
  ['/record-label',              'record-label.html'],
  ['/artist-management',         'artist-management.html'],
  ['/booking-agency',            'booking-agency.html'],
  ['/submit-demo',               'submit-demo.html'],
  ['/electronic-music-artists',  'electronic-music-artists.html']
]);

seoPageRoutes.forEach((fileName, routePath) => {
  app.get(routePath, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', fileName));
  });
});

const serveSeoDetail = (folder) => (req, res, next) => {
  const filePath = path.join(__dirname, 'public', folder, req.params.slug, 'index.html');
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  return next();
};

app.get('/artists/:slug',  serveSeoDetail('artists'));
app.get('/releases/:slug', serveSeoDetail('releases'));
app.get('/events/:slug',   serveSeoDetail('events'));

app.get('/dj-pool*', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.sendFile(path.join(__dirname, 'public', 'dj-pool.html'));
});

// -- Google Search Console HTML file verification --
app.get('/google:token([0-9a-zA-Z_-]+).html', (req, res) => {
  const envToken = process.env.GOOGLE_SITE_VERIFICATION;
  if (!envToken || req.params.token !== envToken) return res.status(404).end();
  res.type('text/html').send(`google-site-verification: google${envToken}.html`);
});

// -- Server-side rendered news article pages (/news/:slug) --
app.get('/news/:slug', async (req, res) => {
  const BASE = process.env.CANONICAL_BASE_URL || 'https://mixxea.com';
  const db   = require('./src/api/db');
  const slugify = require('./src/utils/slugify');
  const slug = req.params.slug;

  try {
    const allNews = await db.get('news');
    const article = allNews.find(n =>
      (n.slug || slugify(n.title)) === slug && n.status === 'published'
    );

    const indexHtml = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');

    if (!article) {
      return res.status(404).set('Cache-Control', 'no-store').send(indexHtml);
    }

    const articleSlug = article.slug || slugify(article.title);
    const canonicalUrl = `${BASE}/news/${articleSlug}`;
    const description  = (article.body || article.excerpt || '').slice(0, 160).replace(/\n/g, ' ').replace(/"/g, '&quot;');
    const ogImage      = article.image || `${BASE}/og/mixxea-og.svg`;
    const title        = (article.title || 'News').replace(/"/g, '&quot;');
    const pubDate      = article.date || (article.createdAt || '').slice(0, 10);
    const modDate      = (article.updatedAt || article.date || article.createdAt || '').slice(0, 10);

    const articleJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      'headline': article.title,
      'description': description,
      'image': ogImage,
      'datePublished': pubDate,
      'dateModified': modDate,
      'author': { '@type': 'Organization', 'name': article.author || 'Mixxea Records', '@id': `${BASE}/#mixxea` },
      'publisher': { '@type': 'Organization', 'name': 'Mixxea Records', '@id': `${BASE}/#mixxea` },
      'mainEntityOfPage': { '@type': 'WebPage', '@id': canonicalUrl },
      'url': canonicalUrl,
    };

    const seoHead = [
      `<title>${title} | Mixxea Records</title>`,
      `<meta name="description" content="${description}">`,
      `<link rel="canonical" href="${canonicalUrl}">`,
      `<meta property="og:type" content="article">`,
      `<meta property="og:title" content="${title}">`,
      `<meta property="og:description" content="${description}">`,
      `<meta property="og:url" content="${canonicalUrl}">`,
      `<meta property="og:image" content="${ogImage}">`,
      `<meta name="twitter:card" content="summary_large_image">`,
      `<meta name="twitter:title" content="${title}">`,
      `<meta name="twitter:description" content="${description}">`,
      `<meta name="twitter:image" content="${ogImage}">`,
      `<script type="application/ld+json">${JSON.stringify(articleJsonLd)}</script>`,
    ].join('\n  ');

    // Inject before </head> — replace any existing <title> and <meta name="description">
    let html = indexHtml
      .replace(/<title>[^<]*<\/title>/, '')
      .replace(/<meta\s+name="description"[^>]*>/i, '')
      .replace('</head>', `  ${seoHead}\n</head>`);

    res.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.type('text/html').send(html);
  } catch (e) {
    console.error('[SEO] news SSR error:', e);
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

app.get('*', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
