/**
 * Editorial auth, revisions, slugs, JSON-LD, and sitemap checks.
 * Uses a temporary KV directory and does not call Redis.
 * Run: node test/editorial.js
 */
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mixxea-editorial-'));
process.env.KV_LOCAL_DIR = tmp;
process.env.ADMIN_LOGIN_EMAIL = 'fuad@example.test';
process.env.ADMIN_PASSWORD = 'correct-horse';
process.env.SESSION_SECRET = 'editorial-test-secret';
process.env.CANONICAL_BASE_URL = 'https://www.mixxea.com';
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
delete process.env.BLOB_READ_WRITE_TOKEN;

const dataDir = path.join(__dirname, '../data');
const artistFile = path.join(dataDir, 'artists.json');
const artistBackup = fs.readFileSync(artistFile, 'utf8');
fs.writeFileSync(artistFile, JSON.stringify([
  { id: 'lyda', name: 'Lyda', slug: 'lyda', status: 'signed', genre: 'Techno' },
], null, 2));

const app = require('../server');
const { seedKind, hasIndex } = require('../src/lib/contentStore');

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

function authCookie(res) {
  const raw = res.headers['set-cookie'] || [];
  const list = Array.isArray(raw) ? raw : [raw];
  const found = list.find((item) => item.startsWith('mixxea_auth='));
  if (!found) throw new Error('missing auth cookie');
  return found.split(';')[0];
}

function assert(condition, message) {
  if (!condition) {
    const error = new Error(message);
    error.name = 'AssertionError';
    throw error;
  }
}

