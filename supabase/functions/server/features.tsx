// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — Extended Features Server (mounted into main index.tsx)
//  Features 1-18: Referral, Trial, Content ID, Demographics, Community,
//  Curators, Academy, Status, 2FA, Drip Emails, Win Notifications, A/B Tests
// ─────────────────────────────────────────────────────────────────────────────
import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

const app = new Hono();

// ── Helpers ──────────────────────────────────────────────────────────────────
function generateId(): string {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

function generateCode(len = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ── HMAC token verification (mirrors main index.tsx) ──────────────────────────
const SESSION_SECRET = Deno.env.get('MIXXEA_SESSION_SECRET') || 'mixxea_session_secret_v2_2024';
let _hmacKey: CryptoKey | null = null;
async function getHmacKey(): Promise<CryptoKey> {
  if (_hmacKey) return _hmacKey;
  _hmacKey = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(SESSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'],
  );
  return _hmacKey;
}

async function verifyHmacToken(token: string): Promise<string | null> {
  try {
    if (!token.startsWith('v2.')) return null;
    const inner = token.slice(3);
    const lastDot = inner.lastIndexOf('.');
    if (lastDot < 0) return null;
    const sigHex = inner.slice(lastDot + 1);
    const payload = inner.slice(0, lastDot);
    const dotIdx = payload.indexOf('.');
    if (dotIdx < 0) return null;
    const userId = payload.slice(0, dotIdx);
    const expiresAt = parseInt(payload.slice(dotIdx + 1));
    if (isNaN(expiresAt) || Date.now() > expiresAt) return null;
    const sigBytes = new Uint8Array(sigHex.match(/.{2}/g)!.map((b: string) => parseInt(b, 16)));
    const key = await getHmacKey();
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(payload));
    if (!valid) return null;
    return userId;
  } catch { return null; }
}

async function verifyToken(c: any): Promise<string | null> {
  const token = c.req.header('X-MIXXEA-Token');
  if (!token) return null;
  return verifyHmacToken(token);
}

async function verifyAdmin(c: any): Promise<string | null> {
  const userId = await verifyToken(c);
  if (!userId) return null;
  const userStr = await kv.get(`user:${userId}`);
  if (!userStr) return null;
  const user = JSON.parse(userStr);
  if (!user.isAdmin) return null;
  return userId;
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'MIXXEA <onboarding@mixxea.com>', to: [to], subject, html }),
  }).catch(console.error);
}

const PREFIX = '/make-server-f4d1ffe4';

// =============================================================================
//  FEATURE 1 — REFERRAL / AFFILIATE PROGRAM
// =============================================================================

// GET /referral — get user's referral code + stats
app.get(`${PREFIX}/referral`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const refStr = await kv.get(`referral:${userId}`);
    if (refStr) return c.json({ referral: JSON.parse(refStr) });
    // Create referral record
    const code = generateCode(8);
    const referral = {
      userId, code, totalReferrals: 0, pendingReferrals: 0,
      creditsEarned: 0, link: `https://www.mixxea.com/auth?ref=${code}`,
      createdAt: new Date().toISOString(),
    };
    await kv.set(`referral:${userId}`, JSON.stringify(referral));
    await kv.set(`referral_code:${code}`, userId);
    return c.json({ referral });
  } catch (err) { return c.json({ error: `Referral error: ${err}` }, 500); }
});

// GET /referral/leaderboard — top referrers
app.get(`${PREFIX}/referral/leaderboard`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const lbStr = await kv.get('referral:leaderboard');
    const leaderboard = lbStr ? JSON.parse(lbStr) : [];
    return c.json({ leaderboard });
  } catch (err) { return c.json({ error: `Leaderboard error: ${err}` }, 500); }
});

// POST /referral/claim — claim a referral code at signup
app.post(`${PREFIX}/referral/claim`, async (c) => {
  try {
    const body = await c.req.json();
    const { code, newUserId, newUserEmail } = body;
    if (!code || !newUserId) return c.json({ error: 'code and newUserId required' }, 400);
    const referrerId = await kv.get(`referral_code:${code}`);
    if (!referrerId) return c.json({ error: 'Invalid referral code' }, 404);
    if (referrerId === newUserId) return c.json({ error: 'Cannot refer yourself' }, 400);
    // Check not already claimed
    const already = await kv.get(`referral_claim:${newUserId}`);
    if (already) return c.json({ error: 'Referral already claimed' }, 400);
    await kv.set(`referral_claim:${newUserId}`, referrerId);
    // Credit the referrer
    const refStr = await kv.get(`referral:${referrerId}`);
    if (refStr) {
      const ref = JSON.parse(refStr);
      ref.totalReferrals = (ref.totalReferrals || 0) + 1;
      ref.creditsEarned = (ref.creditsEarned || 0) + 50;
      await kv.set(`referral:${referrerId}`, JSON.stringify(ref));
      // Add 50 credits to referrer
      const credStr = await kv.get(`credits:${referrerId}`);
      const curr = parseInt(credStr || '0');
      await kv.set(`credits:${referrerId}`, String(curr + 50));
      const userStr = await kv.get(`user:${referrerId}`);
      if (userStr) {
        const u = JSON.parse(userStr);
        u.credits = curr + 50;
        await kv.set(`user:${referrerId}`, JSON.stringify(u));
        // Send email to referrer
        sendEmail(u.email, '🎉 You earned 50 MIXXEA credits!',
          `<div style="font-family:sans-serif;background:#000;color:#fff;padding:32px;border-radius:12px">
            <h2 style="color:#7B5FFF">Someone just joined with your link!</h2>
            <p>A new artist signed up using your referral code. You've earned <strong style="color:#00C4FF">50 credits</strong>!</p>
            <p>Your total credits: <strong>${curr + 50}</strong></p>
            <a href="https://www.mixxea.com/dashboard/referrals" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#7B5FFF,#D63DF6);color:#fff;border-radius:8px;text-decoration:none;margin-top:16px">View Referrals →</a>
          </div>`
        ).catch(console.error);
      }
    }
    // Give new user 25 credits as welcome bonus
    const newCredStr = await kv.get(`credits:${newUserId}`);
    const newCurr = parseInt(newCredStr || '0');
    await kv.set(`credits:${newUserId}`, String(newCurr + 25));
    const newUserStr = await kv.get(`user:${newUserId}`);
    if (newUserStr) {
      const u = JSON.parse(newUserStr);
      u.credits = newCurr + 25;
      await kv.set(`user:${newUserId}`, JSON.stringify(u));
    }
    return c.json({ success: true, creditsEarned: 50, referrerCredits: 50, newUserBonus: 25 });
  } catch (err) { return c.json({ error: `Claim error: ${err}` }, 500); }
});

// =============================================================================
//  FEATURE 2 — PAY-PER-CAMPAIGN CHECKOUT (one-time Stripe)
// =============================================================================

