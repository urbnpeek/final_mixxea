// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — AI Marketing Console Backend
//  Endpoints: campaigns, ai-strategy, ai-creatives, rules, agents, analytics,
//             user-targeting
// ─────────────────────────────────────────────────────────────────────────────
import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";

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

export const marketingConsoleApp = new Hono();
const P = "/make-server-f4d1ffe4";

function genId(prefix = "mc") { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
function now() { return new Date().toISOString(); }

// ── DEFAULT AI AGENTS DEFINITION ──────────────────────────────────────────────
const DEFAULT_AGENTS = [
  { id: "strategy",    name: "Strategy Agent",              role: "Analyzes artist profile & builds campaign strategy",           icon: "Brain",    color: "#7B5FFF" },
  { id: "creative",    name: "Creative Agent",              role: "Generates captions, images, ad copy & video scripts",          icon: "Wand2",    color: "#D63DF6" },
  { id: "builder",     name: "Campaign Builder Agent",      role: "Creates structured multi-platform campaigns & ad sets",        icon: "Layers",   color: "#00C4FF" },
  { id: "launch",      name: "Ad Launch Agent",             role: "Publishes campaigns to Meta, TikTok, Spotify & Google Ads",   icon: "Rocket",   color: "#FF5252" },
  { id: "optimizer",   name: "Optimization Agent",          role: "Monitors performance & auto-adjusts budgets/creatives",        icon: "Target",   color: "#10B981" },
  { id: "trend",       name: "Trend Intelligence Agent",    role: "Analyzes viral trends on TikTok, Instagram & Spotify",        icon: "TrendingUp", color: "#F59E0B" },
  { id: "outreach",    name: "Playlist & Influencer Agent", role: "Discovers playlist curators & influencer outreach targets",   icon: "Network",  color: "#E1306C" },
  { id: "analytics",   name: "Analytics Agent",             role: "Generates AI-powered insights & campaign performance reports", icon: "BarChart2", color: "#6366F1" },
];

async function ensureAgents(): Promise<void> {
  for (const agent of DEFAULT_AGENTS) {
    const key = `mc:agent:${agent.id}`;
    const existing = await kv.get(key);
    if (!existing) {
      await kv.set(key, JSON.stringify({ ...agent, status: "idle", lastRun: null, tasksCompleted: 0, currentTask: null }));
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  CAMPAIGNS
// ─────────────────────────────────────────────────────────────────────────────
marketingConsoleApp.get(`${P}/admin/mc/campaigns`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const raw = await kv.getByPrefix("mc:campaign:");
    const campaigns = raw.map((s: string) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
    campaigns.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ campaigns });
  } catch (err) { console.log("[MC/campaigns GET]", err); return c.json({ error: String(err) }, 500); }
});

marketingConsoleApp.post(`${P}/admin/mc/campaigns`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const body = await c.req.json();
    const id = genId("mcamp");
    const campaign = {
      id, userId: body.userId || "", userName: body.userName || "Unknown",
      artistName: body.artistName || "", trackName: body.trackName || "",
      genre: body.genre || "", mood: body.mood || "",
      platforms: body.platforms || [],
      dailyBudget: body.dailyBudget || 10,
      status: "draft",
      strategy: body.strategy || "",
      objective: body.objective || "streams",
      targeting: body.targeting || "",
      createdAt: now(), updatedAt: now(), createdBy: adminId,
      metrics: { spend: 0, impressions: 0, clicks: 0, ctr: 0, streams: 0, conversions: 0, roi: 0 },
    };
    await kv.set(`mc:campaign:${id}`, JSON.stringify(campaign));
    // Log agent activity
    await kv.set(`mc:agent:builder`, JSON.stringify({ ...DEFAULT_AGENTS.find(a => a.id === "builder"), status: "idle", lastRun: now(), tasksCompleted: 1, currentTask: null }));
    console.log("[MC/campaigns POST] created", id);
    return c.json({ campaign });
  } catch (err) { console.log("[MC/campaigns POST]", err); return c.json({ error: String(err) }, 500); }
});

marketingConsoleApp.put(`${P}/admin/mc/campaigns/:id`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const id = c.req.param("id");
    const existing = await kv.get(`mc:campaign:${id}`);
    if (!existing) return c.json({ error: "Campaign not found" }, 404);
    const body = await c.req.json();
    const updated = { ...JSON.parse(existing), ...body, id, updatedAt: now() };
    await kv.set(`mc:campaign:${id}`, JSON.stringify(updated));
    return c.json({ campaign: updated });
  } catch (err) { console.log("[MC/campaigns PUT]", err); return c.json({ error: String(err) }, 500); }
});

