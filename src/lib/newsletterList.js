const CONSENT_VERSION = '2026-10-02';
const IMPORT_SOURCES = new Set(['import', 'csv', 'reimport', 'bulk']);

function normalizeNewsletter(value) {
  const data = value && typeof value === 'object' ? value : {};
  return {
    subscribers: Array.isArray(data.subscribers) ? data.subscribers.slice() : [],
    campaigns: Array.isArray(data.campaigns) ? data.campaigns.slice() : [],
    suppressions: Array.isArray(data.suppressions) ? data.suppressions.slice() : [],
  };
}

function isImportSource(source) {
  return IMPORT_SOURCES.has(String(source || '').trim().toLowerCase());
}

function addSubscriber(newsletter, { email, source = 'homepage', now = new Date().toISOString() } = {}) {
  const list = normalizeNewsletter(newsletter);
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized.includes('@')) return { newsletter: list, status: 'invalid' };
  if (list.subscribers.some((item) => item.email === normalized)) {
    return { newsletter: list, status: 'exists' };
  }
  const suppressed = list.suppressions.some((item) => item.email === normalized);
  if (suppressed && isImportSource(source)) {
    return { newsletter: list, status: 'suppressed' };
  }
  if (suppressed) {
    list.suppressions = list.suppressions.filter((item) => item.email !== normalized);
  }
  list.subscribers.push({
    email: normalized,
    joinedAt: now,
    source: String(source || 'homepage'),
    consentVersion: CONSENT_VERSION,
  });
  return { newsletter: list, status: 'added' };
}

function unsubscribeEmail(newsletter, email, now = new Date().toISOString()) {
  const list = normalizeNewsletter(newsletter);
  const normalized = String(email || '').trim().toLowerCase();
  const removed = list.subscribers.some((item) => item.email === normalized);
  list.subscribers = list.subscribers.filter((item) => item.email !== normalized);
  if (normalized.includes('@') && !list.suppressions.some((item) => item.email === normalized)) {
    list.suppressions.push({ email: normalized, unsubscribedAt: now });
  }
  return { newsletter: list, removed };
}

module.exports = {
  CONSENT_VERSION,
  normalizeNewsletter,
  isImportSource,
  addSubscriber,
  unsubscribeEmail,
};
