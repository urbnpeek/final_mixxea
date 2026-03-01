import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import Stripe from "npm:stripe";
import * as kv from "./kv_store.tsx";
import {
  sendEmail,
  welcomeEmail,
  creditPurchaseEmail,
  ticketCreatedEmail,
  ticketReplyEmail,
  campaignLiveEmail,
  lowCreditsEmail,
  releaseDistributedEmail,
  teamInviteEmail,
  pitchStatusEmail,
} from "./email.tsx";

const app = new Hono();
const PREFIX = "/make-server-f4d1ffe4";

// ──── HMAC Session Tokens ─────────────────────────────────────────────────────
// Self-verifying tokens: v2.{userId}.{expiresAt}.{hmacHex}
// Verified entirely from the token itself — no KV lookup needed — so sessions
// survive Edge Function cold-starts and restarts completely.
const SESSION_SECRET = Deno.env.get("MIXXEA_SESSION_SECRET") || "mixxea_session_secret_v2_2024";
const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

// Cache the CryptoKey for the lifetime of this function instance.
// Re-importing on every request was the primary cause of slow auth round-trips.
let _hmacKey: CryptoKey | null = null;
async function getHmacKey(): Promise<CryptoKey> {
  if (_hmacKey) return _hmacKey;
  _hmacKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return _hmacKey;
}

async function generateSessionToken(userId: string): Promise<string> {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `${userId}.${expiresAt}`;
  const key = await getHmacKey();
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const sigHex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `v2.${payload}.${sigHex}`;
}

async function verifyHmacToken(token: string): Promise<string | null> {
  try {
    if (!token.startsWith("v2.")) return null;
    const inner = token.slice(3); // strip "v2."
    const lastDot = inner.lastIndexOf(".");
    if (lastDot < 0) return null;
    const sigHex = inner.slice(lastDot + 1);
    const payload = inner.slice(0, lastDot);
    const dotIdx = payload.indexOf(".");
    if (dotIdx < 0) return null;
    const userId = payload.slice(0, dotIdx);
    const expiresAt = parseInt(payload.slice(dotIdx + 1));
    if (isNaN(expiresAt) || Date.now() > expiresAt) return null;
    const sigBytes = new Uint8Array(sigHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
    const key = await getHmacKey();
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(payload));
    if (!valid) return null;
    return userId;
  } catch {
    return null;
  }
}

// Warm the HMAC key at startup so the first login/verify request doesn't
// pay the key-import cost on top of a cold start.
getHmacKey().catch(console.error);

app.use("*", logger(console.log));
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization", "stripe-signature", "X-MIXXEA-Token"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

app.get(`${PREFIX}/health`, (c) => c.json({ status: "ok", version: "2.0" }));

// ──── Stripe ──────────────────────────────────────────────────────────────────
const STRIPE_SECRET_KEY     = Deno.env.get("STRIPE_SECRET_KEY")     || "";
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20", httpClient: Stripe.createFetchHttpClient() })
  : null;

// ── Credit package catalogue (amounts in USD cents) ───────────────────────────
const CREDIT_PACKAGES: Record<string, { name: string; credits: number; bonusCredits: number; amountCents: number }> = {
  starter: { name: "Starter Pack",  credits: 100,  bonusCredits: 0,    amountCents: 999   },
  pro:     { name: "Pro Pack",      credits: 500,  bonusCredits: 50,   amountCents: 3999  },
  growth:  { name: "Growth Pack",   credits: 1000, bonusCredits: 150,  amountCents: 6999  },
  label:   { name: "Label Pack",    credits: 5000, bonusCredits: 1000, amountCents: 29999 },
};

// ── Plan subscription catalogue (amounts in USD cents, recurring monthly) ─────
const PLAN_SUBSCRIPTIONS: Record<string, { name: string; description: string; amountCents: number; plan: string }> = {
  growth: {
    name: "MIXXEA Growth Plan",
    description: "40 promo credits/mo · Playlist pitching · TikTok/IG/YouTube campaigns · Publishing tools",
    amountCents: 3900,
    plan: "growth",
  },
  pro: {
    name: "MIXXEA Pro Plan",
    description: "120 promo credits/mo · PR & Press · Meta/Google Ads · Dedicated manager · Multi-artist",
    amountCents: 14900,
    plan: "pro",
  },
};

// ── Infer plan from subscription amount (used in webhook for portal upgrades) ──
function planFromAmountCents(cents: number): string {
  if (cents >= 14900) return "pro";
  if (cents >= 3900)  return "growth";
  return "starter";
}

// ── Get or create Stripe customer for a MIXXEA user ───────────────────────────
async function getOrCreateStripeCustomer(
  stripeClient: Stripe,
  userId: string,
  email: string,
  name: string,
): Promise<string> {
  const userStr = await kv.get(`user:${userId}`);
  const user    = userStr ? JSON.parse(userStr) : {};

  // 1. Use stored Stripe customer ID if present and still valid
  if (user.stripeCustomerId) {
    try {
      const existing = await stripeClient.customers.retrieve(user.stripeCustomerId);
      if (!(existing as any).deleted) return user.stripeCustomerId;
    } catch { /* fall through */ }
  }

  // 2. Search Stripe by email to avoid duplicates
  const list = await stripeClient.customers.list({ email, limit: 1 });
  if (list.data.length > 0) {
    const customerId = list.data[0].id;
    user.stripeCustomerId = customerId;
    await kv.set(`user:${userId}`, JSON.stringify(user));
    await kv.set(`stripe_customer:${customerId}`, JSON.stringify({ userId }));
    return customerId;
  }

  // 3. Create fresh customer
  const customer = await stripeClient.customers.create({
    email,
    name,
    metadata: { mixxeaUserId: userId },
  });
  user.stripeCustomerId = customer.id;
  await kv.set(`user:${userId}`, JSON.stringify(user));
  await kv.set(`stripe_customer:${customer.id}`, JSON.stringify({ userId }));
  return customer.id;
}

// ──── Auth Helpers ────────────────────────────────────────────────────────────
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "mixxea_secure_salt_2024");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateId(): string { return crypto.randomUUID(); }

async function verifyToken(c: any): Promise<string | null> {
  // Primary: X-MIXXEA-Token header — our HMAC session token lives here so that
  // the Authorization header can always carry the Supabase anon key (required
  // by Supabase's edge-function infrastructure for JWT validation).
  const customToken = c.req.header("X-MIXXEA-Token");
  if (customToken) {
    const hmacUserId = await verifyHmacToken(customToken);
    if (hmacUserId) return hmacUserId;
    // Fallback: legacy UUID token in KV (for any old stored sessions)
    const legacyId = await kv.get(`session:${customToken}`);
    if (legacyId) return legacyId;
  }

  // Secondary: Authorization Bearer header (backwards-compat / direct calls)
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.split(" ")[1];
  if (!token) return null;
  const hmacUserId = await verifyHmacToken(token);
  if (hmacUserId) return hmacUserId;
  const userId = await kv.get(`session:${token}`);
  return userId || null;
}

// ===================== AUTH ROUTES =====================

app.post(`${PREFIX}/auth/signup`, async (c) => {
  try {
    const { name, email, password, role, inviteCode } = await c.req.json();
    if (!name || !email || !password || !role) return c.json({ error: "Missing required fields" }, 400);
    const existing = await kv.get(`user_email:${email.toLowerCase()}`);
    if (existing) return c.json({ error: "Email already registered" }, 409);

    const userId = generateId();
    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();
    const user: any = {
      id: userId, name, email: email.toLowerCase(), role, avatar: null, bio: "",
      plan: "starter", credits: 100, joinedAt: now,
      onboardingCompleted: false, isAdmin: false,
    };

    // Handle label invite
    if (inviteCode) {
      const inviteStr = await kv.get(`team_invite:${inviteCode}`);
      if (inviteStr) {
        const invite = JSON.parse(inviteStr);
        user.labelId = invite.labelUserId;
        // Add to label's team
        const teamStr = await kv.get(`team:${invite.labelUserId}`);
        const team = teamStr ? JSON.parse(teamStr) : [];
        team.push({ userId, name, email: email.toLowerCase(), role, joinedAt: now });
        await kv.set(`team:${invite.labelUserId}`, JSON.stringify(team));
        await kv.del(`team_invite:${inviteCode}`);
      }
    }

    await kv.set(`user:${userId}`, JSON.stringify(user));
    await kv.set(`user_email:${email.toLowerCase()}`, userId);
    await kv.set(`user_password:${userId}`, passwordHash);
    await kv.set(`credits:${userId}`, "100");

    const welcomeTxn = [{ id: generateId(), amount: 100, type: "bonus", description: "Welcome bonus — 100 free credits!", createdAt: now }];
    await kv.set(`credit_txns:${userId}`, JSON.stringify(welcomeTxn));

    // Seed analytics
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const cur = new Date().getMonth();
    const streamData = months.slice(0, cur + 1).map((month) => ({
      month,
      streams: Math.floor(Math.random() * 50000) + 8000,
      downloads: Math.floor(Math.random() * 5000) + 800,
      saves: Math.floor(Math.random() * 12000) + 2000,
    }));
    const revenueData = streamData.map((d) => ({
      month: d.month,
      streaming: parseFloat((d.streams * 0.0038).toFixed(2)),
      downloads: parseFloat((d.downloads * 0.72).toFixed(2)),
      publishing: parseFloat((d.streams * 0.0009).toFixed(2)),
    }));
    const platformData = [
      { platform: "Spotify", streams: Math.floor(Math.random() * 120000) + 40000, color: "#1DB954" },
      { platform: "Apple Music", streams: Math.floor(Math.random() * 60000) + 15000, color: "#FA586A" },
      { platform: "YouTube Music", streams: Math.floor(Math.random() * 40000) + 8000, color: "#FF0000" },
      { platform: "Amazon Music", streams: Math.floor(Math.random() * 20000) + 4000, color: "#FF9900" },
      { platform: "TIDAL", streams: Math.floor(Math.random() * 15000) + 2000, color: "#00FFFF" },
      { platform: "Deezer", streams: Math.floor(Math.random() * 10000) + 1500, color: "#A238FF" },
    ];
    const geoData = [
      { country: "United States", percentage: 32 }, { country: "United Kingdom", percentage: 16 },
      { country: "Nigeria", percentage: 13 }, { country: "Canada", percentage: 9 },
      { country: "Germany", percentage: 7 }, { country: "France", percentage: 6 }, { country: "Other", percentage: 17 },
    ];
    const totalStreams = streamData.reduce((s, d) => s + d.streams, 0);
    const totalRevenue = revenueData.reduce((s, d) => s + d.streaming + d.downloads + d.publishing, 0);
    const analytics = {
      overview: { totalStreams, totalRevenue: parseFloat(totalRevenue.toFixed(2)), totalSaves: streamData.reduce((s,d)=>s+d.saves,0), totalDownloads: streamData.reduce((s,d)=>s+d.downloads,0), monthlyListeners: Math.floor(Math.random()*18000)+3000, followerCount: Math.floor(Math.random()*8000)+500 },
      streamData, revenueData, platformData, geoData,
      lastSynced: now, source: "seeded",
    };
    await kv.set(`analytics:${userId}`, JSON.stringify(analytics));

    const token = await generateSessionToken(userId);

    // Send welcome email (non-blocking)
    sendEmail(email.toLowerCase(), "🎵 Welcome to MIXXEA — You have 100 free credits!", welcomeEmail(name, role)).catch(console.error);

    return c.json({ token, user });
  } catch (err) {
    console.log("Signup error:", err);
    return c.json({ error: `Signup error: ${err}` }, 500);
  }
});