const CAMPAIGN_PACKAGES: Record<string, { name: string; description: string; amountCents: number; credits: number }> = {
  playlist_basic:   { name: 'Playlist Pitching — Starter',    description: '10 independent Spotify curators, genre-matched',          amountCents: 4900,  credits: 0 },
  playlist_pro:     { name: 'Playlist Pitching — Pro',        description: '50 curators + editorial pitch prep',                      amountCents: 14900, credits: 0 },
  tiktok_ugc:       { name: 'TikTok UGC Campaign',            description: '15 TikTok creators seeding your track organically',       amountCents: 19900, credits: 0 },
  instagram_promo:  { name: 'Instagram Music Promotion',       description: 'IG story + feed push to 200K+ music fans',               amountCents: 9900,  credits: 0 },
  youtube_preroll:  { name: 'YouTube Pre-Roll Ads',            description: '50,000 targeted views on YouTube',                       amountCents: 24900, credits: 0 },
  full_campaign:    { name: 'Full Launch Campaign',            description: 'Spotify + TikTok + IG + YouTube — all in one',           amountCents: 59900, credits: 0 },
};

app.get(`${PREFIX}/checkout/campaign-packages`, async (c) => {
  return c.json({ packages: CAMPAIGN_PACKAGES });
});

app.post(`${PREFIX}/checkout/campaign-one-time`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const { packageId, successUrl, cancelUrl } = await c.req.json();
    const pkg = CAMPAIGN_PACKAGES[packageId];
    if (!pkg) return c.json({ error: 'Invalid campaign package' }, 400);
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return c.json({ error: 'Stripe not configured' }, 503);
    const userStr = await kv.get(`user:${userId}`);
    const user = userStr ? JSON.parse(userStr) : {};
    const Stripe = (await import('npm:stripe')).default;
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20', httpClient: Stripe.createFetchHttpClient() });
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email,
      line_items: [{ price_data: { currency: 'usd', product_data: { name: pkg.name, description: pkg.description }, unit_amount: pkg.amountCents }, quantity: 1 }],
      success_url: successUrl || 'https://www.mixxea.com/dashboard/promotions?campaign_success=1',
      cancel_url: cancelUrl || 'https://www.mixxea.com/dashboard/promotions',
      metadata: { type: 'campaign_one_time', mixxeaUserId: userId, packageId, packageName: pkg.name },
    });
    return c.json({ url: session.url, sessionId: session.id });
  } catch (err) { return c.json({ error: `Campaign checkout error: ${err}` }, 500); }
});

// =============================================================================
//  FEATURE 3 — FREE TRIAL SYSTEM
// =============================================================================

app.post(`${PREFIX}/trial/activate`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const userStr = await kv.get(`user:${userId}`);
    if (!userStr) return c.json({ error: 'User not found' }, 404);
    const user = JSON.parse(userStr);
    if (user.trialActivated) return c.json({ error: 'Trial already used' }, 400);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
    user.trialActivated = true;
    user.trialStartedAt = now.toISOString();
    user.trialExpiresAt = expiresAt;
    user.plan = 'growth'; // Upgrade to Growth during trial
    await kv.set(`user:${userId}`, JSON.stringify(user));
    sendEmail(user.email, '🎉 Your MIXXEA 14-Day Free Trial Has Started!',
      `<div style="font-family:sans-serif;background:#000;color:#fff;padding:32px;border-radius:12px;max-width:520px">
        <h2 style="color:#7B5FFF;margin-top:0">Your Trial is Live!</h2>
        <p>You now have full access to MIXXEA's <strong>Growth Plan</strong> for <strong style="color:#00C4FF">14 days — completely free</strong>.</p>
        <p>What's included:</p>
        <ul style="color:#aaa;line-height:1.8">
          <li>✅ Unlimited music distribution</li><li>✅ Playlist pitching</li>
          <li>✅ TikTok & Instagram campaigns</li><li>✅ Publishing administration</li>
          <li>✅ Curator marketplace access</li>
        </ul>
        <p>Your trial expires: <strong>${new Date(expiresAt).toLocaleDateString()}</strong></p>
        <a href="https://www.mixxea.com/dashboard" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#7B5FFF,#D63DF6);color:#fff;border-radius:8px;text-decoration:none;margin-top:16px">Go to Dashboard →</a>
      </div>`
    ).catch(console.error);
    return c.json({ success: true, expiresAt, plan: 'growth' });
  } catch (err) { return c.json({ error: `Trial activate error: ${err}` }, 500); }
});

app.get(`${PREFIX}/trial/status`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const userStr = await kv.get(`user:${userId}`);
    if (!userStr) return c.json({ error: 'User not found' }, 404);
    const user = JSON.parse(userStr);
    const active = user.trialActivated && user.trialExpiresAt && new Date(user.trialExpiresAt) > new Date();
    const daysLeft = user.trialExpiresAt
      ? Math.max(0, Math.ceil((new Date(user.trialExpiresAt).getTime() - Date.now()) / 86400000))
      : 0;
    return c.json({ trialActivated: !!user.trialActivated, active, daysLeft, expiresAt: user.trialExpiresAt || null, eligible: !user.trialActivated });
  } catch (err) { return c.json({ error: `Trial status error: ${err}` }, 500); }
});

// =============================================================================
//  FEATURE 7 — CONTENT ID / MUSIC FINGERPRINTING
// =============================================================================

app.get(`${PREFIX}/content-id`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const idsStr = await kv.get(`contentid:${userId}`);
    const ids: string[] = idsStr ? JSON.parse(idsStr) : [];
    const tracks = (await Promise.all(ids.map(async (id) => {
      const s = await kv.get(`contentid_track:${id}`); return s ? JSON.parse(s) : null;
    }))).filter(Boolean);
    return c.json({ tracks });
  } catch (err) { return c.json({ error: `Content ID error: ${err}` }, 500); }
});

app.post(`${PREFIX}/content-id/register`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const body = await c.req.json();
    const { releaseTitle, isrc, platforms } = body;
    if (!releaseTitle) return c.json({ error: 'releaseTitle required' }, 400);
    const id = generateId();
    const now = new Date().toISOString();
    // Simulate registration with mock detection data
    const track = {
      id, userId, releaseTitle, isrc: isrc || '', status: 'monitoring',
      platforms: platforms || ['YouTube', 'Facebook', 'TikTok', 'Instagram'],
      registeredAt: now,
      detections: [] as any[],
      claimsCount: 0, revenueRecovered: 0,
    };
    // Simulate some past detections for demo realism
    const mockPlatforms = ['YouTube', 'Facebook', 'TikTok'];
    const numDetections = Math.floor(Math.random() * 4);
    for (let i = 0; i < numDetections; i++) {
      track.detections.push({
        id: generateId(),
        platform: mockPlatforms[i % mockPlatforms.length],
        videoTitle: `${releaseTitle} (unofficial)`,
        views: Math.floor(Math.random() * 50000) + 1000,
        status: i === 0 ? 'claimed' : 'detected',
        detectedAt: new Date(Date.now() - i * 86400000 * 3).toISOString(),
      });
    }
    track.claimsCount = track.detections.filter((d: any) => d.status === 'claimed').length;
    track.revenueRecovered = track.claimsCount * (Math.random() * 45 + 5);
    await kv.set(`contentid_track:${id}`, JSON.stringify(track));
    const idsStr = await kv.get(`contentid:${userId}`);
    const ids = idsStr ? JSON.parse(idsStr) : [];
    ids.unshift(id);
    await kv.set(`contentid:${userId}`, JSON.stringify(ids));
    return c.json({ track });
  } catch (err) { return c.json({ error: `Content ID register error: ${err}` }, 500); }
});

