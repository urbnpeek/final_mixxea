/**
 * POST /api/webhooks/resend
 * Verifies Resend (Svix) signatures and alerts on delivery failures.
 *
 * Alerted events (Resend docs, October 2026):
 *   email.bounced, email.complained, email.failed, email.suppressed
 * Other events, including suppression.added / suppression.removed
 * (list changes, not a failed delivery of a message), are acknowledged.
 */
const { Webhook } = require('svix');
const db = require('./db');
const mailer = require('./mailer');

const ALERT_SUBJECT_MARKER = '[Mixxea delivery alert]';
const ALERT_TAG = { name: 'flow', value: 'bounce-alert' };
const ALERT_HEADER = 'X-Mixxea-Alert';
const DEFAULT_ALERT_EMAIL = 'hello@mixxea.com';
const MAX_BOUNCE_EVENTS = 100;

const DELIVERY_FAILURE_EVENTS = new Set([
  'email.bounced',
  'email.complained',
  'email.failed',
  'email.suppressed',
]);

function headerValue(headers, name) {
  if (!headers) return '';
  const value = headers[name] || headers[String(name).toLowerCase()];
  if (Array.isArray(value)) return value[0] ? String(value[0]) : '';
  return value == null ? '' : String(value);
}

function rawPayload(req) {
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  if (typeof req.rawBody === 'string') return req.rawBody;
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody.toString('utf8');
  if (typeof req.body === 'string') return req.body;
  return '';
}

function bounceAlertRecipients() {
  const configured = typeof process.env.BOUNCE_ALERT_EMAIL === 'string'
    ? process.env.BOUNCE_ALERT_EMAIL.trim()
    : '';
  const source = configured || DEFAULT_ALERT_EMAIL;
  return [...new Set(source.split(',').map((item) => item.trim()).filter(Boolean))];
}

function listAddresses(value) {
  if (!value) return [];
  const items = Array.isArray(value) ? value : [value];
  return items.map((item) => String(item || '').trim()).filter(Boolean);
}

function collectRecipients(data) {
  return [...new Set([
    ...listAddresses(data && data.to),
    ...listAddresses(data && data.cc),
    ...listAddresses(data && data.bcc),
  ])];
}

function tagEntries(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) {
    return tags
      .filter((tag) => tag && tag.name)
      .map((tag) => [String(tag.name), String(tag.value || '')]);
  }
  if (typeof tags === 'object') return Object.entries(tags).map(([key, value]) => [key, String(value || '')]);
  return [];
}

function headerMap(headers) {
  if (!headers) return {};
  if (Array.isArray(headers)) {
    const out = {};
    headers.forEach((item) => {
      if (item && item.name) out[String(item.name).toLowerCase()] = String(item.value || '');
    });
    return out;
  }
  if (typeof headers === 'object') {
    const out = {};
    Object.entries(headers).forEach(([key, value]) => {
      out[String(key).toLowerCase()] = value == null ? '' : String(value);
    });
    return out;
  }
  return {};
}

function isAlertMessage(data) {
  const subject = String((data && data.subject) || '');
  if (subject.includes(ALERT_SUBJECT_MARKER)) return true;
  if (tagEntries(data && data.tags).some(([name, value]) => name === 'flow' && value === ALERT_TAG.value)) return true;
  const headers = headerMap(data && data.headers);
  return String(headers[ALERT_HEADER.toLowerCase()] || '').toLowerCase() === 'bounce';
}

function joinDiagnostics(value) {
  if (!value) return '';
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean).join('; ');
  return String(value).trim();
}

function describeFailure(event) {
  const data = (event && event.data) || {};
  const bounce = data.bounce;
  if (bounce && typeof bounce === 'object') {
    const reason = [bounce.message, joinDiagnostics(bounce.diagnosticCode || bounce.diagnosticCodes || bounce.diagnostics)]
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .join(' — ');
    return {
      bounceType: String(bounce.type || ''),
      bounceSubType: String(bounce.subType || bounce.subtype || ''),
      reason,
    };
  }
  if (data.failed && typeof data.failed === 'object') {
    return {
      bounceType: 'failed',
      bounceSubType: '',
      reason: String(data.failed.reason || data.failed.message || 'Send failed'),
    };
  }
  if (data.suppressed && typeof data.suppressed === 'object') {
    return {
      bounceType: String(data.suppressed.type || 'suppressed'),
      bounceSubType: '',
      reason: String(data.suppressed.message || 'Delivery suppressed'),
    };
  }
  if (event && event.type === 'email.complained') {
    return { bounceType: 'complaint', bounceSubType: '', reason: 'Recipient marked the message as spam' };
  }
  return { bounceType: '', bounceSubType: '', reason: '' };
}