app.post(`${PREFIX}/auth/login`, async (c) => {
  try {
    const { email, password } = await c.req.json();
    if (!email || !password) return c.json({ error: "Email and password required" }, 400);

    // Step 1: resolve userId from email (must be sequential — userId needed for next lookups)
    const userId = await kv.get(`user_email:${email.toLowerCase()}`);
    if (!userId) return c.json({ error: "Invalid email or password" }, 401);

    // Step 2: fetch password hash, user record, AND hash the input — all in parallel
    const [storedHash, userStr, inputHash] = await Promise.all([
      kv.get(`user_password:${userId}`),
      kv.get(`user:${userId}`),
      hashPassword(password),
    ]);

    if (storedHash !== inputHash) return c.json({ error: "Invalid email or password" }, 401);
    if (!userStr) return c.json({ error: "User not found" }, 404);

    // Step 3: generate session token (HMAC key is now cached after first call)
    const token = await generateSessionToken(userId);
    return c.json({ token, user: JSON.parse(userStr) });
  } catch (err) {
    console.log("Login error:", err);
    return c.json({ error: `Login error: ${err}` }, 500);
  }
});

app.get(`${PREFIX}/auth/verify`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const userStr = await kv.get(`user:${userId}`);
    if (!userStr) return c.json({ error: "User not found" }, 404);
    return c.json({ user: JSON.parse(userStr) });
  } catch (err) {
    return c.json({ error: `Verify error: ${err}` }, 500);
  }
});

app.post(`${PREFIX}/auth/logout`, async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      // HMAC tokens are stateless — no KV entry to delete.
      // Legacy UUID tokens: clean up the KV session key.
      if (token && !token.startsWith("v2.")) {
        await kv.del(`session:${token}`).catch(() => {});
      }
    }
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: `Logout error: ${err}` }, 500);
  }
});

// ===================== PLAN =====================

// Admin / internal: apply a plan change directly (no Stripe) — used for testing & admin panel
app.post(`${PREFIX}/plan/upgrade`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const { plan } = await c.req.json();
    const validPlans = ["starter", "growth", "pro"];
    if (!validPlans.includes(plan)) return c.json({ error: "Invalid plan" }, 400);
    const userStr = await kv.get(`user:${userId}`);
    if (!userStr) return c.json({ error: "User not found" }, 404);
    const user = JSON.parse(userStr);
    const updatedUser = { ...user, plan };
    await kv.set(`user:${userId}`, JSON.stringify(updatedUser));
    console.log(`[Plan] Direct upgrade: user ${userId} → ${plan}`);
    return c.json({ user: updatedUser });
  } catch (err) {
    console.log("Plan upgrade error:", err);
    return c.json({ error: `Plan upgrade error: ${err}` }, 500);
  }
});

// Create Stripe Checkout session for a plan subscription
app.post(`${PREFIX}/plan/subscribe`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    if (!stripe) return c.json({ error: "Stripe not configured. Add STRIPE_SECRET_KEY." }, 503);

    const { planId, successUrl, cancelUrl } = await c.req.json();
    const planDef = PLAN_SUBSCRIPTIONS[planId];
    if (!planDef) return c.json({ error: "Invalid plan. Choose 'growth' or 'pro'." }, 400);

    const userStr = await kv.get(`user:${userId}`);
    if (!userStr) return c.json({ error: "User not found" }, 404);
    const user = JSON.parse(userStr);

    const customerId = await getOrCreateStripeCustomer(stripe, userId, user.email, user.name);
    const origin = c.req.header("Origin") || "https://mixxea.com";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      automatic_payment_methods: { enabled: true },
      billing_address_collection: "auto",
      allow_promotion_codes: true,
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: planDef.name,
            description: planDef.description,
          },
          unit_amount: planDef.amountCents,
          recurring: { interval: "month" },
        },
        quantity: 1,
      }],
      subscription_data: {
        metadata: { mixxeaUserId: userId, plan: planDef.plan },
      },
      metadata: { mixxeaUserId: userId, plan: planDef.plan, type: "subscription" },
      success_url: successUrl || `${origin}/dashboard/settings?plan_success=1`,
      cancel_url:  cancelUrl  || `${origin}/dashboard/settings?plan_cancelled=1`,
    });

    console.log(`[Plan] Subscription checkout created: user=${userId} plan=${planId} session=${session.id}`);
    return c.json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (err) {
    console.log("Plan subscribe error:", err);
    return c.json({ error: `Plan subscribe error: ${err}` }, 500);
  }
});

// Open the Stripe Customer Portal so users can manage/cancel their subscription
app.post(`${PREFIX}/plan/portal`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    if (!stripe) return c.json({ error: "Stripe not configured." }, 503);

    const userStr = await kv.get(`user:${userId}`);
    if (!userStr) return c.json({ error: "User not found" }, 404);
    const user = JSON.parse(userStr);

    if (!user.stripeCustomerId) {
      return c.json({ error: "No active subscription found. Please subscribe to a plan first." }, 404);
    }

    const origin = c.req.header("Origin") || "https://mixxea.com";
    const { returnUrl } = await c.req.json().catch(() => ({}));

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: returnUrl || `${origin}/dashboard/settings`,
    });

    return c.json({ portalUrl: portalSession.url });
  } catch (err) {
    console.log("Plan portal error:", err);
    return c.json({ error: `Portal error: ${err}` }, 500);
  }
});

// Get current subscription data for a user
app.get(`${PREFIX}/plan/subscription`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const subStr = await kv.get(`subscription:${userId}`);
    const subscription = subStr ? JSON.parse(subStr) : null;

    // Also enrich with live Stripe data if available
    if (stripe && subscription?.subscriptionId) {
      try {
        const sub = await stripe.subscriptions.retrieve(subscription.subscriptionId);
        subscription.status           = sub.status;
        subscription.cancelAtPeriodEnd = sub.cancel_at_period_end;
        subscription.currentPeriodEnd = new Date((sub as any).current_period_end * 1000).toISOString();
        // Persist refreshed data
        await kv.set(`subscription:${userId}`, JSON.stringify(subscription));
      } catch { /* subscription may have been deleted */ }
    }

    return c.json({ subscription });
  } catch (err) {
    return c.json({ error: `Subscription fetch error: ${err}` }, 500);
  }
});

// Stripe health check
app.get(`${PREFIX}/stripe/health`, async (c) => {
  const configured = !!STRIPE_SECRET_KEY;
  const webhookConfigured = !!STRIPE_WEBHOOK_SECRET;
  let keyValid = false;
  let mode: "live" | "test" | "unconfigured" = "unconfigured";

  if (stripe) {
    try {
      await stripe.balance.retrieve();
      keyValid = true;
      mode = STRIPE_SECRET_KEY.startsWith("sk_live_") ? "live" : "test";
    } catch {
      keyValid = false;
    }
  }

  return c.json({
    configured,
    keyValid,
    webhookConfigured,
    mode,
    paymentMethods: keyValid ? ["card", "apple_pay", "google_pay", "link", "bank_transfer"] : [],
    message: !configured
      ? "Add STRIPE_SECRET_KEY to enable payments"
      : !keyValid
        ? "STRIPE_SECRET_KEY is set but invalid — verify the key in your Stripe dashboard"
        : `Stripe ${mode} mode active · ${webhookConfigured ? "Webhook configured" : "STRIPE_WEBHOOK_SECRET not set — add it to verify webhook events"}`,
  });
});

// ===================== PROFILE =====================

app.get(`${PREFIX}/profile`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const userStr = await kv.get(`user:${userId}`);
    if (!userStr) return c.json({ error: "User not found" }, 404);
    return c.json({ user: JSON.parse(userStr) });
  } catch (err) {
    return c.json({ error: `Profile fetch error: ${err}` }, 500);
  }
});

app.put(`${PREFIX}/profile`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const updates = await c.req.json();
    const userStr = await kv.get(`user:${userId}`);
    if (!userStr) return c.json({ error: "User not found" }, 404);
    const user = JSON.parse(userStr);
    const { id, email, ...safeUpdates } = updates;
    const updatedUser = { ...user, ...safeUpdates };
    await kv.set(`user:${userId}`, JSON.stringify(updatedUser));
    return c.json({ user: updatedUser });
  } catch (err) {
    return c.json({ error: `Profile update error: ${err}` }, 500);
  }
});

// ===================== ONBOARDING =====================

app.post(`${PREFIX}/onboarding/complete`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const body = await c.req.json();
    const userStr = await kv.get(`user:${userId}`);
    if (!userStr) return c.json({ error: "User not found" }, 404);
    const user = JSON.parse(userStr);
    const updatedUser = {
      ...user,
      onboardingCompleted: true,
      name: body.artistName || user.name,
      bio: body.bio || user.bio,
      genre: body.genre || user.genre,
      location: body.location || user.location,
    };
    await kv.set(`user:${userId}`, JSON.stringify(updatedUser));

    // Also update smart page if provided
    if (body.artistName || body.bio) {
      const spStr = await kv.get(`smart_page:${userId}`);
      const sp = spStr ? JSON.parse(spStr) : {};
      const slug = (body.artistName || user.name).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const updatedSp = {
        ...sp, userId,
        artistName: body.artistName || sp.artistName || user.name,
        bio: body.bio || sp.bio || "",
        genre: body.genre || sp.genre || "",
        location: body.location || sp.location || "",
        slug: sp.slug || slug,
        theme: "dark", isPublic: false,
        socialLinks: sp.socialLinks || { spotify:"",instagram:"",tiktok:"",youtube:"",twitter:"",soundcloud:"" },
        updatedAt: new Date().toISOString(),
      };
      await kv.set(`smart_page:${userId}`, JSON.stringify(updatedSp));
      await kv.set(`smart_page_slug:${updatedSp.slug}`, userId);
    }

    return c.json({ user: updatedUser });
  } catch (err) {
    return c.json({ error: `Onboarding complete error: ${err}` }, 500);
  }
});

// ===================== RELEASES / DISTRIBUTION =====================

app.get(`${PREFIX}/releases`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const idsStr = await kv.get(`releases:${userId}`);
    const ids = idsStr ? JSON.parse(idsStr) : [];
    const releases = (await Promise.all(ids.map(async (id: string) => { const s = await kv.get(`release:${id}`); return s ? JSON.parse(s) : null; }))).filter(Boolean);
    return c.json({ releases });
  } catch (err) {
    return c.json({ error: `Releases fetch error: ${err}` }, 500);
  }
});

app.post(`${PREFIX}/releases`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const body = await c.req.json();
    const id = generateId();
    const now = new Date().toISOString();
    const release = {
      id, userId, title: body.title || "Untitled Release", artist: body.artist || "",
      type: body.type || "single", genre: body.genre || "", releaseDate: body.releaseDate || "",
      coverArt: body.coverArt || null, status: "draft",
      stores: body.stores || ["spotify","apple_music","youtube_music","amazon_music","tidal","deezer","tiktok"],
      upc: null, isrc: null, label: body.label || "", description: body.description || "",
      tracks: body.tracks || [], explicit: body.explicit || false, language: body.language || "English",
      createdAt: now, updatedAt: now,
    };
    await kv.set(`release:${id}`, JSON.stringify(release));
    const idsStr = await kv.get(`releases:${userId}`);
    const ids = idsStr ? JSON.parse(idsStr) : [];
    ids.unshift(id);
    await kv.set(`releases:${userId}`, JSON.stringify(ids));
    return c.json({ release });
  } catch (err) {
    return c.json({ error: `Release create error: ${err}` }, 500);
  }
});

