// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — Admin Operations Extension
//  Mounts all agency-ops routes onto the main Hono app
//  Routes: orders, pitches, curator network, placements, announcements,
//          promo codes, website content, reports, marketing emails, revenue
// ─────────────────────────────────────────────────────────────────────────────
import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";

// ── Re-implement HMAC token verification (mirrors index.tsx) ──────────────────
const SESSION_SECRET = Deno.env.get("MIXXEA_SESSION_SECRET") || "mixxea_session_secret_v2_2024";
let _hmacKey: CryptoKey | null = null;
async function getHmacKey(): Promise<CryptoKey> {
  if (_hmacKey) return _hmacKey;
  _hmacKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(SESSION_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
  return _hmacKey;
}
async function verifyHmac(token: string): Promise<string | null> {
  try {
    if (!token.startsWith("v2.")) return null;
    const inner = token.slice(3);
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
    return valid ? userId : null;
  } catch { return null; }
}

async function verifyAdminRequest(c: any): Promise<string | null> {
  const custom = c.req.header("X-MIXXEA-Token");
  let userId: string | null = null;
  if (custom) {
    userId = await verifyHmac(custom);
    if (!userId) { const leg = await kv.get(`session:${custom}`); if (leg) userId = leg; }
  }
  if (!userId) {
    const auth = c.req.header("Authorization");
    if (auth?.startsWith("Bearer ")) {
      const t = auth.split(" ")[1];
      userId = await verifyHmac(t);
      if (!userId) { const leg = await kv.get(`session:${t}`); if (leg) userId = leg; }
    }
  }
  if (!userId) return null;
  const userStr = await kv.get(`user:${userId}`);
  if (!userStr) return null;
  const user = JSON.parse(userStr);
  return user.isAdmin ? userId : null;
}

export const adminOpsApp = new Hono();
const P = "/make-server-f4d1ffe4";

// ─────────────────────────────────────────────────────────────────────────────
//  UNIFIED ORDERS QUEUE
// ─────────────────────────────────────────────────────────────────────────────
adminOpsApp.get(`${P}/admin/orders`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);

    const [rawCampaigns, rawPitches, rawReleases] = await Promise.all([
      kv.getByPrefix("campaign:"),
      kv.getByPrefix("pitch:"),
      kv.getByPrefix("release:"),
    ]);

    const campaigns = rawCampaigns.map((s: string) => {
      try { const d = JSON.parse(s); return { ...d, _type: "campaign" }; } catch { return null; }
    }).filter(Boolean);

    const pitches = rawPitches.map((s: string) => {
      try { const d = JSON.parse(s); return { ...d, _type: "pitch" }; } catch { return null; }
    }).filter(Boolean);

    const releases = rawReleases.map((s: string) => {
      try { const d = JSON.parse(s); return { ...d, _type: "release" }; } catch { return null; }
    }).filter(Boolean).filter((r: any) => r.status !== "draft");

    // Enrich with user info
    const enrich = async (item: any) => {
      const uid = item.userId || item.artistId;
      if (!uid) return item;
      const uStr = await kv.get(`user:${uid}`);
      if (!uStr) return item;
      const u = JSON.parse(uStr);
      return { ...item, userName: u.name, userEmail: u.email, userRole: u.role, userPlan: u.plan };
    };

    const all = await Promise.all([...campaigns, ...pitches, ...releases].map(enrich));
    const sorted = all.sort((a: any, b: any) => new Date(b.createdAt || b.submittedAt || 0).getTime() - new Date(a.createdAt || a.submittedAt || 0).getTime());

    return c.json({ orders: sorted });
  } catch (err) {
    console.log("[admin/orders] Error:", err);
    return c.json({ error: `Orders fetch error: ${err}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  ACTIVITY LOG (per order)
// ─────────────────────────────────────────────────────────────────────────────
adminOpsApp.get(`${P}/admin/orders/:id/activity`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const { id } = c.req.param();
    const logStr = await kv.get(`activity:${id}`);
    return c.json({ log: logStr ? JSON.parse(logStr) : [] });
  } catch (err) { return c.json({ error: `Activity fetch error: ${err}` }, 500); }
});

adminOpsApp.post(`${P}/admin/orders/:id/activity`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const { id } = c.req.param();
    const body = await c.req.json();
    const logStr = await kv.get(`activity:${id}`);
    const log = logStr ? JSON.parse(logStr) : [];
    const entry = { id: crypto.randomUUID(), action: body.action, note: body.note || "", adminId, createdAt: new Date().toISOString() };
    log.unshift(entry);
    await kv.set(`activity:${id}`, JSON.stringify(log.slice(0, 100)));
    return c.json({ entry });
  } catch (err) { return c.json({ error: `Activity log error: ${err}` }, 500); }
});

// ──────��──────────────────────────────────────────────────────────────────────
//  EXECUTION CHECKLIST (per order)
// ─────────────────────────────────────────────────────────────────────────────
adminOpsApp.get(`${P}/admin/orders/:id/checklist`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const { id } = c.req.param();
    const str = await kv.get(`checklist:${id}`);
    return c.json({ checklist: str ? JSON.parse(str) : {} });
  } catch (err) { return c.json({ error: `Checklist fetch error: ${err}` }, 500); }
});

adminOpsApp.put(`${P}/admin/orders/:id/checklist`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const { id } = c.req.param();
    const body = await c.req.json();
    await kv.set(`checklist:${id}`, JSON.stringify(body));
    return c.json({ success: true });
  } catch (err) { return c.json({ error: `Checklist update error: ${err}` }, 500); }
});

// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN PITCH MANAGEMENT (all pitches, not per-user)
// ─────────────────────────────────────────────────────────────────────────────
adminOpsApp.get(`${P}/admin/pitches`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const raw = await kv.getByPrefix("pitch:");
    const pitches = (await Promise.all(raw.map(async (s: string) => {
      try {
        const p = JSON.parse(s);
        const uStr = await kv.get(`user:${p.artistId || p.userId}`);
        const u = uStr ? JSON.parse(uStr) : { name: "Unknown", email: "" };
        return { ...p, artistName: p.artistName || u.name, artistEmail: u.email, artistRole: u.role };
      } catch { return null; }
    }))).filter(Boolean).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ pitches });
  } catch (err) { return c.json({ error: `Admin pitches error: ${err}` }, 500); }
});

adminOpsApp.put(`${P}/admin/pitches/:id`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const { id } = c.req.param();
    const body = await c.req.json();
    const pitchStr = await kv.get(`pitch:${id}`);
    if (!pitchStr) return c.json({ error: "Pitch not found" }, 404);
    const pitch = JSON.parse(pitchStr);
    const updated = { ...pitch, ...body, updatedAt: new Date().toISOString() };
    await kv.set(`pitch:${id}`, JSON.stringify(updated));

    // Credit refund on rejection
    if (body.status === "rejected") {
      const uid = pitch.artistId || pitch.userId;
      if (uid && pitch.creditCost) {
        const uStr = await kv.get(`user:${uid}`);
        if (uStr) {
          const u = JSON.parse(uStr);
          u.credits = (u.credits || 0) + (pitch.creditCost || 0);
          await kv.set(`user:${uid}`, JSON.stringify(u));
        }
      }
    }

    // Notify artist via in-app notification
    const uid = pitch.artistId || pitch.userId;
    if (uid) {
      const notifStr = await kv.get(`notifications:${uid}`);
      const notifs = notifStr ? JSON.parse(notifStr) : [];
      notifs.unshift({
        id: crypto.randomUUID(), read: false,
        title: body.status === "accepted" ? `🎉 Pitch accepted — ${pitch.playlistName || "Playlist"}` : `Pitch update — ${pitch.playlistName || "Playlist"}`,
        message: body.status === "accepted" ? `Your track was added to ${pitch.playlistName}!${body.playlistUrl ? ` View: ${body.playlistUrl}` : ""}` : body.reason || "Your pitch was reviewed.",
        type: "pitch_update", createdAt: new Date().toISOString(),
      });
      await kv.set(`notifications:${uid}`, JSON.stringify(notifs.slice(0, 50)));
    }

    return c.json({ pitch: updated });
  } catch (err) { return c.json({ error: `Pitch update error: ${err}` }, 500); }
});

// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN CURATOR NETWORK (managed separately from user curators)
// ─────────────────────────────────────────────────────────────────────────────
adminOpsApp.get(`${P}/admin/curators-network`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const raw = await kv.getByPrefix("curator_net:");
    const curators = raw.map((s: string) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
    return c.json({ curators });
  } catch (err) { return c.json({ error: `Curators fetch error: ${err}` }, 500); }
});

adminOpsApp.post(`${P}/admin/curators-network`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const curator = {
      id, name: body.name, email: body.email || "",
      genres: body.genres || [], playlists: body.playlists || [],
      totalFollowers: body.totalFollowers || 0, acceptanceRate: body.acceptanceRate || 0,
      tier: body.tier || "standard", // standard | premium | editorial
      responseTime: body.responseTime || "3-5 days",
      status: "active", pitchesReceived: 0, pitchesAccepted: 0,
      instagramHandle: body.instagramHandle || "", spotifyUrl: body.spotifyUrl || "",
      notes: body.notes || "", createdAt: new Date().toISOString(),
    };
    await kv.set(`curator_net:${id}`, JSON.stringify(curator));
    return c.json({ curator });
  } catch (err) { return c.json({ error: `Curator add error: ${err}` }, 500); }
});

adminOpsApp.put(`${P}/admin/curators-network/:id`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const { id } = c.req.param();
    const body = await c.req.json();
    const str = await kv.get(`curator_net:${id}`);
    if (!str) return c.json({ error: "Curator not found" }, 404);
    const curator = { ...JSON.parse(str), ...body, updatedAt: new Date().toISOString() };
    await kv.set(`curator_net:${id}`, JSON.stringify(curator));
    return c.json({ curator });
  } catch (err) { return c.json({ error: `Curator update error: ${err}` }, 500); }
});

adminOpsApp.delete(`${P}/admin/curators-network/:id`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const { id } = c.req.param();
    await kv.del(`curator_net:${id}`);
    return c.json({ success: true });
  } catch (err) { return c.json({ error: `Curator delete error: ${err}` }, 500); }
});

// ─────────────────────────────────────────────────────────────────────────────
//  PLAYLIST PLACEMENTS TRACKER
// ─────────────────────────────────────────────────────────────────────────────
adminOpsApp.get(`${P}/admin/placements`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const raw = await kv.getByPrefix("placement:");
    const placements = raw.map((s: string) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ placements });
  } catch (err) { return c.json({ error: `Placements error: ${err}` }, 500); }
});

adminOpsApp.post(`${P}/admin/placements`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const placement = { id, ...body, createdAt: new Date().toISOString() };
    await kv.set(`placement:${id}`, JSON.stringify(placement));
    return c.json({ placement });
  } catch (err) { return c.json({ error: `Placement create error: ${err}` }, 500); }
});

// ─────────────────────────────────────────────────────────────────────────────
//  ANNOUNCEMENTS (site-wide banners)
// ─────────────────────────────────────────────────────────────────────────────
adminOpsApp.get(`${P}/admin/announcements`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const raw = await kv.getByPrefix("announcement:");
    const announcements = raw.map((s: string) => { try { return JSON.parse(s); } catch { return null; } })
      .filter((a: any) => a && a.id)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ announcements });
  } catch (err) { return c.json({ error: `Announcements error: ${err}` }, 500); }
});

adminOpsApp.post(`${P}/admin/announcements`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const ann = {
      id, text: body.text, emoji: body.emoji || "📣",
      cta: body.cta || "", ctaUrl: body.ctaUrl || "",
      type: body.type || "info", // info | success | warning | promo
      active: body.active ?? true,
      expiresAt: body.expiresAt || null,
      createdAt: new Date().toISOString(),
    };
    await kv.set(`announcement:${id}`, JSON.stringify(ann));
    if (ann.active) await kv.set("announcement:active", JSON.stringify(ann));
    return c.json({ announcement: ann });
  } catch (err) { return c.json({ error: `Announcement create error: ${err}` }, 500); }
});

adminOpsApp.put(`${P}/admin/announcements/:id`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const { id } = c.req.param();
    const body = await c.req.json();
    const str = await kv.get(`announcement:${id}`);
    if (!str) return c.json({ error: "Not found" }, 404);
    const ann = { ...JSON.parse(str), ...body, updatedAt: new Date().toISOString() };
    await kv.set(`announcement:${id}`, JSON.stringify(ann));
    if (ann.active) {
      await kv.set("announcement:active", JSON.stringify(ann));
    } else {
      const activeStr = await kv.get("announcement:active");
      if (activeStr) { const a = JSON.parse(activeStr); if (a.id === id) await kv.del("announcement:active"); }
    }
    return c.json({ announcement: ann });
  } catch (err) { return c.json({ error: `Announcement update error: ${err}` }, 500); }
});

adminOpsApp.delete(`${P}/admin/announcements/:id`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const { id } = c.req.param();
    await kv.del(`announcement:${id}`);
    const activeStr = await kv.get("announcement:active");
    if (activeStr) { const a = JSON.parse(activeStr); if (a.id === id) await kv.del("announcement:active"); }
    return c.json({ success: true });
  } catch (err) { return c.json({ error: `Announcement delete error: ${err}` }, 500); }
});

// Public: active announcement
adminOpsApp.get(`${P}/announcements/active`, async (c) => {
  const str = await kv.get("announcement:active");
  if (!str) return c.json({ announcement: null });
  const ann = JSON.parse(str);
  if (ann.expiresAt && new Date(ann.expiresAt) < new Date()) {
    await kv.del("announcement:active"); return c.json({ announcement: null });
  }
  return c.json({ announcement: ann });
});

// ─────────────────────────────────────────────────────────────────────────────
//  PROMO CODES
// ─────────────────────────────────────────────────────────────────────────────
adminOpsApp.get(`${P}/admin/promo-codes`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const raw = await kv.getByPrefix("promo:");
    const promos = raw.map((s: string) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ promos });
  } catch (err) { return c.json({ error: `Promo codes error: ${err}` }, 500); }
});

adminOpsApp.post(`${P}/admin/promo-codes`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const body = await c.req.json();
    const code = (body.code || Math.random().toString(36).slice(2, 8)).toUpperCase();
    const existing = await kv.get(`promo:${code}`);
    if (existing) return c.json({ error: "Code already exists" }, 409);
    const promo = {
      code, type: body.type || "credits", // credits | discount_pct | free_plan
      value: body.value || 100, maxUses: body.maxUses || 100, uses: 0,
      expiresAt: body.expiresAt || null, description: body.description || "",
      active: true, createdAt: new Date().toISOString(),
    };
    await kv.set(`promo:${code}`, JSON.stringify(promo));
    return c.json({ promo });
  } catch (err) { return c.json({ error: `Promo code create error: ${err}` }, 500); }
});

adminOpsApp.delete(`${P}/admin/promo-codes/:code`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    await kv.del(`promo:${c.req.param("code").toUpperCase()}`);
    return c.json({ success: true });
  } catch (err) { return c.json({ error: `Promo code delete error: ${err}` }, 500); }
});

// Public validate
adminOpsApp.get(`${P}/promo-codes/:code/validate`, async (c) => {
  const str = await kv.get(`promo:${c.req.param("code").toUpperCase()}`);
  if (!str) return c.json({ valid: false, error: "Code not found" });
  const p = JSON.parse(str);
  if (!p.active) return c.json({ valid: false, error: "Code is inactive" });
  if (p.expiresAt && new Date(p.expiresAt) < new Date()) return c.json({ valid: false, error: "Code expired" });
  if (p.uses >= p.maxUses) return c.json({ valid: false, error: "Code limit reached" });
  return c.json({ valid: true, promo: { code: p.code, type: p.type, value: p.value, description: p.description } });
});

// ─────────────────────────────────────────────────────────────────────────────
//  WEBSITE CONTENT (editable from admin, read by landing page)
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_CONTENT = {
  hero: { headline: "Distribute. Promote. Publish.", subheadline: "The all-in-one music platform for artists, labels, and creators ready to grow.", ctaText: "Start for Free", ctaUrl: "/auth" },
  stats: [{ label: "Platforms", value: "70+" }, { label: "Artists", value: "10,000+" }, { label: "Releases", value: "50,000+" }, { label: "Countries", value: "150+" }],
  testimonials: [
    { id: "1", name: "Marcus J.", role: "Independent Artist", text: "MIXXEA changed how I release music. My last single hit 3 playlists in the first week.", avatar: "" },
    { id: "2", name: "Priya S.", role: "Label Manager", text: "Managing 12 artists from one dashboard is exactly what we needed.", avatar: "" },
    { id: "3", name: "DJ Kalani", role: "Electronic Producer", text: "The TikTok UGC campaign got my track 2M views in 10 days. Nothing else compares.", avatar: "" },
  ],
  faqs: [
    { id: "1", q: "How fast are releases distributed?", a: "Releases typically go live within 24–72 hours across all selected platforms." },
    { id: "2", q: "Do you take royalties?", a: "Never. You keep 100% of your royalties. We charge a flat subscription fee only." },
    { id: "3", q: "Can labels manage multiple artists?", a: "Yes. The Pro plan supports unlimited artists under one label dashboard." },
  ],
  updatedAt: new Date().toISOString(),
};

adminOpsApp.get(`${P}/admin/website-content`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const str = await kv.get("website:content");
    return c.json({ content: str ? JSON.parse(str) : DEFAULT_CONTENT });
  } catch (err) { return c.json({ error: `Website content error: ${err}` }, 500); }
});

adminOpsApp.put(`${P}/admin/website-content`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const body = await c.req.json();
    const str = await kv.get("website:content");
    const existing = str ? JSON.parse(str) : DEFAULT_CONTENT;
    const updated = { ...existing, ...body, updatedAt: new Date().toISOString() };
    await kv.set("website:content", JSON.stringify(updated));
    return c.json({ content: updated });
  } catch (err) { return c.json({ error: `Website content update error: ${err}` }, 500); }
});

// Public
adminOpsApp.get(`${P}/website-content`, async (c) => {
  const str = await kv.get("website:content");
  return c.json({ content: str ? JSON.parse(str) : DEFAULT_CONTENT });
});

// ─────────────────────────────────────────────────────────────────────────────
//  CLIENT REPORTS
// ─────────────────────────────────────────────────────────────────────────────
adminOpsApp.get(`${P}/admin/reports`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const raw = await kv.getByPrefix("report:");
    const reports = raw.map((s: string) => { try { return JSON.parse(s); } catch { return null; } })
      .filter((r: any) => r && r.id)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ reports });
  } catch (err) { return c.json({ error: `Reports error: ${err}` }, 500); }
});

adminOpsApp.post(`${P}/admin/reports`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const shareToken = crypto.randomUUID();
    const report = {
      id, shareToken,
      campaignId: body.campaignId || null, campaignName: body.campaignName || "",
      clientId: body.clientId || null, clientName: body.clientName || "",
      clientEmail: body.clientEmail || "", serviceName: body.serviceName || "",
      period: body.period || "", metrics: body.metrics || {},
      placements: body.placements || [], contentLinks: body.contentLinks || [],
      highlights: body.highlights || [], notes: body.notes || "",
      sentAt: null, createdAt: new Date().toISOString(),
    };
    await kv.set(`report:${id}`, JSON.stringify(report));
    await kv.set(`report_token:${shareToken}`, id);
    return c.json({ report });
  } catch (err) { return c.json({ error: `Report create error: ${err}` }, 500); }
});

adminOpsApp.get(`${P}/admin/reports/:id`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const str = await kv.get(`report:${c.req.param("id")}`);
    if (!str) return c.json({ error: "Report not found" }, 404);
    return c.json({ report: JSON.parse(str) });
  } catch (err) { return c.json({ error: `Report fetch error: ${err}` }, 500); }
});

adminOpsApp.post(`${P}/admin/reports/:id/send`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const str = await kv.get(`report:${c.req.param("id")}`);
    if (!str) return c.json({ error: "Report not found" }, 404);
    const report = JSON.parse(str);
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY && report.clientEmail) {
      const shareUrl = `https://www.mixxea.com/report/${report.shareToken}`;
      const metricsHtml = Object.entries(report.metrics || {}).map(([k, v]) =>
        `<div style="display:inline-block;background:#111;border:1px solid #333;border-radius:12px;padding:16px 24px;margin:8px;text-align:center"><div style="font-size:28px;font-weight:900;color:#00C4FF">${v}</div><div style="font-size:12px;color:#888;margin-top:4px">${k}</div></div>`
      ).join("");
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "MIXXEA Agency <onboarding@mixxea.com>",
          to: [report.clientEmail],
          subject: `📊 Your ${report.serviceName} Campaign Report — MIXXEA`,
          html: `<div style="font-family:sans-serif;background:#000;color:#fff;padding:32px;max-width:600px;margin:0 auto">
            <div style="background:linear-gradient(135deg,#00C4FF,#7B5FFF,#D63DF6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-size:28px;font-weight:900;letter-spacing:3px;margin-bottom:8px">MIXXEA</div>
            <h2 style="color:#fff;margin-bottom:4px">${report.serviceName} Campaign Report</h2>
            <p style="color:#888;margin-bottom:24px">Hi ${report.clientName}, here are your campaign results.</p>
            <div style="margin-bottom:24px">${metricsHtml}</div>
            ${report.highlights.length ? `<div style="background:#111;border-radius:12px;padding:20px;margin-bottom:20px"><h3 style="color:#D63DF6;margin-top:0">Highlights</h3><ul style="color:#ccc;margin:0;padding-left:16px">${report.highlights.map((h: string) => `<li style="margin-bottom:8px">${h}</li>`).join("")}</ul></div>` : ""}
            ${report.notes ? `<p style="color:#888;font-size:14px;line-height:1.6">${report.notes}</p>` : ""}
            <a href="${shareUrl}" style="display:inline-block;background:linear-gradient(135deg,#7B5FFF,#D63DF6);color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:700;margin-top:20px">View Full Report →</a>
            <p style="color:#444;font-size:12px;margin-top:32px">MIXXEA Agency · onboarding@mixxea.com · mixxea.com</p>
          </div>`,
        }),
      });
    }
    report.sentAt = new Date().toISOString();
    await kv.set(`report:${report.id}`, JSON.stringify(report));
    return c.json({ success: true, report });
  } catch (err) { return c.json({ error: `Report send error: ${err}` }, 500); }
});

