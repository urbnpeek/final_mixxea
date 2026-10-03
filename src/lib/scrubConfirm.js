/**
 * Removes internal [CONFIRM] markers from text that can be shown on the site.
 * The marker is an editorial note, not catalogue copy.
 */
const MARKER = /\s*\[CONFIRM(?:-[A-Z0-9]+)?\]/gi;

function scrubConfirm(value) {
  if (typeof value === 'string') {
    return value.replace(MARKER, ' ').replace(/[ \t]{2,}/g, ' ').trim();
  }
  if (Array.isArray(value)) return value.map(scrubConfirm);
  if (value && typeof value === 'object') {
    const next = {};
    for (const key of Object.keys(value)) next[key] = scrubConfirm(value[key]);
    return next;
  }
  return value;
}

module.exports = { scrubConfirm };
