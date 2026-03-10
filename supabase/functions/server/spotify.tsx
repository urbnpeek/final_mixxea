// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — Spotify API Module
//  Uses Client Credentials flow (no user login needed)
//  Can search & fetch any public playlist on Spotify
//
//  Routes:
//    GET  /spotify/search?q=...&limit=20&offset=0&market=US
//    GET  /spotify/playlist/:id         — fetch single playlist by ID or URL
//    GET  /spotify/user/:id/playlists   — all public playlists of a Spotify user
//    GET  /spotify/category/:id/playlists — editorial playlists by genre category
//    GET  /spotify/categories            — list all Spotify genre categories
//    POST /spotify/import               — bulk import playlists → creator network
// ─────────────────────────────────────────────────────────────────────────────
import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";

// ── Re-implement HMAC verification (same as admin-ops.tsx) ────────────────────
const SESSION_SECRET = Deno.env.get("MIXXEA_SESSION_SECRET") || "mixxea_session_secret_v2_2024";
let _hmacKey: CryptoKey | null = null;
async function getHmacKey(): Promise<CryptoKey> {
  if (_hmacKey) return _hmacKey;
  _hmacKey = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"],
  );
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
    const sigBytes = new Uint8Array(sigHex.match(/.{2}/g)!.map((b: string) => parseInt(b, 16)));
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

// ── Spotify Token Cache ───────────────────────────────────────────────────────
// We store the access token in memory (Edge Function instance lifetime)
// and fall back to KV for persistence across cold starts.
let _spotifyToken: { token: string; expiresAt: number } | null = null;

