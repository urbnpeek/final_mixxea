/**
 * bookings.js - FreqVault booking requests
 */
const express = require('express');
const db = require('./db');
const { requireAdmin } = require('./middleware');
const router = express.Router();

router.get('/', requireAdmin, async (req, res) => res.json(await db.get('bookings')));

router.put('/:id', requireAdmin, async (req, res) => {
  const items = await db.get('bookings');
  const idx = items.findIndex((i) => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  items[idx] = { ...items[idx], ...req.body, updatedAt: new Date().toISOString() };
  await db.set('bookings', items);
  res.json(items[idx]);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const items = await db.get('bookings');
  await db.set('bookings', items.filter((i) => i.id !== req.params.id));
  res.json({ success: true });
});

module.exports = router;