app.put(`${PREFIX}/releases/:releaseId`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const rId = c.req.param("releaseId");
    const s = await kv.get(`release:${rId}`);
    if (!s) return c.json({ error: "Release not found" }, 404);
    const release = JSON.parse(s);
    if (release.userId !== userId) return c.json({ error: "Forbidden" }, 403);
    const updates = await c.req.json();
    const wasDistributed = release.status !== "distributed" && updates.status === "distributed";
    const updated = { ...release, ...updates, id: rId, userId, updatedAt: new Date().toISOString() };
    await kv.set(`release:${rId}`, JSON.stringify(updated));

    // Email when status changes to distributed
    if (wasDistributed) {
      const userStr = await kv.get(`user:${userId}`);
      if (userStr) {
        const user = JSON.parse(userStr);
        sendEmail(
          user.email,
          `🎉 "${updated.title}" is now distributed!`,
          releaseDistributedEmail(user.name, updated.title, updated.type, updated.stores, updated.releaseDate)
        ).catch(console.error);
      }
    }

    return c.json({ release: updated });
  } catch (err) {
    return c.json({ error: `Release update error: ${err}` }, 500);
  }
});

app.delete(`${PREFIX}/releases/:releaseId`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const rId = c.req.param("releaseId");
    const s = await kv.get(`release:${rId}`);
    if (!s) return c.json({ error: "Release not found" }, 404);
    if (JSON.parse(s).userId !== userId) return c.json({ error: "Forbidden" }, 403);
    await kv.del(`release:${rId}`);
    const idsStr = await kv.get(`releases:${userId}`);
    const ids = idsStr ? JSON.parse(idsStr) : [];
    await kv.set(`releases:${userId}`, JSON.stringify(ids.filter((i: string) => i !== rId)));
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: `Release delete error: ${err}` }, 500);
  }
});

// ===================== CAMPAIGNS / PROMOTIONS =====================

app.get(`${PREFIX}/campaigns`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const idsStr = await kv.get(`campaigns:${userId}`);
    const ids = idsStr ? JSON.parse(idsStr) : [];
    const campaigns = (await Promise.all(ids.map(async (id: string) => { const s = await kv.get(`campaign:${id}`); return s ? JSON.parse(s) : null; }))).filter(Boolean);
    return c.json({ campaigns });
  } catch (err) {
    return c.json({ error: `Campaigns fetch error: ${err}` }, 500);
  }
});

app.post(`${PREFIX}/campaigns`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const body = await c.req.json();
    const creditCost = body.creditCost || 0;
    const creditsStr = await kv.get(`credits:${userId}`);
    const credits = parseInt(creditsStr || "0");
    if (credits < creditCost) return c.json({ error: "Insufficient credits for this campaign" }, 400);

    const now = new Date().toISOString();
    const id = generateId();
    const newCredits = credits - creditCost;
    await kv.set(`credits:${userId}`, String(newCredits));

    // Credits are HELD (deducted now, refunded automatically if rejected)
    if (creditCost > 0) {
      const userStr = await kv.get(`user:${userId}`);
      if (userStr) { const u = JSON.parse(userStr); u.credits = newCredits; await kv.set(`user:${userId}`, JSON.stringify(u)); }
      const txnStr = await kv.get(`credit_txns:${userId}`);
      const txns = txnStr ? JSON.parse(txnStr) : [];
      txns.unshift({ id: generateId(), amount: -creditCost, type: "hold", description: `Credits held for campaign review: ${body.name}`, createdAt: now });
      await kv.set(`credit_txns:${userId}`, JSON.stringify(txns));
    }

    // APPROVAL FLOW: status starts as pending_review — admin must approve before going live
    const campaign = {
      id, userId, name: body.name, type: body.type, status: "pending_review", budget: body.budget || 0,
      creditCost, creditsUsed: 0, startDate: body.startDate || now, endDate: body.endDate || null,
      releaseId: body.releaseId || null, releaseTitle: body.releaseTitle || "", targetAudience: body.targetAudience || "",
      platforms: body.platforms || [], notes: body.notes || "", adminNotes: "", rejectionReason: "",
      results: { streams: 0, saves: 0, playlists: 0, reach: 0, clicks: 0, conversions: 0 }, createdAt: now, updatedAt: now,
    };
    await kv.set(`campaign:${id}`, JSON.stringify(campaign));
    const idsStr = await kv.get(`campaigns:${userId}`);
    const ids = idsStr ? JSON.parse(idsStr) : [];
    ids.unshift(id);
    await kv.set(`campaigns:${userId}`, JSON.stringify(ids));

    // Send submission confirmation email
    const userStr = await kv.get(`user:${userId}`);
    if (userStr) {
      const user = JSON.parse(userStr);
      sendEmail(
        user.email,
        `⏳ Campaign submitted for review: "${body.name}"`,
        `<div style="font-family:sans-serif;background:#0a0a0a;color:#fff;padding:32px;border-radius:12px;max-width:600px">
          <h2 style="color:#7B5FFF;margin-top:0">Campaign Submitted for Review</h2>
          <p>Hi ${user.name},</p>
          <p>Your campaign <strong>"${body.name}"</strong> has been submitted and is pending admin approval.</p>
          <p style="color:#aaa">Service: ${(body.type||"").replace(/_/g," ")} &nbsp;·&nbsp; Credits held: ${creditCost}</p>
          <p>You will receive an email once our team reviews your campaign — usually within 24 hours.</p>
          <p style="color:#666;font-size:13px">— The MIXXEA Team</p>
        </div>`
      ).catch(console.error);
    }

    return c.json({ campaign, newCreditBalance: newCredits });
  } catch (err) {
    return c.json({ error: `Campaign create error: ${err}` }, 500);
  }
});

app.put(`${PREFIX}/campaigns/:campaignId`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const cId = c.req.param("campaignId");
    const s = await kv.get(`campaign:${cId}`);
    if (!s) return c.json({ error: "Campaign not found" }, 404);
    const campaign = JSON.parse(s);
    if (campaign.userId !== userId) return c.json({ error: "Forbidden" }, 403);
    const updates = await c.req.json();
    const updated = { ...campaign, ...updates, id: cId, userId };
    await kv.set(`campaign:${cId}`, JSON.stringify(updated));
    return c.json({ campaign: updated });
  } catch (err) {
    return c.json({ error: `Campaign update error: ${err}` }, 500);
  }
});

// ===================== PUBLISHING WORKS =====================

app.get(`${PREFIX}/works`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const idsStr = await kv.get(`works:${userId}`);
    const ids = idsStr ? JSON.parse(idsStr) : [];
    const works = (await Promise.all(ids.map(async (id: string) => { const s = await kv.get(`work:${id}`); return s ? JSON.parse(s) : null; }))).filter(Boolean);
    return c.json({ works });
  } catch (err) {
    return c.json({ error: `Works fetch error: ${err}` }, 500);
  }
});

app.post(`${PREFIX}/works`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const body = await c.req.json();
    const id = generateId();
    const now = new Date().toISOString();
    const work = {
      id, userId, title: body.title || "Untitled Work", writers: body.writers || [],
      publishers: body.publishers || [], iswc: body.iswc || null,
      releaseId: body.releaseId || null, royaltiesEarned: 0, status: "pending",
      territories: body.territories || ["Worldwide"], genre: body.genre || "",
      registrationDate: now, createdAt: now,
    };
    await kv.set(`work:${id}`, JSON.stringify(work));
    const idsStr = await kv.get(`works:${userId}`);
    const ids = idsStr ? JSON.parse(idsStr) : [];
    ids.unshift(id);
    await kv.set(`works:${userId}`, JSON.stringify(ids));
    return c.json({ work });
  } catch (err) {
    return c.json({ error: `Work create error: ${err}` }, 500);
  }
});

app.put(`${PREFIX}/works/:workId`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const wId = c.req.param("workId");
    const s = await kv.get(`work:${wId}`);
    if (!s) return c.json({ error: "Work not found" }, 404);
    const work = JSON.parse(s);
    if (work.userId !== userId) return c.json({ error: "Forbidden" }, 403);
    const updates = await c.req.json();
    const updated = { ...work, ...updates, id: wId, userId };
    await kv.set(`work:${wId}`, JSON.stringify(updated));
    return c.json({ work: updated });
  } catch (err) {
    return c.json({ error: `Work update error: ${err}` }, 500);
  }
});

// ===================== ROYALTY SPLITS =====================

app.get(`${PREFIX}/splits`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const idsStr = await kv.get(`splits:${userId}`);
    const ids = idsStr ? JSON.parse(idsStr) : [];
    const splits = (await Promise.all(ids.map(async (id: string) => { const s = await kv.get(`split:${id}`); return s ? JSON.parse(s) : null; }))).filter(Boolean);
    return c.json({ splits });
  } catch (err) {
    return c.json({ error: `Splits fetch error: ${err}` }, 500);
  }
});

app.post(`${PREFIX}/splits`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const body = await c.req.json();
    const id = generateId();
    const now = new Date().toISOString();
    const totalPct = (body.collaborators || []).reduce((s: number, col: any) => s + (col.percentage || 0), 0);
    const split = {
      id, userId, releaseId: body.releaseId || null, releaseTitle: body.releaseTitle || "Untitled",
      collaborators: body.collaborators || [], totalPercentage: totalPct, status: "active", createdAt: now,
    };
    await kv.set(`split:${id}`, JSON.stringify(split));
    const idsStr = await kv.get(`splits:${userId}`);
    const ids = idsStr ? JSON.parse(idsStr) : [];
    ids.unshift(id);
    await kv.set(`splits:${userId}`, JSON.stringify(ids));
    return c.json({ split });
  } catch (err) {
    return c.json({ error: `Split create error: ${err}` }, 500);
  }
});

app.put(`${PREFIX}/splits/:splitId`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const sId = c.req.param("splitId");
    const s = await kv.get(`split:${sId}`);
    if (!s) return c.json({ error: "Split not found" }, 404);
    const split = JSON.parse(s);
    if (split.userId !== userId) return c.json({ error: "Forbidden" }, 403);
    const updates = await c.req.json();
    const updated = { ...split, ...updates, id: sId, userId };
    await kv.set(`split:${sId}`, JSON.stringify(updated));
    return c.json({ split: updated });
  } catch (err) {
    return c.json({ error: `Split update error: ${err}` }, 500);
  }
});

// ===================== SMART PAGES =====================

app.get(`${PREFIX}/smart-page`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const s = await kv.get(`smart_page:${userId}`);
    const userStr = await kv.get(`user:${userId}`);
    const user = userStr ? JSON.parse(userStr) : {};
    if (!s) {
      const slug = (user.name || userId).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const def = {
        userId, artistName: user.name || "", bio: user.bio || "", profileImage: null, bannerImage: null,
        socialLinks: { spotify:"",instagram:"",tiktok:"",youtube:"",twitter:"",soundcloud:"" },
        slug, theme: "dark", isPublic: false, featuredReleases: [], genre: "", location: "", website: "",
        updatedAt: new Date().toISOString(),
      };
      return c.json({ smartPage: def });
    }
    return c.json({ smartPage: JSON.parse(s) });
  } catch (err) {
    return c.json({ error: `Smart page fetch error: ${err}` }, 500);
  }
});

