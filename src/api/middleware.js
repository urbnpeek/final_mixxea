/**
 * middleware.js — Shared Express middleware
 */
const crypto = require('crypto');
const { sessionSecret } = require('../lib/sessionSecret');

const SECRET = () => sessionSecret();

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

function signValue(value) {
  return crypto.createHmac('sha256', SECRET()).update(value).digest('base64url');
}

function verifySignedCookie(token) {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot < 0) return null;
  const value = token.substring(0, dot);
  const sig = token.substring(dot + 1);
  const expected = signValue(value);
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null;
  return value;
}

function buildAdminToken() {
  const value = 'admin:1';
  return `${value}.${signValue(value)}`;
}

function buildStaffToken(id, role) {
  const value = `staff:${id}:${role}`;
  return `${value}.${signValue(value)}`;
}

function buildPreviewToken(kind, id) {
  const exp = Date.now() + (1000 * 60 * 60 * 24);
  const value = `preview:${kind}:${id}:${exp}`;
  return `${value}.${signValue(value)}`;
}

function verifyPreviewToken(token, kind, id) {
  const value = verifySignedCookie(token);
  if (!value) return false;
  const parts = value.split(':');
  if (parts.length !== 4) return false;
  const [prefix, tokenKind, tokenId, exp] = parts;
  if (prefix !== 'preview' || tokenKind !== kind || tokenId !== id) return false;
  const expires = Number(exp);
  return Number.isFinite(expires) && expires > Date.now();
}

function tokenHash(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function actorFromSessionOrCookie(req) {
  if (req.session && req.session.admin) {
    const role = req.session.role === 'editor' ? 'editor' : 'admin';
    return {
      role,
      id: req.session.staffId || 'env',
      name: req.session.staffName || 'Admin',
      email: req.session.adminEmail || '',
      source: 'session',
    };
  }
  const value = verifySignedCookie(getCookie(req, 'mixxea_auth'));
  if (value === 'admin:1') {
    return { role: 'admin', id: 'env', name: 'Admin', email: '', source: 'cookie' };
  }
  if (value && value.startsWith('staff:')) {
    const parts = value.split(':');
    if (parts.length === 3 && (parts[2] === 'admin' || parts[2] === 'editor')) {
      return { role: parts[2], id: parts[1], name: '', email: '', source: 'cookie' };
    }
  }
  return null;
}

async function actorFromBearer(req) {
  const header = String(req.headers.authorization || '');
  const match = header.match(/^Bearer\s+(\S+)$/i);
  if (!match) return null;
  const hash = tokenHash(match[1]);
  const store = require('../lib/contentStore');
  const people = await store.list('staff');
  if (!people) return null;
  for (const person of people) {
    if (!person || person.active === false) continue;
    for (const token of person.apiTokens || []) {
      if (!token || !token.hash || token.hash.length !== hash.length) continue;
      const left = Buffer.from(token.hash);
      const right = Buffer.from(hash);
      if (left.length === right.length && crypto.timingSafeEqual(left, right)) {
        return {
          role: person.role === 'editor' ? 'editor' : 'admin',
          id: person.id,
          name: person.name || '',
          email: person.email || '',
          source: 'token',
          tokenId: token.id,
        };
      }
    }
  }
  return null;
}

async function resolveActor(req) {
  if (req.actor) return req.actor;
  const preliminary = actorFromSessionOrCookie(req);
  if (preliminary && preliminary.id && preliminary.id !== 'env' && preliminary.source !== 'token') {
    const store = require('../lib/contentStore');
    const person = await store.getById('staff', preliminary.id);
    if (!person || person.active === false) return null;
    return {
      role: person.role === 'editor' ? 'editor' : 'admin',
      id: person.id,
      name: person.name || preliminary.name || '',
      email: person.email || preliminary.email || '',
      source: preliminary.source,
    };
  }
  if (preliminary) return preliminary;
  return actorFromBearer(req);
}

function isStaffActor(actor) {
  return Boolean(actor && (actor.role === 'admin' || actor.role === 'editor'));
}

async function requireStaff(req, res, next) {
  try {
    const actor = await resolveActor(req);
    if (!isStaffActor(actor)) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    req.actor = actor;
    next();
  } catch (error) {
    next(error);
  }
}

async function requireAdmin(req, res, next) {
  try {
    const actor = await resolveActor(req);
    if (!actor || actor.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    req.actor = actor;
    next();
  } catch (error) {
    next(error);
  }
}

function requireArtist(req, res, next) {
  if (req.session && req.session.artistId) return next();
  res.status(403).json({ error: 'Artist login required' });
}

module.exports = {
  requireAdmin,
  requireStaff,
  requireArtist,
  buildAdminToken,
  buildStaffToken,
  buildPreviewToken,
  verifyPreviewToken,
  getCookie,
  verifySignedCookie,
  resolveActor,
  isStaffActor,
  tokenHash,
};
