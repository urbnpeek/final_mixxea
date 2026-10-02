/**
 * artists.js — Artist profile CRUD
 */
const express = require('express');
const multer  = require('multer');
const { v4: uuid } = require('uuid');
const db      = require('./db');
const { uploadFile } = require('./upload');
const { requireAdmin } = require('./middleware');
const router  = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.get('/', async (req, res) => res.json(await db.get('artists')));

router.get('/:id', async (req, res) => {
  const a = (await db.get('artists')).find(x => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: 'Not found' });
  res.json(a);
});

function coerceBookable(body, previous) {
  if (!body || !Object.prototype.hasOwnProperty.call(body, 'bookable')) return previous && previous.bookable === true;
  return body.bookable === true || body.bookable === 'true' || body.bookable === 'on' || body.bookable === '1';
}

router.post('/', requireAdmin, upload.single('photo'), async (req, res) => {
  const artists = await db.get('artists');
  const photoUrl = await uploadFile(req.file, 'artists');
  const artist  = { id: uuid(), ...req.body, bookable: coerceBookable(req.body), photo: photoUrl, createdAt: new Date().toISOString() };
  artists.push(artist);
  await db.set('artists', artists);
  res.status(201).json(artist);
});

router.put('/:id', requireAdmin, upload.single('photo'), async (req, res) => {
  const artists = await db.get('artists');
  const idx     = artists.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const photoUrl = req.file ? await uploadFile(req.file, 'artists') : null;
  artists[idx]  = { ...artists[idx], ...req.body, bookable: coerceBookable(req.body, artists[idx]), ...(photoUrl ? { photo: photoUrl } : {}), updatedAt: new Date().toISOString() };
  await db.set('artists', artists);
  res.json(artists[idx]);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const artists = await db.get('artists');
  await db.set('artists', artists.filter(a => a.id !== req.params.id));
  res.json({ success: true });
});

module.exports = router;
