/**
 * /api/auth — Admin login, artist portal login, logout
 */
const express  = require('express');
const bcrypt   = require('bcryptjs');
const { v4: uuid } = require('uuid');
const db       = require('./db');
const { buildAdminToken, buildStaffToken, resolveActor, requireAdmin } = require('./middleware');
const { getAdminLoginEmail } = require('./adminEnv');
const router   = express.Router();

const isProduction = process.env.NODE_ENV === 'production';

function setAdminCookie(res, token) {
  res.cookie('mixxea_auth', token || buildAdminToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    path: '/',
  });
}

function clearAdminCookie(res) {
  res.clearCookie('mixxea_auth', { path: '/' });
}

function startSession(req, actor) {
  req.session.admin = true;
  req.session.role = actor.role;
  req.session.staffId = actor.id;
  req.session.staffName = actor.name;
  req.session.adminEmail = actor.email;
}

// ── Admin Login ───────────────────────────────────────────────────
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const adminEmail = getAdminLoginEmail();
    const adminPassword = process.env.ADMIN_PASSWORD;
    // Refuse login when the credentials are not configured (undefined === undefined).
    if (adminEmail && adminPassword && email === adminEmail && password === adminPassword) {
      const actor = { role: 'admin', id: 'env', name: 'Admin', email };
      startSession(req, actor);
      setAdminCookie(res, buildAdminToken());
      return res.json({ success: true, message: 'Admin authenticated', role: 'admin', name: 'Admin' });
    }
    const store = require('../lib/contentStore');
    const person = await store.findStaffByEmail(email);
    if (person && person.active !== false && person.passwordHash) {
      const ok = await bcrypt.compare(String(password || ''), person.passwordHash);
      if (ok) {
        const actor = {
          role: person.role === 'editor' ? 'editor' : 'admin',
          id: person.id,
          name: person.name || person.email,
          email: person.email,
        };
        person.lastLoginAt = new Date().toISOString();
        const previousRev = Number(person.rev) || 0;
        person.rev = previousRev + 1;
        try { await store.save('staff', person, previousRev); } catch (e) { /* login still succeeds */ }
        startSession(req, actor);
        setAdminCookie(res, buildStaffToken(person.id, actor.role));
        return res.json({ success: true, message: 'Signed in', role: actor.role, name: actor.name });
      }
    }
    res.status(401).json({ error: 'Invalid credentials' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Admin Logout ──────────────────────────────────────────────────
router.post('/admin/logout', (req, res) => {
  req.session.destroy();
  clearAdminCookie(res);
  res.json({ success: true });
});

// ── Check admin session ────────────────────────────────────────────
router.get('/admin/check', async (req, res) => {
  try {
    const actor = await resolveActor(req);
    if (!actor) return res.json({ loggedIn: false });
    res.json({ loggedIn: true, role: actor.role, name: actor.name, email: actor.email });
  } catch (e) {
    res.json({ loggedIn: false });
  }
});

// ── Artist Portal: Register ────────────────────────────────────────
// Accounts are invitation-only. There is no public invite token, so only an admin can create one.
router.post('/artist/register', requireAdmin, async (req, res) => {
  try {
    const { artistName, realName, email, country, genre, password, soundcloud } = req.body;
    if (!artistName || !email || !password) {
      return res.status(400).json({ error: 'Artist name, email, and password are required' });
    }
    const users = await db.get('artistPortalUsers');
    if (users.find(u => u.email === email)) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const hash = await bcrypt.hash(password, 10);
    const user = { id: uuid(), artistName, realName, email, country, genre, soundcloud, passwordHash: hash, status: 'unsigned', createdAt: new Date().toISOString() };
    users.push(user);
    await db.set('artistPortalUsers', users);
    res.json({ success: true, artist: { id: user.id, artistName: user.artistName, status: user.status } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Artist Portal: Login ───────────────────────────────────────────
router.post('/artist/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const users = await db.get('artistPortalUsers');
    const user  = users.find(u => u.email === email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash || '');
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    req.session.artistId = user.id;
    req.session.artistName = user.artistName;
    res.json({ success: true, artist: { id: user.id, artistName: user.artistName, status: user.status } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Artist Portal: Check session ────────────────────────────────────
router.get('/artist/check', async (req, res) => {
  if (!req.session.artistId) return res.json({ loggedIn: false });
  const users  = await db.get('artistPortalUsers');
  const artist = users.find(u => u.id === req.session.artistId);
  if (!artist) return res.json({ loggedIn: false });
  res.json({ loggedIn: true, artist: { id: artist.id, artistName: artist.artistName, status: artist.status } });
});

// ── Artist Portal: Logout ───────────────────────────────────────────
router.post('/artist/logout', (req, res) => {
  delete req.session.artistId;
  delete req.session.artistName;
  res.json({ success: true });
});

module.exports = router;
