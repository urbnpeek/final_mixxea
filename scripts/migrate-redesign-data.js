/**
 * Idempotent V02 catalogue migration.
 *
 * Dry-run is the default. It prints deletes, changes, and adds.
 * --apply writes a JSON backup of every touched record, then writes.
 * --fixtures <dir> reads JSON files and never contacts Redis, even with --apply.
 *
 *   node scripts/migrate-redesign-data.js --fixtures test/fixtures/redesign
 *   node scripts/migrate-redesign-data.js --apply
 *   node scripts/migrate-redesign-data.js --restore data/backups/redesign-<stamp>.json
 *
 * --restore writes the touched records from that backup back to KV.
 * It needs KV_REST_API_URL and KV_REST_API_TOKEN (or the UPSTASH_REDIS_REST_* pair).
 */

const fs = require('fs');
const path = require('path');
const { transform, diffPlan, touchedRecords, restoreCollections } = require('../src/lib/redesignData');

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return '';
  return process.argv[index + 1] || '';
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function loadFixtures(dir) {
  const read = (name) => readJson(path.join(dir, name + '.json'), []);
  return {
    artists: read('artists'),
    releases: read('releases'),
    news: read('news'),
    events: read('events'),
    categories: read('categories'),
    indexed: { release: false, post: false },
    source: 'fixtures:' + dir,
  };
}

async function loadLive() {
  require('dotenv').config();
  const db = require('../src/api/db');
  const store = require('../src/lib/contentStore');
  const indexedRelease = await store.hasIndex('release');
  const indexedPost = await store.hasIndex('post');
  const releases = indexedRelease ? await store.list('release') : await db.peek('releases');
  const news = indexedPost ? await store.list('post') : await db.peek('news');
  return {
    artists: (await db.peek('artists')) || [],
    releases: releases || [],
    news: news || [],
    events: (await db.peek('events')) || [],
    categories: (await db.peek('categories')) || [],
    indexed: { release: indexedRelease, post: indexedPost },
    source: db.isRedisConfigured() ? 'redis' : 'local-json',
  };
}

function printPlan(source, plan) {
  console.log('redesign migration (dry-run)');
  console.log('source: ' + source);
  if (!plan.length) {
    console.log('no differences');
    console.log('no changes written');
    return;
  }
  for (const row of plan) {
    const fields = row.fields && row.fields.length ? '  [' + row.fields.join(', ') + ']' : '';
    console.log('  ' + row.action + '  ' + row.collection + '  ' + row.id + '  ' + (row.title || '') + fields);
  }
  console.log(plan.length + ' difference(s)');
  console.log('no changes written');
}

function backupPath() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(__dirname, '../data/backups', 'redesign-' + stamp + '.json');
}

function writeBackup(file, payload) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(payload, null, 2));
}

async function writeLive(before, after) {
  const db = require('../src/api/db');
  const store = require('../src/lib/contentStore');
  await db.set('artists', after.artists);
  await db.set('events', after.events);
  await db.set('categories', after.categories);

  if (before.indexed.release) await syncIndexed('release', before.releases, after.releases, store);
  else await db.set('releases', after.releases);

  if (before.indexed.post) await syncIndexed('post', before.news, after.news, store);
  else await db.set('news', after.news);
}

async function applyLive(before, after, plan) {
  const file = backupPath();
  writeBackup(file, {
    createdAt: new Date().toISOString(),
    source: before.source,
    plan,
    touched: touchedRecords(before, after, plan),
  });
  console.log('backup: ' + file);
  await writeLive(before, after);
  console.log('applied');
}

async function restoreLive(file) {
  const backup = readJson(file, null);
  if (!backup || !backup.touched) {
    throw new Error('Backup must contain touched records');
  }
  const current = await loadLive();
  const restored = backup.full
    ? {
      artists: backup.touched.artists || [],
      releases: backup.touched.releases || [],
      news: backup.touched.news || [],
      events: backup.touched.events || [],
      categories: backup.touched.categories || [],
    }
    : restoreCollections(current, backup);
  if (!backup.full && !Array.isArray(backup.plan)) {
    throw new Error('Backup must contain plan and touched records');
  }
  const safety = path.join(__dirname, '../data/backups', 'redesign-prerestore-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json');
  writeBackup(safety, {
    createdAt: new Date().toISOString(),
    source: current.source,
    plan: [],
    touched: {
      artists: current.artists,
      releases: current.releases,
      news: current.news,
      events: current.events,
      categories: current.categories,
    },
    full: true,
  });
  console.log('pre-restore snapshot: ' + safety);
  await writeLive(current, restored);
  console.log('restored ' + file);
}

async function syncIndexed(kind, beforeList, afterList, store) {
  const before = Array.isArray(beforeList) ? beforeList : [];
  const after = Array.isArray(afterList) ? afterList : [];
  const kept = new Set();
  for (const next of after) {
    if (!next || !next.id) continue;
    const prev = before.find((item) => item && item.id === next.id);
    const rev = prev ? Number(prev.rev) || 0 : 0;
    const doc = { ...next, rev: rev + 1, updatedAt: new Date().toISOString() };
    await store.save(kind, doc, prev ? rev : 0);
    kept.add(next.id);
  }
  for (const prev of before) {
    if (!prev || !prev.id || kept.has(prev.id)) continue;
    await store.remove(kind, prev.id);
  }
}

function applyFixtures(dir, before, after, plan) {
  const file = path.join(dir, 'backup-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json');
  writeBackup(file, { createdAt: new Date().toISOString(), source: before.source, plan, touched: touchedRecords(before, after, plan) });
  for (const name of ['artists', 'releases', 'news', 'events', 'categories']) {
    fs.writeFileSync(path.join(dir, name + '.json'), JSON.stringify(after[name], null, 2));
  }
  console.log('backup: ' + file);
  console.log('applied to fixtures only; redis was not contacted');
}

async function main() {
  const apply = process.argv.includes('--apply');
  const fixtures = argValue('--fixtures');
  const restore = argValue('--restore');
  if (restore) {
    if (apply || fixtures) {
      console.error('Use --restore alone. It writes KV and does not take --apply or --fixtures.');
      process.exitCode = 1;
      return;
    }
    const file = path.resolve(restore);
    if (!fs.existsSync(file)) {
      console.error('Backup not found: ' + file);
      process.exitCode = 1;
      return;
    }
    await restoreLive(file);
    return;
  }
  const before = fixtures ? loadFixtures(path.resolve(fixtures)) : await loadLive();
  const after = transform(before);
  const plan = diffPlan(before, after);
  if (!apply) {
    printPlan(before.source, plan);
    return;
  }
  console.log('redesign migration (apply)');
  console.log('source: ' + before.source);
  for (const row of plan) {
    console.log('  ' + row.action + '  ' + row.collection + '  ' + row.id);
  }
  if (fixtures) applyFixtures(path.resolve(fixtures), before, after, plan);
  else await applyLive(before, after, plan);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { loadFixtures, printPlan, restoreCollections };