marketingConsoleApp.delete(`${P}/admin/mc/campaigns/:id`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const id = c.req.param("id");
    await kv.del(`mc:campaign:${id}`);
    return c.json({ success: true });
  } catch (err) { console.log("[MC/campaigns DELETE]", err); return c.json({ error: String(err) }, 500); }
});

// ─────────────────────────────────────────────────────────────────────────────
//  AI STRATEGY GENERATION
// ─────────────────────────────────────────────────────────────────────────────
marketingConsoleApp.post(`${P}/admin/mc/ai-strategy`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const body = await c.req.json();
    const { artistName, trackName, genre, mood, platforms, dailyBudget, targetAudience } = body;

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return c.json({ error: "OPENAI_API_KEY not configured" }, 503);

    // Update strategy agent status
    const stratAgent = await kv.get("mc:agent:strategy");
    if (stratAgent) {
      const a = JSON.parse(stratAgent);
      await kv.set("mc:agent:strategy", JSON.stringify({ ...a, status: "running", currentTask: `Generating strategy for ${artistName} — ${trackName}` }));
    }

    const platformList = (platforms || []).join(", ") || "TikTok, Instagram, Spotify";
    const prompt = `You are an expert music marketing strategist for independent artists at a premium SaaS platform called MIXXEA.

Generate a complete, detailed marketing campaign strategy in JSON format for:
- Artist: ${artistName}
- Track: "${trackName}"
- Genre: ${genre}
- Mood/Vibe: ${mood}
- Target Platforms: ${platformList}
- Daily Budget: $${dailyBudget}/day
- Target Audience Notes: ${targetAudience || "Independent music fans aged 18-34"}

Return ONLY a valid JSON object (no markdown, no code blocks) with this structure:
{
  "campaign_name": "string",
  "objective": "string",
  "duration_days": number,
  "total_budget": number,
  "platform_breakdown": [
    { "platform": "TikTok", "budget_pct": 35, "daily_budget": number, "objective": "string", "format": "string", "audience": "string" }
  ],
  "content_plan": [
    { "type": "string", "description": "string", "platform": "string", "frequency": "string" }
  ],
  "targeting": {
    "age_range": "string",
    "interests": ["string"],
    "lookalike": "string",
    "geographic": "string"
  },
  "posting_schedule": {
    "frequency": "string",
    "best_times": ["string"],
    "week_1": "string",
    "week_2": "string"
  },
  "kpis": {
    "target_streams": number,
    "target_clicks": number,
    "expected_ctr": "string",
    "expected_reach": number
  },
  "key_messages": ["string"],
  "creative_direction": "string",
  "success_metrics": "string"
}`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.log("[MC/ai-strategy] OpenAI error:", err);
      return c.json({ error: `OpenAI error: ${err}` }, 502);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";
    let strategy: any = {};
    try { strategy = JSON.parse(content); } catch {
      // Try to extract JSON from the response
      const match = content.match(/\{[\s\S]*\}/);
      if (match) { try { strategy = JSON.parse(match[0]); } catch { strategy = { campaign_name: `${artistName} Campaign`, raw: content }; } }
      else { strategy = { campaign_name: `${artistName} Campaign`, raw: content }; }
    }

    // Update agent: done
    if (stratAgent) {
      const a = JSON.parse(stratAgent);
      const tasksCompleted = (a.tasksCompleted || 0) + 1;
      await kv.set("mc:agent:strategy", JSON.stringify({ ...a, status: "idle", lastRun: now(), tasksCompleted, currentTask: null }));
    }

    console.log("[MC/ai-strategy] Generated for", artistName, trackName);
    return c.json({ strategy });
  } catch (err) { console.log("[MC/ai-strategy]", err); return c.json({ error: String(err) }, 500); }
});

