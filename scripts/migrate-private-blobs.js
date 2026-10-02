/**
 * Move public demo audio and contract files to private storage.
 *
 * Dry-run is the default. It prints the plan and writes nothing.
 * --apply copies each public blob to a private blob, updates the KV record,
 * and deletes the public copy only after the private copy is verified.
 * A JSON backup of the KV records is written first.
 *
 *   node scripts/migrate-private-blobs.js --fixtures test/fixtures/private-blobs
 *   node scripts/migrate-private-blobs.js --apply
 *
 * Do not run --apply until go-live. --fixtures never contacts Redis or Blob.
 */

const fs = require('fs');
const path = require('path');
const { planPrivateMigration, applyCopiedUrl, storePrivateLocal } = require('../src/lib/privateFiles');

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
  return {
    demos: readJson(path.join(dir, 'demos.json'), []),
    contracts: readJson(path.join(dir, 'contracts.json'), []),
    source: 'fixtures:' + dir,
  };
}

async function loadLive() {
  require('dotenv').config();
  const db = require('../src/api/db');
  return {
    demos: (await db.peek('demos')) || [],
    contracts: (await db.peek('contracts')) || [],
    source: db.isRedisConfigured() ? 'redis' : 'local-json',
  };
}

function printPlan(source, plan) {
  console.log('private blob migration (dry-run)');
  console.log('source: ' + source);
  if (!plan.length) {
    console.log('no public demo or contract files');
    console.log('no changes written');
    return;
  }
  for (const item of plan) {
    console.log('  copy  ' + item.collection + '  ' + item.id + '  ' + item.kind + '  ' + item.pathname);
  }
  console.log(plan.length + ' file(s)');
  console.log('no changes written');
}

function backupPath() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(__dirname, '../data/backups', 'private-blobs-' + stamp + '.json');
}

async function verifyPrivate(url) {
  const { get } = require('@vercel/blob');
  const result = await get(url, { access: 'private', token: process.env.BLOB_READ_WRITE_TOKEN });
  const size = result && result.blob ? Number(result.blob.size) : 0;
  if (!result || !result.stream || !Number.isFinite(size) || size <= 0) {
    throw new Error('Private copy could not be verified');
  }
  result.stream.cancel && result.stream.cancel();
  return size;
}

async function applyLive(data, plan) {
  const db = require('../src/api/db');
  const { copy, del } = require('@vercel/blob');
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN is not set');
  if (!db.isRedisConfigured() && data.source === 'fixtures') {
    throw new Error('Refusing to apply a fixture run');
  }

  const backup = backupPath();
  fs.mkdirSync(path.dirname(backup), { recursive: true });
  fs.writeFileSync(backup, JSON.stringify({ demos: data.demos, contracts: data.contracts }, null, 2));
  console.log('backup: ' + backup);

  const next = {
    demos: data.demos.slice(),
    contracts: data.contracts.slice(),
  };
  const copied = [];

  for (const item of plan) {
    if (item.kind === 'blob') {
      const result = await copy(item.from, item.pathname, { access: 'private', token });
      await verifyPrivate(result.url);
      next[item.collection] = applyCopiedUrl(next[item.collection], item, result.url);
      copied.push(item.from);
      continue;
    }
    const sourcePath = path.resolve(__dirname, '../public', item.from.replace(/^\/+/, ''));
    if (!fs.existsSync(sourcePath)) {
      console.log('  skip missing local file  ' + item.id);
      continue;
    }
    const buffer = fs.readFileSync(sourcePath);
    if (!buffer.length) throw new Error('Local file is empty: ' + item.from);
    const ref = storePrivateLocal(item.pathname.replace(/^private\//, ''), buffer);
    const stored = path.resolve(__dirname, '../data/private-uploads', item.pathname.replace(/^private\//, ''));
    if (!fs.existsSync(stored) || fs.statSync(stored).size !== buffer.length) {
      throw new Error('Local private copy could not be verified');
    }
    next[item.collection] = applyCopiedUrl(next[item.collection], item, ref);
    fs.unlinkSync(sourcePath);
  }

  await db.set('demos', next.demos);
  await db.set('contracts', next.contracts);

  for (const url of copied) {
    await del(url, { token });
    console.log('  deleted public  ' + url);
  }
  console.log('applied ' + plan.length + ' file(s)');
}

async function main() {
  const apply = process.argv.includes('--apply');
  const fixtures = argValue('--fixtures');
  if (apply && fixtures) {
    console.error('Refusing --apply with --fixtures. Fixtures never write Redis or Blob.');
    process.exitCode = 1;
    return;
  }
  const data = fixtures ? loadFixtures(fixtures) : await loadLive();
  const plan = planPrivateMigration(data);
  if (!apply) {
    printPlan(data.source, plan);
    return;
  }
  await applyLive(data, plan);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { loadFixtures, printPlan };
