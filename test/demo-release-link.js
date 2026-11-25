/**
 * Approved demo -> release-details link: token, expiry, validation, routes, email routing.
 * DB_MODE=memory, no Redis, no Blob, no Resend. Run: node test/demo-release-link.js
 */
const http = require('http');

process.env.DB_MODE = 'memory';
process.env.ADMIN_LOGIN_EMAIL = 'fuad@example.test';
process.env.ADMIN_PASSWORD = 'correct-horse';
process.env.SESSION_SECRET = 'release-link-secret';
process.env.PUBLIC_APP_URL = 'https://www.mixxea.com';
process.env.DEMO_NOTIFY_EMAILS = 'ar@example.test';
delete process.env.VERCEL_ENV;
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
delete process.env.BLOB_READ_WRITE_TOKEN;
delete process.env.RESEND_API_KEY;
delete process.env.EMAIL_MODE;

// Stub Vercel Blob so the storage-enabled path runs offline (no network, no real store).
const blobStub = {
  calls: [],
  head: async (url) => ({ url: String(url), pathname: String(url).replace(/^https:\/\/[^/]+\//, ''), size: 123456789, contentType: 'audio/wav' }),
  handleUpload: async ({ body, onBeforeGenerateToken }) => {
    const opts = await onBeforeGenerateToken(body.payload.pathname, body.payload.clientPayload, false);
    blobStub.calls.push(opts);
    return { type: 'blob.generate-client-token', clientToken: 'stub-client-token' };
  },
};
require.cache[require.resolve('@vercel/blob')] = { id: 'blob', filename: 'blob', loaded: true, exports: { ...require('@vercel/blob'), head: blobStub.head } };
require.cache[require.resolve('@vercel/blob/client')] = { id: 'blobc', filename: 'blobc', loaded: true, exports: { handleUpload: blobStub.handleUpload } };

const link = require('../src/lib/releaseLink');
const emailService = require('../src/api/emailService');
const db = require('../src/api/db');

function assert(condition, message) {
  if (!condition) { const e = new Error(message); e.name = 'AssertionError'; throw e; }
}
function ok(name) { console.log('ok  ' + name); }

function request(port, method, urlPath, { body, cookie } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = {};
    if (payload) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = Buffer.byteLength(payload); }
    if (cookie) headers.Cookie = cookie;
    const req = http.request({ hostname: '127.0.0.1', port, path: urlPath, method, headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json = null; try { json = JSON.parse(text); } catch { json = null; }
        resolve({ status: res.statusCode, headers: res.headers, body: text, json });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const DEMO = { id: 'd-1', artistName: 'Example Artist', realName: 'Example Person', email: 'artist@example.test', trackTitle: 'Example Track', status: 'approved' };
const goodBody = () => ({
  legalName: 'Example Person', artistName: 'Example Artist', email: 'artist@example.test', phone: '+40 700 000 000', country: 'Romania',
  trackTitle: 'Example Track', version: 'Original Mix', isrc: 'RO-ABC-26-00001', bpm: '126',
  credits: [{ name: 'Example Person', role: 'writer_producer', share: '60' }, { name: 'Co Writer', role: 'writer', share: '40' }],
  wav: { pathname: 'private/releases/d-1/wav-master-AbC123.wav', url: 'https://abc.private.blob.vercel-storage.com/private/releases/d-1/wav-master-AbC123.wav', size: 120000000, name: 'master.wav' },
  confirm: true,
});

(async () => {
  // ── token ──
  const a = link.createReleaseLink(new Date('2026-11-25T12:00:00Z'));
  const b = link.createReleaseLink(new Date('2026-11-25T12:00:00Z'));
  assert(/^[A-Za-z0-9_-]{43}$/.test(a.token), 'token is 256-bit base64url');
  assert(a.token !== b.token && a.tokenHash !== b.tokenHash, 'tokens are unique');
  assert(a.tokenHash === link.hashToken(a.token) && !a.tokenHash.includes(a.token), 'only the hash is stored');
  assert(a.expiresAt === '2026-12-25T12:00:00.000Z', 'default expiry 30 days: ' + a.expiresAt);
  assert(link.ttlDays({ RELEASE_LINK_TTL_DAYS: '14' }) === 14 && link.ttlDays({ RELEASE_LINK_TTL_DAYS: '999' }) === 30, 'TTL env bounds');
  ok('token: random, hashed, 30-day expiry');

  const demos = [{ ...DEMO, release: { tokenHash: a.tokenHash, expiresAt: a.expiresAt } }];
  assert(link.findDemoByToken(demos, a.token, new Date('2026-12-01T00:00:00Z')).demo.id === 'd-1', 'valid token finds demo');
  assert(link.findDemoByToken(demos, b.token, new Date('2026-12-01T00:00:00Z')).error === 'invalid', 'other token invalid');
  assert(link.findDemoByToken(demos, 'short', new Date()).error === 'invalid', 'malformed token invalid');
  assert(link.findDemoByToken(demos, a.token, new Date('2026-12-25T12:00:01Z')).error === 'expired', 'expired after expiry');
  assert(link.findDemoByToken([{ ...demos[0], status: 'declined' }], a.token, new Date('2026-12-01T00:00:00Z')).error === 'revoked', 'not approved -> revoked');
  ok('token lookup: valid / invalid / expired / revoked');

  const pres = link.presentRelease({ id: 'd-1', release: { tokenHash: 'x', linkSentAt: '2026-11-25T00:00:00Z', wav: { pathname: 'p', url: 'u', size: 1 } } });
  assert(!('tokenHash' in pres) && pres.wav.href === '/api/demos/d-1/release-file/wav' && !pres.wav.url, 'admin view hides hash and raw blob url');
  ok('admin presentation hides token hash');

  // ── validation ──
  const v = link.validateReleaseSubmission(goodBody(), DEMO);
  assert(v.ok, JSON.stringify(v.errors));
  assert(v.details.isrc === 'ROABC2600001' && v.details.credits.length === 2 && v.details.bpm === 126, 'normalised');
  const bad = link.validateReleaseSubmission({ ...goodBody(), email: 'x', legalName: '', isrc: 'NOPE', bpm: '999', confirm: false,
    credits: [{ name: 'A', role: 'writer', share: '50' }], wav: { pathname: 'private/releases/OTHER/wav-x.wav' } }, DEMO);
  assert(!bad.ok && ['email', 'legalName', 'isrc', 'bpm', 'confirm', 'credits', 'wav'].every((k) => bad.errors[k]), JSON.stringify(bad.errors));
  assert(/100%/.test(bad.errors.credits), 'split must total 100');
  assert(!link.validateReleaseSubmission({ ...goodBody(), wav: null }, DEMO).ok, 'WAV required');
  assert(link.validateReleaseSubmission({ ...goodBody(), wav: { ...goodBody().wav, pathname: 'private/releases/d-1/wav-master.mp3' } }, DEMO).errors.wav, '.wav only');
  assert(link.validateReleaseSubmission({ ...goodBody(), wav: { ...goodBody().wav, size: 600 * 1048576 } }, DEMO).errors.wav, '500 MB cap');
  assert(link.validateReleaseSubmission({ ...goodBody(), wav: { ...goodBody().wav, url: 'https://evil.example/x.wav' } }, DEMO).errors.wav, 'storage host only');
  assert(link.checkUploadPath('d-1', 'private/releases/d-1/../d-2/wav-a.wav', 'wav'), 'no path traversal');
  assert(link.checkUploadPath('d-1', 'private/releases/d-1/artwork-cover.png', 'artwork') === null, 'artwork png ok');
  ok('validation: required fields, splits, ISRC, BPM, WAV-only, size, paths');

  // ── email routing (never the artist outside production) ──
  assert(emailService.artistEmailRouting('artist@example.test', { VERCEL_ENV: 'production' }).mode === 'live', 'prod live');
  const r1 = emailService.artistEmailRouting('artist@example.test', { VERCEL_ENV: 'preview' });
  assert(r1.mode === 'redirected' && r1.to.join() === 'ar@example.test', 'preview -> A&R list');
  assert(emailService.artistEmailRouting('artist@example.test', { VERCEL_ENV: 'production', EMAIL_MODE: 'log' }).mode === 'log', 'EMAIL_MODE=log');
  const html = emailService.renderDemoApproval({ artistName: '<b>x</b>', trackTitle: 'T', url: 'https://www.mixxea.com/release/abc', expiresAt: a.expiresAt });
  assert(!html.includes('<b>x</b>') && html.includes('&lt;b&gt;x&lt;/b&gt;'), 'artist name escaped');
  assert(html.includes('Mixxea Records is a label of Freq Grup SRL') && html.includes('https://www.mixxea.com/release/abc'), 'footer + link');
  assert(!/licen[cs]e|collecting society|PRO\b/i.test(html), 'no licence / collecting-society claims');
  ok('email: routing gate, escaping, footer, no licence claims');

  // ── routes ──
  const app = require('../server');
  const server = await new Promise((resolve) => { const h = app.listen(0, '127.0.0.1', () => resolve(h)); });
  const port = server.address().port;
  try {
    const seeded = [
      { id: 'd-1', artistName: 'Example Artist', realName: 'Example Person', email: 'artist@example.test', trackTitle: 'Example Track', status: 'new', submittedAt: new Date().toISOString() },
    ];
    await db.set('demos', seeded);

    const anon = await request(port, 'POST', '/api/demos/d-1/approve', { body: {} });
    assert(anon.status === 403, 'approve needs admin: ' + anon.status);

    const login = await request(port, 'POST', '/api/auth/admin/login', { body: { email: 'fuad@example.test', password: 'correct-horse' } });
    assert(login.status === 200, login.body);
    const cookie = (Array.isArray(login.headers['set-cookie']) ? login.headers['set-cookie'] : [login.headers['set-cookie']]).find((c) => c.startsWith('mixxea_auth=')).split(';')[0];

    const appr = await request(port, 'POST', '/api/demos/d-1/approve', { body: {}, cookie });
    assert(appr.status === 200 && appr.json.demo.status === 'approved', appr.body);
    assert(appr.json.email.ok && appr.json.email.mode === 'redirected', 'local run redirects to A&R: ' + JSON.stringify(appr.json.email));
    assert(!JSON.stringify(appr.json).includes('tokenHash'), 'no hash in admin response');
    assert(appr.json.demo.release.progress.linkSent === true, 'link sent recorded');
    ok('admin approve: status, link, email gated, progress');

    // capture a token the way the artist gets it: issue one directly and store the hash
    const issued = link.createReleaseLink();
    const all = await db.getRaw('demos');
    all[0].release = { ...all[0].release, tokenHash: issued.tokenHash, expiresAt: issued.expiresAt };
    await db.set('demos', all);

    const page = await request(port, 'GET', '/release/' + issued.token);
    assert(page.status === 200 && /noindex/.test(page.headers['x-robots-tag']) && page.headers['referrer-policy'] === 'no-referrer', 'page noindex + no-referrer');
    assert(!/googletagmanager|fbevents/.test(page.body), 'no analytics on token page');
    const csp = page.headers['content-security-policy'] || '';
    assert(csp.includes('https://vercel.com') && csp.includes('blob.vercel-storage.com'), 'CSP allows direct upload');

    const info = await request(port, 'GET', '/api/release/' + issued.token);
    assert(info.status === 200 && info.json.trackTitle === 'Example Track' && info.json.uploadsEnabled === false, info.body);
    assert(!('tokenHash' in info.json) && !('adminNotes' in info.json), 'prefill only');

    const bogus = await request(port, 'GET', '/api/release/' + link.createReleaseLink().token);
    assert(bogus.status === 404, 'unknown token 404');

    const up = await request(port, 'POST', '/api/release/' + issued.token + '/upload', { body: { type: 'blob.generate-client-token', payload: { pathname: 'private/releases/d-1/wav-a.wav' } } });
    assert(up.status === 503, 'no storage -> 503: ' + up.status);

    const sub = await request(port, 'POST', '/api/release/' + issued.token, { body: goodBody() });
    assert(sub.status === 503, 'without storage the submit is refused: ' + sub.status);
    const subBad = await request(port, 'POST', '/api/release/' + issued.token, { body: { ...goodBody(), credits: [] } });
    assert(subBad.status === 400 && subBad.json.errors.credits, 'server-side validation');

    // expiry on the route
    const exp = await db.getRaw('demos');
    exp[0].release.expiresAt = new Date(Date.now() - 1000).toISOString();
    await db.set('demos', exp);
    const gone = await request(port, 'GET', '/api/release/' + issued.token);
    assert(gone.status === 410 && gone.json.code === 'expired', 'expired link 410');

    // resend issues a new link and kills the old one
    const resend = await request(port, 'POST', '/api/demos/d-1/release-link', { body: {}, cookie });
    assert(resend.status === 200 && resend.json.demo.release.progress.linkSentCount === 2, resend.body);
    const old = await request(port, 'GET', '/api/release/' + issued.token);
    assert(old.status === 404, 'old token no longer works');

    const file = await request(port, 'GET', '/api/demos/d-1/release-file/wav');
    assert(file.status === 401, 'file download needs sign-in');
    ok('routes: page headers, prefill, 404/410, storage gate, validation, resend, file auth');

    // storage enabled (stubbed): upload handshake + submit + A&R notification + admin view
    process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_stub_only';
    const fresh = link.createReleaseLink();
    const cur = await db.getRaw('demos');
    cur[0].release = { ...cur[0].release, tokenHash: fresh.tokenHash, expiresAt: fresh.expiresAt };
    await db.set('demos', cur);
    const wrongPath = await request(port, 'POST', '/api/release/' + fresh.token + '/upload', { body: { type: 'blob.generate-client-token', payload: { pathname: 'private/releases/OTHER/wav-a.wav', clientPayload: 'wav' } } });
    assert(wrongPath.status === 400, 'upload outside the demo folder refused');
    const mp3 = await request(port, 'POST', '/api/release/' + fresh.token + '/upload', { body: { type: 'blob.generate-client-token', payload: { pathname: 'private/releases/d-1/wav-a.mp3', clientPayload: 'wav' } } });
    assert(mp3.status === 400, 'non-wav refused');
    const hs = await request(port, 'POST', '/api/release/' + fresh.token + '/upload', { body: { type: 'blob.generate-client-token', payload: { pathname: 'private/releases/d-1/wav-master.wav', clientPayload: 'wav' } } });
    assert(hs.status === 200 && hs.json.clientToken === 'stub-client-token', hs.body);
    const rules = blobStub.calls[blobStub.calls.length - 1];
    assert(rules.maximumSizeInBytes === 500 * 1024 * 1024 && rules.allowedContentTypes.includes('audio/wav') && rules.addRandomSuffix === true, 'client token limited to WAV, 500 MB');
    const done = await request(port, 'POST', '/api/release/' + fresh.token, { body: goodBody() });
    assert(done.status === 201, done.body);
    const again = await request(port, 'POST', '/api/release/' + fresh.token, { body: goodBody() });
    assert(again.status === 409, 'second submit blocked');
    const state = await request(port, 'GET', '/api/release/' + fresh.token);
    assert(state.json.submitted === true, 'form shows submitted');
    const list = await request(port, 'GET', '/api/demos', { cookie });
    const d1 = list.json.find((d) => d.id === 'd-1');
    assert(d1.release.progress.detailsReceived && d1.release.progress.wavReceived, 'admin sees details + WAV');
    assert(d1.release.details.credits.length === 2 && d1.release.wav.href === '/api/demos/d-1/release-file/wav' && !JSON.stringify(d1).includes('blob.vercel-storage.com'), 'admin gets download route, not blob url');
    delete process.env.BLOB_READ_WRITE_TOKEN;
    ok('submit (stubbed storage): handshake limits, 201, no double submit, admin progress');
  } finally {
    server.close();
  }
  console.log('ok  demo release link');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