// ─────────────────────────────────────────────────────────────────────────────
//  AI CREATIVE GENERATION
// ─────────────────────────────────────────────────────────────────────────────
marketingConsoleApp.post(`${P}/admin/mc/ai-creatives`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const body = await c.req.json();
    const { artistName, trackName, genre, creativeType, platform, count = 10 } = body;

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return c.json({ error: "OPENAI_API_KEY not configured" }, 503);

    // Update creative agent
    const creativeAgent = await kv.get("mc:agent:creative");
    if (creativeAgent) {
      const a = JSON.parse(creativeAgent);
      await kv.set("mc:agent:creative", JSON.stringify({ ...a, status: "running", currentTask: `Generating ${creativeType} for ${trackName}` }));
    }

    const typeDescriptions: Record<string, string> = {
      caption: "engaging social media captions with emojis, 2-4 sentences each",
      hashtags: "hashtag sets of 15-20 tags optimized for discovery and virality",
      ad_copy: "short-form ad copy (headline + body + CTA) optimized for paid ads",
      video_script: "15-30 second video scripts with scene descriptions, dialogue/voiceover, and text overlays",
    };

    const prompt = `You are an expert music marketing creative director at MIXXEA, a premium SaaS platform.

Generate ${count} unique ${typeDescriptions[creativeType] || creativeType} for:
- Artist: ${artistName}
- Track: "${trackName}"
- Genre: ${genre}
- Platform: ${platform}

Return ONLY a valid JSON array (no markdown) of objects:
[
  {
    "id": "c1",
    "type": "${creativeType}",
    "platform": "${platform}",
    "content": "the actual creative content here",
    "hook": "the opening hook or headline",
    "cta": "call to action",
    "mood": "energetic/emotional/hype/chill/etc",
    "estimated_engagement": "high/medium/low"
  }
]

Make each creative unique in style, tone, and approach. Vary between hype, emotional, storytelling, and direct-response styles.`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.85,
        max_tokens: 2500,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return c.json({ error: `OpenAI error: ${err}` }, 502);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "[]";
    let creatives: any[] = [];
    try { creatives = JSON.parse(content); } catch {
      const match = content.match(/\[[\s\S]*\]/);
      if (match) { try { creatives = JSON.parse(match[0]); } catch { creatives = []; } }
    }

    // Update agent: done
    if (creativeAgent) {
      const a = JSON.parse(creativeAgent);
      const tasksCompleted = (a.tasksCompleted || 0) + 1;
      await kv.set("mc:agent:creative", JSON.stringify({ ...a, status: "idle", lastRun: now(), tasksCompleted, currentTask: null }));
    }

    console.log("[MC/ai-creatives] Generated", creatives.length, "for", trackName);
    return c.json({ creatives });
  } catch (err) { console.log("[MC/ai-creatives]", err); return c.json({ error: String(err) }, 500); }
});

// ─────────────────────────────────────────────────────────────────────────────
//  AUTOMATION RULES
// ─────────────────────────────────────────────────────────────────────────────
marketingConsoleApp.get(`${P}/admin/mc/rules`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const raw = await kv.getByPrefix("mc:rule:");
    const rules = raw.map((s: string) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
    rules.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ rules });
  } catch (err) { return c.json({ error: String(err) }, 500); }
});

marketingConsoleApp.post(`${P}/admin/mc/rules`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const body = await c.req.json();
    const id = genId("rule");
    const rule = {
      id, name: body.name || "Untitled Rule",
      metric: body.metric || "ctr", operator: body.operator || "<", threshold: body.threshold || 1,
      action: body.action || "pause", actionParams: body.actionParams || {},
      platforms: body.platforms || [], campaignFilter: body.campaignFilter || "all",
      status: "active", triggerCount: 0, lastTriggered: null, createdAt: now(),
    };
    await kv.set(`mc:rule:${id}`, JSON.stringify(rule));
    return c.json({ rule });
  } catch (err) { return c.json({ error: String(err) }, 500); }
});

marketingConsoleApp.put(`${P}/admin/mc/rules/:id`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const id = c.req.param("id");
    const existing = await kv.get(`mc:rule:${id}`);
    if (!existing) return c.json({ error: "Rule not found" }, 404);
    const body = await c.req.json();
    const updated = { ...JSON.parse(existing), ...body, id };
    await kv.set(`mc:rule:${id}`, JSON.stringify(updated));
    return c.json({ rule: updated });
  } catch (err) { return c.json({ error: String(err) }, 500); }
});

marketingConsoleApp.delete(`${P}/admin/mc/rules/:id`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    await kv.del(`mc:rule:${c.req.param("id")}`);
    return c.json({ success: true });
  } catch (err) { return c.json({ error: String(err) }, 500); }
});

// ─────────────────────────────────────────────────────────────────────────────
//  AI AGENTS
// ─────────────────────────────────────────────────────────────────────────────
marketingConsoleApp.get(`${P}/admin/mc/agents`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    await ensureAgents();
    const agents = await Promise.all(DEFAULT_AGENTS.map(async (a) => {
      const stored = await kv.get(`mc:agent:${a.id}`);
      return stored ? JSON.parse(stored) : { ...a, status: "idle", lastRun: null, tasksCompleted: 0 };
    }));
    return c.json({ agents });
  } catch (err) { return c.json({ error: String(err) }, 500); }
});

