/**
 * Release genre list, optional type/format, and the admin save refresh.
 * Run: node test/release-form.js
 */
const assert = require('assert');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const vm = require('vm');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mixxea-release-form-'));
process.env.KV_LOCAL_DIR = tmp;
process.env.ADMIN_LOGIN_EMAIL = 'fuad@example.test';
process.env.ADMIN_PASSWORD = 'correct-horse';
process.env.SESSION_SECRET = 'release-form-test-secret';
process.env.CANONICAL_BASE_URL = 'https://www.mixxea.com';
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
delete process.env.BLOB_READ_WRITE_TOKEN;

const { RELEASE_GENRES, normalizeRelease, legacyRelease } = require('../src/lib/contentModel');
const { renderReleasePage } = require('../src/render/catalogPages');
const app = require('../server');

const PREVIOUS_GENRES = [
  'Techno',
  'Deep House',
  'Minimal',
  'Ambient',
  'Bass',
  'Industrial',
  'Melodic House',
  'Experimental',
];

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

function releaseOptions(html, id) {
  const match = String(html).match(new RegExp('<select id="' + id + '">([\\s\\S]*?)</select>'));
  assert.ok(match, id + ' select missing');
  return [...match[1].matchAll(/<option\b([^>]*)>([^<]*)<\/option>/g)].map((item) => {
    const attrs = item[1] || '';
    const value = attrs.match(/\bvalue="([^"]*)"/);
    return {
      value: value ? value[1] : item[2],
      label: item[2],
    };
  });
}

function pageRelease(extra) {
  return {
    title: 'Glass Room',
    artist: 'Ada',
    slug: 'ada-glass-room',
    status: 'published',
    genre: 'Tech House',
    catalogueOnly: true,
    date: '2026-04-01',
    label: 'Mixxea Records',
    ...extra,
  };
}

function loadAdminForSave() {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) {
      elements.set(id, {
        id,
        value: '',
        checked: false,
        files: [],
        style: { display: 'none' },
        dataset: {},
        textContent: '',
        innerHTML: '',
        classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
        addEventListener() {},
        scrollIntoView() {},
        appendChild() {},
        remove() {},
      });
    }
    return elements.get(id);
  }
  element('rel-title').value = 'Glass Room';
  element('rel-artist').value = 'Ada';
  element('rel-genre').value = 'Tech House';
  element('rel-type').value = '';

  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    FormData,
    JSON,
    fetch: async () => ({
      ok: true,
      status: 201,
      text: async () => JSON.stringify({ id: 'rel-1', title: 'Glass Room' }),
    }),
    document: {
      addEventListener() {},
      createElement() {
        return { style: {}, textContent: '', remove() {} };
      },
      head: { appendChild() {} },
      body: { appendChild() {}, style: {} },
      getElementById(id) { return element(id); },
      querySelector() { return null; },
      querySelectorAll() { return []; },
    },
  };
  sandbox.window = sandbox;
  sandbox.addEventListener = () => {};
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/js/admin.js'), 'utf8'), sandbox, { filename: 'admin.js' });
  return sandbox;
}

