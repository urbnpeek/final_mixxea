const express = require('express');
const multer  = require('multer');
const path    = require('path');
const { v4: uuid } = require('uuid');
const db      = require('./db');
const { requireAdmin } = require('./middleware');
const router  = express.Router();

const upload = multer({ storage: multer.diskStorage({
  destination: 'public/uploads/artwork',
  filename: (req, file, cb) => cb(null, uuid() + path.extname(file.originalname))
}) });

router.get('/', (req, res) => {
  let news = db.get('news');
  if (!req.session.admin) news = news.filter(n => n.status === 'published');
  res.json(news);
});

router.get('/:id', (req, res) => {
  const item = db.get('news').find(n => n.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

router.post('/', requireAdmin, upload.single('image'), (req, res) => {
  const items = db.get('news');
  const item  = { id: uuid(), ...req.body, image: req.file ? `/uploads/artwork/${req.file.filename}` : '', createdAt: new Date().toISOString() };
  items.unshift(item);
  db.set('news', items);
  res.status(201).json(item);
});

router.put('/:id', requireAdmin, upload.single('image'), (req, res) => {
  const items = db.get('news');
  const idx   = items.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  items[idx] = { ...items[idx], ...req.body, ...(req.file ? { image: `/uploads/artwork/${req.file.filename}` } : {}) };
  db.set('news', items);
  res.json(items[idx]);
});

router.delete('/:id', requireAdmin, (req, res) => {
  db.set('news', db.get('news').filter(i => i.id !== req.params.id));
  res.json({ success: true });
});

module.exports = router;
