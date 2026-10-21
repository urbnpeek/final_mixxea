/**
 * Idempotent catalogue correction for four older Mixxea releases.
 * Dry-run is the default. It prints the Beatport cat no, link, artwork,
 * and Spotify URL each release would show, then a second pass.
 *
 * This script never contacts Redis. --apply rewrites the fixture directory
 * only. Production KV is not read or written.
 *
 *   node scripts/migrate-beatport-catnos.js
 *   node scripts/migrate-beatport-catnos.js --fixtures test/fixtures/beatport-catnos
 *   node scripts/migrate-beatport-catnos.js --fixtures <dir> --apply
 */

const fs = require('fs');
const path = require('path');
const { transform, diffPlan } = require('../src/lib/redesignData');

const REDIS_KEYS = ['KV_REST_API_URL', 'KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'];
const DEFAULT_FIXTURES = path.join(__dirname, '../test/fixtures/beatport-catnos');
const WATCHED = ['Dirty Circuit', 'Something Else', 'Naka', 'Corazon', 'American Icon (Remixes)', 'Gotta Be the One', 'Love & Fake'];
const NOT_STORED_ART = [
  ['Dirty Circuit', 'fcf98fad'],
  ['Something Else', 'ea44b5e0-c4b7-4033-befc-8d6c6b8b2326'],
  ['Naka', '611d1eb0'],
];
const RESERVED_ART = 'ba21e77a-34d7-48c0-bfe2-c8cec75823f4';
const FISHERMEN = ['5107702', '4946866'];

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
    source: 'fixtures:' + dir,
  };
}

function artOf(release) {
  return String((release && release.artwork) || (release && release.cover && release.cover.url) || '');
}

function printRelease(release) {
  const art = artOf(release);
  const spotify = String(release.spotify || (release.links && release.links.spotify) || '');
  const artNote = !art
    ? 'MISSING — placeholder'
    : (art.startsWith('/img/') || art.startsWith('/og/') ? 'repo file ' + art : 'stored ' + art);
  const spotifyNote = spotify ? 'stored ' + spotify : 'MISSING — link hidden';
  console.log('  ' + (release.catNo || '(none)') + '  ' + release.title + '  ' + release.artist);
  console.log('    beatport: ' + (release.beatport || 'MISSING'));
  console.log('    artwork: ' + artNote);
  console.log('    spotify: ' + spotifyNote);
  console.log('    catalogueOnly: ' + (release.catalogueOnly === true ? 'true' : 'false'));
  console.log('    label: ' + (release.label || ''));
}

function main() {
  if (REDIS_KEYS.some((key) => process.env[key])) {
    console.error('Refusing to run: Redis credentials are set. This script does not read or write production KV.');
    process.exitCode = 1;
    return;
  }
  const apply = process.argv.includes('--apply');
  const fixtures = path.resolve(argValue('--fixtures') || DEFAULT_FIXTURES);
  if (!fs.existsSync(fixtures)) {
    console.error('Fixtures not found: ' + fixtures);
    process.exitCode = 1;
    return;
  }
  const before = loadFixtures(fixtures);
  const after = transform(before);
  const plan = diffPlan(before, after);
  const shownSource = path.relative(process.cwd(), fixtures) || fixtures;
  console.log('beatport catalogue correction (dry-run)');
  console.log('source: fixtures:' + shownSource);
  console.log('redis: not contacted');
  if (!plan.length) console.log('no differences');
  else {
    for (const row of plan) {
      const fields = row.fields && row.fields.length ? '  [' + row.fields.join(', ') + ']' : '';
      console.log('  ' + row.action + '  ' + row.collection + '  ' + row.id + '  ' + (row.title || '') + fields);
    }
    console.log(plan.length + ' difference(s)');
  }
  console.log('release pages:');
  for (const title of WATCHED) {
    const release = after.releases.find((item) => item.title === title);
    if (!release) {
      console.log('  MISSING release ' + title);
      continue;
    }
    printRelease(release);
  }
  console.log('not stored, not used:');
  for (const [title, token] of NOT_STORED_ART) {
    const release = after.releases.find((item) => item.title === title);
    const used = release && artOf(release).includes(token);
    console.log('  ' + title + ' Beatport image ' + token + (used ? ' LEAKED into artwork' : ' — not in repo or fixture'));
    if (used) process.exitCode = 1;
  }
  const older = after.releases.filter((item) => ['FSR43', 'FSR42', 'FSR40', 'FSR037'].includes(item.catNo));
  for (const release of older) {
    if (artOf(release).includes(RESERVED_ART)) {
      console.log('shared American Icon artwork on ' + release.title);
      process.exitCode = 1;
    }
    const beatport = String(release.beatport || '');
    if (FISHERMEN.some((id) => beatport.includes(id))) {
      console.log('Fishermen Beatport id on ' + release.title);
      process.exitCode = 1;
    }
  }
  const again = diffPlan(after, transform(after));
  if (again.length) {
    console.log('second pass is not stable');
    for (const row of again) console.log('  ' + row.action + '  ' + row.collection + '  ' + row.id);
    process.exitCode = 1;
  } else {
    console.log('second pass: no further differences');
  }
  if (process.exitCode) return;
  if (!apply) {
    console.log('no changes written');
    return;
  }
  for (const name of ['artists', 'releases', 'news', 'events', 'categories']) {
    fs.writeFileSync(path.join(fixtures, name + '.json'), JSON.stringify(after[name], null, 2) + '\n');
  }
  console.log('applied to fixtures only; redis was not contacted');
}

main();