// Public: view report by share token
adminOpsApp.get(`${P}/reports/:token`, async (c) => {
  try {
    const reportId = await kv.get(`report_token:${c.req.param("token")}`);
    if (!reportId) return c.json({ error: "Report not found" }, 404);
    const str = await kv.get(`report:${reportId}`);
    if (!str) return c.json({ error: "Report not found" }, 404);
    return c.json({ report: JSON.parse(str) });
  } catch (err) { return c.json({ error: `Report view error: ${err}` }, 500); }
});

// ─────────────────────────────────────────────────────────────────────────────
//  MARKETING — MASS EMAIL
// ─────────────────────────────────────────────────────────────────────────────
adminOpsApp.post(`${P}/admin/marketing/email`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const body = await c.req.json();
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) return c.json({ error: "Email not configured" }, 503);

    const raw = await kv.getByPrefix("user:");
    let users = raw.map((s: string) => { try { return JSON.parse(s); } catch { return null; } })
      .filter((u: any) => u && u.email);

    const seg = body.segment;
    if (seg && seg !== "all") {
      if (seg === "artists") users = users.filter((u: any) => u.role === "artist");
      else if (seg === "labels") users = users.filter((u: any) => u.role === "label");
      else if (seg === "curators") users = users.filter((u: any) => u.role === "curator");
      else if (seg === "growth") users = users.filter((u: any) => u.plan === "growth");
      else if (seg === "pro") users = users.filter((u: any) => u.plan === "pro");
      else if (seg === "starter") users = users.filter((u: any) => !u.plan || u.plan === "starter");
    }

    let sent = 0;
    for (const u of users.slice(0, 500)) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "MIXXEA <onboarding@mixxea.com>",
            to: [u.email],
            subject: body.subject,
            html: `<div style="font-family:sans-serif;background:#000;color:#fff;padding:32px;max-width:600px">
              <div style="background:linear-gradient(135deg,#00C4FF,#7B5FFF,#D63DF6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-size:24px;font-weight:900;letter-spacing:3px;margin-bottom:16px">MIXXEA</div>
              <p style="color:#ccc">Hi ${u.name},</p>
              <div style="color:#ccc;line-height:1.7">${body.content}</div>
              <p style="color:#444;font-size:12px;margin-top:32px">You're receiving this as a MIXXEA member · <a href="https://www.mixxea.com" style="color:#7B5FFF">mixxea.com</a></p>
            </div>`,
          }),
        });
        if (res.ok) sent++;
      } catch { /* continue */ }
    }
    return c.json({ success: true, sent, total: users.length });
  } catch (err) { return c.json({ error: `Marketing email error: ${err}` }, 500); }
});

