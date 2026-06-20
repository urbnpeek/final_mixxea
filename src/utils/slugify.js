/**
 * slugify — converts any string into a URL-safe slug.
 * Strips accents, lowercases, collapses non-alphanumeric runs to hyphens.
 */
function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // strip combining diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

module.exports = slugify;