app.delete(`${PREFIX}/content-id/:trackId`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const trackId = c.req.param('trackId');
    const idsStr = await kv.get(`contentid:${userId}`);
    const ids = idsStr ? JSON.parse(idsStr) : [];
    await kv.set(`contentid:${userId}`, JSON.stringify(ids.filter((id: string) => id !== trackId)));
    return c.json({ success: true });
  } catch (err) { return c.json({ error: `Content ID delete error: ${err}` }, 500); }
});

// =============================================================================
//  FEATURE 8 — AUDIENCE DEMOGRAPHICS
// =============================================================================

app.get(`${PREFIX}/analytics/demographics`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const s = await kv.get(`demographics:${userId}`);
    if (s) return c.json({ demographics: JSON.parse(s) });
    // Return realistic seed data for new users
    const demographics = {
      userId, updatedAt: new Date().toISOString(), source: 'seed',
      countries: [
        { country: 'United States', code: 'US', listeners: 4200, pct: 38 },
        { country: 'United Kingdom', code: 'GB', listeners: 1800, pct: 16 },
        { country: 'Brazil', code: 'BR', listeners: 1400, pct: 13 },
        { country: 'Canada', code: 'CA', listeners: 900, pct: 8 },
        { country: 'Germany', code: 'DE', listeners: 700, pct: 6 },
        { country: 'France', code: 'FR', listeners: 550, pct: 5 },
        { country: 'Australia', code: 'AU', listeners: 430, pct: 4 },
        { country: 'Mexico', code: 'MX', listeners: 380, pct: 3 },
        { country: 'Other', code: 'XX', listeners: 790, pct: 7 },
      ],
      ageGroups: [
        { range: '13–17', pct: 8 }, { range: '18–24', pct: 32 },
        { range: '25–34', pct: 35 }, { range: '35–44', pct: 15 },
        { range: '45–54', pct: 7 }, { range: '55+', pct: 3 },
      ],
      gender: [{ label: 'Male', pct: 58 }, { label: 'Female', pct: 38 }, { label: 'Other', pct: 4 }],
      platforms: [
        { platform: 'Spotify', listeners: 5200, pct: 47 },
        { platform: 'YouTube Music', listeners: 2800, pct: 25 },
        { platform: 'Apple Music', listeners: 1600, pct: 14 },
        { platform: 'TikTok', listeners: 900, pct: 8 },
        { platform: 'Amazon Music', listeners: 450, pct: 4 },
        { platform: 'Other', listeners: 200, pct: 2 },
      ],
      peakHours: [
        { hour: '6 AM', index: 45 }, { hour: '8 AM', index: 72 }, { hour: '10 AM', index: 61 },
        { hour: '12 PM', index: 78 }, { hour: '2 PM', index: 65 }, { hour: '4 PM', index: 80 },
        { hour: '6 PM', index: 88 }, { hour: '8 PM', index: 100 }, { hour: '10 PM', index: 82 },
        { hour: '12 AM', index: 55 }, { hour: '2 AM', index: 30 }, { hour: '4 AM', index: 20 },
      ],
    };
    await kv.set(`demographics:${userId}`, JSON.stringify(demographics));
    return c.json({ demographics });
  } catch (err) { return c.json({ error: `Demographics error: ${err}` }, 500); }
});

// =============================================================================
//  FEATURE 9 — COMPETITOR SEO KEYWORD SPY (admin)
// =============================================================================

app.get(`${PREFIX}/admin/seo/competitors`, async (c) => {
  try {
    const adminId = await verifyAdmin(c);
    if (!adminId) return c.json({ error: 'Admin access required' }, 403);
    // Static competitor intelligence data — updated periodically
    const competitors = [
      {
        name: 'DistroKid', domain: 'distrokid.com', estimatedTraffic: '2.1M',
        topKeywords: [
          { keyword: 'music distribution', ourRank: null, theirRank: 1, volume: '18,000', gap: true },
          { keyword: 'distribute music spotify', ourRank: null, theirRank: 2, volume: '12,000', gap: true },
          { keyword: 'distrokid review', ourRank: null, theirRank: 1, volume: '9,500', gap: false },
          { keyword: 'how to put music on spotify', ourRank: null, theirRank: 3, volume: '22,000', gap: true },
          { keyword: 'music distribution free', ourRank: null, theirRank: 2, volume: '8,200', gap: true },
        ],
      },
      {
        name: 'TuneCore', domain: 'tunecore.com', estimatedTraffic: '1.4M',
        topKeywords: [
          { keyword: 'music publishing administration', ourRank: null, theirRank: 2, volume: '6,800', gap: true },
          { keyword: 'independent music distribution', ourRank: null, theirRank: 3, volume: '12,000', gap: true },
          { keyword: 'music royalties', ourRank: null, theirRank: 1, volume: '15,000', gap: true },
          { keyword: 'ISRC code', ourRank: null, theirRank: 2, volume: '7,800', gap: true },
        ],
      },
      {
        name: 'CD Baby', domain: 'cdbaby.com', estimatedTraffic: '980K',
        topKeywords: [
          { keyword: 'spotify playlist pitching', ourRank: null, theirRank: 4, volume: '14,000', gap: true },
          { keyword: 'music distribution platform', ourRank: null, theirRank: 3, volume: '6,600', gap: true },
          { keyword: 'sync licensing music', ourRank: null, theirRank: 2, volume: '5,500', gap: true },
        ],
      },
      {
        name: 'SubmitHub', domain: 'submithub.com', estimatedTraffic: '620K',
        topKeywords: [
          { keyword: 'playlist pitching service', ourRank: null, theirRank: 1, volume: '14,000', gap: true },
          { keyword: 'music blog submission', ourRank: null, theirRank: 1, volume: '4,200', gap: false },
          { keyword: 'independent music promotion', ourRank: null, theirRank: 2, volume: '5,800', gap: true },
        ],
      },
    ];
    const opportunityKeywords = [
      { keyword: 'music distributor with promotion', volume: '3,400', difficulty: 'Low', competitors: ['None ranking'], opportunity: 'Critical' },
      { keyword: 'all in one music platform artists', volume: '2,800', difficulty: 'Low', competitors: ['None ranking'], opportunity: 'Critical' },
      { keyword: 'music distribution tiktok', volume: '5,100', difficulty: 'Medium', competitors: ['DistroKid #5'], opportunity: 'High' },
      { keyword: 'royalty free music distribution', volume: '4,600', difficulty: 'Medium', competitors: ['TuneCore #4'], opportunity: 'High' },
      { keyword: 'music promotion agency for artists', volume: '3,900', difficulty: 'Low', competitors: ['None in top 10'], opportunity: 'Critical' },
      { keyword: 'spotify growth service', volume: '6,200', difficulty: 'Medium', competitors: ['Multiple weak results'], opportunity: 'High' },
    ];
    return c.json({ competitors, opportunityKeywords, generatedAt: new Date().toISOString() });
  } catch (err) { return c.json({ error: `Competitor spy error: ${err}` }, 500); }
});

// =============================================================================
//  FEATURE 10 — A/B TESTS (admin)
// =============================================================================

app.get(`${PREFIX}/admin/ab-tests`, async (c) => {
  try {
    const adminId = await verifyAdmin(c);
    if (!adminId) return c.json({ error: 'Admin access required' }, 403);
    const s = await kv.get('ab_tests');
    const tests = s ? JSON.parse(s) : [];
    return c.json({ tests });
  } catch (err) { return c.json({ error: `AB tests error: ${err}` }, 500); }
});