// ─────────────────────────────────────────────────────────────────────────────
//  REVENUE STATS
// ─────────────────────────────────────────────────────────────────────────────
adminOpsApp.get(`${P}/admin/revenue`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);

    const raw = await kv.getByPrefix("user:");
    const users = raw.map((s: string) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);

    const planCounts = { starter: 0, growth: 0, pro: 0 };
    let mrrCents = 0;
    const now = new Date();
    const thisMonth = users.filter((u: any) => {
      const d = new Date(u.joinedAt || 0);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    for (const u of users) {
      const plan = u.plan || "starter";
      if (plan === "growth") { planCounts.growth++; mrrCents += 3900; }
      else if (plan === "pro") { planCounts.pro++; mrrCents += 14900; }
      else planCounts.starter++;
    }

    // Credit purchase revenue
    const creditRaw = await kv.getByPrefix("credit_purchase:");
    const creditRevenueCents = creditRaw.reduce((sum: number, s: string) => {
      try { return sum + (JSON.parse(s).amountCents || 0); } catch { return sum; }
    }, 0);

    // Monthly MRR data (last 6 months estimated)
    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyMrr = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
      return { month: MONTHS[d.getMonth()], mrr: i === 5 ? mrrCents / 100 : (mrrCents / 100) * (0.6 + i * 0.08), credits: i === 5 ? creditRevenueCents / 100 : (creditRevenueCents / 100) * (0.5 + i * 0.1) };
    });

    const topUsers = users
      .filter((u: any) => u.plan && u.plan !== "starter")
      .sort((a: any, b: any) => {
        const planVal = (p: string) => p === "pro" ? 149 : p === "growth" ? 39 : 0;
        return planVal(b.plan) - planVal(a.plan);
      }).slice(0, 10)
      .map((u: any) => ({ id: u.id, name: u.name, email: u.email, plan: u.plan, role: u.role, credits: u.credits, joinedAt: u.joinedAt }));

    return c.json({
      totalUsers: users.length, newUsersThisMonth: thisMonth,
      planCounts, mrrCents, mrr: (mrrCents / 100).toFixed(2),
      creditRevenueCents, creditRevenue: (creditRevenueCents / 100).toFixed(2),
      totalRevenue: ((mrrCents + creditRevenueCents) / 100).toFixed(2),
      monthlyMrr, topUsers,
    });
  } catch (err) { return c.json({ error: `Revenue stats error: ${err}` }, 500); }
});

// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN PUSH NOTIFICATION (to specific user or all)
// ─────────────────────────────────────────────────────────────────────────────
adminOpsApp.post(`${P}/admin/notify`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const body = await c.req.json();
    const { userId, title, message, type, link } = body;

    const sendToUser = async (uid: string) => {
      const notifStr = await kv.get(`notifications:${uid}`);
      const notifs = notifStr ? JSON.parse(notifStr) : [];
      notifs.unshift({ id: crypto.randomUUID(), read: false, title, message, type: type || "admin", link: link || null, createdAt: new Date().toISOString() });
      await kv.set(`notifications:${uid}`, JSON.stringify(notifs.slice(0, 50)));
    };

    if (userId) {
      await sendToUser(userId);
    } else {
      const allUsersStr = await kv.get("users:all");
      const allIds: string[] = allUsersStr ? JSON.parse(allUsersStr) : [];
      await Promise.all(allIds.map(sendToUser));
    }

    return c.json({ success: true });
  } catch (err) { return c.json({ error: `Notify error: ${err}` }, 500); }
});

// ─────────────────────────────────────────────────────────────────────────────
//  CREATOR NETWORK — Multi-platform talent database
//  Covers: Spotify playlists, Apple playlists, TikTok, YouTube, Instagram,
//          Press/Blogs, Radio, Podcasts
// ─────────────────────────────────────────────────────────────────────────────
adminOpsApp.get(`${P}/admin/creator-network`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const raw = await kv.getByPrefix("creator:");
    const creators = raw
      .map((s: string) => { try { return JSON.parse(s); } catch { return null; } })
      .filter((c: any) => c && c.id)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ creators });
  } catch (err) { return c.json({ error: `Creator network fetch error: ${err}` }, 500); }
});

