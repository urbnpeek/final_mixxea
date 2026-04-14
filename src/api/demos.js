/**
 * demos.js - A&R demo submission handling
 * Accepts both JSON (new multi-step form) and multipart/form-data (legacy form)
 */
const express = require('express');
const multer  = require('multer');
const path    = require('path');
const { v4: uuid } = require('uuid');
const db      = require('./db');
const mailer  = require('./mailer');
const { requireAdmin } = require('./middleware');
const { getAppUrl }    = require('./appUrl');
const router  = express.Router();

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });

// Conditionally apply multer only for multipart requests (legacy form)
function maybeUpload(req, res, next) {
  const ct = (req.headers['content-type'] || '');
  if (ct.includes('multipart/form-data')) {
    upload.single('track')(req, res, next);
  } else {
    next();
  }
}

// ── Submit (public, no auth) ──────────────────────────────────────────────────
router.post('/submit', maybeUpload, async (req, res) => {
  try {
    const demos = await db.get('demos');
    const demo = {
      id:           uuid(),
      // Artist info
      artistName:   req.body.artistName   || '',
      realName:     req.body.realName     || '',
      email:        req.body.email        || '',
      country:      req.body.country      || '',
      pro:          req.body.pro          || '',
      social:       req.body.social       || req.body.soundcloudLink || '',
      // Track info
      trackTitle:   req.body.trackTitle   || '',
      version:      req.body.version      || 'Original Mix',
      genre:        req.body.genre        || '',
      bpm:          parseInt(req.body.bpm, 10) || 0,
      musKey:       req.body.musKey       || '',
      fileFormat:   req.body.fileFormat   || '',
      downloadLink: req.body.downloadLink || '',
      description:  req.body.description  || req.body.notes || '',
      prevReleased: req.body.prevReleased || 'no',
      prevWhere:    req.body.prevWhere    || '',
      // Publishing & rights
      writers:      req.body.writers      || 'sole',
      cowriters:    req.body.cowriters    || '',
      pubAgree:     req.body.pubAgree     || 'mixxea',
      ownPubName:   req.body.ownPubName   || '',
      samples:      req.body.samples      || 'none',
      // Legacy compat
      notes:        req.body.notes        || req.body.description || '',
      soundcloudLink: req.body.soundcloudLink || req.body.social || '',
      file:         req.file ? `/uploads/audio/${uuid()}${path.extname(req.file.originalname)}` : '',
      submittedAt:  new Date().toISOString(),
      status:       'new',
    };
    demos.unshift(demo);
    await db.set('demos', demos);

    const sampMap = { none: 'No samples — 100% original', cleared: 'Samples cleared & licensed', uncleared: 'Samples used — not cleared' };
    const writersMap = { sole: 'Sole author', collab: 'Multiple writers / collaborators' };
    const pubMap = { mixxea: 'Mixxea Publishing (full administration)', own: 'Own publisher — co-pub TBD' };

    const adminBody = `
      <p><strong>Artist:</strong> ${escapeHtml(demo.artistName)} &nbsp;<span style="color:#888">(${escapeHtml(demo.realName || 'no legal name')})</span></p>
      <p><strong>Email:</strong> ${escapeHtml(demo.email)}</p>
      <p><strong>Country:</strong> ${escapeHtml(demo.country || 'N/A')} &nbsp;|&nbsp; <strong>PRO:</strong> ${escapeHtml(demo.pro || 'None')}</p>
      ${demo.social ? `<p><strong>Profile:</strong> <a href="${escapeHtml(demo.social)}">${escapeHtml(demo.social)}</a></p>` : ''}
      <hr style="border-color:rgba(255,255,255,.1);margin:12px 0">
      <p><strong>Track:</strong> ${escapeHtml(demo.trackTitle)} — ${escapeHtml(demo.version)}</p>
      <p><strong>Genre:</strong> ${escapeHtml(demo.genre)} &nbsp;|&nbsp; <strong>BPM:</strong> ${demo.bpm || 'N/A'} &nbsp;|&nbsp; <strong>Key:</strong> ${escapeHtml(demo.musKey || 'Unknown')}</p>
      <p><strong>Format:</strong> ${escapeHtml(demo.fileFormat || 'N/A')}</p>
      ${demo.downloadLink ? `<p><strong>Download:</strong> <a href="${escapeHtml(demo.downloadLink)}">${escapeHtml(demo.downloadLink)}</a></p>` : ''}
      ${demo.description ? `<p><strong>Description:</strong><br>${escapeHtml(demo.description).replace(/\n/g, '<br>')}</p>` : ''}
      <hr style="border-color:rgba(255,255,255,.1);margin:12px 0">
      <p><strong>Previously released:</strong> ${demo.prevReleased === 'yes' ? 'Yes — ' + escapeHtml(demo.prevWhere) : 'No — unreleased & exclusive'}</p>
      <p><strong>Writers:</strong> ${escapeHtml(writersMap[demo.writers] || demo.writers)}</p>
      ${demo.cowriters ? `<p><strong>Co-writers:</strong><br>${escapeHtml(demo.cowriters).replace(/\n/g, '<br>')}</p>` : ''}
      <p><strong>Publishing:</strong> ${escapeHtml(pubMap[demo.pubAgree] || demo.pubAgree)}</p>
      ${demo.ownPubName ? `<p><strong>Own publisher:</strong> ${escapeHtml(demo.ownPubName)}</p>` : ''}
      <p><strong>Samples:</strong> ${escapeHtml(sampMap[demo.samples] || demo.samples)}</p>`;

    const appUrl = getAppUrl(req);
    const emailResults = await Promise.allSettled([
      mailer.sendAdminNotification({
        type: 'demo',
        subject: `New submission: "${demo.trackTitle}" by ${demo.artistName}`,
        body: adminBody,
        ctaLabel: appUrl ? 'Open Admin' : undefined,
        ctaUrl:   appUrl || undefined,
      }),
      demo.email ? mailer.sendDemoSubmissionConfirmation(demo) : Promise.resolve({ ok: false, skipped: true }),
    ]);

    const failedAll = emailResults.every((r) => r.status === 'rejected' || !r.value || !r.value.ok);
    if (failedAll) return res.status(202).json({ success: true, id: demo.id, warning: 'Demo saved, but email delivery failed.' });
    res.status(201).json({ success: true, id: demo.id });
  } catch (e) {
    console.error('[DEMOS] submit error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ── Send submission link to artist (admin only) ───────────────────────────────
router.post('/send-link', requireAdmin, async (req, res) => {
  const { email, artistName } = req.body;
  if (!email || !String(email).includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }
  const appUrl = getAppUrl(req) || '';
  const submitUrl = appUrl + '/submit.html';
  const name = escapeHtml(artistName || 'there');

  const result = await mailer.sendEmail(
    email,
    'Mixxea Records — Track Submission Invitation',
    `<p>Hi ${name},</p>
     <p>Mixxea Records is inviting you to submit your track for A&amp;R consideration.</p>
     <p>Please use the secure link below to complete your submission. The form takes about 5 minutes.</p>
     <p style="margin:20px 0">
       <a href="${submitUrl}" style="background:#c8b8ff;color:#080808;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">
         Submit Your Track &rarr;
       </a>
     </p>
     <p style="color:#888;font-size:12px">Or copy this link: <a href="${submitUrl}" style="color:#c8b8ff">${submitUrl}</a></p>
     <p>Please have your track download link ready (WeTransfer, Dropbox, or Google Drive).<br>
     WAV 24-bit is preferred.</p>
     <p style="margin-top:24px">— Mixxea Records A&amp;R Team</p>`,
    { brand: 'demo' }
  );

  if (!result || !result.ok) {
    return res.status(502).json({ error: result?.error || 'Email delivery failed' });
  }
  res.json({ success: true });
});

// ── List demos (admin) ────────────────────────────────────────────────────────
router.get('/', requireAdmin, async (req, res) => res.json(await db.get('demos')));

// ── Update status (admin) ─────────────────────────────────────────────────────
router.put('/:id/status', requireAdmin, async (req, res) => {
  const demos = await db.get('demos');
  const idx = demos.findIndex((d) => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  demos[idx].status     = req.body.status;
  demos[idx].adminNotes = req.body.notes || '';
  await db.set('demos', demos);

  if (req.body.status === 'declined' && req.body.notify && demos[idx].email) {
    await mailer.sendEmail(
      demos[idx].email,
      `Mixxea Records — Regarding your submission "${demos[idx].trackTitle}"`,
      `<p>Hi ${escapeHtml(demos[idx].artistName)},</p>
       <p>Thank you for submitting <strong>"${escapeHtml(demos[idx].trackTitle)}"</strong> to Mixxea Records.</p>
       <p>After careful consideration, it is not the right fit for our label at this time. We encourage you to keep creating and submit again in the future.</p>
       <p>— Mixxea Records A&amp;R</p>`,
      { brand: 'mixxea' }
    );
  }
  res.json(demos[idx]);
});

// ── Delete demo (admin) ───────────────────────────────────────────────────────
router.delete('/:id', requireAdmin, async (req, res) => {
  const demos = await db.get('demos');
  await db.set('demos', demos.filter((d) => d.id !== req.params.id));
  res.json({ success: true });
});

module.exports = router;
