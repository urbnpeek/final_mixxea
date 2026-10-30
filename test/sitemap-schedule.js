/**
 * Sitemap scheduling: news is filtered by publishedAt at request time,
 * so a scheduled post appears once its time passes, without a redeploy.
 * Run: node test/sitemap-schedule.js
 */
process.env.CANONICAL_BASE_URL = 'https://www.mixxea.com';
delete process.env.VERCEL_ENV;
const db = require('../src/api/db');
const { CODE_POSTS } = require('../src/content/codePosts');

const HOUR = 3600 * 1000;
let failures = 0;
function assert(c, m) { if (!c) throw new Error(m); }
async function check(name, fn) {
  try { await fn(); console.log('ok  ' + name); }
  catch (e) { failures++; console.error('FAIL ' + name + ': ' + e.message); }
}

const realGet = db.get;
const realNow = Date.now;
function stub(news) {
  db.get = async (c) => {
    if (c === 'news') return require('../src/content/codePosts').withCodePosts(news);
    return [];
  };
}
const { generateSitemap } = require('../src/api/seo');
const demo = CODE_POSTS.find((p) => p.slug === 'mixxea-records-demo-submissions-open');
const demoAt = Date.parse(demo.publishedAt);

(async () => {
  const base = { status: 'published', artistIds: [], artist: '' };
  const news = [
    { ...base, id: 'past', slug: 'past-post', title: 'Past', category: 'agency', publishedAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z' },
    { ...base, id: 'future', slug: 'future-post', title: 'Future', category: 'label', status: 'scheduled', publishedAt: '2099-01-01T00:00:00Z' },
    { ...base, id: 'draft', slug: 'draft-post', title: 'Draft', category: 'label', status: 'draft' },
  ];

  await check('before publishAt: demo post and label-only category excluded', async () => {
    stub(news); Date.now = () => demoAt - HOUR;
    const xml = await generateSitemap();
    assert(!xml.includes('/news/mixxea-records-demo-submissions-open'), 'scheduled demo post leaked');
    assert(!xml.includes('/news/category/label'), 'label category listed with no published label post');
    assert(xml.includes('/news/past-post'), 'past post missing');
    assert(xml.includes('/news/category/agency'), 'agency category missing');
  });

  await check('after publishAt: demo post + label category included, lastmod 2026-10-30', async () => {
    stub(news); Date.now = () => demoAt + HOUR;
    const xml = await generateSitemap();
    const m = xml.match(/<loc>https:\/\/www\.mixxea\.com\/news\/mixxea-records-demo-submissions-open<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/);
    assert(m, 'demo post missing');
    assert(m[1] === '2026-10-30', 'demo lastmod ' + m[1]);
    assert(xml.includes('https://www.mixxea.com/news/category/label</loc>'), 'label category missing');
    assert(!xml.includes('/news/future-post'), 'future post leaked');
    assert(!xml.includes('/news/draft-post'), 'draft leaked');
    assert((xml.match(/<url>/g) || []).length === (xml.match(/<\/url>/g) || []).length, 'unbalanced xml');
  });

  db.get = realGet; Date.now = realNow;
  if (failures) { console.error(failures + ' failure(s)'); process.exit(1); }
  console.log('sitemap-schedule: all passed');
})();
