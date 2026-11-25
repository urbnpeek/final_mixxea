/**
 * Example data for DB_MODE=memory (preview deployments only). Clearly labelled
 * fake records so the demo-approval and release-form flow can be clicked through
 * without touching production Redis. PREVIEW_RELEASE_TOKEN (set at deploy time)
 * becomes a working /release/<token> link for the approved example demo.
 */
const { hashToken } = require('./releaseLink');

function seedFor(collection, env = process.env) {
  if (collection !== 'demos') return undefined;
  const now = Date.now();
  const token = env.PREVIEW_RELEASE_TOKEN;
  const approved = {
    id: 'preview-demo-approved',
    artistName: 'Example Artist (preview)',
    realName: 'Example Person',
    email: 'artist@example.invalid',
    country: 'Romania',
    trackTitle: 'Example Track',
    version: 'Original Mix',
    genre: 'Tech House',
    bpm: 126,
    musKey: 'A minor',
    submittedAt: new Date(now - 3 * 86400000).toISOString(),
    status: 'approved',
    release: token && /^[A-Za-z0-9_-]{43}$/.test(token) ? {
      tokenHash: hashToken(token),
      expiresAt: new Date(now + 30 * 86400000).toISOString(),
      linkSentAt: new Date(now - 86400000).toISOString(),
      linkSentCount: 1,
      emailedTo: 'artist@example.invalid',
    } : undefined,
  };
  const fresh = {
    id: 'preview-demo-new',
    artistName: 'Second Example (preview)',
    realName: '',
    email: 'second@example.invalid',
    country: 'Germany',
    trackTitle: 'Another Example',
    version: 'Extended Mix',
    genre: 'Melodic Techno',
    bpm: 122,
    submittedAt: new Date(now - 86400000).toISOString(),
    status: 'new',
  };
  return [approved, fresh];
}

module.exports = { seedFor };
