/**
 * News categories. The editor still stores the five legacy slugs.
 * Public pages resolve those through publicCategory(), which is the
 * same map transform() writes during preview and migration.
 */

const { CATEGORIES, canonicalCategorySlug } = require('./redesignData');

const NEWS_CATEGORIES = [
  { slug: 'release-news', label: 'Release News' },
  { slug: 'artist-news', label: 'Artist News' },
  { slug: 'label-news', label: 'Label News' },
  { slug: 'events', label: 'Events' },
  { slug: 'freqvault', label: 'FreqVault' },
];

function categoryByInput(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  const cms = NEWS_CATEGORIES.find((cat) => cat.slug === lower || cat.label.toLowerCase() === lower);
  if (cms) return { ...cms, name: cms.label, accent: canonicalCategorySlug(cms.slug) === 'agency' ? 'agency' : 'label' };
  const spec = CATEGORIES.find((cat) => cat.slug === lower || String(cat.name || '').toLowerCase() === lower);
  if (!spec) return null;
  return { ...spec, label: spec.name };
}

function publicCategory(value) {
  const slug = canonicalCategorySlug(value);
  if (!slug) return null;
  const spec = CATEGORIES.find((cat) => cat.slug === slug);
  if (!spec) return null;
  return { ...spec, label: spec.name };
}

function categoryLabel(value) {
  const found = publicCategory(value) || categoryByInput(value);
  return found ? (found.label || found.name) : String(value || '').trim();
}

function categoryAccent(value) {
  const found = publicCategory(value);
  return found && found.accent === 'agency' ? 'sig' : 'acid';
}

module.exports = {
  NEWS_CATEGORIES,
  categoryByInput,
  publicCategory,
  categoryLabel,
  categoryAccent,
};
