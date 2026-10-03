/**
 * CSP script hashes for static inline scripts. Computed once at startup from
 * the exact script bodies that are served, so a cached HTML response and its
 * Content-Security-Policy header stay in step without a per-request nonce.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function hashSource(source) {
  const digest = crypto.createHash('sha256').update(String(source), 'utf8').digest('base64');
  return `'sha256-${digest}'`;
}

function bodiesFromHtml(html) {
  const out = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(String(html)))) {
    const attrs = match[1] || '';
    if (/\bsrc\s*=/i.test(attrs)) continue;
    if (/type\s*=\s*["']application\/(?:ld\+json|json)["']/i.test(attrs)) continue;
    out.push(match[2]);
  }
  return out;
}

function walkHtml(dir, found) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walkHtml(full, found);
    else if (name.endsWith('.html')) found.push(fs.readFileSync(full, 'utf8'));
  }
}

function collectScriptHashes() {
  const pages = require('../render/publicPages');
  const sources = new Set();
  const files = [];
  walkHtml(path.join(__dirname, '../../public'), files);
  files.forEach((html) => {
    bodiesFromHtml(html).forEach((body) => sources.add(body));
  });
  bodiesFromHtml(pages.trackingHead()).forEach((body) => sources.add(body));
  [
    '<script>document.documentElement.classList.add("js")</script>',
    "<script>document.documentElement.classList.add('js')</script>",
  ].forEach((html) => bodiesFromHtml(html).forEach((body) => sources.add(body)));
  return [...sources].map(hashSource);
}

const SCRIPT_HASHES = collectScriptHashes();

module.exports = { hashSource, bodiesFromHtml, SCRIPT_HASHES };
