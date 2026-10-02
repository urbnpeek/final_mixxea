/**
 * Admin Contact Inbox auth and listing. No network, no email sent.
 * Run: node test/contact-inbox.js
 */
const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');

delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
delete process.env.RESEND_API_KEY;
process.env.ADMIN_LOGIN_EMAIL = 'hello@mixxea.com';
process.env.ADMIN_PASSWORD = 'inbox-test-pw';
delete process.env.ADMIN_EMAIL;

const app = require('../server');
const db = require('../src/api/db');

const dataDir = path.join(__dirname, '..', 'data');
const collections = ['contactMessages', 'bookings', 'demos', 'emailBounces', 'artistPortalUsers'];
const backups = {};
collections.forEach((name) => {
  const file = path.join(dataDir, name + '.json');
  backups[name] = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
});

const PROBES = [
  'LEAKPROBE-9f3c',
  'leakprobe@example.test',
  'bookprobe@example.test',
  'demo-secret@example.test',
  'mailbox-unavailable-probe',
];

function request(port, { method, path: reqPath, body, cookie }) {
  return new Promise((resolve, reject) => {
    const payload = body == null ? null : JSON.stringify(body);
    const headers = {};
    if (payload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    if (cookie) headers.Cookie = cookie;
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: reqPath,
      method,
      headers,
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try { json = JSON.parse(text); } catch (e) { json = null; }
        const setCookie = res.headers['set-cookie'] || [];
        const list = Array.isArray(setCookie) ? setCookie : [setCookie];
        resolve({
          status: res.statusCode,
          json,
          text,
          cookie: list.map((item) => String(item).split(';')[0]).filter(Boolean).join('; '),
        });
      });
    });
    req.on('error', reject);
    if (payload) req.end(payload);
    else req.end();
  });
}

function assertNoLeak(res) {
  assert.ok(res.status === 401 || res.status === 403, 'expected 401 or 403, got ' + res.status);
  PROBES.forEach((probe) => assert.ok(!res.text.includes(probe), 'leaked ' + probe));
  assert.ok(!res.text.includes('"items"'));
  assert.ok(!res.text.includes('"bounces"'));
}

