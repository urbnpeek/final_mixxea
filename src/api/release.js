/**
 * release.js - public endpoints behind an approved demo's /release/<token> link.
 *   GET  /api/release/:token          prefill + state
 *   POST /api/release/:token/upload   Vercel Blob client-upload handshake (browser uploads directly)
 *   POST /api/release/:token          submit details + uploaded file references
 * No file bytes pass through these functions.
 */
const express = require('express');
const db = require('./db');
const mailer = require('./mailer');
const { getAppUrl } = require('./appUrl');
const { createRateLimiter } = require('../lib/rateLimit');
const link = require('../lib/releaseLink');

const router = express.Router();
const limiter = createRateLimiter({ windowMs: 60_000, max: 40 });

router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.set('Referrer-Policy', 'no-referrer');
  next();
});
router.use(limiter);

const MESSAGES = {
  invalid: 'This link is not valid. Please use the link from your approval email.',
  expired: 'This link has expired. Reply to your approval email and we will send a new one.',
  revoked: 'This link is no longer active. Reply to your approval email if you think this is a mistake.',
};

async function loadByToken(token) {
  const demos = await db.getRaw('demos');
  const found = link.findDemoByToken(demos, token);
  return { demos, ...found };
}

function alreadySubmitted(demo) {
  const r = demo.release || {};
  if (!r.submittedAt) return false;
  // A link re-sent after a submission re-opens the form (for corrections).
  return !(r.linkSentAt && Date.parse(r.linkSentAt) > Date.parse(r.submittedAt));
}

function storageReady() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

router.get('/:token', async (req, res) => {
  try {
    const { demo, error } = await loadByToken(req.params.token);
    if (error) return res.status(error === 'invalid' ? 404 : 410).json({ error: MESSAGES[error], code: error });
    res.json({
      ...link.prefillFor(demo),
      submitted: alreadySubmitted(demo),
      uploadsEnabled: storageReady(),
      uploadPrefix: link.uploadPrefix(demo.id),
      limits: { wavMaxBytes: link.WAV_MAX_BYTES, artworkMaxBytes: link.ARTWORK_MAX_BYTES },
    });
  } catch (e) {
    console.error('[RELEASE] load error:', e.message);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

router.post('/:token/upload', express.json({ limit: '64kb' }), async (req, res) => {
  try {
    if (!storageReady()) return res.status(503).json({ error: 'File uploads are not available on this deployment.' });
    const { demo, error } = await loadByToken(req.params.token);
    if (error) return res.status(error === 'invalid' ? 404 : 410).json({ error: MESSAGES[error], code: error });
    if (alreadySubmitted(demo)) return res.status(409).json({ error: 'Your details were already received.' });
    const { handleUpload } = require('@vercel/blob/client');
    const result = await handleUpload({
      token: process.env.BLOB_READ_WRITE_TOKEN,
      request: req,
      body: req.body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const kind = clientPayload === 'artwork' ? 'artwork' : 'wav';
        const problem = link.checkUploadPath(demo.id, pathname, kind);
        if (problem) throw new Error(problem);
        return {
          ...link.uploadRules(kind),
          addRandomSuffix: true,
          allowOverwrite: false,
          validUntil: Date.now() + 60 * 60 * 1000,
        };
      },
    });
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message || 'Upload not allowed' });
  }
});

router.post('/:token', express.json({ limit: '64kb' }), async (req, res) => {
  try {
    const { demos, demo, index, error } = await loadByToken(req.params.token);
    if (error) return res.status(error === 'invalid' ? 404 : 410).json({ error: MESSAGES[error], code: error });
    if (alreadySubmitted(demo)) return res.status(409).json({ error: 'Your details were already received. Reply to the approval email if something needs to change.' });

    const v = link.validateReleaseSubmission(req.body, demo);
    if (!v.ok) return res.status(400).json({ error: 'Please check the highlighted fields.', errors: v.errors });

    // Confirm the files really landed in storage (size and type come from storage, not the browser).
    if (storageReady()) {
      const { head } = require('@vercel/blob');
      for (const kind of ['wav', 'artwork']) {
        const ref = v[kind];
        if (!ref) continue;
        try {
          const info = await head(ref.url || ref.pathname, { token: process.env.BLOB_READ_WRITE_TOKEN });
          const rules = link.uploadRules(kind);
          if (!info || info.size > rules.maximumSizeInBytes) throw new Error('size');
          if (info.contentType && !rules.allowedContentTypes.includes(info.contentType)) throw new Error('type');
          ref.size = info.size;
          ref.url = info.url;
          ref.pathname = info.pathname;
          ref.contentType = info.contentType || null;
        } catch (err) {
          return res.status(400).json({ error: 'We could not find your uploaded file. Please upload it again.', errors: { [kind]: 'Upload not found, please try again' } });
        }
      }
    } else {
      return res.status(503).json({ error: 'File uploads are not available on this deployment.' });
    }

    const now = new Date().toISOString();
    const updated = {
      ...demo,
      release: {
        ...demo.release,
        submittedAt: now,
        submissions: (demo.release.submissions || 0) + 1,
        details: v.details,
        wav: { pathname: v.wav.pathname, url: v.wav.url, size: v.wav.size, name: v.wav.name, contentType: v.wav.contentType || null, uploadedAt: now },
        artwork: v.artwork ? { pathname: v.artwork.pathname, url: v.artwork.url, size: v.artwork.size, name: v.artwork.name, contentType: v.artwork.contentType || null, uploadedAt: now } : (demo.release.artwork || null),
      },
    };
    // Re-read right before writing so a concurrent admin change is not lost.
    const fresh = await db.getRaw('demos');
    const freshIndex = fresh.findIndex((d) => d.id === demo.id);
    if (freshIndex === -1) return res.status(410).json({ error: MESSAGES.revoked, code: 'revoked' });
    fresh[freshIndex] = { ...fresh[freshIndex], release: updated.release };
    await db.set('demos', fresh);

    const notify = await mailer.sendReleaseSubmittedNotification({ demo: updated, details: v.details, appUrl: getAppUrl(req) }).catch((e) => ({ ok: false, error: e.message }));
    if (!notify || !notify.ok) console.warn('[RELEASE] A&R notification not sent:', notify && notify.error);
    res.status(201).json({ success: true });
  } catch (e) {
    console.error('[RELEASE] submit error:', e.message);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
