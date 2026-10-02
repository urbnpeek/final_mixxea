/**
 * Unsubscribe tokens, the confirm flow, and private-file auth.
 * Uses local JSON and does not call Redis or Blob.
 * Run: node test/privacy-ops.js
 */
const fs = require('fs');
const http = require('http');
const path = require('path');

process.env.UNSUBSCRIBE_SECRET = 'test-unsubscribe-secret';
process.env.CANONICAL_BASE_URL = 'https://www.mixxea.com';
process.env.ADMIN_LOGIN_EMAIL = 'fuad@example.test';
process.env.ADMIN_PASSWORD = 'correct-horse';
process.env.SESSION_SECRET = 'privacy-ops-secret';
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
delete process.env.BLOB_READ_WRITE_TOKEN;
delete process.env.RESEND_API_KEY;

const dataDir = path.join(__dirname, '../data');
const backups = {};
for (const name of ['newsletter.json', 'demos.json', 'contracts.json', 'artistPortalUsers.json']) {
  const file = path.join(dataDir, name);
  backups[name] = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

const { signUnsubscribeToken, verifyUnsubscribeToken } = require('../src/lib/unsubscribeToken');
const { addSubscriber, unsubscribeEmail } = require('../src/lib/newsletterList');
const { newsletterDelivery } = require('../src/api/emailService');
const upload = require('../src/api/upload');
const app = require('../server');

function assert(condition, message) {
  if (!condition) {
    const error = new Error(message);
    error.name = 'AssertionError';
    throw error;
  }
}

function request(port, method, urlPath, { body, cookie, form } = {}) {
  return new Promise((resolve, reject) => {
    const payload = form ? form : (body ? JSON.stringify(body) : null);
    const headers = {};
    if (payload) {
      headers['Content-Type'] = form ? 'application/x-www-form-urlencoded' : 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    if (cookie) headers.Cookie = cookie;
    const req = http.request({ hostname: '127.0.0.1', port, path: urlPath, method, headers }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try { json = JSON.parse(text); } catch { json = null; }
        resolve({ status: res.statusCode, headers: res.headers, body: text, json });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function cookieFrom(res, name) {
  const raw = res.headers['set-cookie'] || [];
  const list = Array.isArray(raw) ? raw : [raw];
  const found = list.find((item) => item.startsWith(name + '='));
  if (!found) throw new Error('missing cookie ' + name);
  return found.split(';')[0];
}

function restore() {
  for (const [name, content] of Object.entries(backups)) {
    const file = path.join(dataDir, name);
    if (content == null) {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } else {
      fs.writeFileSync(file, content);
    }
  }
}

async function main() {
  const token = signUnsubscribeToken('Fan@Mixxea.com');
  assert(verifyUnsubscribeToken(token) === 'fan@mixxea.com', 'token email');
  assert(verifyUnsubscribeToken(token + 'x') === '', 'bad signature');
  assert(verifyUnsubscribeToken('bm90LWFuLWVtYWls.sig') === '', 'wrong sig');
  const previous = process.env.UNSUBSCRIBE_SECRET;
  delete process.env.UNSUBSCRIBE_SECRET;
  assert(signUnsubscribeToken('fan@mixxea.com') === '', 'no secret');
  assert(newsletterDelivery('fan@mixxea.com', { subject: 'Hi', body: 'Body', origin: 'https://www.mixxea.com' }) === null, 'no send without secret');
  process.env.UNSUBSCRIBE_SECRET = previous;

  const message = newsletterDelivery('fan@mixxea.com', {
    subject: 'New music',
    body: 'A note.',
    origin: 'https://www.mixxea.com',
  });
  assert(message.html.includes('Unsubscribe'), 'link missing');
  assert(message.headers['List-Unsubscribe'].startsWith('<https://www.mixxea.com/unsubscribe?token='), message.headers['List-Unsubscribe']);
  assert(message.headers['List-Unsubscribe-Post'] === 'List-Unsubscribe=One-Click', 'one-click header');
  assert(!message.html.includes('fan@mixxea.com?'), 'raw email in the link');

  let list = { subscribers: [], campaigns: [], suppressions: [] };
  list = addSubscriber(list, { email: 'fan@mixxea.com', source: 'footer' }).newsletter;
  assert(list.subscribers[0].consentVersion === '2026-10-02', JSON.stringify(list.subscribers[0]));
  const removed = unsubscribeEmail(list, 'fan@mixxea.com', '2026-10-02T00:00:00.000Z');
  assert(removed.removed && removed.newsletter.subscribers.length === 0, 'removed');
  assert(removed.newsletter.suppressions[0].email === 'fan@mixxea.com', 'suppression');
  const blocked = addSubscriber(removed.newsletter, { email: 'fan@mixxea.com', source: 'import' });
  assert(blocked.status === 'suppressed', blocked.status);
  const again = addSubscriber(removed.newsletter, { email: 'fan@mixxea.com', source: 'footer' });
  assert(again.status === 'added' && again.newsletter.suppressions.length === 0, 'new consent clears suppression');

  const server = await new Promise((resolve) => {
    const handle = app.listen(0, '127.0.0.1', () => resolve(handle));
  });
  const port = server.address().port;
  const failures = [];
  async function check(name, fn) {
    try {
      await fn();
      console.log('ok  ' + name);
    } catch (error) {
      failures.push(name + ': ' + error.message);
      console.error('FAIL ' + name + ': ' + error.message);
    }
  }

  await check('unsubscribe confirm flow', async () => {
    const joined = await request(port, 'POST', '/api/newsletter/subscribe', {
      body: { email: 'listener@example.test', source: 'footer' },
    });
    assert(joined.status === 200, joined.body);
    const pageToken = signUnsubscribeToken('listener@example.test');
    const preview = await request(port, 'GET', '/unsubscribe?token=' + encodeURIComponent(pageToken));
    assert(preview.status === 200, 'preview ' + preview.status);
    assert(preview.body.includes('Confirm unsubscribe'), preview.body.slice(0, 400));
    assert(preview.body.includes('listener@example.test'), 'address not shown');
    const still = await request(port, 'POST', '/api/newsletter/subscribe', {
      body: { email: 'listener@example.test', source: 'footer' },
    });
    assert(still.json && still.json.message === 'Already subscribed', JSON.stringify(still.json));

    const oneClick = await request(port, 'POST', '/unsubscribe?token=' + encodeURIComponent(pageToken), {
      form: 'List-Unsubscribe=One-Click',
    });
    assert(oneClick.status === 200, 'one-click ' + oneClick.status);
    const imported = await request(port, 'POST', '/api/newsletter/subscribe', {
      body: { email: 'listener@example.test', source: 'import' },
    });
    assert(imported.json && imported.json.suppressed === true, JSON.stringify(imported.json));

    const open = await request(port, 'DELETE', '/api/newsletter/unsubscribe/listener@example.test');
    assert(open.status === 403, 'open delete ' + open.status);
  });

  await check('private demo and contract downloads', async () => {
    const db = require('../src/api/db');
    await db.set('artistPortalUsers', []);
    const stored = await upload.uploadFile({
      buffer: Buffer.from('demo-bytes'),
      originalname: 'demo.wav',
      mimetype: 'audio/wav',
    }, 'audio', { access: 'private' });
    assert(stored.startsWith('private:audio/'), stored);
    await db.set('demos', [{
      id: 'demo-priv',
      artistName: 'Ada',
      email: 'ada@example.test',
      file: stored,
      status: 'new',
    }]);
    const contractFile = await upload.uploadFile({
      buffer: Buffer.from('%PDF-1.4'),
      originalname: 'deal.pdf',
      mimetype: 'application/pdf',
    }, 'contracts', { access: 'private' });
    await db.set('contracts', [{
      id: 'contract-priv',
      artist: 'Ada',
      file: contractFile,
      status: 'active',
    }]);

    const hidden = await request(port, 'GET', '/api/demos/demo-priv/file');
    assert(hidden.status === 401, 'demo signed out ' + hidden.status);
    const hiddenContract = await request(port, 'GET', '/api/contracts/contract-priv/file');
    assert(hiddenContract.status === 401, 'contract signed out ' + hiddenContract.status);

    const login = await request(port, 'POST', '/api/auth/admin/login', {
      body: { email: 'fuad@example.test', password: 'correct-horse' },
    });
    assert(login.status === 200, login.body);
    const adminCookie = cookieFrom(login, 'mixxea_auth');
    const list = await request(port, 'GET', '/api/demos', { cookie: adminCookie });
    assert(list.body.includes('/api/demos/demo-priv/file'), list.body);
    assert(!list.body.includes('blob.vercel-storage.com'), 'public blob url');
    assert(!list.body.includes('private:'), 'storage ref leaked');
    const audio = await request(port, 'GET', '/api/demos/demo-priv/file', { cookie: adminCookie });
    assert(audio.status === 200, 'admin demo ' + audio.status);
    assert(audio.body === 'demo-bytes', audio.body);

    const ada = await request(port, 'POST', '/api/auth/artist/register', {
      body: { artistName: 'Ada', email: 'ada@example.test', password: 'artist-pass-1' },
    });
    assert(ada.status === 200, ada.body);
    const adaCookie = cookieFrom(ada, 'mixxea.sid');
    const own = await request(port, 'GET', '/api/contracts/contract-priv/file', { cookie: adaCookie });
    assert(own.status === 200 && own.body.includes('%PDF'), 'artist contract ' + own.status + ' ' + own.body);

    const ned = await request(port, 'POST', '/api/auth/artist/register', {
      body: { artistName: 'Ned', email: 'ned@example.test', password: 'artist-pass-1' },
    });
    assert(ned.status === 200, ned.body);
    const nedCookie = cookieFrom(ned, 'mixxea.sid');
    const other = await request(port, 'GET', '/api/contracts/contract-priv/file', { cookie: nedCookie });
    assert(other.status === 403, 'other artist ' + other.status);
  });

  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  if (failures.length) throw new Error(failures.join('\n'));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(restore);
