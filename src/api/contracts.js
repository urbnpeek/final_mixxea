const express = require('express');
const multer = require('multer');
const { v4: uuid } = require('uuid');
const db = require('./db');
const { uploadFile } = require('./upload');
const { requireAdmin, resolveActor } = require('./middleware');
const { presentRecord, sendStoredFile } = require('../lib/privateFiles');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

function presentContract(item) {
  return presentRecord(item, `/api/contracts/${item.id}/file`);
}

function artistOwns(contract, req) {
  const name = String(req.session && req.session.artistName || '').trim().toLowerCase();
  const owner = String(contract && contract.artist || '').trim().toLowerCase();
  return Boolean(name && owner && name === owner);
}

router.get('/', requireAdmin, async (req, res) => {
  const items = await db.get('contracts');
  res.json(items.map(presentContract));
});

router.get('/:id/file', async (req, res) => {
  try {
    const items = await db.get('contracts');
    const item = items.find((entry) => entry.id === req.params.id);
    if (!item || !item.file) return res.status(404).json({ error: 'File not found' });
    const actor = await resolveActor(req);
    const allowed = (actor && actor.role === 'admin') || artistOwns(item, req);
    if (!actor && !req.session?.artistId) return res.status(401).json({ error: 'Sign in required' });
    if (!allowed) return res.status(403).json({ error: 'Not allowed' });
    await sendStoredFile(res, item.file);
  } catch (error) {
    console.error('[CONTRACTS] file error:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Could not open the file' });
  }
});

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
    file: await uploadFile(req.file, 'contracts', { access: 'private' }),
    createdAt: new Date().toISOString()
  };
  items.unshift(item);
  await db.set('contracts', items);
  res.status(201).json(presentContract(item));
});

router.put('/:id', requireAdmin, upload.single('file'), async (req, res) => {
  const items = await db.get('contracts');
  const idx = items.findIndex((item) => item.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const body = { ...req.body };
  delete body.file;
  items[idx] = {
    ...items[idx],
    ...body,
    file: req.file ? await uploadFile(req.file, 'contracts', { access: 'private' }) : items[idx].file,
    updatedAt: new Date().toISOString()
  };
  await db.set('contracts', items);
  res.json(presentContract(items[idx]));
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const items = await db.get('contracts');
  await db.set('contracts', items.filter((item) => item.id !== req.params.id));
  res.json({ success: true });
});

module.exports = router;
