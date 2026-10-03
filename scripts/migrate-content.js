/**
 * Copy legacy db:releases and db:news lists into one key per record.
 *
 * Dry-run is the default. Nothing is written unless --apply is passed.
 * Safe to re-run: records that already exist are skipped.
 *
 *   node scripts/migrate-content.js
 *   node scripts/migrate-content.js --apply
 */

require('dotenv').config();
const { migrateContent } = require('../src/lib/contentStore');

function printReport(report) {
  console.log('content migration (' + report.mode + ')');
  for (const section of [report.releases, report.posts]) {
    console.log(
      section.legacy + ': ' + section.legacyCount + ' legacy, '
      + section.pending + (report.mode === 'apply' ? ' written' : ' to write') + ', '
      + section.alreadyStored + ' already stored'
    );
    for (const row of section.rows) {
      if (row.action === 'skip') continue;
      console.log('  - ' + row.action + ' ' + (row.slug || '') + (row.title ? '  ' + row.title : ''));
    }
  }
  if (report.mode === 'dry-run') console.log('no changes written');
}

async function main() {
  const apply = process.argv.includes('--apply');
  const report = await migrateContent({ apply });
  printReport(report);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { printReport };
