/**
 * Honeypot, time-to-submit, per-IP rate limit, and Turnstile checks.
 * Siteverify and the mailer are mocked. No Redis and no email is sent.
 * Run: node test/bot-protection.js
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
delete process.env.TURNSTILE_SITE_KEY;
delete process.env.TURNSTILE_SECRET_KEY;
delete process.env.VERCEL_ENV;
delete process.env.NODE_ENV;
process.env.SESSION_SECRET = 'bot-protection-test-secret';

const guard = require('../src/lib/formGuard');
const rateLimit = require('../src/lib/rateLimit');
const app = require('../server');
const db = require('../src/api/db');
const mailer = require('../src/api/mailer');

const dataDir = path.join(__dirname, '..', 'data');
const collections = ['contactMessages', 'bookings', 'demos'];
const backups = {};
collections.forEach((name) => {
  const file = path.join(dataDir, name + '.json');
  backups[name] = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
});

const sent = [];
const originals = {};
['sendAdminNotification', 'sendBookingConfirmation', 'sendContactConfirmation', 'sendDemoSubmissionConfirmation'].forEach((name) => {
  assert.strictEqual(typeof mailer[name], 'function', name + ' missing');
  originals[name] = mailer[name];
  mailer[name] = async () => {
    sent.push(name);
    return { ok: true };
  };
});

const verifyCalls = [];
guard.setSiteverify(async (input) => {
  verifyCalls.push(input);
  if (input.response === 'bad-token') return { success: false, 'error-codes': ['invalid-input-response'] };
  return { success: true };
});

function request(port, { method = 'GET', path: reqPath, body, headers = {}, raw, contentType }) {
  return new Promise((resolve, reject) => {
    const payload = raw != null ? raw : (body == null ? null : JSON.stringify(body));
    const reqHeaders = Object.assign({}, headers);
    if (payload != null) {
      reqHeaders['Content-Type'] = contentType || 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: reqPath,
      method,
      headers: reqHeaders,
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try { json = JSON.parse(text); } catch (e) { json = null; }
        resolve({ status: res.statusCode, json, text, headers: res.headers });
      });
    });
    req.on('error', reject);
    if (payload != null) req.end(payload);
    else req.end();
  });
}

function freshContact(extra) {
  return Object.assign({
    name: 'Ada Lovelace',
    email: 'ada@example.test',
    message: 'A real note for the booking desk.',
    inquiryType: 'General',
    link: '',
    company_url: '',
    form_started_at: Date.now() - 5000,
    'cf-turnstile-response': 'pass-token',
  }, extra || {});
}

function freshDemo(extra) {
  return Object.assign({
    artistName: 'Ada',
    email: 'ada@example.test',
    trackTitle: 'Night Bus',
    company_url: '',
    form_started_at: Date.now() - 5000,
    'cf-turnstile-response': 'pass-token',
  }, extra || {});
}

function multipart(fields) {
  const boundary = '----mixxeabot';
  let raw = '';
  Object.keys(fields).forEach((key) => {
    raw += `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${fields[key]}\r\n`;
  });
  raw += `--${boundary}--\r\n`;
  return { raw, contentType: `multipart/form-data; boundary=${boundary}` };
}

(async () => {
  const results = [];
  const check = async (name, fn) => {
    await fn();
    results.push(name);
    console.log('ok -', name);
  };
  const server = app.listen(0);
  const { port } = server.address();
  try {
    await check('timing boundaries and honeypot ignore the link field', async () => {
      const now = 1700000000000;
      assert.strictEqual(guard.timingAccepts(now - 2999, now), false);
      assert.strictEqual(guard.timingAccepts(now - 3000, now), true);
      assert.strictEqual(guard.timingAccepts(now - guard.MAX_MS, now), true);
      assert.strictEqual(guard.timingAccepts(now - guard.MAX_MS - 1, now), false);
      assert.strictEqual(guard.timingAccepts('nope', now), false);
      assert.strictEqual(guard.timingAccepts('', now), false);
      assert.strictEqual(guard.timingAccepts(null, now), false);
      assert.strictEqual(guard.honeypotTripped({ company_url: 'https://spam.test' }), true);
      assert.strictEqual(guard.honeypotTripped({ company_url: ' ' }), true);
      assert.strictEqual(guard.honeypotTripped({ company_url: '' }), false);
      assert.strictEqual(guard.honeypotTripped({ link: 'https://soundcloud.com/example' }), false);
      assert.strictEqual(rateLimit.backend(), 'memory');
      rateLimit.resetMemory();
      for (let i = 1; i <= 8; i += 1) {
        assert.strictEqual(await rateLimit.consume('unit', '10.0.0.9', 1000000), i);
      }
      assert.strictEqual(await rateLimit.consume('unit', '10.0.0.9', 1000000), 9);
      assert.strictEqual(await rateLimit.consume('unit', '10.0.0.8', 1000000), 1);
      assert.strictEqual(await rateLimit.consume('other', '10.0.0.9', 1000000), 1);
      assert.strictEqual(await rateLimit.consume('unit', '10.0.0.9', 1000000 + 60000), 1);
    });

    await check('pages expose the honeypot, timestamp, managed widget, and Turnstile CSP', async () => {
      const booking = await request(port, { path: '/booking-agency' });
      const demo = await request(port, { path: '/submit.html' });
      const admin = await request(port, { path: '/admin' });
      const home = await request(port, { path: '/' });
      const privacy = await request(port, { path: '/privacy' });
      for (const page of [booking, demo, admin]) {
        assert.strictEqual(page.status, 200);
        assert.ok(page.text.includes('name="company_url"'), 'honeypot missing');
        assert.ok(page.text.includes('tabindex="-1"'), 'tabindex missing');
        assert.ok(page.text.includes('autocomplete="off"'), 'autocomplete missing');
        assert.ok(page.text.includes('aria-hidden="true"'), 'aria-hidden missing');
        assert.ok(page.text.includes('name="form_started_at"'), 'timestamp missing');
        assert.ok(page.text.includes('data-turnstile'), 'widget missing');
        assert.ok(page.text.includes('/js/form-guard.js'), 'guard script missing');
        assert.ok(page.text.includes('Cloudflare Turnstile'), 'turnstile copy missing');
      }
      const csp = booking.headers['content-security-policy'] || '';
      assert.ok(/script-src[^;]*https:\/\/challenges\.cloudflare\.com/.test(csp), csp);
      assert.ok(/frame-src[^;]*https:\/\/challenges\.cloudflare\.com/.test(csp), csp);
      assert.ok(!home.text.includes('/api/contact'), 'homepage still posts contact');
      assert.ok(!home.text.includes('homepage contact form'), home.text);
      assert.ok(privacy.text.includes('use Cloudflare Turnstile'), privacy.text);
      assert.ok(privacy.text.includes('/booking-agency#inquiry'), privacy.text);
      assert.ok(!privacy.text.includes('homepage contact form'), privacy.text);
      assert.ok(!booking.text.includes('homepage contact form'), booking.text);
      const inquiry = fs.readFileSync(path.join(__dirname, '../public/js/booking-inquiry.js'), 'utf8');
      const submitJs = fs.readFileSync(path.join(__dirname, '../public/js/app.js'), 'utf8');
      assert.ok(inquiry.includes("'cf-turnstile-response'"));
      assert.ok(submitJs.includes("'cf-turnstile-response'"));
      const widget = fs.readFileSync(path.join(__dirname, '../public/js/form-guard.js'), 'utf8');
      assert.ok(!/size:\s*['"]invisible['"]/.test(widget));
      assert.ok(!/appearance:\s*['"]execute['"]/.test(widget));
      assert.ok(!widget.includes('turnstile.ready'));
      assert.ok(widget.includes('onload=mixxeaTurnstileOnload'));
      assert.ok(widget.includes('theme: \'dark\''));
    });

    async function clearStores() {
      rateLimit.resetMemory();
      sent.length = 0;
      verifyCalls.length = 0;
      await db.set('contactMessages', []);
      await db.set('bookings', []);
      await db.set('demos', []);
    }

    await check('honeypot and too-fast contact posts are rejected before save or email', async () => {
      await clearStores();
      const honeypot = await request(port, {
        method: 'POST',
        path: '/api/contact',
        body: freshContact({ company_url: 'https://spam.test' }),
      });
      assert.strictEqual(honeypot.status, 400);
      assert.strictEqual(honeypot.json.error, guard.ERRORS.generic);
      const fast = await request(port, {
        method: 'POST',
        path: '/api/contact',
        body: freshContact({ form_started_at: Date.now() }),
      });
      assert.strictEqual(fast.status, 400);
      assert.strictEqual(fast.json.error, honeypot.json.error);
      const missing = await request(port, {
        method: 'POST',
        path: '/api/contact',
        body: freshContact({ form_started_at: undefined }),
      });
      assert.strictEqual(missing.status, 400);
      assert.strictEqual(missing.json.error, guard.ERRORS.generic);
      const stale = await request(port, {
        method: 'POST',
        path: '/api/contact',
        body: freshContact({ form_started_at: Date.now() - guard.MAX_MS - 5000 }),
      });
      assert.strictEqual(stale.status, 400);
      const messages = await db.get('contactMessages');
      assert.strictEqual(messages.length, 0);
      assert.strictEqual(sent.length, 0);
      assert.strictEqual(verifyCalls.length, 0);
    });

    await check('early rejects do not consume the rate limit', async () => {
      await clearStores();
      for (let i = 0; i < 10; i += 1) {
        const res = await request(port, {
          method: 'POST',
          path: '/api/contact',
          body: freshContact({ company_url: 'bot', form_started_at: Date.now() }),
        });
        assert.strictEqual(res.status, 400);
      }
      const probe = await request(port, {
        method: 'POST',
        path: '/api/contact',
        body: freshContact({ 'cf-turnstile-response': '' }),
      });
      assert.strictEqual(probe.status, 400);
      assert.strictEqual(probe.json.error, guard.ERRORS.turnstile);
    });

    await check('missing and invalid Turnstile tokens are rejected', async () => {
      await clearStores();
      const missing = await request(port, {
        method: 'POST',
        path: '/api/contact',
        body: freshContact({ 'cf-turnstile-response': '' }),
      });
      assert.strictEqual(missing.status, 400);
      assert.strictEqual(missing.json.error, guard.ERRORS.turnstile);
      assert.strictEqual(verifyCalls.length, 0);
      const bad = await request(port, {
        method: 'POST',
        path: '/api/demos/submit',
        body: freshDemo({ 'cf-turnstile-response': 'bad-token' }),
      });
      assert.strictEqual(bad.status, 400);
      assert.strictEqual(bad.json.error, guard.ERRORS.turnstile);
      assert.strictEqual(verifyCalls.length, 1);
      assert.strictEqual((await db.get('demos')).length, 0);
      assert.strictEqual(sent.length, 0);
    });

    await check('happy path still stores the contact and sends mail', async () => {
      await clearStores();
      const res = await request(port, { method: 'POST', path: '/api/contact', body: freshContact() });
      assert.strictEqual(res.status, 201, JSON.stringify(res.json));
      assert.strictEqual(res.json.success, true);
      const messages = await db.get('contactMessages');
      assert.strictEqual(messages.length, 1);
      assert.strictEqual(messages[0].email, 'ada@example.test');
      assert.strictEqual(messages[0].company_url, undefined);
      assert.strictEqual(messages[0].form_started_at, undefined);
      assert.ok(sent.includes('sendAdminNotification'));
      assert.ok(sent.includes('sendContactConfirmation'));
      assert.strictEqual(verifyCalls[0].secret, guard.TEST_SECRET);
      assert.strictEqual(verifyCalls[0].response, 'pass-token');
    });

    await check('booking inquiry still creates a booking and keeps an optional link', async () => {
      await clearStores();
      const res = await request(port, {
        method: 'POST',
        path: '/api/contact',
        body: freshContact({
          inquiryType: 'Booking Request',
          link: 'https://soundcloud.com/example',
          company_url: '',
        }),
      });
      assert.strictEqual(res.status, 201, JSON.stringify(res.json));
      assert.strictEqual(res.json.bookingCreated, true);
      const messages = await db.get('contactMessages');
      assert.strictEqual(messages[0].link, 'https://soundcloud.com/example');
      assert.strictEqual(messages[0].company_url, undefined);
      assert.strictEqual((await db.get('bookings')).length, 1);
      assert.ok(sent.includes('sendBookingConfirmation'));
      assert.ok(!sent.includes('sendContactConfirmation'));
    });

    await check('field validation still runs after the bot checks', async () => {
      await clearStores();
      const res = await request(port, {
        method: 'POST',
        path: '/api/contact',
        body: freshContact({ name: '' }),
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.json.error, 'Name is required.');
      assert.strictEqual((await db.get('contactMessages')).length, 0);
      assert.strictEqual(sent.length, 0);
    });

    await check('demo json and multipart happy paths send, honeypot does not', async () => {
      await clearStores();
      const blocked = await request(port, {
        method: 'POST',
        path: '/api/demos/submit',
        body: freshDemo({ company_url: 'https://spam.test' }),
      });
      assert.strictEqual(blocked.status, 400);
      assert.strictEqual(blocked.json.error, guard.ERRORS.generic);
      const fast = await request(port, {
        method: 'POST',
        path: '/api/demos/submit',
        body: freshDemo({ form_started_at: Date.now() }),
      });
      assert.strictEqual(fast.status, 400);
      const ok = await request(port, { method: 'POST', path: '/api/demos/submit', body: freshDemo() });
      assert.strictEqual(ok.status, 201, JSON.stringify(ok.json));
      assert.ok(ok.json.id);
      let demos = await db.get('demos');
      assert.strictEqual(demos.length, 1);
      assert.strictEqual(demos[0].trackTitle, 'Night Bus');
      assert.strictEqual(demos[0].company_url, undefined);
      assert.ok(sent.includes('sendAdminNotification'));
      assert.ok(sent.includes('sendDemoSubmissionConfirmation'));

      const form = multipart(Object.assign(freshDemo({ artistName: 'Bea', trackTitle: 'Late' }), {
        form_started_at: String(Date.now() - 5000),
      }));
      const multi = await request(port, {
        method: 'POST',
        path: '/api/demos/submit',
        raw: form.raw,
        contentType: form.contentType,
      });
      assert.strictEqual(multi.status, 201, multi.text);
      demos = await db.get('demos');
      assert.ok(demos.some((demo) => demo.artistName === 'Bea' && demo.trackTitle === 'Late'));
      assert.strictEqual(sent.filter((name) => name === 'sendDemoSubmissionConfirmation').length, 2);
    });

    await check('contact rate limit returns 429 and does not block demos', async () => {
      await clearStores();
      for (let i = 0; i < 8; i += 1) {
        const res = await request(port, {
          method: 'POST',
          path: '/api/contact',
          body: freshContact({ 'cf-turnstile-response': '' }),
        });
        assert.strictEqual(res.status, 400, 'slot ' + i + ' ' + res.status);
      }
      const limited = await request(port, {
        method: 'POST',
        path: '/api/contact',
        headers: { 'X-Forwarded-For': '203.0.113.50' },
        body: freshContact(),
      });
      assert.strictEqual(limited.status, 429);
      assert.strictEqual(limited.json.error, guard.ERRORS.rate);
      assert.strictEqual(limited.headers['retry-after'], '60');
      assert.strictEqual(verifyCalls.length, 0);
      assert.strictEqual(sent.length, 0);
      assert.strictEqual((await db.get('contactMessages')).length, 0);
      const demo = await request(port, {
        method: 'POST',
        path: '/api/demos/submit',
        body: freshDemo({ 'cf-turnstile-response': '' }),
      });
      assert.strictEqual(demo.status, 400);
      assert.strictEqual(demo.json.error, guard.ERRORS.turnstile);
    });

    await check('demo rate limit returns 429', async () => {
      await clearStores();
      for (let i = 0; i < 8; i += 1) {
        const res = await request(port, {
          method: 'POST',
          path: '/api/demos/submit',
          body: freshDemo({ 'cf-turnstile-response': '' }),
        });
        assert.strictEqual(res.status, 400);
      }
      const limited = await request(port, {
        method: 'POST',
        path: '/api/demos/submit',
        body: freshDemo(),
      });
      assert.strictEqual(limited.status, 429);
      assert.strictEqual((await db.get('demos')).length, 0);
      assert.strictEqual(sent.length, 0);
    });

    await check('production without a secret fails closed', async () => {
      await clearStores();
      process.env.NODE_ENV = 'production';
      process.env.VERCEL_ENV = 'production';
      delete process.env.TURNSTILE_SECRET_KEY;
      delete process.env.TURNSTILE_SITE_KEY;
      assert.strictEqual(guard.isProductionDeployment(), true);
      try {
        const res = await request(port, { method: 'POST', path: '/api/contact', body: freshContact() });
        assert.strictEqual(res.status, 503);
        assert.strictEqual(res.json.error, guard.ERRORS.unconfigured);
        assert.strictEqual(verifyCalls.length, 0);
        assert.strictEqual(sent.length, 0);
        assert.strictEqual((await db.get('contactMessages')).length, 0);
        const key = await request(port, { path: '/api/turnstile/sitekey' });
        assert.strictEqual(key.status, 503);
        assert.ok(!key.text.includes(guard.TEST_SECRET));
      } finally {
        delete process.env.VERCEL_ENV;
        delete process.env.NODE_ENV;
      }
    });

    await check('preview and dev fall back to the always-pass test keys', async () => {
      await clearStores();
      process.env.NODE_ENV = 'production';
      process.env.VERCEL_ENV = 'preview';
      delete process.env.TURNSTILE_SECRET_KEY;
      delete process.env.TURNSTILE_SITE_KEY;
      assert.strictEqual(guard.isProductionDeployment(), false);
      try {
        const key = await request(port, { path: '/api/turnstile/sitekey' });
        assert.strictEqual(key.status, 200);
        assert.strictEqual(key.json.siteKey, guard.TEST_SITEKEY);
        assert.ok(!key.text.includes(guard.TEST_SECRET));
        assert.ok(String(key.headers['cache-control']).includes('no-store'));
        const res = await request(port, { method: 'POST', path: '/api/contact', body: freshContact() });
        assert.strictEqual(res.status, 201, JSON.stringify(res.json));
        assert.strictEqual(verifyCalls[0].secret, guard.TEST_SECRET);
      } finally {
        delete process.env.VERCEL_ENV;
        delete process.env.NODE_ENV;
      }
    });

    await check('configured keys are used and the secret is not published', async () => {
      await clearStores();
      process.env.TURNSTILE_SITE_KEY = 'site-live-key';
      process.env.TURNSTILE_SECRET_KEY = 'secret-live-key';
      try {
        const key = await request(port, { path: '/api/turnstile/sitekey' });
        assert.strictEqual(key.json.siteKey, 'site-live-key');
        assert.ok(!key.text.includes('secret-live-key'));
        const res = await request(port, { method: 'POST', path: '/api/demos/submit', body: freshDemo() });
        assert.strictEqual(res.status, 201, JSON.stringify(res.json));
        assert.strictEqual(verifyCalls[0].secret, 'secret-live-key');
        assert.ok(sent.includes('sendDemoSubmissionConfirmation'));
      } finally {
        delete process.env.TURNSTILE_SITE_KEY;
        delete process.env.TURNSTILE_SECRET_KEY;
      }
    });

    console.log(`\n${results.length} checks passed`);
  } catch (error) {
    console.error('FAIL', error);
    process.exitCode = 1;
  } finally {
    guard.setSiteverify(null);
    Object.keys(originals).forEach((name) => { mailer[name] = originals[name]; });
    collections.forEach((name) => {
      const file = path.join(dataDir, name + '.json');
      if (backups[name] == null) fs.rmSync(file, { force: true });
      else fs.writeFileSync(file, backups[name]);
    });
    server.close();
  }
})();
