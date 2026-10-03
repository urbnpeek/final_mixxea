/**
 * Cache-bust immutable static files. Vercel sets VERCEL_GIT_COMMIT_SHA.
 * Locally we use the short git revision, then "dev".
 */

const { execFileSync } = require('child_process');
const path = require('path');

function buildId() {
  const sha = String(process.env.VERCEL_GIT_COMMIT_SHA || '').trim();
  if (/^[0-9a-f]{7,}$/i.test(sha)) return sha.slice(0, 7);
  try {
    const short = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: path.join(__dirname, '../..'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (short) return short;
  } catch (e) { /* no git */ }
  return 'dev';
}

const BUILD_ID = buildId();

function asset(url) {
  const value = String(url || '');
  if (!value.startsWith('/') || value.startsWith('//')) return value;
  const hashAt = value.indexOf('#');
  const base = hashAt === -1 ? value : value.slice(0, hashAt);
  const frag = hashAt === -1 ? '' : value.slice(hashAt);
  const next = /[?&]v=/.test(base)
    ? base.replace(/([?&]v=)[^&]*/, `$1${BUILD_ID}`)
    : `${base}${base.includes('?') ? '&' : '?'}v=${BUILD_ID}`;
  return next + frag;
}

function versionHtml(html) {
  // Fonts and image srcsets stay unversioned so a preload matches the CSS or img URL.
  return String(html)
    .replace(/(\s(?:href|src)=")(\/(?:css|js)\/[^"]+)(")/g, (match, start, url, end) => start + asset(url) + end);
}

module.exports = { BUILD_ID, asset, versionHtml };
