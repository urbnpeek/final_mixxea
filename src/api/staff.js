/**
 * /api/staff — admin-managed editor accounts and API tokens.
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuid } = require('uuid');
const store = require('../lib/contentStore');
const { requireAdmin, tokenHash } = require('./middleware');

const router = express.Router();

function publicStaff(person) {
  return {
    id: person.id,
    name: person.name,
    email: person.email,
    role: person.role,
    active: person.active !== false,
    createdAt: person.createdAt,
    lastLoginAt: person.lastLoginAt || '',
    rev: person.rev || 1,
    apiTokens: (person.apiTokens || []).map((token) => ({
      id: token.id,
      label: token.label,
      createdAt: token.createdAt,
      lastUsedAt: token.lastUsedAt || '',
    })),
  };
}

router.use(requireAdmin);

router.get('/', async (req, res) => {
  await store.ensureSeeded('staff');
  const people = (await store.list('staff')) || [];
  res.json(people.map(publicStaff));
});

router.post('/', async (req, res) => {
  try {
    await store.ensureSeeded('staff');
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const role = req.body.role === 'admin' ? 'admin' : 'editor';
    if (!name || !email || !email.includes('@')) {
      return res.status(400).json({ error: 'Name and email are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (await store.findStaffByEmail(email)) {
      return res.status(409).json({ error: 'Email already has a staff login' });
    }
    const now = new Date().toISOString();
    const person = {
      id: uuid(),
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role,
      active: true,
      apiTokens: [],
      createdAt: now,
      createdBy: req.actor.name || req.actor.email || 'Admin',
      lastLoginAt: '',
      rev: 1,
    };
    await store.save('staff', person, 0);
    res.status(201).json(publicStaff(person));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const person = await store.getById('staff', req.params.id);
    if (!person) return res.status(404).json({ error: 'Not found' });
    const expected = Number(req.body.rev);
    if (!Number.isFinite(expected)) return res.status(400).json({ error: 'rev is required' });
    if (req.body.name) person.name = String(req.body.name).trim();
    if (req.body.role === 'admin' || req.body.role === 'editor') person.role = req.body.role;
    if (req.body.active === false || req.body.active === 'false') person.active = false;
    if (req.body.active === true || req.body.active === 'true') person.active = true;
    if (req.body.password) {
      if (String(req.body.password).length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }
      person.passwordHash = await bcrypt.hash(String(req.body.password), 10);
    }
    person.rev = expected + 1;
    await store.save('staff', person, expected);
    res.json(publicStaff(person));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message, code: e.code });
  }
});

router.post('/:id/tokens', async (req, res) => {
  try {
    const person = await store.getById('staff', req.params.id);
    if (!person) return res.status(404).json({ error: 'Not found' });
    const expected = Number(person.rev) || 0;
    const secret = 'mxa_' + crypto.randomBytes(24).toString('base64url');
    const token = {
      id: uuid(),
      hash: tokenHash(secret),
      label: String(req.body.label || 'API token').trim().slice(0, 80),
      createdAt: new Date().toISOString(),
      lastUsedAt: '',
    };
    person.apiTokens = (person.apiTokens || []).concat(token);
    person.rev = expected + 1;
    await store.save('staff', person, expected);
    res.status(201).json({ token: secret, ...publicStaff(person).apiTokens.slice(-1)[0] });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

router.delete('/:id/tokens/:tokenId', async (req, res) => {
  try {
    const person = await store.getById('staff', req.params.id);
    if (!person) return res.status(404).json({ error: 'Not found' });
    const expected = Number(person.rev) || 0;
    person.apiTokens = (person.apiTokens || []).filter((token) => token.id !== req.params.tokenId);
    person.rev = expected + 1;
    await store.save('staff', person, expected);
    res.json(publicStaff(person));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

module.exports = router;
