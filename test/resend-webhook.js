/**
 * Resend bounce webhook checks. No network, no email sent.
 * Run: node test/resend-webhook.js
 */
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');

delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
delete process.env.RESEND_API_KEY;
delete process.env.RESEND_WEBHOOK_SECRET;
delete process.env.BOUNCE_ALERT_EMAIL;

const app = require('../server');
const db = require('../src/api/db');
const mailer = require('../src/api/mailer');
const { getAdminRecipients } = require('../src/api/emailService');

const SECRET_KEY = crypto.randomBytes(24);
const SECRET = 'whsec_' + SECRET_KEY.toString('base64');
const BOUNCES_FILE = path.join(__dirname, '..', 'data', 'emailBounces.json');
const originalBounces = fs.existsSync(BOUNCES_FILE) ? fs.readFileSync(BOUNCES_FILE, 'utf8') : null;
const originalSend = mailer.sendMail;
const sent = [];

function sign(id, timestamp, payload) {
  const mac = crypto.createHmac('sha256', SECRET_KEY)
    .update(`${id}.${timestamp}.${payload}`)
    .digest('base64');
  return `v1,${mac}`;
}

function request(port, { method, path: reqPath, body, headers }) {
  return new Promise((resolve, reject) => {
    const payload = body == null ? '' : body;
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: reqPath,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...(headers || {}),
      },
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try { json = JSON.parse(text); } catch (e) { json = null; }
        resolve({ status: res.statusCode, json, text });
      });
    });
    req.on('error', reject);
    req.end(payload);
  });
}

function eventPayload(type, extra) {
  return JSON.stringify({
    type,
    created_at: '2026-10-02T05:33:05.787Z',
    data: Object.assign({
      email_id: 'email_test_1',
      from: 'Mixxea Records <booking@mixxea.com>',
      to: ['booking@mixxea.com'],
      subject: 'New submission: "IT TEST" by Example',
    }, extra || {}),
  });
}

async function postSigned(port, payload, { id, timestamp, signature } = {}) {
  const svixId = id || 'msg_test_1';
  const ts = timestamp == null ? Math.floor(Date.now() / 1000) : timestamp;
  return request(port, {
    method: 'POST',
    path: '/api/webhooks/resend',
    body: payload,
    headers: {
      'svix-id': svixId,
      'svix-timestamp': String(ts),
      'svix-signature': signature == null ? sign(svixId, ts, payload) : signature,
    },
  });
}

