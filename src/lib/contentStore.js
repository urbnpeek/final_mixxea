/**
 * One Redis (or local) key per release, post, and staff user.
 * Saves compare the caller's rev and return a conflict instead of overwriting.
 */

const { getKey, setKey, delKey, compareAndSet } = require('./kvRecords');
const { legacyRelease, legacyPost, reloadMessage } = require('./contentModel');

const KINDS = {
  release: { record: 'release:', index: 'idx:releases', slugs: 'slug:releases', legacy: 'releases' },
  post: { record: 'post:', index: 'idx:posts', slugs: 'slug:posts', legacy: 'news' },
  staff: { record: 'staff:', index: 'idx:staff', slugs: '', legacy: '' },
};

function meta(kind) {
  const found = KINDS[kind];
  if (!found) throw new Error('Unknown content kind: ' + kind);
  return found;
}

async function hasIndex(kind) {
  const ids = await getKey(meta(kind).index);
  return Array.isArray(ids);
}

async function list(kind) {
  const ids = await getKey(meta(kind).index);
  if (!Array.isArray(ids)) return null;
  const items = [];
  for (const id of ids) {
    const doc = await getKey(meta(kind).record + id);
    if (doc) items.push(doc);
  }
  return items;
}

async function getById(kind, id) {
  if (!id) return null;
  return getKey(meta(kind).record + id);
}

async function slugMap(kind) {
  const map = await getKey(meta(kind).slugs);
  return map && typeof map === 'object' && !Array.isArray(map) ? map : {};
}

async function getBySlug(kind, slug) {
  const map = await slugMap(kind);
  const id = map[slug];
  if (!id) return null;
  const doc = await getById(kind, id);
  if (!doc) return null;
  return { doc, redirect: doc.slug !== slug };
}

function conflictError(cas) {
  const error = new Error(cas && cas.missing ? 'Not found' : reloadMessage(cas));
  error.status = cas && cas.missing ? 404 : 409;
  error.code = cas && cas.missing ? 'missing' : 'reload';
  error.rev = cas && cas.rev;
  error.updatedBy = cas && cas.updatedBy;
  error.updatedAt = cas && cas.updatedAt;
  return error;
}

async function writeSlugMap(kind, doc) {
  const spec = meta(kind);
  if (!spec.slugs) return;
  const map = await slugMap(kind);
  for (const [slug, id] of Object.entries(map)) {
    if (id === doc.id) delete map[slug];
  }
  if (doc.slug) map[doc.slug] = doc.id;
  for (const prev of doc.previousSlugs || []) {
    if (prev && !map[prev]) map[prev] = doc.id;
  }
  await setKey(spec.slugs, map);
}

async function touchIndex(kind, id, remove) {
  const key = meta(kind).index;
  const current = await getKey(key);
  let ids = Array.isArray(current) ? current.filter((item) => item !== id) : [];
  if (!remove) ids = [id, ...ids];
  await setKey(key, ids);
}

async function assertSlugFree(kind, doc) {
  const spec = meta(kind);
  if (!spec.slugs || !doc.slug) return;
  const map = await slugMap(kind);
  const owner = map[doc.slug];
  if (owner && owner !== doc.id) {
    const error = new Error('Slug already in use');
    error.status = 409;
    error.code = 'slug';
    throw error;
  }
}

async function save(kind, doc, expectedRev) {
  await assertSlugFree(kind, doc);
  const cas = await compareAndSet(meta(kind).record + doc.id, expectedRev, doc);
  if (!cas.ok) throw conflictError(cas);
  await writeSlugMap(kind, doc);
  await touchIndex(kind, doc.id, false);
  return doc;
}

async function remove(kind, id) {
  const doc = await getById(kind, id);
  await delKey(meta(kind).record + id);
  const spec = meta(kind);
  if (spec.slugs) {
    const map = await slugMap(kind);
    for (const [slug, owner] of Object.entries(map)) {
      if (owner === id) delete map[slug];
    }
    await setKey(spec.slugs, map);
  }
  await touchIndex(kind, id, true);
  return doc;
}

function readLegacy(collection) {
  const db = require('../api/db');
  return db.getRaw(collection);
}

async function seedKind(kind, legacyItems, apply) {
  const spec = meta(kind);
  const indexed = await hasIndex(kind);
  const existingIds = indexed ? await getKey(spec.index) : [];
  const rows = [];
  const toWrite = [];
  for (const raw of Array.isArray(legacyItems) ? legacyItems : []) {
    if (!raw || typeof raw !== 'object') continue;
    const doc = kind === 'release' ? legacyRelease(raw) : legacyPost(raw);
    if (!doc.id || !doc.title) {
      rows.push({ action: 'skip-invalid', title: doc.title || '' });
      continue;
    }
    const existing = await getById(kind, doc.id);
    if (existing) {
      rows.push({ id: doc.id, slug: existing.slug, title: existing.title, action: 'skip' });
      continue;
    }
    rows.push({ id: doc.id, slug: doc.slug, title: doc.title, action: apply ? 'write' : 'would-write' });
    if (apply) toWrite.push(doc);
  }
  if (apply) {
    for (const doc of toWrite) {
      const cas = await compareAndSet(spec.record + doc.id, 0, doc);
      if (!cas.ok) {
        rows.push({ id: doc.id, slug: doc.slug, action: 'skip-conflict' });
        continue;
      }
      await writeSlugMap(kind, doc);
    }
    const ids = Array.isArray(existingIds) ? [...existingIds] : [];
    for (const doc of toWrite) {
      if (!ids.includes(doc.id)) ids.push(doc.id);
    }
    await setKey(spec.index, ids);
  }
  return {
    kind,
    legacy: spec.legacy,
    legacyCount: Array.isArray(legacyItems) ? legacyItems.length : 0,
    alreadyStored: rows.filter((row) => row.action === 'skip').length,
    pending: rows.filter((row) => row.action === 'would-write' || row.action === 'write').length,
    rows,
  };
}

async function migrateContent({ apply = false } = {}) {
  const [releases, news] = await Promise.all([
    readLegacy('releases'),
    readLegacy('news'),
  ]);
  const releaseReport = await seedKind('release', releases, apply);
  const postReport = await seedKind('post', news, apply);
  return {
    mode: apply ? 'apply' : 'dry-run',
    releases: releaseReport,
    posts: postReport,
  };
}

async function ensureSeeded(kind) {
  if (kind === 'staff') {
    if (!(await hasIndex('staff'))) await setKey(meta('staff').index, []);
    return;
  }
  if (await hasIndex(kind)) return;
  const spec = meta(kind);
  const legacy = await readLegacy(spec.legacy);
  await seedKind(kind, legacy, true);
}

async function findStaffByEmail(email) {
  const wanted = String(email || '').trim().toLowerCase();
  if (!wanted) return null;
  const people = await list('staff');
  if (!people) return null;
  return people.find((person) => String(person.email || '').toLowerCase() === wanted) || null;
}

module.exports = {
  hasIndex,
  list,
  getById,
  getBySlug,
  save,
  remove,
  migrateContent,
  ensureSeeded,
  findStaffByEmail,
  seedKind,
};
