/**
 * /api/dj-pool — FreqVault DJ Pool
 * Tracks, curated drops, crates, hearts, downloads, subscriptions, labels.
 */
const crypto  = require('crypto');
const express = require('express');
const multer  = require('multer');
const { v4: uuid } = require('uuid');
const db      = require('./db');
const { uploadFile } = require('./upload');
const { requireAdmin, requireArtist } = require('./middleware');

const router = express.Router();

// Memory storage → Vercel Blob (no local disk writes, works on Vercel)
const mem = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });
const trackUpload = mem.fields([{ name: 'audio', maxCount: 1 }, { name: 'cover', maxCount: 1 }]);
const dropUpload  = mem.single('cover');

// ─── Seeds ───────────────────────────────────────────────────────────────────

const SEED_LABELS = [
  { id: 'mixxea-records',    name: 'Mixxea Records',    logo: '', description: 'Dark, forward electronic releases curated for high-impact DJ sets.',        genre_focus: 'Techno / Minimal / Industrial' },
  { id: 'freqvault-promos',  name: 'FreqVault Promos',  logo: '', description: 'Limited upfront promos and club tools from the FreqVault network.',          genre_focus: 'Peak-time / Bass / Melodic' }
];

const SEED_TRACKS = [
  { id: 'fv-001', title: 'Dark Matter',     artist: 'KRATOS', label: 'Mixxea Records',   genre: 'Techno',        bpm: 128, musical_key: '12A', energy_level: 5, audio_url: '', cover_image: '', release_date: '2026-05-29', is_exclusive: true,  is_promo: false, is_featured: true,  dj_notes: 'Pressure tool. Long percussive intro, clean 32-bar outro.',  formats: ['MP3','WAV'], download_count: 0, created_at: '2026-05-29T00:00:00Z' },
  { id: 'fv-002', title: 'Ocean Floor Dub', artist: 'SOLV',   label: 'Mixxea Records',   genre: 'Deep House',    bpm: 122, musical_key: '8A',  energy_level: 3, audio_url: '', cover_image: '', release_date: '2026-05-26', is_exclusive: false, is_promo: true,  is_featured: true,  dj_notes: 'Warmup groove with long blend points.',                      formats: ['MP3','WAV'], download_count: 0, created_at: '2026-05-26T00:00:00Z' },
  { id: 'fv-003', title: 'Void Protocol',   artist: 'LYDA',   label: 'FreqVault Promos', genre: 'Industrial',    bpm: 135, musical_key: '7A',  energy_level: 5, audio_url: '', cover_image: '', release_date: '2026-05-22', is_exclusive: true,  is_promo: true,  is_featured: false, dj_notes: 'Warehouse cut for late peak slots.',                         formats: ['MP3','WAV'], download_count: 0, created_at: '2026-05-22T00:00:00Z' },
  { id: 'fv-004', title: 'Signal Loss',     artist: 'AXON',   label: 'Mixxea Records',   genre: 'Ambient Techno',bpm: 118, musical_key: '4A',  energy_level: 2, audio_url: '', cover_image: '', release_date: '2026-05-18', is_exclusive: false, is_promo: false, is_featured: false, dj_notes: 'Texture-led bridge record for opening sets.',                 formats: ['MP3'],       download_count: 0, created_at: '2026-05-18T00:00:00Z' }
];

