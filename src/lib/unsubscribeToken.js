const crypto = require('crypto');

function unsubscribeSecret() {
  return String(process.env.UNSUBSCRIBE_SECRET || '').trim();
}

function signUnsubscribeToken(email) {
  const secret = unsubscribeSecret();
  const normalized = String(email || '').trim().toLowerCase();
  if (!secret || !normalized.includes('@')) return '';
  const payload = Buffer.from(normalized, 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(normalized).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyUnsubscribeToken(token) {
  const secret = unsubscribeSecret();
  const raw = String(token || '');
  const dot = raw.lastIndexOf('.');
  if (!secret || dot <= 0) return '';
  const payload = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  let email = '';
  try {
    email = Buffer.from(payload, 'base64url').toString('utf8').trim().toLowerCase();
  } catch (error) {
    return '';
  }
  if (!email.includes('@') || email.includes('\n') || email.includes('\r')) return '';
  const expected = crypto.createHmac('sha256', secret).update(email).digest('base64url');
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return '';
  return email;
}

function unsubscribeUrl(origin, email) {
  const token = signUnsubscribeToken(email);
  if (!token) return '';
  const base = String(origin || 'https://www.mixxea.com').replace(/\/+$/, '');
  return `${base}/unsubscribe?token=${encodeURIComponent(token)}`;
}

module.exports = {
  unsubscribeSecret,
  signUnsubscribeToken,
  verifyUnsubscribeToken,
  unsubscribeUrl,
};