adminOpsApp.post(`${P}/admin/creator-network`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const creator = {
      id,
      platform: body.platform || "spotify_playlist", // spotify_playlist | apple_playlist | tiktok | youtube | instagram | press | radio | podcast
      name: body.name || "",
      handle: body.handle || "",
      email: body.email || "",
      profileUrl: body.profileUrl || "",
      followers: body.followers || 0,
      avgViews: body.avgViews || 0,           // for TikTok/YouTube/IG
      engagementRate: body.engagementRate || 0, // percentage
      genres: body.genres || [],
      niche: body.niche || "",               // e.g. "Lo-Fi Hip-Hop", "Music Reviews"
      country: body.country || "",
      language: body.language || "English",
      tier: body.tier || "standard",          // micro | standard | premium | elite
      costPerPost: body.costPerPost || 0,    // in USD
      costPerPlacement: body.costPerPlacement || 0,
      acceptanceRate: body.acceptanceRate || 0,
      avgResponseDays: body.avgResponseDays || 3,
      pastCampaigns: 0,
      totalReachDelivered: 0,
      notes: body.notes || "",
      contactName: body.contactName || "",
      status: "active",
      verified: body.verified || false,
      tags: body.tags || [],
      // Platform-specific
      playlistName: body.playlistName || "",         // Spotify/Apple
      playlistFollowers: body.playlistFollowers || 0,
      channelName: body.channelName || "",           // YouTube
      subscriberCount: body.subscriberCount || 0,
      avgVideoViews: body.avgVideoViews || 0,
      publicationName: body.publicationName || "",   // Press
      monthlyVisitors: body.monthlyVisitors || 0,
      domainAuthority: body.domainAuthority || 0,
      createdAt: new Date().toISOString(),
    };
    await kv.set(`creator:${id}`, JSON.stringify(creator));
    return c.json({ creator });
  } catch (err) { return c.json({ error: `Creator add error: ${err}` }, 500); }
});

adminOpsApp.put(`${P}/admin/creator-network/:id`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const { id } = c.req.param();
    const body = await c.req.json();
    const str = await kv.get(`creator:${id}`);
    if (!str) return c.json({ error: "Creator not found" }, 404);
    const creator = { ...JSON.parse(str), ...body, updatedAt: new Date().toISOString() };
    await kv.set(`creator:${id}`, JSON.stringify(creator));
    return c.json({ creator });
  } catch (err) { return c.json({ error: `Creator update error: ${err}` }, 500); }
});

adminOpsApp.delete(`${P}/admin/creator-network/:id`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    await kv.del(`creator:${c.req.param("id")}`);
    return c.json({ success: true });
  } catch (err) { return c.json({ error: `Creator delete error: ${err}` }, 500); }
});

// ─────────────────────────────────────────────────────────────────────────────
//  AD CAMPAIGN RUNNER — Admin-initiated paid campaigns
//  Platforms: Spotify Ads | YouTube Ads | Google Ads | TikTok Ads | Meta Ads
// ─────────────────────────────────────────────────────────────────────────────
adminOpsApp.get(`${P}/admin/ad-campaigns`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const raw = await kv.getByPrefix("adcampaign:");
    const campaigns = raw
      .map((s: string) => { try { return JSON.parse(s); } catch { return null; } })
      .filter((c: any) => c && c.id)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ campaigns });
  } catch (err) { return c.json({ error: `Ad campaigns fetch error: ${err}` }, 500); }
});

