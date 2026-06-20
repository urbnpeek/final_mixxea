const express   = require('express');
const multer    = require('multer');
const { v4: uuid } = require('uuid');
const db        = require('./db');
const { uploadFile } = require('./upload');
const { requireAdmin } = require('./middleware');
const slugify   = require('../utils/slugify');
const router    = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

const BASE = process.env.CANONICAL_BASE_URL || 'https://mixxea.com';

/* Ping Google + Bing to re-index the sitemap after content changes */
async function pingSitemaps() {
  const sitemap = encodeURIComponent(`${BASE}/sitemap.xml`);
  const pings = [
    `https://www.google.com/ping?sitemap=${sitemap}`,
    `https://www.bing.com/ping?sitemap=${sitemap}`,
  ];
  await Promise.allSettled(
    pings.map(url => fetch(url, { signal: AbortSignal.timeout(4000) }).catch(() => {}))
  );
}

router.get('/', async (req, res) => {
  let news = await db.get('news');
  if (!req.session.admin) news = news.filter(n => n.status === 'published');
  res.json(news);
});

router.get('/:id', async (req, res) => {
  const item = (await db.get('news')).find(n => n.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

/* Lookup by slug (used by server-side news page renderer) */
router.get('/slug/:slug', async (req, res) => {
  const news   = await db.get('news');
  const target = news.find(n =>
    (n.slug || slugify(n.title)) === req.params.slug && n.status === 'published'
  );
  if (!target) return res.status(404).json({ error: 'Not found' });
  res.json(target);
});

router.post('/', requireAdmin, upload.single('image'), async (req, res) => {
  const items    = await db.get('news');
  const imageUrl = req.file ? await uploadFile(req.file, 'news') : '';
  const title    = req.body.title || '';
  const item = {
    id:        uuid(),
    ...req.body,
    slug:      slugify(title) + (slugify(title) ? '-' : '') + Date.now().toString(36),
    image:     imageUrl,
    createdAt: new Date().toISOString(),
  };
  items.unshift(item);
  await db.set('news', items);
  if (item.status === 'published') pingSitemaps().catch(() => {});
  res.status(201).json(item);
});

router.put('/:id', requireAdmin, upload.single('image'), async (req, res) => {
  const items = await db.get('news');
  const idx   = items.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  const imageUrl = req.file ? await uploadFile(req.file, 'news') : items[idx].image;
  const wasPublished = items[idx].status === 'published';
  const nowPublished = req.body.status === 'published';

  // Regenerate slug if title changed and article doesn't have one yet
  const newSlug = (!items[idx].slug && req.body.title)
    ? slugify(req.body.title) + '-' + Date.now().toString(36)
    : items[idx].slug;

  items[idx] = {
    ...items[idx],
    ...req.body,
    slug:      newSlug,
    updatedAt: new Date().toISOString(),
    ...(req.file ? { image: imageUrl } : {}),
  };
  await db.set('news', items);

  // Ping when newly published or content changed on a published article
  if (nowPublished || (wasPublished && !nowPublished === false)) {
    pingSitemaps().catch(() => {});
  }

  res.json(items[idx]);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const items = await db.get('news');
  await db.set('news', items.filter(i => i.id !== req.params.id));
  res.json({ success: true });
});

module.exports = router;