(async () => {
  mailer.sendMail = async (options) => {
    sent.push(options);
    return { ok: true, provider: 'test', id: 'email_alert_1' };
  };
  const server = app.listen(0);
  const { port } = server.address();
  const results = [];
  const logs = [];
  const originalError = console.error;
  console.error = (...args) => { logs.push(args.map((item) => String(item)).join(' ')); };
  const check = async (name, fn) => { await fn(); results.push(name); console.log('ok -', name); };
  try {
    await db.set('emailBounces', []);

    await check('501 without webhook secret', async () => {
      delete process.env.RESEND_WEBHOOK_SECRET;
      const res = await request(port, { method: 'POST', path: '/api/webhooks/resend', body: '{"type":"email.bounced"}' });
      assert.strictEqual(res.status, 501);
      assert.deepStrictEqual(res.json, { error: 'Webhook not configured' });
      assert.strictEqual(sent.length, 0);
    });

    process.env.RESEND_WEBHOOK_SECRET = SECRET;

    await check('400 on bad signature', async () => {
      const payload = eventPayload('email.bounced');
      const res = await postSigned(port, payload, { signature: 'v1,not-a-real-signature' });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.json.error, 'Invalid signature');
      assert.strictEqual(sent.length, 0);
    });

    await check('400 when the timestamp is outside the replay window', async () => {
      const payload = eventPayload('email.bounced');
      const old = Math.floor(Date.now() / 1000) - (60 * 60);
      const res = await postSigned(port, payload, { id: 'msg_old', timestamp: old });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(sent.length, 0);
    });

    await check('signature is verified over the raw body', async () => {
      const payload = '{ "type": "email.delivered", "created_at": "2026-10-02T05:33:05.787Z", "data": { "email_id": "email_raw", "to": ["person@example.test"], "subject": "Hello" } }';
      const res = await postSigned(port, payload, { id: 'msg_raw' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.json.ignored, true);
      assert.strictEqual(sent.length, 0);
    });

    await check('alert sent on bounce, reason logged and stored', async () => {
      sent.length = 0;
      logs.length = 0;
      const payload = eventPayload('email.bounced', {
        bounce: {
          type: 'Permanent',
          subType: 'General',
          message: '550 5.1.1 The email account that you tried to reach does not exist.',
        },
      });
      const res = await postSigned(port, payload, { id: 'msg_bounce' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.json.alerted, true);
      assert.strictEqual(sent.length, 1);
      const mail = sent[0];
      assert.ok(mail.subject.startsWith('[Mixxea delivery alert]'));
      assert.ok(mail.subject.includes('email.bounced'));
      assert.deepStrictEqual(mail.tags, [{ name: 'flow', value: 'bounce-alert' }]);
      assert.strictEqual(mail.headers['X-Mixxea-Alert'], 'bounce');
      assert.strictEqual(mail.fromBrand, 'mixxea');
      assert.ok(mail.html.includes('booking@mixxea.com'));
      assert.ok(mail.html.includes('email.bounced'));
      assert.ok(mail.html.includes('Permanent'));
      assert.ok(mail.html.includes('550 5.1.1'));
      assert.ok(mail.html.includes('Europe/Bucharest'));
      assert.ok(mail.html.includes('email_test_1'));
      assert.ok(mail.html.includes('New submission'));
      assert.ok(logs.some((line) => line.includes('550 5.1.1') && line.includes('email.bounced')));
      const stored = await db.get('emailBounces');
      const row = stored.find((item) => item.svixId === 'msg_bounce');
      assert.ok(row);
      assert.strictEqual(row.reason.includes('550 5.1.1'), true);
      assert.strictEqual(row.bounceType, 'Permanent');
      assert.strictEqual(row.emailId, 'email_test_1');
      assert.strictEqual(row.alertSent, true);
    });

    await check('alert sent on complaint', async () => {
      sent.length = 0;
      const payload = eventPayload('email.complained', { email_id: 'email_complaint', to: ['person@example.test'], subject: 'Welcome' });
      const res = await postSigned(port, payload, { id: 'msg_complaint' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(sent.length, 1);
      assert.ok(sent[0].subject.includes('email.complained'));
      assert.ok(sent[0].html.includes('person@example.test'));
      assert.ok(sent[0].html.includes('spam'));
      assert.ok(sent[0].html.includes('email_complaint'));
    });

    await check('alert sent on failed and suppressed delivery', async () => {
      sent.length = 0;
      const failed = eventPayload('email.failed', { email_id: 'email_failed', failed: { reason: 'reached_daily_quota' } });
      const suppressed = eventPayload('email.suppressed', {
        email_id: 'email_suppressed',
        suppressed: { type: 'OnAccountSuppressionList', message: 'Address is on the suppression list' },
      });
      const failedRes = await postSigned(port, failed, { id: 'msg_failed' });
      const suppressedRes = await postSigned(port, suppressed, { id: 'msg_suppressed' });
      assert.strictEqual(failedRes.status, 200);
      assert.strictEqual(suppressedRes.status, 200);
      assert.strictEqual(sent.length, 2);
      assert.ok(sent[0].html.includes('reached_daily_quota'));
      assert.ok(sent[1].html.includes('OnAccountSuppressionList'));
      assert.ok(sent[1].html.includes('suppression list'));
    });

    await check('loop guard does not re-send when the failed message is an alert', async () => {
      sent.length = 0;
      logs.length = 0;
      const payload = eventPayload('email.bounced', {
        email_id: 'email_loop',
        subject: '[Mixxea delivery alert] email.bounced: earlier',
        tags: { flow: 'bounce-alert' },
        to: ['hello@mixxea.com'],
        bounce: { type: 'Permanent', message: 'mailbox unavailable' },
      });
      const res = await postSigned(port, payload, { id: 'msg_loop' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.json.alertSkipped, 'loop');
      assert.strictEqual(sent.length, 0);
      assert.ok(logs.some((line) => line.includes('[WEBHOOK][RESEND][LOOP]')));
      const stored = await db.get('emailBounces');
      const row = stored.find((item) => item.svixId === 'msg_loop');
      assert.ok(row);
      assert.strictEqual(row.alertSent, false);
      assert.strictEqual(row.alertSkipped, 'loop');
    });

    await check('tag-only marker also blocks an alert loop', async () => {
      sent.length = 0;
      const payload = eventPayload('email.complained', {
        email_id: 'email_loop_tag',
        subject: 'Ordinary subject',
        tags: [{ name: 'flow', value: 'bounce-alert' }],
      });
      const res = await postSigned(port, payload, { id: 'msg_loop_tag' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.json.alertSkipped, 'loop');
      assert.strictEqual(sent.length, 0);
    });

    await check('ignored events return 200 and do not alert or store', async () => {
      sent.length = 0;
      const before = (await db.get('emailBounces')).length;
      const payload = eventPayload('email.delivered', { email_id: 'email_delivered' });
      const res = await postSigned(port, payload, { id: 'msg_delivered' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.json.ignored, true);
      assert.strictEqual(sent.length, 0);
      const listRes = await postSigned(port, eventPayload('suppression.added', { email_id: '' }), { id: 'msg_list' });
      assert.strictEqual(listRes.status, 200);
      assert.strictEqual(listRes.json.ignored, true);
      assert.strictEqual((await db.get('emailBounces')).length, before);
    });

    await check('default bounce alert recipient is hello@mixxea.com', async () => {
      delete process.env.BOUNCE_ALERT_EMAIL;
      sent.length = 0;
      const payload = eventPayload('email.bounced', { email_id: 'email_default_to' });
      const res = await postSigned(port, payload, { id: 'msg_default_to' });
      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(sent[0].to, ['hello@mixxea.com']);
    });

    await check('BOUNCE_ALERT_EMAIL overrides the default recipient', async () => {
      process.env.BOUNCE_ALERT_EMAIL = 'desk@example.test';
      sent.length = 0;
      const payload = eventPayload('email.bounced', { email_id: 'email_custom_to' });
      const res = await postSigned(port, payload, { id: 'msg_custom_to' });
      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(sent[0].to, ['desk@example.test']);
      delete process.env.BOUNCE_ALERT_EMAIL;
    });

    await check('demo alerts use the same notify mailbox as contact when no demo-specific recipient is set', async () => {
      const keys = ['DEMO_NOTIFY_EMAILS', 'AR_EMAIL', 'CONTACT_NOTIFY_EMAILS', 'ADMIN_NOTIFY_EMAILS', 'BOOKING_NOTIFY_EMAILS', 'BOOKINGS_EMAIL', 'ADMIN_EMAIL'];
      const previous = {};
      keys.forEach((key) => { previous[key] = process.env[key]; delete process.env[key]; });
      process.env.ADMIN_NOTIFY_EMAIL = 'booking@mixxea.com';
      try {
        assert.deepStrictEqual(getAdminRecipients('demo'), ['booking@mixxea.com']);
        assert.deepStrictEqual(getAdminRecipients('contact'), ['booking@mixxea.com']);
      } finally {
        delete process.env.ADMIN_NOTIFY_EMAIL;
        keys.forEach((key) => {
          if (previous[key] == null) delete process.env[key];
          else process.env[key] = previous[key];
        });
      }
    });

    await check('admin@mixxea.com never appears outside a forbidden-value test', async () => {
      const root = path.join(__dirname, '..');
      const files = [];
      const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'test') continue;
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) walk(full);
          else files.push(full);
        }
      };
      walk(root);
      const hits = files.filter((file) => fs.readFileSync(file, 'utf8').includes('admin@mixxea.com'));
      assert.deepStrictEqual(hits, []);
      assert.ok(fs.readFileSync(__filename, 'utf8').includes('admin@mixxea.com'));
    });

    console.log(`\n${results.length} checks passed`);
  } catch (error) {
    console.error = originalError;
    console.error('FAIL', error);
    process.exitCode = 1;
  } finally {
    console.error = originalError;
    mailer.sendMail = originalSend;
    try {
      if (originalBounces == null) fs.rmSync(BOUNCES_FILE, { force: true });
      else fs.writeFileSync(BOUNCES_FILE, originalBounces);
    } catch (error) {
      console.error('restore emailBounces failed', error);
    }
    server.close();
    setTimeout(() => process.exit(process.exitCode || 0), 50);
  }
})();
