// =============================================================================
//  MIXXEA — Creative Studio Server Module
//  Routes: /creative/*
//  Handles: Social OAuth, Post CRUD, Scheduling, Media, AI Generation
// =============================================================================
import { Hono } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

export const creativeApp = new Hono();
const PREFIX = '/make-server-f4d1ffe4';

// ── Constants ──────────────────────────────────────────────────────────────────
const SUPABASE_URL        = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_ROLE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const OPENAI_API_KEY      = () => Deno.env.get('OPENAI_API_KEY') || '';
const META_APP_ID         = () => Deno.env.get('META_APP_ID') || '';
const META_APP_SECRET     = () => Deno.env.get('META_APP_SECRET') || '';
const GOOGLE_CLIENT_ID    = () => Deno.env.get('GOOGLE_CLIENT_ID') || '';
const GOOGLE_CLIENT_SECRET= () => Deno.env.get('GOOGLE_CLIENT_SECRET') || '';
const BUCKET_NAME         = 'make-f4d1ffe4-creative';

// ── Plan limits ────────────────────────────────────────────────────────────────
export const CREATIVE_PLAN_LIMITS: Record<string, {
  accounts: number; postsPerMonth: number; platformsPerPost: number;
  aiCaptionsPerMonth: number; aiImagesPerMonth: number; aiScriptsPerMonth: number;
  aiCalendarsPerMonth: number;
  calendarType: string; storageMb: number; videoPosting: boolean;
  bulkScheduling: boolean | 'limited'; analytics: string;
  aiMarketingSuggestions: boolean; allowedPlatforms: string[];
}> = {
  starter: {
    accounts: 3, postsPerMonth: 20, platformsPerPost: 1,
    aiCaptionsPerMonth: 20, aiImagesPerMonth: 5, aiScriptsPerMonth: 3,
    aiCalendarsPerMonth: 1,
    calendarType: 'monthly', storageMb: 500, videoPosting: false,
    bulkScheduling: false, analytics: 'basic', aiMarketingSuggestions: false,
    allowedPlatforms: ['instagram', 'tiktok'],
  },
  growth: {
    accounts: 8, postsPerMonth: 80, platformsPerPost: 3,
    aiCaptionsPerMonth: 100, aiImagesPerMonth: 25, aiScriptsPerMonth: 15,
    aiCalendarsPerMonth: 4,
    calendarType: 'weekly', storageMb: 2048, videoPosting: true,
    bulkScheduling: 'limited', analytics: 'advanced', aiMarketingSuggestions: false,
    allowedPlatforms: ['instagram', 'tiktok', 'facebook', 'youtube'],
  },
  pro: {
    accounts: -1, postsPerMonth: -1, platformsPerPost: -1,
    aiCaptionsPerMonth: -1, aiImagesPerMonth: 80, aiScriptsPerMonth: 50,
    aiCalendarsPerMonth: -1,
    calendarType: 'weekly_ai', storageMb: 10240, videoPosting: true,
    bulkScheduling: true, analytics: 'full', aiMarketingSuggestions: true,
    allowedPlatforms: ['instagram', 'tiktok', 'facebook', 'youtube'],
  },
};

// ── Credit costs ───────────────────────────────────────────────────────────────
const CREATIVE_CREDITS: Record<string, number> = {
  ai_caption: 2, ai_hashtags: 1, ai_image: 15,
  ai_video_script: 10, ai_content_calendar: 20,
  extra_post: 2, extra_account: 10,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function genId(): string {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

function getSupabase() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
}

async function ensureBucket() {
  try {
    const sb = getSupabase();
    const { data: buckets } = await sb.storage.listBuckets();
    const exists = buckets?.some((b: any) => b.name === BUCKET_NAME);
    if (!exists) await sb.storage.createBucket(BUCKET_NAME, { public: false });
  } catch (e) { console.log('[Creative] bucket init error:', e); }
}
ensureBucket();

// ── HMAC auth ─────────────────────────────────────────────────────────────────
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
async function verifyToken(c: any): Promise<string | null> {
  const t = c.req.header('X-MIXXEA-Token');
  if (!t) return null;
  try {
    if (!t.startsWith('v2.')) return null;
    const inner = t.slice(3);
    const lastDot = inner.lastIndexOf('.');
    if (lastDot < 0) return null;
    const sigHex = inner.slice(lastDot + 1);
    const payload = inner.slice(0, lastDot);
    const dotIdx = payload.indexOf('.');
    if (dotIdx < 0) return null;
    const expiresAt = parseInt(payload.slice(dotIdx + 1));
    if (isNaN(expiresAt) || Date.now() > expiresAt) return null;
    const sigBytes = new Uint8Array(sigHex.match(/.{2}/g)!.map((b: string) => parseInt(b, 16)));
    const key = await getHmacKey();
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(payload));
    if (!valid) return null;
    return payload.slice(0, dotIdx);
  } catch { return null; }
}

// ── Credits deduction ─────────────────────────────────────────────────────────
async function deductCredits(userId: string, action: string): Promise<boolean> {
  const cost = CREATIVE_CREDITS[action] ?? 0;
  if (cost === 0) return true;
  const credStr = await kv.get(`credits:${userId}`);
  const balance = parseInt(credStr || '0');
  if (balance < cost) return false;
  await kv.set(`credits:${userId}`, String(balance - cost));
  const userStr = await kv.get(`user:${userId}`);
  if (userStr) {
    const user = JSON.parse(userStr);
    user.credits = balance - cost;
    await kv.set(`user:${userId}`, JSON.stringify(user));
  }
  return true;
}

