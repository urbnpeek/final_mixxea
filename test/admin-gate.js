/**
 * /admin sends the control-panel HTML only to a verified staff login.
 * Uses a temporary KV directory and does not call Redis.
 * Run: node test/admin-gate.js
 */
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mixxea-admin-gate-'));
process.env.KV_LOCAL_DIR = tmp;
process.env.ADMIN_LOGIN_EMAIL = 'fuad@example.test';
process.env.ADMIN_PASSWORD = 'correct-horse';
process.env.SESSION_SECRET = 'admin-gate-test-secret';
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
delete process.env.BLOB_READ_WRITE_TOKEN;
delete process.env.VERCEL_ENV;

const app = require('../server');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function request(port, method, urlPath, { body, cookie } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = {};
    if (payload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    if (cookie) headers.Cookie = cookie;
    const req = http.request({ hostname: '127.0.0.1', port, path: urlPath, method, headers }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function authCookie(res) {
  const raw = res.headers['set-cookie'] || [];
  const list = Array.isArray(raw) ? raw : [raw];
  const found = list.find((item) => item.startsWith('mixxea_auth='));
  if (!found) throw new Error('missing auth cookie');
  return found.split(';')[0];
}

const PANEL_MARKERS = ['id="admin-overlay"', 'id="staff-email"', 'id="rel-title"', '/js/admin.js'];

async function main() {
  const server = await new Promise((resolve) => {
    const handle = app.listen(0, '127.0.0.1', () => resolve(handle));
  });
  const port = server.address().port;
  let failed = 0;
  async function check(name, fn) {
    try { await fn(); console.log('ok   ' + name); } catch (e) { failed += 1; console.error('FAIL ' + name + ': ' + e.message); }
  }
  try {
    await check('anonymous /admin gets the login page only', async () => {
      const res = await request(port, 'GET', '/admin');
      assert(res.status === 200, 'status ' + res.status);
      assert(/noindex/i.test(res.headers['x-robots-tag'] || ''), 'x-robots-tag');
      assert(/<meta name="robots" content="noindex, nofollow">/.test(res.body), 'meta noindex');
      assert(res.body.includes('<title>Admin Login · MIXXEA</title>'), 'login title');
      assert(!/kira@|@mixxea\.com/i.test(res.body), 'an address is in the public HTML');
      assert(!/Freq Vault/i.test(res.body), 'old Freq Vault title/copy');
      for (const marker of PANEL_MARKERS) assert(!res.body.includes(marker), 'panel marker ' + marker);
      assert(res.body.includes('/js/admin-login.js'), 'login script');
      assert(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(res.body), 'inline script');
    });
    await check('forged cookie still gets the login page', async () => {
      const res = await request(port, 'GET', '/admin', { cookie: 'mixxea_auth=admin:1.forged' });
      assert(!res.body.includes('id="admin-overlay"'), 'panel served to a forged cookie');
    });
    await check('signed-in admin gets the panel with the new title', async () => {
      const login = await request(port, 'POST', '/api/auth/admin/login', { body: { email: 'fuad@example.test', password: 'correct-horse' } });
      assert(login.status === 200, 'login ' + login.status);
      const res = await request(port, 'GET', '/admin', { cookie: authCookie(login) });
      assert(res.status === 200, 'status ' + res.status);
      assert(res.body.includes('id="admin-overlay"'), 'panel missing');
      assert(res.body.includes('<title>Admin · MIXXEA</title>'), 'panel title');
      assert(!res.body.includes('kira@mixxea.com'), 'staff address in panel placeholder');
      assert(/noindex/i.test(res.headers['x-robots-tag'] || ''), 'x-robots-tag');
    });
  } finally {
    server.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  if (failed) { console.error(failed + ' admin-gate check(s) failed'); process.exit(1); }
  console.log('admin-gate: all checks passed');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
