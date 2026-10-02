/**
 * newsletter.js - Subscriber management + campaign sending
 */
const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('./db');
const mailer = require('./mailer');
const { requireAdmin } = require('./middleware');
const { getAppUrl } = require('./appUrl');
const { addSubscriber, unsubscribeEmail } = require('../lib/newsletterList');
const router = express.Router();

router.post('/subscribe', async (req, res) => {
  const { email, source = 'homepage' } = req.body;
  if (!email || !String(email).includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }
  const normalized = String(email).trim().toLowerCase();
  const nl = await db.get('newsletter');
  const added = addSubscriber(nl, { email: normalized, source });
  if (added.status === 'invalid') return res.status(400).json({ error: 'Valid email required' });
  if (added.status === 'suppressed') {
    return res.status(200).json({ success: true, suppressed: true, message: 'This address has unsubscribed' });
  }
  if (added.status === 'exists') {
    return res.json({ success: true, message: 'Already subscribed' });
  }
  await db.set('newsletter', added.newsletter);

  const welcome = mailer.newsletterDelivery(normalized, {
    subject: 'Welcome to Mixxea Records Newsletter',
    intro: 'You are officially on the list.',
    body: 'You will receive updates on new releases, artist news, bookings, and events across the Mixxea ecosystem.',
    fromName: process.env.LABEL_NAME || 'Mixxea Records',
    origin: getAppUrl(req) || 'https://www.mixxea.com',
  });
  if (!welcome) {
    console.error('[NEWSLETTER] UNSUBSCRIBE_SECRET is not set; welcome email not sent');
    return res.json({ success: true, warning: 'Subscribed, but the welcome email was not sent.' });
  }
  await mailer.sendEmail(welcome.to, welcome.subject, welcome.html, {
    brand: 'mixxea',
    replyTo: process.env.NEWSLETTER_REPLY_TO,
    tags: [{ name: 'flow', value: 'newsletter-subscribe' }],
    headers: welcome.headers,
  }).catch(() => {});

  res.json({ success: true });
});

router.delete('/unsubscribe/:email', requireAdmin, async (req, res) => {
  const nl = await db.get('newsletter');
  const result = unsubscribeEmail(nl, decodeURIComponent(req.params.email));
  await db.set('newsletter', result.newsletter);
  res.json({ success: true, removed: result.removed });
});

router.get('/subscribers', requireAdmin, async (req, res) => {
  const nl = await db.get('newsletter');
  res.json({ count: nl.subscribers.length, subscribers: nl.subscribers });
});

router.get('/campaigns', requireAdmin, async (req, res) => {
  const nl = await db.get('newsletter');
  res.json(nl.campaigns || []);
});

router.post('/preview', requireAdmin, (req, res) => {
  const { subject, body, intro = '', fromName = process.env.LABEL_NAME || 'Mixxea Records' } = req.body;
  if (!subject || !body) return res.status(400).json({ error: 'Subject and body required' });
  const html = mailer.previewNewsletter({ subject, body, intro, fromName });
  res.json({ success: true, html });
});

router.post('/send', requireAdmin, async (req, res) => {
  const { subject, body, fromName = process.env.LABEL_NAME || 'Mixxea Records', intro = '', testEmail } = req.body;
  if (!subject || !body) return res.status(400).json({ error: 'Subject and body required' });

  const nl = await db.get('newsletter');

  const origin = getAppUrl(req) || 'https://www.mixxea.com';
  if (testEmail) {
    const message = mailer.newsletterDelivery(testEmail, { subject: `[TEST] ${subject}`, body, intro, fromName, origin });
    if (!message) {
      console.error('[NEWSLETTER] UNSUBSCRIBE_SECRET is not set; test email not sent');
      return res.status(500).json({ error: 'UNSUBSCRIBE_SECRET is not set' });
    }
    const result = await mailer.sendEmail(message.to, message.subject, message.html, { brand: 'mixxea', replyTo: process.env.NEWSLETTER_REPLY_TO, tags: [{ name: 'campaign', value: 'newsletter-test' }], headers: message.headers });
    if (!result.ok) return res.status(502).json({ error: result.error || 'Test email failed' });
    return res.json({ success: true, sent: 1, test: true, provider: result.provider || 'resend' });
  }

  const recipients = nl.subscribers.map((s) => s.email);
  const result = await mailer.sendNewsletter(recipients, { subject, body, intro, fromName, origin });

  const campaign = {
    id: uuid(), subject, intro, fromName,
    sentAt: new Date().toISOString(),
    recipients: result.attempted,
    success: result.ok,
    provider: result.results && result.results[0] ? result.results[0].provider || 'resend' : 'resend'
  };
  if (!nl.campaigns) nl.campaigns = [];
  nl.campaigns.unshift(campaign);
  await db.set('newsletter', nl);

  if (!result.ok) return res.status(502).json({ success: false, sent: result.attempted, total: recipients.length, detail: result });
  res.json({ success: true, sent: result.attempted, total: recipients.length, detail: result });
});

module.exports = router;
