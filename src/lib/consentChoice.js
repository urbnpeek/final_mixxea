/**
 * Cookie-choice lifetime. A stored choice lasts 12 months from its timestamp.
 * A missing or invalid timestamp is treated as no choice.
 */
const CONSENT_MONTHS = 12;

function consentExpiry(at, now) {
  const then = new Date(at);
  const current = now instanceof Date ? now : new Date(now);
  if (!at || Number.isNaN(then.getTime()) || Number.isNaN(current.getTime())) return null;
  const limit = new Date(then.getTime());
  limit.setMonth(limit.getMonth() + CONSENT_MONTHS);
  return limit;
}

function isConsentFresh(saved, now = new Date()) {
  if (!saved || saved.v !== 1) return false;
  const limit = consentExpiry(saved.at, now);
  if (!limit) return false;
  const current = now instanceof Date ? now : new Date(now);
  return current.getTime() < limit.getTime();
}

function stampConsent(choice, now = new Date()) {
  const current = now instanceof Date ? now : new Date(now);
  return {
    v: 1,
    analytics: !!(choice && choice.analytics),
    marketing: !!(choice && choice.marketing),
    at: current.toISOString(),
  };
}

module.exports = { CONSENT_MONTHS, consentExpiry, isConsentFresh, stampConsent };
