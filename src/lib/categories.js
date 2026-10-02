/**
 * Fixed news categories. Slugs are the public URL segment.
 * Labels match the admin dropdown that already shipped.
 */

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
  return NEWS_CATEGORIES.find((cat) => cat.slug === lower || cat.label.toLowerCase() === lower) || null;
}

function categoryLabel(value) {
  const found = categoryByInput(value);
  return found ? found.label : String(value || '').trim();
}

module.exports = { NEWS_CATEGORIES, categoryByInput, categoryLabel };