// ── Usage helpers ─────────────────────────────────────────────────────────────
function getMonthKey() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}

async function getUsage(userId: string) {
  const key = `creative:usage:${userId}:${getMonthKey()}`;
  const s = await kv.get(key);
  return s ? JSON.parse(s) : {
    postsPublished: 0, postsScheduled: 0,
    aiCaptionsUsed: 0, aiImagesUsed: 0, aiScriptsUsed: 0, aiCalendarsUsed: 0,
  };
}

async function incUsage(userId: string, field: string, amount = 1) {
  const key = `creative:usage:${userId}:${getMonthKey()}`;
  const usage = await getUsage(userId);
  usage[field] = (usage[field] || 0) + amount;
  await kv.set(key, JSON.stringify(usage));
}

// ── OpenAI helper ──────────────────────────────────────────────────────────────
async function openaiChat(messages: any[], model = 'gpt-4o-mini', maxTokens = 600): Promise<string> {
  const key = OPENAI_API_KEY();
  if (!key) throw new Error('OPENAI_API_KEY is not configured — add it in your Supabase Edge Function secrets.');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.85 }),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data.error?.message || '';
    const code = data.error?.code || data.error?.type || '';
    if (res.status === 429 || code === 'insufficient_quota' || msg.toLowerCase().includes('billing') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('limit')) {
      throw Object.assign(
        new Error(`Your OpenAI account has hit its billing limit. Fix it at: https://platform.openai.com/settings/organization/billing/overview — then retry.`),
        { code: 'OPENAI_BILLING_LIMIT' }
      );
    }
    if (res.status === 401 || code === 'invalid_api_key') {
      throw Object.assign(new Error('OpenAI API key is invalid. Update OPENAI_API_KEY in your Supabase secrets.'), { code: 'OPENAI_INVALID_KEY' });
    }
    throw new Error(msg || `OpenAI error (${res.status})`);
  }
  return data.choices?.[0]?.message?.content?.trim() || '';
}

async function openaiImage(prompt: string, size = '1024x1024'): Promise<string> {
  const key = OPENAI_API_KEY();
  if (!key) throw new Error('OPENAI_API_KEY is not configured — add it in your Supabase Edge Function secrets.');
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size, quality: 'standard', response_format: 'url' }),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data.error?.message || '';
    const code = data.error?.code || data.error?.type || '';
    if (res.status === 429 || code === 'insufficient_quota' || msg.toLowerCase().includes('billing') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('limit')) {
      throw Object.assign(
        new Error(`Your OpenAI account has hit its billing hard limit. This blocks DALL·E 3 image generation. Fix it at: https://platform.openai.com/settings/organization/billing/overview`),
        { code: 'OPENAI_BILLING_LIMIT' }
      );
    }
    if (res.status === 401 || code === 'invalid_api_key') {
      throw Object.assign(new Error('OpenAI API key is invalid. Update OPENAI_API_KEY in your Supabase secrets.'), { code: 'OPENAI_INVALID_KEY' });
    }
    throw new Error(msg || `OpenAI image error (${res.status})`);
  }
  return data.data?.[0]?.url || '';
}