adminOpsApp.post(`${P}/admin/ad-campaigns`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const campaign = {
      id,
      name: body.name || "Untitled Campaign",
      platform: body.platform || "tiktok",  // spotify | youtube | google | tiktok | meta
      objective: body.objective || "awareness", // awareness | traffic | conversions | streams | followers
      status: "draft",                        // draft | launching | active | paused | completed
      // Client info (if for a user's music)
      clientId: body.clientId || null,
      clientName: body.clientName || "",
      trackTitle: body.trackTitle || "",
      artistName: body.artistName || "",
      // Budget
      budgetTotal: body.budgetTotal || 0,    // USD
      budgetDaily: body.budgetDaily || 0,
      spent: 0,
      // Schedule
      startDate: body.startDate || "",
      endDate: body.endDate || "",
      // Targeting
      geoTargets: body.geoTargets || [],     // ["US", "UK", "NG"]
      ageMin: body.ageMin || 18,
      ageMax: body.ageMax || 34,
      genders: body.genders || ["all"],
      interests: body.interests || [],
      languages: body.languages || ["English"],
      // Creatives
      creativeType: body.creativeType || "video", // video | image | audio | carousel
      creativeUrls: body.creativeUrls || [],      // URLs to ad assets
      adCopy: body.adCopy || "",
      headline: body.headline || "",
      ctaText: body.ctaText || "Listen Now",
      destinationUrl: body.destinationUrl || "",
      // Platform campaign ID (filled after launching on platform)
      platformCampaignId: body.platformCampaignId || "",
      platformAdSetId: body.platformAdSetId || "",
      // Performance
      performance: {
        impressions: 0, clicks: 0, spend: 0,
        ctr: 0, cpm: 0, cpc: 0, roas: 0,
        conversions: 0, streams: 0, followers: 0,
        videoViews: 0, reach: 0,
      },
      // Linked creators from creator network
      assignedCreators: body.assignedCreators || [],
      // Internal
      notes: body.notes || "",
      adminId,
      createdAt: new Date().toISOString(),
    };
    await kv.set(`adcampaign:${id}`, JSON.stringify(campaign));
    return c.json({ campaign });
  } catch (err) { return c.json({ error: `Ad campaign create error: ${err}` }, 500); }
});

adminOpsApp.put(`${P}/admin/ad-campaigns/:id`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const { id } = c.req.param();
    const body = await c.req.json();
    const str = await kv.get(`adcampaign:${id}`);
    if (!str) return c.json({ error: "Campaign not found" }, 404);
    const existing = JSON.parse(str);
    const updated = { ...existing, ...body, id, updatedAt: new Date().toISOString() };
    await kv.set(`adcampaign:${id}`, JSON.stringify(updated));
    return c.json({ campaign: updated });
  } catch (err) { return c.json({ error: `Ad campaign update error: ${err}` }, 500); }
});

adminOpsApp.put(`${P}/admin/ad-campaigns/:id/performance`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const { id } = c.req.param();
    const body = await c.req.json();
    const str = await kv.get(`adcampaign:${id}`);
    if (!str) return c.json({ error: "Campaign not found" }, 404);
    const existing = JSON.parse(str);
    const performance = { ...existing.performance, ...body };
    // Auto-compute derived metrics
    if (performance.impressions > 0 && performance.clicks > 0) {
      performance.ctr = parseFloat(((performance.clicks / performance.impressions) * 100).toFixed(2));
    }
    if (performance.impressions > 0 && performance.spend > 0) {
      performance.cpm = parseFloat(((performance.spend / performance.impressions) * 1000).toFixed(2));
    }
    if (performance.clicks > 0 && performance.spend > 0) {
      performance.cpc = parseFloat((performance.spend / performance.clicks).toFixed(2));
    }
    const updated = { ...existing, performance, updatedAt: new Date().toISOString() };
    await kv.set(`adcampaign:${id}`, JSON.stringify(updated));
    return c.json({ campaign: updated });
  } catch (err) { return c.json({ error: `Performance update error: ${err}` }, 500); }
});

adminOpsApp.delete(`${P}/admin/ad-campaigns/:id`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    await kv.del(`adcampaign:${c.req.param("id")}`);
    return c.json({ success: true });
  } catch (err) { return c.json({ error: `Ad campaign delete error: ${err}` }, 500); }
});

// ─────────────────────────────────────────────────────────────────────────────
//  AUDIT LOG HELPER (shared by all admin ops below)
// ─────────────────────────────────────────────────────────────────────────────
async function addAuditEntry(adminId: string, action: string, meta: Record<string, any> = {}) {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await kv.set(`audit:${now}:${id}`, JSON.stringify({ id, adminId, action, meta, createdAt: now }));
  } catch { /* non-critical */ }
}

// ─────────────────────────────────────────────────────────────────────────────
//  ENHANCED USER MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

adminOpsApp.get(`${P}/admin/users/:id/profile`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const { id } = c.req.param();
    const userStr = await kv.get(`user:${id}`);
    if (!userStr) return c.json({ error: "User not found" }, 404);
    const user = JSON.parse(userStr);
    const [releaseIdsStr, campaignsRaw, ticketsRaw, pitchesRaw, notifStr, notesStr, creditLogStr] = await Promise.all([
      kv.get(`releases:${id}`), kv.getByPrefix("campaign:"), kv.getByPrefix("ticket:"),
      kv.getByPrefix("pitch:"), kv.get(`notifications:${id}`), kv.get(`user_notes:${id}`), kv.get(`credit_log:${id}`),
    ]);
    const releaseIds: string[] = releaseIdsStr ? JSON.parse(releaseIdsStr) : [];
    const releases = (await Promise.all(releaseIds.map((rid: string) => kv.get(`release:${rid}`)))).filter(Boolean).map((s: any) => JSON.parse(s));
    const campaigns = campaignsRaw.map((s: string) => { try { return JSON.parse(s); } catch { return null; } }).filter((c: any) => c && c.userId === id);
    const tickets = ticketsRaw.map((s: string) => { try { return JSON.parse(s); } catch { return null; } }).filter((t: any) => t && t.userId === id);
    const pitches = pitchesRaw.map((s: string) => { try { return JSON.parse(s); } catch { return null; } }).filter((p: any) => p && (p.artistId === id || p.userId === id));
    const notes = notesStr ? JSON.parse(notesStr) : [];
    const creditLog = creditLogStr ? JSON.parse(creditLogStr) : [];
    const safeUser = { ...user }; delete safeUser.passwordHash;
    return c.json({ user: safeUser, releases, campaigns, tickets, pitches, notifications: notifStr ? JSON.parse(notifStr) : [], notes, creditLog, stats: { totalReleases: releases.length, totalCampaigns: campaigns.length, totalTickets: tickets.length, totalPitches: pitches.length, creditSpent: creditLog.reduce((s: number, t: any) => t.type === "debit" ? s + (t.amount || 0) : s, 0), creditsReceived: creditLog.reduce((s: number, t: any) => t.type === "credit" ? s + (t.amount || 0) : s, 0) } });
  } catch (err) { console.log("[admin/users/profile]", err); return c.json({ error: `Profile fetch error: ${err}` }, 500); }
});