app.put(`${PREFIX}/smart-page`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const updates = await c.req.json();
    const s = await kv.get(`smart_page:${userId}`);
    const existing = s ? JSON.parse(s) : {};
    const updated = { ...existing, ...updates, userId, updatedAt: new Date().toISOString() };
    await kv.set(`smart_page:${userId}`, JSON.stringify(updated));
    // Index by slug for public lookup
    if (updated.slug) {
      await kv.set(`smart_page_slug:${updated.slug}`, userId);
    }
    return c.json({ smartPage: updated });
  } catch (err) {
    return c.json({ error: `Smart page update error: ${err}` }, 500);
  }
});

// GET public smart page by slug (no auth)
app.get(`${PREFIX}/smart-page/public/:slug`, async (c) => {
  try {
    const slug = c.req.param("slug");
    const userId = await kv.get(`smart_page_slug:${slug}`);
    if (!userId) return c.json({ error: "Page not found" }, 404);
    const s = await kv.get(`smart_page:${userId}`);
    if (!s) return c.json({ error: "Page not found" }, 404);
    const page = JSON.parse(s);
    if (!page.isPublic) return c.json({ error: "Page is private" }, 403);
    // Get user info for display
    const userStr = await kv.get(`user:${userId}`);
    const user = userStr ? JSON.parse(userStr) : {};
    // Get releases for the page
    const idsStr = await kv.get(`releases:${userId}`);
    const ids = idsStr ? JSON.parse(idsStr) : [];
    const releases = (await Promise.all(
      ids.slice(0, 6).map(async (id: string) => { const rs = await kv.get(`release:${id}`); return rs ? JSON.parse(rs) : null; })
    )).filter((r: any) => r && r.status === "distributed");
    // Increment page view count
    const viewKey = `page_views:${userId}`;
    const views = parseInt(await kv.get(viewKey) || "0") + 1;
    await kv.set(viewKey, String(views));
    return c.json({ smartPage: { ...page, role: user.role }, releases, pageViews: views });
  } catch (err) {
    return c.json({ error: `Public page fetch error: ${err}` }, 500);
  }
});

// GET smart page analytics (views, clicks)
app.get(`${PREFIX}/smart-page/stats`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const views = parseInt(await kv.get(`page_views:${userId}`) || "0");
    const clicks = parseInt(await kv.get(`page_clicks:${userId}`) || "0");
    const saves = parseInt(await kv.get(`page_saves:${userId}`) || "0");
    return c.json({ pageViews: views, linkClicks: clicks, saves });
  } catch (err) {
    return c.json({ error: `Stats fetch error: ${err}` }, 500);
  }
});

// Track link click on public page
app.post(`${PREFIX}/smart-page/track/:userId`, async (c) => {
  try {
    const tUserId = c.req.param("userId");
    const body = await c.req.json().catch(() => ({}));
    if (body.type === "click") {
      const key = `page_clicks:${tUserId}`;
      const v = parseInt(await kv.get(key) || "0") + 1;
      await kv.set(key, String(v));
    }
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ error: `Track error: ${err}` }, 500);
  }
});

// ===================== CREDITS =====================

app.get(`${PREFIX}/credits`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const creditsStr = await kv.get(`credits:${userId}`);
    const balance = parseInt(creditsStr || "0");
    const txnStr = await kv.get(`credit_txns:${userId}`);
    const transactions = txnStr ? JSON.parse(txnStr) : [];
    return c.json({ balance, transactions: transactions.slice(0, 100) });
  } catch (err) {
    return c.json({ error: `Credits fetch error: ${err}` }, 500);
  }
});

// Stripe: create one-time checkout session for credit packages
app.post(`${PREFIX}/credits/create-checkout`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    if (!stripe) return c.json({ error: "Stripe not configured. Please add STRIPE_SECRET_KEY." }, 503);

    const { packageId, successUrl, cancelUrl } = await c.req.json();
    const pkg = CREDIT_PACKAGES[packageId];
    if (!pkg) return c.json({ error: "Invalid package" }, 400);
    const totalCredits = pkg.credits + pkg.bonusCredits;

    const userStr = await kv.get(`user:${userId}`);
    const user    = userStr ? JSON.parse(userStr) : {};
    const origin  = c.req.header("Origin") || "https://mixxea.com";

    // Create or retrieve the Stripe customer so Link, Apple Pay, saved cards work
    const customerId = await getOrCreateStripeCustomer(stripe, userId, user.email || "", user.name || "MIXXEA User");

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      // ✅ automatic_payment_methods enables: card, Apple Pay, Google Pay, Link,
      //    bank transfers, Klarna, Afterpay — based on customer location & Stripe settings
      automatic_payment_methods: { enabled: true },
      billing_address_collection: "auto",
      allow_promotion_codes: true,
      invoice_creation: { enabled: true },
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: `MIXXEA ${pkg.name}`,
            description: `${totalCredits.toLocaleString()} promotion credits · Music distribution, marketing & campaigns`,
          },
          unit_amount: pkg.amountCents,
        },
        quantity: 1,
      }],
      mode: "payment",
      payment_intent_data: {
        metadata: { mixxeaUserId: userId, creditAmount: String(totalCredits), packageName: pkg.name, packageId, type: "credit_purchase" },
      },
      metadata: {
        mixxeaUserId: userId,
        creditAmount:  String(totalCredits),
        packageName:   pkg.name,
        packageId,
        type: "credit_purchase",
      },
      success_url: successUrl || `${origin}/dashboard/credits?success=1`,
      cancel_url:  cancelUrl  || `${origin}/dashboard/credits?cancelled=1`,
    });

    console.log(`[Credits] Checkout session created: user=${userId} package=${packageId} session=${session.id}`);
    return c.json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (err) {
    console.log("Stripe checkout error:", err);
    return c.json({ error: `Stripe checkout error: ${err}` }, 500);
  }
});

// Stripe: webhook handler
app.post(`${PREFIX}/webhooks/stripe`, async (c) => {
  try {
    const body = await c.req.text();
    const sig  = c.req.header("stripe-signature") || "";

    let event: any;
    if (stripe && STRIPE_WEBHOOK_SECRET) {
      try {
        event = await stripe.webhooks.constructEventAsync(body, sig, STRIPE_WEBHOOK_SECRET);
      } catch (err) {
        console.log("❌ Stripe webhook signature verification failed:", err);
        return c.json({ error: "Invalid webhook signature" }, 400);
      }
    } else if (stripe && !STRIPE_WEBHOOK_SECRET) {
      // Webhook secret not set — REJECT for security. Never process unverified webhooks.
      console.log("❌ STRIPE_WEBHOOK_SECRET not configured — webhook rejected for security. Set it in your Supabase secrets.");
      return c.json({ error: "Webhook secret not configured. Add STRIPE_WEBHOOK_SECRET to your server secrets." }, 503);
    } else {
      return c.json({ error: "Stripe not configured" }, 503);
    }

    const now = new Date().toISOString();

    // ── checkout.session.completed ─────────────────────────────────────────────
    if (event.type === "checkout.session.completed") {
      const session   = event.data.object;
      const eventType = session.metadata?.type;

      // ── Credit purchase (one-time payment) ──────────────────────────────────
      if (eventType === "credit_purchase" || session.mode === "payment") {
        const userId      = session.metadata?.mixxeaUserId || session.metadata?.userId;
        const creditAmount = parseInt(session.metadata?.creditAmount || "0");
        const packageName  = session.metadata?.packageName || "Credits";
        const amountPaid   = `$${((session.amount_total ?? 0) / 100).toFixed(2)}`;

        if (userId && creditAmount > 0) {
          const credStr  = await kv.get(`credits:${userId}`);
          const current  = parseInt(credStr || "0");
          const newBalance = current + creditAmount;
          await kv.set(`credits:${userId}`, String(newBalance));

          const userStr = await kv.get(`user:${userId}`);
          if (userStr) {
            const u = JSON.parse(userStr);
            u.credits = newBalance;
            await kv.set(`user:${userId}`, JSON.stringify(u));
            sendEmail(
              u.email,
              `✅ ${creditAmount.toLocaleString()} credits added to your MIXXEA account`,
              creditPurchaseEmail(u.name, creditAmount, packageName, newBalance, amountPaid)
            ).catch(console.error);
          }

          const txn    = { id: generateId(), amount: creditAmount, type: "purchase", description: `Purchased: ${packageName} (Stripe)`, createdAt: now };
          const txnStr = await kv.get(`credit_txns:${userId}`);
          const txns   = txnStr ? JSON.parse(txnStr) : [];
          txns.unshift(txn);
          await kv.set(`credit_txns:${userId}`, JSON.stringify(txns));
          console.log(`[Webhook] ✅ ${creditAmount} credits → user ${userId} (${packageName})`);
        }
      }

      // ── Subscription checkout completed — plan activation ────────────────────
      if (eventType === "subscription" || session.mode === "subscription") {
        const userId = session.metadata?.mixxeaUserId || session.metadata?.userId;
        const plan   = session.metadata?.plan;
        if (userId && plan) {
          const userStr = await kv.get(`user:${userId}`);
          if (userStr) {
            const u = JSON.parse(userStr);
            u.plan = plan;
            await kv.set(`user:${userId}`, JSON.stringify(u));
            console.log(`[Webhook] ✅ Plan activated: user=${userId} plan=${plan}`);
          }
        }
      }
    }

    // ── customer.subscription.created / updated ────────────────────────────────
    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
      const sub        = event.data.object;
      const customerId = sub.customer;

      // Resolve userId from metadata or stripe_customer KV index
      let userId = sub.metadata?.mixxeaUserId;
      if (!userId) {
        const custStr = await kv.get(`stripe_customer:${customerId}`);
        if (custStr) userId = JSON.parse(custStr).userId;
      }
      if (!userId) { console.log("[Webhook] ⚠️  subscription event: userId not found for customer", customerId); }

      if (userId) {
        // Determine plan from metadata or price amount
        const plan = sub.metadata?.plan
          || planFromAmountCents(sub.items?.data?.[0]?.price?.unit_amount ?? 0);

        const subData = {
          subscriptionId:    sub.id,
          customerId:        customerId,
          plan,
          status:            sub.status,
          currentPeriodEnd:  new Date((sub as any).current_period_end * 1000).toISOString(),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          updatedAt:         now,
        };

        await kv.set(`subscription:${userId}`, JSON.stringify(subData));

        if (sub.status === "active" || sub.status === "trialing") {
          const userStr = await kv.get(`user:${userId}`);
          if (userStr) {
            const u = JSON.parse(userStr);
            u.plan = plan;
            u.stripeCustomerId   = customerId;
            u.stripeSubscriptionId = sub.id;
            await kv.set(`user:${userId}`, JSON.stringify(u));
          }
        }
        console.log(`[Webhook] ✅ Subscription ${event.type}: user=${userId} plan=${plan} status=${sub.status}`);
      }
    }

    // ── customer.subscription.deleted (cancelled) ──────────────────────────────
    if (event.type === "customer.subscription.deleted") {
      const sub        = event.data.object;
      const customerId = sub.customer;
      let userId       = sub.metadata?.mixxeaUserId;
      if (!userId) {
        const custStr = await kv.get(`stripe_customer:${customerId}`);
        if (custStr) userId = JSON.parse(custStr).userId;
      }
      if (userId) {
        const userStr = await kv.get(`user:${userId}`);
        if (userStr) {
          const u = JSON.parse(userStr);
          u.plan = "starter";
          u.stripeSubscriptionId = null;
          await kv.set(`user:${userId}`, JSON.stringify(u));
        }
        await kv.set(`subscription:${userId}`, JSON.stringify({
          subscriptionId: sub.id, customerId, plan: "starter",
          status: "cancelled", cancelAtPeriodEnd: false, updatedAt: now,
        }));
        console.log(`[Webhook] ✅ Subscription cancelled: user=${userId} → reverted to starter`);
      }
    }

    // ── invoice.payment_failed ─────────────────────────────────────────────────
    if (event.type === "invoice.payment_failed") {
      const invoice    = event.data.object;
      const customerId = invoice.customer;
      const custStr    = await kv.get(`stripe_customer:${customerId}`);
      if (custStr) {
        const { userId } = JSON.parse(custStr);
        const userStr = await kv.get(`user:${userId}`);
        if (userStr) {
          const u = JSON.parse(userStr);
          console.log(`[Webhook] ⚠️  Payment failed for user=${userId} email=${u.email}`);
          // Future: send payment failure email notification
        }
      }
    }

    // ── invoice.paid (subscription renewal credit grant) ──────────────────────
    if (event.type === "invoice.paid") {
      const invoice = event.data.object;
      if (invoice.billing_reason === "subscription_cycle") {
        const customerId = invoice.customer;
        const custStr    = await kv.get(`stripe_customer:${customerId}`);
        if (custStr) {
          const { userId } = JSON.parse(custStr);
          const subStr = await kv.get(`subscription:${userId}`);
          if (subStr) {
            const sub = JSON.parse(subStr);
            // Grant monthly promo credits on renewal
            const monthlyCredits: Record<string, number> = { growth: 40, pro: 120, starter: 10 };
            const grant = monthlyCredits[sub.plan] || 0;
            if (grant > 0) {
              const credStr  = await kv.get(`credits:${userId}`);
              const current  = parseInt(credStr || "0");
              const newBal   = current + grant;
              await kv.set(`credits:${userId}`, String(newBal));
              const userStr  = await kv.get(`user:${userId}`);
              if (userStr) {
                const u = JSON.parse(userStr);
                u.credits = newBal;
                await kv.set(`user:${userId}`, JSON.stringify(u));
              }
              const txn = { id: generateId(), amount: grant, type: "bonus", description: `Monthly ${sub.plan} plan credits`, createdAt: now };
              const txnStr = await kv.get(`credit_txns:${userId}`);
              const txns   = txnStr ? JSON.parse(txnStr) : [];
              txns.unshift(txn);
              await kv.set(`credit_txns:${userId}`, JSON.stringify(txns));
              console.log(`[Webhook] ✅ Monthly ${grant} credits granted to user=${userId} (${sub.plan} renewal)`);
            }
          }
        }
      }
    }

    return c.json({ received: true });
  } catch (err) {
    console.log("Stripe webhook error:", err);
    return c.json({ error: `Webhook error: ${err}` }, 500);
  }
});

