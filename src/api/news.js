/**
 * /api/news — editorial CRUD. Editors publish directly.
 * Field lists are whitelisted. Conflicting revs return a reload warning.
 */
const express = require('express');
const multer = require('multer');
const db = require('./db');
const { uploadFile } = require('./upload');
const { requireStaff, requireAdmin, resolveActor, isStaffActor, buildPreviewToken } = require('./middleware');
const { visibleNews, newsHiddenReason } = require('../lib/rosterCatalog');
const store = require('../lib/contentStore');
const { normalizePost } = require('../lib/contentModel');
const { renderMarkdown } = require('../lib/markdown');
const { NEWS_CATEGORIES } = require('../lib/categories');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

function sendError(res, error) {
  res.status(error.status || 500).json({
    error: error.message || 'Server error',
    ...(error.code ? { code: error.code } : {}),
    ...(error.rev != null ? { rev: error.rev } : {}),
    ...(error.updatedBy ? { updatedBy: error.updatedBy } : {}),
    ...(error.updatedAt ? { updatedAt: error.updatedAt } : {}),
  });
}

function staffView(post, artists) {
  const reason = newsHiddenReason(post, artists);
  return {
    ...post,
    hiddenReason: reason,
    previewUrl: '/news/' + post.slug + '?preview=' + encodeURIComponent(buildPreviewToken('post', post.id)),
  };
}

router.get('/categories', (req, res) => {
  res.json(NEWS_CATEGORIES);
});

router.post('/render', requireStaff, (req, res) => {
  res.json({ html: renderMarkdown(req.body && req.body.body) });
});

router.get('/', async (req, res) => {
  try {
    const actor = await resolveActor(req);
    let news = await db.get('news');
    const artists = await db.get('artists');
    if (!isStaffActor(actor)) news = visibleNews(news, artists);
    if (isStaffActor(actor)) news = news.map((item) => staffView(item, artists));
    res.json(news);
  } catch (error) {
    sendError(res, error);
  }
});

router.get('/slug/:slug', async (req, res) => {
  try {
    const artists = await db.get('artists');
    const actor = await resolveActor(req);
    const indexed = await store.getBySlug('post', req.params.slug);
    if (indexed) {
      if (indexed.redirect) return res.json({ redirect: '/news/' + indexed.doc.slug, slug: indexed.doc.slug });
      if (!isStaffActor(actor) && newsHiddenReason(indexed.doc, artists)) {
        return res.status(404).json({ error: 'Not found' });
      }
      return res.json(isStaffActor(actor) ? staffView(indexed.doc, artists) : indexed.doc);
    }
    const slugify = require('../utils/slugify');
    const item = visibleNews(await db.get('news'), artists).find((entry) =>
      (entry.slug || slugify(entry.title)) === req.params.slug
    );
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (error) {
    sendError(res, error);
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (req.params.id === 'categories' || req.params.id === 'render') return res.status(404).json({ error: 'Not found' });
    const item = await store.getById('post', req.params.id) || (await db.get('news')).find((entry) => entry.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    const artists = await db.get('artists');
    const actor = await resolveActor(req);
    if (!isStaffActor(actor) && newsHiddenReason(item, artists)) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(isStaffActor(actor) ? staffView(item, artists) : item);
  } catch (error) {
    sendError(res, error);
  }
});

const fields = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'imageThumb', maxCount: 1 },
  { name: 'ogImage', maxCount: 1 },
]);

router.post('/', requireStaff, fields, async (req, res) => {
  try {
    await store.ensureSeeded('post');
    const files = req.files || {};
    const uploads = {
      image: await uploadFile(files.image && files.image[0], 'news'),
      imageThumb: await uploadFile(files.imageThumb && files.imageThumb[0], 'news'),
      ogImage: await uploadFile(files.ogImage && files.ogImage[0], 'news'),
    };
    const post = normalizePost(req.body, null, req.actor, uploads);
    await store.save('post', post, 0);
    res.status(201).json(staffView(post, await db.get('artists')));
  } catch (error) {
    sendError(res, error);
  }
});

router.put('/:id', requireStaff, fields, async (req, res) => {
  try {
    await store.ensureSeeded('post');
    const existing = await store.getById('post', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (req.body.rev == null || req.body.rev === '' || !Number.isFinite(Number(req.body.rev))) {
      return res.status(400).json({ error: 'rev is required' });
    }
    const files = req.files || {};
    const uploads = {
      image: await uploadFile(files.image && files.image[0], 'news'),
      imageThumb: await uploadFile(files.imageThumb && files.imageThumb[0], 'news'),
      ogImage: await uploadFile(files.ogImage && files.ogImage[0], 'news'),
    };
    const post = normalizePost(req.body, existing, req.actor, uploads);
    await store.save('post', post, Number(req.body.rev));
    res.json(staffView(post, await db.get('artists')));
  } catch (error) {
    sendError(res, error);
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await store.ensureSeeded('post');
    const existing = await store.getById('post', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    await store.remove('post', req.params.id);
    res.json({ success: true });
  } catch (error) {
    sendError(res, error);
  }
});

module.exports = router;