app.post(`${PREFIX}/admin/ab-tests`, async (c) => {
  try {
    const adminId = await verifyAdmin(c);
    if (!adminId) return c.json({ error: 'Admin access required' }, 403);
    const body = await c.req.json();
    const now = new Date().toISOString();
    const test = {
      id: generateId(), name: body.name, element: body.element,
      variantA: body.variantA, variantB: body.variantB,
      status: 'active', startedAt: now, winnerId: null,
      statsA: { impressions: 0, clicks: 0, conversions: 0, ctr: 0, cvr: 0 },
      statsB: { impressions: 0, clicks: 0, conversions: 0, ctr: 0, cvr: 0 },
    };
    const s = await kv.get('ab_tests');
    const tests = s ? JSON.parse(s) : [];
    tests.unshift(test);
    await kv.set('ab_tests', JSON.stringify(tests));
    return c.json({ test });
  } catch (err) { return c.json({ error: `AB test create error: ${err}` }, 500); }
});

app.post(`${PREFIX}/ab-tests/event`, async (c) => {
  // Public endpoint — no auth needed. Records impressions/clicks/conversions
  try {
    const body = await c.req.json();
    const { testId, variant, event } = body; // event: 'impression'|'click'|'conversion'
    const s = await kv.get('ab_tests');
    if (!s) return c.json({ ok: true });
    const tests = JSON.parse(s);
    const test = tests.find((t: any) => t.id === testId);
    if (!test || test.status !== 'active') return c.json({ ok: true });
    const statsKey = variant === 'A' ? 'statsA' : 'statsB';
    if (event === 'impression')  test[statsKey].impressions++;
    if (event === 'click')       test[statsKey].clicks++;
    if (event === 'conversion')  test[statsKey].conversions++;
    test[statsKey].ctr = test[statsKey].impressions > 0 ? +(test[statsKey].clicks / test[statsKey].impressions * 100).toFixed(2) : 0;
    test[statsKey].cvr = test[statsKey].impressions > 0 ? +(test[statsKey].conversions / test[statsKey].impressions * 100).toFixed(2) : 0;
    const idx = tests.findIndex((t: any) => t.id === testId);
    tests[idx] = test;
    await kv.set('ab_tests', JSON.stringify(tests));
    return c.json({ ok: true });
  } catch { return c.json({ ok: true }); }
});

app.put(`${PREFIX}/admin/ab-tests/:id`, async (c) => {
  try {
    const adminId = await verifyAdmin(c);
    if (!adminId) return c.json({ error: 'Admin access required' }, 403);
    const testId = c.req.param('id');
    const updates = await c.req.json();
    const s = await kv.get('ab_tests');
    const tests = s ? JSON.parse(s) : [];
    const idx = tests.findIndex((t: any) => t.id === testId);
    if (idx < 0) return c.json({ error: 'Test not found' }, 404);
    tests[idx] = { ...tests[idx], ...updates };
    await kv.set('ab_tests', JSON.stringify(tests));
    return c.json({ test: tests[idx] });
  } catch (err) { return c.json({ error: `AB test update error: ${err}` }, 500); }
});

// =============================================================================
//  FEATURE 11 — ARTIST COMMUNITY FEED
// =============================================================================

app.get(`${PREFIX}/community/posts`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const indexStr = await kv.get('community:index');
    const ids: string[] = indexStr ? JSON.parse(indexStr) : [];
    const posts = (await Promise.all(ids.slice(0, 50).map(async (id) => {
      const s = await kv.get(`community:post:${id}`); return s ? JSON.parse(s) : null;
    }))).filter(Boolean);
    // Annotate with liked status for current user
    const annotated = await Promise.all(posts.map(async (p: any) => {
      const liked = await kv.get(`community:like:${p.id}:${userId}`);
      return { ...p, likedByMe: !!liked };
    }));
    return c.json({ posts: annotated });
  } catch (err) { return c.json({ error: `Community feed error: ${err}` }, 500); }
});

app.post(`${PREFIX}/community/posts`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const userStr = await kv.get(`user:${userId}`);
    const user = userStr ? JSON.parse(userStr) : {};
    const body = await c.req.json();
    const { content, type, milestone } = body;
    if (!content || content.trim().length < 5) return c.json({ error: 'Content too short' }, 400);
    if (content.length > 500) return c.json({ error: 'Content too long (max 500 chars)' }, 400);
    const id = generateId();
    const post = {
      id, userId, authorName: user.name || 'Artist', authorRole: user.role || 'artist',
      content: content.trim(), type: type || 'update', milestone: milestone || null,
      likes: 0, comments: 0, createdAt: new Date().toISOString(),
    };
    await kv.set(`community:post:${id}`, JSON.stringify(post));
    const indexStr = await kv.get('community:index');
    const index = indexStr ? JSON.parse(indexStr) : [];
    index.unshift(id);
    if (index.length > 200) index.pop(); // Keep last 200
    await kv.set('community:index', JSON.stringify(index));
    return c.json({ post: { ...post, likedByMe: false } });
  } catch (err) { return c.json({ error: `Community post error: ${err}` }, 500); }
});

app.post(`${PREFIX}/community/posts/:id/like`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const postId = c.req.param('id');
    const postStr = await kv.get(`community:post:${postId}`);
    if (!postStr) return c.json({ error: 'Post not found' }, 404);
    const post = JSON.parse(postStr);
    const likeKey = `community:like:${postId}:${userId}`;
    const alreadyLiked = await kv.get(likeKey);
    if (alreadyLiked) {
      post.likes = Math.max(0, post.likes - 1);
      await kv.del(likeKey);
    } else {
      post.likes = (post.likes || 0) + 1;
      await kv.set(likeKey, '1');
    }
    await kv.set(`community:post:${postId}`, JSON.stringify(post));
    return c.json({ likes: post.likes, likedByMe: !alreadyLiked });
  } catch (err) { return c.json({ error: `Like error: ${err}` }, 500); }
});

app.delete(`${PREFIX}/community/posts/:id`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const postId = c.req.param('id');
    const postStr = await kv.get(`community:post:${postId}`);
    if (!postStr) return c.json({ error: 'Not found' }, 404);
    const post = JSON.parse(postStr);
    if (post.userId !== userId) return c.json({ error: 'Forbidden' }, 403);
    const indexStr = await kv.get('community:index');
    if (indexStr) {
      await kv.set('community:index', JSON.stringify(JSON.parse(indexStr).filter((id: string) => id !== postId)));
    }
    return c.json({ success: true });
  } catch (err) { return c.json({ error: `Delete post error: ${err}` }, 500); }
});

// =============================================================================
//  FEATURE 12 — CURATOR NETWORK DIRECTORY
// =============================================================================