// Fallback: direct credit purchase (no Stripe — for testing / dev)
app.post(`${PREFIX}/credits/purchase`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const { amount, packageName } = await c.req.json();
    if (!amount || amount <= 0) return c.json({ error: "Invalid amount" }, 400);
    const now = new Date().toISOString();
    const creditsStr = await kv.get(`credits:${userId}`);
    const current = parseInt(creditsStr || "0");
    const newBalance = current + amount;
    await kv.set(`credits:${userId}`, String(newBalance));
    const userStr = await kv.get(`user:${userId}`);
    if (userStr) { const u = JSON.parse(userStr); u.credits = newBalance; await kv.set(`user:${userId}`, JSON.stringify(u)); }
    const txn = { id: generateId(), amount, type: "purchase", description: packageName ? `Purchased: ${packageName}` : `Purchased ${amount} credits`, createdAt: now };
    const txnStr = await kv.get(`credit_txns:${userId}`);
    const txns = txnStr ? JSON.parse(txnStr) : [];
    txns.unshift(txn);
    await kv.set(`credit_txns:${userId}`, JSON.stringify(txns));
    return c.json({ balance: newBalance, transaction: txn });
  } catch (err) {
    return c.json({ error: `Credits purchase error: ${err}` }, 500);
  }
});

// ===================== TICKETS / MESSAGES =====================

app.get(`${PREFIX}/tickets`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const idsStr = await kv.get(`tickets:${userId}`);
    const ids = idsStr ? JSON.parse(idsStr) : [];
    const tickets = (await Promise.all(ids.map(async (id: string) => { const s = await kv.get(`ticket:${id}`); return s ? JSON.parse(s) : null; }))).filter(Boolean);
    return c.json({ tickets });
  } catch (err) {
    return c.json({ error: `Tickets fetch error: ${err}` }, 500);
  }
});

app.post(`${PREFIX}/tickets`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const body = await c.req.json();
    const id = generateId();
    const now = new Date().toISOString();
    const ticket = {
      id, userId, subject: body.subject || "Support Request", type: body.type || "support",
      status: "open", priority: body.priority || "medium", category: body.category || "general",
      messageCount: 0, lastMessageAt: now, createdAt: now,
    };
    await kv.set(`ticket:${id}`, JSON.stringify(ticket));
    const idsStr = await kv.get(`tickets:${userId}`);
    const ids = idsStr ? JSON.parse(idsStr) : [];
    ids.unshift(id);
    await kv.set(`tickets:${userId}`, JSON.stringify(ids));

    const userStr = await kv.get(`user:${userId}`);
    const user = userStr ? JSON.parse(userStr) : { name: "User", email: "" };
    const msgs = [];
    if (body.message) {
      msgs.push({ id: generateId(), ticketId: id, userId, senderName: user.name, senderRole: "user", content: body.message, createdAt: now });
    }
    const ticketRef = id.slice(0,8).toUpperCase();
    msgs.push({
      id: generateId(), ticketId: id, userId: "mixxea_support", senderName: "MIXXEA Support", senderRole: "admin",
      content: `Hi ${user.name}! 👋 Thanks for reaching out. We've received your ticket about **"${body.subject}"** and our team will respond within 24 hours. Your ticket reference is **#${ticketRef}**. In the meantime, check our Help Center for quick answers!`,
      createdAt: new Date(Date.now() + 1500).toISOString(),
    });
    ticket.messageCount = msgs.length;
    await kv.set(`ticket:${id}`, JSON.stringify(ticket));
    await kv.set(`messages:${id}`, JSON.stringify(msgs));

    // Send ticket confirmation email
    sendEmail(
      user.email,
      `🎫 Ticket #${ticketRef} received — we'll respond within 24h`,
      ticketCreatedEmail(user.name, ticketRef, body.subject, body.category || "General")
    ).catch(console.error);

    return c.json({ ticket });
  } catch (err) {
    return c.json({ error: `Ticket create error: ${err}` }, 500);
  }
});

app.get(`${PREFIX}/tickets/:ticketId/messages`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const tId = c.req.param("ticketId");
    const s = await kv.get(`messages:${tId}`);
    return c.json({ messages: s ? JSON.parse(s) : [] });
  } catch (err) {
    return c.json({ error: `Messages fetch error: ${err}` }, 500);
  }
});

app.post(`${PREFIX}/tickets/:ticketId/messages`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const tId = c.req.param("ticketId");
    const body = await c.req.json();
    const now = new Date().toISOString();
    const userStr = await kv.get(`user:${userId}`);
    const user = userStr ? JSON.parse(userStr) : { name: "User" };
    const msg = { id: generateId(), ticketId: tId, userId, senderName: user.name, senderRole: "user", content: body.content, createdAt: now };
    const s = await kv.get(`messages:${tId}`);
    const msgs = s ? JSON.parse(s) : [];
    msgs.push(msg);
    await kv.set(`messages:${tId}`, JSON.stringify(msgs));
    const ticketStr = await kv.get(`ticket:${tId}`);
    if (ticketStr) {
      const t = JSON.parse(ticketStr);
      t.messageCount = msgs.length; t.lastMessageAt = now;
      await kv.set(`ticket:${tId}`, JSON.stringify(t));
    }
    return c.json({ message: msg });
  } catch (err) {
    return c.json({ error: `Message send error: ${err}` }, 500);
  }
});

// ===================== ANALYTICS =====================

app.get(`${PREFIX}/analytics`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const s = await kv.get(`analytics:${userId}`);
    if (s) return c.json(JSON.parse(s));
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const cur = new Date().getMonth();
    const streamData = months.slice(0, cur+1).map(month => ({ month, streams: Math.floor(Math.random()*50000)+8000, downloads: Math.floor(Math.random()*5000)+800, saves: Math.floor(Math.random()*12000)+2000 }));
    const revenueData = streamData.map(d => ({ month: d.month, streaming: parseFloat((d.streams*0.0038).toFixed(2)), downloads: parseFloat((d.downloads*0.72).toFixed(2)), publishing: parseFloat((d.streams*0.0009).toFixed(2)) }));
    const platformData = [
      { platform: "Spotify", streams: 95000, color: "#1DB954" }, { platform: "Apple Music", streams: 38000, color: "#FA586A" },
      { platform: "YouTube Music", streams: 22000, color: "#FF0000" }, { platform: "Amazon Music", streams: 12000, color: "#FF9900" },
      { platform: "TIDAL", streams: 8000, color: "#00FFFF" }, { platform: "Deezer", streams: 5000, color: "#A238FF" },
    ];
    const geoData = [
      { country: "United States", percentage: 32 }, { country: "United Kingdom", percentage: 16 },
      { country: "Nigeria", percentage: 13 }, { country: "Canada", percentage: 9 },
      { country: "Germany", percentage: 7 }, { country: "France", percentage: 6 }, { country: "Other", percentage: 17 },
    ];
    const totalStreams = streamData.reduce((s,d)=>s+d.streams,0);
    const totalRevenue = revenueData.reduce((s,d)=>s+d.streaming+d.downloads+d.publishing,0);
    const analytics = {
      overview: { totalStreams, totalRevenue: parseFloat(totalRevenue.toFixed(2)), totalSaves: streamData.reduce((s,d)=>s+d.saves,0), totalDownloads: streamData.reduce((s,d)=>s+d.downloads,0), monthlyListeners: 14200, followerCount: 3800 },
      streamData, revenueData, platformData, geoData,
      lastSynced: new Date().toISOString(), source: "generated",
    };
    await kv.set(`analytics:${userId}`, JSON.stringify(analytics));
    return c.json(analytics);
  } catch (err) {
    return c.json({ error: `Analytics fetch error: ${err}` }, 500);
  }
});

