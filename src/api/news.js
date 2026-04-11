const express = require('express');
const multer  = require('multer');
const path    = require('path');
const { v4: uuid } = require('uuid');
const db      = require('./db');
const { requireAdmin } = require('./middleware');
const router  = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.get('/', async (req, res) => {
  let news = await db.get('news');
  if (!req.session.admin) news = news.filter(n => n.status === 'published');
  res.json(news);
});

router.get('/:id', async (req, res) => {
  const item = (await db.get('news')).find(n => n.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

router.post('/', requireAdmin, upload.single('image'), async (req, res) => {
  const items = await db.get('news');
  const item  = { id: uuid(), ...req.body, image: req.file ? `/uploads/artwork/${uuid()}${path.extname(req.file.originalname)}` : '', createdAt: new Date().toISOString() };
  items.unshift(item);
  await db.set('news', items);
  res.status(201).json(item);
});

router.put('/:id', requireAdmin, upload.single('image'), async (req, res) => {
  const items = await db.get('news');
  const idx   = items.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  items[idx] = { ...items[idx], ...req.body, ...(req.file ? { image: `/uploads/artwork/${uuid()}${path.extname(req.file.originalname)}` } : {}) };
  await db.set('news', items);
  res.json(items[idx]);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const items = await db.get('news');
  await db.set('news', items.filter(i => i.id !== req.params.id));
  res.json({ success: true });
});

module.exports = router;