const PLAN_RULES = {
  Starter:  { download_limit: 25,   exclusive: false, early_access: false },
  'Pro DJ': { download_limit: null, exclusive: true,  early_access: false },
  Elite:    { download_limit: null, exclusive: true,  early_access: true  }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function col(name, seed = []) {
  const data = await db.get(name);
  if (Array.isArray(data) && data.length) return data;
  if (seed.length) { await db.set(name, seed); return seed; }
  return [];
}

/* Persistent visitor ID — works for guests, artists, and admins */
function visitorId(req) {
  if (!req.session.guestId) req.session.guestId = 'g-' + uuid().slice(0, 8);
  return req.session.artistId || req.session.adminEmail || req.session.guestId;
}

function normalizeTrack(input, existing = {}) {
  const now = new Date().toISOString();
  return {
    id:            existing.id || uuid(),
    title:         String(input.title         || existing.title         || '').trim(),
    artist:        String(input.artist        || existing.artist        || '').trim(),
    label:         String(input.label         || existing.label         || 'Mixxea Records').trim(),
    genre:         String(input.genre         || existing.genre         || '').trim(),
    bpm:           Number(input.bpm           || existing.bpm           || 0),
    musical_key:   String(input.musical_key   || existing.musical_key   || '').trim(),
    energy_level:  Math.max(1, Math.min(5, Number(input.energy_level  || existing.energy_level  || 3))),
    audio_url:     input.audio_url    || existing.audio_url    || '',
    cover_image:   input.cover_image  || existing.cover_image  || '',
    waveform_url:  existing.waveform_url || '',
    release_date:  input.release_date || existing.release_date || now.slice(0, 10),
    is_exclusive:  input.is_exclusive  === true || input.is_exclusive  === 'true',
    is_promo:      input.is_promo      === true || input.is_promo      === 'true',
    is_featured:   input.is_featured   === true || input.is_featured   === 'true',
    dj_notes:      input.dj_notes     || existing.dj_notes     || '',
    formats:       Array.isArray(input.formats) ? input.formats
                   : String(input.formats || existing.formats || 'MP3,WAV').split(',').map(s => s.trim()).filter(Boolean),
    download_count: Number(existing.download_count || 0),
    created_at:    existing.created_at || now
  };
}

function filterTracks(tracks, q) {
  const txt    = String(q.q    || '').trim().toLowerCase();
  const genre  = String(q.genre || '').toLowerCase();
  const label  = String(q.label || '').toLowerCase();
  const key    = String(q.key   || '').toLowerCase();
  const minBpm = Number(q.minBpm || 0);
  const maxBpm = Number(q.maxBpm || 999);
  const energy = Number(q.energy || 0);
  const from   = q.from ? new Date(q.from) : null;

  return tracks.filter(t => {
    if (txt    && !`${t.title} ${t.artist} ${t.label}`.toLowerCase().includes(txt)) return false;
    if (genre  && t.genre.toLowerCase()       !== genre)  return false;
    if (label  && t.label.toLowerCase()       !== label)  return false;
    if (key    && t.musical_key.toLowerCase() !== key)    return false;
    if (t.bpm  < minBpm || t.bpm > maxBpm)               return false;
    if (energy && t.energy_level !== energy)              return false;
    if (from   && new Date(t.release_date) < from)        return false;
    return true;
  });
}

async function getSubscription(req) {
  if (req.session?.admin) return { id: 'admin', tier: 'Elite', status: 'active', download_limit: null, downloads_used: 0 };
  const uid  = visitorId(req);
  const subs = await col('subscriptions');
  return subs.find(s => s.user_id === uid && s.status === 'active') || null;
}

function canDownload(track, sub) {
  if (!sub) return { ok: false, code: 401, error: 'Subscribe to the DJ Pool to download tracks.' };
  const rules = PLAN_RULES[sub.tier] || PLAN_RULES.Starter;
  if (track.is_exclusive && !rules.exclusive) return { ok: false, code: 403, error: 'Exclusive — requires Pro DJ or Elite plan.' };
  if (rules.download_limit !== null && Number(sub.downloads_used || 0) >= rules.download_limit)
    return { ok: false, code: 403, error: `Download limit (${rules.download_limit}) reached. Upgrade your plan.` };
  return { ok: true };
}

function signUrl(track, uid) {
  const exp = Date.now() + 15 * 60 * 1000;
  const sig = crypto.createHmac('sha256', process.env.SESSION_SECRET || 'dev-secret')
    .update(`${track.id}:${uid}:${exp}`).digest('hex');
  const base = track.audio_url || `/uploads/audio/${track.id}.mp3`;
  return `${base}${base.includes('?') ? '&' : '?'}dl=1&exp=${exp}&sig=${sig}`;
}

// ─── Tracks ───────────────────────────────────────────────────────────────────

router.get('/tracks', async (req, res) => {
  const tracks = await col('djPoolTracks', SEED_TRACKS);
  const filtered = filterTracks(tracks, req.query)
    .sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
  res.json({
    tracks: filtered,
    facets: {
      genres: [...new Set(tracks.map(t => t.genre ).filter(Boolean))].sort(),
      labels: [...new Set(tracks.map(t => t.label ).filter(Boolean))].sort(),
      keys:   [...new Set(tracks.map(t => t.musical_key).filter(Boolean))].sort()
    }
  });
});

router.get('/tracks/suggested', async (req, res) => {
  const tracks  = await col('djPoolTracks', SEED_TRACKS);
  const uid     = visitorId(req);
  const hearts  = await col('djPoolHearts');
  const dls     = await col('djPoolDownloads');

  const heartedIds    = hearts.filter(h => h.user_id === uid).map(h => h.track_id);
  const downloadedIds = dls.filter(d => d.user_id === uid).map(d => d.track_id);
  const heartedTracks = tracks.filter(t => heartedIds.includes(t.id));

  const prefGenres = [...new Set(heartedTracks.map(t => t.genre))];
  const bpms       = heartedTracks.map(t => t.bpm);
  const avgBpm     = bpms.length ? bpms.reduce((a, b) => a + b, 0) / bpms.length : 128;

  const suggested = tracks
    .filter(t => !heartedIds.includes(t.id) && !downloadedIds.includes(t.id))
    .map(t => {
      let score = 0;
      if (prefGenres.includes(t.genre))         score += 3;
      if (Math.abs(t.bpm - avgBpm) <= 8)        score += 2;
      if (t.is_featured)                         score += 1;
      if (t.download_count > 5)                  score += 1;
      return { ...t, _score: score };
    })
    .sort((a, b) => b._score !== a._score ? b._score - a._score : new Date(b.release_date) - new Date(a.release_date))
    .slice(0, 8)
    .map(({ _score, ...t }) => t);

  res.json({ suggested, based_on: heartedTracks.length ? 'your liked tracks' : 'recent releases' });
});

router.get('/tracks/:id', async (req, res) => {
  const tracks  = await col('djPoolTracks', SEED_TRACKS);
  const track   = tracks.find(t => t.id === req.params.id);
  if (!track) return res.status(404).json({ error: 'Track not found' });
  const related = tracks.filter(t => t.id !== track.id && (t.genre === track.genre || t.label === track.label)).slice(0, 6);
  res.json({ track, related });
});

router.post('/tracks', requireAdmin, trackUpload, async (req, res) => {
  const tracks = await col('djPoolTracks', SEED_TRACKS);
  const body   = { ...req.body };
  if (req.files?.audio?.[0]) body.audio_url    = await uploadFile(req.files.audio[0], 'dj-pool/audio');
  if (req.files?.cover?.[0]) body.cover_image  = await uploadFile(req.files.cover[0], 'dj-pool/covers');
  const track = normalizeTrack(body);
  if (!track.title || !track.artist) return res.status(400).json({ error: 'Title and artist required.' });
  tracks.unshift(track);
  await db.set('djPoolTracks', tracks);
  res.status(201).json(track);
});

router.put('/tracks/:id', requireAdmin, trackUpload, async (req, res) => {
  const tracks = await col('djPoolTracks', SEED_TRACKS);
  const idx    = tracks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Track not found' });
  const body = { ...req.body };
  if (req.files?.audio?.[0]) body.audio_url   = await uploadFile(req.files.audio[0], 'dj-pool/audio');
  if (req.files?.cover?.[0]) body.cover_image = await uploadFile(req.files.cover[0], 'dj-pool/covers');
  tracks[idx] = normalizeTrack(body, tracks[idx]);
  await db.set('djPoolTracks', tracks);
  res.json(tracks[idx]);
});

router.delete('/tracks/:id', requireAdmin, async (req, res) => {
  const tracks = await col('djPoolTracks', SEED_TRACKS);
  await db.set('djPoolTracks', tracks.filter(t => t.id !== req.params.id));
  res.json({ success: true });
});

// ─── Hearts ───────────────────────────────────────────────────────────────────

router.get('/hearts', async (req, res) => {
  const uid    = visitorId(req);
  const hearts = await col('djPoolHearts');
  res.json({ hearts: hearts.filter(h => h.user_id === uid).map(h => h.track_id) });
});

router.put('/hearts/:trackId', async (req, res) => {
  const uid    = visitorId(req);
  const hearts = await col('djPoolHearts');
  if (!hearts.find(h => h.user_id === uid && h.track_id === req.params.trackId)) {
    hearts.push({ id: uuid(), user_id: uid, track_id: req.params.trackId, created_at: new Date().toISOString() });
    await db.set('djPoolHearts', hearts);
  }
  res.json({ success: true });
});

router.delete('/hearts/:trackId', async (req, res) => {
  const uid    = visitorId(req);
  const hearts = await col('djPoolHearts');
  await db.set('djPoolHearts', hearts.filter(h => !(h.user_id === uid && h.track_id === req.params.trackId)));
  res.json({ success: true });
});

// ─── Curated Drops (admin packs) ─────────────────────────────────────────────

router.get('/drops', async (req, res) => {
  const drops = await col('djPoolDrops');
  const tracks = await col('djPoolTracks', SEED_TRACKS);
  const pub = drops.filter(d => d.published).map(d => ({
    ...d,
    tracks: (d.track_ids || []).map(id => tracks.find(t => t.id === id)).filter(Boolean)
  }));
  res.json(pub);
});

router.post('/drops', requireAdmin, dropUpload, async (req, res) => {
  const drops = await col('djPoolDrops');
  const drop  = {
    id:          uuid(),
    name:        String(req.body.name        || '').trim(),
    description: String(req.body.description || '').trim(),
    genre:       String(req.body.genre       || '').trim(),
    cover_image: '',
    track_ids:   req.body.track_ids ? String(req.body.track_ids).split(',').map(s => s.trim()).filter(Boolean) : [],
    published:   req.body.published === 'true' || req.body.published === true,
    created_at:  new Date().toISOString()
  };
  if (req.file) drop.cover_image = await uploadFile(req.file, 'dj-pool/drops');
  if (!drop.name) return res.status(400).json({ error: 'Drop name required.' });
  drops.unshift(drop);
  await db.set('djPoolDrops', drops);
  res.status(201).json(drop);
});

router.delete('/drops/:id', requireAdmin, async (req, res) => {
  await db.set('djPoolDrops', (await col('djPoolDrops')).filter(d => d.id !== req.params.id));
  res.json({ success: true });
});

// ─── Crates ───────────────────────────────────────────────────────────────────

router.get('/crates', async (req, res) => {
  const uid    = visitorId(req);
  const crates = await col('djPoolCrates');
  const tracks = await col('djPoolTracks', SEED_TRACKS);
  res.json(
    crates
      .filter(c => c.user_id === uid)
      .map(c => ({ ...c, tracks: (c.track_ids || []).map(id => tracks.find(t => t.id === id)).filter(Boolean) }))
  );
});

router.post('/crates', async (req, res) => {
  const uid    = visitorId(req);
  const crates = await col('djPoolCrates');
  const crate  = { id: uuid(), user_id: uid, name: String(req.body.name || 'My Crate').trim(), track_ids: [], created_at: new Date().toISOString() };
  crates.push(crate);
  await db.set('djPoolCrates', crates);
  res.status(201).json(crate);
});

router.post('/crates/:id/tracks', async (req, res) => {
  const uid    = visitorId(req);
  const crates = await col('djPoolCrates');
  const idx    = crates.findIndex(c => c.id === req.params.id && c.user_id === uid);
  if (idx === -1) return res.status(404).json({ error: 'Crate not found.' });
  const tid = String(req.body.track_id || '').trim();
  if (tid && !(crates[idx].track_ids || []).includes(tid)) {
    crates[idx].track_ids = [...(crates[idx].track_ids || []), tid];
    await db.set('djPoolCrates', crates);
  }
  res.json({ success: true });
});

router.delete('/crates/:id/tracks/:trackId', async (req, res) => {
  const uid    = visitorId(req);
  const crates = await col('djPoolCrates');
  const idx    = crates.findIndex(c => c.id === req.params.id && c.user_id === uid);
  if (idx === -1) return res.status(404).json({ error: 'Crate not found.' });
  crates[idx].track_ids = (crates[idx].track_ids || []).filter(id => id !== req.params.trackId);
  await db.set('djPoolCrates', crates);
  res.json({ success: true });
});

router.delete('/crates/:id', async (req, res) => {
  const uid = visitorId(req);
  await db.set('djPoolCrates', (await col('djPoolCrates')).filter(c => !(c.id === req.params.id && c.user_id === uid)));
  res.json({ success: true });
});

// ─── Downloads ────────────────────────────────────────────────────────────────

router.post('/download/:trackId', async (req, res) => {
  const tracks = await col('djPoolTracks', SEED_TRACKS);
  const track  = tracks.find(t => t.id === req.params.trackId);
  if (!track) return res.status(404).json({ error: 'Track not found.' });

  const sub   = await getSubscription(req);
  const check = canDownload(track, sub);
  if (!check.ok) return res.status(check.code).json({ error: check.error });

  const uid = visitorId(req);
  const dls = await col('djPoolDownloads');
  dls.push({ id: uuid(), user_id: uid, track_id: track.id, created_at: new Date().toISOString() });
  await db.set('djPoolDownloads', dls);

  // Increment download counter on track
  const tIdx = tracks.findIndex(t => t.id === track.id);
  if (tIdx >= 0) { tracks[tIdx].download_count = (tracks[tIdx].download_count || 0) + 1; await db.set('djPoolTracks', tracks); }

  // Decrement Starter allowance
  if (sub?.id && sub.id !== 'admin' && PLAN_RULES[sub.tier]?.download_limit !== null) {
    const subs = await col('subscriptions');
    const sIdx = subs.findIndex(s => s.id === sub.id);
    if (sIdx >= 0) { subs[sIdx].downloads_used = (subs[sIdx].downloads_used || 0) + 1; await db.set('subscriptions', subs); }
  }

  res.json({ success: true, url: signUrl(track, uid), expires_in: 900 });
});

// ─── Subscription ─────────────────────────────────────────────────────────────

router.get('/subscription', async (req, res) => {
  res.json({ subscription: await getSubscription(req) });
});

router.post('/subscription', requireArtist, async (req, res) => {
  const tier = PLAN_RULES[req.body.tier] ? req.body.tier : 'Starter';
  const uid  = visitorId(req);
  const subs = await col('subscriptions');
  const idx  = subs.findIndex(s => s.user_id === uid && s.status === 'active');
  const rules = PLAN_RULES[tier];
  const sub = {
    ...(idx >= 0 ? subs[idx] : { id: uuid(), user_id: uid, downloads_used: 0 }),
    tier, status: 'active',
    start_date:     subs[idx]?.start_date || new Date().toISOString(),
    download_limit: rules.download_limit,
    updated_at:     new Date().toISOString()
  };
  if (idx >= 0) subs[idx] = sub; else subs.push(sub);
  await db.set('subscriptions', subs);
  res.status(idx >= 0 ? 200 : 201).json({ subscription: sub });
});

// ─── Labels ───────────────────────────────────────────────────────────────────

router.get('/labels', async (req, res) => {
  res.json(await col('djPoolLabels', SEED_LABELS));
});

router.get('/labels/:id', async (req, res) => {
  const labels = await col('djPoolLabels', SEED_LABELS);
  const tracks = await col('djPoolTracks', SEED_TRACKS);
  const label  = labels.find(l => l.id === req.params.id || l.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === req.params.id);
  if (!label) return res.status(404).json({ error: 'Label not found.' });
  res.json({ label, tracks: tracks.filter(t => t.label === label.name), featured: tracks.filter(t => t.label === label.name && t.is_featured) });
});

// ─── Admin Analytics ──────────────────────────────────────────────────────────

router.get('/admin/analytics', requireAdmin, async (req, res) => {
  const [tracks, dls, crates, subs] = await Promise.all([
    col('djPoolTracks', SEED_TRACKS),
    col('djPoolDownloads'),
    col('djPoolCrates'),
    col('subscriptions')
  ]);
  const topTracks = tracks
    .map(t => ({ ...t, downloads: dls.filter(d => d.track_id === t.id).length }))
    .sort((a, b) => b.downloads - a.downloads)
    .slice(0, 10);
  res.json({
    counts: { tracks: tracks.length, downloads: dls.length, crates: crates.length, active_subscriptions: subs.filter(s => s.status === 'active').length },
    topTracks
  });
});

module.exports = router;
