/**
 * Diagnostic routes are admin-only, read-only on GET, and never echo secrets.
 * Run: node test/status-routes.js
 */
const assert = require('assert');
const http = require('http');

delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
delete process.env.RESEND_API_KEY;
delete process.env.BLOB_READ_WRITE_TOKEN;
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_ANON_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const BLOB_TOKEN = 'LEAKPROBEBLOB9f3c1aTOKENVALUE';
const KV_TOKEN = 'LEAKPROBEKV9f3c1aTOKENVALUE';
const ANON_KEY = 'LEAKPROBESUPABASEANON9f3c1aYYREST';
const SERVICE_KEY = 'LEAKPROBESERVICEKEY9f3c1aVALUE';
const PROBES = [
  BLOB_TOKEN,
  BLOB_TOKEN.slice(0, 20),
  KV_TOKEN,
  KV_TOKEN.slice(0, 20),
  ANON_KEY,
  ANON_KEY.slice(0, 30),
  SERVICE_KEY,
  SERVICE_KEY.slice(0, 20),
  'tokenStart',
  'anonKeyStart',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  'cskhkzscjsgkzghdmyfo',
];

process.env.ADMIN_LOGIN_EMAIL = 'status-admin@example.test';
process.env.ADMIN_PASSWORD = 'status-test-pw';
delete process.env.ADMIN_EMAIL;
process.env.VERCEL_BLOB_RETRIES = '0';

const app = require('../server');

const ROUTES = [
  ['GET', '/api/blob-status'],
  ['POST', '/api/blob-status'],
  ['GET', '/api/db-status'],
  ['POST', '/api/db-status'],
  ['GET', '/api/supabase/status'],
  ['GET', '/api/supabase/config'],
  ['GET', '/api/supabase/ping'],
];

