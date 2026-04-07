/**
 * mailer.js - Backward-compatible bridge to the centralized email service.
 */
const emailService = require('./emailService');

async function sendMail({ to, subject, html, fromName, fromBrand, replyTo, tags }) {
  const brand = fromBrand || (fromName && String(fromName).toLowerCase().includes('freq') ? 'freqvault' : 'mixxea');
  return emailService.sendEmail(to, subject, html, {
    brand,
    replyTo,
    tags,
  });
}

module.exports = {
  sendMail,
  ...emailService,
};
