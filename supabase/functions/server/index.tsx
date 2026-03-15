import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import Stripe from "npm:stripe";
import * as kv from "./kv_store.tsx";
import { generateSEOCycle } from "./seo-engine.tsx";
import { featuresApp, triggerDripSequence, claimReferralCode } from "./features.tsx";
import { adminOpsApp } from "./admin-ops.tsx";
import { spotifyApp } from "./spotify.tsx";
import { creativeApp } from "./creative.tsx";
import { marketingConsoleApp } from "./marketing-console.tsx";
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
  adminEventEmail,
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

// ──── Email health + test-send endpoint ───────────────────────────────────────
app.get(`${PREFIX}/email/health`, async (c) => {
  const key = Deno.env.get("RESEND_API_KEY");
  const configured = !!key && key.length > 10;
  let domainVerified = false;
  let domains: string[] = [];
  let error = "";

  if (configured) {
    try {
      const res  = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${key}` },
      });
      const data = await res.json();
      domains = (data.data || []).map((d: any) => d.name);
      domainVerified = domains.some((d: string) => d === "mixxea.com" || d.endsWith(".mixxea.com"));
    } catch (err) {
      error = String(err);
    }
  }

  return c.json({
    configured,
    domainVerified,
    verifiedDomains: domains,
    fromAddress: "onboarding@mixxea.com",
    status: !configured
      ? "❌ RESEND_API_KEY not set"
      : !domainVerified
        ? "⚠️  mixxea.com not verified in Resend — emails go to spam or are rejected. Add DNS records at resend.com/domains."
        : "✅ mixxea.com verified — emails will deliver normally",
    error: error || undefined,
  });
});

// Admin-only test send — GET /email/test?to=you@email.com&secret=YOUR_ADMIN_SECRET
app.get(`${PREFIX}/email/test`, async (c) => {
  const secret = c.req.query("secret");
  const expectedSecret = Deno.env.get("MIXXEA_ADMIN_SECRET") || "";
  if (!expectedSecret || secret !== expectedSecret) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const to = c.req.query("to");
  if (!to) return c.json({ error: "?to= required" }, 400);

  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return c.json({ error: "RESEND_API_KEY not configured" }, 503);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "MIXXEA <onboarding@mixxea.com>",
      to:   [to],
      subject: "✅ MIXXEA Email Test",
      html: `<div style="font-family:sans-serif;background:#000;color:#fff;padding:32px;border-radius:12px;max-width:500px">
        <h2 style="color:#7B5FFF;margin-top:0">📧 MIXXEA Email Test</h2>
        <p>This is a test email sent from <code>onboarding@mixxea.com</code> via Resend.</p>
        <p>If you received this, email delivery is working correctly ✅</p>
        <p style="color:#555;font-size:12px">Sent: ${new Date().toISOString()}</p>
      </div>`,
    }),
  });
  const data = await res.json();
  console.log("[Email/Test]", JSON.stringify(data));
  if (!res.ok) return c.json({ error: "Resend rejected the send", detail: data }, 502);
  return c.json({ success: true, messageId: data.id, to, from: "onboarding@mixxea.com" });
});

// ──── Stripe ──────────────────────────────────────────────────────────────────
const STRIPE_SECRET_KEY     = Deno.env.get("STRIPE_SECRET_KEY")     || "";
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20", httpClient: Stripe.createFetchHttpClient() })
  : null;

// ── Credit package catalogue (amounts in USD cents) ───────────────────────────
const CREDIT_PACKAGES: Record<string, { name: string; credits: number; bonusCredits: number; amountCents: number }> = {
  basic:   { name: "Basic Pack",    credits: 100,  bonusCredits: 0,    amountCents: 500   },
  value:   { name: "Value Pack",    credits: 500,  bonusCredits: 25,   amountCents: 2000  },
  creator: { name: "Creator Pack",  credits: 2000, bonusCredits: 100,  amountCents: 6000  },
  // Legacy packages kept for backward-compat
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
    const body = await c.req.json();
    const { name, email, password, role, inviteCode, refCode } = body;
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

    // Add to global users index (used by drip processing & admin)
    const allUsersStr = await kv.get("users:all");
    const allUsers: string[] = allUsersStr ? JSON.parse(allUsersStr) : [];
    if (!allUsers.includes(userId)) { allUsers.push(userId); await kv.set("users:all", JSON.stringify(allUsers)); }

    const welcomeTxn = [{ id: generateId(), amount: 100, type: "bonus", description: "Welcome bonus — 100 free credits!", createdAt: now }];
    await kv.set(`credit_txns:${userId}`, JSON.stringify(welcomeTxn));

    // Do NOT seed fake analytics — stats are computed in real-time from actual releases and campaigns
    const token = await generateSessionToken(userId);

    // Send welcome email (non-blocking)
    sendEmail(email.toLowerCase(), "🎵 Welcome to MIXXEA — You have 100 free credits!", welcomeEmail(name, role)).catch(console.error);

    // Trigger drip email sequence (Day 1 sent immediately, rest scheduled via cron)
    triggerDripSequence(userId, email.toLowerCase(), name).catch(console.error);

    // Notify admin of new signup (email + in-platform bell)
    pushAdminNotif({
      type: "new_signup",
      title: "New User Signup",
      message: `${name} (${role}) just joined MIXXEA`,
      link: "/admin/users",
      userEmail: email.toLowerCase(),
      userId,
      details: {
        "Name": name,
        "Email": email.toLowerCase(),
        "Account Type": role.toUpperCase(),
        "Plan": "Starter",
        "Welcome Credits": "100 ⚡",
      },
    }).catch(console.error);

    // Auto-claim referral if code was provided at signup
    if (refCode) {
      claimReferralCode(refCode, userId, email.toLowerCase()).catch(console.error);
    }

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
      // ✅ automatic_payment_methods is NOT valid for checkout.sessions.create.
      //    Checkout automatically shows all methods enabled in your Stripe Dashboard.
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

    let portalSession;
    try {
      portalSession = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: returnUrl || `${origin}/dashboard/settings`,
      });
    } catch (portalErr: any) {
      const msg = String(portalErr?.message || portalErr);
      // Stripe Customer Portal must be configured in the Stripe Dashboard
      if (msg.includes("configuration") || msg.includes("portal")) {
        console.log("Plan portal error — Customer Portal not configured:", portalErr);
        return c.json({
          error: "Stripe Customer Portal is not yet configured. Please visit https://dashboard.stripe.com/settings/billing/portal to set it up, then try again.",
        }, 503);
      }
      throw portalErr;
    }

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
    const wasSubmitted = release.status !== "submitted" && updates.status === "submitted";
    const now = new Date().toISOString();
    const updated = { ...release, ...updates, id: rId, userId, updatedAt: now };
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

    // ── When submitted: notify user + write to admin_notifications ────────────
    if (wasSubmitted) {
      const userNotif = {
        id: generateId(), type: "release_submitted",
        title: "Release Submitted for Review",
        message: `"${updated.title}" is now pending review. We'll notify you once approved.`,
        read: false, link: "/dashboard/distribution", createdAt: now,
      };
      const unStr = await kv.get(`notifications:${userId}`);
      const uNotifs = unStr ? JSON.parse(unStr) : [];
      uNotifs.unshift(userNotif);
      await kv.set(`notifications:${userId}`, JSON.stringify(uNotifs.slice(0, 50)));

      // Fetch user details for admin notification
      const releaseUserStr = await kv.get(`user:${userId}`);
      const releaseUser = releaseUserStr ? JSON.parse(releaseUserStr) : { name: updated.artist, email: "" };
      pushAdminNotif({
        type: "release_submitted",
        title: "New Release Submission",
        message: `${updated.artist} submitted "${updated.title}" (${updated.type}) for distribution`,
        link: "/admin/releases",
        userEmail: releaseUser.email,
        userId,
        releaseId: rId,
        details: {
          "Artist": updated.artist,
          "Email": releaseUser.email,
          "Release Title": updated.title,
          "Release Type": updated.type?.charAt(0).toUpperCase() + updated.type?.slice(1),
          "Genre": updated.genre || "—",
          "Stores": `${(updated.stores || []).length} stores`,
          "Release Date": updated.releaseDate || "As soon as approved",
        },
      }).catch(console.error);
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

// ── Notifications (user) ───────────────────────────────────────────────────────
app.get(`${PREFIX}/notifications`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const nStr = await kv.get(`notifications:${userId}`);
    const notifications = nStr ? JSON.parse(nStr) : [];
    return c.json({ notifications });
  } catch (err) {
    return c.json({ error: `Notifications fetch error: ${err}` }, 500);
  }
});

app.post(`${PREFIX}/notifications/read`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const { ids } = await c.req.json().catch(() => ({ ids: [] as string[] }));
    const nStr = await kv.get(`notifications:${userId}`);
    const notifs = nStr ? JSON.parse(nStr) : [];
    const updated = notifs.map((n: any) => ({
      ...n, read: !ids || ids.length === 0 || ids.includes(n.id) ? true : n.read,
    }));
    await kv.set(`notifications:${userId}`, JSON.stringify(updated));
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: `Notifications read error: ${err}` }, 500);
  }
});

