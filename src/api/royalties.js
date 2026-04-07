const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('./db');
const { requireAdmin, requireArtist } = require('./middleware');
const router = express.Router();

// Admin: all royalties
router.get('/', requireAdmin, (req, res) => res.json(db.get('royalties')));

// Artist portal: own royalties
router.get('/my', requireArtist, (req, res) => {
  const users = db.get('artistPortalUsers');
  const user  = users.find(u => u.id === req.session.artistId);
  if (!user) return res.status(403).json({ error: 'Not found' });
  const royalties = db.get('royalties').filter(r => r.artist.toUpperCase() === user.artistName.toUpperCase());
  res.json(royalties);
});

router.post('/', requireAdmin, (req, res) => {
  const items = db.get('royalties');
  const item  = { id: uuid(), ...req.body, amount: parseFloat(req.body.amount) || 0, createdAt: new Date().toISOString() };
  items.unshift(item);
  db.set('royalties', items);
  res.status(201).json(item);
});

router.put('/:id', requireAdmin, (req, res) => {
  const items = db.get('royalties');
  const idx   = items.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  items[idx] = { ...items[idx], ...req.body, amount: parseFloat(req.body.amount) || items[idx].amount };
  db.set('royalties', items);
  res.json(items[idx]);
});

router.delete('/:id', requireAdmin, (req, res) => {
  db.set('royalties', db.get('royalties').filter(i => i.id !== req.params.id));
  res.json({ success: true });
});

module.exports = router;
