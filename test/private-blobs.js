/**
 * Private-file plan. Does not contact Redis or Blob.
 * Run: node test/private-blobs.js
 */
const { spawnSync } = require('child_process');
const path = require('path');
const {
  planPrivateMigration,
  applyCopiedUrl,
  isPublicBlobUrl,
  presentRecord,
} = require('../src/lib/privateFiles');

function assert(condition, message) {
  if (!condition) {
    const error = new Error(message);
    error.name = 'AssertionError';
    throw error;
  }
}

const plan = planPrivateMigration({
  demos: [
    { id: 'd1', file: 'https://abc.public.blob.vercel-storage.com/audio/a.wav' },
    { id: 'd2', file: '' },
    { id: 'd3', file: 'https://abc.private.blob.vercel-storage.com/private/audio/b.wav' },
    { id: 'd4', file: '/uploads/audio/local.wav' },
  ],
  contracts: [
    { id: 'c1', file: 'https://abc.public.blob.vercel-storage.com/contracts/c.pdf?download=1' },
  ],
});

assert(plan.length === 3, 'plan length ' + plan.length);
assert(plan[0].collection === 'demos' && plan[0].pathname === 'private/audio/a.wav', JSON.stringify(plan[0]));
assert(plan[1].kind === 'local' && plan[1].pathname === 'private/audio/local.wav', JSON.stringify(plan[1]));
assert(plan[2].pathname === 'private/contracts/c.pdf', JSON.stringify(plan[2]));
assert(!isPublicBlobUrl('https://abc.private.blob.vercel-storage.com/audio/a.wav'), 'private host');
assert(isPublicBlobUrl(plan[0].from), 'public host');

const updated = applyCopiedUrl(
  [{ id: 'd1', file: plan[0].from, email: 'a@b.c' }],
  plan[0],
  'https://abc.private.blob.vercel-storage.com/private/audio/a.wav'
);
assert(updated[0].file.includes('.private.blob.'), updated[0].file);
assert(updated[0].email === 'a@b.c', 'other fields kept');

const presented = presentRecord(updated[0], '/api/demos/d1/file');
assert(presented.file === '/api/demos/d1/file', presented.file);
assert(!presented.file.includes('blob.vercel-storage.com'), 'raw url leaked');

const dry = spawnSync(process.execPath, [
  path.join(__dirname, '../scripts/migrate-private-blobs.js'),
  '--fixtures',
  path.join(__dirname, 'fixtures/private-blobs'),
], { encoding: 'utf8' });
assert(dry.status === 0, dry.stderr || dry.stdout);
assert(dry.stdout.includes('private blob migration (dry-run)'), dry.stdout);
assert(dry.stdout.includes('demo-public'), dry.stdout);
assert(dry.stdout.includes('contract-public'), dry.stdout);
assert(dry.stdout.includes('no changes written'), dry.stdout);
assert(!dry.stdout.includes('demo-private'), 'already private was planned');

const refused = spawnSync(process.execPath, [
  path.join(__dirname, '../scripts/migrate-private-blobs.js'),
  '--fixtures',
  path.join(__dirname, 'fixtures/private-blobs'),
  '--apply',
], { encoding: 'utf8' });
assert(refused.status === 1, 'apply with fixtures should refuse');
assert(refused.stderr.includes('Refusing --apply'), refused.stderr);

console.log('ok  private blob plan');
