/**
 * /api/auth — Admin login, artist portal login, logout
 */
const express  = require('express');
const bcrypt   = require('bcryptjs');
const { v4: uuid } = require('uuid');
const db       = require('./db');
const router   = express.Router();

// ── Admin Login ───────────────────────────────────────────────────
router.post('/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    req.session.admin = true;
    req.session.adminEmail = email;
    return res.json({ success: true, message: 'Admin authenticated' });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

// ── Admin Logout ──────────────────────────────────────────────────
router.post('/admin/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// ── Check admin session ────────────────────────────────────────────
router.get('/admin/check', (req, res) => {
  res.json({ loggedIn: !!req.session.admin });
});

// ── Artist Portal: Register ────────────────────────────────────────
router.post('/artist/register', async (req, res) => {
  try {
    const { artistName, realName, email, country, genre, password, soundcloud } = req.body;
    if (!artistName || !email || !password) {
      return res.status(400).json({ error: 'Artist name, email, and password are required' });
    }
    const users = db.get('artistPortalUsers');
    if (users.find(u => u.email === email)) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const hash = await bcrypt.hash(password, 10);
    const user = { id: uuid(), artistName, realName, email, country, genre, soundcloud, passwordHash: hash, status: 'unsigned', createdAt: new Date().toISOString() };
    users.push(user);
    db.set('artistPortalUsers', users);
    req.session.artistId = user.id;
    req.session.artistName = user.artistName;
    res.json({ success: true, artist: { id: user.id, artistName: user.artistName, status: user.status } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Artist Portal: Login ───────────────────────────────────────────
router.post('/artist/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const users = db.get('artistPortalUsers');
    const user  = users.find(u => u.email === email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash || '');
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    req.session.artistId = user.id;
    req.session.artistName = user.artistName;
    res.json({ success: true, artist: { id: user.id, artistName: user.artistName, status: user.status } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Artist Portal: Check session ────────────────────────────────────
router.get('/artist/check', (req, res) => {
  if (!req.session.artistId) return res.json({ loggedIn: false });
  const users  = db.get('artistPortalUsers');
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