marketingConsoleApp.post(`${P}/admin/mc/agents/:agentId/trigger`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const agentId = c.req.param("agentId");
    const stored = await kv.get(`mc:agent:${agentId}`);
    if (!stored) return c.json({ error: "Agent not found" }, 404);
    const agent = JSON.parse(stored);
    const tasks = (agent.tasksCompleted || 0) + 1;
    const updated = { ...agent, status: "running", lastRun: now(), tasksCompleted: tasks, currentTask: "Manual trigger — running analysis…" };
    await kv.set(`mc:agent:${agentId}`, JSON.stringify(updated));
    // Simulate agent completing after 3s (in real implementation, use background queues)
    setTimeout(async () => {
      try {
        await kv.set(`mc:agent:${agentId}`, JSON.stringify({ ...updated, status: "idle", currentTask: null }));
      } catch {}
    }, 3000);
    return c.json({ agent: updated });
  } catch (err) { return c.json({ error: String(err) }, 500); }
});

// ─────────────────────────────────────────────────────────────────────────────
//  ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────
marketingConsoleApp.get(`${P}/admin/mc/analytics`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);

    const raw = await kv.getByPrefix("mc:campaign:");
    const campaigns = raw.map((s: string) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);

    // Aggregate totals
    const totals = campaigns.reduce((acc: any, c: any) => {
      const m = c.metrics || {};
      return {
        spend: acc.spend + (m.spend || 0),
        impressions: acc.impressions + (m.impressions || 0),
        clicks: acc.clicks + (m.clicks || 0),
        streams: acc.streams + (m.streams || 0),
        conversions: acc.conversions + (m.conversions || 0),
      };
    }, { spend: 0, impressions: 0, clicks: 0, streams: 0, conversions: 0 });

    totals.ctr = totals.impressions > 0 ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : "0.00";
    totals.roi = totals.spend > 0 ? (((totals.streams * 0.004) / totals.spend) * 100).toFixed(0) : "0";

    // Platform breakdown
    const platformMap: Record<string, any> = {};
    campaigns.forEach((c: any) => {
      (c.platforms || []).forEach((p: string) => {
        if (!platformMap[p]) platformMap[p] = { platform: p, campaigns: 0, spend: 0, streams: 0, clicks: 0 };
        platformMap[p].campaigns += 1;
        platformMap[p].spend += (c.metrics?.spend || 0) / (c.platforms?.length || 1);
        platformMap[p].streams += (c.metrics?.streams || 0) / (c.platforms?.length || 1);
        platformMap[p].clicks += (c.metrics?.clicks || 0) / (c.platforms?.length || 1);
      });
    });
    const platformBreakdown = Object.values(platformMap).map((p: any) => ({
      ...p, spend: Math.round(p.spend), streams: Math.round(p.streams), clicks: Math.round(p.clicks),
    }));

    // Time series (last 14 days, aggregate from campaign created dates)
    const timeSeriesMap: Record<string, any> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      timeSeriesMap[key] = { date: key, spend: 0, streams: 0, clicks: 0 };
    }
    campaigns.forEach((c: any) => {
      if (!c.createdAt) return;
      const d = new Date(c.createdAt);
      const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (timeSeriesMap[key]) {
        timeSeriesMap[key].spend += (c.metrics?.spend || 0);
        timeSeriesMap[key].streams += (c.metrics?.streams || 0);
        timeSeriesMap[key].clicks += (c.metrics?.clicks || 0);
      }
    });
    const timeSeries = Object.values(timeSeriesMap);

    const active = campaigns.filter((c: any) => c.status === "active").length;
    const draft = campaigns.filter((c: any) => c.status === "draft").length;

    return c.json({ totals, platformBreakdown, timeSeries, summary: { total: campaigns.length, active, draft, completed: campaigns.filter((c: any) => c.status === "completed").length }, campaigns: campaigns.slice(0, 20) });
  } catch (err) { console.log("[MC/analytics]", err); return c.json({ error: String(err) }, 500); }
});

// ─────────────────────────────────────────────────────────────────────────────
//  USER TARGETING
// ─────────────────────────────────────────────────────────────────────────────
marketingConsoleApp.get(`${P}/admin/mc/target-users`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const raw = await kv.getByPrefix("user:");
    const users = raw.map((s: string) => {
      try {
        const u = JSON.parse(s);
        return { id: u.id, name: u.name, email: u.email, plan: u.plan || "starter", createdAt: u.createdAt, campaignEnabled: u.mcCampaignEnabled || false, isAdmin: u.isAdmin || false };
      } catch { return null; }
    }).filter(Boolean).filter((u: any) => !u.isAdmin);
    users.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return c.json({ users });
  } catch (err) { return c.json({ error: String(err) }, 500); }
});

