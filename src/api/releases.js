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

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });

router.get('/', async (req, res) => {
  let releases = await db.get('releases');
  if (req.query.genre && req.query.genre !== 'all') {
    releases = releases.filter(r => r.genre.toLowerCase() === req.query.genre.toLowerCase());
  }
  if (!req.session.admin) {
    releases = releases.filter(r => r.status !== 'draft');
  }
  res.json(releases);
});

router.get('/:id', async (req, res) => {
  const releases = await db.get('releases');
  const release  = releases.find(r => r.id === req.params.id);
  if (!release) return res.status(404).json({ error: 'Not found' });
  res.json(release);
});

router.post('/', requireAdmin, upload.fields([{ name:'artwork',max:1 },{ name:'audio',max:1 }]), async (req, res) => {
  const releases = await db.get('releases');
  const files    = req.files || {};
  const release  = {
    id:           uuid(),
    title:        req.body.title || '',
    artist:       req.body.artist || '',
    genre:        req.body.genre || '',
    bpm:          parseInt(req.body.bpm) || 0,
    catNo:        req.body.catNo || '',
    date:         req.body.date || '',
    status:       req.body.status || 'draft',
    description:  req.body.description || '',
    artwork:      files.artwork   ? `/uploads/artwork/${uuid()}${path.extname(files.artwork[0].originalname)}`  : '',
    audioPreview: files.audio     ? `/uploads/audio/${uuid()}${path.extname(files.audio[0].originalname)}`      : '',
    spotify:      req.body.spotify     || '',
    beatport:     req.body.beatport    || '',
    apple:        req.body.apple       || '',
    soundcloud:   req.body.soundcloud  || '',
    bandcamp:     req.body.bandcamp    || '',
    createdAt:    new Date().toISOString()
  };
  releases.unshift(release);
  await db.set('releases', releases);
  res.status(201).json(release);
});

router.put('/:id', requireAdmin, upload.fields([{ name:'artwork',max:1 },{ name:'audio',max:1 }]), async (req, res) => {
  const releases = await db.get('releases');
  const idx      = releases.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const files    = req.files || {};
  releases[idx]  = {
    ...releases[idx],
    ...req.body,
    bpm: parseInt(req.body.bpm) || releases[idx].bpm,
    ...(files.artwork  ? { artwork:      `/uploads/artwork/${uuid()}${path.extname(files.artwork[0].originalname)}` }  : {}),
    ...(files.audio    ? { audioPreview: `/uploads/audio/${uuid()}${path.extname(files.audio[0].originalname)}` }      : {}),
    updatedAt: new Date().toISOString()
  };
  await db.set('releases', releases);
  res.json(releases[idx]);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const releases = await db.get('releases');
  await db.set('releases', releases.filter(r => r.id !== req.params.id));
  res.json({ success: true });
});

module.exports = router;