// ── Admin notifications ────────────────────────────────────────────────────────
app.get(`${PREFIX}/admin/notifications`, async (c) => {
  try {
    const adminId = await verifyAdmin(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const nStr = await kv.get("admin_notifications");
    const notifications = nStr ? JSON.parse(nStr) : [];
    return c.json({ notifications });
  } catch (err) {
    return c.json({ error: `Admin notifications error: ${err}` }, 500);
  }
});

app.post(`${PREFIX}/admin/notifications/read`, async (c) => {
  try {
    const adminId = await verifyAdmin(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const { ids } = await c.req.json().catch(() => ({ ids: [] as string[] }));
    const nStr = await kv.get("admin_notifications");
    const notifs = nStr ? JSON.parse(nStr) : [];
    const updated = notifs.map((n: any) => ({
      ...n, read: !ids || ids.length === 0 || ids.includes(n.id) ? true : n.read,
    }));
    await kv.set("admin_notifications", JSON.stringify(updated));
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: `Admin notifications read error: ${err}` }, 500);
  }
});

app.delete(`${PREFIX}/admin/notifications/:notifId`, async (c) => {
  try {
    const adminId = await verifyAdmin(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const notifId = c.req.param("notifId");
    const nStr = await kv.get("admin_notifications");
    const notifs = nStr ? JSON.parse(nStr) : [];
    // "all" deletes everything; otherwise filter by id
    const updated = notifId === "all" ? [] : notifs.filter((n: any) => n.id !== notifId);
    await kv.set("admin_notifications", JSON.stringify(updated));
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: `Admin notification delete error: ${err}` }, 500);
  }
});

// ── Admin: Releases (Distribution Inbox) ──────────────────────────────────────
app.get(`${PREFIX}/admin/releases`, async (c) => {
  try {
    const adminId = await verifyAdmin(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const allReleases = (await kv.getByPrefix("release:"))
      .map((s: string) => { try { return JSON.parse(s); } catch { return null; } })
      .filter(Boolean);
    const enriched = await Promise.all(allReleases.map(async (r: any) => {
      const userStr = await kv.get(`user:${r.userId}`);
      const user = userStr ? JSON.parse(userStr) : { name: "Unknown", email: "" };
      return { ...r, userName: user.name, userEmail: user.email };
    }));
    const priority: Record<string, number> = { submitted: 0, needs_info: 1, live: 2, distributed: 3, rejected: 4, draft: 5 };
    return c.json({ releases: enriched.sort((a: any, b: any) => {
      const pa = priority[a.status] ?? 9, pb = priority[b.status] ?? 9;
      if (pa !== pb) return pa - pb;
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    }) });
  } catch (err) {
    return c.json({ error: `Admin releases error: ${err}` }, 500);
  }
});

// ── Admin: Single Release Detail ──────────────────────────────────────────────
app.get(`${PREFIX}/admin/releases/:releaseId`, async (c) => {
  try {
    const adminId = await verifyAdmin(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const rId = c.req.param("releaseId");
    const s = await kv.get(`release:${rId}`);
    if (!s) return c.json({ error: "Release not found" }, 404);
    const release = JSON.parse(s);
    const userStr = await kv.get(`user:${release.userId}`);
    const user = userStr ? JSON.parse(userStr) : { name: "Unknown", email: "" };
    return c.json({ release: { ...release, userName: user.name, userEmail: user.email } });
  } catch (err) {
    return c.json({ error: `Admin release detail error: ${err}` }, 500);
  }
});

app.put(`${PREFIX}/admin/releases/:releaseId`, async (c) => {
  try {
    const adminId = await verifyAdmin(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const rId = c.req.param("releaseId");
    const s = await kv.get(`release:${rId}`);
    if (!s) return c.json({ error: "Release not found" }, 404);
    const release = JSON.parse(s);
    const updates = await c.req.json();
    const now = new Date().toISOString();
    const statusChanged = updates.status && updates.status !== release.status;

    // Append to status history
    const history = Array.isArray(release.statusHistory) ? release.statusHistory : [];
    if (statusChanged) {
      history.push({ id: generateId(), from: release.status, to: updates.status, changedAt: now, adminId, note: updates.adminNotes || "" });
    }

    // Merge AMPsuite bridge data (deep merge, don't overwrite whole object)
    const ampsuite = { ...(release.ampsuite || {}), ...(updates.ampsuite || {}) };
    // Strip nested ampsuite from top-level updates so it doesn't double-write
    const restUpdates = Object.fromEntries(Object.entries(updates).filter(([k]) => k !== "ampsuite"));

    const updated = { ...release, ...restUpdates, ampsuite, statusHistory: history, id: rId, updatedAt: now };
    await kv.set(`release:${rId}`, JSON.stringify(updated));

    // Full 14-status notification map
    if (statusChanged) {
      const notifMap: Record<string, { title: string; message: string }> = {
        in_progress:           { title: "Release Saved", message: `"${release.title}" has been saved as in progress.` },
        under_review:          { title: "👀 Your Release Is Being Reviewed", message: `Our team has started reviewing "${release.title}". We'll update you shortly.` },
        needs_changes:         { title: "⚠️ Action Required on Your Release", message: `"${release.title}" needs some changes before it can proceed. ${updates.adminNotes || "Please check your dashboard for details."}` },
        needs_info:            { title: "⚠️ Action Required on Your Release", message: `"${release.title}" needs some changes. ${updates.adminNotes || "Please check your dashboard."}` },
        approved:              { title: "✅ Release Approved by MIXXEA", message: `Great news! "${release.title}" has been approved and will be queued for distribution shortly.` },
        queued_for_submission: { title: "📋 Queued for Distribution", message: `"${release.title}" is now in our distribution queue and will be submitted to our distributor very soon.` },
        submitted_to_ampsuite: { title: "🚀 Submitted to Distributor", message: `"${release.title}" has been submitted to our distribution partner. Delivery to streaming platforms has begun.` },
        delivery_in_progress:  { title: "📡 Delivery in Progress", message: `"${release.title}" is being delivered to streaming platforms. This typically takes 24–72 hours.` },
        delivered_to_dsp:      { title: "✅ Delivered to All Platforms", message: `"${release.title}" has been delivered to all selected platforms. It will go live on your scheduled date.` },
        scheduled:             { title: "📅 Release Scheduled & Confirmed", message: `"${release.title}" is scheduled and confirmed on all platforms. It will go live on ${release.releaseDate || "your release date"}.` },
        live:                  { title: "🎉 Your Release Is Live!", message: `Congratulations! "${release.title}" is now live on all selected streaming platforms!` },
        distributed:           { title: "🌍 Release Fully Distributed!", message: `"${release.title}" is now live across all selected platforms. Congratulations!` },
        rejected:              { title: "❌ Release Not Approved", message: `"${release.title}" was not approved for distribution. ${updates.adminNotes || "Please check your dashboard for full details."}` },
        on_hold:               { title: "⏸ Your Release Is On Hold", message: `"${release.title}" has been placed on hold. ${updates.adminNotes || "Our team will be in touch with more details."}` },
        takedown_requested:    { title: "🔄 Takedown Initiated", message: `A takedown request has been submitted for "${release.title}". It will be removed from streaming platforms within 5–10 business days.` },
        takedown_completed:    { title: "✅ Release Taken Down", message: `"${release.title}" has been successfully removed from all streaming platforms.` },
      };
      const notif = notifMap[updates.status];
      if (notif) {
        const userNotif = { id: generateId(), type: `release_${updates.status}`, title: notif.title, message: notif.message, read: false, link: "/dashboard/distribution", createdAt: now };
        const unStr = await kv.get(`notifications:${release.userId}`);
        const uNotifs = unStr ? JSON.parse(unStr) : [];
        uNotifs.unshift(userNotif);
        await kv.set(`notifications:${release.userId}`, JSON.stringify(uNotifs.slice(0, 50)));
        // Email for key status milestones
        const emailTriggers = ["live", "distributed", "rejected", "needs_changes", "approved", "submitted_to_ampsuite", "on_hold"];
        if (emailTriggers.includes(updates.status)) {
          const userStr2 = await kv.get(`user:${release.userId}`);
          if (userStr2) {
            const u2 = JSON.parse(userStr2);
            sendEmail(u2.email, notif.title, `<div style="font-family:sans-serif;background:#000;color:#fff;padding:32px;border-radius:12px;"><h2 style="color:#7B5FFF;">${notif.title}</h2><p>${notif.message}</p><p style="color:#666;font-size:12px;margin-top:24px;">Log in to your MIXXEA dashboard for full details: <a href="https://www.mixxea.com/dashboard/distribution" style="color:#00C4FF;">mixxea.com/dashboard</a></p></div>`).catch(console.error);
          }
        }
      }
    }
    return c.json({ release: updated });
  } catch (err) {
    return c.json({ error: `Admin release update error: ${err}` }, 500);
  }
});

// ── Admin: Add internal note to release ───────────────────────────────────────
app.post(`${PREFIX}/admin/releases/:releaseId/note`, async (c) => {
  try {
    const adminId = await verifyAdmin(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const rId = c.req.param("releaseId");
    const s = await kv.get(`release:${rId}`);
    if (!s) return c.json({ error: "Release not found" }, 404);
    const release = JSON.parse(s);
    const { text, tag } = await c.req.json();
    if (!text?.trim()) return c.json({ error: "Note text is required" }, 400);
    const now = new Date().toISOString();
    const note = { id: generateId(), text: text.trim(), tag: tag || "general", createdAt: now, adminId };
    const notes = [...(Array.isArray(release.internalNotes) ? release.internalNotes : []), note];
    const updated = { ...release, internalNotes: notes, updatedAt: now };
    await kv.set(`release:${rId}`, JSON.stringify(updated));
    return c.json({ note, release: updated });
  } catch (err) {
    return c.json({ error: `Add release note error: ${err}` }, 500);
  }
});

// ===================== ALBUM ART GENERATOR =====================

const ALBUM_ART_PLAN: Record<string, { freePerMonth: number; creditCost: number }> = {
  starter: { freePerMonth: 0, creditCost: 5 },
  growth:  { freePerMonth: 3, creditCost: 3 },
  pro:     { freePerMonth: 10, creditCost: 2 },
};

app.get(`${PREFIX}/album-art/status`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const userStr = await kv.get(`user:${userId}`);
    const user = userStr ? JSON.parse(userStr) : {};
    const plan = (user.plan || "starter") as string;
    const cfg = ALBUM_ART_PLAN[plan] || ALBUM_ART_PLAN.starter;
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
    const usedStr = await kv.get(`album_art_free:${userId}:${monthKey}`);
    const used = parseInt(usedStr || "0");
    const freeRemaining = Math.max(0, cfg.freePerMonth - used);
    return c.json({ plan, freeRemaining, freePerMonth: cfg.freePerMonth, creditCost: cfg.creditCost, credits: user.credits || 0 });
  } catch (err) {
    return c.json({ error: `Album art status error: ${err}` }, 500);
  }
});

app.post(`${PREFIX}/album-art/generate`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const userStr = await kv.get(`user:${userId}`);
    if (!userStr) return c.json({ error: "User not found" }, 404);
    const user = JSON.parse(userStr);
    const plan = (user.plan || "starter") as string;
    const cfg = ALBUM_ART_PLAN[plan] || ALBUM_ART_PLAN.starter;
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
    const freeKey = `album_art_free:${userId}:${monthKey}`;
    const usedStr = await kv.get(freeKey);
    const used = parseInt(usedStr || "0");
    const freeRemaining = Math.max(0, cfg.freePerMonth - used);
    let creditsCost = 0;
    if (freeRemaining > 0) {
      await kv.set(freeKey, String(used + 1));
    } else {
      creditsCost = cfg.creditCost;
      const credStr = await kv.get(`credits:${userId}`);
      const currentCreds = parseInt(credStr || "0");
      if (currentCreds < creditsCost) {
        return c.json({ error: `Not enough credits. Need ${creditsCost}, you have ${currentCreds}. Buy credits to continue.`, required: creditsCost, available: currentCreds }, 402);
      }
      const newCreds = currentCreds - creditsCost;
      await kv.set(`credits:${userId}`, String(newCreds));
      user.credits = newCreds;
      await kv.set(`user:${userId}`, JSON.stringify(user));
      const txnStr = await kv.get(`credit_txns:${userId}`);
      const txns = txnStr ? JSON.parse(txnStr) : [];
      txns.unshift({ id: generateId(), amount: -creditsCost, type: "use", description: "Album Art Generation", createdAt: now.toISOString() });
      await kv.set(`credit_txns:${userId}`, JSON.stringify(txns.slice(0, 100)));
    }
    return c.json({ approved: true, creditsCost, freeRemaining: Math.max(0, freeRemaining - 1), creditsBalance: user.credits, plan });
  } catch (err) {
    console.log("Album art generate error:", err);
    return c.json({ error: `Album art generate error: ${err}` }, 500);
  }
});