adminOpsApp.put(`${P}/admin/users/:id/suspend`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const { id } = c.req.param();
    const body = await c.req.json();
    const userStr = await kv.get(`user:${id}`);
    if (!userStr) return c.json({ error: "User not found" }, 404);
    const user = JSON.parse(userStr);
    const suspended = body.suspended ?? !user.suspended;
    const updated = { ...user, suspended, suspendedAt: suspended ? new Date().toISOString() : null, suspendReason: body.reason || "" };
    await kv.set(`user:${id}`, JSON.stringify(updated));
    await addAuditEntry(adminId, suspended ? "user_suspended" : "user_unsuspended", { userId: id, userName: user.name, reason: body.reason || "" });
    if (suspended) {
      const ns = await kv.get(`notifications:${id}`);
      const notifs = ns ? JSON.parse(ns) : [];
      notifs.unshift({ id: crypto.randomUUID(), read: false, type: "account", title: "Account Suspended", message: body.reason || "Your account has been suspended. Contact onboarding@mixxea.com.", createdAt: new Date().toISOString() });
      await kv.set(`notifications:${id}`, JSON.stringify(notifs.slice(0, 50)));
    }
    const safe = { ...updated }; delete safe.passwordHash;
    return c.json({ user: safe });
  } catch (err) { return c.json({ error: `Suspend error: ${err}` }, 500); }
});

adminOpsApp.put(`${P}/admin/users/:id/plan`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const { id } = c.req.param();
    const { plan, reason } = await c.req.json();
    const userStr = await kv.get(`user:${id}`);
    if (!userStr) return c.json({ error: "User not found" }, 404);
    const user = JSON.parse(userStr);
    const updated = { ...user, plan, planChangedAt: new Date().toISOString(), planChangedBy: adminId };
    await kv.set(`user:${id}`, JSON.stringify(updated));
    await addAuditEntry(adminId, "user_plan_changed", { userId: id, userName: user.name, from: user.plan, to: plan, reason: reason || "" });
    const ns = await kv.get(`notifications:${id}`);
    const notifs = ns ? JSON.parse(ns) : [];
    notifs.unshift({ id: crypto.randomUUID(), read: false, type: "plan", title: `Plan Updated → ${plan.charAt(0).toUpperCase() + plan.slice(1)}`, message: `Your MIXXEA plan has been updated to ${plan} by our team.`, createdAt: new Date().toISOString() });
    await kv.set(`notifications:${id}`, JSON.stringify(notifs.slice(0, 50)));
    const safe = { ...updated }; delete safe.passwordHash;
    return c.json({ user: safe });
  } catch (err) { return c.json({ error: `Plan update error: ${err}` }, 500); }
});

adminOpsApp.delete(`${P}/admin/users/:id`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const { id } = c.req.param();
    const userStr = await kv.get(`user:${id}`);
    if (!userStr) return c.json({ error: "User not found" }, 404);
    const user = JSON.parse(userStr);
    if (user.isAdmin) return c.json({ error: "Cannot delete admin accounts" }, 403);
    await Promise.all([kv.del(`user:${id}`), kv.del(`user_email:${user.email.toLowerCase()}`), kv.del(`notifications:${id}`), kv.del(`user_notes:${id}`), kv.del(`credit_log:${id}`)]);
    await addAuditEntry(adminId, "user_deleted", { userId: id, userName: user.name, email: user.email });
    return c.json({ success: true });
  } catch (err) { return c.json({ error: `Delete error: ${err}` }, 500); }
});

adminOpsApp.post(`${P}/admin/users/:id/email`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const { id } = c.req.param();
    const { subject, message } = await c.req.json();
    const userStr = await kv.get(`user:${id}`);
    if (!userStr) return c.json({ error: "User not found" }, 404);
    const user = JSON.parse(userStr);
    const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_KEY) return c.json({ error: "Email service not configured" }, 503);
    const html = `<div style="font-family:sans-serif;background:#000;color:#fff;padding:32px;max-width:600px;margin:0 auto"><div style="font-size:24px;font-weight:900;letter-spacing:3px;color:#7B5FFF;margin-bottom:20px">MIXXEA</div><h2 style="color:#fff;margin-top:0">Hi ${user.name},</h2><div style="color:#ccc;line-height:1.8;white-space:pre-wrap">${message}</div><div style="margin-top:32px;padding-top:16px;border-top:1px solid #222"><p style="color:#555;font-size:12px">This is a personal message from the MIXXEA team · <a href="mailto:onboarding@mixxea.com" style="color:#7B5FFF">onboarding@mixxea.com</a></p></div></div>`;
    const res = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: "MIXXEA <onboarding@mixxea.com>", to: [user.email], subject, html }) });
    const data = await res.json();
    if (!res.ok) return c.json({ error: `Email rejected by provider: ${JSON.stringify(data)}` }, 502);
    await addAuditEntry(adminId, "user_email_sent", { userId: id, userName: user.name, email: user.email, subject });
    return c.json({ success: true, messageId: data.id });
  } catch (err) { return c.json({ error: `Email error: ${err}` }, 500); }
});

adminOpsApp.post(`${P}/admin/users/:id/note`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const { id } = c.req.param();
    const { note, tag } = await c.req.json();
    const notesStr = await kv.get(`user_notes:${id}`);
    const notes = notesStr ? JSON.parse(notesStr) : [];
    const entry = { id: crypto.randomUUID(), note, tag: tag || "", adminId, createdAt: new Date().toISOString() };
    notes.unshift(entry);
    await kv.set(`user_notes:${id}`, JSON.stringify(notes.slice(0, 100)));
    return c.json({ note: entry, notes });
  } catch (err) { return c.json({ error: `Note error: ${err}` }, 500); }
});

adminOpsApp.get(`${P}/admin/users/export`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const raw = await kv.getByPrefix("user:");
    const users = raw.map((s: string) => { try { const u = JSON.parse(s); return { id: u.id, name: u.name, email: u.email, role: u.role, plan: u.plan || "starter", credits: u.credits || 0, isAdmin: !!u.isAdmin, suspended: !!u.suspended, verified: !!u.verified, joinedAt: u.joinedAt }; } catch { return null; } }).filter(Boolean).sort((a: any, b: any) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());
    await addAuditEntry(adminId, "users_exported", { count: users.length });
    return c.json({ users, exportedAt: new Date().toISOString() });
  } catch (err) { return c.json({ error: `Export error: ${err}` }, 500); }
});