marketingConsoleApp.put(`${P}/admin/mc/users/:id/campaign-enabled`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);
    const userId = c.req.param("id");
    const body = await c.req.json();
    const userStr = await kv.get(`user:${userId}`);
    if (!userStr) return c.json({ error: "User not found" }, 404);
    const user = JSON.parse(userStr);
    const updated = { ...user, mcCampaignEnabled: body.enabled };
    await kv.set(`user:${userId}`, JSON.stringify(updated));
    console.log("[MC/user-campaign-enabled]", userId, "→", body.enabled);
    return c.json({ success: true, userId, enabled: body.enabled });
  } catch (err) { return c.json({ error: String(err) }, 500); }
});

// =============================================================================
//  USER-FACING MARKETING HUB ENDPOINTS
//  These do NOT require admin — just a valid session token
// =============================================================================

async function verifyUserRequest(c: any): Promise<string | null> {
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
  return userId;
}

const PLAN_MONTHLY_LIMITS: Record<string, { briefs: number; strategies: number; trends: number; rules: number }> = {
  starter: { briefs: 1,  strategies: 0,  trends: 0,  rules: 0  },
  growth:  { briefs: 5,  strategies: 3,  trends: 3,  rules: 0  },
  pro:     { briefs: -1, strategies: -1, trends: -1, rules: 10 },
};
const CREDIT_COSTS = { strategy: 25, trend: 10 };

function monthKey() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }

async function getUsage(userId: string): Promise<Record<string, number>> {
  const raw = await kv.get(`mc:usage:${userId}:${monthKey()}`);
  return raw ? JSON.parse(raw) : { briefs: 0, strategies: 0, trends: 0 };
}
async function incUsage(userId: string, field: string): Promise<void> {
  const usage = await getUsage(userId);
  usage[field] = (usage[field] || 0) + 1;
  await kv.set(`mc:usage:${userId}:${monthKey()}`, JSON.stringify(usage));
}
async function deductCredits(userId: string, amount: number): Promise<boolean> {
  const userStr = await kv.get(`user:${userId}`);
  if (!userStr) return false;
  const user = JSON.parse(userStr);
  if ((user.credits || 0) < amount) return false;
  await kv.set(`user:${userId}`, JSON.stringify({ ...user, credits: (user.credits || 0) - amount }));
  return true;
}

// ── GET /user/mc/usage ─────────────────────────────────────────────────────────
marketingConsoleApp.get(`${P}/user/mc/usage`, async (c) => {
  try {
    const userId = await verifyUserRequest(c);
    if (!userId) return c.json({ error: "Auth required" }, 401);
    const userStr = await kv.get(`user:${userId}`);
    if (!userStr) return c.json({ error: "User not found" }, 404);
    const user = JSON.parse(userStr);
    const plan = user.plan || "starter";
    const usage = await getUsage(userId);
    const limits = PLAN_MONTHLY_LIMITS[plan] || PLAN_MONTHLY_LIMITS.starter;
    return c.json({ usage, limits, plan, credits: user.credits || 0, creditCosts: CREDIT_COSTS });
  } catch (err) { return c.json({ error: String(err) }, 500); }
});

// ── POST /user/mc/brief ────────────────────────────────────────────────────────
marketingConsoleApp.post(`${P}/user/mc/brief`, async (c) => {
  try {
    const userId = await verifyUserRequest(c);
    if (!userId) return c.json({ error: "Auth required" }, 401);
    const userStr = await kv.get(`user:${userId}`);
    if (!userStr) return c.json({ error: "User not found" }, 404);
    const user = JSON.parse(userStr);
    const plan = user.plan || "starter";
    const limits = PLAN_MONTHLY_LIMITS[plan] || PLAN_MONTHLY_LIMITS.starter;
    const usage = await getUsage(userId);

    // Check limit
    if (limits.briefs !== -1 && (usage.briefs || 0) >= limits.briefs) {
      return c.json({ error: `Brief limit reached (${limits.briefs}/month on ${plan} plan). Upgrade for more.`, limitReached: true }, 429);
    }

    const body = await c.req.json();
    const id = genId("brief");
    const brief = {
      id, userId, userName: user.name, userEmail: user.email, userPlan: plan,
      artistName: body.artistName || user.name,
      trackName: body.trackName || "",
      genre: body.genre || "",
      mood: body.mood || "",
      goal: body.goal || "streams",
      platforms: body.platforms || [],
      budget: body.budget || 0,
      notes: body.notes || "",
      status: "pending",
      createdAt: now(),
    };
    await kv.set(`mc:brief:${id}`, JSON.stringify(brief));
    await incUsage(userId, "briefs");

    // Admin notification
    const notifId = genId("notif");
    await kv.set(`notif:admin:${notifId}`, JSON.stringify({
      id: notifId, type: "campaign_submitted", read: false,
      title: `Campaign Brief from ${user.name}`,
      message: `"${brief.trackName}" on ${brief.platforms.join(", ")} — $${brief.budget}/day`,
      link: "/admin/marketing-console",
      createdAt: now(),
    }));

    console.log("[UserMC/brief] submitted", id, "by", userId);
    return c.json({ brief, usage: await getUsage(userId), limits });
  } catch (err) { console.log("[UserMC/brief]", err); return c.json({ error: String(err) }, 500); }
});

