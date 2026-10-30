/** Run: node test/privacy-jsonld.js */
const assert = require('assert');
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'privacy-jsonld-secret';
const { renderPrivacyPage, PRIVACY_DESCRIPTION } = require('../src/render/privacyPage');

const html = renderPrivacyPage();
const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
assert.strictEqual(blocks.length, 1);
const g = blocks[0]['@graph'];
assert.deepStrictEqual(g.map((n) => n['@type']), ['WebPage', 'BreadcrumbList']);
assert.strictEqual(g[0].url, 'https://www.mixxea.com/privacy');
assert.strictEqual(g[0].description, PRIVACY_DESCRIPTION);
assert.ok(html.includes(`<meta name="description" content="${PRIVACY_DESCRIPTION}">`));
assert.deepStrictEqual(g[0].publisher, { '@id': 'https://www.mixxea.com/#mixxea', legalName: 'Ronala Imobiliare SRL' });
assert.deepStrictEqual(g[1].itemListElement.map((i) => [i.position, i.name, i.item]), [
  [1, 'Mixxea', 'https://www.mixxea.com/'],
  [2, 'Privacy', 'https://www.mixxea.com/privacy'],
]);
assert.ok(!html.includes('FAQPage'));
console.log('privacy-jsonld: ok');
