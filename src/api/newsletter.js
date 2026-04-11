/**
 * newsletter.js - Subscriber management + campaign sending
 */
const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('./db');
const mailer = require('./mailer');
const { requireAdmin } = require('./middleware');
const router = express.Router();

router.post('/subscribe', async (req, res) => {
  const { email, source = 'homepage' } = req.body;
  if (!email || !String(email).includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }
  const normalized = String(email).trim().toLowerCase();
  const nl = await db.get('newsletter');
  if (nl.subscribers.find((s) => s.email === normalized)) {
    return res.json({ success: true, message: 'Already subscribed' });
  }
  nl.subscribers.push({ email: normalized, joinedAt: new Date().toISOString(), source });
  await db.set('newsletter', nl);

  await mailer.sendEmail(
    normalized,
    'Welcome to Mixxea Records Newsletter',
    mailer.renderTemplates.newsletter({ subject: 'Welcome to Mixxea + FreqVault', intro: 'You are officially on the list.', body: 'You will receive updates on new releases, artist news, bookings, and events across the Mixxea ecosystem.', fromName: process.env.LABEL_NAME || 'Mixxea Records' }),
    { brand: 'mixxea', replyTo: process.env.NEWSLETTER_REPLY_TO, tags: [{ name: 'flow', value: 'newsletter-subscribe' }] }
  ).catch(() => {});

  res.json({ success: true });
});

router.delete('/unsubscribe/:email', async (req, res) => {
  const nl = await db.get('newsletter');
  nl.subscribers = nl.subscribers.filter((s) => s.email !== req.params.email);
  await db.set('newsletter', nl);
  res.json({ success: true });
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

  if (testEmail) {
    const result = await mailer.sendEmail(testEmail, `[TEST] ${subject}`, mailer.previewNewsletter({ subject, body, intro, fromName }), { brand: 'mixxea', replyTo: process.env.NEWSLETTER_REPLY_TO, tags: [{ name: 'campaign', value: 'newsletter-test' }] });
    if (!result.ok) return res.status(502).json({ error: result.error || 'Test email failed' });
    return res.json({ success: true, sent: 1, test: true, provider: result.provider || 'resend' });
  }

  const recipients = nl.subscribers.map((s) => s.email);
  const result = await mailer.sendNewsletter(recipients, { subject, body, intro, fromName });

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