// ── GET /user/mc/briefs ────────────────────────────────────────────────────────
marketingConsoleApp.get(`${P}/user/mc/briefs`, async (c) => {
  try {
    const userId = await verifyUserRequest(c);
    if (!userId) return c.json({ error: "Auth required" }, 401);
    const all = await kv.getByPrefix("mc:brief:");
    const briefs = all.map((s: string) => { try { return JSON.parse(s); } catch { return null; } })
      .filter((b: any) => b && b.userId === userId);
    briefs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ briefs });
  } catch (err) { return c.json({ error: String(err) }, 500); }
});

// ── POST /user/mc/ai-strategy ──────────────────────────────────────────────────
marketingConsoleApp.post(`${P}/user/mc/ai-strategy`, async (c) => {
  try {
    const userId = await verifyUserRequest(c);
    if (!userId) return c.json({ error: "Auth required" }, 401);
    const userStr = await kv.get(`user:${userId}`);
    if (!userStr) return c.json({ error: "User not found" }, 404);
    const user = JSON.parse(userStr);
    const plan = user.plan || "starter";
    const limits = PLAN_MONTHLY_LIMITS[plan] || PLAN_MONTHLY_LIMITS.starter;

    // Plan gate
    if (limits.strategies === 0) return c.json({ error: "AI Strategy requires Growth or Pro plan.", planRequired: "growth" }, 403);

    const usage = await getUsage(userId);
    const includedRemaining = limits.strategies === -1 ? 999 : Math.max(0, limits.strategies - (usage.strategies || 0));

    // If over monthly quota, charge credits
    if (includedRemaining <= 0) {
      const ok = await deductCredits(userId, CREDIT_COSTS.strategy);
      if (!ok) return c.json({ error: `Insufficient credits. AI Strategy costs ${CREDIT_COSTS.strategy} credits.`, creditsRequired: CREDIT_COSTS.strategy }, 402);
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return c.json({ error: "AI service not configured" }, 503);

    const body = await c.req.json();
    const { artistName, trackName, genre, mood, platforms, dailyBudget, targetAudience } = body;

    const prompt = `You are an expert music marketing strategist for independent artists at MIXXEA.
Generate a complete campaign strategy JSON for:
- Artist: ${artistName || user.name}
- Track: "${trackName}"
- Genre: ${genre}, Mood: ${mood}
- Platforms: ${(platforms || []).join(", ") || "TikTok, Instagram"}
- Daily Budget: $${dailyBudget || 10}/day
- Audience: ${targetAudience || "Independent music fans 18-34"}

Return ONLY valid JSON (no markdown) with this structure:
{"campaign_name":"string","objective":"string","duration_days":number,"total_budget":number,"platform_breakdown":[{"platform":"string","budget_pct":number,"daily_budget":number,"objective":"string","format":"string","audience":"string"}],"content_plan":[{"type":"string","description":"string","platform":"string","frequency":"string"}],"targeting":{"age_range":"string","interests":["string"],"lookalike":"string","geographic":"string"},"posting_schedule":{"frequency":"string","best_times":["string"],"week_1":"string","week_2":"string"},"kpis":{"target_streams":number,"target_clicks":number,"expected_ctr":"string","expected_reach":number},"key_messages":["string"],"creative_direction":"string","success_metrics":"string"}`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
      body: JSON.stringify({ model: "gpt-4o", messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 1500 }),
    });
    if (!res.ok) { const e = await res.text(); return c.json({ error: `AI error: ${e}` }, 502); }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";
    let strategy: any = {};
    try { strategy = JSON.parse(content); } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) { try { strategy = JSON.parse(match[0]); } catch { strategy = { campaign_name: `${artistName} Campaign`, raw: content }; } }
    }

    await incUsage(userId, "strategies");
    const updatedUsage = await getUsage(userId);
    const chargedCredits = includedRemaining <= 0 ? CREDIT_COSTS.strategy : 0;

    // Refresh user credits
    const freshUser = await kv.get(`user:${userId}`);
    const freshCredits = freshUser ? JSON.parse(freshUser).credits : user.credits;

    console.log("[UserMC/ai-strategy] generated for", userId, trackName);
    return c.json({ strategy, usage: updatedUsage, limits, chargedCredits, creditsRemaining: freshCredits });
  } catch (err) { console.log("[UserMC/ai-strategy]", err); return c.json({ error: String(err) }, 500); }
});

