/**
 * Signing secret for the session cookie, the admin cookie, and DJ-pool download URLs.
 * Production must not use the hard-coded development fallback.
 */
const crypto = require('crypto');

const DEV_SECRET = 'mixxea-dev-secret';
let ephemeral = '';
let warned = false;

function productionRuntime() {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
}

function sessionSecret() {
  const configured = process.env.SESSION_SECRET;
  if (configured) return configured;
  if (!productionRuntime()) return DEV_SECRET;
  if (!ephemeral) {
    ephemeral = crypto.randomBytes(32).toString('hex');
  }
  if (!warned) {
    warned = true;
    console.error('[SESSION] SESSION_SECRET is not set. Refusing the hard-coded fallback. This process will sign cookies with a temporary secret, so existing sessions are logged out and new ones will not work on another instance. Set SESSION_SECRET.');
  }
  return ephemeral;
}

module.exports = { sessionSecret };
