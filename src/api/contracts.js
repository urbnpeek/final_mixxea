const express = require('express');
const multer = require('multer');
const { v4: uuid } = require('uuid');
const db = require('./db');
const { uploadFile } = require('./upload');
const { requireAdmin } = require('./middleware');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.get('/', requireAdmin, async (req, res) => res.json(await db.get('contracts')));

router.post('/', requireAdmin, upload.single('file'), async (req, res) => {
  const items = await db.get('contracts');
  const item = {
    id: uuid(),
    artist:    req.body.artist    || '',
    type:      req.body.type      || '',
    signedAt:  req.body.signedAt  || '',
    expiresAt: req.body.expiresAt || '',
    notes:     req.body.notes     || '',
    status:    req.body.status    || 'active',
    file: await uploadFile(req.file, 'contracts'),
    createdAt: new Date().toISOString()
  };
  items.unshift(item);
  await db.set('contracts', items);
  res.status(201).json(item);
});

router.put('/:id', requireAdmin, upload.single('file'), async (req, res) => {
  const items = await db.get('contracts');
  const idx = items.findIndex((item) => item.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  items[idx] = {
    ...items[idx],
    ...req.body,
    ...(req.file ? { file: await uploadFile(req.file, 'contracts') } : {}),
    updatedAt: new Date().toISOString()
  };
  await db.set('contracts', items);
  res.json(items[idx]);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const items = await db.get('contracts');
  await db.set('contracts', items.filter((item) => item.id !== req.params.id));
  res.json({ success: true });
});

module.exports = router;
