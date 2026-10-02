/**
 * Local stand-in for the Vercel preview.
 * Loads the redesign fixtures into data/*.json, sets VERCEL_ENV=preview,
 * and restores the JSON files on exit. Refuses to start when Redis credentials
 * are present, so this process cannot read or write production KV.
 *
 *   node scripts/serve-redesign-preview.js
 */

const fs = require('fs');
const path = require('path');

const redisKeys = ['KV_REST_API_URL', 'KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'];
if (redisKeys.some((key) => process.env[key])) {
  console.error('Refusing to start: Redis credentials are set. Unset them before this local preview.');
  process.exit(1);
}

process.env.VERCEL_ENV = 'preview';
process.env.CANONICAL_BASE_URL = 'https://www.mixxea.com';

const dataDir = path.join(__dirname, '../data');
const fixtureDir = path.join(__dirname, '../test/fixtures/redesign');
const names = ['artists.json', 'releases.json', 'news.json', 'events.json'];
const backups = {};

for (const name of names) {
  const file = path.join(dataDir, name);
  backups[name] = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

const news = JSON.parse(fs.readFileSync(path.join(fixtureDir, 'news.json'), 'utf8'));
const hopperman = news.find((item) => item.id === 'post-hopperman');
if (hopperman) {
  hopperman.image = '/img/news/hopperman-16x9.webp';
  hopperman.imageAlt = 'David Hopperman, portrait';
  hopperman.excerpt = 'David Hopperman is now on the Mixxea roster.';
}
news.push({
  id: 'post-wally',
  title: 'Wally Lopez Joins the Mixxea Artist Roster',
  slug: 'wally-lopez-joins-the-mixxea-artist-roster',
  status: 'published',
  category: 'artists',
  date: '2026-06-18',
  author: 'Mixxea Records',
  excerpt: 'Wally Lopez is now on the Mixxea roster.',
  body: 'Wally Lopez is now on the Mixxea roster.',
});

fs.writeFileSync(path.join(dataDir, 'artists.json'), fs.readFileSync(path.join(fixtureDir, 'artists.json')));
fs.writeFileSync(path.join(dataDir, 'releases.json'), fs.readFileSync(path.join(fixtureDir, 'releases.json')));
fs.writeFileSync(path.join(dataDir, 'events.json'), fs.readFileSync(path.join(fixtureDir, 'events.json')));
fs.writeFileSync(path.join(dataDir, 'news.json'), JSON.stringify(news, null, 2));

function restore() {
  for (const [name, content] of Object.entries(backups)) {
    const file = path.join(dataDir, name);
    if (content == null) fs.rmSync(file, { force: true });
    else fs.writeFileSync(file, content);
  }
}

process.on('SIGINT', () => { restore(); process.exit(0); });
process.on('SIGTERM', () => { restore(); process.exit(0); });
process.on('exit', restore);

const app = require('../server');
const port = Number(process.env.PORT) || 3456;
app.listen(port, '127.0.0.1', () => {
  console.log('redesign preview fixture on http://127.0.0.1:' + port);
});