// ── POST /user/mc/trends ───────────────────────────────────────────────────────
marketingConsoleApp.post(`${P}/user/mc/trends`, async (c) => {
  try {
    const userId = await verifyUserRequest(c);
    if (!userId) return c.json({ error: "Auth required" }, 401);
    const userStr = await kv.get(`user:${userId}`);
    if (!userStr) return c.json({ error: "User not found" }, 404);
    const user = JSON.parse(userStr);
    const plan = user.plan || "starter";
    const limits = PLAN_MONTHLY_LIMITS[plan] || PLAN_MONTHLY_LIMITS.starter;

    if (limits.trends === 0) return c.json({ error: "Trend Intelligence requires Growth or Pro plan.", planRequired: "growth" }, 403);

    const usage = await getUsage(userId);
    const includedRemaining = limits.trends === -1 ? 999 : Math.max(0, limits.trends - (usage.trends || 0));

    if (includedRemaining <= 0) {
      const ok = await deductCredits(userId, CREDIT_COSTS.trend);
      if (!ok) return c.json({ error: `Insufficient credits. Trend report costs ${CREDIT_COSTS.trend} credits.`, creditsRequired: CREDIT_COSTS.trend }, 402);
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return c.json({ error: "AI service not configured" }, 503);

    const body = await c.req.json();
    const { genre, platform } = body;

    const prompt = `You are a music industry trend analyst with real-time platform knowledge. Generate a comprehensive trend intelligence report for ${genre} music on ${platform || "TikTok, Instagram, Spotify"}.

Return ONLY valid JSON (no markdown):
{
  "report_date": "${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}",
  "genre": "${genre}",
  "trending_sounds": [{"name":"string","artist":"string","streams":"string","trend":"rising|viral|declining","description":"string"}],
  "hashtag_clusters": [{"cluster":"string","tags":["#string"],"avg_views":"string","growth":"string"}],
  "content_patterns": [{"format":"string","description":"string","why_it_works":"string","example":"string"}],
  "best_posting_times": [{"day":"string","time":"string","platform":"string","reason":"string"}],
  "competitor_moves": [{"pattern":"string","frequency":"string","impact":"string"}],
  "ai_recommendation": "string (2-3 sentence action recommendation for a ${genre} artist)"
}`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
      body: JSON.stringify({ model: "gpt-4o", messages: [{ role: "user", content: prompt }], temperature: 0.75, max_tokens: 1800 }),
    });
    if (!res.ok) { const e = await res.text(); return c.json({ error: `AI error: ${e}` }, 502); }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    let report: any = {};
    try { report = JSON.parse(content); } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) { try { report = JSON.parse(match[0]); } catch { report = {}; } }
    }

    await incUsage(userId, "trends");
    const updatedUsage = await getUsage(userId);
    const chargedCredits = includedRemaining <= 0 ? CREDIT_COSTS.trend : 0;
    const freshUser = await kv.get(`user:${userId}`);
    const freshCredits = freshUser ? JSON.parse(freshUser).credits : user.credits;

    return c.json({ report, usage: updatedUsage, limits, chargedCredits, creditsRemaining: freshCredits });
  } catch (err) { console.log("[UserMC/trends]", err); return c.json({ error: String(err) }, 500); }
});

