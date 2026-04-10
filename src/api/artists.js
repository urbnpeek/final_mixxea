/**
 * artists.js — Artist profile CRUD
 */
const express = require('express');
const multer  = require('multer');
const path    = require('path');
const { v4: uuid } = require('uuid');
const db      = require('./db');
const { requireAdmin } = require('./middleware');
const router  = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.get('/',    (req, res) => res.json(db.get('artists')));
router.get('/:id', (req, res) => {
  const a = db.get('artists').find(x => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: 'Not found' });
  res.json(a);
});
router.post('/', requireAdmin, upload.single('photo'), (req, res) => {
  const artists = db.get('artists');
  const artist  = { id: uuid(), ...req.body, photo: req.file ? `/uploads/artwork/${uuid()}${path.extname(req.file.originalname)}` : '', createdAt: new Date().toISOString() };
  artists.push(artist);
  db.set('artists', artists);
  res.status(201).json(artist);
});
router.put('/:id', requireAdmin, upload.single('photo'), (req, res) => {
  const artists = db.get('artists');
  const idx     = artists.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  artists[idx]  = { ...artists[idx], ...req.body, ...(req.file ? { photo: `/uploads/artwork/${uuid()}${path.extname(req.file.originalname)}` } : {}), updatedAt: new Date().toISOString() };
  db.set('artists', artists);
  res.json(artists[idx]);
});
router.delete('/:id', requireAdmin, (req, res) => {
  db.set('artists', db.get('artists').filter(a => a.id !== req.params.id));
  res.json({ success: true });
});

module.exports = router;
