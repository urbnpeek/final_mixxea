/**
 * middleware.js — Shared Express middleware
 */

// Protect admin routes
function requireAdmin(req, res, next) {
  if (req.session && req.session.admin) return next();
  res.status(403).json({ error: 'Admin access required' });
}

// Protect artist portal routes
function requireArtist(req, res, next) {
  if (req.session && req.session.artistId) return next();
  res.status(403).json({ error: 'Artist login required' });
}

module.exports = { requireAdmin, requireArtist };
