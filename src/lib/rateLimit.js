/**
 * Best-effort in-memory rate limiter (per function instance). Good enough to slow
 * down token guessing on public release links; tokens are 256-bit anyway.
 */
function createRateLimiter({ windowMs = 60_000, max = 30 } = {}) {
  const hits = new Map();
  return function rateLimit(req, res, next) {
    const now = Date.now();
    const ip = String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim() || 'unknown';
    let entry = hits.get(ip);
    if (!entry || entry.reset <= now) { entry = { count: 0, reset: now + windowMs }; hits.set(ip, entry); }
    entry.count += 1;
    if (hits.size > 5000) for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.reset - now) / 1000)));
      return res.status(429).json({ error: 'Too many requests. Please wait a minute and try again.' });
    }
    next();
  };
}

module.exports = { createRateLimiter };
