/**
 * MIXXEA RECORDS â€” Main Server
 * Express.js backend powering the label website + admin panel
 */

require('dotenv').config();
const express    = require('express');
const session    = require('express-session');
const helmet     = require('helmet');
const cors       = require('cors');
const path       = require('path');
const fs         = require('fs');

// â”€â”€ Ensure upload directories exist â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const uploadDirs = ['public/uploads/audio','public/uploads/artwork','public/uploads/contracts'];
uploadDirs.forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); });

const app  = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET is required in production.');
}

if (isProduction) {
  app.set('trust proxy', 1);
}

const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'"],
  styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
  imgSrc: ["'self'", 'data:', 'https:'],
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

// â”€â”€ Security & middleware â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.use(helmet({
  contentSecurityPolicy: {
    directives: cspDirectives,
  },
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// â”€â”€ Sessions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Data store (JSON files â€” swap for DB later) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const db = require('./src/api/db');

// â”€â”€ API Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
app.use('/api/supabase',    require('./src/api/supabase'));

// â”€â”€ Serve main HTML (SPA-style) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const seoPageRoutes = new Map([
  ['/record-label', 'record-label.html'],
  ['/artist-management', 'artist-management.html'],
  ['/booking-agency', 'booking-agency.html'],
  ['/submit-demo', 'submit-demo.html'],
  ['/electronic-music-artists', 'electronic-music-artists.html']
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

app.get('/artists/:slug', serveSeoDetail('artists'));
app.get('/releases/:slug', serveSeoDetail('releases'));
app.get('/events/:slug', serveSeoDetail('events'));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// â”€â”€ Error handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

// â”€â”€ Start â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.listen(PORT, () => {
  console.log(`\nðŸŽµ  MIXXEA RECORDS â€” Server running`);
  console.log(`    Local:   http://localhost:${PORT}`);
  console.log(`    Admin:   http://localhost:${PORT}  (click Admin button)`);
  console.log(`    API:     http://localhost:${PORT}/api/\n`);
});

