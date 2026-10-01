/**
 * ADMIN_LOGIN_EMAIL / ADMIN_NOTIFY_EMAIL split checks. No network, no email sent.
 * Run: node test/admin-env.js
 */
const assert = require('assert');
const http = require('http');

delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
delete process.env.RESEND_API_KEY;

const KEYS = ['ADMIN_EMAIL', 'ADMIN_LOGIN_EMAIL', 'ADMIN_NOTIFY_EMAIL', 'ADMIN_NOTIFY_EMAILS',
  'CONTACT_NOTIFY_EMAILS', 'BOOKING_NOTIFY_EMAILS', 'BOOKINGS_EMAIL', 'DEMO_NOTIFY_EMAILS', 'AR_EMAIL', 'ADMIN_PASSWORD'];
function setEnv(vars) {
  for (const k of KEYS) delete process.env[k];
  Object.assign(process.env, vars);
}

const { getAdminRecipients } = require('../src/api/emailService');
const app = require('../server');

function login(port, email, password) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ email, password });
    const req = http.request({ hostname: '127.0.0.1', port, path: '/api/auth/admin/login', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject);
    req.end(body);
  });
}

(async () => {
  const server = app.listen(0);
  const { port } = server.address();
  const results = [];
  const check = async (name, fn) => { await fn(); results.push(name); console.log('ok -', name); };
  try {
    // Legacy: only ADMIN_EMAIL set (today's prod state) -> both login and notify use it.
    await check('legacy ADMIN_EMAIL still works for login and notify', async () => {
      setEnv({ ADMIN_EMAIL: 'booking@mixxea.com', ADMIN_PASSWORD: 'pw' });
      assert.strictEqual(await login(port, 'booking@mixxea.com', 'pw'), 200);
      assert.deepStrictEqual(getAdminRecipients('general'), ['booking@mixxea.com']);
      assert.deepStrictEqual(getAdminRecipients('contact'), ['booking@mixxea.com']);
    });

    // Split: login and notify are independent.
    await check('split vars: login uses ADMIN_LOGIN_EMAIL, notify uses ADMIN_NOTIFY_EMAIL', async () => {
      setEnv({ ADMIN_EMAIL: 'booking@mixxea.com', ADMIN_LOGIN_EMAIL: 'fuad-login@example.test',
        ADMIN_NOTIFY_EMAIL: 'booking@mixxea.com', ADMIN_PASSWORD: 'pw' });
      assert.strictEqual(await login(port, 'fuad-login@example.test', 'pw'), 200);
      assert.strictEqual(await login(port, 'booking@mixxea.com', 'pw'), 401);
      assert.deepStrictEqual(getAdminRecipients('general'), ['booking@mixxea.com']);
      assert.ok(!getAdminRecipients('general').includes('fuad-login@example.test'));
    });

    await check('ADMIN_NOTIFY_EMAIL overrides ADMIN_EMAIL for notifications only', async () => {
      setEnv({ ADMIN_EMAIL: 'old@example.test', ADMIN_NOTIFY_EMAIL: 'ops@example.test', ADMIN_PASSWORD: 'pw' });
      assert.deepStrictEqual(getAdminRecipients('general'), ['ops@example.test']);
      assert.strictEqual(await login(port, 'old@example.test', 'pw'), 200);
    });

    await check('booking/demo/contact specific recipients still come first', async () => {
      setEnv({ ADMIN_NOTIFY_EMAIL: 'ops@example.test', BOOKING_NOTIFY_EMAILS: 'b@example.test',
        CONTACT_NOTIFY_EMAILS: 'c@example.test', ADMIN_NOTIFY_EMAILS: 'x@example.test' });
      assert.deepStrictEqual(getAdminRecipients('booking'), ['b@example.test', 'x@example.test', 'ops@example.test']);
      assert.deepStrictEqual(getAdminRecipients('contact'), ['c@example.test', 'x@example.test', 'ops@example.test']);
    });

    await check('nothing configured: no default recipient and login refused', async () => {
      setEnv({});
      assert.deepStrictEqual(getAdminRecipients('general'), []);
      assert.strictEqual(await login(port, undefined, undefined), 401);
      assert.strictEqual(await login(port, 'admin@mixxea.com', ''), 401);
    });

    await check('admin@mixxea.com is never a code default', async () => {
      const fs = require('fs');
      for (const f of ['src/api/auth.js', 'src/api/emailService.js', 'src/api/adminEnv.js']) {
        assert.ok(!fs.readFileSync(require('path').join(__dirname, '..', f), 'utf8').includes('admin@mixxea.com'), f);
      }
    });
    console.log(`\n${results.length} checks passed`);
  } catch (e) {
    console.error('FAIL', e);
    process.exitCode = 1;
  } finally {
    server.close();
    setTimeout(() => process.exit(process.exitCode || 0), 50);
  }
})();