// Analytics refresh (simulate DSP sync)
app.post(`${PREFIX}/analytics/refresh`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const s = await kv.get(`analytics:${userId}`);
    const existing = s ? JSON.parse(s) : {};

    // Simulate fresh data with random growth
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const cur = new Date().getMonth();
    const growth = 1 + (Math.random() * 0.15); // up to 15% growth
    const streamData = months.slice(0, cur+1).map((month, i) => ({
      month,
      streams: Math.floor((existing.streamData?.[i]?.streams || 20000) * (i === cur ? growth : 1) + Math.floor(Math.random() * 2000)),
      downloads: Math.floor((existing.streamData?.[i]?.downloads || 2000) * (i === cur ? growth : 1) + Math.floor(Math.random() * 200)),
      saves: Math.floor((existing.streamData?.[i]?.saves || 5000) * (i === cur ? growth : 1) + Math.floor(Math.random() * 500)),
    }));
    const revenueData = streamData.map(d => ({
      month: d.month,
      streaming: parseFloat((d.streams * 0.0038).toFixed(2)),
      downloads: parseFloat((d.downloads * 0.72).toFixed(2)),
      publishing: parseFloat((d.streams * 0.0009).toFixed(2)),
    }));
    const platformBase = existing.platformData || [];
    const platformData = platformBase.length > 0 ? platformBase.map((p: any) => ({
      ...p, streams: Math.floor(p.streams * (1 + Math.random() * 0.05)),
    })) : [
      { platform: "Spotify", streams: 95000, color: "#1DB954" },
      { platform: "Apple Music", streams: 38000, color: "#FA586A" },
      { platform: "YouTube Music", streams: 22000, color: "#FF0000" },
      { platform: "Amazon Music", streams: 12000, color: "#FF9900" },
      { platform: "TIDAL", streams: 8000, color: "#00FFFF" },
      { platform: "Deezer", streams: 5000, color: "#A238FF" },
    ];
    const totalStreams = streamData.reduce((s,d)=>s+d.streams,0);
    const totalRevenue = revenueData.reduce((s,d)=>s+d.streaming+d.downloads+d.publishing,0);
    const now = new Date().toISOString();
    const analytics = {
      ...existing,
      overview: {
        totalStreams, totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalSaves: streamData.reduce((s,d)=>s+d.saves,0),
        totalDownloads: streamData.reduce((s,d)=>s+d.downloads,0),
        monthlyListeners: Math.floor((existing.overview?.monthlyListeners || 14000) * growth),
        followerCount: Math.floor((existing.overview?.followerCount || 3800) + Math.random() * 50),
      },
      streamData, revenueData, platformData,
      lastSynced: now, source: "synced",
    };
    await kv.set(`analytics:${userId}`, JSON.stringify(analytics));
    return c.json(analytics);
  } catch (err) {
    return c.json({ error: `Analytics refresh error: ${err}` }, 500);
  }
});

// DSP Webhook endpoint (for real DSP data ingestion)
app.post(`${PREFIX}/webhooks/dsp`, async (c) => {
  try {
    // Validate DSP secret
    const dspSecret = c.req.header("x-dsp-secret");
    const expectedSecret = Deno.env.get("DSP_WEBHOOK_SECRET") || "mixxea_dsp_webhook_2024";
    if (dspSecret !== expectedSecret) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json();
    const { userId, platform, streams, downloads, saves, month } = body;
    if (!userId || !platform) return c.json({ error: "userId and platform required" }, 400);

    const s = await kv.get(`analytics:${userId}`);
    if (!s) return c.json({ error: "Analytics not found for user" }, 404);
    const analytics = JSON.parse(s);

    // Update platform data
    const platformIdx = analytics.platformData.findIndex((p: any) => p.platform.toLowerCase() === platform.toLowerCase());
    if (platformIdx >= 0) {
      analytics.platformData[platformIdx].streams = streams || analytics.platformData[platformIdx].streams;
    }

    // Update month data if provided
    if (month) {
      const monthIdx = analytics.streamData.findIndex((d: any) => d.month === month);
      if (monthIdx >= 0) {
        analytics.streamData[monthIdx].streams = streams || analytics.streamData[monthIdx].streams;
        analytics.streamData[monthIdx].downloads = downloads || analytics.streamData[monthIdx].downloads;
        analytics.streamData[monthIdx].saves = saves || analytics.streamData[monthIdx].saves;
      }
    }

    analytics.lastSynced = new Date().toISOString();
    analytics.source = `webhook:${platform}`;
    await kv.set(`analytics:${userId}`, JSON.stringify(analytics));
    return c.json({ success: true, message: `Analytics updated from ${platform} webhook` });
  } catch (err) {
    return c.json({ error: `DSP webhook error: ${err}` }, 500);
  }
});

// ===================== PLAYLIST CURATOR MARKETPLACE =====================

// GET pitches (artist view — their own pitches)
app.get(`${PREFIX}/pitches`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const idsStr = await kv.get(`pitches:${userId}`);
    const ids = idsStr ? JSON.parse(idsStr) : [];
    const pitches = (await Promise.all(ids.map(async (id: string) => { const s = await kv.get(`pitch:${id}`); return s ? JSON.parse(s) : null; }))).filter(Boolean);
    return c.json({ pitches });
  } catch (err) {
    return c.json({ error: `Pitches fetch error: ${err}` }, 500);
  }
});

// GET pitches received (curator view)
app.get(`${PREFIX}/pitches/received`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const idsStr = await kv.get(`curator_pitches:${userId}`);
    const ids = idsStr ? JSON.parse(idsStr) : [];
    const pitches = (await Promise.all(ids.map(async (id: string) => { const s = await kv.get(`pitch:${id}`); return s ? JSON.parse(s) : null; }))).filter(Boolean);
    // Enrich with artist info
    const enriched = await Promise.all(pitches.map(async (p: any) => {
      const artistStr = await kv.get(`user:${p.artistId}`);
      const artist = artistStr ? JSON.parse(artistStr) : { name: "Unknown Artist" };
      return { ...p, artistName: artist.name, artistRole: artist.role };
    }));
    return c.json({ pitches: enriched });
  } catch (err) {
    return c.json({ error: `Received pitches fetch error: ${err}` }, 500);
  }
});

// GET all curators / playlists (public marketplace listings)
app.get(`${PREFIX}/marketplace/curators`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    // Get all curator users
    const allUsers = (await kv.getByPrefix("user:")).map((s: string) => {
      try { return JSON.parse(s); } catch { return null; }
    }).filter(Boolean).filter((u: any) => u.role === "curator");

    // Get each curator's playlists
    const curators = await Promise.all(allUsers.slice(0, 20).map(async (curator: any) => {
      const playlistsStr = await kv.get(`playlists:${curator.id}`);
      const playlists = playlistsStr ? JSON.parse(playlistsStr) : generateDefaultPlaylists(curator.name, curator.id);
      return { id: curator.id, name: curator.name, genre: curator.genre || "Various", playlists };
    }));

    // Add default/demo curators so marketplace isn't empty
    const demoCurators = getDemoCurators();
    return c.json({ curators: [...curators, ...demoCurators] });
  } catch (err) {
    return c.json({ error: `Marketplace fetch error: ${err}` }, 500);
  }
});

function generateDefaultPlaylists(curatorName: string, curatorId: string) {
  return [
    { id: `pl_${curatorId}_1`, name: "Fresh Finds", followers: Math.floor(Math.random()*50000)+5000, genre: "Various", creditCost: 30, accepts: "All genres" },
  ];
}

function getDemoCurators() {
  return [
    { id: "demo_curator_1", name: "Playlist Pro", genre: "Hip-Hop / R&B", playlists: [
      { id: "pl_demo_1", name: "New Wave Hip-Hop", followers: 142000, genre: "Hip-Hop", creditCost: 30, accepts: "Hip-hop, Trap, R&B" },
      { id: "pl_demo_2", name: "R&B Vibes 2025", followers: 87000, genre: "R&B", creditCost: 30, accepts: "R&B, Soul, Neo-soul" },
    ]},
    { id: "demo_curator_2", name: "Spotify Gems", genre: "Pop / Electronic", playlists: [
      { id: "pl_demo_3", name: "Electro Pop Hits", followers: 215000, genre: "Electronic", creditCost: 50, accepts: "Pop, Electronic, Dance" },
      { id: "pl_demo_4", name: "Indie Discovery", followers: 68000, genre: "Indie", creditCost: 30, accepts: "Indie, Alternative, Folk" },
    ]},
    { id: "demo_curator_3", name: "Afrobeats Central", genre: "Afrobeats / Dancehall", playlists: [
      { id: "pl_demo_5", name: "Afrobeats Heat 🔥", followers: 312000, genre: "Afrobeats", creditCost: 50, accepts: "Afrobeats, Afropop, Amapiano" },
      { id: "pl_demo_6", name: "Lagos to London", followers: 156000, genre: "Afrobeats", creditCost: 50, accepts: "Afrobeats, UK Afro, Afrosoul" },
    ]},
    { id: "demo_curator_4", name: "Chill Network", genre: "Lo-Fi / Chill", playlists: [
      { id: "pl_demo_7", name: "Study & Focus 📚", followers: 489000, genre: "Lo-Fi", creditCost: 30, accepts: "Lo-fi, Instrumental, Ambient" },
      { id: "pl_demo_8", name: "Late Night Feels", followers: 203000, genre: "Chill", creditCost: 30, accepts: "R&B, Lo-fi, Chill-hop" },
    ]},
    { id: "demo_curator_5", name: "Global Sounds", genre: "World / Reggaeton", playlists: [
      { id: "pl_demo_9", name: "Reggaeton Fire 🎵", followers: 275000, genre: "Reggaeton", creditCost: 50, accepts: "Reggaeton, Latin, Dembow" },
      { id: "pl_demo_10", name: "World Music Now", followers: 94000, genre: "World", creditCost: 30, accepts: "All international genres" },
    ]},
  ];
}

// POST submit a pitch
app.post(`${PREFIX}/pitches`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const body = await c.req.json();
    const { playlistId, curatorId, trackTitle, message, creditCost } = body;

    const cost = creditCost || 30;
    const creditsStr = await kv.get(`credits:${userId}`);
    const credits = parseInt(creditsStr || "0");
    if (credits < cost) return c.json({ error: "Insufficient credits" }, 400);

    const id = generateId();
    const now = new Date().toISOString();
    const newCredits = credits - cost;
    await kv.set(`credits:${userId}`, String(newCredits));

    const userStr = await kv.get(`user:${userId}`);
    if (userStr) { const u = JSON.parse(userStr); u.credits = newCredits; await kv.set(`user:${userId}`, JSON.stringify(u)); }

    const txnStr = await kv.get(`credit_txns:${userId}`);
    const txns = txnStr ? JSON.parse(txnStr) : [];
    txns.unshift({ id: generateId(), amount: -cost, type: "use", description: `Playlist pitch: ${trackTitle}`, createdAt: now });
    await kv.set(`credit_txns:${userId}`, JSON.stringify(txns));

    const pitch = {
      id, artistId: userId, curatorId, playlistId,
      trackTitle: trackTitle || "Untitled", message: message || "",
      playlistName: body.playlistName || "Unknown Playlist",
      curatorName: body.curatorName || "Curator",
      status: "pending", creditCost: cost,
      createdAt: now, updatedAt: now,
    };
    await kv.set(`pitch:${id}`, JSON.stringify(pitch));

    const idsStr = await kv.get(`pitches:${userId}`);
    const ids = idsStr ? JSON.parse(idsStr) : [];
    ids.unshift(id);
    await kv.set(`pitches:${userId}`, JSON.stringify(ids));

    // Add to curator's received pitches
    if (!curatorId.startsWith("demo_")) {
      const cPitchStr = await kv.get(`curator_pitches:${curatorId}`);
      const cPitches = cPitchStr ? JSON.parse(cPitchStr) : [];
      cPitches.unshift(id);
      await kv.set(`curator_pitches:${curatorId}`, JSON.stringify(cPitches));
    }

    return c.json({ pitch, newCreditBalance: newCredits });
  } catch (err) {
    return c.json({ error: `Pitch create error: ${err}` }, 500);
  }
});