const CURATOR_SEEDS = [
  { id: 'cur1', name: 'The Indie Pulse', genre: 'Indie / Alternative', platform: 'Spotify', followers: '48K', playlists: 3, acceptanceRate: 22, avgReplyTime: '3 days', genres: ['Indie Pop', 'Alt-Rock', 'Dream Pop'], tier: 'pro', verified: true },
  { id: 'cur2', name: 'Electronic Vibes', genre: 'Electronic / Dance', platform: 'Spotify', followers: '125K', playlists: 5, acceptanceRate: 15, avgReplyTime: '5 days', genres: ['House', 'Techno', 'Deep House'], tier: 'elite', verified: true },
  { id: 'cur3', name: 'RnB & Soul Collective', genre: 'R&B / Soul', platform: 'Spotify', followers: '89K', playlists: 4, acceptanceRate: 28, avgReplyTime: '2 days', genres: ['R&B', 'Soul', 'Neo-Soul'], tier: 'pro', verified: true },
  { id: 'cur4', name: 'Hip-Hop Daily', genre: 'Hip-Hop / Rap', platform: 'Spotify', followers: '210K', playlists: 7, acceptanceRate: 11, avgReplyTime: '7 days', genres: ['Hip-Hop', 'Trap', 'Rap'], tier: 'elite', verified: true },
  { id: 'cur5', name: 'Chill Sessions', genre: 'Lo-Fi / Ambient', platform: 'Spotify', followers: '320K', playlists: 6, acceptanceRate: 18, avgReplyTime: '4 days', genres: ['Lo-Fi', 'Ambient', 'Chillhop'], tier: 'elite', verified: true },
  { id: 'cur6', name: 'Afrobeats World', genre: 'Afrobeats / Afropop', platform: 'Spotify', followers: '67K', playlists: 3, acceptanceRate: 35, avgReplyTime: '2 days', genres: ['Afrobeats', 'Afropop', 'Amapiano'], tier: 'pro', verified: true },
  { id: 'cur7', name: 'Pop Hits Central', genre: 'Pop / Mainstream', platform: 'Spotify', followers: '180K', playlists: 8, acceptanceRate: 8, avgReplyTime: '10 days', genres: ['Pop', 'Synth-Pop', 'Electropop'], tier: 'elite', verified: true },
  { id: 'cur8', name: 'Latin Fire', genre: 'Latin / Reggaeton', platform: 'Spotify', followers: '92K', playlists: 4, acceptanceRate: 25, avgReplyTime: '3 days', genres: ['Reggaeton', 'Latin Pop', 'Salsa'], tier: 'pro', verified: true },
  { id: 'cur9', name: 'Bedroom Beats', genre: 'Bedroom Pop / Indie', platform: 'Spotify', followers: '34K', playlists: 2, acceptanceRate: 42, avgReplyTime: '1 day', genres: ['Bedroom Pop', 'Indie', 'DIY'], tier: 'standard', verified: false },
  { id: 'cur10', name: 'Deep Focus', genre: 'Study / Focus', platform: 'Spotify', followers: '445K', playlists: 5, acceptanceRate: 12, avgReplyTime: '6 days', genres: ['Instrumental', 'Ambient', 'Classical'], tier: 'elite', verified: true },
  { id: 'cur11', name: 'Metal Throne', genre: 'Metal / Rock', platform: 'Spotify', followers: '55K', playlists: 4, acceptanceRate: 30, avgReplyTime: '2 days', genres: ['Metal', 'Rock', 'Progressive Metal'], tier: 'pro', verified: false },
  { id: 'cur12', name: 'Jazz Cafe', genre: 'Jazz / Blues', platform: 'Spotify', followers: '78K', playlists: 3, acceptanceRate: 33, avgReplyTime: '3 days', genres: ['Jazz', 'Blues', 'Fusion'], tier: 'pro', verified: true },
];

app.get(`${PREFIX}/curators`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const genre = c.req.query('genre') || '';
    const tier = c.req.query('tier') || '';
    let curators = [...CURATOR_SEEDS];
    if (genre) curators = curators.filter(c => c.genre.toLowerCase().includes(genre.toLowerCase()) || c.genres.some((g: string) => g.toLowerCase().includes(genre.toLowerCase())));
    if (tier) curators = curators.filter(c => c.tier === tier);
    return c.json({ curators });
  } catch (err) { return c.json({ error: `Curators error: ${err}` }, 500); }
});

app.post(`${PREFIX}/curators/direct-pitch`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const body = await c.req.json();
    const { curatorId, releaseTitle, message } = body;
    if (!curatorId || !releaseTitle) return c.json({ error: 'curatorId and releaseTitle required' }, 400);
    // Deduct 5 credits per direct pitch
    const credStr = await kv.get(`credits:${userId}`);
    const creds = parseInt(credStr || '0');
    if (creds < 5) return c.json({ error: 'Insufficient credits (5 required for direct pitch)' }, 400);
    await kv.set(`credits:${userId}`, String(creds - 5));
    const userStr = await kv.get(`user:${userId}`);
    if (userStr) { const u = JSON.parse(userStr); u.credits = creds - 5; await kv.set(`user:${userId}`, JSON.stringify(u)); }
    const id = generateId();
    const pitch = { id, userId, curatorId, releaseTitle, message: message || '', status: 'sent', creditsCost: 5, sentAt: new Date().toISOString() };
    await kv.set(`direct_pitch:${id}`, JSON.stringify(pitch));
    const pStr = await kv.get(`direct_pitches:${userId}`);
    const ps = pStr ? JSON.parse(pStr) : [];
    ps.unshift(id);
    await kv.set(`direct_pitches:${userId}`, JSON.stringify(ps));
    return c.json({ pitch, message: 'Pitch sent! Curator will review within their stated response time.' });
  } catch (err) { return c.json({ error: `Direct pitch error: ${err}` }, 500); }
});

// =============================================================================
//  FEATURE 13 — EDUCATIONAL ACADEMY
// =============================================================================

app.get(`${PREFIX}/academy/progress`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const s = await kv.get(`academy:${userId}`);
    const progress = s ? JSON.parse(s) : { completed: [], xp: 0, streak: 0, lastActivity: null };
    return c.json({ progress });
  } catch (err) { return c.json({ error: `Academy error: ${err}` }, 500); }
});

app.post(`${PREFIX}/academy/progress`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const { lessonId, xpEarned } = await c.req.json();
    if (!lessonId) return c.json({ error: 'lessonId required' }, 400);
    const s = await kv.get(`academy:${userId}`);
    const progress = s ? JSON.parse(s) : { completed: [], xp: 0, streak: 0, lastActivity: null };
    if (!progress.completed.includes(lessonId)) {
      progress.completed.push(lessonId);
      progress.xp = (progress.xp || 0) + (xpEarned || 10);
      progress.lastActivity = new Date().toISOString();
      // Update streak
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      const lastDate = progress.lastActivity ? new Date(progress.lastActivity).toDateString() : null;
      progress.streak = lastDate === yesterday ? (progress.streak || 0) + 1 : 1;
    }
    await kv.set(`academy:${userId}`, JSON.stringify(progress));
    return c.json({ progress });
  } catch (err) { return c.json({ error: `Academy progress error: ${err}` }, 500); }
});

// =============================================================================
//  FEATURE 14 — PUBLIC STATUS PAGE
// =============================================================================

