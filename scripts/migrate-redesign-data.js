/**
 * Idempotent V02 catalogue migration.
 *
 * Dry-run is the default. It prints deletes, changes, and adds.
 * --apply writes a JSON backup of every touched record, then writes.
 * --fixtures <dir> reads JSON files and never contacts Redis, even with --apply.
 *
 *   node scripts/migrate-redesign-data.js --fixtures test/fixtures/redesign
 *   node scripts/migrate-redesign-data.js --apply
 */

const fs = require('fs');
const path = require('path');
const { transform, diffPlan, touchedRecords } = require('../src/lib/redesignData');

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

async function applyLive(before, after, plan) {
  const db = require('../src/api/db');
  const store = require('../src/lib/contentStore');
  const file = backupPath();
  writeBackup(file, {
    createdAt: new Date().toISOString(),
    source: before.source,
    plan,
    touched: touchedRecords(before, after, plan),
  });
  console.log('backup: ' + file);

  await db.set('artists', after.artists);
  await db.set('events', after.events);
  await db.set('categories', after.categories);

  if (before.indexed.release) await syncIndexed('release', before.releases, after.releases, store);
  else await db.set('releases', after.releases);

  if (before.indexed.post) await syncIndexed('post', before.news, after.news, store);
  else await db.set('news', after.news);

  console.log('applied');
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

module.exports = { loadFixtures, printPlan };
