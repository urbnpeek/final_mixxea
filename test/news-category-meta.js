const assert = require('assert');
const { renderNewsCategory, CATEGORY_META } = require('../src/render/catalogPages');

const expected = { label: 151, agency: 148 /* unchanged existing string */, releases: 133, artists: 135 };
for (const [slug, len] of Object.entries(expected)) {
  const text = CATEGORY_META[slug];
  assert(text && text.length === len, `${slug} meta length ${text && text.length}`);
  assert(text.length >= 120 && text.length <= 160, `${slug} meta 120-160`);
  assert(!/independent|owned|all rights/i.test(text), `${slug} meta wording`);
  const html = String(renderNewsCategory({ slug, name: slug[0].toUpperCase() + slug.slice(1), description: '' }, [], {}, []));
  const esc = text.replace(/&/g, '&amp;');
  assert(html.includes(`<meta name="description" content="${esc}">`) || html.includes(`content="${esc}"`), `${slug} meta rendered`);
  // A thin stored description does not override the map.
  const thin = String(renderNewsCategory({ slug, name: slug, description: 'Short.' }, [], {}, []));
  assert(thin.includes(`content="${esc}"`), `${slug} thin stored description ignored`);
}
const custom = 'x'.repeat(130);
assert(String(renderNewsCategory({ slug: 'label', name: 'Label', description: custom }, [], {}, [])).includes(`content="${custom}"`), 'stored 120-160 description wins');
console.log('ok  news category meta (4 categories, 120-160, wording, override rule)');
