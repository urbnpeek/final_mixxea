const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('./db');
const { requireAdmin } = require('./middleware');
const router = express.Router();

router.get('/', (req, res) => {
  let events = db.get('events');
  if (!req.session.admin) events = events.filter(e => e.status !== 'cancelled');
  res.json(events);
});
router.post('/', requireAdmin, (req, res) => {
  const items = db.get('events');
  const item  = { id: uuid(), ...req.body, createdAt: new Date().toISOString() };
  items.unshift(item);
  db.set('events', items);
  res.status(201).json(item);
});
router.put('/:id', requireAdmin, (req, res) => {
  const items = db.get('events');
  const idx   = items.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  items[idx] = { ...items[idx], ...req.body };
  db.set('events', items);
  res.json(items[idx]);
});
router.delete('/:id', requireAdmin, (req, res) => {
  db.set('events', db.get('events').filter(i => i.id !== req.params.id));
  res.json({ success: true });
});

module.exports = router;