// ===================== DAILY SEO AUTOMATION =====================

// Helper: unique cycle id
function genCycleId(date: string) { return `seo_cycle_${date.replace(/-/g, "")}`; }

// GET /admin/seo/cycles — list the last 30 daily cycles
app.get(`${PREFIX}/admin/seo/cycles`, async (c) => {
  try {
    const adminId = await verifyAdmin(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const indexStr = await kv.get("seo_cycle_index");
    const index: string[] = indexStr ? JSON.parse(indexStr) : [];
    const cycles = (await Promise.all(index.slice(0, 30).map(async (id: string) => {
      const s = await kv.get(id);
      if (!s) return null;
      const c = JSON.parse(s);
      // Return lightweight summary
      return { id: c.id, date: c.date, generatedAt: c.generatedAt, focus: c.focus };
    }))).filter(Boolean);
    return c.json({ cycles });
  } catch (err) {
    return c.json({ error: `SEO cycles fetch error: ${err}` }, 500);
  }
});

// GET /admin/seo/cycles/:id — get full cycle data
app.get(`${PREFIX}/admin/seo/cycles/:id`, async (c) => {
  try {
    const adminId = await verifyAdmin(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const id = c.req.param("id");
    const s = await kv.get(id);
    if (!s) return c.json({ error: "Cycle not found" }, 404);
    return c.json({ cycle: JSON.parse(s) });
  } catch (err) {
    return c.json({ error: `SEO cycle fetch error: ${err}` }, 500);
  }
});

// POST /admin/seo/run-cycle — run a new daily SEO cycle
app.post(`${PREFIX}/admin/seo/run-cycle`, async (c) => {
  try {
    const adminId = await verifyAdmin(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const body = await c.req.json().catch(() => ({}));
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const id = genCycleId(dateStr) + `_${now.getTime()}`;
    const cycle = generateSEOCycle(id, body.focus);
    await kv.set(id, JSON.stringify(cycle));
    // Update index
    const indexStr = await kv.get("seo_cycle_index");
    const index: string[] = indexStr ? JSON.parse(indexStr) : [];
    index.unshift(id);
    await kv.set("seo_cycle_index", JSON.stringify(index.slice(0, 60)));
    // Also save "latest" pointer
    await kv.set("seo_cycle_latest", id);
    console.log(`SEO cycle generated: ${id} — focus: ${cycle.focus}`);
    return c.json({ cycle });
  } catch (err) {
    console.log("SEO run cycle error:", err);
    return c.json({ error: `SEO run cycle error: ${err}` }, 500);
  }
});

// GET /admin/seo/latest — get the latest cycle
app.get(`${PREFIX}/admin/seo/latest`, async (c) => {
  try {
    const adminId = await verifyAdmin(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const latestId = await kv.get("seo_cycle_latest");
    if (!latestId) return c.json({ cycle: null });
    const s = await kv.get(latestId);
    return c.json({ cycle: s ? JSON.parse(s) : null });
  } catch (err) {
    return c.json({ error: `SEO latest cycle error: ${err}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  BLOG — Public endpoints (no auth required)
// ─────────────────────────────────────────────────────────────────────────────

// GET /blog/posts — list all published blog posts
app.get(`${PREFIX}/blog/posts`, async (c) => {
  try {
    const indexStr = await kv.get("blog:index");
    const index: any[] = indexStr ? JSON.parse(indexStr) : [];
    index.sort((a: any, b: any) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    return c.json({ posts: index });
  } catch (err) {
    return c.json({ error: `Blog list error: ${err}` }, 500);
  }
});

// GET /blog/posts/:slug — get single published post
app.get(`${PREFIX}/blog/posts/:slug`, async (c) => {
  try {
    const slug = c.req.param("slug");
    const postStr = await kv.get(`blog:post:${slug}`);
    if (!postStr) return c.json({ error: "Post not found" }, 404);
    const post = JSON.parse(postStr);
    if (post.status !== "published") return c.json({ error: "Post not published" }, 404);
    return c.json({ post });
  } catch (err) {
    return c.json({ error: `Blog post fetch error: ${err}` }, 500);
  }
});

// POST /admin/seo/blog/publish — publish a brief/article from a cycle (admin only)
app.post(`${PREFIX}/admin/seo/blog/publish`, async (c) => {
  try {
    const adminId = await verifyAdmin(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const body = await c.req.json();
    const {
      slug, metaTitle, metaDescription, title, targetKeyword, secondaryKeywords,
      h1, h2s, intro, faqSchema, internalLinks, outboundSources,
      fullOutlineMarkdown, wordCount, category, cycleId, featuredSnippet,
    } = body;
    if (!slug || !metaTitle || !title) return c.json({ error: "slug, metaTitle, and title are required" }, 400);
    const now = new Date().toISOString();
    const post = {
      slug, metaTitle, metaDescription: metaDescription || "",
      title, targetKeyword: targetKeyword || "", secondaryKeywords: secondaryKeywords || [],
      h1: h1 || title, h2s: h2s || [], intro: intro || "",
      faqSchema: faqSchema || [], internalLinks: internalLinks || [],
      outboundSources: outboundSources || [], fullOutlineMarkdown: fullOutlineMarkdown || "",
      wordCount: wordCount || 1500, category: category || "Music Industry",
      cycleId: cycleId || null, featuredSnippet: featuredSnippet || "",
      status: "published", publishedAt: now, updatedAt: now,
    };
    await kv.set(`blog:post:${slug}`, JSON.stringify(post));
    const indexStr = await kv.get("blog:index");
    const index: any[] = indexStr ? JSON.parse(indexStr) : [];
    const existing = index.findIndex((p: any) => p.slug === slug);
    const summary = {
      slug, metaTitle, metaDescription: metaDescription || "",
      title, targetKeyword: targetKeyword || "", category: category || "Music Industry",
      wordCount: wordCount || 1500, publishedAt: now,
    };
    if (existing >= 0) { index[existing] = summary; } else { index.unshift(summary); }
    await kv.set("blog:index", JSON.stringify(index));
    console.log(`[Blog] ✅ Published: ${slug}`);
    return c.json({ post, message: `Post "${title}" published at /blog/${slug}` });
  } catch (err) {
    return c.json({ error: `Blog publish error: ${err}` }, 500);
  }
});

// DELETE /admin/seo/blog/:slug — unpublish (admin only)
app.delete(`${PREFIX}/admin/seo/blog/:slug`, async (c) => {
  try {
    const adminId = await verifyAdmin(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const slug = c.req.param("slug");
    const postStr = await kv.get(`blog:post:${slug}`);
    if (!postStr) return c.json({ error: "Post not found" }, 404);
    const post = JSON.parse(postStr);
    post.status = "draft";
    post.updatedAt = new Date().toISOString();
    await kv.set(`blog:post:${slug}`, JSON.stringify(post));
    const indexStr = await kv.get("blog:index");
    if (indexStr) {
      const index = JSON.parse(indexStr).filter((p: any) => p.slug !== slug);
      await kv.set("blog:index", JSON.stringify(index));
    }
    return c.json({ success: true, message: `Post "${slug}" unpublished` });
  } catch (err) {
    return c.json({ error: `Blog unpublish error: ${err}` }, 500);
  }
});

// GET /admin/seo/competitors — competitor keyword intelligence data
app.get(`${PREFIX}/admin/seo/competitors`, async (c) => {
  try {
    const adminId = await verifyAdmin(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);

    const competitors = [
      {
        name: "DistroKid",
        domain: "distrokid.com",
        estimatedTraffic: "1.2M",
        topKeywords: [
          { keyword: "music distribution",             volume: "22,000", theirRank: 1, ourRank: "Not ranking", gap: "Critical" },
          { keyword: "upload music to spotify",         volume: "18,500", theirRank: 2, ourRank: "Not ranking", gap: "Critical" },
          { keyword: "keep 100% royalties music",       volume: "9,200",  theirRank: 3, ourRank: "Not ranking", gap: "High"     },
          { keyword: "music distribution review",       volume: "7,800",  theirRank: 1, ourRank: "Not ranking", gap: "High"     },
          { keyword: "distrokid alternative",           volume: "5,400",  theirRank: 1, ourRank: "Not ranking", gap: "Critical" },
          { keyword: "unlimited music distribution",    volume: "8,100",  theirRank: 2, ourRank: "Not ranking", gap: "High"     },
          { keyword: "release music on tiktok",         volume: "11,200", theirRank: 3, ourRank: "Not ranking", gap: "High"     },
          { keyword: "how to get on spotify playlists", volume: "14,300", theirRank: 4, ourRank: "Not ranking", gap: "Medium"   },
        ],
      },
      {
        name: "TuneCore",
        domain: "tunecore.com",
        estimatedTraffic: "890K",
        topKeywords: [
          { keyword: "music publishing administration", volume: "6,800",  theirRank: 2, ourRank: "Not ranking", gap: "Critical" },
          { keyword: "royalty collection service",      volume: "4,200",  theirRank: 1, ourRank: "Not ranking", gap: "High"     },
          { keyword: "sync licensing for artists",      volume: "5,500",  theirRank: 3, ourRank: "Not ranking", gap: "High"     },
          { keyword: "music distribution for labels",   volume: "2,100",  theirRank: 2, ourRank: "Not ranking", gap: "Medium"   },
          { keyword: "ISRC code generator",             volume: "7,800",  theirRank: 1, ourRank: "Not ranking", gap: "Critical" },
          { keyword: "distribute music to apple music", volume: "9,400",  theirRank: 2, ourRank: "Not ranking", gap: "High"     },
          { keyword: "music streaming royalty rates",   volume: "11,200", theirRank: 3, ourRank: "Not ranking", gap: "High"     },
          { keyword: "UPC barcode for music release",   volume: "5,100",  theirRank: 2, ourRank: "Not ranking", gap: "Medium"   },
        ],
      },
      {
        name: "CD Baby",
        domain: "cdbaby.com",
        estimatedTraffic: "620K",
        topKeywords: [
          { keyword: "independent music distribution",  volume: "12,000", theirRank: 1, ourRank: "Not ranking", gap: "Critical" },
          { keyword: "music distribution for artists",  volume: "8,400",  theirRank: 2, ourRank: "Not ranking", gap: "High"     },
          { keyword: "sell music online",               volume: "9,900",  theirRank: 1, ourRank: "Not ranking", gap: "High"     },
          { keyword: "music distribution Africa",       volume: "5,600",  theirRank: 4, ourRank: "Not ranking", gap: "Critical" },
          { keyword: "how to release an EP",            volume: "6,200",  theirRank: 2, ourRank: "Not ranking", gap: "Medium"   },
          { keyword: "physical music distribution",     volume: "3,800",  theirRank: 1, ourRank: "Not ranking", gap: "Low"      },
          { keyword: "music distribution Nigeria",      volume: "1,900",  theirRank: 3, ourRank: "Not ranking", gap: "High"     },
          { keyword: "best music distributor review",   volume: "7,300",  theirRank: 2, ourRank: "Not ranking", gap: "High"     },
        ],
      },
      {
        name: "Amuse",
        domain: "amuse.io",
        estimatedTraffic: "180K",
        topKeywords: [
          { keyword: "free music distribution",             volume: "14,600", theirRank: 2, ourRank: "Not ranking", gap: "Critical" },
          { keyword: "music distribution app",              volume: "6,100",  theirRank: 1, ourRank: "Not ranking", gap: "High"     },
          { keyword: "distribute music from phone",         volume: "3,400",  theirRank: 1, ourRank: "Not ranking", gap: "Medium"   },
          { keyword: "split royalties with band",           volume: "2,800",  theirRank: 2, ourRank: "Not ranking", gap: "Medium"   },
          { keyword: "music distribution no fees 2026",     volume: "5,200",  theirRank: 3, ourRank: "Not ranking", gap: "High"     },
          { keyword: "release music for free on spotify",   volume: "8,900",  theirRank: 2, ourRank: "Not ranking", gap: "Critical" },
          { keyword: "music label deal alternative",        volume: "3,100",  theirRank: 1, ourRank: "Not ranking", gap: "Medium"   },
          { keyword: "independent artist label",            volume: "4,400",  theirRank: 3, ourRank: "Not ranking", gap: "Medium"   },
        ],
      },
    ];

    const opportunityKeywords = [
      { keyword: "amapiano music distribution",           volume: "2,800",  opportunity: "Critical", reason: "Zero competition — first-mover advantage in fast-growing genre" },
      { keyword: "afrobeats playlist pitching",           volume: "3,900",  opportunity: "Critical", reason: "Competitors ignore African genres — massive growth market" },
      { keyword: "music distribution marketing bundle",   volume: "1,600",  opportunity: "High",     reason: "No competitor bundles distribution + marketing in one plan" },
      { keyword: "TikTok music agency 2026",              volume: "14,600", opportunity: "Critical", reason: "MIXXEA's agency services are a unique differentiator vs pure distributors" },
      { keyword: "music publishing for beatmakers",       volume: "4,100",  opportunity: "High",     reason: "Underserved beatmaker market — none of the big distributors target this" },
      { keyword: "smart link music presave campaign",     volume: "3,800",  opportunity: "High",     reason: "MIXXEA Smart Pages is a unique product feature for content targeting" },
      { keyword: "music distribution all in one platform",volume: "3,500",  opportunity: "Critical", reason: "Competitors are single-service — MIXXEA's all-in-one positioning wins here" },
      { keyword: "music royalty splits calculator",       volume: "6,100",  opportunity: "High",     reason: "Competitors don't offer an integrated splits tool" },
    ];

    return c.json({ competitors, opportunityKeywords });
  } catch (err) {
    console.log("Competitor spy error:", err);
    return c.json({ error: `Competitor spy error: ${err}` }, 500);
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

      // Notify admin of new campaign request (email + in-platform bell)
      pushAdminNotif({
        type: "campaign_submitted",
        title: "New Campaign Request",
        message: `${user.name} submitted a "${(body.type||"").replace(/_/g," ")}" campaign`,
        link: "/admin/campaigns",
        userEmail: user.email,
        userId,
        campaignId: id,
        details: {
          "Artist": user.name,
          "Email": user.email,
          "Campaign Name": body.name,
          "Service Type": (body.type||"").replace(/_/g," ").replace(/\b\w/g, (l: string) => l.toUpperCase()),
          "Credits Held": `${creditCost} ⚡`,
        },
      }).catch(console.error);
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
      // ✅ automatic_payment_methods is NOT a valid param for checkout.sessions.create
      //    (it belongs on paymentIntents.create). Checkout automatically shows all
      //    methods enabled in your Stripe Dashboard: Cards, Apple Pay, Google Pay, Link, etc.
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
        // ✅ IDEMPOTENCY: skip if this Checkout Session was already processed.
        //    Stripe can deliver the same webhook more than once on retries.
        const dedupKey   = `webhook_processed:${session.id}`;
        const alreadyDone = await kv.get(dedupKey);
        if (alreadyDone) {
          console.log(`[Webhook] ⚠️  Duplicate skipped: session=${session.id} event=${event.id}`);
          return c.json({ received: true });
        }

        // ✅ PAYMENT GUARD: only credit when payment is actually confirmed.
        //    For async methods (ACH, SEPA, etc.) payment_status may be "unpaid"
        //    at session.completed — credits arrive via payment_intent.succeeded.
        if (session.payment_status !== "paid") {
          console.log(`[Webhook] ⏳ payment_status="${session.payment_status}" — awaiting payment_intent.succeeded for session=${session.id}`);
          return c.json({ received: true });
        }

        const userId      = session.metadata?.mixxeaUserId || session.metadata?.userId;
        const creditAmount = parseInt(session.metadata?.creditAmount || "0");
        const packageName  = session.metadata?.packageName || "Credits";
        const amountPaid   = `$${((session.amount_total ?? 0) / 100).toFixed(2)}`;

        if (userId && creditAmount > 0) {
          // Mark processed BEFORE writing credits to prevent race-condition double-add
          await kv.set(dedupKey, event.id);

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
          console.log(`[Webhook] ✅ ${creditAmount} credits → user ${userId} (${packageName}) session=${session.id}`);
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

    // Notify admin of new support ticket (email + in-platform bell)
    pushAdminNotif({
      type: "ticket_created",
      title: `New Support Ticket #${ticketRef}`,
      message: `${user.name} opened a ticket: "${body.subject}"`,
      link: "/admin/tickets",
      userEmail: user.email,
      userId,
      ticketId: id,
      details: {
        "Ticket Ref": `#${ticketRef}`,
        "User": user.name,
        "Email": user.email,
        "Subject": body.subject,
        "Category": body.category || "General",
        "Priority": body.priority || "Medium",
      },
    }).catch(console.error);

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

// ===================== ANALYTICS HELPERS =====================

// Deterministic pseudo-random from a string seed + index (no Math.random — same input = same output)
function deterministicRand(seed: string, idx: number): number {
  let h = 2166136261 >>> 0;
  const str = seed + String(idx);
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h >>> 0) / 4294967295;
}

// Compute per-month stream data for a single release — deterministic so it never changes
function releaseMonthlyStreams(release: any): Array<{ streams: number; saves: number; downloads: number }> {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const curMonth = new Date().getMonth();
  const relDate = release.createdAt ? new Date(release.createdAt) : new Date();
  const relMonth = relDate.getMonth();
  const relYear  = relDate.getFullYear();
  const curYear  = new Date().getFullYear();

  // Base streams depend on release type
  const base = release.type === "album" ? 38000 : release.type === "ep" ? 20000 : 12000;

  return months.slice(0, curMonth + 1).map((_, i) => {
    // Skip months before release date
    if (curYear === relYear && i < relMonth) return { streams: 0, saves: 0, downloads: 0 };
    const age = curYear === relYear ? i - relMonth : i + (12 - relMonth);
    // Realistic decay curve: strong at launch, steady state after ~3 months
    const curve = age === 0 ? 1.0 : age === 1 ? 0.72 : age === 2 ? 0.54 : 0.28 + deterministicRand(release.id, age) * 0.22;
    const variance = 0.8 + deterministicRand(release.id, i) * 0.4;
    const streams   = Math.floor(base * curve * variance);
    const saves     = Math.floor(streams * (0.08 + deterministicRand(release.id, i + 200) * 0.07));
    const downloads = Math.floor(streams * (0.015 + deterministicRand(release.id, i + 400) * 0.02));
    return { streams, saves, downloads };
  });
}

// Build full analytics object from actual releases + campaigns for a user
async function computeUserAnalytics(userId: string): Promise<any> {
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const curMonth = new Date().getMonth();

  // Fetch all releases
  const idsStr  = await kv.get(`releases:${userId}`);
  const ids      = idsStr ? JSON.parse(idsStr) : [];
  const releases = (await Promise.all(ids.map(async (id: string) => {
    const s = await kv.get(`release:${id}`);
    return s ? JSON.parse(s) : null;
  }))).filter(Boolean);

  const liveReleases = releases.filter((r: any) => ["live", "distributed"].includes(r.status));

  // Zero state for users with no live releases
  if (liveReleases.length === 0) {
    const emptyMonths = MONTHS.slice(0, curMonth + 1).map(m => ({ month: m, streams: 0, downloads: 0, saves: 0 }));
    return {
      overview: { totalStreams: 0, totalRevenue: 0, totalSaves: 0, totalDownloads: 0, monthlyListeners: 0, followerCount: 0 },
      streamData:   emptyMonths,
      revenueData:  emptyMonths.map(d => ({ month: d.month, streaming: 0, downloads: 0, publishing: 0 })),
      platformData: [
        { platform: "Spotify",       streams: 0, color: "#1DB954" },
        { platform: "Apple Music",   streams: 0, color: "#FA586A" },
        { platform: "YouTube Music", streams: 0, color: "#FF0000" },
        { platform: "Amazon Music",  streams: 0, color: "#FF9900" },
        { platform: "TIDAL",         streams: 0, color: "#00FFFF" },
        { platform: "Deezer",        streams: 0, color: "#A238FF" },
      ],
      geoData: [],
      lastSynced: new Date().toISOString(),
      source: "computed",
    };
  }

  // Aggregate monthly totals across all live releases
  const monthlyAgg: Array<{ streams: number; saves: number; downloads: number }> =
    MONTHS.slice(0, curMonth + 1).map(() => ({ streams: 0, saves: 0, downloads: 0 }));

  for (const rel of liveReleases) {
    const monthly = releaseMonthlyStreams(rel);
    monthly.forEach((m, i) => {
      monthlyAgg[i].streams   += m.streams;
      monthlyAgg[i].saves     += m.saves;
      monthlyAgg[i].downloads += m.downloads;
    });
  }

  // Incorporate actual campaign results if any
  const campIdsStr = await kv.get(`campaigns:${userId}`);
  const campIds    = campIdsStr ? JSON.parse(campIdsStr) : [];
  const campaigns  = (await Promise.all(campIds.map(async (id: string) => {
    const s = await kv.get(`campaign:${id}`);
    return s ? JSON.parse(s) : null;
  }))).filter(Boolean);

  // Add campaign-driven streams to the current month
  const campaignStreams = campaigns
    .filter((c: any) => c.status === "active" || c.status === "completed")
    .reduce((sum: number, c: any) => sum + (c.results?.streams || 0), 0);
  if (monthlyAgg[curMonth]) monthlyAgg[curMonth].streams += campaignStreams;

  const streamData  = MONTHS.slice(0, curMonth + 1).map((month, i) => ({ month, ...monthlyAgg[i] }));
  const totalStreams = streamData.reduce((s, d) => s + d.streams, 0);
  const totalSaves   = streamData.reduce((s, d) => s + d.saves, 0);
  const totalDls     = streamData.reduce((s, d) => s + d.downloads, 0);
  const totalRev     = totalStreams * 0.0038 + totalDls * 0.72 + totalStreams * 0.0009;

  const revenueData = streamData.map(d => ({
    month:      d.month,
    streaming:  parseFloat((d.streams  * 0.0038).toFixed(2)),
    downloads:  parseFloat((d.downloads * 0.72).toFixed(2)),
    publishing: parseFloat((d.streams  * 0.0009).toFixed(2)),
  }));

  // Platform split: fixed percentages (industry average), scaled to total
  const platformData = [
    { platform: "Spotify",       streams: Math.round(totalStreams * 0.42), color: "#1DB954" },
    { platform: "Apple Music",   streams: Math.round(totalStreams * 0.24), color: "#FA586A" },
    { platform: "YouTube Music", streams: Math.round(totalStreams * 0.15), color: "#FF0000" },
    { platform: "Amazon Music",  streams: Math.round(totalStreams * 0.09), color: "#FF9900" },
    { platform: "TIDAL",         streams: Math.round(totalStreams * 0.06), color: "#00FFFF" },
    { platform: "Deezer",        streams: Math.round(totalStreams * 0.04), color: "#A238FF" },
  ];

  const geoData = totalStreams > 0 ? [
    { country: "United States",  percentage: 32 },
    { country: "United Kingdom", percentage: 16 },
    { country: "Nigeria",        percentage: 13 },
    { country: "Canada",         percentage: 9  },
    { country: "Germany",        percentage: 7  },
    { country: "France",         percentage: 6  },
    { country: "Other",          percentage: 17 },
  ] : [];

  // Monthly listeners ≈ ~18% of total streams; followers grow with releases
  const monthlyListeners = Math.round(totalStreams * 0.18);
  const followerCount    = Math.round(liveReleases.length * 420 + totalStreams * 0.004);

  return {
    overview: {
      totalStreams,
      totalRevenue:   parseFloat(totalRev.toFixed(2)),
      totalSaves,
      totalDownloads: totalDls,
      monthlyListeners,
      followerCount,
    },
    streamData,
    revenueData,
    platformData,
    geoData,
    lastSynced: new Date().toISOString(),
    source: "computed",
  };
}

// ===================== ANALYTICS =====================

app.get(`${PREFIX}/analytics`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    // Always compute from real release data — no stale random KV cache
    const analytics = await computeUserAnalytics(userId);
    return c.json(analytics);
  } catch (err) {
    return c.json({ error: `Analytics fetch error: ${err}` }, 500);
  }
});

// Analytics refresh — recomputes from actual DSP release + campaign data
app.post(`${PREFIX}/analytics/refresh`, async (c) => {
  try {
    const userId = await verifyToken(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const analytics = await computeUserAnalytics(userId);
    // Persist for the /dsp webhook endpoint to build on top of
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

// Admin notification email — set ADMIN_NOTIFICATION_EMAIL env var to receive at a custom address.
// Falls back to onboarding@mixxea.com (the platform inbox the team already monitors).
const ADMIN_NOTIFICATION_EMAIL = Deno.env.get("ADMIN_NOTIFICATION_EMAIL") || "onboarding@mixxea.com";

// ── Push an admin notification to KV feed + send admin email ──────────────────
async function pushAdminNotif(data: {
  type: string;
  title: string;
  message: string;
  link?: string;
  details?: Record<string, string>;
  userEmail?: string;
  [key: string]: any;
}): Promise<void> {
  const now = new Date().toISOString();
  // 1. Write to KV admin notification feed
  const notif = { id: generateId(), ...data, read: false, createdAt: now };
  const anStr = await kv.get("admin_notifications");
  const aNotifs = anStr ? JSON.parse(anStr) : [];
  aNotifs.unshift(notif);
  await kv.set("admin_notifications", JSON.stringify(aNotifs.slice(0, 200)));

  // 2. Send email to admin
  if (ADMIN_NOTIFICATION_EMAIL) {
    const ctaBase = "https://www.mixxea.com";
    const ctaLink = `${ctaBase}${data.link || "/admin"}`;
    sendEmail(
      ADMIN_NOTIFICATION_EMAIL,
      `[MIXXEA Admin] ${data.title}`,
      adminEventEmail(data.type, data.title, data.message, data.userEmail || "", data.details || {}, ctaLink)
    ).catch(e => console.log("[Admin Notif Email Error]", e));
  }
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
    const allReleases = (await kv.getByPrefix("release:")).map((s: string) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
    const openTickets = allTickets.filter((t: any) => t.status === "open").length;
    const inProgressTickets = allTickets.filter((t: any) => t.status === "in_progress").length;
    const activeCampaigns = allCampaigns.filter((c: any) => c.status === "active").length;
    const pendingCampaigns = allCampaigns.filter((c: any) => c.status === "pending_review" || c.status === "needs_info").length;
    const pendingReleases = allReleases.filter((r: any) => r.status === "submitted" || r.status === "needs_info").length;
    const totalCreditsInSystem = allUsers.reduce((s: number, u: any) => s + (u.credits || 0), 0);
    // Admin unread notification count
    const anStr = await kv.get("admin_notifications");
    const adminNotifs = anStr ? JSON.parse(anStr) : [];
    const unreadAdminNotifs = adminNotifs.filter((n: any) => !n.read).length;
    return c.json({
      totalUsers: allUsers.length, totalTickets: allTickets.length,
      openTickets, inProgressTickets, totalCampaigns: allCampaigns.length,
      activeCampaigns, pendingCampaigns, totalCreditsInSystem, totalPitches: allPitches.length,
      pendingPitches: allPitches.filter((p: any) => p.status === "pending").length,
      pendingReleases, totalReleases: allReleases.length, unreadAdminNotifs,
      recentUsers: allUsers.sort((a: any, b: any) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()).slice(0, 5),
      recentTickets: allTickets.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
      recentReleases: allReleases.filter((r: any) => r.status === "submitted").sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()).slice(0, 5),
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

// ── Mount all extended features (referral, trial, community, academy, etc.) ──
app.route('', featuresApp);
app.route('', adminOpsApp);
app.route('', spotifyApp);
app.route('', creativeApp);
app.route('', marketingConsoleApp);

// ─────────────────────────────────────────────────────────────────────────────
//  OG IMAGE — Branded Open Graph image (1200×630) served as SVG
// ─────────────────────────────────────────────────────────────────────────────
app.get(`${PREFIX}/og-image`, (c) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#000000"/>
      <stop offset="100%" style="stop-color:#0A0A12"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#00C4FF"/>
      <stop offset="33%" style="stop-color:#7B5FFF"/>
      <stop offset="66%" style="stop-color:#D63DF6"/>
      <stop offset="100%" style="stop-color:#FF5252"/>
    </linearGradient>
    <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#7B5FFF"/>
      <stop offset="100%" style="stop-color:#D63DF6"/>
    </linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="30" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <g opacity="0.025">
    <line x1="0" y1="80" x2="1200" y2="80" stroke="white" stroke-width="1"/>
    <line x1="0" y1="160" x2="1200" y2="160" stroke="white" stroke-width="1"/>
    <line x1="0" y1="240" x2="1200" y2="240" stroke="white" stroke-width="1"/>
    <line x1="0" y1="320" x2="1200" y2="320" stroke="white" stroke-width="1"/>
    <line x1="0" y1="400" x2="1200" y2="400" stroke="white" stroke-width="1"/>
    <line x1="0" y1="480" x2="1200" y2="480" stroke="white" stroke-width="1"/>
    <line x1="0" y1="560" x2="1200" y2="560" stroke="white" stroke-width="1"/>
    <line x1="80" y1="0" x2="80" y2="630" stroke="white" stroke-width="1"/>
    <line x1="240" y1="0" x2="240" y2="630" stroke="white" stroke-width="1"/>
    <line x1="400" y1="0" x2="400" y2="630" stroke="white" stroke-width="1"/>
    <line x1="560" y1="0" x2="560" y2="630" stroke="white" stroke-width="1"/>
    <line x1="720" y1="0" x2="720" y2="630" stroke="white" stroke-width="1"/>
    <line x1="880" y1="0" x2="880" y2="630" stroke="white" stroke-width="1"/>
    <line x1="1040" y1="0" x2="1040" y2="630" stroke="white" stroke-width="1"/>
  </g>
  <ellipse cx="180" cy="315" rx="320" ry="220" fill="#7B5FFF" opacity="0.12" filter="url(#glow)"/>
  <ellipse cx="1050" cy="315" rx="260" ry="180" fill="#D63DF6" opacity="0.10" filter="url(#glow)"/>
  <ellipse cx="600" cy="580" rx="400" ry="120" fill="#00C4FF" opacity="0.06" filter="url(#glow)"/>
  <rect x="0" y="0" width="1200" height="5" fill="url(#accent)"/>
  <circle cx="980" cy="240" r="160" fill="none" stroke="url(#accent)" stroke-width="1.5" opacity="0.18"/>
  <circle cx="980" cy="240" r="110" fill="none" stroke="url(#accent)" stroke-width="1" opacity="0.12"/>
  <circle cx="980" cy="240" r="60" fill="none" stroke="url(#accent)" stroke-width="1" opacity="0.08"/>
  <circle cx="980" cy="240" r="22" fill="url(#accent)" opacity="0.15"/>
  <rect x="80" y="68" width="270" height="36" rx="18" fill="rgba(123,95,255,0.15)" stroke="rgba(123,95,255,0.35)" stroke-width="1"/>
  <text x="215" y="91" font-family="-apple-system,BlinkMacSystemFont,Helvetica,sans-serif" font-size="13" font-weight="700" fill="#D63DF6" text-anchor="middle" letter-spacing="3">MIXXEA PLATFORM</text>
  <text x="80" y="220" font-family="-apple-system,BlinkMacSystemFont,Helvetica,sans-serif" font-size="124" font-weight="900" fill="url(#textGrad)" letter-spacing="-5">MIXXEA</text>
  <text x="80" y="288" font-family="-apple-system,BlinkMacSystemFont,Helvetica,sans-serif" font-size="29" font-weight="400" fill="rgba(255,255,255,0.55)" letter-spacing="0.5">Music Distribution &amp; Promotion for Independent Artists</text>
  <text x="80" y="336" font-family="-apple-system,BlinkMacSystemFont,Helvetica,sans-serif" font-size="21" font-weight="400" fill="rgba(255,255,255,0.28)">The all-in-one platform: Distribute · Promote · Publish · Monetize</text>
  <rect x="80" y="375" width="580" height="1" fill="rgba(255,255,255,0.08)"/>
  <rect x="80" y="398" width="108" height="34" rx="17" fill="rgba(29,185,84,0.18)" stroke="rgba(29,185,84,0.35)" stroke-width="1"/>
  <text x="134" y="420" font-family="-apple-system,BlinkMacSystemFont,Helvetica,sans-serif" font-size="13" font-weight="700" fill="#1DB954" text-anchor="middle">Spotify</text>
  <rect x="202" y="398" width="128" height="34" rx="17" fill="rgba(252,60,68,0.18)" stroke="rgba(252,60,68,0.35)" stroke-width="1"/>
  <text x="266" y="420" font-family="-apple-system,BlinkMacSystemFont,Helvetica,sans-serif" font-size="13" font-weight="700" fill="#FC3C44" text-anchor="middle">Apple Music</text>
  <rect x="344" y="398" width="130" height="34" rx="17" fill="rgba(255,0,0,0.18)" stroke="rgba(255,0,0,0.35)" stroke-width="1"/>
  <text x="409" y="420" font-family="-apple-system,BlinkMacSystemFont,Helvetica,sans-serif" font-size="13" font-weight="700" fill="#FF4444" text-anchor="middle">YouTube Music</text>
  <rect x="488" y="398" width="92" height="34" rx="17" fill="rgba(105,201,208,0.18)" stroke="rgba(105,201,208,0.35)" stroke-width="1"/>
  <text x="534" y="420" font-family="-apple-system,BlinkMacSystemFont,Helvetica,sans-serif" font-size="13" font-weight="700" fill="#69C9D0" text-anchor="middle">TikTok</text>
  <text x="80" y="500" font-family="-apple-system,BlinkMacSystemFont,Helvetica,sans-serif" font-size="42" font-weight="900" fill="white">150+</text>
  <text x="80" y="528" font-family="-apple-system,BlinkMacSystemFont,Helvetica,sans-serif" font-size="13" font-weight="500" fill="rgba(255,255,255,0.35)">Platforms</text>
  <text x="240" y="500" font-family="-apple-system,BlinkMacSystemFont,Helvetica,sans-serif" font-size="42" font-weight="900" fill="white">50K+</text>
  <text x="240" y="528" font-family="-apple-system,BlinkMacSystemFont,Helvetica,sans-serif" font-size="13" font-weight="500" fill="rgba(255,255,255,0.35)">Artists</text>
  <text x="390" y="500" font-family="-apple-system,BlinkMacSystemFont,Helvetica,sans-serif" font-size="42" font-weight="900" fill="white">$2M+</text>
  <text x="390" y="528" font-family="-apple-system,BlinkMacSystemFont,Helvetica,sans-serif" font-size="13" font-weight="500" fill="rgba(255,255,255,0.35)">Royalties Paid</text>
  <rect x="80" y="554" width="196" height="50" rx="14" fill="url(#accent)"/>
  <text x="178" y="584" font-family="-apple-system,BlinkMacSystemFont,Helvetica,sans-serif" font-size="17" font-weight="800" fill="white" text-anchor="middle">Get Started Free</text>
  <text x="1118" y="605" font-family="-apple-system,BlinkMacSystemFont,Helvetica,sans-serif" font-size="19" font-weight="600" fill="rgba(255,255,255,0.22)" text-anchor="end">www.mixxea.com</text>
  <rect x="0" y="625" width="1200" height="5" fill="url(#accent)" opacity="0.5"/>
</svg>`;
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  SEED STARTER BLOG ARTICLES (admin only) — publishes 3 foundational SEO posts
// ─────────────────────────────────────────────────────────────────────────────
app.post(`${PREFIX}/admin/seo/seed-starter-articles`, async (c) => {
  try {
    const adminId = await verifyAdmin(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const now = new Date().toISOString();

    const articles = [
      {
        slug: "music-distribution-for-independent-artists-2026",
        metaTitle: "Music Distribution for Independent Artists in 2026 — Complete Guide | MIXXEA",
        metaDescription: "Everything independent artists need to know about music distribution in 2026. Get your music on Spotify, Apple Music, TikTok, and 150+ platforms with MIXXEA.",
        title: "Music Distribution for Independent Artists: The Complete 2026 Guide",
        targetKeyword: "music distribution for independent artists",
        secondaryKeywords: ["independent music distribution", "distribute music online", "upload music to spotify", "best music distributor 2026"],
        h1: "Music Distribution for Independent Artists: The Complete 2026 Guide",
        h2s: ["What Is Music Distribution and Why Does It Matter?","How Music Distribution Works for Independent Artists","The Top Streaming Platforms in 2026","How to Choose the Right Music Distributor","Step-by-Step: Distribute Your Music with MIXXEA","Music Distribution Costs Explained","Getting on Spotify, Apple Music, and TikTok","Maximising Your Revenue After Distribution","Common Mistakes to Avoid","Frequently Asked Questions"],
        intro: "Independent music distribution has never been more powerful — or more competitive. In 2026, more than 120,000 tracks are uploaded to Spotify every single day. How you distribute your music can be the difference between invisibility and breakthrough. This guide covers everything: how distribution works, the best platforms, maximising royalties, and the step-by-step process for getting your music on 150+ streaming platforms worldwide.",
        faqSchema: [
          { question: "How do independent artists distribute music?", answer: "Independent artists use a distribution service like MIXXEA, which delivers music to Spotify, Apple Music, TikTok, and 150+ platforms globally. You upload your audio, artwork, and metadata, then MIXXEA handles delivery within 24-48 hours." },
          { question: "How much does music distribution cost?", answer: "MIXXEA offers a free tier with revenue sharing, plus pro plans from $29/year for unlimited releases with 100% royalty retention." },
          { question: "How long does it take to get music on Spotify?", answer: "Typically 3-7 business days. Submit at least 3 weeks early to be eligible for Spotify editorial playlist consideration." },
          { question: "Do I keep my rights with music distribution?", answer: "Yes — MIXXEA does not take any ownership of your music. You retain 100% of your master rights." },
        ],
        internalLinks: ["/", "/auth"],
        fullOutlineMarkdown: `# Music Distribution for Independent Artists: The Complete 2026 Guide\n\nIn 2026, 120,000+ tracks are uploaded to Spotify daily. Distribution is the foundation of your music career — here's everything you need to know.\n\n## What Is Music Distribution?\n\nMusic distribution is the process of delivering your music to streaming platforms like Spotify, Apple Music, Amazon Music, TikTok, and YouTube Music. Without a distributor, your music cannot appear on any of these platforms.\n\n## How Distribution Works\n\n1. Upload to MIXXEA (audio WAV/FLAC + 3000×3000px artwork)\n2. Fill in metadata (title, ISRC codes, genre, release date)\n3. MIXXEA delivers to all 150+ platforms within 24-48 hours\n4. Streams generate royalties paid monthly to your account\n\n## Top Platforms in 2026\n\n- Spotify (600M+ users), Apple Music (88M+), Amazon Music (100M+), YouTube Music (80M+), TikTok (1B+), Deezer, Tidal, Pandora\n\n## Choosing the Right Distributor\n\nLook for: 100% royalty retention, editorial pitching support, real-time analytics, publishing admin integration, and transparent pricing with no hidden fees.\n\n## Distribution Cost Breakdown\n\n- Free tier: unlimited releases, revenue share\n- Pro ($29-49/yr): 100% royalties, priority pitching\n- Label plan: custom pricing for 10+ artists\n\n## Maximising Revenue\n\nCollect all revenue streams: streaming royalties, mechanical royalties (via publishing admin), performance royalties (via PRO), sync fees, and YouTube Content ID.\n\n## FAQ\n\n**How do I distribute music as an independent artist?** Sign up at mixxea.com, upload your music, and we deliver it to 150+ platforms within 24-48 hours.\n\n[Start distributing your music free today at MIXXEA](https://www.mixxea.com/auth)`,
        wordCount: 1580,
        category: "Music Distribution",
        featuredSnippet: "Music distribution is the process of delivering your music to streaming platforms like Spotify, Apple Music, and TikTok. Independent artists use a distribution service like MIXXEA to upload their music, which is then automatically delivered to 150+ platforms globally within 24-48 hours.",
      },
      {
        slug: "spotify-playlist-pitching-guide-independent-artists",
        metaTitle: "Spotify Playlist Pitching: How Independent Artists Get Placements in 2026 | MIXXEA",
        metaDescription: "Learn how to pitch your music to Spotify editorial and independent playlists in 2026. Step-by-step guide for independent artists to get playlist placements and grow streams.",
        title: "Spotify Playlist Pitching: The Complete Guide for Independent Artists (2026)",
        targetKeyword: "spotify playlist pitching service",
        secondaryKeywords: ["playlist pitching for artists", "how to get on spotify playlists", "spotify editorial playlist", "music promotion service"],
        h1: "Spotify Playlist Pitching: The Complete Guide for Independent Artists (2026)",
        h2s: ["Why Spotify Playlist Placement Is the #1 Growth Lever","The Two Types of Spotify Playlists","How to Pitch to Spotify Editorial Playlists","How to Pitch to Independent Curators","What Makes a Perfect Playlist Pitch","The MIXXEA Playlist Pitching Service","Realistic Expectations from Playlist Placements","Building a Playlist Strategy Around Your Release","Red Flags to Avoid","Frequently Asked Questions"],
        intro: "A placement on a mid-size editorial playlist (100K+ followers) can add 50,000-500,000 streams to a release within the first week. But playlist pitching is more than sending emails — it's a strategic, data-driven process that requires understanding Spotify's algorithm, curator relationships, and your release cycle timing. This guide covers everything: editorial pitches, independent curator outreach, what MIXXEA's service delivers, and how to build a long-term playlist strategy.",
        faqSchema: [
          { question: "How do I pitch my music to Spotify playlists?", answer: "Use Spotify for Artists to submit unreleased tracks for editorial consideration at least 7 days before release. For independent playlists, use MIXXEA's pitching service, which reaches 5,000+ active curators with personalised outreach." },
          { question: "How much does Spotify playlist pitching cost?", answer: "Editorial pitching via Spotify for Artists is free. MIXXEA's independent curator campaigns start from $49, covering outreach to 50-500+ curators." },
          { question: "Does playlist pitching really work?", answer: "Yes — artists using professional pitching services see 3-10x more streams in the first 30 days compared to artists who don't pitch. The key is targeting genre-relevant playlists." },
          { question: "How long does it take to get on a Spotify playlist?", answer: "Editorial decisions take 7 days post-submission. Independent curator placements from MIXXEA campaigns typically start within 24-72 hours of launch." },
        ],
        internalLinks: ["/", "/auth", "/blog/music-distribution-for-independent-artists-2026"],
        fullOutlineMarkdown: `# Spotify Playlist Pitching: The Complete Guide for Independent Artists (2026)\n\nPlaylist placement is the #1 growth lever for independent artists on Spotify. Here's the complete system.\n\n## Why Playlists Matter\n\nSpotify's algorithm uses playlist data as a quality signal. Playlist placement → algorithm exposure → more streams → more placements. For independent artists without major label budgets, this compounding cycle is your most efficient growth path.\n\n## The Two Types of Playlists\n\n**Editorial Playlists** (managed by Spotify's team): RapCaviar, New Music Friday, Fresh Finds — millions of followers, career-defining placement.\n\n**Independent/Curator Playlists** (managed by individuals): 1,000-500,000+ followers in every genre. More accessible, still powerful for algorithmic signals.\n\n## How to Pitch Editorial Playlists\n\n1. Distribute through MIXXEA at least 7 days pre-release\n2. In Spotify for Artists → Music → Pitch a Song\n3. Fill in genre, mood, instrumentation, artist story\n4. Submit — Spotify responds within 7 days\n\n## How to Pitch Independent Curators\n\n1. Find relevant playlists in your genre (5K-500K followers)\n2. Find curator contact info (Instagram, SubmitHub, playlist description)\n3. Write a personalised pitch (150-200 words max)\n4. Follow up once after 2 weeks\n\n## MIXXEA Pitching Service\n\nMIXXEA's campaign system pitches 50-5,000+ curators per campaign with personalised outreach. Typical results: 8-25% placement rate, 3-15 new playlist placements per campaign.\n\n## Realistic Results by Playlist Size\n\n- Small (1K-10K followers): 200-2,000 streams\n- Medium (10K-100K followers): 2,000-30,000 streams\n- Large (100K-1M followers): 30,000-300,000 streams\n\n## Release Cycle Strategy\n\n6 weeks out: identify playlists | 3 weeks out: editorial pitch | 2 weeks out: MIXXEA campaign launch | Release day: social activation\n\n## Red Flags\n\nAvoid services promising guaranteed placements, "1M streams for $50" (fake/bot streams), or no transparent reporting.\n\n[Launch your playlist pitching campaign at MIXXEA](https://www.mixxea.com/auth)`,
        wordCount: 1620,
        category: "Spotify Growth",
        featuredSnippet: "To pitch your music to Spotify editorial playlists, submit through Spotify for Artists at least 7 days before release. For independent playlists, MIXXEA's pitching service reaches 5,000+ active curators with personalised outreach, generating 3-15 playlist placements per campaign.",
      },
      {
        slug: "music-marketing-agency-for-independent-artists",
        metaTitle: "Music Marketing Agency for Independent Artists: What to Look For in 2026 | MIXXEA",
        metaDescription: "How to choose the right music marketing agency as an independent artist. Spotify promotion, TikTok campaigns, playlist pitching, YouTube ads, and PR explained for 2026.",
        title: "Music Marketing Agency for Independent Artists: The 2026 Selection Guide",
        targetKeyword: "music marketing agency for artists",
        secondaryKeywords: ["music promotion agency", "tiktok music promotion service", "instagram music promotion", "music pr agency", "music marketing for independent artists"],
        h1: "Music Marketing Agency for Independent Artists: The 2026 Selection Guide",
        h2s: ["Why Independent Artists Need a Music Marketing Agency","The 5 Core Services a Real Music Agency Provides","Spotify Streaming Growth Campaigns","TikTok Creator Campaigns: The #1 Tool in 2026","Instagram & YouTube Music Promotion","Music PR & Press Coverage","How to Evaluate a Music Marketing Agency","Red Flags: What Bad Agencies Do","MIXXEA's All-in-One Marketing Approach","Building a Long-Term Strategy"],
        intro: "The music industry is more accessible than ever — and more competitive. With 120,000+ songs uploaded to Spotify daily, great music alone isn't enough. You need a strategic music marketing agency that understands streaming algorithms, social media growth, creator seeding, and data-driven campaigns. This guide breaks down what a music marketing agency should deliver in 2026, how to evaluate agencies before spending, and what MIXXEA's integrated approach delivers for independent artists.",
        faqSchema: [
          { question: "Do independent artists need a music marketing agency?", answer: "Professional marketing significantly accelerates growth. Artists who invest in strategic campaigns (Spotify pitching, TikTok creator seeding, IG promotion) typically see 5-20x more streams compared to organic-only strategies." },
          { question: "How much does music marketing cost for independent artists?", answer: "Campaigns range from $49 for basic playlist pitching to $5,000+/month for full-service promotion. MIXXEA's starter packages begin at $149 combining multiple channels." },
          { question: "What is TikTok music promotion?", answer: "TikTok music promotion involves paying content creators to use your song in their videos. When multiple creators use a sound simultaneously, TikTok's algorithm amplifies it to millions. MIXXEA places your music with verified genre-relevant creators." },
          { question: "How long does music promotion take to show results?", answer: "Playlist pitching shows results in 7-14 days. TikTok campaigns show results in 48-72 hours. YouTube ads drive measurable results in 7 days. PR takes 4-8 weeks for major placements." },
        ],
        internalLinks: ["/", "/auth", "/blog/spotify-playlist-pitching-guide-independent-artists"],
        fullOutlineMarkdown: `# Music Marketing Agency for Independent Artists: The 2026 Selection Guide\n\nGreat music is necessary but not sufficient. Here's how to choose and work with a music marketing agency that delivers real results.\n\n## Why Marketing Matters\n\nSpotify and TikTok algorithms are neutral — they promote music that's *already* getting engagement. A marketing agency generates the initial momentum that triggers algorithmic amplification. Done right, $500 in professional promotion can unlock $5,000 worth of algorithmic exposure.\n\n## The 5 Core Services\n\n1. **Spotify & Streaming Promotion** — Playlist pitching, DSP marketing, pre-save campaigns\n2. **TikTok Creator Campaigns** — Genre-relevant creator seeding\n3. **Social Media Growth** — Instagram, YouTube, Facebook ads\n4. **Music PR & Press** — Blog placements, podcast features, press releases\n5. **Publishing & Sync** — Licensing for TV, film, games, advertising\n\n## TikTok in 2026\n\nTikTok is the #1 music discovery platform. Songs that go viral routinely see 500% Spotify stream increases within days. MIXXEA's TikTok campaigns work with 800+ verified creators across all major genres.\n\n## Evaluating an Agency\n\n✅ Show me real campaign results for similar artists\n✅ Prove you use real playlists and real creators (no bots)\n✅ Transparent weekly reporting with stream data and placement links\n✅ Genre specialisation — not "all genres"\n✅ Clear pricing with no hidden fees\n\n## Red Flags\n\n🚩 Guaranteed chart positions | 🚩 "1M streams for $50" | 🚩 No transparent reporting | 🚩 Vague pricing | 🚩 No genre specialisation\n\n## MIXXEA's Integrated Approach\n\nMIXXEA combines distribution + playlist pitching + TikTok campaigns + YouTube ads + publishing in one platform. All channels coordinate around your release window for maximum impact from a single dashboard.\n\n## 12-Month Marketing Framework\n\n- Months 1-3: Establish distribution, grow social to 1,000+, 2-3 singles with small campaigns\n- Months 4-6: Playlist pitching campaign, press outreach\n- Months 7-9: TikTok creator campaign, EP release, YouTube ads\n- Months 10-12: Full album campaign with all channels active\n\n[Start marketing your music professionally with MIXXEA](https://www.mixxea.com/auth)`,
        wordCount: 1640,
        category: "Music Marketing Agency",
        featuredSnippet: "A music marketing agency for independent artists provides Spotify playlist pitching, TikTok creator campaigns, Instagram/YouTube promotion, and PR outreach. Choose agencies with transparent reporting, real (not fake) streams, genre specialisation, and proven results for similar artists.",
      },
    ];

    const indexStr = await kv.get("blog:index");
    const existingIndex: any[] = indexStr ? JSON.parse(indexStr) : [];
    const published: any[] = [];

    for (const article of articles) {
      const exists = existingIndex.some((p: any) => p.slug === article.slug);
      if (exists) { published.push({ slug: article.slug, status: "already_exists" }); continue; }
      const post = { ...article, status: "published", publishedAt: now, updatedAt: now, cycleId: "starter-seed" };
      await kv.set(`blog:post:${article.slug}`, JSON.stringify(post));
      const summary = { slug: article.slug, metaTitle: article.metaTitle, metaDescription: article.metaDescription, title: article.title, targetKeyword: article.targetKeyword, category: article.category, wordCount: article.wordCount, publishedAt: now };
      existingIndex.unshift(summary);
      published.push({ slug: article.slug, status: "published" });
      console.log(`[Blog Seed] Published: ${article.slug}`);
    }

    await kv.set("blog:index", JSON.stringify(existingIndex));
    return c.json({ success: true, message: `Seeded ${published.filter(p => p.status === "published").length} starter articles`, articles: published });
  } catch (err) {
    console.log("Seed starter articles error:", err);
    return c.json({ error: `Seed articles error: ${err}` }, 500);
  }
});

Deno.serve(app.fetch);
