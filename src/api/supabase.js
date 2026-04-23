const express = require('express');
const { getSupabaseStatus, getSupabaseConfig } = require('../lib/supabase');

const router = express.Router();

router.get('/status', async (req, res) => {
  const status = await getSupabaseStatus();
  res.json(status);
});

router.get('/config', (req, res) => {
  const config = getSupabaseConfig();
  res.json({
    configured: Boolean(config.url && config.anonKey),
    urlPresent: Boolean(config.url),
    anonKeyPresent: Boolean(config.anonKey),
    serviceRolePresent: Boolean(config.serviceRoleKey),
    schema: config.schema,
    buckets: config.buckets
  });
});

// Diagnostic endpoint — returns the raw Supabase response so we can see exact errors
router.get('/ping', async (req, res) => {
  const config = getSupabaseConfig();
  const url = config.url + '/rest/v1/mixxea_data?key=eq.releases&select=value&limit=1';
  try {
    const r = await fetch(url, {
      headers: {
        apikey: config.anonKey,
        Authorization: 'Bearer ' + config.anonKey,
        Accept: 'application/json',
        Prefer: 'count=exact'
      }
    });
    const body = await r.text();
    res.json({
      ok: r.ok,
      status: r.status,
      url,
      anonKeyStart: config.anonKey.slice(0, 30) + '...',
      body: body.slice(0, 600)
    });
  } catch (e) {
    res.json({ error: e.message, type: e.constructor.name, url });
  }
});

module.exports = router;