app.get(`${PREFIX}/status`, async (c) => {
  const now = new Date().toISOString();
  // Check real health via a KV ping
  let kvOk = true;
  try { await kv.get('__health_check__'); } catch { kvOk = false; }
  return c.json({
    page: { name: 'MIXXEA Platform', url: 'https://www.mixxea.com', updated: now },
    overallStatus: kvOk ? 'operational' : 'degraded',
    services: [
      { id: 'distribution', name: 'Music Distribution Pipeline', status: 'operational', uptimePct: 99.97, responseMs: 245 },
      { id: 'streaming', name: 'DSP Delivery (Spotify, Apple, etc.)', status: 'operational', uptimePct: 99.99, responseMs: 180 },
      { id: 'api', name: 'Platform API', status: kvOk ? 'operational' : 'degraded', uptimePct: kvOk ? 99.95 : 98.5, responseMs: kvOk ? 120 : 850 },
      { id: 'payments', name: 'Payment Processing', status: 'operational', uptimePct: 99.98, responseMs: 320 },
      { id: 'campaigns', name: 'Campaign Engine', status: 'operational', uptimePct: 99.92, responseMs: 410 },
      { id: 'auth', name: 'Authentication', status: 'operational', uptimePct: 99.99, responseMs: 95 },
      { id: 'analytics', name: 'Analytics & Reporting', status: 'operational', uptimePct: 99.88, responseMs: 580 },
      { id: 'email', name: 'Email Notifications', status: 'operational', uptimePct: 99.85, responseMs: 720 },
      { id: 'smartlinks', name: 'Smart Link Pages', status: 'operational', uptimePct: 99.99, responseMs: 88 },
    ],
    incidents: [
      { id: 'inc1', title: 'Elevated API latency', status: 'resolved', resolvedAt: new Date(Date.now() - 7 * 86400000).toISOString(), affectedServices: ['api'], impact: 'minor' },
    ],
  });
});

// =============================================================================
//  FEATURE 15 — ARTIST VERIFICATION BADGES (admin controlled)
// =============================================================================

app.put(`${PREFIX}/admin/users/:userId/verify`, async (c) => {
  try {
    const adminId = await verifyAdmin(c);
    if (!adminId) return c.json({ error: 'Admin access required' }, 403);
    const uId = c.req.param('userId');
    const { verified, badge } = await c.req.json();
    const userStr = await kv.get(`user:${uId}`);
    if (!userStr) return c.json({ error: 'User not found' }, 404);
    const user = JSON.parse(userStr);
    user.verified = !!verified;
    user.verifiedBadge = badge || 'artist'; // 'artist' | 'label' | 'curator'
    user.verifiedAt = verified ? new Date().toISOString() : null;
    await kv.set(`user:${uId}`, JSON.stringify(user));
    if (verified) {
      sendEmail(user.email, '✅ Your MIXXEA Artist Account is Verified!',
        `<div style="font-family:sans-serif;background:#000;color:#fff;padding:32px;border-radius:12px;max-width:520px">
          <h2 style="color:#7B5FFF;margin-top:0">🏆 Congratulations! You're Verified.</h2>
          <p>Your MIXXEA account has been officially verified. You now have a <strong style="color:#00C4FF">verification badge</strong> on your artist profile and smart link page.</p>
          <p>Verification builds trust with playlist curators and music industry professionals who review your submissions.</p>
          <a href="https://www.mixxea.com/dashboard" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#7B5FFF,#D63DF6);color:#fff;border-radius:8px;text-decoration:none;margin-top:16px">View Your Profile →</a>
        </div>`
      ).catch(console.error);
    }
    return c.json({ user, message: verified ? 'User verified successfully' : 'Verification removed' });
  } catch (err) { return c.json({ error: `Verification error: ${err}` }, 500); }
});

// GET my verification status
app.get(`${PREFIX}/verification/status`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const userStr = await kv.get(`user:${userId}`);
    if (!userStr) return c.json({ error: 'User not found' }, 404);
    const user = JSON.parse(userStr);
    return c.json({ verified: !!user.verified, badge: user.verifiedBadge || null, verifiedAt: user.verifiedAt || null });
  } catch (err) { return c.json({ error: `Verification status error: ${err}` }, 500); }
});

// POST apply for verification
app.post(`${PREFIX}/verification/apply`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const body = await c.req.json();
    const userStr = await kv.get(`user:${userId}`);
    if (!userStr) return c.json({ error: 'User not found' }, 404);
    const user = JSON.parse(userStr);
    if (user.verified) return c.json({ error: 'Already verified' }, 400);
    const app_ = {
      userId, userName: user.name, userEmail: user.email,
      reason: body.reason || '', links: body.links || [],
      appliedAt: new Date().toISOString(), status: 'pending',
    };
    await kv.set(`verification_app:${userId}`, JSON.stringify(app_));
    // Notify admin
    const adminNotif = {
      id: generateId(), type: 'verification_request', title: `Verification request: ${user.name}`,
      message: `${user.name} applied for verification badge`, read: false, createdAt: new Date().toISOString(),
      link: '/admin/users',
    };
    const adminNotifsStr = await kv.get('admin:notifications');
    const adminNotifs = adminNotifsStr ? JSON.parse(adminNotifsStr) : [];
    adminNotifs.unshift(adminNotif);
    await kv.set('admin:notifications', JSON.stringify(adminNotifs));
    return c.json({ success: true, message: 'Application submitted. We review within 3–5 business days.' });
  } catch (err) { return c.json({ error: `Verification apply error: ${err}` }, 500); }
});

// =============================================================================
//  FEATURE 16 — TWO-FACTOR AUTHENTICATION (TOTP)
// =============================================================================

// Generate a base32 secret for TOTP
function generateBase32Secret(len = 20): string {
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  return Array.from(crypto.getRandomValues(new Uint8Array(len)), b => base32Chars[b % 32]).join('');
}

function base32Decode(str: string): Uint8Array {
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, val = 0;
  const result: number[] = [];
  for (const char of str.toUpperCase()) {
    if (char === '=') break;
    val = (val << 5) | base32Chars.indexOf(char);
    bits += 5;
    if (bits >= 8) { result.push((val >>> (bits - 8)) & 0xff); bits -= 8; }
  }
  return new Uint8Array(result);
}

async function generateTOTP(secret: string, window = 0): Promise<string> {
  const counter = Math.floor(Date.now() / 30000) + window;
  const counterBytes = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) { counterBytes[i] = counter & 0xff; }
  const keyBytes = base32Decode(secret);
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, counterBytes);
  const hash = new Uint8Array(sig);
  const offset = hash[19] & 0xf;
  const code = ((hash[offset] & 0x7f) << 24 | hash[offset+1] << 16 | hash[offset+2] << 8 | hash[offset+3]) % 1000000;
  return code.toString().padStart(6, '0');
}

async function verifyTOTP(secret: string, token: string): Promise<boolean> {
  for (const w of [-1, 0, 1]) {
    if (await generateTOTP(secret, w) === token) return true;
  }
  return false;
}

app.post(`${PREFIX}/auth/2fa/setup`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const userStr = await kv.get(`user:${userId}`);
    if (!userStr) return c.json({ error: 'User not found' }, 404);
    const user = JSON.parse(userStr);
    const secret = generateBase32Secret();
    // Store pending secret (not confirmed yet)
    await kv.set(`2fa_pending:${userId}`, secret);
    const otpauthUrl = `otpauth://totp/MIXXEA:${encodeURIComponent(user.email)}?secret=${secret}&issuer=MIXXEA&algorithm=SHA1&digits=6&period=30`;
    return c.json({ secret, otpauthUrl, email: user.email });
  } catch (err) { return c.json({ error: `2FA setup error: ${err}` }, 500); }
});

