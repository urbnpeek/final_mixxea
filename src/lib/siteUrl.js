/**
 * Preferred public origin. Live redirects already send apex to www.
 * An explicit CANONICAL_BASE_URL of https://mixxea.com is rewritten to www
 * so sitemap, canonical, and robots stay on the host that serves the site.
 */
const DEFAULT_ORIGIN = 'https://www.mixxea.com';

function canonicalOrigin() {
  const raw = String(process.env.CANONICAL_BASE_URL || DEFAULT_ORIGIN).trim();
  let url;
  try {
    url = new URL(raw);
  } catch {
    return DEFAULT_ORIGIN;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return DEFAULT_ORIGIN;
  if (url.hostname === 'mixxea.com') url.hostname = 'www.mixxea.com';
  return url.origin;
}

module.exports = { canonicalOrigin, DEFAULT_ORIGIN };