// PUT update pitch status (curator)
app.put(`${PREFIX}/pitches/:pitchId`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const pId = c.req.param("pitchId");
    const s = await kv.get(`pitch:${pId}`);
    if (!s) return c.json({ error: "Pitch not found" }, 404);
    const pitch = JSON.parse(s);
    const body = await c.req.json();
    const updated = { ...pitch, ...body, id: pId, updatedAt: new Date().toISOString() };
    await kv.set(`pitch:${pId}`, JSON.stringify(updated));

    // Notify artist via email
    if (body.status && body.status !== pitch.status) {
      const artistStr = await kv.get(`user:${pitch.artistId}`);
      if (artistStr) {
        const artist = JSON.parse(artistStr);
        sendEmail(
          artist.email,
          `🎸 Pitch update: "${pitch.trackTitle}" → ${pitch.playlistName}`,
          pitchStatusEmail(artist.name, pitch.trackTitle, pitch.playlistName, pitch.curatorName, body.status, body.message)
        ).catch(console.error);
      }
    }

    return c.json({ pitch: updated });
  } catch (err) {
    return c.json({ error: `Pitch update error: ${err}` }, 500);
  }
});

// ===================== LABEL TEAM MANAGEMENT =====================

// GET team members (for label)
app.get(`${PREFIX}/team`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const userStr = await kv.get(`user:${userId}`);
    if (!userStr) return c.json({ error: "User not found" }, 404);
    const user = JSON.parse(userStr);
    if (user.role !== "label") return c.json({ error: "Only label accounts can manage teams" }, 403);

    const teamStr = await kv.get(`team:${userId}`);
    const team = teamStr ? JSON.parse(teamStr) : [];

    // Enrich with live user data
    const enriched = await Promise.all(team.map(async (member: any) => {
      const mStr = await kv.get(`user:${member.userId}`);
      if (!mStr) return null;
      const m = JSON.parse(mStr);
      const relIdsStr = await kv.get(`releases:${member.userId}`);
      const relIds = relIdsStr ? JSON.parse(relIdsStr) : [];
      const campIdsStr = await kv.get(`campaigns:${member.userId}`);
      const campIds = campIdsStr ? JSON.parse(campIdsStr) : [];
      return { ...member, name: m.name, email: m.email, role: m.role, plan: m.plan, credits: m.credits, releaseCount: relIds.length, campaignCount: campIds.length };
    }));

    return c.json({ team: enriched.filter(Boolean) });
  } catch (err) {
    return c.json({ error: `Team fetch error: ${err}` }, 500);
  }
});

// POST invite artist to team
app.post(`${PREFIX}/team/invite`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const userStr = await kv.get(`user:${userId}`);
    if (!userStr) return c.json({ error: "User not found" }, 404);
    const user = JSON.parse(userStr);
    if (user.role !== "label") return c.json({ error: "Only label accounts can invite artists" }, 403);

    const { email, artistName } = await c.req.json();
    if (!email) return c.json({ error: "Email required" }, 400);

    // Generate invite code
    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    const now = new Date().toISOString();
    const invite = { labelUserId: userId, labelName: user.name, email, inviteCode, createdAt: now };
    await kv.set(`team_invite:${inviteCode}`, JSON.stringify(invite));

    // Send invite email
    sendEmail(
      email,
      `🤝 ${user.name} invited you to join their MIXXEA label team`,
      teamInviteEmail(artistName || "", user.name, inviteCode)
    ).catch(console.error);

    return c.json({ success: true, inviteCode, message: `Invitation sent to ${email}` });
  } catch (err) {
    return c.json({ error: `Team invite error: ${err}` }, 500);
  }
});

// DELETE remove team member
app.delete(`${PREFIX}/team/:memberId`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const userStr = await kv.get(`user:${userId}`);
    if (!userStr) return c.json({ error: "User not found" }, 404);
    const user = JSON.parse(userStr);
    if (user.role !== "label") return c.json({ error: "Only label accounts can manage teams" }, 403);

    const memberId = c.req.param("memberId");
    const teamStr = await kv.get(`team:${userId}`);
    const team = teamStr ? JSON.parse(teamStr) : [];
    const updated = team.filter((m: any) => m.userId !== memberId);
    await kv.set(`team:${userId}`, JSON.stringify(updated));
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: `Team remove error: ${err}` }, 500);
  }
});

// ===================== ADMIN =====================

const ADMIN_SECRET = Deno.env.get("MIXXEA_ADMIN_SECRET") || "mixxea_admin_2024";

async function verifyAdmin(c: any): Promise<string | null> {
  const userId = await verifyToken(c);
  if (!userId) return null;
  const userStr = await kv.get(`user:${userId}`);
  if (!userStr) return null;
  const user = JSON.parse(userStr);
  if (!user.isAdmin) return null;
  return userId;
}

app.post(`${PREFIX}/admin/bootstrap`, async (c) => {
  try {
    const { email, adminSecret } = await c.req.json();
    if (adminSecret !== ADMIN_SECRET) return c.json({ error: "Invalid admin secret" }, 403);
    const userId = await kv.get(`user_email:${email.toLowerCase()}`);
    if (!userId) return c.json({ error: "User not found" }, 404);
    const userStr = await kv.get(`user:${userId}`);
    if (!userStr) return c.json({ error: "User record not found" }, 404);
    const user = JSON.parse(userStr);
    user.isAdmin = true;
    await kv.set(`user:${userId}`, JSON.stringify(user));
    console.log(`Admin promoted: ${email} (${userId})`);
    return c.json({ success: true, message: `${email} is now an admin` });
  } catch (err) {
    console.log("Admin bootstrap error:", err);
    return c.json({ error: `Admin bootstrap error: ${err}` }, 500);
  }
});

