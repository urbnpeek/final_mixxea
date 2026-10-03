/**
 * /api/releases — catalogue CRUD with per-record revisions.
 */
const express = require('express');
const multer = require('multer');
const db = require('./db');
const { uploadFile } = require('./upload');
const { requireStaff, requireAdmin, resolveActor, isStaffActor, buildPreviewToken } = require('./middleware');
const { visibleReleases, releaseHiddenReason } = require('../lib/rosterCatalog');
const store = require('../lib/contentStore');
const { normalizeRelease } = require('../lib/contentModel');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

function sendError(res, error) {
  const status = error.status || 500;
  res.status(status).json({
    error: error.message || 'Server error',
    ...(error.code ? { code: error.code } : {}),
    ...(error.rev != null ? { rev: error.rev } : {}),
    ...(error.updatedBy ? { updatedBy: error.updatedBy } : {}),
    ...(error.updatedAt ? { updatedAt: error.updatedAt } : {}),
  });
}

function staffView(release, artists) {
  const reason = releaseHiddenReason(release, artists);
  return {
    ...release,
    hiddenReason: reason,
    previewUrl: '/releases/' + release.slug + '?preview=' + encodeURIComponent(buildPreviewToken('release', release.id)),
  };
}

async function loadArtists() {
  return db.get('artists');
}

router.get('/', async (req, res) => {
  try {
    const actor = await resolveActor(req);
    let releases = await db.get('releases');
    const artists = await loadArtists();
    if (!isStaffActor(actor)) releases = visibleReleases(releases, artists);
    if (req.query.genre && req.query.genre !== 'all') {
      const genre = String(req.query.genre).toLowerCase();
      releases = releases.filter((item) => String(item.genre || '').toLowerCase().includes(genre));
    }
    if (isStaffActor(actor)) releases = releases.map((item) => staffView(item, artists));
    res.json(releases);
  } catch (error) {
    sendError(res, error);
  }
});

router.get('/slug/:slug', async (req, res) => {
  try {
    const found = await store.getBySlug('release', req.params.slug);
    const artists = await loadArtists();
    const actor = await resolveActor(req);
    if (!found) return res.status(404).json({ error: 'Not found' });
    if (found.redirect) {
      return res.json({ redirect: '/releases/' + found.doc.slug, slug: found.doc.slug });
    }
    if (!isStaffActor(actor) && releaseHiddenReason(found.doc, artists)) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(isStaffActor(actor) ? staffView(found.doc, artists) : found.doc);
  } catch (error) {
    sendError(res, error);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const release = await store.getById('release', req.params.id) || (await db.get('releases')).find((item) => item.id === req.params.id);
    if (!release) return res.status(404).json({ error: 'Not found' });
    const artists = await loadArtists();
    const actor = await resolveActor(req);
    if (!isStaffActor(actor) && releaseHiddenReason(release, artists)) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(isStaffActor(actor) ? staffView(release, artists) : release);
  } catch (error) {
    sendError(res, error);
  }
});

const fields = upload.fields([
  { name: 'artwork', maxCount: 1 },
  { name: 'artworkThumb', maxCount: 1 },
  { name: 'ogImage', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
]);

async function uploaded(files) {
  const bag = files || {};
  const [artwork, artworkThumb, ogImage, audio] = await Promise.all([
    uploadFile(bag.artwork && bag.artwork[0], 'artwork'),
    uploadFile(bag.artworkThumb && bag.artworkThumb[0], 'artwork'),
    uploadFile(bag.ogImage && bag.ogImage[0], 'artwork'),
    uploadFile(bag.audio && bag.audio[0], 'audio'),
  ]);
  return { artwork, artworkThumb, ogImage, audio };
}

router.post('/', requireStaff, fields, async (req, res) => {
  try {
    await store.ensureSeeded('release');
    const uploads = await uploaded(req.files);
    const release = normalizeRelease(req.body, null, req.actor, uploads);
    await store.save('release', release, 0);
    const artists = await loadArtists();
    res.status(201).json(staffView(release, artists));
  } catch (error) {
    sendError(res, error);
  }
});

router.put('/:id', requireStaff, fields, async (req, res) => {
  try {
    await store.ensureSeeded('release');
    const existing = await store.getById('release', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (req.body.rev == null || req.body.rev === '' || !Number.isFinite(Number(req.body.rev))) {
      return res.status(400).json({ error: 'rev is required' });
    }
    const uploads = await uploaded(req.files);
    const release = normalizeRelease({ ...req.body, id: existing.id }, existing, req.actor, uploads);
    await store.save('release', release, Number(req.body.rev));
    const artists = await loadArtists();
    res.json(staffView(release, artists));
  } catch (error) {
    sendError(res, error);
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await store.ensureSeeded('release');
    const existing = await store.getById('release', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    await store.remove('release', req.params.id);
    res.json({ success: true });
  } catch (error) {
    sendError(res, error);
  }
});

module.exports = router;
