const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('./db');
const mailer = require('./mailer');
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

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function subscribeToNewsletter(email, source) {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes('@')) return false;

  const newsletter = db.get('newsletter');
  if (newsletter.subscribers.find((entry) => entry.email === normalized)) {
    return false;
  }

  newsletter.subscribers.push({
    email: normalized,
    joinedAt: new Date().toISOString(),
    source,
  });
  db.set('newsletter', newsletter);
  return true;
}

router.post('/', async (req, res) => {
  const name = String(req.body.name || req.body.artistName || '').trim();
  const email = normalizeEmail(req.body.email);
  const inquiryType = String(req.body.inquiryType || 'General').trim();
  const link = String(req.body.link || '').trim();
  const message = String(req.body.message || '').trim();
  const newsletterOptIn = Boolean(req.body.newsletterOptIn);

  if (!name) return res.status(400).json({ error: 'Name is required.' });
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'A valid email is required.' });
  if (!message) return res.status(400).json({ error: 'Message is required.' });

  const entry = {
    id: uuid(),
    name,
    email,
    inquiryType,
    link,
    message,
    newsletterOptIn,
    submittedAt: new Date().toISOString(),
  };

  const contactMessages = db.get('contactMessages');
  contactMessages.unshift(entry);
  db.set('contactMessages', contactMessages);

  if (newsletterOptIn) {
    subscribeToNewsletter(email, 'contact-form');
  }

  const appUrl = getAppUrl(req);
  const isBooking = /booking/i.test(inquiryType);

  if (isBooking) {
    const bookings = db.get('bookings');
    bookings.unshift({
      id: uuid(),
      venue: name,
      artist: '',
      contact: name,
      email,
      date: '',
      city: '',
      country: '',
      fee: '',
      notes: message,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      source: 'contact-form',
      link,
      inquiryType,
    });
    db.set('bookings', bookings);
  }

  const adminBody = `<p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Inquiry type:</strong> ${escapeHtml(inquiryType)}</p>
    ${link ? `<p><strong>Link:</strong> <a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p>` : ''}
    <p><strong>Message:</strong><br />${escapeHtml(message).replace(/\n/g, '<br />')}</p>
    ${newsletterOptIn ? '<p><strong>Newsletter:</strong> Opted in from contact form</p>' : ''}`;

  const emailTasks = [
    mailer.sendAdminNotification({
      type: isBooking ? 'booking' : 'contact',
      eyebrow: isBooking ? 'Booking Inquiry' : 'Contact Message',
      subject: `${isBooking ? 'New booking inquiry' : 'New contact message'}: ${name}`,
      body: adminBody,
      ctaLabel: appUrl ? 'Open Site' : undefined,
      ctaUrl: appUrl || undefined,
    }),
    isBooking
      ? mailer.sendBookingConfirmation({
          contact: name,
          email,
          artist: '',
          venue: name,
          date: 'TBC',
          notes: message,
        })
      : mailer.sendContactConfirmation({
          name,
          email,
          inquiryType,
        }),
  ];

  const results = await Promise.allSettled(emailTasks);
  const failedAll = results.every((result) => result.status === 'rejected' || !result.value || !result.value.ok);

  if (failedAll) {
    return res.status(202).json({ success: true, warning: 'Message saved, but email delivery failed.' });
  }

  return res.status(201).json({
    success: true,
    bookingCreated: isBooking,
    newsletterOptIn,
  });
});

module.exports = router;
