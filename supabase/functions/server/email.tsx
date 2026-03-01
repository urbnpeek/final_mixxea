// ===================== MIXXEA EMAIL SYSTEM (Resend) =====================
// All email templates matching the MIXXEA brand identity:
// Pure black bg, gradient accent: Cyan #00C4FF → Purple #7B5FFF → Magenta #D63DF6 → Coral #FF5252

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = 'MIXXEA <onboarding@resend.dev>';

// ──── Core Send Helper ────────────────────────────────────────────────────────
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) {
    console.log(`[Email] RESEND_API_KEY not configured. Would send to ${to}: ${subject}`);
    return;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.log(`[Email] Resend error sending to ${to}:`, JSON.stringify(data));
    } else {
      console.log(`[Email] Sent "${subject}" to ${to} | id: ${data.id}`);
    }
  } catch (err) {
    console.log(`[Email] Network error sending to ${to}:`, err);
  }
}

// ──── Base Layout ─────────────────────────────────────────────────────────────
function base(content: string, preheader = ''): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MIXXEA</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;color:#000000;">${preheader}</div>` : ''}
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#000000;min-height:100vh;">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">

        <!-- HEADER -->
        <tr><td style="background:linear-gradient(135deg,#7B5FFF 0%,#D63DF6 55%,#FF5252 100%);padding:36px 40px;text-align:center;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr><td align="center">
              <div style="display:inline-block;background:rgba(0,0,0,0.25);border-radius:12px;padding:6px 18px;margin-bottom:12px;">
                <span style="color:#ffffff;font-size:22px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">MIXXEA</span>
              </div>
              <p style="color:rgba(255,255,255,0.75);font-size:12px;margin:0;letter-spacing:0.5px;">Music Distribution &amp; Marketing Platform</p>
            </td></tr>
          </table>
        </td></tr>

        <!-- BODY -->
        <tr><td style="background:#0D0D0D;padding:40px;">
          ${content}
        </td></tr>

        <!-- DIVIDER -->
        <tr><td style="background:#080808;padding:0 40px;">
          <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(123,95,255,0.4),rgba(214,61,246,0.4),transparent);"></div>
        </td></tr>

        <!-- FOOTER -->
        <tr><td style="background:#080808;padding:24px 40px;text-align:center;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr><td align="center">
              <p style="color:rgba(255,255,255,0.25);font-size:12px;margin:0 0 8px;">© 2025 MIXXEA Inc. All rights reserved.</p>
              <p style="color:rgba(255,255,255,0.15);font-size:11px;margin:0;">You're receiving this because you have a MIXXEA account.</p>
              <p style="margin:12px 0 0;">
                <a href="https://mixxea.com/dashboard" style="color:rgba(123,95,255,0.7);font-size:11px;text-decoration:none;">Dashboard</a>
                <span style="color:rgba(255,255,255,0.15);margin:0 8px;">·</span>
                <a href="https://mixxea.com" style="color:rgba(123,95,255,0.7);font-size:11px;text-decoration:none;">Website</a>
                <span style="color:rgba(255,255,255,0.15);margin:0 8px;">·</span>
                <a href="https://mixxea.com/dashboard/messages" style="color:rgba(123,95,255,0.7);font-size:11px;text-decoration:none;">Support</a>
              </p>
            </td></tr>
          </table>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ──── Reusable Parts ──────────────────────────────────────────────────────────
