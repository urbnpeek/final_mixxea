/**
 * emailService.js - Centralized Resend-first email system for Mixxea + FreqVault
 * Falls back to Nodemailer SMTP or console logging in development.
 */
const nodemailer = require('nodemailer');
const { Resend } = require('resend');

let smtpTransporter;
let resendClient;

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function htmlToText(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitEmails(input) {
  if (!input) return [];
  return String(input)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueEmails(items) {
  return [...new Set((items || []).filter(Boolean))];
}

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

function getSmtpTransporter() {
  if (smtpTransporter) return smtpTransporter;
  if (!process.env.SMTP_USER) return null;

  smtpTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: parseInt(process.env.SMTP_PORT || '587', 10) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return smtpTransporter;
}

function getFromAddress(brand) {
  if (brand === 'freqvault') {
    return process.env.EMAIL_FROM_FREQ_VAULT || process.env.BOOKINGS_EMAIL || 'FreqVault Agency <bookings@freqvault.com>';
  }
  if (brand === 'admin') {
    return process.env.EMAIL_FROM_ADMIN || process.env.EMAIL_FROM_MIXXEA || 'Mixxea Control <ops@mixxea.com>';
  }
  return process.env.EMAIL_FROM_MIXXEA || process.env.EMAIL_FROM || 'Mixxea Records <info@mixxea.com>';
}

function getAdminRecipients(type) {
  const specific = type === 'booking'
    ? splitEmails(process.env.BOOKING_NOTIFY_EMAILS || process.env.BOOKINGS_EMAIL)
    : type === 'demo'
      ? splitEmails(process.env.DEMO_NOTIFY_EMAILS || process.env.AR_EMAIL)
      : type === 'contact'
        ? splitEmails(process.env.CONTACT_NOTIFY_EMAILS || process.env.ADMIN_NOTIFY_EMAILS || process.env.ADMIN_EMAIL)
      : [];

  return uniqueEmails([
    ...specific,
    ...splitEmails(process.env.ADMIN_NOTIFY_EMAILS),
    ...splitEmails(process.env.ADMIN_EMAIL),
  ]);
}

function getBrandConfig(brand) {
  if (brand === 'freqvault') {
    return {
      name: process.env.AGENCY_NAME || 'FreqVault Agency',
      accent: '#63e6ff',
      accentSoft: 'rgba(99,230,255,0.16)',
      label: 'Artist Management & Booking Agency',
    };
  }
  if (brand === 'admin') {
    return {
      name: 'Mixxea Control',
      accent: '#e8ff00',
      accentSoft: 'rgba(232,255,0,0.14)',
      label: 'Admin Operations',
    };
  }
  return {
    name: process.env.LABEL_NAME || 'Mixxea Records',
    accent: '#e8ff00',
    accentSoft: 'rgba(232,255,0,0.14)',
    label: 'Record Label',
  };
}

function renderShell({ brand = 'mixxea', preheader, eyebrow, title, body, ctaLabel, ctaUrl, footerNote }) {
  const cfg = getBrandConfig(brand);
  return `<!doctype html>
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#080b12;color:#eaf0fa;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader || title)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;background:#080b12;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;border-radius:24px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);background:radial-gradient(circle at top right, ${cfg.accentSoft}, transparent 40%), linear-gradient(180deg,#0d121b 0%,#101725 100%);">
          <tr>
            <td style="padding:28px 32px 18px;border-bottom:1px solid rgba(255,255,255,0.08)">
              <div style="font-size:11px;letter-spacing:.32em;text-transform:uppercase;color:${cfg.accent};margin-bottom:10px;">${cfg.label}</div>
              <div style="font-size:24px;font-weight:700;letter-spacing:.12em;color:#fff;">${cfg.name}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${eyebrow ? `<div style="font-size:12px;letter-spacing:.28em;text-transform:uppercase;color:${cfg.accent};margin-bottom:12px;">${escapeHtml(eyebrow)}</div>` : ''}
              <h1 style="margin:0 0 14px;font-size:30px;line-height:1.12;color:#fff;letter-spacing:-.04em;">${escapeHtml(title)}</h1>
              <div style="font-size:15px;line-height:1.75;color:#cdd6e5;">${body}</div>
              ${ctaUrl && ctaLabel ? `<div style="margin-top:28px;"><a href="${ctaUrl}" style="display:inline-block;border-radius:999px;background:${cfg.accent};padding:14px 22px;color:#071018;text-decoration:none;font-weight:700;">${escapeHtml(ctaLabel)}</a></div>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid rgba(255,255,255,0.08);font-size:12px;line-height:1.7;color:#94a3b8;">
              ${footerNote || 'Automated message from the Mixxea x FreqVault platform.'}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderNewsletterTemplate({ subject, body, intro, fromName }) {
  const content = String(body || '')
    .split(/\r?\n\r?\n/)
    .map((block) => `<p>${escapeHtml(block).replace(/\r?\n/g, '<br />')}</p>`)
    .join('');

  return renderShell({
    brand: 'mixxea',
    preheader: intro || subject,
    eyebrow: 'Newsletter',
    title: subject,
    body: `${intro ? `<p>${escapeHtml(intro)}</p>` : ''}${content}`,
    footerNote: `You are receiving this because you subscribed to ${escapeHtml(fromName || process.env.LABEL_NAME || 'Mixxea Records')} updates.`
  });
}

function renderBookingConfirmation(data) {
  return renderShell({
    brand: 'freqvault',
    preheader: `We received your request for ${data.artist || data.venue || 'your event'}`,
    eyebrow: 'Booking Request',
    title: 'Request received',
    body: `<p>Hi ${escapeHtml(data.contact || 'there')},</p>
      <p>Thanks for contacting ${escapeHtml(process.env.AGENCY_NAME || 'FreqVault Agency')}. Our booking team received your request and will reply after reviewing artist availability and fit.</p>
      <p><strong>Requested artist:</strong> ${escapeHtml(data.artist || 'Not specified')}<br />
      <strong>Venue / Event:</strong> ${escapeHtml(data.venue || 'Not specified')}<br />
      <strong>Date:</strong> ${escapeHtml(data.date || 'TBC')}</p>
      ${data.notes ? `<p><strong>Your notes:</strong><br />${escapeHtml(data.notes).replace(/\n/g, '<br />')}</p>` : ''}`
  });
}

function renderDemoConfirmation(data) {
  return renderShell({
    brand: 'mixxea',
    preheader: `Your demo ${data.trackTitle || ''} has been received`,
    eyebrow: 'Demo Submission',
    title: 'Demo received',
    body: `<p>Hi ${escapeHtml(data.artistName || 'there')},</p>
      <p>We received your submission <strong>${escapeHtml(data.trackTitle || 'Untitled')}</strong>. Our A&R team reviews demos carefully and will only reply when a track is a strong fit.</p>
      <p><strong>Genre:</strong> ${escapeHtml(data.genre || 'Not specified')}<br />
      <strong>BPM:</strong> ${escapeHtml(data.bpm || 'N/A')}</p>
      <p>Thanks for sharing your music with ${escapeHtml(process.env.LABEL_NAME || 'Mixxea Records')}.</p>`
  });
}

function renderArtistWelcome(data) {
  return renderShell({
    brand: 'mixxea',
    preheader: 'Welcome to the Mixxea ecosystem',
    eyebrow: 'Artist Onboarding',
    title: 'Welcome aboard',
    body: `<p>Hi ${escapeHtml(data.name || 'there')},</p>
      <p>Your account is active. You can now access artist operations, release updates, and booking visibility inside the platform.</p>
      <p>We are excited to build with you.</p>`,
    ctaLabel: data.ctaLabel || 'Open portal',
    ctaUrl: data.ctaUrl
  });
}

function renderContactConfirmation(data) {
  return renderShell({
    brand: 'mixxea',
    preheader: `We received your ${data.inquiryType || 'message'}`,
    eyebrow: 'Contact Request',
    title: 'Message received',
    body: `<p>Hi ${escapeHtml(data.name || 'there')},</p>
      <p>Thanks for reaching out to ${escapeHtml(process.env.LABEL_NAME || 'Mixxea Records')}. We received your ${escapeHtml(data.inquiryType || 'message')} and will reply as soon as the right team reviews it.</p>
      <p>You do not need to resubmit unless your details change.</p>`,
  });
}

function renderAdminAlert(data) {
  return renderShell({
    brand: 'admin',
    preheader: data.subject,
    eyebrow: data.eyebrow || 'Admin Alert',
    title: data.subject,
    body: data.body,
    ctaLabel: data.ctaLabel,
    ctaUrl: data.ctaUrl
  });
}

async function deliverEmail({ to, subject, html, brand = 'mixxea', replyTo, tags }) {
  const recipients = uniqueEmails(Array.isArray(to) ? to : [to]);
  if (!recipients.length) {
    return { ok: false, skipped: true, error: 'No recipients supplied' };
  }

  const resend = getResend();
  if (resend) {
    try {
      const result = await resend.emails.send({
        from: getFromAddress(brand),
        to: recipients,
        subject,
        html,
        text: htmlToText(html),
        replyTo,
        tags,
      });
      if (result.error) {
        console.error('[EMAIL][RESEND][ERROR]', result.error.message);
        return { ok: false, error: result.error.message };
      }
      console.log('[EMAIL][RESEND][SENT]', subject, recipients.join(', '), result.data && result.data.id ? result.data.id : '');
      return { ok: true, provider: 'resend', id: result.data && result.data.id ? result.data.id : null };
    } catch (error) {
      console.error('[EMAIL][RESEND][EXCEPTION]', error.message);
      return { ok: false, error: error.message };
    }
  }

  const smtp = getSmtpTransporter();
  if (smtp) {
    try {
      const info = await smtp.sendMail({
        from: getFromAddress(brand),
        to: recipients,
        subject,
        html,
        replyTo,
      });
      console.log('[EMAIL][SMTP][SENT]', subject, recipients.join(', '), info.messageId || '');
      return { ok: true, provider: 'smtp', id: info.messageId || null };
    } catch (error) {
      console.error('[EMAIL][SMTP][ERROR]', error.message);
      return { ok: false, error: error.message };
    }
  }

  console.log('[EMAIL][DEV]', subject, '->', recipients.join(', '));
  return { ok: true, provider: 'console', skipped: true };
}

async function sendEmail(to, subject, html, options = {}) {
  return deliverEmail({ to, subject, html, ...options });
}

async function sendNewsletter(subscribers, content) {
  const emails = uniqueEmails(subscribers);
  const html = renderNewsletterTemplate(content);
  const batchSize = 50;
  const results = [];

  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    results.push(await deliverEmail({
      to: batch,
      subject: content.subject,
      html,
      brand: 'mixxea',
      replyTo: process.env.NEWSLETTER_REPLY_TO,
      tags: [{ name: 'campaign', value: 'newsletter' }],
    }));
  }

  return {
    ok: results.every((entry) => entry.ok),
    attempted: emails.length,
    batches: results.length,
    results,
    html,
  };
}

async function sendBookingConfirmation(data) {
  return deliverEmail({
    to: data.email,
    subject: `FreqVault booking request received${data.artist ? `: ${data.artist}` : ''}`,
    html: renderBookingConfirmation(data),
    brand: 'freqvault',
    replyTo: getAdminRecipients('booking'),
    tags: [{ name: 'flow', value: 'booking-confirmation' }],
  });
}

async function sendDemoSubmissionConfirmation(data) {
  return deliverEmail({
    to: data.email,
    subject: `Mixxea demo received${data.trackTitle ? `: ${data.trackTitle}` : ''}`,
    html: renderDemoConfirmation(data),
    brand: 'mixxea',
    replyTo: getAdminRecipients('demo'),
    tags: [{ name: 'flow', value: 'demo-confirmation' }],
  });
}

async function sendAdminNotification(data) {
  const recipients = getAdminRecipients(data.type || 'general');
  if (!recipients.length) {
    console.warn('[EMAIL][ADMIN] No admin recipients configured');
    return { ok: false, skipped: true, error: 'No admin recipients configured' };
  }

  return deliverEmail({
    to: recipients,
    subject: data.subject,
    html: renderAdminAlert(data),
    brand: 'admin',
    tags: [{ name: 'flow', value: `admin-${data.type || 'general'}` }],
  });
}

async function sendArtistOnboarding(data) {
  return deliverEmail({
    to: data.email,
    subject: data.subject || 'Welcome to Mixxea',
    html: renderArtistWelcome(data),
    brand: 'mixxea',
    tags: [{ name: 'flow', value: 'artist-onboarding' }],
  });
}

async function sendContactConfirmation(data) {
  return deliverEmail({
    to: data.email,
    subject: `${process.env.LABEL_NAME || 'Mixxea Records'} received your message`,
    html: renderContactConfirmation(data),
    brand: 'mixxea',
    tags: [{ name: 'flow', value: 'contact-confirmation' }],
  });
}

function previewNewsletter(content) {
  return renderNewsletterTemplate(content);
}

module.exports = {
  sendEmail,
  sendNewsletter,
  sendBookingConfirmation,
  sendDemoSubmissionConfirmation,
  sendAdminNotification,
  sendArtistOnboarding,
  sendContactConfirmation,
  previewNewsletter,
  renderTemplates: {
    newsletter: renderNewsletterTemplate,
    bookingConfirmation: renderBookingConfirmation,
    demoConfirmation: renderDemoConfirmation,
    artistWelcome: renderArtistWelcome,
    contactConfirmation: renderContactConfirmation,
    adminAlert: renderAdminAlert,
  },
};

