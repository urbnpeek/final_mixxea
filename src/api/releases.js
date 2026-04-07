/**
 * /api/releases — Full CRUD for label releases
 */
const express = require('express');
const multer  = require('multer');
const path    = require('path');
const { v4: uuid } = require('uuid');
const db      = require('./db');
const { requireAdmin } = require('./middleware');
const router  = express.Router();

// ── Multer config for artwork + audio ─────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = file.fieldname === 'artwork' ? 'public/uploads/artwork' : 'public/uploads/audio';
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuid()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } });

// ── GET all releases (public) ──────────────────────────────────────
router.get('/', (req, res) => {
  let releases = db.get('releases');
  // Filter by genre if query param provided
  if (req.query.genre && req.query.genre !== 'all') {
    releases = releases.filter(r => r.genre.toLowerCase() === req.query.genre.toLowerCase());
  }
  // Only show non-draft releases publicly
  if (!req.session.admin) {
    releases = releases.filter(r => r.status !== 'draft');
  }
  res.json(releases);
});

// ── GET single release ─────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const releases = db.get('releases');
  const release  = releases.find(r => r.id === req.params.id);
  if (!release) return res.status(404).json({ error: 'Not found' });
  res.json(release);
});

// ── POST create release (admin only) ──────────────────────────────
router.post('/', requireAdmin, upload.fields([{ name:'artwork',max:1 },{ name:'audio',max:1 }]), (req, res) => {
  const releases = db.get('releases');
  const files    = req.files || {};
  const release  = {
    id:          uuid(),
    title:       req.body.title || '',
    artist:      req.body.artist || '',
    genre:       req.body.genre || '',
    bpm:         parseInt(req.body.bpm) || 0,
    catNo:       req.body.catNo || '',
    date:        req.body.date || '',
    status:      req.body.status || 'draft',
    description: req.body.description || '',
    artwork:     files.artwork  ? `/uploads/artwork/${files.artwork[0].filename}`  : '',
    audioPreview:files.audio    ? `/uploads/audio/${files.audio[0].filename}`      : '',
    spotify:     req.body.spotify     || '',
    beatport:    req.body.beatport    || '',
    apple:       req.body.apple       || '',
    soundcloud:  req.body.soundcloud  || '',
    bandcamp:    req.body.bandcamp    || '',
    createdAt:   new Date().toISOString()
  };
  releases.unshift(release);
  db.set('releases', releases);
  res.status(201).json(release);
});

// ── PUT update release (admin only) ───────────────────────────────
router.put('/:id', requireAdmin, upload.fields([{ name:'artwork',max:1 },{ name:'audio',max:1 }]), (req, res) => {
  const releases = db.get('releases');
  const idx      = releases.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const files    = req.files || {};
  releases[idx]  = {
    ...releases[idx],
    ...req.body,
    bpm: parseInt(req.body.bpm) || releases[idx].bpm,
    ...(files.artwork  ? { artwork:      `/uploads/artwork/${files.artwork[0].filename}` }  : {}),
    ...(files.audio    ? { audioPreview: `/uploads/audio/${files.audio[0].filename}` }      : {}),
    updatedAt: new Date().toISOString()
  };
  db.set('releases', releases);
  res.json(releases[idx]);
});

// ── DELETE release (admin only) ────────────────────────────────────
router.delete('/:id', requireAdmin, (req, res) => {
  let releases = db.get('releases');
  releases     = releases.filter(r => r.id !== req.params.id);
  db.set('releases', releases);
  res.json({ success: true });
});

module.exports = router;