async function main() {
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

  await check('genre list keeps the previous options and adds Tech House', async () => {
    assert.deepStrictEqual(RELEASE_GENRES.slice(0, PREVIOUS_GENRES.length), PREVIOUS_GENRES);
    assert.ok(RELEASE_GENRES.includes('Tech House'));
    const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
    const genres = releaseOptions(html, 'rel-genre').map((option) => option.label);
    assert.deepStrictEqual(genres, [...RELEASE_GENRES]);
    assert.ok(html.includes('<span class="gtag">Tech House</span>'));
    assert.ok(html.includes('data-f="tech house">Tech House</button>'));
    assert.ok(html.includes('data-f="techno">Techno</button>'));
    assert.ok(html.includes('data-f="house">House</button>'));
    assert.ok(html.includes('data-f="ambient">Ambient</button>'));
  });

  await check('type can be blank in the admin dropdown', async () => {
    const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
    const types = releaseOptions(html, 'rel-type');
    assert.deepStrictEqual(types.map((option) => option.label), ['(not set)', 'Single', 'EP', 'Album', 'Compilation', 'Remix']);
    assert.strictEqual(types[0].value, '');
    assert.deepStrictEqual(types.slice(1).map((option) => option.value), ['single', 'ep', 'album', 'compilation', 'remix']);
  });

  await check('empty and missing type stay empty and existing types stay', async () => {
    const blank = normalizeRelease({
      title: 'Glass Room',
      artist: 'Ada',
      genre: 'tech house',
      type: '',
      action: 'publish',
    }, null, { name: 'Admin' });
    assert.strictEqual(blank.type, '');
    assert.strictEqual(blank.genre, 'Tech House');
    const missing = normalizeRelease({ title: 'Glass Room', artist: 'Ada', action: 'draft' }, null, { name: 'Admin' });
    assert.strictEqual(missing.type, '');
    const kept = normalizeRelease({ title: 'Glass Room', artist: 'Ada', action: 'publish' }, { ...blank, type: 'ep' }, { name: 'Admin' });
    assert.strictEqual(kept.type, 'ep');
    const cleared = normalizeRelease({ title: 'Glass Room', artist: 'Ada', type: '   ', action: 'publish' }, kept, { name: 'Admin' });
    assert.strictEqual(cleared.type, '');
    const other = normalizeRelease({ title: 'Naka', artist: 'Ada', genre: 'Afro House', type: 'single', action: 'publish' }, null, { name: 'Admin' });
    assert.strictEqual(other.genre, 'Afro House');
    assert.strictEqual(other.type, 'single');
    const imported = legacyRelease({ title: 'Older', artist: 'Ada', genre: 'Techno' });
    assert.strictEqual(imported.type, 'single');
    assert.strictEqual(imported.genre, 'Techno');
  });

  await check('public release page hides Format when type is empty', async () => {
    const hidden = renderReleasePage(pageRelease({ type: '' }), [], {});
    assert.ok(!hidden.includes('<dt>Format</dt>'), hidden.slice(hidden.indexOf('<dl'), hidden.indexOf('</dl>') + 5));
    assert.ok(hidden.includes('Tech House'));
    const shown = renderReleasePage(pageRelease({ type: 'single', format: 'single' }), [], {});
    assert.ok(shown.includes('<dt>Format</dt>'));
    assert.ok(shown.includes('<dd>Single</dd>'));
    const formatOnly = pageRelease({ format: 'ep' });
    delete formatOnly.type;
    const legacy = renderReleasePage(formatOnly, [], {});
    assert.ok(legacy.includes('<dt>Format</dt>'));
    assert.ok(legacy.includes('<dd>EP</dd>'));
  });

  await check('save refreshes the release list without this', async () => {
    const sandbox = loadAdminForSave();
    const script = fs.readFileSync(path.join(__dirname, '../public/js/admin.js'), 'utf8');
    const save = script.slice(script.indexOf('async saveRelease'), script.indexOf('async editRelease'));
    assert.ok(save.includes('ADMIN.loadReleases()'));
    assert.ok(!save.includes('this.loadReleases'));
    let refreshed = 0;
    sandbox.ADMIN.loadReleases = async () => { refreshed += 1; };
    const lost = { loadReleases() { throw new Error('this.loadReleases is not a function'); } };
    await sandbox.ADMIN.saveRelease.call(lost, 'draft');
    sandbox.document.getElementById('rel-title').value = 'Glass Room';
    sandbox.document.getElementById('rel-artist').value = 'Ada';
    await sandbox.ADMIN.saveRelease.call(sandbox, 'publish');
    assert.strictEqual(refreshed, 2);
  });

  const server = await new Promise((resolve) => {
    const handle = app.listen(0, '127.0.0.1', () => resolve(handle));
  });
  const port = server.address().port;
  let adminCookie = '';

  await check('admin page offers Tech House and a blank type', async () => {
    const page = await request(port, 'GET', '/admin');
    assert.strictEqual(page.status, 200);
    const genres = releaseOptions(page.body, 'rel-genre').map((option) => option.label);
    assert.deepStrictEqual(genres, [...RELEASE_GENRES]);
    const types = releaseOptions(page.body, 'rel-type');
    assert.strictEqual(types[0].label, '(not set)');
    assert.strictEqual(types[0].value, '');
  });

  await check('API accepts Tech House and an empty or missing type', async () => {
    const login = await request(port, 'POST', '/api/auth/admin/login', {
      body: { email: 'fuad@example.test', password: 'correct-horse' },
    });
    assert.strictEqual(login.status, 200);
    adminCookie = authCookie(login);
    const created = await request(port, 'POST', '/api/releases', {
      cookie: adminCookie,
      body: {
        title: 'Glass Room',
        artist: 'Ada',
        genre: 'Tech House',
        type: '',
        action: 'publish',
        catalogueOnly: true,
      },
    });
    assert.strictEqual(created.status, 201, created.body);
    assert.strictEqual(created.json.genre, 'Tech House');
    assert.strictEqual(created.json.type, '');
    const omitted = await request(port, 'POST', '/api/releases', {
      cookie: adminCookie,
      body: {
        title: 'North Line',
        artist: 'Ada',
        genre: 'Techno',
        action: 'publish',
        catalogueOnly: true,
      },
    });
    assert.strictEqual(omitted.status, 201, omitted.body);
    assert.strictEqual(omitted.json.type, '');
    assert.strictEqual(omitted.json.genre, 'Techno');
    const typed = await request(port, 'PUT', '/api/releases/' + omitted.json.id, {
      cookie: adminCookie,
      body: {
        title: 'North Line',
        artist: 'Ada',
        genre: 'Techno',
        type: 'single',
        action: 'publish',
        catalogueOnly: true,
        rev: omitted.json.rev,
      },
    });
    assert.strictEqual(typed.status, 200, typed.body);
    assert.strictEqual(typed.json.type, 'single');
    const kept = await request(port, 'PUT', '/api/releases/' + typed.json.id, {
      cookie: adminCookie,
      body: {
        title: 'North Line',
        artist: 'Ada',
        genre: 'Techno',
        action: 'publish',
        catalogueOnly: true,
        rev: typed.json.rev,
      },
    });
    assert.strictEqual(kept.status, 200, kept.body);
    assert.strictEqual(kept.json.type, 'single');
    const filtered = await request(port, 'GET', '/api/releases?genre=Tech%20House');
    assert.strictEqual(filtered.status, 200);
    assert.ok(filtered.body.includes('Glass Room'));
    assert.ok(!filtered.body.includes('North Line'));
  });

  await check('public pages filter Tech House and hide a blank format', async () => {
    const page = await request(port, 'GET', '/releases/ada-glass-room');
    assert.strictEqual(page.status, 200, page.body.slice(0, 180));
    assert.ok(page.body.includes('Tech House'));
    assert.ok(!page.body.includes('<dt>Format</dt>'));
    const single = await request(port, 'GET', '/releases/ada-north-line');
    assert.strictEqual(single.status, 200);
    assert.ok(single.body.includes('<dt>Format</dt>'));
    assert.ok(single.body.includes('<dd>Single</dd>'));
    const index = await request(port, 'GET', '/releases?genre=Tech%20House');
    assert.strictEqual(index.status, 200);
    assert.ok(index.body.includes('Glass Room'));
    assert.ok(index.body.includes('>Tech House</a>'));
    assert.ok(!index.body.includes('North Line'));
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
    fs.rmSync(tmp, { recursive: true, force: true });
  });
