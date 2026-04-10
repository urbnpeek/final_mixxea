const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuid } = require('uuid');
const db = require('./db');
const { requireAdmin } = require('./middleware');

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.get('/', requireAdmin, (req, res) => {
  res.json(db.get('contracts'));
});

router.post('/', requireAdmin, upload.single('file'), (req, res) => {
  const items = db.get('contracts');
  const item = {
    id: uuid(),
    artist: req.body.artist || '',
    type: req.body.type || '',
    signedAt: req.body.signedAt || '',
    expiresAt: req.body.expiresAt || '',
    notes: req.body.notes || '',
    status: req.body.status || 'active',
    file: req.file ? `/uploads/contracts/${uuid()}${path.extname(req.file.originalname)}` : '',
    createdAt: new Date().toISOString()
  };
  items.unshift(item);
  db.set('contracts', items);
  res.status(201).json(item);
});

router.put('/:id', requireAdmin, upload.single('file'), (req, res) => {
  const items = db.get('contracts');
  const idx = items.findIndex((item) => item.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  items[idx] = {
    ...items[idx],
    ...req.body,
    ...(req.file ? { file: `/uploads/contracts/${uuid()}${path.extname(req.file.originalname)}` } : {}),
    updatedAt: new Date().toISOString()
  };
  db.set('contracts', items);
  res.json(items[idx]);
});

router.delete('/:id', requireAdmin, (req, res) => {
  db.set('contracts', db.get('contracts').filter((item) => item.id !== req.params.id));
  res.json({ success: true });
});

module.exports = router;
