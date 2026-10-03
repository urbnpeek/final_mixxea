/**
 * 12-month cookie choice. Run: node test/consent-choice.js
 */
const { isConsentFresh, stampConsent } = require('../src/lib/consentChoice');

function assert(condition, message) {
  if (!condition) {
    const error = new Error(message);
    error.name = 'AssertionError';
    throw error;
  }
}

const now = new Date('2026-10-02T12:00:00.000Z');
const fresh = stampConsent({ analytics: true, marketing: false }, now);
assert(fresh.v === 1 && fresh.at === now.toISOString(), JSON.stringify(fresh));
assert(isConsentFresh(fresh, now), 'just stamped');
assert(isConsentFresh(fresh, new Date('2027-09-01T00:00:00.000Z')), 'inside 12 months');
assert(!isConsentFresh(fresh, new Date('2027-10-02T12:00:00.000Z')), 'exactly 12 months is expired');
assert(!isConsentFresh({ v: 1, analytics: true, marketing: true }, now), 'missing timestamp');
assert(!isConsentFresh({ v: 1, analytics: true, at: 'not-a-date' }, now), 'bad timestamp');
assert(!isConsentFresh(null, now), 'empty');

console.log('ok  consent expiry');
