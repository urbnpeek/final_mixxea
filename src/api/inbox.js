/**
 * Admin Contact Inbox.
 * Reads the collections the public forms already write. No new database.
 * Booking-type contact messages are omitted because contact.js also copies
 * those inquiries into bookings.
 */
const express = require('express');
const db = require('./db');
const { requireAdmin } = require('./middleware');

const router = express.Router();
const CONTACT_STATUSES = new Set(['new', 'read', 'archived']);

function isBookingInquiry(inquiryType) {
  return /booking/i.test(String(inquiryType || ''));
}

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function previewText(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= 140) return text;
  return text.slice(0, 139) + '…';
}

function normalizeContact(message) {
  return {
    id: message.id,
    type: 'contact',
    submittedAt: message.submittedAt || '',
    name: message.name || '',
    email: message.email || '',
    subject: message.inquiryType || 'Contact message',
    preview: previewText(message.message),
    status: message.status || 'new',
    detail: message,
  };
}

function normalizeBooking(booking) {
  const subject = [booking.artist, booking.venue].filter(Boolean).join(' @ ') || booking.inquiryType || 'Booking inquiry';
  return {
    id: booking.id,
    type: 'booking',
    submittedAt: booking.submittedAt || '',
    name: booking.contact || booking.venue || '',
    email: booking.email || '',
    subject,
    preview: previewText(booking.notes || booking.message || ''),
    status: booking.status || 'pending',
    detail: booking,
  };
}

function normalizeDemo(demo) {
  return {
    id: demo.id,
    type: 'demo',
    submittedAt: demo.submittedAt || '',
    name: demo.artistName || demo.realName || '',
    email: demo.email || '',
    subject: demo.trackTitle || 'Demo submission',
    preview: previewText(demo.description || demo.notes || ''),
    status: demo.status || 'new',
    detail: demo,
  };
}

async function listInbox() {
  const [messages, bookings, demos, bounces] = await Promise.all([
    db.get('contactMessages'),
    db.get('bookings'),
    db.get('demos'),
    db.get('emailBounces'),
  ]);
  const items = [
    ...asList(messages).filter((message) => message && !isBookingInquiry(message.inquiryType)).map(normalizeContact),
    ...asList(bookings).filter(Boolean).map(normalizeBooking),
    ...asList(demos).filter(Boolean).map(normalizeDemo),
  ].sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')));
  return { items, bounces: asList(bounces) };
}

router.get('/', requireAdmin, async (req, res) => {
  res.json(await listInbox());
});

router.put('/contact/:id/status', requireAdmin, async (req, res) => {
  const status = String((req.body && req.body.status) || '');
  if (!CONTACT_STATUSES.has(status)) return res.status(400).json({ error: 'Invalid status' });
  const messages = asList(await db.get('contactMessages'));
  const idx = messages.findIndex((message) => message && message.id === req.params.id);
  if (idx === -1 || isBookingInquiry(messages[idx].inquiryType)) {
    return res.status(404).json({ error: 'Not found' });
  }
  messages[idx] = Object.assign({}, messages[idx], { status, updatedAt: new Date().toISOString() });
  await db.set('contactMessages', messages);
  res.json(normalizeContact(messages[idx]));
});

module.exports = router;