// ── OAuth config ───────────────────────────────────────────────────────────────
function getOAuthCfg(platform: string) {
  const callbackBase = `${SUPABASE_URL}/functions/v1/make-server-f4d1ffe4${PREFIX}/creative/oauth/${platform}/callback`;
  switch (platform) {
    case 'instagram':
      return {
        clientId: META_APP_ID(), clientSecret: META_APP_SECRET(),
        authUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
        tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
        scope: 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement',
        callbackUrl: callbackBase,
      };
    case 'facebook':
      return {
        clientId: META_APP_ID(), clientSecret: META_APP_SECRET(),
        authUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
        tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
        scope: 'pages_show_list,pages_manage_posts,pages_read_engagement',
        callbackUrl: callbackBase,
      };
    case 'youtube':
      return {
        clientId: GOOGLE_CLIENT_ID(), clientSecret: GOOGLE_CLIENT_SECRET(),
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
        callbackUrl: callbackBase,
      };
    case 'tiktok':
      return {
        clientId: Deno.env.get('TIKTOK_CLIENT_KEY') || '',
        clientSecret: Deno.env.get('TIKTOK_CLIENT_SECRET') || '',
        authUrl: 'https://www.tiktok.com/v2/auth/authorize',
        tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
        scope: 'user.info.basic,video.upload,video.publish',
        callbackUrl: callbackBase,
      };
    default: return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  PLAN LIMITS
// ─────────────────────────────────────────────────────────────────────────────
creativeApp.get(`${PREFIX}/creative/plan-limits`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const userStr = await kv.get(`user:${userId}`);
    const user = userStr ? JSON.parse(userStr) : {};
    const plan = user.plan || 'starter';
    const limits = CREATIVE_PLAN_LIMITS[plan] || CREATIVE_PLAN_LIMITS.starter;
    const credStr = await kv.get(`credits:${userId}`);
    const usage = await getUsage(userId);
    return c.json({ plan, limits, usage, credits: parseInt(credStr || '0'), creditCosts: CREATIVE_CREDITS });
  } catch (err) {
    return c.json({ error: `Plan limits error: ${err}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  OAUTH — initiate
// ────────────────────────────────────────────────────────────────────────────
creativeApp.post(`${PREFIX}/creative/oauth/:platform/connect`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const platform = c.req.param('platform');
    const cfg = getOAuthCfg(platform);
    if (!cfg) return c.json({ error: 'Unsupported platform' }, 400);
    if (!cfg.clientId) return c.json({ error: `${platform} OAuth not configured — set ${platform.toUpperCase()}_CLIENT_ID and SECRET in environment.` }, 503);

    const state = `${userId}:${platform}:${genId()}`;
    await kv.set(`creative:oauth_state:${state}`, JSON.stringify({ userId, platform, createdAt: new Date().toISOString() }), 600);

    const params = new URLSearchParams({
      client_id: cfg.clientId,
      redirect_uri: cfg.callbackUrl,
      scope: cfg.scope,
      response_type: 'code',
      state,
      ...(platform === 'youtube' ? { access_type: 'offline', prompt: 'consent' } : {}),
    });
    const authUrl = `${cfg.authUrl}?${params.toString()}`;
    return c.json({ authUrl, state });
  } catch (err) {
    return c.json({ error: `OAuth connect error: ${err}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  OAUTH — callback (returns HTML that closes the popup)
// ─────────────────────────────────────────────────────────────────────────────
creativeApp.get(`${PREFIX}/creative/oauth/:platform/callback`, async (c) => {
  const platform = c.req.param('platform');
  const code  = c.req.query('code');
  const state = c.req.query('state');
  const error = c.req.query('error');

  const closeHtml = (success: boolean, msg: string, accountData?: any) => {
    const payload = success
      ? JSON.stringify({ type: 'SOCIAL_AUTH_SUCCESS', platform, account: accountData })
      : JSON.stringify({ type: 'SOCIAL_AUTH_ERROR', platform, error: msg });
    return c.html(`<!DOCTYPE html><html><head><title>Connecting ${platform}...</title>
<style>body{font-family:sans-serif;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}
.card{background:#111;border:1px solid #333;border-radius:16px;padding:32px;text-align:center;max-width:360px;}
.icon{font-size:48px;margin-bottom:16px;}.title{font-size:20px;font-weight:700;margin-bottom:8px;}
.sub{color:#888;font-size:14px;}</style></head>
<body><div class="card">
<div class="icon">${success ? '✅' : '❌'}</div>
<div class="title">${success ? `${platform.charAt(0).toUpperCase() + platform.slice(1)} Connected!` : 'Connection Failed'}</div>
<div class="sub">${success ? 'You can close this window.' : msg}</div>
</div>
<script>
try {
  if (window.opener) {
    window.opener.postMessage(${payload}, '*');
    setTimeout(() => window.close(), 1500);
  }
} catch(e) {}
</script></body></html>`);
  };

  try {
    if (error) return closeHtml(false, `OAuth error: ${error}`);
    if (!code || !state) return closeHtml(false, 'Missing code or state parameter');

    const stateData = await kv.get(`creative:oauth_state:${state}`);
    if (!stateData) return closeHtml(false, 'Invalid or expired state');
    const { userId } = JSON.parse(stateData);
    await kv.del(`creative:oauth_state:${state}`);

    const cfg = getOAuthCfg(platform);
    if (!cfg) return closeHtml(false, 'Unsupported platform');

    // Exchange code for token
    const tokenRes = await fetch(cfg.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: cfg.clientId, client_secret: cfg.clientSecret,
        code, grant_type: 'authorization_code', redirect_uri: cfg.callbackUrl,
      }).toString(),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return closeHtml(false, `Token exchange failed: ${JSON.stringify(tokenData)}`);

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token || '';
    const expiresIn = tokenData.expires_in || 5184000; // 60 days default

    let accountInfo: any = { username: 'unknown', displayName: 'Unknown', avatarUrl: '', followerCount: 0, platformUserId: '' };

    // Fetch profile info per platform
    if (platform === 'instagram') {
      try {
        // Get Facebook pages to find linked IG account
        const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`);
        const pagesData = await pagesRes.json();
        const page = pagesData.data?.[0];
        if (page) {
          const igRes = await fetch(`https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token || accessToken}`);
          const igData = await igRes.json();
          const igId = igData.instagram_business_account?.id;
          if (igId) {
            const profRes = await fetch(`https://graph.facebook.com/v19.0/${igId}?fields=username,name,profile_picture_url,followers_count&access_token=${page.access_token || accessToken}`);
            const prof = await profRes.json();
            accountInfo = {
              username: prof.username || 'instagram_user',
              displayName: prof.name || prof.username || 'Instagram User',
              avatarUrl: prof.profile_picture_url || '',
              followerCount: prof.followers_count || 0,
              platformUserId: igId,
              pageId: page.id,
              pageAccessToken: page.access_token || accessToken,
            };
          }
        }
      } catch (e) { console.log('[Creative/OAuth] IG profile error:', e); }
    } else if (platform === 'facebook') {
      try {
        const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`);
        const pagesData = await pagesRes.json();
        const page = pagesData.data?.[0];
        if (page) {
          accountInfo = {
            username: page.name || 'facebook_page',
            displayName: page.name || 'Facebook Page',
            avatarUrl: `https://graph.facebook.com/v19.0/${page.id}/picture?type=square`,
            followerCount: 0,
            platformUserId: page.id,
            pageAccessToken: page.access_token,
          };
        }
      } catch (e) { console.log('[Creative/OAuth] FB profile error:', e); }
    } else if (platform === 'youtube') {
      try {
        const chRes = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const chData = await chRes.json();
        const ch = chData.items?.[0];
        if (ch) {
          accountInfo = {
            username: ch.snippet?.customUrl || ch.snippet?.title || 'youtube_channel',
            displayName: ch.snippet?.title || 'YouTube Channel',
            avatarUrl: ch.snippet?.thumbnails?.default?.url || '',
            followerCount: parseInt(ch.statistics?.subscriberCount || '0'),
            platformUserId: ch.id,
          };
        }
      } catch (e) { console.log('[Creative/OAuth] YT profile error:', e); }
    } else if (platform === 'tiktok') {
      try {
        const userRes = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,follower_count', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const userData = await userRes.json();
        const u = userData.data?.user;
        if (u) {
          accountInfo = {
            username: u.display_name || 'tiktok_user',
            displayName: u.display_name || 'TikTok User',
            avatarUrl: u.avatar_url || '',
            followerCount: u.follower_count || 0,
            platformUserId: u.open_id,
          };
        }
      } catch (e) { console.log('[Creative/OAuth] TikTok profile error:', e); }
    }

    const account = {
      id: `${userId}:${platform}`,
      userId, platform,
      ...accountInfo,
      accessToken,
      refreshToken,
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      scope: cfg.scope.split(','),
      connectedAt: new Date().toISOString(),
      isActive: true,
    };

    await kv.set(`creative:account:${userId}:${platform}`, JSON.stringify(account));

    // Update accounts index
    const idxStr = await kv.get(`creative:accounts:index:${userId}`);
    const idx: string[] = idxStr ? JSON.parse(idxStr) : [];
    if (!idx.includes(platform)) idx.push(platform);
    await kv.set(`creative:accounts:index:${userId}`, JSON.stringify(idx));

    return closeHtml(true, 'Connected!', { platform, username: accountInfo.username, displayName: accountInfo.displayName, avatarUrl: accountInfo.avatarUrl, followerCount: accountInfo.followerCount });
  } catch (err) {
    console.log('[Creative/OAuth] callback error:', err);
    return closeHtml(false, String(err));
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  ACCOUNTS — list / disconnect
// ─────────────────────────────────────────────────────────────────────────────
creativeApp.get(`${PREFIX}/creative/accounts`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const idxStr = await kv.get(`creative:accounts:index:${userId}`);
    const idx: string[] = idxStr ? JSON.parse(idxStr) : [];
    const accounts = (await Promise.all(
      idx.map(async (platform) => {
        const s = await kv.get(`creative:account:${userId}:${platform}`);
        if (!s) return null;
        const a = JSON.parse(s);
        // Strip sensitive tokens from response
        const { accessToken: _at, refreshToken: _rt, pageAccessToken: _pat, ...safe } = a;
        return safe;
      })
    )).filter(Boolean);
    return c.json({ accounts });
  } catch (err) {
    return c.json({ error: `Accounts fetch error: ${err}` }, 500);
  }
});