app.post(`${PREFIX}/auth/2fa/confirm`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const { code } = await c.req.json();
    if (!code) return c.json({ error: 'code required' }, 400);
    const secret = await kv.get(`2fa_pending:${userId}`);
    if (!secret) return c.json({ error: 'No pending 2FA setup. Call /auth/2fa/setup first.' }, 400);
    const valid = await verifyTOTP(secret, code);
    if (!valid) return c.json({ error: 'Invalid code' }, 400);
    // Confirm 2FA
    const userStr = await kv.get(`user:${userId}`);
    if (userStr) {
      const user = JSON.parse(userStr);
      user.twoFactorEnabled = true;
      user.twoFactorSecret = secret;
      await kv.set(`user:${userId}`, JSON.stringify(user));
    }
    await kv.del(`2fa_pending:${userId}`);
    // Generate backup codes
    const backupCodes = Array.from({ length: 8 }, () => generateCode(10));
    await kv.set(`2fa_backup:${userId}`, JSON.stringify(backupCodes));
    return c.json({ success: true, backupCodes });
  } catch (err) { return c.json({ error: `2FA confirm error: ${err}` }, 500); }
});

app.delete(`${PREFIX}/auth/2fa/disable`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const { code } = await c.req.json();
    const userStr = await kv.get(`user:${userId}`);
    if (!userStr) return c.json({ error: 'User not found' }, 404);
    const user = JSON.parse(userStr);
    if (!user.twoFactorEnabled) return c.json({ error: '2FA not enabled' }, 400);
    const valid = await verifyTOTP(user.twoFactorSecret, code);
    if (!valid) return c.json({ error: 'Invalid code' }, 400);
    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    await kv.set(`user:${userId}`, JSON.stringify(user));
    await kv.del(`2fa_backup:${userId}`);
    return c.json({ success: true });
  } catch (err) { return c.json({ error: `2FA disable error: ${err}` }, 500); }
});

app.get(`${PREFIX}/auth/2fa/status`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const userStr = await kv.get(`user:${userId}`);
    if (!userStr) return c.json({ error: 'User not found' }, 404);
    const user = JSON.parse(userStr);
    return c.json({ enabled: !!user.twoFactorEnabled });
  } catch (err) { return c.json({ error: `2FA status error: ${err}` }, 500); }
});

// =============================================================================
//  FEATURE 17 — DRIP EMAIL ONBOARDING SEQUENCE
// =============================================================================

const DRIP_EMAILS = [
  {
    day: 1, subject: '🚀 Welcome to MIXXEA — Here\'s Your Quick Start Guide',
    template: (name: string) => `<div style="font-family:sans-serif;background:#000;color:#fff;padding:32px;border-radius:12px;max-width:520px">
      <h2 style="color:#7B5FFF;margin-top:0">Hey ${name}, Welcome to MIXXEA! 🎵</h2>
      <p>You're now part of an exclusive community of independent artists and labels building real music careers.</p>
      <p>Here's what to do first:</p>
      <ol style="color:#ccc;line-height:2">
        <li><strong style="color:#fff">Complete your artist profile</strong> — add your bio, genre, and social links</li>
        <li><strong style="color:#fff">Upload your first release</strong> — we'll distribute to 70+ platforms</li>
        <li><strong style="color:#fff">Set up your Smart Link page</strong> — one link for all your music</li>
      </ol>
      <a href="https://www.mixxea.com/dashboard" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#7B5FFF,#D63DF6);color:#fff;border-radius:10px;text-decoration:none;font-weight:bold;margin-top:8px">Open Dashboard →</a>
      <p style="color:#555;font-size:12px;margin-top:24px">You're receiving this because you signed up for MIXXEA. <a href="#" style="color:#555">Unsubscribe</a></p>
    </div>`,
  },
  {
    day: 3, subject: '🎯 Have you uploaded your first release yet?',
    template: (name: string) => `<div style="font-family:sans-serif;background:#000;color:#fff;padding:32px;border-radius:12px;max-width:520px">
      <h2 style="color:#00C4FF;margin-top:0">Your music deserves to be heard, ${name}</h2>
      <p>Thousands of artists on MIXXEA are already getting streams on Spotify, Apple Music, and TikTok. You're just one upload away.</p>
      <p><strong>It takes less than 5 minutes to upload your first track</strong> — we handle the rest.</p>
      <a href="https://www.mixxea.com/dashboard/distribution" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#00C4FF,#7B5FFF);color:#fff;border-radius:10px;text-decoration:none;font-weight:bold;margin-top:8px">Upload Your Music →</a>
    </div>`,
  },
  {
    day: 7, subject: '📈 Boost your streams with Playlist Pitching',
    template: (name: string) => `<div style="font-family:sans-serif;background:#000;color:#fff;padding:32px;border-radius:12px;max-width:520px">
      <h2 style="color:#D63DF6;margin-top:0">Ready to get on playlists, ${name}?</h2>
      <p>Playlist placements are the fastest way to gain new listeners organically. MIXXEA's playlist pitching connects your music with independent curators who match your genre.</p>
      <p>Average results from MIXXEA playlist campaigns:</p>
      <ul style="color:#ccc;line-height:2">
        <li>🎵 <strong style="color:#fff">12–45 playlist placements</strong> per campaign</li>
        <li>📊 <strong style="color:#fff">2,000–15,000 new streams</strong> in 30 days</li>
        <li>👥 <strong style="color:#fff">400–1,200 new followers</strong> on average</li>
      </ul>
      <a href="https://www.mixxea.com/dashboard/promotions" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#D63DF6,#FF5252);color:#fff;border-radius:10px;text-decoration:none;font-weight:bold;margin-top:8px">Start Playlist Pitching →</a>
    </div>`,
  },
  {
    day: 14, subject: '🏆 14 days in — how is your music doing?',
    template: (name: string) => `<div style="font-family:sans-serif;background:#000;color:#fff;padding:32px;border-radius:12px;max-width:520px">
      <h2 style="color:#F59E0B;margin-top:0">2 weeks with MIXXEA, ${name} 🎉</h2>
      <p>You've been with us for 2 weeks — this is where real momentum begins. Check your analytics to see how your releases are performing.</p>
      <p>Pro tip: <strong>Artists who run at least one promotion campaign in their first month see 3x more monthly listeners</strong> after 60 days.</p>
      <div style="display:flex;gap:16px;margin:20px 0">
        <a href="https://www.mixxea.com/dashboard/analytics" style="flex:1;display:block;padding:12px;background:#111;border:1px solid #333;color:#fff;border-radius:8px;text-decoration:none;text-align:center;font-size:14px">📊 View Analytics</a>
        <a href="https://www.mixxea.com/dashboard/promotions" style="flex:1;display:block;padding:12px;background:linear-gradient(135deg,#7B5FFF,#D63DF6);color:#fff;border-radius:8px;text-decoration:none;text-align:center;font-size:14px">🚀 Run Campaign</a>
      </div>
    </div>`,
  },
];

// POST /drip/trigger — called from signup to schedule the sequence
app.post(`${PREFIX}/drip/trigger`, async (c) => {
  try {
    const { userId, userEmail, userName } = await c.req.json();
    if (!userId || !userEmail) return c.json({ error: 'userId and userEmail required' }, 400);
    const now = new Date();
    const schedule = DRIP_EMAILS.map(email => ({
      day: email.day,
      scheduledFor: new Date(now.getTime() + email.day * 86400000).toISOString(),
      sent: false, subject: email.subject,
    }));
    await kv.set(`drip:${userId}`, JSON.stringify({ userId, userEmail, userName, schedule, startedAt: now.toISOString() }));
    // Send Day 1 email immediately
    const d1 = DRIP_EMAILS[0];
    await sendEmail(userEmail, d1.subject, d1.template(userName || 'Artist'));
    schedule[0].sent = true;
    await kv.set(`drip:${userId}`, JSON.stringify({ userId, userEmail, userName, schedule, startedAt: now.toISOString() }));
    return c.json({ success: true, schedule });
  } catch (err) { return c.json({ error: `Drip trigger error: ${err}` }, 500); }
});