(async () => {
  await db.set('contactMessages', [
    { id: 'c-general', name: 'Ada', email: 'leakprobe@example.test', inquiryType: 'General', message: 'LEAKPROBE-9f3c hello from an old message', submittedAt: '2026-01-02T00:00:00.000Z' },
    { id: 'c-book', name: 'Bo', email: 'bookprobe@example.test', inquiryType: 'Booking Request', message: 'booking body LEAKPROBE-9f3c', submittedAt: '2026-01-03T00:00:00.000Z' },
  ]);
  await db.set('bookings', [
    { id: 'b-1', venue: 'Club', contact: 'Bo', artist: 'Nova', email: 'bookprobe@example.test', notes: 'booking body', status: 'pending', submittedAt: '2026-01-03T00:00:00.000Z', source: 'contact-form' },
  ]);
  await db.set('demos', [
    { id: 'd-1', artistName: 'Nova', email: 'demo-secret@example.test', trackTitle: 'Midnight', description: 'a demo', status: 'new', submittedAt: '2026-01-04T00:00:00.000Z' },
  ]);
  await db.set('emailBounces', [
    { svixId: 'msg_probe', type: 'email.bounced', recipients: ['booking@mixxea.com'], subject: 'New submission', reason: 'mailbox-unavailable-probe', emailId: 'email_probe', occurredAt: '2026-10-02T05:33:05.787Z', bucharestTime: '02 Oct 2026, 08:33:05 EEST (Europe/Bucharest)', alertSent: true },
  ]);

  const server = app.listen(0);
  const { port } = server.address();
  const results = [];
  const check = async (name, fn) => { await fn(); results.push(name); console.log('ok -', name); };
  try {
    const artist = await request(port, {
      method: 'POST',
      path: '/api/auth/artist/register',
      body: { artistName: 'Inbox Tester', email: 'inbox-artist@example.test', password: 'artist-pw' },
    });
    assert.strictEqual(artist.status, 200);
    const artistCookie = artist.cookie;

    const admin = await request(port, {
      method: 'POST',
      path: '/api/auth/admin/login',
      body: { email: 'hello@mixxea.com', password: 'inbox-test-pw' },
    });
    assert.strictEqual(admin.status, 200);
    const adminCookie = admin.cookie;

    await check('signed-out inbox list is rejected and leaks nothing', async () => {
      const res = await request(port, { method: 'GET', path: '/api/inbox' });
      assertNoLeak(res);
      assert.strictEqual(res.status, 403);
    });

    await check('signed-out status update is rejected and leaks nothing', async () => {
      const res = await request(port, { method: 'PUT', path: '/api/inbox/contact/c-general/status', body: { status: 'read' } });
      assertNoLeak(res);
      const stored = await db.get('contactMessages');
      assert.ok(!stored.find((item) => item.id === 'c-general').status);
    });

    await check('non-admin artist session is rejected and leaks nothing', async () => {
      const list = await request(port, { method: 'GET', path: '/api/inbox', cookie: artistCookie });
      const update = await request(port, { method: 'PUT', path: '/api/inbox/contact/c-general/status', cookie: artistCookie, body: { status: 'archived' } });
      assertNoLeak(list);
      assertNoLeak(update);
      assert.strictEqual(list.status, 403);
      assert.strictEqual(update.status, 403);
    });

    await check('admin inbox lists general contacts, bookings, demos, and bounces once', async () => {
      const res = await request(port, { method: 'GET', path: '/api/inbox', cookie: adminCookie });
      assert.strictEqual(res.status, 200);
      const types = res.json.items.map((item) => item.type).sort();
      assert.deepStrictEqual(types, ['booking', 'contact', 'demo']);
      const general = res.json.items.find((item) => item.id === 'c-general');
      assert.strictEqual(general.status, 'new');
      assert.strictEqual(general.email, 'leakprobe@example.test');
      assert.ok(general.preview.includes('LEAKPROBE-9f3c'));
      assert.ok(!res.json.items.some((item) => item.id === 'c-book'));
      assert.ok(res.json.items.some((item) => item.id === 'b-1' && item.type === 'booking'));
      assert.ok(res.json.items.some((item) => item.id === 'd-1' && item.type === 'demo' && item.subject === 'Midnight'));
      assert.ok(res.json.bounces.some((item) => item.reason === 'mailbox-unavailable-probe'));
    });

    await check('admin can mark a contact message read', async () => {
      const res = await request(port, {
        method: 'PUT',
        path: '/api/inbox/contact/c-general/status',
        cookie: adminCookie,
        body: { status: 'read' },
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.json.status, 'read');
      const again = await request(port, { method: 'GET', path: '/api/inbox', cookie: adminCookie });
      assert.strictEqual(again.json.items.find((item) => item.id === 'c-general').status, 'read');
    });

    await check('invalid contact status is rejected for an admin', async () => {
      const res = await request(port, {
        method: 'PUT',
        path: '/api/inbox/contact/c-general/status',
        cookie: adminCookie,
        body: { status: 'deleted' },
      });
      assert.strictEqual(res.status, 400);
    });

    await check('admin@mixxea.com is not a contact inbox default', async () => {
      const file = fs.readFileSync(path.join(__dirname, '..', 'src', 'api', 'inbox.js'), 'utf8');
      assert.ok(!file.includes('admin@mixxea.com'));
    });

    console.log(`\n${results.length} checks passed`);
  } catch (error) {
    console.error('FAIL', error);
    process.exitCode = 1;
  } finally {
    collections.forEach((name) => {
      const file = path.join(dataDir, name + '.json');
      if (backups[name] == null) fs.rmSync(file, { force: true });
      else fs.writeFileSync(file, backups[name]);
    });
    server.close();
    setTimeout(() => process.exit(process.exitCode || 0), 50);
  }
})();
