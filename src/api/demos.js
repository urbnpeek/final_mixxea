/**
 * demos.js - A&R demo submission handling
 */
const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuid } = require('uuid');
const db = require('./db');
const mailer = require('./mailer');
const { requireAdmin } = require('./middleware');
const { getAppUrl } = require('./appUrl');
const router = express.Router();

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const storage = multer.diskStorage({
  destination: 'public/uploads/audio',
  filename: (req, file, cb) => cb(null, uuid() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } });

router.post('/submit', upload.single('track'), async (req, res) => {
  try {
    const demos = db.get('demos');
    const demo = {
      id: uuid(),
      artistName: req.body.artistName || '',
      email: req.body.email || '',
      trackTitle: req.body.trackTitle || '',
      genre: req.body.genre || '',
      bpm: parseInt(req.body.bpm, 10) || 0,
      notes: req.body.notes || '',
      soundcloudLink: req.body.soundcloudLink || '',
      file: req.file ? `/uploads/audio/${req.file.filename}` : '',
      submittedAt: new Date().toISOString(),
      status: 'new'
    };
    demos.unshift(demo);
    db.set('demos', demos);

    const adminBody = `<p><strong>Artist:</strong> ${escapeHtml(demo.artistName)}</p>
      <p><strong>Email:</strong> ${escapeHtml(demo.email || 'Not provided')}</p>
      <p><strong>Track:</strong> ${escapeHtml(demo.trackTitle)}</p>
      <p><strong>Genre:</strong> ${escapeHtml(demo.genre || 'Not specified')} · <strong>BPM:</strong> ${escapeHtml(demo.bpm || 'N/A')}</p>
      ${demo.notes ? `<p><strong>Notes:</strong><br />${escapeHtml(demo.notes).replace(/\n/g, '<br />')}</p>` : ''}
      ${demo.soundcloudLink ? `<p><strong>Private link:</strong> <a href="${demo.soundcloudLink}">${demo.soundcloudLink}</a></p>` : ''}
      ${demo.file ? `<p><strong>Uploaded file:</strong> ${escapeHtml(demo.file)}</p>` : ''}`;

    const emailResults = await Promise.allSettled([
      mailer.sendAdminNotification({
        type: 'demo',
        subject: `New demo submission: ${demo.trackTitle || 'Untitled'}`,
        body: adminBody,
        ctaLabel: 'Open Admin',
        ctaUrl: getAppUrl(req) || undefined
      }),
      demo.email ? mailer.sendDemoSubmissionConfirmation(demo) : Promise.resolve({ ok: false, skipped: true })
    ]);

    const failedAll = emailResults.every((result) => result.status === 'rejected' || !result.value.ok);
    if (failedAll) {
      return res.status(202).json({ success: true, id: demo.id, warning: 'Demo saved, but email delivery failed.' });
    }

    res.status(201).json({ success: true, id: demo.id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

router.get('/', requireAdmin, (req, res) => {
  const demos = db.get('demos');
  res.json(demos);
});

router.put('/:id/status', requireAdmin, async (req, res) => {
  const demos = db.get('demos');
  const idx = demos.findIndex((d) => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  demos[idx].status = req.body.status;
  demos[idx].adminNotes = req.body.notes || '';
  db.set('demos', demos);

  if (req.body.status === 'declined' && req.body.notify && demos[idx].email) {
    await mailer.sendEmail(
      demos[idx].email,
      `Mixxea Records - Regarding your submission "${demos[idx].trackTitle}"`,
      `<p>Hi ${escapeHtml(demos[idx].artistName)},</p>
       <p>Thank you for submitting <strong>"${escapeHtml(demos[idx].trackTitle)}"</strong> to Mixxea Records.</p>
       <p>After careful consideration, it is not the right fit for our label at this time. We encourage you to keep creating and submit again in the future.</p>
       <p>- Mixxea Records A&amp;R</p>`,
      { brand: 'mixxea' }
    );
  }
  res.json(demos[idx]);
});

router.delete('/:id', requireAdmin, (req, res) => {
  db.set('demos', db.get('demos').filter((d) => d.id !== req.params.id));
  res.json({ success: true });
});

module.exports = router;