function h1(text: string): string {
  return `<h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:0 0 8px;letter-spacing:-0.5px;">${text}</h1>`;
}
function h2(text: string): string {
  return `<h2 style="color:#ffffff;font-size:18px;font-weight:700;margin:0 0 6px;">${text}</h2>`;
}
function p(text: string, opacity = '0.7'): string {
  return `<p style="color:rgba(255,255,255,${opacity});font-size:15px;line-height:1.65;margin:0 0 16px;">${text}</p>`;
}
function small(text: string): string {
  return `<p style="color:rgba(255,255,255,0.4);font-size:12px;line-height:1.6;margin:0 0 8px;">${text}</p>`;
}
function ctaBtn(text: string, href: string): string {
  return `<table cellpadding="0" cellspacing="0" role="presentation" style="margin:24px 0;">
    <tr><td style="background:linear-gradient(135deg,#7B5FFF,#D63DF6);border-radius:12px;">
      <a href="${href}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.2px;">${text}</a>
    </td></tr>
  </table>`;
}
function statCard(label: string, value: string, color: string): string {
  return `<td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px 20px;text-align:center;">
    <div style="color:${color};font-size:22px;font-weight:800;margin-bottom:4px;">${value}</div>
    <div style="color:rgba(255,255,255,0.4);font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">${label}</div>
  </td>`;
}
function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="color:rgba(255,255,255,0.4);font-size:13px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">${label}</td>
    <td style="color:#ffffff;font-size:13px;font-weight:600;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);text-align:right;">${value}</td>
  </tr>`;
}
function badge(text: string, color: string): string {
  return `<span style="display:inline-block;background:${color}22;border:1px solid ${color}44;color:${color};font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">${text}</span>`;
}
function gradientLine(): string {
  return `<div style="height:2px;background:linear-gradient(90deg,#00C4FF,#7B5FFF,#D63DF6,#FF5252);border-radius:2px;margin:24px 0;"></div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 1 — Welcome Email (sent immediately after signup)