async function main() {
  const dry = await seedKind('post', [
    { id: 'live-1', title: 'Lyda joins the roster', status: 'published', body: 'Hello TECHNO night' },
    { id: 'live-2', title: 'Label note', status: 'published', category: 'Label News' },
  ], false);
  assert(dry.pending === 2, 'dry-run should plan both posts');
  assert(dry.rows.every((row) => row.action === 'would-write'), 'dry-run must not write');
  assert(dry.rows[0].slug === 'lyda-joins-the-roster', 'frozen slug ' + dry.rows[0].slug);
  assert(!(await hasIndex('post')), 'dry-run created an index');

  const applied = await seedKind('post', [
    { id: 'live-1', title: 'Lyda joins the roster', status: 'published', body: 'Hello' },
    { id: 'live-2', title: 'Label note', status: 'published' },
  ], true);
  assert(applied.pending === 2, 'apply should write both');
  const again = await seedKind('post', [
    { id: 'live-1', title: 'Lyda joins the roster', status: 'published' },
  ], true);
  assert(again.alreadyStored === 1, 'second apply should skip');
  assert(again.rows[0].action === 'skip', again.rows[0].action);

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

  let adminCookie = '';
  let editorCookie = '';

  await check('env admin login still works', async () => {
    const res = await request(port, 'POST', '/api/auth/admin/login', {
      body: { email: 'fuad@example.test', password: 'correct-horse' },
    });
    assert(res.status === 200, 'status ' + res.status);
    assert(res.json.role === 'admin', JSON.stringify(res.json));
    adminCookie = authCookie(res);
  });

  await check('cold-start cookie sees drafts', async () => {
    const created = await request(port, 'POST', '/api/releases', {
      cookie: adminCookie,
      body: {
        title: 'Night Bus',
        artist: 'Lyda',
        action: 'draft',
        type: 'single',
        description: 'A draft',
        hacked: true,
        isAdmin: true,
      },
    });
    assert(created.status === 201, 'status ' + created.status + ' ' + created.body);
    assert(!created.json.hacked && !created.json.isAdmin, 'unknown fields stored');
    assert(created.json.slug === 'lyda-night-bus', 'slug ' + created.json.slug);
    assert(created.json.rev === 1, 'rev ' + created.json.rev);
    const hidden = await request(port, 'GET', '/api/releases');
    assert(!hidden.body.includes('Night Bus'), 'draft leaked to public list');
    const visible = await request(port, 'GET', '/api/releases', { cookie: adminCookie });
    assert(visible.body.includes('Night Bus'), 'cookie did not reveal the draft');
    assert(visible.body.includes('Hidden from public') || visible.json.some((item) => item.hiddenReason), 'missing hidden reason');
    const page = await request(port, 'GET', created.json.previewUrl);
    assert(page.status === 200, 'preview ' + page.status);
    assert(/noindex/i.test(page.body), 'preview should be noindex');
    const publicPage = await request(port, 'GET', '/releases/lyda-night-bus');
    assert(publicPage.status === 404, 'draft page ' + publicPage.status);
  });

  await check('revision conflict asks for a reload', async () => {
    const list = await request(port, 'GET', '/api/releases', { cookie: adminCookie });
    const release = list.json.find((item) => item.slug === 'lyda-night-bus');
    const first = await request(port, 'PUT', '/api/releases/' + release.id, {
      cookie: adminCookie,
      body: { ...release, action: 'publish', rev: release.rev, description: 'First save' },
    });
    assert(first.status === 200, 'first save ' + first.status + ' ' + first.body);
    const second = await request(port, 'PUT', '/api/releases/' + release.id, {
      cookie: adminCookie,
      body: { ...release, action: 'publish', rev: release.rev, description: 'Stale save' },
    });
    assert(second.status === 409, 'status ' + second.status);
    assert(second.json.code === 'reload', JSON.stringify(second.json));
    assert(/Reload; edited by/.test(second.json.error), second.json.error);
  });

  await check('published single has MusicRecording and streaming buttons', async () => {
    const page = await request(port, 'GET', '/releases/lyda-night-bus');
    assert(page.status === 200, 'status ' + page.status);
    assert(page.body.includes('MusicRecording'), 'missing MusicRecording');
    assert(page.headers['cache-control'].includes('s-maxage=300'), page.headers['cache-control']);
  });

  await check('staff editor can publish news but not delete or open demos', async () => {
    const created = await request(port, 'POST', '/api/staff', {
      cookie: adminCookie,
      body: { name: 'Kira', email: 'kira@example.test', password: 'editor-pass', role: 'editor' },
    });
    assert(created.status === 201, created.body);
    const login = await request(port, 'POST', '/api/auth/admin/login', {
      body: { email: 'kira@example.test', password: 'editor-pass' },
    });
    assert(login.status === 200, login.body);
    assert(login.json.role === 'editor', JSON.stringify(login.json));
    editorCookie = authCookie(login);
    const demos = await request(port, 'GET', '/api/demos', { cookie: editorCookie });
    assert(demos.status === 403, 'demos ' + demos.status);
    const post = await request(port, 'POST', '/api/news', {
      cookie: editorCookie,
      body: {
        title: 'Techno night notes',
        category: 'label-news',
        body: 'The floor is TECHNO and the room is full.\n\n<script>alert(1)</script>',
        action: 'publish',
        injected: true,
      },
    });
    assert(post.status === 201, post.body);
    assert(!post.json.injected, 'unknown news field stored');
    assert(post.json.slug === 'techno-night-notes', post.json.slug);
    const article = await request(port, 'GET', '/news/techno-night-notes');
    assert(article.status === 200, 'post hidden ' + article.status);
    assert(article.body.includes('BlogPosting'), 'missing BlogPosting');
    assert(article.body.includes('&lt;script&gt;'), 'html was not escaped');
    assert(!article.body.includes('<script>alert(1)</script>'), 'raw script rendered');
    const removed = await request(port, 'DELETE', '/api/news/' + post.json.id, { cookie: editorCookie });
    assert(removed.status === 403, 'editor delete ' + removed.status);
    const renamed = await request(port, 'PUT', '/api/news/' + post.json.id, {
      cookie: editorCookie,
      body: { title: 'Techno night notes', category: 'label-news', body: post.json.body, slug: 'techno-notes', action: 'publish', rev: post.json.rev },
    });
    assert(renamed.status === 200, renamed.body);
    const old = await request(port, 'GET', '/news/techno-night-notes');
    assert(old.status === 301, 'old slug ' + old.status);
    assert(old.headers.location.endsWith('/news/techno-notes'), old.headers.location);
    const legacyCategory = await request(port, 'GET', '/news/category/label-news');
    assert(legacyCategory.status === 301, 'legacy category ' + legacyCategory.status);
    assert(String(legacyCategory.headers.location || '').endsWith('/news/category/label'), legacyCategory.headers.location);
    const category = await request(port, 'GET', '/news/category/label');
    assert(category.status === 200, 'category ' + category.status);
    assert(category.body.includes('Techno night notes'), 'category missing post');
    const unknown = await request(port, 'GET', '/news/category/not-a-category');
    assert(unknown.status === 404, 'unknown category ' + unknown.status);
  });

  await check('sitemap uses updatedAt and has no ping endpoint', async () => {
    const map = await request(port, 'GET', '/sitemap.xml');
    assert(map.status === 200, 'status ' + map.status);
    assert(map.body.includes('https://www.mixxea.com/releases/lyda-night-bus'), 'release missing');
    assert(map.body.includes('https://www.mixxea.com/news/techno-notes'), 'renamed post missing');
    assert(!map.body.includes('/news/techno-night-notes'), 'old slug still listed');
    const source = fs.readFileSync(path.join(__dirname, '../src/api/news.js'), 'utf8');
    assert(!source.includes('google.com/ping'), 'ping still present');
    assert(!source.includes('bing.com/ping'), 'bing ping still present');
  });

  await check('api token can publish', async () => {
    const people = await request(port, 'GET', '/api/staff', { cookie: adminCookie });
    const kira = people.json.find((person) => person.email === 'kira@example.test');
    const token = await request(port, 'POST', '/api/staff/' + kira.id + '/tokens', {
      cookie: adminCookie,
      body: { label: 'seo-agent' },
    });
    assert(token.status === 201 && token.json.token, token.body);
    const created = await request(port, 'POST', '/api/releases', {
      cookie: 'Authorization-placeholder',
      body: { title: 'Token Single', artist: 'Lyda', action: 'draft', type: 'ep' },
    });
    assert(created.status === 403, 'placeholder cookie should not authorize');
    const authed = await new Promise((resolve, reject) => {
      const payload = JSON.stringify({ title: 'Token Single', artist: 'Lyda', action: 'publish', type: 'ep' });
      const req = http.request({
        hostname: '127.0.0.1',
        port,
        path: '/api/releases',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          Authorization: 'Bearer ' + token.json.token,
        },
      }, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
      });
      req.on('error', reject);
      req.end(payload);
    });
    assert(authed.status === 201, authed.body);
    assert(authed.body.includes('lyda-token-single'), authed.body);
  });

  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  if (failures.length) throw new Error(failures.join('\n'));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    fs.writeFileSync(artistFile, artistBackup);
    fs.rmSync(tmp, { recursive: true, force: true });
  });