async function getSpotifyToken(): Promise<string> {
  // Check memory cache first
  if (_spotifyToken && Date.now() < _spotifyToken.expiresAt - 30_000) {
    return _spotifyToken.token;
  }

  // Check KV cache
  const cached = await kv.get("spotify:access_token");
  if (cached) {
    const parsed = JSON.parse(cached);
    if (Date.now() < parsed.expiresAt - 30_000) {
      _spotifyToken = parsed;
      return parsed.token;
    }
  }

  // Fetch fresh token
  const clientId     = Deno.env.get("SPOTIFY_CLIENT_ID");
  const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set in Supabase secrets.");
  }

  const credentials = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify token error (${res.status}): ${text}`);
  }

  const data = await res.json();
  const tokenObj = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000), // typically 3600 seconds
  };

  _spotifyToken = tokenObj;
  await kv.set("spotify:access_token", JSON.stringify(tokenObj));

  return tokenObj.token;
}

// ── Spotify API Helper ────────────────────────────────────────────────────────
async function spotifyFetch(path: string, retried = false): Promise<any> {
  const token = await getSpotifyToken();
  const url = path.startsWith("http") ? path : `https://api.spotify.com/v1${path}`;

  const res = await fetch(url, {
    headers: { "Authorization": `Bearer ${token}` },
  });

  if (res.status === 401 && !retried) {
    // Token expired — clear cache and retry once
    _spotifyToken = null;
    await kv.del("spotify:access_token");
    return spotifyFetch(path, true);
  }

  if (res.status === 404) return null;

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify API error ${res.status}: ${text}`);
  }

  return res.json();
}

// ── Playlist Normalizer ───────────────────────────────────────────────────────
// Converts raw Spotify playlist object → clean MIXXEA creator record shape
function normalizePlaylist(pl: any) {
  return {
    id:               pl.id,
    name:             pl.name,
    description:      pl.description || "",
    externalUrl:      pl.external_urls?.spotify || "",
    imageUrl:         pl.images?.[0]?.url || pl.images?.[1]?.url || null,
    followers:        pl.followers?.total ?? 0,
    trackCount:       pl.tracks?.total ?? 0,
    owner: {
      id:          pl.owner?.id   || "",
      name:        pl.owner?.display_name || "Unknown",
      profileUrl:  pl.owner?.external_urls?.spotify || "",
      type:        pl.owner?.type  || "user",
    },
    isPublic:    pl.public ?? true,
    collaborative: pl.collaborative ?? false,
    // Raw Spotify data in case caller needs more
    _raw: pl,
  };
}

// ── Parse Playlist ID from URL or raw ID ─────────────────────────────────────
function parsePlaylistId(input: string): string {
  // Handles:
  //   https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
  //   spotify:playlist:37i9dQZF1DXcBWIGoYBM5M
  //   37i9dQZF1DXcBWIGoYBM5M
  const urlMatch = input.match(/playlist\/([A-Za-z0-9]+)/);
  if (urlMatch) return urlMatch[1];
  const uriMatch = input.match(/playlist:([A-Za-z0-9]+)/);
  if (uriMatch) return uriMatch[1];
  return input.trim();
}

// ── Routes ────────────────────────────────────────────────────────────────────
export const spotifyApp = new Hono();
const P = "/make-server-f4d1ffe4";

// ── Search Playlists ──────────────────────────────────────────────────────────
// GET /spotify/search?q=hip-hop&limit=20&offset=0&market=US
spotifyApp.get(`${P}/spotify/search`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);

    const q      = c.req.query("q")      || "";
    const limit  = Math.min(parseInt(c.req.query("limit")  || "20"), 50);
    const offset = parseInt(c.req.query("offset") || "0");
    const market = c.req.query("market") || "US";

    if (!q.trim()) return c.json({ error: "Query parameter 'q' is required" }, 400);

    const params = new URLSearchParams({
      q: `${q} playlist`,
      type: "playlist",
      limit: limit.toString(),
      offset: offset.toString(),
      market,
    });

    const data = await spotifyFetch(`/search?${params}`);
    const playlists = (data?.playlists?.items || [])
      .filter(Boolean)
      .map(normalizePlaylist);

    return c.json({
      playlists,
      total:  data?.playlists?.total  ?? 0,
      offset: data?.playlists?.offset ?? 0,
      limit:  data?.playlists?.limit  ?? limit,
      next:   data?.playlists?.next   ?? null,
    });
  } catch (err) {
    console.log(`[Spotify Search] error:`, err);
    return c.json({ error: `Spotify search error: ${err}` }, 500);
  }
});

// ── Fetch Single Playlist ─────────────────────────────────────────────────────
// GET /spotify/playlist/:id   (id can be a full URL or just the Spotify ID)
spotifyApp.get(`${P}/spotify/playlist/:id`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);

    const rawId = c.req.param("id");
    const id    = parsePlaylistId(decodeURIComponent(rawId));

    const fields = "id,name,description,images,followers,tracks.total,owner,public,collaborative,external_urls";
    const data   = await spotifyFetch(`/playlists/${id}?fields=${encodeURIComponent(fields)}&market=US`);

    if (!data) return c.json({ error: "Playlist not found" }, 404);

    return c.json({ playlist: normalizePlaylist(data) });
  } catch (err) {
    console.log(`[Spotify Playlist] error:`, err);
    return c.json({ error: `Spotify playlist error: ${err}` }, 500);
  }
});

// ── Fetch User's Public Playlists ─────────────────────────────────────────────
// GET /spotify/user/:userId/playlists?limit=20&offset=0
spotifyApp.get(`${P}/spotify/user/:userId/playlists`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);

    const userId = c.req.param("userId");
    const limit  = Math.min(parseInt(c.req.query("limit") || "50"), 50);
    const offset = parseInt(c.req.query("offset") || "0");

    const data = await spotifyFetch(
      `/users/${encodeURIComponent(userId)}/playlists?limit=${limit}&offset=${offset}`
    );

    const playlists = (data?.items || []).filter(Boolean).map(normalizePlaylist);
    return c.json({ playlists, total: data?.total ?? 0 });
  } catch (err) {
    console.log(`[Spotify User Playlists] error:`, err);
    return c.json({ error: `Spotify user playlists error: ${err}` }, 500);
  }
});

// ── Browse Categories (Spotify editorial genres) ──────────────────────────────
// GET /spotify/categories?country=US&limit=50
spotifyApp.get(`${P}/spotify/categories`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);

    const country = c.req.query("country") || "US";
    const limit   = Math.min(parseInt(c.req.query("limit") || "50"), 50);

    const data = await spotifyFetch(
      `/browse/categories?country=${country}&limit=${limit}&locale=en_US`
    );

    const categories = (data?.categories?.items || []).map((cat: any) => ({
      id:      cat.id,
      name:    cat.name,
      iconUrl: cat.icons?.[0]?.url || null,
    }));

    return c.json({ categories });
  } catch (err) {
    console.log(`[Spotify Categories] error:`, err);
    return c.json({ error: `Spotify categories error: ${err}` }, 500);
  }
});

// ── Browse Category Playlists ─────────────────────────────────────────────────
// GET /spotify/category/:categoryId/playlists?country=US&limit=20&offset=0
spotifyApp.get(`${P}/spotify/category/:categoryId/playlists`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);

    const categoryId = c.req.param("categoryId");
    const country    = c.req.query("country") || "US";
    const limit      = Math.min(parseInt(c.req.query("limit") || "20"), 50);
    const offset     = parseInt(c.req.query("offset") || "0");

    const data = await spotifyFetch(
      `/browse/categories/${encodeURIComponent(categoryId)}/playlists?country=${country}&limit=${limit}&offset=${offset}`
    );

    const playlists = (data?.playlists?.items || []).filter(Boolean).map(normalizePlaylist);

    return c.json({
      playlists,
      total:  data?.playlists?.total  ?? 0,
      offset: data?.playlists?.offset ?? 0,
    });
  } catch (err) {
    console.log(`[Spotify Category Playlists] error:`, err);
    return c.json({ error: `Spotify category playlists error: ${err}` }, 500);
  }
});

// ── Bulk Import Playlists → Creator Network ───────────────────────────────────
// POST /spotify/import
// Body: { playlists: [NormalizedPlaylist], overrideCostPerPlacement?: number }
spotifyApp.post(`${P}/spotify/import`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);

    const body      = await c.req.json();
    const playlists = body.playlists || [];
    const defaultCost = body.overrideCostPerPlacement || 0;

    const imported: any[] = [];
    const skipped:  any[] = [];

    for (const pl of playlists) {
      // Deduplicate: check if a creator with this Spotify playlist ID already exists
      const existingStr = await kv.get(`creator:spotify:${pl.id}`);
      if (existingStr) {
        skipped.push({ id: pl.id, name: pl.name, reason: "Already in network" });
        continue;
      }

      const id       = crypto.randomUUID();
      const followers = pl.followers || 0;
      // Auto-assign tier by followers
      const tier =
        followers >= 2_000_000 ? "elite"    :
        followers >= 500_000   ? "premium"  :
        followers >= 100_000   ? "standard" :
        followers >= 10_000    ? "micro"    : "nano";

      const creator = {
        id,
        platform:          "spotify_playlist",
        name:              pl.owner?.name   || pl.name,
        handle:            pl.owner?.id     || "",
        email:             "",
        contactName:       pl.owner?.name   || "",
        profileUrl:        pl.owner?.profileUrl || pl.externalUrl || "",
        playlistName:      pl.name,
        playlistUrl:       pl.externalUrl   || "",
        playlistId:        pl.id,
        playlistFollowers: followers,
        followers,
        imageUrl:          pl.imageUrl || null,
        description:       pl.description  || "",
        trackCount:        pl.trackCount   || 0,
        engagementRate:    0,
        avgViews:          0,
        genres:            [],
        niche:             pl.description   || "",
        country:           "",
        language:          "English",
        tier,
        costPerPost:       defaultCost,
        costPerPlacement:  defaultCost,
        acceptanceRate:    0,
        avgResponseDays:   7,
        pastCampaigns:     0,
        totalReachDelivered: 0,
        notes:             `Imported from Spotify. ${pl.description || ""}`.trim(),
        status:            "active",
        verified:          false,
        tags:              ["spotify-import"],
        importedFrom:      "spotify",
        importedAt:        new Date().toISOString(),
        createdAt:         new Date().toISOString(),
      };

      await kv.set(`creator:${id}`,           JSON.stringify(creator));
      // Secondary index: look up by Spotify playlist ID for deduplication
      await kv.set(`creator:spotify:${pl.id}`, JSON.stringify({ creatorId: id }));

      imported.push(creator);
    }

    return c.json({
      imported: imported.length,
      skipped:  skipped.length,
      importedItems: imported,
      skippedItems:  skipped,
    });
  } catch (err) {
    console.log(`[Spotify Import] error:`, err);
    return c.json({ error: `Spotify import error: ${err}` }, 500);
  }
});

// ── Refresh a single imported playlist's follower count ───────────────────────
// PUT /spotify/refresh/:creatorId
spotifyApp.put(`${P}/spotify/refresh/:creatorId`, async (c) => {
  try {
    const adminId = await verifyAdminRequest(c);
    if (!adminId) return c.json({ error: "Admin access required" }, 403);

    const creatorId = c.req.param("creatorId");
    const str = await kv.get(`creator:${creatorId}`);
    if (!str) return c.json({ error: "Creator not found" }, 404);

    const creator = JSON.parse(str);
    if (!creator.playlistId) return c.json({ error: "No Spotify playlist ID on this creator" }, 400);

    const fields = "id,name,description,images,followers,tracks.total,owner,external_urls";
    const data   = await spotifyFetch(
      `/playlists/${creator.playlistId}?fields=${encodeURIComponent(fields)}&market=US`
    );
    if (!data) return c.json({ error: "Playlist not found on Spotify" }, 404);

    const pl = normalizePlaylist(data);
    const updated = {
      ...creator,
      followers:         pl.followers,
      playlistFollowers: pl.followers,
      trackCount:        pl.trackCount,
      playlistName:      pl.name,
      description:       pl.description,
      imageUrl:          pl.imageUrl || creator.imageUrl,
      lastRefreshedAt:   new Date().toISOString(),
    };

    await kv.set(`creator:${creatorId}`, JSON.stringify(updated));
    return c.json({ creator: updated });
  } catch (err) {
    console.log(`[Spotify Refresh] error:`, err);
    return c.json({ error: `Spotify refresh error: ${err}` }, 500);
  }
});