// ── GET /user/mc/analytics ─────────────────────────────────────────────────────
marketingConsoleApp.get(`${P}/user/mc/analytics`, async (c) => {
  try {
    const userId = await verifyUserRequest(c);
    if (!userId) return c.json({ error: "Auth required" }, 401);
    const all = await kv.getByPrefix("mc:campaign:");
    const campaigns = all.map((s: string) => { try { return JSON.parse(s); } catch { return null; } })
      .filter((camp: any) => camp && camp.userId === userId);
    campaigns.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const totals = campaigns.reduce((acc: any, camp: any) => {
      const m = camp.metrics || {};
      return { spend: acc.spend + (m.spend||0), impressions: acc.impressions + (m.impressions||0), clicks: acc.clicks + (m.clicks||0), streams: acc.streams + (m.streams||0) };
    }, { spend: 0, impressions: 0, clicks: 0, streams: 0 });
    totals.ctr = totals.impressions > 0 ? ((totals.clicks/totals.impressions)*100).toFixed(2) : "0.00";
    totals.roi = totals.spend > 0 ? (((totals.streams*0.004)/totals.spend)*100).toFixed(0) : "0";

    // AI insight for user
    let insight = "";
    if (campaigns.length > 0) {
      const best = campaigns.reduce((a: any, b: any) => ((b.metrics?.streams||0) > (a.metrics?.streams||0) ? b : a), campaigns[0]);
      insight = `Your "${best.trackName}" campaign ${best.platforms?.length ? `on ${best.platforms.slice(0,2).join(" & ")}` : ""} has driven the most engagement. ${totals.streams > 0 ? `You've influenced ${totals.streams.toLocaleString()} streams total.` : "Submit a campaign brief to start growing your audience."}`;
    } else {
      insight = "You have no campaigns yet. Submit a Campaign Brief and our team will launch your first AI-powered campaign.";
    }

    const briefs = await kv.getByPrefix("mc:brief:");
    const userBriefs = briefs.map((s: string) => { try { return JSON.parse(s); } catch { return null; } })
      .filter((b: any) => b && b.userId === userId);

    return c.json({ campaigns, totals, insight, briefs: userBriefs });
  } catch (err) { return c.json({ error: String(err) }, 500); }
});

// ── GET/POST/DELETE /user/mc/rules (Pro only) ──────────────────────────────────
marketingConsoleApp.get(`${P}/user/mc/rules`, async (c) => {
  try {
    const userId = await verifyUserRequest(c);
    if (!userId) return c.json({ error: "Auth required" }, 401);
    const all = await kv.getByPrefix(`mc:user-rule:${userId}:`);
    const rules = all.map((s: string) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
    rules.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ rules });
  } catch (err) { return c.json({ error: String(err) }, 500); }
});

marketingConsoleApp.post(`${P}/user/mc/rules`, async (c) => {
  try {
    const userId = await verifyUserRequest(c);
    if (!userId) return c.json({ error: "Auth required" }, 401);
    const userStr = await kv.get(`user:${userId}`);
    if (!userStr) return c.json({ error: "User not found" }, 404);
    const user = JSON.parse(userStr);
    if ((user.plan || "starter") !== "pro") return c.json({ error: "Automation Rules require Pro plan.", planRequired: "pro" }, 403);

    const existing = await kv.getByPrefix(`mc:user-rule:${userId}:`);
    if (existing.length >= 10) return c.json({ error: "Maximum 10 rules on Pro plan." }, 429);

    const body = await c.req.json();
    const id = genId("urule");
    const rule = { id, userId, name: body.name || "Untitled Rule", trigger: body.trigger || "new_release", action: body.action || "schedule_posts", actionConfig: body.actionConfig || {}, status: "active", triggerCount: 0, lastTriggered: null, createdAt: now() };
    await kv.set(`mc:user-rule:${userId}:${id}`, JSON.stringify(rule));
    return c.json({ rule });
  } catch (err) { return c.json({ error: String(err) }, 500); }
});

marketingConsoleApp.put(`${P}/user/mc/rules/:id`, async (c) => {
  try {
    const userId = await verifyUserRequest(c);
    if (!userId) return c.json({ error: "Auth required" }, 401);
    const id = c.req.param("id");
    const existing = await kv.get(`mc:user-rule:${userId}:${id}`);
    if (!existing) return c.json({ error: "Rule not found" }, 404);
    const body = await c.req.json();
    const updated = { ...JSON.parse(existing), ...body, id, userId };
    await kv.set(`mc:user-rule:${userId}:${id}`, JSON.stringify(updated));
    return c.json({ rule: updated });
  } catch (err) { return c.json({ error: String(err) }, 500); }
});

marketingConsoleApp.delete(`${P}/user/mc/rules/:id`, async (c) => {
  try {
    const userId = await verifyUserRequest(c);
    if (!userId) return c.json({ error: "Auth required" }, 401);
    await kv.del(`mc:user-rule:${userId}:${c.req.param("id")}`);
    return c.json({ success: true });
  } catch (err) { return c.json({ error: String(err) }, 500); }
});