// ─────────────────────────────────────────────────────────────────────────────
//  GLOBAL SEARCH
// ─────────────────────────────────────────────────────────────────────────────
adminOpsApp.get(`${P}/admin/search`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const q = (c.req.query("q") || "").toLowerCase().trim();
    if (!q || q.length < 2) return c.json({ results: [], query: q });
    const [usersRaw, ticketsRaw, campaignsRaw, releasesRaw] = await Promise.all([kv.getByPrefix("user:"), kv.getByPrefix("ticket:"), kv.getByPrefix("campaign:"), kv.getByPrefix("release:")]);
    const mu = usersRaw.map((s: string) => { try { return JSON.parse(s); } catch { return null; } }).filter((u: any) => u && (u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))).slice(0, 5).map((u: any) => ({ id: u.id, type: "user", title: u.name, subtitle: u.email, badge: u.plan || "starter", url: "/admin/users" }));
    const mt = ticketsRaw.map((s: string) => { try { return JSON.parse(s); } catch { return null; } }).filter((t: any) => t && (t.subject?.toLowerCase().includes(q) || t.userName?.toLowerCase().includes(q) || t.userEmail?.toLowerCase().includes(q))).slice(0, 5).map((t: any) => ({ id: t.id, type: "ticket", title: t.subject, subtitle: `${t.userName} · ${t.status}`, badge: t.status, url: "/admin/tickets" }));
    const mc = campaignsRaw.map((s: string) => { try { return JSON.parse(s); } catch { return null; } }).filter((c: any) => c && (c.name?.toLowerCase().includes(q) || c.userName?.toLowerCase().includes(q))).slice(0, 5).map((c: any) => ({ id: c.id, type: "campaign", title: c.name, subtitle: c.userName, badge: c.status, url: "/admin/campaigns" }));
    const mr = releasesRaw.map((s: string) => { try { return JSON.parse(s); } catch { return null; } }).filter((r: any) => r && (r.title?.toLowerCase().includes(q) || r.artist?.toLowerCase().includes(q) || r.userName?.toLowerCase().includes(q))).slice(0, 5).map((r: any) => ({ id: r.id, type: "release", title: r.title, subtitle: r.artist || r.userName, badge: r.status, url: "/admin/releases" }));
    return c.json({ results: [...mu, ...mt, ...mc, ...mr].slice(0, 20), query: q });
  } catch (err) { return c.json({ error: `Search error: ${err}` }, 500); }
});

// ─────────────────────────────────────────────────────────────────────────────
//  AUDIT LOG
// ─────────────────────────────────────────────────────────────────────────────
adminOpsApp.get(`${P}/admin/audit-log`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const raw = await kv.getByPrefix("audit:");
    const log = raw.map((s: string) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 500);
    const adminIds = [...new Set(log.map((e: any) => e.adminId).filter(Boolean))] as string[];
    const adminMap: Record<string, string> = {};
    for (const uid of adminIds) { const us = await kv.get(`user:${uid}`); if (us) adminMap[uid] = JSON.parse(us).name; }
    return c.json({ log: log.map((e: any) => ({ ...e, adminName: adminMap[e.adminId] || "Admin" })) });
  } catch (err) { return c.json({ error: `Audit log error: ${err}` }, 500); }
});

adminOpsApp.post(`${P}/admin/audit-log`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const body = await c.req.json();
    await addAuditEntry(adminId, body.action, body.meta || {});
    return c.json({ success: true });
  } catch (err) { return c.json({ error: `Audit log error: ${err}` }, 500); }
});

// ─────────────────────────────────────────────────────────────────────────────
//  PLATFORM SETTINGS
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_PLATFORM_SETTINGS = {
  maintenanceMode: false,
  maintenanceMessage: "We are performing scheduled maintenance. We'll be back shortly.",
  signupEnabled: true,
  trialEnabled: true,
  trialDays: 7,
  defaultCreditsNewUser: 100,
  creditPackagesEnabled: true,
  maxTicketsPerUser: 10,
  featuredPlan: "growth",
  referralEnabled: true,
  referralBonusCredits: 50,
  communityEnabled: true,
  academyEnabled: true,
  contentIdEnabled: true,
  twoFactorEnabled: true,
  supportEmail: "onboarding@mixxea.com",
  maxReleaseTracksPerUser: 50,
  campaignReviewSlaHours: 48,
  updatedAt: null as string | null,
  updatedBy: null as string | null,
};

adminOpsApp.get(`${P}/admin/platform-settings`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const str = await kv.get("platform:settings");
    return c.json({ settings: str ? { ...DEFAULT_PLATFORM_SETTINGS, ...JSON.parse(str) } : DEFAULT_PLATFORM_SETTINGS });
  } catch (err) { return c.json({ error: `Settings fetch error: ${err}` }, 500); }
});

adminOpsApp.put(`${P}/admin/platform-settings`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const body = await c.req.json();
    const cur = await kv.get("platform:settings");
    const settings = { ...DEFAULT_PLATFORM_SETTINGS, ...(cur ? JSON.parse(cur) : {}), ...body, updatedAt: new Date().toISOString(), updatedBy: adminId };
    await kv.set("platform:settings", JSON.stringify(settings));
    await addAuditEntry(adminId, "platform_settings_updated", { changedKeys: Object.keys(body) });
    return c.json({ settings });
  } catch (err) { return c.json({ error: `Settings update error: ${err}` }, 500); }
});

// ─────────────────────────────────────────────────────────────────────────────
//  SYSTEM HEALTH
// ─────────────────────────────────────────────────────────────────────────────
adminOpsApp.get(`${P}/admin/system-health`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const t0 = Date.now();
    let kvOk = false;
    try { await kv.set("health:ping", JSON.stringify({ ts: Date.now() })); kvOk = !!(await kv.get("health:ping")); } catch { kvOk = false; }
    const kvLatency = Date.now() - t0;
    const emailOk = (Deno.env.get("RESEND_API_KEY") || "").length > 10;
    const stripeOk = (Deno.env.get("STRIPE_SECRET_KEY") || "").startsWith("sk_");
    const [usersRaw, ticketsRaw, campaignsRaw, releasesRaw] = await Promise.all([kv.getByPrefix("user:"), kv.getByPrefix("ticket:"), kv.getByPrefix("campaign:"), kv.getByPrefix("release:")]);
    const openTickets = ticketsRaw.filter((s: string) => { try { return JSON.parse(s).status === "open"; } catch { return false; } }).length;
    const pendingC = campaignsRaw.filter((s: string) => { try { return JSON.parse(s).status === "pending_review"; } catch { return false; } }).length;
    const pendingR = releasesRaw.filter((s: string) => { try { return JSON.parse(s).status === "submitted"; } catch { return false; } }).length;
    return c.json({ status: kvOk ? "operational" : "degraded", timestamp: new Date().toISOString(), services: { kvStore: { healthy: kvOk, latencyMs: kvLatency, label: "KV Database" }, emailService: { healthy: emailOk, label: "Resend Email" }, payments: { healthy: stripeOk, label: "Stripe Payments" }, edgeFunction: { healthy: true, label: "Edge Function" } }, platform: { totalUsers: usersRaw.length, openTickets, pendingCampaigns: pendingC, pendingReleases: pendingR } });
  } catch (err) { return c.json({ status: "error", error: String(err) }, 500); }
});