function formatBucharest(iso) {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return `${iso || 'unknown'} (Europe/Bucharest)`;
  const formatted = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Bucharest',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'short',
  }).format(date);
  return `${formatted} (Europe/Bucharest)`;
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildRecord(event, svixId, failure, extra) {
  const data = event.data || {};
  const occurredAt = event.created_at || data.created_at || new Date().toISOString();
  return {
    id: svixId || data.email_id || `bounce-${Date.now()}`,
    svixId: svixId || '',
    type: event.type,
    emailId: data.email_id || '',
    from: data.from || '',
    recipients: collectRecipients(data),
    subject: data.subject || '',
    bounceType: failure.bounceType,
    bounceSubType: failure.bounceSubType,
    reason: failure.reason,
    occurredAt,
    bucharestTime: formatBucharest(occurredAt),
    recordedAt: new Date().toISOString(),
    ...extra,
  };
}

async function recordBounce(entry) {
  const current = await db.get('emailBounces');
  const list = Array.isArray(current) ? current.slice() : [];
  const idx = entry.svixId ? list.findIndex((item) => item && item.svixId === entry.svixId) : -1;
  if (idx >= 0) list.splice(idx, 1);
  list.unshift(entry);
  await db.set('emailBounces', list.slice(0, MAX_BOUNCE_EVENTS));
}

function alertHtml(record) {
  const rows = [
    ['Event', record.type],
    ['Recipient(s)', record.recipients.join(', ') || 'unknown'],
    ['Subject', record.subject || '(no subject)'],
    ['Bounce type', [record.bounceType, record.bounceSubType].filter(Boolean).join(' / ') || 'n/a'],
    ['Reason', record.reason || 'n/a'],
    ['Time', record.bucharestTime],
    ['Resend email id', record.emailId || 'unknown'],
    ['From', record.from || 'unknown'],
  ];
  const body = rows.map(([label, value]) => `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`).join('');
  return `<div>${body}<p>This is a Mixxea delivery alert. A bounce of this message is logged and not re-sent.</p></div>`;
}

function idempotencyKeyFor(svixId) {
  const raw = `bounce-alert/${svixId || 'nosvix'}`;
  return raw.replace(/[^\w.:/-]/g, '_').slice(0, 256);
}

async function sendFailureAlert(record, svixId) {
  const subject = record.subject ? record.subject.slice(0, 180) : '(no subject)';
  return mailer.sendMail({
    to: bounceAlertRecipients(),
    subject: `${ALERT_SUBJECT_MARKER} ${record.type}: ${subject}`,
    html: alertHtml(record),
    fromBrand: 'mixxea',
    tags: [ALERT_TAG],
    headers: { [ALERT_HEADER]: 'bounce' },
    idempotencyKey: idempotencyKeyFor(svixId),
  });
}

async function handleResendWebhook(req, res) {
  const secret = typeof process.env.RESEND_WEBHOOK_SECRET === 'string'
    ? process.env.RESEND_WEBHOOK_SECRET.trim()
    : '';
  if (!secret) return res.status(501).json({ error: 'Webhook not configured' });

  const payload = rawPayload(req);
  const svixId = headerValue(req.headers, 'svix-id');
  let event;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': headerValue(req.headers, 'svix-timestamp'),
      'svix-signature': headerValue(req.headers, 'svix-signature'),
    });
  } catch (error) {
    if (error && error.name !== 'WebhookVerificationError' && /secret/i.test(error.message || '')) {
      console.error('[WEBHOOK][RESEND] secret rejected:', error.message);
      return res.status(500).json({ error: 'Webhook secret is invalid' });
    }
    return res.status(400).json({ error: 'Invalid signature' });
  }

  if (!event || typeof event !== 'object' || !DELIVERY_FAILURE_EVENTS.has(event.type)) {
    return res.status(200).json({ ok: true, ignored: true });
  }

  const failure = describeFailure(event);
  const data = event.data || {};
  const recipients = collectRecipients(data);
  console.error(
    '[WEBHOOK][RESEND][DELIVERY]',
    event.type,
    data.email_id || '',
    recipients.join(', '),
    failure.bounceType,
    failure.bounceSubType,
    failure.reason
  );

  const loop = isAlertMessage(data);
  if (loop) {
    console.error(
      '[WEBHOOK][RESEND][LOOP]',
      event.type,
      data.email_id || '',
      'delivery alert itself failed; not sending another alert'
    );
  }

  let alertResult = null;
  if (!loop) {
    const draft = buildRecord(event, svixId, failure, {});
    try {
      alertResult = await sendFailureAlert(draft, svixId);
    } catch (error) {
      alertResult = { ok: false, error: error.message };
    }
  }

  const alertSent = !!(alertResult && alertResult.ok);
  try {
    await recordBounce(buildRecord(event, svixId, failure, {
      alertSent,
      alertSkipped: loop ? 'loop' : (alertSent ? null : 'send_failed'),
    }));
  } catch (error) {
    console.error('[WEBHOOK][RESEND] failed to store bounce:', error.message);
  }

  if (!loop && !alertSent) {
    return res.status(502).json({ error: 'Alert delivery failed' });
  }
  return res.status(200).json({ ok: true, alerted: alertSent, alertSkipped: loop ? 'loop' : null });
}

module.exports = {
  handleResendWebhook,
  ALERT_SUBJECT_MARKER,
  DELIVERY_FAILURE_EVENTS,
  formatBucharest,
};
