/**
 * middleware.js — Shared Express middleware
 */
const crypto = require('crypto');

const SECRET = () => process.env.SESSION_SECRET || 'mixxea-dev-secret';

// Parse cookies from header without requiring cookie-parser
function getCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    if (part.substring(0, idx).trim() === name) {
      return decodeURIComponent(part.substring(idx + 1).trim());
    }
  }
  return null;
}

// HMAC-sign a value
function signValue(value) {
  return crypto.createHmac('sha256', SECRET()).update(value).digest('base64url');
}

// Return value if signature is valid, null otherwise
function verifySignedCookie(token) {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot < 0) return null;
  const value = token.substring(0, dot);
  const sig   = token.substring(dot + 1);
  if (sig !== signValue(value)) return null;
  return value;
}

// Build a signed cookie token
function buildAdminToken() {
  const value = 'admin:1';
  return `${value}.${signValue(value)}`;
}

// Protect admin routes — checks session (warm) or signed cookie (cold start)
function requireAdmin(req, res, next) {
  if (req.session && req.session.admin) return next();
  const token = getCookie(req, 'mixxea_auth');
  if (verifySignedCookie(token) === 'admin:1') return next();
  res.status(403).json({ error: 'Admin access required' });
}

// Protect artist portal routes
function requireArtist(req, res, next) {
  if (req.session && req.session.artistId) return next();
  res.status(403).json({ error: 'Artist login required' });
}

module.exports = { requireAdmin, requireArtist, buildAdminToken, getCookie, verifySignedCookie };