// ═══════════════════════════════════════════════════════════════════════════════
export function welcomeEmail(name: string, role: string): string {
  const roleEmoji: Record<string, string> = { artist: '🎵', label: '🏷️', curator: '🎧' };
  const roleColor: Record<string, string> = { artist: '#7B5FFF', label: '#00C4FF', curator: '#D63DF6' };
  const emoji = roleEmoji[role] || '🎵';
  const color = roleColor[role] || '#7B5FFF';

  const content = `
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;font-size:48px;margin-bottom:16px;">${emoji}</div>
      ${h1(`Welcome to MIXXEA, ${name}!`)}
      <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:4px 0 0;">Your music career starts here.</p>
    </div>

    ${gradientLine()}

    <div style="background:rgba(123,95,255,0.08);border:1px solid rgba(123,95,255,0.2);border-radius:14px;padding:20px 24px;margin-bottom:24px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        <span style="font-size:20px;">⚡</span>
        <span style="color:#ffffff;font-size:15px;font-weight:700;">You have 100 free credits!</span>
        ${badge('Welcome Bonus', '#00C4FF')}
      </div>
      ${p('Use your credits to launch promotions, pitch to playlists, run TikTok UGC campaigns, and more. No credit card required to get started.', '0.6')}
    </div>

    ${h2('What you can do with MIXXEA:')}
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:16px 0 24px;">
      ${[
        ['🚀', 'Distribute Music', 'Upload and distribute to 150+ DSPs worldwide instantly'],
        ['📊', 'Analytics', 'Track streams, revenue, and fan locations in real-time'],
        ['🎯', 'Promotions', 'Run targeted campaigns on Spotify, TikTok, Instagram & more'],
        ['🌐', 'Smart Pages', 'Create your artist bio link page with one click'],
        ['📝', 'Publishing Admin', 'Register works, manage copyrights & collect royalties'],
        ['✂️', 'Royalty Splits', 'Automate payments to collaborators & producers'],
      ].map(([icon, title, desc]) => `
        <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
          <table cellpadding="0" cellspacing="0" role="presentation" width="100%">
            <tr>
              <td style="width:36px;vertical-align:top;padding-right:12px;font-size:20px;">${icon}</td>
              <td>
                <div style="color:#ffffff;font-size:13px;font-weight:700;margin-bottom:2px;">${title}</div>
                <div style="color:rgba(255,255,255,0.4);font-size:12px;">${desc}</div>
              </td>
            </tr>
          </table>
        </td></tr>
      `).join('')}
    </table>

    ${ctaBtn('🎵 Go to Your Dashboard →', 'https://mixxea.com/dashboard')}

    ${gradientLine()}

    <div style="background:rgba(0,196,255,0.06);border-left:3px solid #00C4FF;border-radius:0 10px 10px 0;padding:14px 18px;">
      ${small(`Your account type is <strong style="color:${color}">${role.toUpperCase()}</strong>. You can always upgrade or change your plan in Settings. If you need help, open a support ticket from your dashboard anytime.`)}
    </div>
  `;

  return base(content, `Welcome to MIXXEA, ${name}! You have 100 free credits to get started.`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 2 — Credit Purchase Confirmation
// ═══════════════════════════════════════════════════════════════════════════════
export function creditPurchaseEmail(
  name: string,
  credits: number,
  packageName: string,
  newBalance: number,
  amount: string
): string {
  const content = `
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;font-size:48px;margin-bottom:16px;">✅</div>
      ${h1('Payment Confirmed!')}
      ${p(`Your credits are live and ready to use, ${name}.`, '0.5')}
    </div>

    ${gradientLine()}

    <!-- Receipt Card -->
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;margin-bottom:24px;">
      ${h2('Purchase Receipt')}
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:12px;">
        ${infoRow('Package', packageName)}
        ${infoRow('Credits Added', `+${credits.toLocaleString()} ⚡`)}
        ${infoRow('Amount Charged', amount)}
        ${infoRow('Payment Status', '✅ Paid')}
        ${infoRow('Date', new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))}
      </table>
    </div>

    <!-- New Balance -->
    <table width="100%" cellpadding="12" cellspacing="8" role="presentation" style="margin-bottom:24px;">
      <tr>
        ${statCard('Credits Added', `+${credits.toLocaleString()}`, '#10B981')}
        <td width="12"></td>
        ${statCard('New Balance', `${newBalance.toLocaleString()} ⚡`, '#00C4FF')}
      </tr>
    </table>

    ${h2('Put your credits to work:')}
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:12px 0 24px;">
      ${[
        ['🎵', 'Spotify Growth', '50 cr'],
        ['🎸', 'Playlist Pitching', '30 cr'],
        ['📱', 'TikTok UGC Campaign', '75 cr'],
        ['📺', 'YouTube Ads', '100 cr'],
      ].map(([icon, service, cost]) => `
        <tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="font-size:16px;width:28px;">${icon}</td>
              <td style="color:rgba(255,255,255,0.7);font-size:13px;">${service}</td>
              <td style="text-align:right;color:#00C4FF;font-size:13px;font-weight:700;">⚡ ${cost}</td>
            </tr>
          </table>
        </td></tr>
      `).join('')}
    </table>

    ${ctaBtn('🚀 Launch a Campaign Now →', 'https://mixxea.com/dashboard/promotions')}

    ${gradientLine()}
    ${small('A receipt has been saved to your account. For billing questions, open a support ticket from your dashboard.')}
  `;

  return base(content, `${credits.toLocaleString()} credits added to your MIXXEA account!`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 3 — Ticket Created Confirmation
// ═══════════════════════════════════════════════════════════════════════════════
export function ticketCreatedEmail(
  name: string,
  ticketRef: string,
  subject: string,
  category: string
): string {
  const content = `
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;font-size:48px;margin-bottom:16px;">🎫</div>
      ${h1("We've got your ticket!")}
      ${p(`Hi ${name}, our support team has received your request and will respond within 24 hours.`, '0.5')}
    </div>

    ${gradientLine()}

    <!-- Ticket Details -->
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;margin-bottom:24px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
        ${h2('Ticket Details')}
        ${badge(`Ref: #${ticketRef}`, '#7B5FFF')}
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        ${infoRow('Subject', subject)}
        ${infoRow('Category', category)}
        ${infoRow('Status', '🟡 Open')}
        ${infoRow('Priority', 'Medium')}
        ${infoRow('Created', new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }))}
      </table>
    </div>

    <!-- Response Time Card -->
    <div style="background:rgba(0,196,255,0.06);border:1px solid rgba(0,196,255,0.15);border-radius:14px;padding:20px 24px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="vertical-align:top;width:36px;font-size:24px;">⏱️</td>
          <td>
            <div style="color:#00C4FF;font-size:14px;font-weight:700;margin-bottom:4px;">Expected Response Time</div>
            <div style="color:rgba(255,255,255,0.6);font-size:13px;">Our team typically responds within <strong style="color:#ffffff;">24 hours</strong> on business days. Complex technical issues may take up to 48 hours.</div>
          </td>
        </tr>
      </table>
    </div>

    ${h2('While you wait:')}
    ${p('You can view your ticket status and add more details directly from your dashboard.')}

    ${ctaBtn('📬 View Your Ticket →', 'https://mixxea.com/dashboard/messages')}

    ${gradientLine()}
    ${small(`Ticket reference: <strong style="color:rgba(255,255,255,0.6);">#${ticketRef}</strong> — Keep this for your records. Please do not reply to this email directly.`)}
  `;

  return base(content, `Ticket #${ticketRef} received — we'll respond within 24 hours.`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 4 — Admin Reply to Ticket
// ═══════════════════════════════════════════════════════════════════════════════
export function ticketReplyEmail(
  name: string,
  ticketSubject: string,
  ticketRef: string,
  replyContent: string,
  agentName: string
): string {
  const content = `
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;font-size:48px;margin-bottom:16px;">💬</div>
      ${h1('New reply on your ticket')}
      ${p(`Hi ${name}, the MIXXEA support team has responded to your request.`, '0.5')}
    </div>

    ${gradientLine()}

    <!-- Ticket Reference -->
    <div style="margin-bottom:20px;">
      <table cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td>${badge(`#${ticketRef}`, '#7B5FFF')}</td>
          <td style="padding-left:10px;color:rgba(255,255,255,0.4);font-size:13px;">${ticketSubject}</td>
        </tr>
      </table>
    </div>

    <!-- Reply Message -->
    <div style="background:rgba(123,95,255,0.08);border:1px solid rgba(123,95,255,0.2);border-radius:16px;padding:24px;margin-bottom:24px;">
      <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:14px;">
        <tr>
          <td>
            <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#7B5FFF,#D63DF6);display:inline-flex;align-items:center;justify-content:center;">
              <span style="color:#fff;font-size:14px;font-weight:700;">M</span>
            </div>
          </td>
          <td style="padding-left:10px;">
            <div style="color:#ffffff;font-size:13px;font-weight:700;">${agentName}</div>
            <div style="color:rgba(255,255,255,0.4);font-size:11px;">MIXXEA Support Team · ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
          </td>
        </tr>
      </table>
      <div style="color:rgba(255,255,255,0.8);font-size:14px;line-height:1.7;background:rgba(0,0,0,0.3);border-radius:10px;padding:16px;">
        ${replyContent.replace(/\n/g, '<br>')}
      </div>
    </div>

    ${ctaBtn('💬 Reply to This Ticket →', 'https://mixxea.com/dashboard/messages')}

    ${gradientLine()}
    ${small('To reply, please visit your dashboard. Direct replies to this email are not monitored.')}
  `;

  return base(content, `New reply on ticket #${ticketRef}: ${ticketSubject}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 5 — Campaign Live Notification
// ═══════════════════════════════════════════════════════════════════════════════
export function campaignLiveEmail(
  name: string,
  campaignName: string,
  campaignType: string,
  creditsUsed: number,
  releaseTitle: string
): string {
  const typeEmoji: Record<string, string> = {
    spotify_growth: '🎵',
    playlist_pitching: '🎸',
    tiktok_ugc: '📱',
    instagram_ugc: '📸',
    youtube_ads: '📺',
    pr_press: '📰',
    meta_google_ads: '🎯',
    sync_licensing: '🎬',
  };
  const emoji = typeEmoji[campaignType] || '🚀';

  const content = `
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;font-size:48px;margin-bottom:16px;">${emoji}</div>
      ${h1('Your campaign is LIVE!')}
      ${p(`Great news, ${name} — your promotion campaign has launched and is reaching your audience right now.`, '0.5')}
    </div>

    ${gradientLine()}

    <!-- Campaign Info -->
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;margin-bottom:24px;">
      ${h2('Campaign Overview')}
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:12px;">
        ${infoRow('Campaign Name', campaignName)}
        ${infoRow('Campaign Type', campaignType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))}
        ${releaseTitle ? infoRow('Release', releaseTitle) : ''}
        ${infoRow('Credits Used', `${creditsUsed.toLocaleString()} ⚡`)}
        ${infoRow('Status', '🟢 Active')}
        ${infoRow('Launched', new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }))}
      </table>
    </div>

    <!-- What Happens Now -->
    <div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.15);border-radius:14px;padding:20px 24px;margin-bottom:24px;">
      ${h2('🌱 What happens next?')}
      ${p('Our team is processing your campaign. Here\'s the typical timeline:', '0.6')}
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        ${[
          ['24–48h', 'Campaign reviewed & initiated by our team'],
          ['3–7 days', 'You\'ll start seeing results in Analytics'],
          ['14–30 days', 'Full campaign results & performance report'],
        ].map(([time, desc]) => `
          <tr><td style="padding:6px 0;">
            <table cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="color:#10B981;font-size:12px;font-weight:700;width:80px;vertical-align:top;padding-top:2px;">${time}</td>
                <td style="color:rgba(255,255,255,0.6);font-size:13px;">${desc}</td>
              </tr>
            </table>
          </td></tr>
        `).join('')}
      </table>
    </div>

    ${ctaBtn('📊 Track Campaign Results →', 'https://mixxea.com/dashboard/analytics')}

    ${gradientLine()}
    ${small('Questions about your campaign? Open a support ticket from your dashboard and our team will be happy to help.')}
  `;

  return base(content, `Your campaign "${campaignName}" is now live! 🚀`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 6 — Low Credits Warning (< 30 credits)
// ═══════════════════════════════════════════════════════════════════════════════
export function lowCreditsEmail(name: string, balance: number): string {
  const content = `
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;font-size:48px;margin-bottom:16px;">⚡</div>
      ${h1('Your credits are running low')}
      ${p(`Hi ${name}, you only have <strong style="color:#F59E0B;">${balance} credits</strong> remaining. Top up now so your music never stops growing.`, '0.6')}
    </div>

    ${gradientLine()}

    <!-- Current Balance -->
    <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:16px;padding:24px;text-align:center;margin-bottom:24px;">
      <div style="color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Current Balance</div>
      <div style="color:#F59E0B;font-size:48px;font-weight:900;line-height:1;">⚡ ${balance}</div>
      <div style="color:rgba(255,255,255,0.4);font-size:13px;margin-top:4px;">credits remaining</div>
    </div>

    <!-- Packages -->
    ${h2('Choose a credit pack:')}
    <table width="100%" cellpadding="8" cellspacing="8" role="presentation" style="margin:16px 0 24px;">
      <tr>
        <td style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px;text-align:center;vertical-align:top;">
          <div style="color:#6B7280;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Starter</div>
          <div style="color:#ffffff;font-size:20px;font-weight:800;">$9.99</div>
          <div style="color:rgba(255,255,255,0.5);font-size:12px;">⚡ 100 credits</div>
        </td>
        <td width="8"></td>
        <td style="background:rgba(123,95,255,0.1);border:1px solid rgba(123,95,255,0.3);border-radius:12px;padding:16px;text-align:center;vertical-align:top;position:relative;">
          <div style="color:#7B5FFF;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">🔥 Popular</div>
          <div style="color:#ffffff;font-size:20px;font-weight:800;">$39.99</div>
          <div style="color:rgba(255,255,255,0.5);font-size:12px;">⚡ 550 credits</div>
        </td>
        <td width="8"></td>
        <td style="background:rgba(214,61,246,0.08);border:1px solid rgba(214,61,246,0.2);border-radius:12px;padding:16px;text-align:center;vertical-align:top;">
          <div style="color:#D63DF6;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Growth</div>
          <div style="color:#ffffff;font-size:20px;font-weight:800;">$69.99</div>
          <div style="color:rgba(255,255,255,0.5);font-size:12px;">⚡ 1,150 credits</div>
        </td>
      </tr>
    </table>

    ${ctaBtn('⚡ Top Up Credits Now →', 'https://mixxea.com/dashboard/credits')}

    ${gradientLine()}
    ${small('You received this alert because your credit balance dropped below 30. To turn off these alerts, visit your Settings page.')}
  `;

  return base(content, `Low credits alert: You only have ${balance} credits left on MIXXEA.`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 7 — Release Successfully Distributed
// ═══════════════════════════════════════════════════════════════════════════════
export function releaseDistributedEmail(
  name: string,
  releaseTitle: string,
  releaseType: string,
  stores: string[],
  releaseDate: string
): string {
  const storeLogos: Record<string, string> = {
    spotify: '🟢 Spotify',
    apple_music: '🔴 Apple Music',
    youtube_music: '🔴 YouTube Music',
    amazon_music: '🟠 Amazon Music',
    tidal: '🔵 TIDAL',
    deezer: '🟣 Deezer',
    tiktok: '⚫ TikTok',
  };

  const content = `
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;font-size:48px;margin-bottom:16px;">🎉</div>
      ${h1('Release Submitted!')}
      ${p(`Your ${releaseType} <strong style="color:#ffffff;">"${releaseTitle}"</strong> has been submitted for distribution. It will be live on all stores by your release date.`, '0.6')}
    </div>

    ${gradientLine()}

    <!-- Release Info -->
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;margin-bottom:24px;">
      ${h2('Release Details')}
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:12px;">
        ${infoRow('Title', releaseTitle)}
        ${infoRow('Type', releaseType.charAt(0).toUpperCase() + releaseType.slice(1))}
        ${infoRow('Release Date', releaseDate || 'As soon as approved')}
        ${infoRow('Approval Time', '24–72 hours')}
        ${infoRow('Distribution', `${stores.length} stores`)}
      </table>
    </div>

    <!-- Stores -->
    ${h2('Distributing to:')}
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:12px 0 24px;">
      ${stores.slice(0, 6).map(s => `
        <tr><td style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
          <span style="color:rgba(255,255,255,0.7);font-size:13px;">${storeLogos[s] || `• ${s}`}</span>
        </td></tr>
      `).join('')}
      ${stores.length > 6 ? `<tr><td style="padding:8px 0;"><span style="color:rgba(255,255,255,0.3);font-size:12px;">+ ${stores.length - 6} more stores...</span></td></tr>` : ''}
    </table>

    ${ctaBtn('🎵 View Your Release →', 'https://mixxea.com/dashboard/distribution')}

    ${gradientLine()}

    <div style="background:rgba(0,196,255,0.06);border-left:3px solid #00C4FF;border-radius:0 10px 10px 0;padding:14px 18px;">
      ${small('Pro tip: Once your release is live, launch a promotion campaign to maximize streams. Use your credits on Spotify Growth or Playlist Pitching to boost early momentum.')}
    </div>
  `;

  return base(content, `"${releaseTitle}" has been submitted for distribution to ${stores.length} stores!`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 8 — Team Invite (Label inviting an artist)
// ═══════════════════════════════════════════════════════════════════════════════
export function teamInviteEmail(
  artistName: string,
  labelName: string,
  inviteCode: string
): string {
  const content = `
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;font-size:48px;margin-bottom:16px;">🤝</div>
      ${h1(`${labelName} wants you on their roster!`)}
      ${p(`Hi${artistName ? ` ${artistName}` : ''}, you've been invited to join the <strong style="color:#ffffff;">${labelName}</strong> label team on MIXXEA.`, '0.6')}
    </div>

    ${gradientLine()}

    <div style="background:rgba(0,196,255,0.06);border:1px solid rgba(0,196,255,0.15);border-radius:16px;padding:28px;text-align:center;margin-bottom:24px;">
      ${h2('What this means for you:')}
      ${[
        ['💰', 'Access label-level resources and credits'],
        ['📊', 'Your releases managed under the label umbrella'],
        ['🎯', 'Priority campaign slots and support'],
        ['✂️', 'Automated royalty splits with collaborators'],
      ].map(([icon, desc]) => `
        <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:8px 0;text-align:left;">
          <span style="margin-right:8px;">${icon}</span>${desc}
        </p>
      `).join('')}
    </div>

    <div style="background:rgba(123,95,255,0.08);border:1px solid rgba(123,95,255,0.2);border-radius:14px;padding:20px 24px;margin-bottom:24px;text-align:center;">
      <div style="color:rgba(255,255,255,0.4);font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Your Invite Code</div>
      <div style="color:#ffffff;font-size:28px;font-weight:900;letter-spacing:6px;font-family:monospace;">${inviteCode}</div>
      <div style="color:rgba(255,255,255,0.3);font-size:11px;margin-top:8px;">Enter this code when signing up on MIXXEA</div>
    </div>

    ${ctaBtn('✅ Accept Invitation →', `https://mixxea.com/auth?invite=${inviteCode}`)}

    ${gradientLine()}
    ${small('This invitation expires in 7 days. If you did not expect this invitation or wish to decline, you can safely ignore this email.')}
  `;

  return base(content, `${labelName} has invited you to join their MIXXEA label team.`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 9 — Playlist Pitch Status Update
// ═══════════════════════════════════════════════════════════════════════════════
export function pitchStatusEmail(
  artistName: string,
  trackTitle: string,
  playlistName: string,
  curatorName: string,
  status: 'accepted' | 'rejected' | 'reviewing',
  message?: string
): string {
  const statusMap = {
    accepted: { emoji: '🎉', title: 'Your pitch was ACCEPTED!', color: '#10B981', label: 'Accepted' },
    rejected: { emoji: '🙏', title: 'Pitch not selected this time', color: '#FF5252', label: 'Not Selected' },
    reviewing: { emoji: '👀', title: 'Your pitch is being reviewed', color: '#F59E0B', label: 'Under Review' },
  };
  const s = statusMap[status];

  const content = `
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;font-size:48px;margin-bottom:16px;">${s.emoji}</div>
      ${h1(s.title)}
      ${badge(s.label, s.color)}
      <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:12px 0 0;">Playlist pitch update for <strong style="color:#ffffff;">"${trackTitle}"</strong></p>
    </div>

    ${gradientLine()}

    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        ${infoRow('Track', trackTitle)}
        ${infoRow('Playlist', playlistName)}
        ${infoRow('Curator', curatorName)}
        ${infoRow('Status', s.label)}
        ${infoRow('Updated', new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))}
      </table>
    </div>

    ${message ? `
      <div style="background:rgba(123,95,255,0.08);border:1px solid rgba(123,95,255,0.2);border-radius:14px;padding:20px 24px;margin-bottom:24px;">
        <div style="color:#ffffff;font-size:13px;font-weight:700;margin-bottom:8px;">Message from ${curatorName}:</div>
        <div style="color:rgba(255,255,255,0.7);font-size:14px;line-height:1.6;font-style:italic;">"${message}"</div>
      </div>
    ` : ''}

    ${status === 'rejected' ? `
      <div style="background:rgba(255,82,82,0.06);border-left:3px solid rgba(255,82,82,0.4);border-radius:0 10px 10px 0;padding:14px 18px;margin-bottom:24px;">
        ${small('Don\'t be discouraged — curators receive hundreds of pitches per week. Keep submitting, refine your pitch message, and make sure your track\'s artwork and metadata are polished. 💪')}
      </div>
    ` : ''}

    ${ctaBtn('🎸 View Marketplace →', 'https://mixxea.com/dashboard/marketplace')}

    ${gradientLine()}
    ${small(`You received this because you submitted a playlist pitch on MIXXEA. Pitch reference: ${artistName} → ${playlistName}`)}
  `;

  return base(content, `Pitch update: "${trackTitle}" → ${playlistName} — ${s.label}`);
}