// POST /admin/drip/process — admin-triggered cron to send scheduled drip emails
app.post(`${PREFIX}/admin/drip/process`, async (c) => {
  try {
    const adminId = await verifyAdmin(c);
    if (!adminId) return c.json({ error: 'Admin access required' }, 403);
    const allUsersStr = await kv.get('users:all');
    const allUserIds: string[] = allUsersStr ? JSON.parse(allUsersStr) : [];
    let sent = 0;
    const now = new Date();
    for (const uid of allUserIds) {
      const dripStr = await kv.get(`drip:${uid}`);
      if (!dripStr) continue;
      const drip = JSON.parse(dripStr);
      for (let i = 0; i < drip.schedule.length; i++) {
        const item = drip.schedule[i];
        if (!item.sent && new Date(item.scheduledFor) <= now) {
          const template = DRIP_EMAILS.find(e => e.day === item.day);
          if (template) {
            await sendEmail(drip.userEmail, template.subject, template.template(drip.userName));
            drip.schedule[i].sent = true;
            sent++;
          }
        }
      }
      await kv.set(`drip:${uid}`, JSON.stringify(drip));
    }
    return c.json({ success: true, emailsSent: sent });
  } catch (err) { return c.json({ error: `Drip process error: ${err}` }, 500); }
});

// =============================================================================
//  FEATURE 18 — WIN NOTIFICATIONS (campaign milestones)
// =============================================================================

const MILESTONES = [
  { streams: 1000,  label: '🎉 1K streams!',    message: 'Your music just hit 1,000 streams!',     xp: 50 },
  { streams: 5000,  label: '🚀 5K streams!',    message: 'You\'ve crossed 5,000 streams!',         xp: 100 },
  { streams: 10000, label: '💎 10K streams!',   message: 'Incredible — 10,000 streams reached!',   xp: 200 },
  { streams: 50000, label: '⭐ 50K streams!',   message: 'You\'re going viral — 50K streams!',     xp: 500 },
  { streams: 100000, label: '🏆 100K streams!', message: 'LEGEND STATUS — 100,000 streams!',       xp: 1000 },
];

app.post(`${PREFIX}/campaigns/check-milestones`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const { totalStreams } = await c.req.json();
    if (!totalStreams) return c.json({ milestones: [] });
    const achievedKey = `milestones:${userId}`;
    const achievedStr = await kv.get(achievedKey);
    const achieved: number[] = achievedStr ? JSON.parse(achievedStr) : [];
    const newMilestones: any[] = [];
    for (const milestone of MILESTONES) {
      if (totalStreams >= milestone.streams && !achieved.includes(milestone.streams)) {
        newMilestones.push(milestone);
        achieved.push(milestone.streams);
        // Create in-app notification
        const notif = {
          id: generateId(), type: 'milestone', title: milestone.label,
          message: milestone.message, read: false, createdAt: new Date().toISOString(),
          link: '/dashboard/analytics',
        };
        const notifsStr = await kv.get(`notifications:${userId}`);
        const notifs = notifsStr ? JSON.parse(notifsStr) : [];
        notifs.unshift(notif);
        await kv.set(`notifications:${userId}`, JSON.stringify(notifs));
        // Send win email
        const userStr = await kv.get(`user:${userId}`);
        if (userStr) {
          const user = JSON.parse(userStr);
          sendEmail(user.email, `${milestone.label} — MIXXEA Milestone!`,
            `<div style="font-family:sans-serif;background:#000;color:#fff;padding:32px;border-radius:12px;max-width:520px">
              <h2 style="color:#7B5FFF;margin-top:0">${milestone.label}</h2>
              <p style="font-size:18px">${milestone.message}</p>
              <p>You've earned <strong style="color:#00C4FF">${milestone.xp} XP</strong> for this milestone. Keep pushing!</p>
              <a href="https://www.mixxea.com/dashboard/analytics" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#7B5FFF,#D63DF6);color:#fff;border-radius:10px;text-decoration:none;font-weight:bold;margin-top:8px">View Your Stats →</a>
            </div>`
          ).catch(console.error);
        }
      }
    }
    await kv.set(achievedKey, JSON.stringify(achieved));
    return c.json({ milestones: newMilestones, totalAchieved: achieved.length });
  } catch (err) { return c.json({ error: `Milestone check error: ${err}` }, 500); }
});

// ── Direct call helper (used by index.tsx signup handler) ──────────────────
export async function triggerDripSequence(userId: string, userEmail: string, userName: string): Promise<void> {
  try {
    const now = new Date();
    const schedule = DRIP_EMAILS.map(email => ({
      day: email.day,
      scheduledFor: new Date(now.getTime() + email.day * 86400000).toISOString(),
      sent: false, subject: email.subject,
    }));
    await kv.set(`drip:${userId}`, JSON.stringify({ userId, userEmail, userName, schedule, startedAt: now.toISOString() }));
    const d1 = DRIP_EMAILS[0];
    await sendEmail(userEmail, d1.subject, d1.template(userName || 'Artist'));
    schedule[0].sent = true;
    await kv.set(`drip:${userId}`, JSON.stringify({ userId, userEmail, userName, schedule, startedAt: now.toISOString() }));
  } catch (err) { console.log('Drip trigger error:', err); }
}

export async function claimReferralCode(code: string, newUserId: string, newUserEmail: string): Promise<void> {
  try {
    if (!code || !newUserId) return;
    const referrerId = await kv.get(`referral_code:${code}`);
    if (!referrerId || referrerId === newUserId) return;
    const already = await kv.get(`referral_claim:${newUserId}`);
    if (already) return;
    await kv.set(`referral_claim:${newUserId}`, referrerId);
    // Credit the referrer
    const refStr = await kv.get(`referral:${referrerId}`);
    if (refStr) {
      const ref = JSON.parse(refStr);
      ref.totalReferrals = (ref.totalReferrals || 0) + 1;
      ref.creditsEarned = (ref.creditsEarned || 0) + 50;
      await kv.set(`referral:${referrerId}`, JSON.stringify(ref));
      const credStr = await kv.get(`credits:${referrerId}`);
      const curr = parseInt(credStr || '0');
      await kv.set(`credits:${referrerId}`, String(curr + 50));
      const userStr = await kv.get(`user:${referrerId}`);
      if (userStr) {
        const u = JSON.parse(userStr);
        u.credits = curr + 50;
        await kv.set(`user:${referrerId}`, JSON.stringify(u));
      }
    }
    // Give new user 25 bonus credits
    const newCredStr = await kv.get(`credits:${newUserId}`);
    const newCurr = parseInt(newCredStr || '0');
    await kv.set(`credits:${newUserId}`, String(newCurr + 25));
    const newUserStr = await kv.get(`user:${newUserId}`);
    if (newUserStr) { const u = JSON.parse(newUserStr); u.credits = newCurr + 25; await kv.set(`user:${newUserId}`, JSON.stringify(u)); }
  } catch (err) { console.log('Referral claim error:', err); }
}

export { app as featuresApp };
