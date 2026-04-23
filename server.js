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

// -- Ensure upload directories exist (silently skip if read-only, e.g. Vercel) --
const uploadDirs = ['public/uploads/audio','public/uploads/artwork','public/uploads/contracts'];
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
// JS files: never cache so updates deploy immediately
app.use('/js', express.static(path.join(__dirname, 'public', 'js'), { maxAge: 0, etag: false }));
app.use(express.static(path.join(__dirname, 'public')));

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