app.get(`${PREFIX}/admin/stats`, async (c) => {
  try {
    const adminId = await verifyAdmin(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const allUsers = (await kv.getByPrefix("user:")).map((s: string) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
    const allTickets = (await kv.getByPrefix("ticket:")).map((s: string) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
    const allCampaigns = (await kv.getByPrefix("campaign:")).map((s: string) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
    const allPitches = (await kv.getByPrefix("pitch:")).map((s: string) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
    const openTickets = allTickets.filter((t: any) => t.status === "open").length;
    const inProgressTickets = allTickets.filter((t: any) => t.status === "in_progress").length;
    const activeCampaigns = allCampaigns.filter((c: any) => c.status === "active").length;
    const pendingCampaigns = allCampaigns.filter((c: any) => c.status === "pending_review" || c.status === "needs_info").length;
    const totalCreditsInSystem = allUsers.reduce((s: number, u: any) => s + (u.credits || 0), 0);
    return c.json({
      totalUsers: allUsers.length, totalTickets: allTickets.length,
      openTickets, inProgressTickets, totalCampaigns: allCampaigns.length,
      activeCampaigns, pendingCampaigns, totalCreditsInSystem, totalPitches: allPitches.length,
      pendingPitches: allPitches.filter((p: any) => p.status === "pending").length,
      recentUsers: allUsers.sort((a: any, b: any) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()).slice(0, 5),
      recentTickets: allTickets.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
    });
  } catch (err) {
    console.log("Admin stats error:", err);
    return c.json({ error: `Admin stats error: ${err}` }, 500);
  }
});

app.get(`${PREFIX}/admin/tickets`, async (c) => {
  try {
    const adminId = await verifyAdmin(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const allTickets = (await kv.getByPrefix("ticket:")).map((s: string) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
    const enriched = await Promise.all(allTickets.map(async (t: any) => {
      const userStr = await kv.get(`user:${t.userId}`);
      const user = userStr ? JSON.parse(userStr) : { name: "Unknown", email: "" };
      return { ...t, userName: user.name, userEmail: user.email, userRole: user.role };
    }));
    return c.json({ tickets: enriched.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) });
  } catch (err) {
    return c.json({ error: `Admin tickets error: ${err}` }, 500);
  }
});

app.put(`${PREFIX}/admin/tickets/:ticketId`, async (c) => {
  try {
    const adminId = await verifyAdmin(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const tId = c.req.param("ticketId");
    const s = await kv.get(`ticket:${tId}`);
    if (!s) return c.json({ error: "Ticket not found" }, 404);
    const ticket = JSON.parse(s);
    const updates = await c.req.json();
    const updated = { ...ticket, ...updates, id: tId, updatedAt: new Date().toISOString() };
    await kv.set(`ticket:${tId}`, JSON.stringify(updated));
    return c.json({ ticket: updated });
  } catch (err) {
    return c.json({ error: `Admin ticket update error: ${err}` }, 500);
  }
});

app.post(`${PREFIX}/admin/tickets/:ticketId/reply`, async (c) => {
  try {
    const adminId = await verifyAdmin(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const tId = c.req.param("ticketId");
    const body = await c.req.json();
    const now = new Date().toISOString();
    const adminUserStr = await kv.get(`user:${adminId}`);
    const adminUser = adminUserStr ? JSON.parse(adminUserStr) : { name: "MIXXEA Support" };
    const msg = { id: generateId(), ticketId: tId, userId: adminId, senderName: adminUser.name || "MIXXEA Support", senderRole: "admin", content: body.content, createdAt: now };
    const s = await kv.get(`messages:${tId}`);
    const msgs = s ? JSON.parse(s) : [];
    msgs.push(msg);
    await kv.set(`messages:${tId}`, JSON.stringify(msgs));
    const ticketStr = await kv.get(`ticket:${tId}`);
    if (ticketStr) {
      const t = JSON.parse(ticketStr);
      t.messageCount = msgs.length; t.lastMessageAt = now;
      if (t.status === "open") t.status = "in_progress";
      await kv.set(`ticket:${tId}`, JSON.stringify(t));
      // Email the user about admin reply
      const userStr = await kv.get(`user:${t.userId}`);
      if (userStr) {
        const user = JSON.parse(userStr);
        sendEmail(
          user.email,
          `💬 New reply on your MIXXEA ticket #${tId.slice(0,8).toUpperCase()}`,
          ticketReplyEmail(user.name, t.subject, tId.slice(0,8).toUpperCase(), body.content, adminUser.name || "MIXXEA Support")
        ).catch(console.error);
      }
    }
    return c.json({ message: msg });
  } catch (err) {
    return c.json({ error: `Admin reply error: ${err}` }, 500);
  }
});

app.get(`${PREFIX}/admin/campaigns`, async (c) => {
  try {
    const adminId = await verifyAdmin(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const allCampaigns = (await kv.getByPrefix("campaign:")).map((s: string) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
    const enriched = await Promise.all(allCampaigns.map(async (camp: any) => {
      const userStr = await kv.get(`user:${camp.userId}`);
      const user = userStr ? JSON.parse(userStr) : { name: "Unknown", email: "" };
      return { ...camp, userName: user.name, userEmail: user.email, userRole: user.role };
    }));
    // Sort: pending_review first, then needs_info, then active, then rest by date
    const priority: Record<string, number> = { pending_review: 0, needs_info: 1, active: 2, paused: 3, completed: 4, rejected: 5 };
    return c.json({ campaigns: enriched.sort((a: any, b: any) => {
      const pa = priority[a.status] ?? 9, pb = priority[b.status] ?? 9;
      if (pa !== pb) return pa - pb;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }) });
  } catch (err) {
    return c.json({ error: `Admin campaigns error: ${err}` }, 500);
  }
});

// POST /admin/campaigns/:id/approve — approve and activate campaign
app.post(`${PREFIX}/admin/campaigns/:campaignId/approve`, async (c) => {
  try {
    const adminId = await verifyAdmin(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const cId = c.req.param("campaignId");
    const s = await kv.get(`campaign:${cId}`);
    if (!s) return c.json({ error: "Campaign not found" }, 404);
    const campaign = JSON.parse(s);
    const body = await c.req.json().catch(() => ({}));
    const now = new Date().toISOString();

    // Convert "hold" txn to "use"
    const txnStr = await kv.get(`credit_txns:${campaign.userId}`);
    const txns = txnStr ? JSON.parse(txnStr) : [];
    const holdIdx = txns.findIndex((t: any) => t.type === "hold" && t.description.includes(campaign.name));
    if (holdIdx >= 0) { txns[holdIdx].type = "use"; txns[holdIdx].description = `Campaign approved & live: ${campaign.name}`; }
    await kv.set(`credit_txns:${campaign.userId}`, JSON.stringify(txns));

    const updated = { ...campaign, status: "active", creditsUsed: campaign.creditCost, adminNotes: body.adminNotes || campaign.adminNotes || "", approvedAt: now, updatedAt: now };
    await kv.set(`campaign:${cId}`, JSON.stringify(updated));

    const userStr = await kv.get(`user:${campaign.userId}`);
    if (userStr) {
      const user = JSON.parse(userStr);
      sendEmail(
        user.email,
        `✅ Campaign approved: "${campaign.name}" is now live!`,
        `<div style="font-family:sans-serif;background:#0a0a0a;color:#fff;padding:32px;border-radius:12px;max-width:600px">
          <h2 style="color:#10B981;margin-top:0">🚀 Campaign Approved & Live!</h2>
          <p>Hi ${user.name},</p>
          <p>Great news! Your campaign <strong>"${campaign.name}"</strong> has been reviewed and approved by our team.</p>
          ${body.adminNotes ? `<p style="padding:12px;background:#1a1a1a;border-left:3px solid #10B981;border-radius:6px">Team note: ${body.adminNotes}</p>` : ""}
          <p>Log in to your MIXXEA dashboard to track live results.</p>
          <p style="color:#666;font-size:13px">— The MIXXEA Team</p>
        </div>`
      ).catch(console.error);
    }

    return c.json({ campaign: updated });
  } catch (err) {
    console.log("Admin approve campaign error:", err);
    return c.json({ error: `Approve campaign error: ${err}` }, 500);
  }
});

// POST /admin/campaigns/:id/reject — reject and refund credits
app.post(`${PREFIX}/admin/campaigns/:campaignId/reject`, async (c) => {
  try {
    const adminId = await verifyAdmin(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const cId = c.req.param("campaignId");
    const s = await kv.get(`campaign:${cId}`);
    if (!s) return c.json({ error: "Campaign not found" }, 404);
    const campaign = JSON.parse(s);
    const { reason, adminNotes } = await c.req.json();
    if (!reason) return c.json({ error: "Rejection reason required" }, 400);
    const now = new Date().toISOString();

    // Auto-refund credits
    const creditsStr = await kv.get(`credits:${campaign.userId}`);
    const current = parseInt(creditsStr || "0");
    const refunded = current + (campaign.creditCost || 0);
    await kv.set(`credits:${campaign.userId}`, String(refunded));

    const userStr = await kv.get(`user:${campaign.userId}`);
    if (userStr) { const u = JSON.parse(userStr); u.credits = refunded; await kv.set(`user:${campaign.userId}`, JSON.stringify(u)); }

    // Remove hold txn and add refund txn
    const txnStr = await kv.get(`credit_txns:${campaign.userId}`);
    const txns = txnStr ? JSON.parse(txnStr) : [];
    const filtered = txns.filter((t: any) => !(t.type === "hold" && t.description.includes(campaign.name)));
    filtered.unshift({ id: generateId(), amount: campaign.creditCost || 0, type: "refund", description: `Credits refunded — campaign not approved: ${campaign.name}`, createdAt: now });
    await kv.set(`credit_txns:${campaign.userId}`, JSON.stringify(filtered));

    const updated = { ...campaign, status: "rejected", rejectionReason: reason, adminNotes: adminNotes || "", rejectedAt: now, updatedAt: now };
    await kv.set(`campaign:${cId}`, JSON.stringify(updated));

    if (userStr) {
      const user = JSON.parse(userStr);
      sendEmail(
        user.email,
        `❌ Campaign not approved: "${campaign.name}"`,
        `<div style="font-family:sans-serif;background:#0a0a0a;color:#fff;padding:32px;border-radius:12px;max-width:600px">
          <h2 style="color:#FF5252;margin-top:0">Campaign Not Approved</h2>
          <p>Hi ${user.name},</p>
          <p>Your campaign <strong>"${campaign.name}"</strong> was not approved at this time.</p>
          <p style="padding:12px;background:#1a1a1a;border-left:3px solid #FF5252;border-radius:6px"><strong>Reason:</strong> ${reason}</p>
          ${adminNotes ? `<p style="color:#aaa">Additional notes: ${adminNotes}</p>` : ""}
          <p style="color:#10B981"><strong>${campaign.creditCost} credits have been fully refunded</strong> to your account.</p>
          <p>You are welcome to submit a new campaign addressing the feedback above.</p>
          <p style="color:#666;font-size:13px">— The MIXXEA Team</p>
        </div>`
      ).catch(console.error);
    }

    return c.json({ campaign: updated, refundedCredits: campaign.creditCost });
  } catch (err) {
    console.log("Admin reject campaign error:", err);
    return c.json({ error: `Reject campaign error: ${err}` }, 500);
  }
});

// POST /admin/campaigns/:id/request-info — ask user for more information
app.post(`${PREFIX}/admin/campaigns/:campaignId/request-info`, async (c) => {
  try {
    const adminId = await verifyAdmin(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const cId = c.req.param("campaignId");
    const s = await kv.get(`campaign:${cId}`);
    if (!s) return c.json({ error: "Campaign not found" }, 404);
    const campaign = JSON.parse(s);
    const { message } = await c.req.json();
    if (!message) return c.json({ error: "Message required" }, 400);
    const now = new Date().toISOString();

    const updated = { ...campaign, status: "needs_info", adminNotes: message, updatedAt: now };
    await kv.set(`campaign:${cId}`, JSON.stringify(updated));

    const userStr = await kv.get(`user:${campaign.userId}`);
    if (userStr) {
      const user = JSON.parse(userStr);
      sendEmail(
        user.email,
        `💬 Action needed for your campaign: "${campaign.name}"`,
        `<div style="font-family:sans-serif;background:#0a0a0a;color:#fff;padding:32px;border-radius:12px;max-width:600px">
          <h2 style="color:#F59E0B;margin-top:0">Additional Info Required</h2>
          <p>Hi ${user.name},</p>
          <p>Our team needs more information before approving your campaign <strong>"${campaign.name}"</strong>.</p>
          <p style="padding:12px;background:#1a1a1a;border-left:3px solid #F59E0B;border-radius:6px"><strong>What we need:</strong> ${message}</p>
          <p>Please open a support ticket or reply with the details — your credits remain safely held.</p>
          <p style="color:#666;font-size:13px">— The MIXXEA Team</p>
        </div>`
      ).catch(console.error);
    }

    return c.json({ campaign: updated });
  } catch (err) {
    console.log("Admin request info error:", err);
    return c.json({ error: `Request info error: ${err}` }, 500);
  }
});

app.put(`${PREFIX}/admin/campaigns/:campaignId`, async (c) => {
  try {
    const adminId = await verifyAdmin(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const cId = c.req.param("campaignId");
    const s = await kv.get(`campaign:${cId}`);
    if (!s) return c.json({ error: "Campaign not found" }, 404);
    const campaign = JSON.parse(s);
    const updates = await c.req.json();
    const updated = { ...campaign, ...updates, id: cId, updatedAt: new Date().toISOString() };
    await kv.set(`campaign:${cId}`, JSON.stringify(updated));
    return c.json({ campaign: updated });
  } catch (err) {
    return c.json({ error: `Admin campaign update error: ${err}` }, 500);
  }
});

app.get(`${PREFIX}/admin/users`, async (c) => {
  try {
    const adminId = await verifyAdmin(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const allUsers = (await kv.getByPrefix("user:")).map((s: string) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
    const withCredits = await Promise.all(allUsers.map(async (u: any) => {
      const credStr = await kv.get(`credits:${u.id}`);
      const txnStr = await kv.get(`credit_txns:${u.id}`);
      const txns = txnStr ? JSON.parse(txnStr) : [];
      const ticketIdsStr = await kv.get(`tickets:${u.id}`);
      const ticketIds = ticketIdsStr ? JSON.parse(ticketIdsStr) : [];
      const campaignIdsStr = await kv.get(`campaigns:${u.id}`);
      const campaignIds = campaignIdsStr ? JSON.parse(campaignIdsStr) : [];
      return { ...u, credits: parseInt(credStr || "0"), transactionCount: txns.length, ticketCount: ticketIds.length, campaignCount: campaignIds.length };
    }));
    return c.json({ users: withCredits.sort((a: any, b: any) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()) });
  } catch (err) {
    return c.json({ error: `Admin users error: ${err}` }, 500);
  }
});

app.put(`${PREFIX}/admin/users/:userId/credits`, async (c) => {
  try {
    const adminId = await verifyAdmin(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const uId = c.req.param("userId");
    const { amount, reason } = await c.req.json();
    if (amount === undefined) return c.json({ error: "Amount required" }, 400);
    const credStr = await kv.get(`credits:${uId}`);
    const current = parseInt(credStr || "0");
    const newBalance = Math.max(0, current + amount);
    await kv.set(`credits:${uId}`, String(newBalance));
    const userStr = await kv.get(`user:${uId}`);
    if (userStr) {
      const u = JSON.parse(userStr);
      u.credits = newBalance;
      await kv.set(`user:${uId}`, JSON.stringify(u));
    }
    const now = new Date().toISOString();
    const txn = { id: generateId(), amount, type: amount > 0 ? "admin_grant" : "admin_deduct", description: reason || `Admin adjustment: ${amount > 0 ? "+" : ""}${amount} credits`, createdAt: now };
    const txnStr = await kv.get(`credit_txns:${uId}`);
    const txns = txnStr ? JSON.parse(txnStr) : [];
    txns.unshift(txn);
    await kv.set(`credit_txns:${uId}`, JSON.stringify(txns));
    return c.json({ newBalance, transaction: txn });
  } catch (err) {
    return c.json({ error: `Admin credits error: ${err}` }, 500);
  }
});

app.put(`${PREFIX}/admin/users/:userId`, async (c) => {
  try {
    const adminId = await verifyAdmin(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const uId = c.req.param("userId");
    const userStr = await kv.get(`user:${uId}`);
    if (!userStr) return c.json({ error: "User not found" }, 404);
    const user = JSON.parse(userStr);
    const updates = await c.req.json();
    const { id, email, password, ...safeUpdates } = updates;
    const updated = { ...user, ...safeUpdates };
    await kv.set(`user:${uId}`, JSON.stringify(updated));
    return c.json({ user: updated });
  } catch (err) {
    return c.json({ error: `Admin user update error: ${err}` }, 500);
  }
});

Deno.serve(app.fetch);
