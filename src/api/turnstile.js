/**
 * Public Turnstile site key. The secret never leaves the server.
 */
const express = require('express');
const { resolveTurnstile, ERRORS } = require('../lib/formGuard');

const router = express.Router();

router.get('/sitekey', (req, res) => {
  const cfg = resolveTurnstile();
  res.set('Cache-Control', 'no-store');
  if (!cfg.siteKey || !cfg.secret) {
    return res.status(503).json({ error: ERRORS.unconfigured });
  }
  return res.json({ siteKey: cfg.siteKey });
});

module.exports = router;