function listen(handler) {
  const server = http.createServer(handler);
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

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

function assertNoSecrets(text) {
  PROBES.forEach((probe) => {
    assert.ok(!text.includes(probe), 'response contained secret fragment ' + probe);
  });
}

function assertRejected(res) {
  assert.ok(res.status === 401 || res.status === 403, 'expected 401 or 403, got ' + res.status + ' ' + res.text);
  assert.deepStrictEqual(res.json, { error: 'Admin access required' });
  assertNoSecrets(res.text);
  assert.ok(!res.text.includes('configured'));
  assert.ok(!res.text.includes('reachable'));
  assert.ok(!res.text.includes('writeOk'));
}

function assertBooleans(json, allowed) {
  assert.deepStrictEqual(Object.keys(json).sort(), allowed.slice().sort());
  for (const key of Object.keys(json)) {
    const value = json[key];
    assert.ok(typeof value === 'boolean' || typeof value === 'number', key + ' is ' + typeof value);
  }
  assertNoSecrets(JSON.stringify(json));
}

(async () => {
  const blobCalls = [];
  const redisCalls = [];
  const redisStore = new Map();
  const supabaseCalls = [];

  const blobServer = await listen(async (req, res) => {
    const body = await readBody(req);
    blobCalls.push({ method: req.method, url: req.url || '', body });
    res.setHeader('content-type', 'application/json');
    if (req.method === 'PUT') {
      res.end(JSON.stringify({
        url: 'http://127.0.0.1/__ping__/probe.txt',
        downloadUrl: 'http://127.0.0.1/__ping__/probe.txt?download=1',
        pathname: '__ping__/probe.txt',
        contentType: 'text/plain',
        contentDisposition: 'inline',
        etag: 'etag',
      }));
      return;
    }
    if (req.method === 'POST') {
      res.end('{}');
      return;
    }
    res.end(JSON.stringify({ blobs: [], hasMore: false }));
  });

  const redisServer = await listen(async (req, res) => {
    const body = await readBody(req);
    redisCalls.push({ method: req.method, url: req.url || '', body });
    res.setHeader('content-type', 'application/json');
    if (req.method === 'POST') {
      let cmd = [];
      try { cmd = JSON.parse(body); } catch (e) { cmd = []; }
      const name = String(cmd[0] || '').toUpperCase();
      if (name === 'PING') return res.end(JSON.stringify({ result: 'PONG' }));
      if (name === 'SET') {
        redisStore.set(cmd[1], cmd[2]);
        return res.end(JSON.stringify({ result: 'OK' }));
      }
      if (name === 'DEL') {
        redisStore.delete(cmd[1]);
        return res.end(JSON.stringify({ result: 1 }));
      }
    }
    if (req.method === 'GET' && (req.url || '').startsWith('/get/')) {
      const key = decodeURIComponent((req.url || '').slice('/get/'.length));
      return res.end(JSON.stringify({ result: redisStore.has(key) ? redisStore.get(key) : null }));
    }
    res.statusCode = 400;
    res.end(JSON.stringify({ result: null }));
  });

  const supabaseServer = await listen(async (req, res) => {
    supabaseCalls.push({
      method: req.method,
      url: req.url || '',
      apikey: req.headers.apikey || '',
      authorization: req.headers.authorization || '',
    });
    res.setHeader('content-type', 'application/json');
    res.end('[]');
  });

  const blobPort = blobServer.address().port;
  const redisPort = redisServer.address().port;
  const supabasePort = supabaseServer.address().port;

  process.env.VERCEL_BLOB_API_URL = 'http://127.0.0.1:' + blobPort;
  process.env.BLOB_READ_WRITE_TOKEN = BLOB_TOKEN;
  process.env.KV_REST_API_URL = 'http://127.0.0.1:' + redisPort;
  process.env.KV_REST_API_TOKEN = KV_TOKEN;
  process.env.SUPABASE_URL = 'http://127.0.0.1:' + supabasePort;
  process.env.SUPABASE_ANON_KEY = ANON_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_KEY;

  const server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const { port } = server.address();
  const results = [];
  const check = async (name, fn) => { await fn(); results.push(name); console.log('ok -', name); };

  try {
    await check('signed-out diagnostic routes are rejected and leak nothing', async () => {
      for (const [method, path] of ROUTES) {
        const res = await request(port, { method, path });
        assertRejected(res);
      }
      const forged = await request(port, {
        method: 'GET',
        path: '/api/blob-status',
        cookie: 'mixxea_auth=admin:1.forged',
      });
      assertRejected(forged);
      assert.strictEqual(blobCalls.length, 0);
      assert.strictEqual(redisCalls.length, 0);
      assert.strictEqual(supabaseCalls.length, 0);
      assert.strictEqual(redisStore.size, 0);
    });

    const admin = await request(port, {
      method: 'POST',
      path: '/api/auth/admin/login',
      body: { email: 'status-admin@example.test', password: 'status-test-pw' },
    });
    assert.strictEqual(admin.status, 200);
    const cookie = admin.cookie;

    await check('admin blob GET only lists and returns booleans', async () => {
      blobCalls.length = 0;
      const res = await request(port, { method: 'GET', path: '/api/blob-status', cookie });
      assert.strictEqual(res.status, 200);
      assertBooleans(res.json, ['configured', 'reachable']);
      assert.strictEqual(res.json.configured, true);
      assert.strictEqual(res.json.reachable, true);
      assert.ok(blobCalls.length > 0);
      blobCalls.forEach((call) => assert.strictEqual(call.method, 'GET', call.method + ' ' + call.url));
    });

    await check('admin blob POST writes then deletes', async () => {
      blobCalls.length = 0;
      const res = await request(port, { method: 'POST', path: '/api/blob-status', cookie });
      assert.strictEqual(res.status, 200);
      assertBooleans(res.json, ['configured', 'writeOk']);
      assert.strictEqual(res.json.writeOk, true);
      assert.ok(blobCalls.some((call) => call.method === 'PUT'));
      const deleted = blobCalls.find((call) => call.method === 'POST' && call.url.startsWith('/delete'));
      assert.ok(deleted, 'probe object was not deleted');
      const payload = JSON.parse(deleted.body);
      assert.ok(Array.isArray(payload.urls) && payload.urls.length === 1);
    });

    await check('admin db GET only pings', async () => {
      redisCalls.length = 0;
      redisStore.clear();
      const res = await request(port, { method: 'GET', path: '/api/db-status', cookie });
      assert.strictEqual(res.status, 200);
      assertBooleans(res.json, ['configured', 'reachable']);
      assert.strictEqual(res.json.reachable, true);
      assert.deepStrictEqual(redisCalls.map((call) => call.method + ' ' + call.body), ['POST ["PING"]']);
      assert.strictEqual(redisStore.size, 0);
    });

    await check('admin db POST writes then deletes', async () => {
      redisCalls.length = 0;
      redisStore.clear();
      const res = await request(port, { method: 'POST', path: '/api/db-status', cookie });
      assert.strictEqual(res.status, 200);
      assertBooleans(res.json, ['configured', 'writeOk']);
      assert.strictEqual(res.json.writeOk, true);
      const commands = redisCalls
        .filter((call) => call.method === 'POST')
        .map((call) => JSON.parse(call.body)[0]);
      assert.ok(commands.includes('SET'));
      assert.ok(commands.includes('DEL'));
      assert.strictEqual(redisStore.size, 0);
    });

    await check('admin supabase routes return booleans only', async () => {
      supabaseCalls.length = 0;
      const config = await request(port, { method: 'GET', path: '/api/supabase/config', cookie });
      assert.strictEqual(config.status, 200);
      assertBooleans(config.json, ['configured', 'urlPresent', 'anonKeyPresent', 'serviceRolePresent']);
      assert.strictEqual(config.json.configured, true);
      assert.strictEqual(config.json.serviceRolePresent, true);
      assert.strictEqual(supabaseCalls.length, 0);

      const status = await request(port, { method: 'GET', path: '/api/supabase/status', cookie });
      assert.strictEqual(status.status, 200);
      assertBooleans(status.json, ['configured', 'urlPresent', 'anonKeyPresent', 'serviceRolePresent', 'reachable', 'statusCode']);
      assert.strictEqual(status.json.reachable, true);
      assert.strictEqual(status.json.statusCode, 200);

      const ping = await request(port, { method: 'GET', path: '/api/supabase/ping', cookie });
      assert.strictEqual(ping.status, 200);
      assertBooleans(ping.json, ['configured', 'reachable', 'statusCode']);
      assert.strictEqual(ping.json.reachable, true);
      supabaseCalls.forEach((call) => assert.strictEqual(call.method, 'GET'));
      assert.ok(supabaseCalls.some((call) => call.apikey === ANON_KEY));
      assertNoSecrets(status.text);
      assertNoSecrets(ping.text);
      assert.ok(!status.text.includes('127.0.0.1'));
      assert.ok(!ping.text.includes('127.0.0.1'));
    });

    await check('unconfigured checks stay boolean and do not call stores', async () => {
      delete process.env.BLOB_READ_WRITE_TOKEN;
      delete process.env.KV_REST_API_URL;
      delete process.env.KV_REST_API_TOKEN;
      const blobBefore = blobCalls.length;
      const redisBefore = redisCalls.length;
      const blob = await request(port, { method: 'GET', path: '/api/blob-status', cookie });
      const db = await request(port, { method: 'GET', path: '/api/db-status', cookie });
      const blobPost = await request(port, { method: 'POST', path: '/api/blob-status', cookie });
      const dbPost = await request(port, { method: 'POST', path: '/api/db-status', cookie });
      assert.strictEqual(blob.status, 200);
      assertBooleans(blob.json, ['configured']);
      assert.strictEqual(blob.json.configured, false);
      assertBooleans(db.json, ['configured', 'urlPresent', 'tokenPresent']);
      assert.strictEqual(db.json.configured, false);
      assert.strictEqual(db.json.urlPresent, false);
      assert.strictEqual(db.json.tokenPresent, false);
      assertBooleans(blobPost.json, ['configured', 'writeOk']);
      assert.strictEqual(blobPost.json.writeOk, false);
      assertBooleans(dbPost.json, ['configured', 'writeOk']);
      assert.strictEqual(dbPost.json.writeOk, false);
      assert.strictEqual(blobCalls.length, blobBefore);
      assert.strictEqual(redisCalls.length, redisBefore);
    });

    console.log('\n' + results.length + ' checks passed');
  } catch (e) {
    console.error('FAIL', e);
    process.exitCode = 1;
  } finally {
    server.close();
    blobServer.close();
    redisServer.close();
    supabaseServer.close();
    setTimeout(() => process.exit(process.exitCode || 0), 50);
  }
})().catch((e) => {
  console.error('FAIL', e);
  process.exit(1);
});