creativeApp.delete(`${PREFIX}/creative/accounts/:platform`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const platform = c.req.param('platform');
    await kv.del(`creative:account:${userId}:${platform}`);
    const idxStr = await kv.get(`creative:accounts:index:${userId}`);
    const idx: string[] = idxStr ? JSON.parse(idxStr) : [];
    await kv.set(`creative:accounts:index:${userId}`, JSON.stringify(idx.filter(p => p !== platform)));
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: `Disconnect error: ${err}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  POSTS — CRUD
// ─────────────────────────────────────────────────────────────────────────────
creativeApp.get(`${PREFIX}/creative/posts`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const statusFilter = c.req.query('status');
    const idxStr = await kv.get(`creative:posts:index:${userId}`);
    const idx: string[] = idxStr ? JSON.parse(idxStr) : [];
    const posts = (await Promise.all(
      idx.map(async (id) => {
        const s = await kv.get(`creative:post:${id}`);
        return s ? JSON.parse(s) : null;
      })
    )).filter(Boolean)
     .filter((p: any) => !statusFilter || p.status === statusFilter)
     .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ posts });
  } catch (err) {
    return c.json({ error: `Posts fetch error: ${err}` }, 500);
  }
});

creativeApp.post(`${PREFIX}/creative/posts`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const body = await c.req.json();
    const now = new Date().toISOString();
    const post = {
      id: genId(), userId, status: 'draft',
      title: body.title || 'Untitled Post',
      platforms: body.platforms || [],
      caption: body.caption || '',
      hashtags: body.hashtags || [],
      mediaUrls: body.mediaUrls || [],
      mediaType: body.mediaType || 'image',
      altText: body.altText || '',
      firstComment: body.firstComment || '',
      scheduledFor: body.scheduledFor || null,
      publishedAt: null,
      platformResults: {},
      releaseId: body.releaseId || null,
      releaseName: body.releaseName || null,
      aiGenerated: body.aiGenerated || false,
      aiPrompt: body.aiPrompt || null,
      createdAt: now, updatedAt: now,
    };
    await kv.set(`creative:post:${post.id}`, JSON.stringify(post));
    const idxStr = await kv.get(`creative:posts:index:${userId}`);
    const idx: string[] = idxStr ? JSON.parse(idxStr) : [];
    idx.unshift(post.id);
    await kv.set(`creative:posts:index:${userId}`, JSON.stringify(idx.slice(0, 500)));
    return c.json({ post }, 201);
  } catch (err) {
    return c.json({ error: `Create post error: ${err}` }, 500);
  }
});

creativeApp.get(`${PREFIX}/creative/posts/:id`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const id = c.req.param('id');
    const s = await kv.get(`creative:post:${id}`);
    if (!s) return c.json({ error: 'Post not found' }, 404);
    const post = JSON.parse(s);
    if (post.userId !== userId) return c.json({ error: 'Forbidden' }, 403);
    return c.json({ post });
  } catch (err) {
    return c.json({ error: `Get post error: ${err}` }, 500);
  }
});

creativeApp.put(`${PREFIX}/creative/posts/:id`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const id = c.req.param('id');
    const s = await kv.get(`creative:post:${id}`);
    if (!s) return c.json({ error: 'Post not found' }, 404);
    const post = JSON.parse(s);
    if (post.userId !== userId) return c.json({ error: 'Forbidden' }, 403);
    const body = await c.req.json();
    const allowed = ['title','platforms','caption','hashtags','mediaUrls','mediaType','altText','firstComment','releaseId','releaseName','aiGenerated','aiPrompt'];
    const updated = { ...post, updatedAt: new Date().toISOString() };
    for (const k of allowed) { if (k in body) updated[k] = body[k]; }
    await kv.set(`creative:post:${id}`, JSON.stringify(updated));
    return c.json({ post: updated });
  } catch (err) {
    return c.json({ error: `Update post error: ${err}` }, 500);
  }
});

creativeApp.delete(`${PREFIX}/creative/posts/:id`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const id = c.req.param('id');
    const s = await kv.get(`creative:post:${id}`);
    if (!s) return c.json({ error: 'Post not found' }, 404);
    const post = JSON.parse(s);
    if (post.userId !== userId) return c.json({ error: 'Forbidden' }, 403);
    await kv.del(`creative:post:${id}`);
    const idxStr = await kv.get(`creative:posts:index:${userId}`);
    const idx: string[] = idxStr ? JSON.parse(idxStr) : [];
    await kv.set(`creative:posts:index:${userId}`, JSON.stringify(idx.filter(i => i !== id)));
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: `Delete post error: ${err}` }, 500);
  }
});

// ── Schedule a post ────────────────────────────────────────────────────────────
creativeApp.post(`${PREFIX}/creative/posts/:id/schedule`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const id = c.req.param('id');
    const s = await kv.get(`creative:post:${id}`);
    if (!s) return c.json({ error: 'Post not found' }, 404);
    const post = JSON.parse(s);
    if (post.userId !== userId) return c.json({ error: 'Forbidden' }, 403);
    const { scheduledFor } = await c.req.json();
    if (!scheduledFor) return c.json({ error: 'scheduledFor required (ISO timestamp)' }, 400);
    const updated = { ...post, status: 'scheduled', scheduledFor, updatedAt: new Date().toISOString() };
    await kv.set(`creative:post:${id}`, JSON.stringify(updated));
    // Scheduled index
    const schedStr = await kv.get(`creative:posts:scheduled:${userId}`);
    const sched: string[] = schedStr ? JSON.parse(schedStr) : [];
    if (!sched.includes(id)) sched.push(id);
    await kv.set(`creative:posts:scheduled:${userId}`, JSON.stringify(sched));
    await incUsage(userId, 'postsScheduled');
    return c.json({ post: updated });
  } catch (err) {
    return c.json({ error: `Schedule post error: ${err}` }, 500);
  }
});

// ── Publish a post immediately ─────────────────────────────────────────────────
creativeApp.post(`${PREFIX}/creative/posts/:id/publish`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const id = c.req.param('id');
    const s = await kv.get(`creative:post:${id}`);
    if (!s) return c.json({ error: 'Post not found' }, 404);
    let post = JSON.parse(s);
    if (post.userId !== userId) return c.json({ error: 'Forbidden' }, 403);

    post = { ...post, status: 'publishing', updatedAt: new Date().toISOString() };
    await kv.set(`creative:post:${id}`, JSON.stringify(post));

    const results: Record<string, any> = {};
    let anySuccess = false;

    for (const platform of post.platforms) {
      try {
        const accStr = await kv.get(`creative:account:${userId}:${platform}`);
        if (!accStr) { results[platform] = { status: 'failed', error: 'Account not connected' }; continue; }
        const acc = JSON.parse(accStr);

        let platformPostId = '';
        let postUrl = '';

        if (platform === 'instagram') {
          const igUserId = acc.platformUserId;
          const pageToken = acc.pageAccessToken || acc.accessToken;
          if (!igUserId || !pageToken) { results[platform] = { status: 'failed', error: 'Invalid IG account data' }; continue; }
          if (post.mediaType === 'image' && post.mediaUrls.length > 0) {
            const mediaRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image_url: post.mediaUrls[0], caption: `${post.caption}\n\n${post.hashtags.join(' ')}`.trim(), access_token: pageToken }),
            });
            const mediaData = await mediaRes.json();
            if (!mediaData.id) throw new Error(mediaData.error?.message || 'IG media creation failed');
            const publishRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media_publish`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ creation_id: mediaData.id, access_token: pageToken }),
            });
            const publishData = await publishRes.json();
            platformPostId = publishData.id || '';
            postUrl = `https://www.instagram.com/p/${platformPostId}`;
          } else { results[platform] = { status: 'failed', error: 'Image URL required for Instagram posts' }; continue; }
        } else if (platform === 'facebook') {
          const pageToken = acc.pageAccessToken || acc.accessToken;
          const pageId = acc.platformUserId;
          const fbRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `${post.caption}\n\n${post.hashtags.join(' ')}`.trim(), access_token: pageToken }),
          });
          const fbData = await fbRes.json();
          platformPostId = fbData.id || '';
          postUrl = `https://www.facebook.com/${platformPostId}`;
        } else if (platform === 'youtube') {
          results[platform] = { status: 'failed', error: 'YouTube video publishing requires direct upload — use the YouTube Studio tab for video uploads.' };
          continue;
        } else if (platform === 'tiktok') {
          results[platform] = { status: 'failed', error: 'TikTok video publishing in progress — ensure Content Posting API access is approved for your app.' };
          continue;
        }

        results[platform] = { status: 'success', postId: platformPostId, url: postUrl, publishedAt: new Date().toISOString() };
        anySuccess = true;
      } catch (platErr) {
        results[platform] = { status: 'failed', error: String(platErr) };
      }
    }

    const allFailed = Object.values(results).every((r: any) => r.status === 'failed');
    const finalStatus = allFailed ? 'failed' : anySuccess && !allFailed ? 'partial' : 'published';
    const finalStatus2 = Object.keys(results).length > 0 && Object.values(results).every((r: any) => r.status === 'success') ? 'published' : finalStatus;

    const finalPost = {
      ...post, status: finalStatus2, platformResults: results,
      publishedAt: anySuccess ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`creative:post:${id}`, JSON.stringify(finalPost));
    if (anySuccess) await incUsage(userId, 'postsPublished');
    return c.json({ post: finalPost, results });
  } catch (err) {
    return c.json({ error: `Publish error: ${err}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  MEDIA — signed upload URL + list
// ─────────────────────────────────────────────────────────────────────────────
creativeApp.post(`${PREFIX}/creative/media/upload-url`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const { filename, contentType } = await c.req.json();
    if (!filename || !contentType) return c.json({ error: 'filename and contentType required' }, 400);
    const fileId = genId();
    const ext = filename.split('.').pop() || 'bin';
    const path = `${userId}/${fileId}.${ext}`;
    const sb = getSupabase();
    const { data, error } = await sb.storage.from(BUCKET_NAME).createSignedUploadUrl(path);
    if (error || !data) return c.json({ error: `Storage error: ${error?.message}` }, 500);
    // Store media metadata
    const media = { id: fileId, userId, filename, contentType, path, storageBucket: BUCKET_NAME, uploadedAt: new Date().toISOString() };
    await kv.set(`creative:media:${fileId}`, JSON.stringify(media));
    const midxStr = await kv.get(`creative:media:index:${userId}`);
    const midx: string[] = midxStr ? JSON.parse(midxStr) : [];
    midx.unshift(fileId);
    await kv.set(`creative:media:index:${userId}`, JSON.stringify(midx.slice(0, 200)));
    return c.json({ fileId, path, uploadUrl: data.signedUrl, token: data.token });
  } catch (err) {
    return c.json({ error: `Upload URL error: ${err}` }, 500);
  }
});

creativeApp.get(`${PREFIX}/creative/media`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const midxStr = await kv.get(`creative:media:index:${userId}`);
    const midx: string[] = midxStr ? JSON.parse(midxStr) : [];
    const sb = getSupabase();
    const media = (await Promise.all(
      midx.slice(0, 50).map(async (id) => {
        const s = await kv.get(`creative:media:${id}`);
        if (!s) return null;
        const m = JSON.parse(s);
        const { data } = await sb.storage.from(BUCKET_NAME).createSignedUrl(m.path, 3600);
        return { ...m, signedUrl: data?.signedUrl || null };
      })
    )).filter(Boolean);
    return c.json({ media });
  } catch (err) {
    return c.json({ error: `Media fetch error: ${err}` }, 500);
  }
});

creativeApp.delete(`${PREFIX}/creative/media/:id`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const id = c.req.param('id');
    const s = await kv.get(`creative:media:${id}`);
    if (!s) return c.json({ error: 'File not found' }, 404);
    const media = JSON.parse(s);
    if (media.userId !== userId) return c.json({ error: 'Forbidden' }, 403);
    const sb = getSupabase();
    await sb.storage.from(BUCKET_NAME).remove([media.path]);
    await kv.del(`creative:media:${id}`);
    const midxStr = await kv.get(`creative:media:index:${userId}`);
    const midx: string[] = midxStr ? JSON.parse(midxStr) : [];
    await kv.set(`creative:media:index:${userId}`, JSON.stringify(midx.filter(i => i !== id)));
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: `Delete media error: ${err}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  AI — Caption Generator
// ─────────────────────────────────────────────────────────────────────────────
creativeApp.post(`${PREFIX}/creative/ai/caption`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const userStr = await kv.get(`user:${userId}`);
    const user = userStr ? JSON.parse(userStr) : {};
    const plan = user.plan || 'starter';
    const limits = CREATIVE_PLAN_LIMITS[plan] || CREATIVE_PLAN_LIMITS.starter;
    const usage = await getUsage(userId);

    const withinLimit = limits.aiCaptionsPerMonth === -1 || usage.aiCaptionsUsed < limits.aiCaptionsPerMonth;
    if (!withinLimit) {
      const ok = await deductCredits(userId, 'ai_caption');
      if (!ok) return c.json({ error: 'Insufficient credits. Purchase more credits to continue generating captions.', code: 'INSUFFICIENT_CREDITS' }, 402);
    }

    const { platform, releaseTitle, artistName, genre, mood, tone, additionalContext } = await c.req.json();
    const sysPrompt = `You are an expert social media copywriter for musicians and artists. Write engaging, authentic captions that drive real engagement. Always write in first person as the artist. Keep captions platform-appropriate.`;
    const userPrompt = `Write a ${platform || 'Instagram'} caption for a music post.
Artist: ${artistName || 'the artist'}
Release: ${releaseTitle || 'new release'}
Genre: ${genre || 'music'}
Mood: ${mood || 'energetic'}
Tone: ${tone || 'authentic and personal'}
${additionalContext ? `Additional context: ${additionalContext}` : ''}

Requirements for ${platform}:
- Instagram: 150-200 chars before hashtags, conversational, emoji-friendly
- TikTok: punchy, under 100 chars, trend-aware
- Facebook: can be longer, more personal and story-driven
- YouTube: SEO-optimized, include keywords naturally

Write ONLY the caption text. No hashtags (those are separate). No quotes around it.`;

    const caption = await openaiChat([
      { role: 'system', content: sysPrompt },
      { role: 'user', content: userPrompt },
    ]);
    await incUsage(userId, 'aiCaptionsUsed');
    return c.json({ caption, creditsUsed: withinLimit ? 0 : CREATIVE_CREDITS.ai_caption });
  } catch (err) {
    return c.json({ error: `AI caption error: ${err}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  AI — Hashtag Generator
// ─────────────────────────────────────────────────────────────────────────────
creativeApp.post(`${PREFIX}/creative/ai/hashtags`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    // Hashtags are a free feature — included in all plans, no credit deduction
    const { platform, genre, mood, releaseTitle, artistName } = await c.req.json();
    const prompt = `Generate 25 highly relevant hashtags for a ${genre || 'music'} artist posting about \"${releaseTitle || 'new music'}\" on ${platform || 'Instagram'}.
Artist: ${artistName || 'independent artist'}
Mood: ${mood || 'energetic'}
Mix: 8 broad (1M+ uses), 10 mid-range (100K-1M uses), 7 niche (under 100K).
Format: Return ONLY a JSON array of strings, no # prefix, no other text.
Example: [\"newmusic\",\"hiphop\",\"independentartist\",...]`;

    const raw = await openaiChat([{ role: 'user', content: prompt }]);
    let hashtags: string[] = [];
    try {
      const match = raw.match(/\[[\s\S]*\]/);
      hashtags = match ? JSON.parse(match[0]) : raw.split(',').map((s: string) => s.trim().replace(/[^a-zA-Z0-9_]/g, ''));
    } catch { hashtags = raw.split(/[\n,]/).map((s: string) => s.trim().replace(/[#"'\[\]]/g, '')).filter(Boolean).slice(0, 25); }
    return c.json({ hashtags: hashtags.slice(0, 25), creditsUsed: 0 });
  } catch (err) {
    return c.json({ error: `AI hashtags error: ${err}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  AI — Image Generator
// ─────────────────────────────────────────────────────────────────────────────
creativeApp.post(`${PREFIX}/creative/ai/image`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const userStr = await kv.get(`user:${userId}`);
    const user = userStr ? JSON.parse(userStr) : {};
    const plan = user.plan || 'starter';
    const limits = CREATIVE_PLAN_LIMITS[plan] || CREATIVE_PLAN_LIMITS.starter;
    const usage = await getUsage(userId);

    const withinLimit = limits.aiImagesPerMonth === -1 || usage.aiImagesUsed < limits.aiImagesPerMonth;
    if (!withinLimit) {
      const ok = await deductCredits(userId, 'ai_image');
      if (!ok) return c.json({ error: 'Insufficient credits', code: 'INSUFFICIENT_CREDITS' }, 402);
    }

    const { prompt, style, size } = await c.req.json();
    if (!prompt) return c.json({ error: 'Prompt required' }, 400);

    const styleGuide: Record<string, string> = {
      promo: 'professional music promotional artwork, dark dramatic lighting, modern aesthetic, ultra-high quality',
      lyric: 'aesthetic lyric card design, elegant typography-focused, moody atmosphere, album art style',
      behind: 'authentic behind-the-scenes photography style, candid, warm tones, natural lighting',
      announcement: 'bold announcement graphic, high contrast, eye-catching design, music industry professional',
      minimal: 'minimalist clean design, dark background, subtle gradients, sophisticated and modern',
    };
    const enhancedPrompt = `${prompt}. Style: ${styleGuide[style] || styleGuide.promo}. Square format, no text overlays, no watermarks.`;
    const imageUrl = await openaiImage(enhancedPrompt, size === 'landscape' ? '1792x1024' : '1024x1024');
    await incUsage(userId, 'aiImagesUsed');
    return c.json({ imageUrl, creditsUsed: withinLimit ? 0 : CREATIVE_CREDITS.ai_image });
  } catch (err) {
    return c.json({ error: `AI image error: ${err}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  AI — Video Script
// ─────────────────────────────────────────────────────────────────────────────
creativeApp.post(`${PREFIX}/creative/ai/video-script`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const userStr = await kv.get(`user:${userId}`);
    const user = userStr ? JSON.parse(userStr) : {};
    const plan = user.plan || 'starter';
    const limits = CREATIVE_PLAN_LIMITS[plan] || CREATIVE_PLAN_LIMITS.starter;
    const usage = await getUsage(userId);

    const withinLimit = limits.aiScriptsPerMonth === -1 || usage.aiScriptsUsed < limits.aiScriptsPerMonth;
    if (!withinLimit) {
      const ok = await deductCredits(userId, 'ai_video_script');
      if (!ok) return c.json({ error: 'Insufficient credits', code: 'INSUFFICIENT_CREDITS' }, 402);
    }

    const { duration, platform, releaseTitle, artistName, genre, hook, goal } = await c.req.json();
    const prompt = `Write a ${duration || 30}-second ${platform || 'TikTok'}/Reels video script for a musician.
Artist: ${artistName || 'the artist'}
Release: ${releaseTitle || 'new song'}
Genre: ${genre || 'music'}
Opening hook: ${hook || 'something engaging'}
Goal: ${goal || 'drive streams and engagement'}

Format as:
HOOK (0-3s): [opening action/text]
SCENE 1 (3-10s): [what to show]
SCENE 2 (10-20s): [what to show]
SCENE 3 (20-${duration || 30}s): [what to show]
TEXT OVERLAYS: [suggested on-screen text]
CALL TO ACTION: [what to tell viewers to do]
AUDIO NOTE: [music timing suggestion]

Make it authentic, trend-aware, and optimized for maximum retention.`;

    const script = await openaiChat([{ role: 'user', content: prompt }], 'gpt-4o-mini', 800);
    await incUsage(userId, 'aiScriptsUsed');
    return c.json({ script, creditsUsed: withinLimit ? 0 : CREATIVE_CREDITS.ai_video_script });
  } catch (err) {
    return c.json({ error: `AI video script error: ${err}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  AI — Content Calendar
// ─────────────────────────────────────────────────────────────────────────────
creativeApp.post(`${PREFIX}/creative/ai/content-calendar`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const userStr = await kv.get(`user:${userId}`);
    const user = userStr ? JSON.parse(userStr) : {};
    const plan = user.plan || 'starter';
    const limits = CREATIVE_PLAN_LIMITS[plan] || CREATIVE_PLAN_LIMITS.starter;
    const usage = await getUsage(userId);

    const withinLimit = limits.aiCalendarsPerMonth === -1 || usage.aiCalendarsUsed < limits.aiCalendarsPerMonth;
    if (!withinLimit) {
      const ok = await deductCredits(userId, 'ai_content_calendar');
      if (!ok) return c.json({ error: 'Insufficient credits. Purchase more credits to generate additional content calendars.', code: 'INSUFFICIENT_CREDITS' }, 402);
    }

    const { releaseDate, artistName, releaseTitle, genre, platforms, goals } = await c.req.json();
    const prompt = `Create a 7-day social media content calendar for a music release campaign.
Artist: ${artistName || 'the artist'}
Release: ${releaseTitle || 'new release'}
Genre: ${genre || 'music'}
Release date: ${releaseDate || 'upcoming'}
Platforms: ${(platforms || ['Instagram', 'TikTok']).join(', ')}
Goals: ${goals || 'maximize streams and engagement'}

For each of 7 days, provide:
- Day number and theme
- Platform (pick the best one for each day)
- Post type (image/video/story/reel)
- Caption hook (first 10 words)
- Best posting time
- Content idea

Format as JSON array: [{day, theme, platform, type, hook, bestTime, idea}]
Return ONLY the JSON array, no other text.`;

    const raw = await openaiChat([{ role: 'user', content: prompt }], 'gpt-4o-mini', 1200);
    let calendar: any[] = [];
    try {
      const match = raw.match(/\[[\s\S]*\]/);
      calendar = match ? JSON.parse(match[0]) : [];
    } catch { calendar = []; }
    await incUsage(userId, 'aiCalendarsUsed');
    return c.json({ calendar, creditsUsed: withinLimit ? 0 : CREATIVE_CREDITS.ai_content_calendar });
  } catch (err) {
    return c.json({ error: `AI calendar error: ${err}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  USAGE stats
// ─────────────────────────────────────────────────────────────────────────────
creativeApp.get(`${PREFIX}/creative/usage`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const userStr = await kv.get(`user:${userId}`);
    const user = userStr ? JSON.parse(userStr) : {};
    const plan = user.plan || 'starter';
    const limits = CREATIVE_PLAN_LIMITS[plan] || CREATIVE_PLAN_LIMITS.starter;
    const usage = await getUsage(userId);
    const credStr = await kv.get(`credits:${userId}`);
    return c.json({ plan, usage, limits, credits: parseInt(credStr || '0'), creditCosts: CREATIVE_CREDITS, month: getMonthKey() });
  } catch (err) {
    return c.json({ error: `Usage error: ${err}` }, 500);
  }
});

export default creativeApp;