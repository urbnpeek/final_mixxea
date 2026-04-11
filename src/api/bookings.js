/**
 * bookings.js - FreqVault booking requests
 */
const express = require('express');
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

router.post('/inquire', async (req, res) => {
  const bookings = await db.get('bookings');
  const b = { id: uuid(), ...req.body, status: 'pending', submittedAt: new Date().toISOString() };
  bookings.unshift(b);
  await db.set('bookings', bookings);

  const adminBody = `<p><strong>Artist:</strong> ${escapeHtml(b.artist || 'Not specified')}</p>
    <p><strong>Venue / Event:</strong> ${escapeHtml(b.venue || 'Not specified')}</p>
    <p><strong>Contact:</strong> ${escapeHtml(b.contact || 'Unknown')}</p>
    <p><strong>Email:</strong> ${escapeHtml(b.email || 'Not provided')}</p>
    <p><strong>Date:</strong> ${escapeHtml(b.date || 'TBC')}</p>
    ${b.city || b.country ? `<p><strong>Location:</strong> ${escapeHtml([b.city, b.country].filter(Boolean).join(', '))}</p>` : ''}
    ${b.fee ? `<p><strong>Fee / Budget:</strong> ${escapeHtml(b.fee)}</p>` : ''}
    ${b.notes ? `<p><strong>Notes:</strong><br />${escapeHtml(b.notes).replace(/\n/g, '<br />')}</p>` : ''}`;

  const emailResults = await Promise.allSettled([
    mailer.sendAdminNotification({ type: 'booking', subject: `New booking inquiry: ${b.artist || b.venue || 'FreqVault request'}`, body: adminBody, ctaLabel: 'Open Admin', ctaUrl: getAppUrl(req) || undefined }),
    b.email ? mailer.sendBookingConfirmation(b) : Promise.resolve({ ok: false, skipped: true })
  ]);

  const failedAll = emailResults.every((r) => r.status === 'rejected' || !r.value.ok);
  if (failedAll) return res.status(202).json({ success: true, warning: 'Booking saved, but email delivery failed.' });
  res.status(201).json({ success: true });
});

router.get('/', requireAdmin, async (req, res) => res.json(await db.get('bookings')));

router.put('/:id', requireAdmin, async (req, res) => {
  const items = await db.get('bookings');
  const idx = items.findIndex((i) => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  items[idx] = { ...items[idx], ...req.body, updatedAt: new Date().toISOString() };
  await db.set('bookings', items);
  res.json(items[idx]);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const items = await db.get('bookings');
  await db.set('bookings', items.filter((i) => i.id !== req.params.id));
  res.json({ success: true });
});

module.exports = router;
