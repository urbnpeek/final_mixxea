/**
 * Bot checks for public form posts. Order is fixed and runs before any
 * database write or email:
 * honeypot, minimum time on page, per-IP rate limit, Cloudflare Turnstile.
 */

const rateLimit = require('./rateLimit');

const TEST_SITEKEY = '1x00000000000000000000AA';
const TEST_SECRET = '1x0000000000000000000000000000000AA';
const MIN_MS = 3 * 1000;
const MAX_MS = 24 * 60 * 60 * 1000;
const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

const ERRORS = {
  generic: 'Could not submit the form. Check the fields and try again.',
  turnstile: 'Complete the verification and try again.',
  rate: 'Too many submissions. Try again in a minute.',
  unconfigured: 'Form protection is not configured.',
  unavailable: 'Form protection is unavailable. Try again shortly.',
};

let siteverify = defaultSiteverify;

function isProductionDeployment() {
  if (process.env.VERCEL_ENV === 'production') return true;
  if (process.env.VERCEL_ENV === 'preview' || process.env.VERCEL_ENV === 'development') return false;
  return process.env.NODE_ENV === 'production';
}

function configuredKey(name) {
  return String(process.env[name] || '').trim();
}

/**
 * Live keys when both are set. Production with either key missing fails closed.
 * Preview and local dev, when either key is unset, use Cloudflare's always-pass
 * test pair so the widget and siteverify match.
 */
function resolveTurnstile() {
  const siteKey = configuredKey('TURNSTILE_SITE_KEY');
  const secret = configuredKey('TURNSTILE_SECRET_KEY');
  if (siteKey && secret) return { siteKey, secret, mode: 'live' };
  if (!isProductionDeployment()) {
    return { siteKey: TEST_SITEKEY, secret: TEST_SECRET, mode: 'test' };
  }
  return { siteKey, secret, mode: 'missing' };
}

function clientIp(req) {
  const raw = String((req && (req.ip || (req.socket && req.socket.remoteAddress))) || '').trim();
  return raw.replace(/^::ffff:/, '') || 'unknown';
}

function honeypotValueFilled(value) {
  if (value == null) return false;
  if (Array.isArray(value)) return value.some((item) => honeypotValueFilled(item));
  return String(value).length > 0;
}

function honeypotTripped(body) {
  if (!body || typeof body !== 'object') return false;
  return honeypotValueFilled(body.company_url);
}

function timingAccepts(value, now) {
  if (value == null || value === '') return false;
  if (typeof value === 'boolean' || Array.isArray(value) || typeof value === 'object') return false;
  const started = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(started)) return false;
  const age = now - started;
  return age >= MIN_MS && age <= MAX_MS;
}

function readTurnstileToken(body) {
  if (!body || typeof body !== 'object') return '';
  const candidates = [body['cf-turnstile-response'], body.turnstileToken, body.token];
  for (const value of candidates) {
    if (value == null || Array.isArray(value) || typeof value === 'object') continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
}

async function defaultSiteverify({ secret, response, remoteip }) {
  const body = new URLSearchParams();
  body.set('secret', secret);
  body.set('response', response);
  if (remoteip) body.set('remoteip', remoteip);
  const res = await fetch(SITEVERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error('siteverify HTTP ' + res.status);
  return res.json();
}

function setSiteverify(fn) {
  siteverify = typeof fn === 'function' ? fn : defaultSiteverify;
}

async function verifyTurnstile(token, ip) {
  const cfg = resolveTurnstile();
  if (!cfg.secret) {
    console.error('[turnstile] TURNSTILE_SECRET_KEY is not set; refusing submission');
    return { ok: false, status: 503, error: ERRORS.unconfigured };
  }
  if (!token) return { ok: false, status: 400, error: ERRORS.turnstile };
  let payload;
  try {
    payload = await siteverify({ secret: cfg.secret, response: token, remoteip: ip });
  } catch (error) {
    console.error('[turnstile] siteverify failed', error && error.message ? error.message : error);
    return { ok: false, status: 503, error: ERRORS.unavailable };
  }
  if (!payload || payload.success !== true) {
    const codes = payload && payload['error-codes'] ? payload['error-codes'] : [];
    console.error('[turnstile] siteverify rejected', Array.isArray(codes) ? codes.join(',') : '');
    return { ok: false, status: 400, error: ERRORS.turnstile };
  }
  return { ok: true };
}

function send(res, status, error) {
  if (status === 429) res.set('Retry-After', '60');
  res.status(status).json({ error });
  return false;
}

async function guardSubmission(req, res, bucket) {
  const body = req.body || {};
  if (honeypotTripped(body)) {
    console.info('[form-guard] rejected', bucket, 'honeypot');
    return send(res, 400, ERRORS.generic);
  }
  if (!timingAccepts(body.form_started_at, Date.now())) {
    console.info('[form-guard] rejected', bucket, 'timing');
    return send(res, 400, ERRORS.generic);
  }
  let count;
  try {
    count = await rateLimit.consume(bucket, clientIp(req));
  } catch (error) {
    console.error('[ratelimit] ' + bucket + ' failed', error && error.message ? error.message : error);
    return send(res, 503, ERRORS.unavailable);
  }
  if (count > rateLimit.LIMIT) {
    console.info('[form-guard] rejected', bucket, 'rate');
    return send(res, 429, ERRORS.rate);
  }
  const verdict = await verifyTurnstile(readTurnstileToken(body), clientIp(req));
  if (!verdict.ok) {
    console.info('[form-guard] rejected', bucket, 'turnstile', verdict.status);
    return send(res, verdict.status, verdict.error);
  }
  return true;
}

module.exports = {
  TEST_SITEKEY,
  TEST_SECRET,
  MIN_MS,
  MAX_MS,
  ERRORS,
  isProductionDeployment,
  resolveTurnstile,
  clientIp,
  honeypotTripped,
  timingAccepts,
  readTurnstileToken,
  verifyTurnstile,
  guardSubmission,
  setSiteverify,
};
