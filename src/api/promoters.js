const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('./db');
const { requireAdmin } = require('./middleware');

const router = express.Router();

router.get('/', requireAdmin, (req, res) => {
  res.json(db.get('promoters'));
});

router.post('/', requireAdmin, (req, res) => {
  const items = db.get('promoters');
  const item = {
    id: uuid(),
    name: req.body.name || '',
    email: req.body.email || '',
    venue: req.body.venue || '',
    city: req.body.city || '',
    country: req.body.country || '',
    totalBookings: parseInt(req.body.totalBookings, 10) || 0,
    notes: req.body.notes || '',
    createdAt: new Date().toISOString()
  };
  items.unshift(item);
  db.set('promoters', items);
  res.status(201).json(item);
});

router.put('/:id', requireAdmin, (req, res) => {
  const items = db.get('promoters');
  const idx = items.findIndex((item) => item.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  items[idx] = {
    ...items[idx],
    ...req.body,
    totalBookings: req.body.totalBookings === undefined
      ? items[idx].totalBookings
      : parseInt(req.body.totalBookings, 10) || 0,
    updatedAt: new Date().toISOString()
  };
  db.set('promoters', items);
  res.json(items[idx]);
});

router.delete('/:id', requireAdmin, (req, res) => {
  db.set('promoters', db.get('promoters').filter((item) => item.id !== req.params.id));
  res.json({ success: true });
});

module.exports = router;
