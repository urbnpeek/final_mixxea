/**
 * db.js — Async data store
 * Primary:  Upstash Redis REST API — works with both Vercel native KV env vars
 *           (KV_REST_API_URL / KV_REST_API_TOKEN) and Upstash marketplace env vars
 *           (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN)
 * Fallback: local JSON files — used in local dev when Redis is not configured
 */

const fs   = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
try {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (e) {}

const DEFAULTS = {
  releases: [],
  artists: [],
  demos: [],
  bookings: [],
  events: [],
  newsletter: { subscribers: [], campaigns: [] },
  contactMessages: [],
  news: [],
  royalties: [],
  promoters: [],
  contracts: [],
  artistPortalUsers: [],
};

// ── Upstash Redis REST API ─────────────────────────────────────────────────────
// Supports both naming conventions:
//   Vercel native KV:      KV_REST_API_URL / KV_REST_API_TOKEN
//   Upstash marketplace:   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN

function getRedisConfig() {
  return {
    url:   process.env.KV_REST_API_URL        || process.env.UPSTASH_REDIS_REST_URL   || '',
    token: process.env.KV_REST_API_TOKEN      || process.env.UPSTASH_REDIS_REST_TOKEN || '',
  };
}

function isRedisConfigured() {
  const { url, token } = getRedisConfig();
  return Boolean(url && token);
}

async function redisGet(collection) {
  const { url, token } = getRedisConfig();
  const key = 'db:' + collection;
  const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: 'Bearer ' + token }
  });
  if (!res.ok) throw new Error('Redis GET failed: ' + res.status);
  const json = await res.json();
  if (json.result === null || json.result === undefined) return null;
  try { return JSON.parse(json.result); } catch { return json.result; }
}

async function redisSet(collection, data) {
  const { url, token } = getRedisConfig();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(['SET', 'db:' + collection, JSON.stringify(data)])
  });
  if (!res.ok) throw new Error('Redis SET failed: ' + res.status);
}

// ── Local file helpers ────────────────────────────────────────────────────────

function localGet(collection) {
  const file = path.join(DATA_DIR, `${collection}.json`);
  if (!fs.existsSync(file)) {
    const def = DEFAULTS[collection];
    if (def) { localSet(collection, def); return def; }
    return Array.isArray(DEFAULTS[collection]) ? [] : {};
  }
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { return DEFAULTS[collection] || []; }
}

function localSet(collection, data) {
  try {
    const file = path.join(DATA_DIR, `${collection}.json`);
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (e) {}
}

// ── Public API ────────────────────────────────────────────────────────────────

async function get(collection) {
  if (isRedisConfigured()) {
    try {
      const data = await redisGet(collection);
      if (data !== null) return data;
      const seed = DEFAULTS[collection] ?? [];
      await redisSet(collection, seed);
      return seed;
    } catch (e) {
      console.error('[DB] Redis get failed:', e.message);
      return localGet(collection);
    }
  }
  return localGet(collection);
}

async function set(collection, data) {
  if (isRedisConfigured()) {
    try {
      await redisSet(collection, data);
      return;
    } catch (e) {
      console.error('[DB] Redis set failed:', e.message);
    }
  }
  localSet(collection, data);
}

module.exports = { get, set, isRedisConfigured, getRedisConfig };
