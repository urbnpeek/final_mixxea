const express = require('express');
const { getSupabaseStatus, getSupabaseConfig } = require('../lib/supabase');
const { requireAdmin } = require('./middleware');

const router = express.Router();

function presence(config) {
  return {
    configured: Boolean(config.url && config.anonKey),
    urlPresent: Boolean(config.url),
    anonKeyPresent: Boolean(config.anonKey),
    serviceRolePresent: Boolean(config.serviceRoleKey),
  };
}

router.get('/status', requireAdmin, async (req, res) => {
  const status = await getSupabaseStatus();
  const body = {
    configured: Boolean(status.configured),
    urlPresent: Boolean(status.urlPresent),
    anonKeyPresent: Boolean(status.anonKeyPresent),
    serviceRolePresent: Boolean(status.serviceRolePresent),
    reachable: Boolean(status.reachable),
  };
  if (typeof status.statusCode === 'number') body.statusCode = status.statusCode;
  res.json(body);
});

router.get('/config', requireAdmin, (req, res) => {
  res.json(presence(getSupabaseConfig()));
});

// Read-only reachability check. No keys, URLs, or response bodies.
router.get('/ping', requireAdmin, async (req, res) => {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return res.json({ configured: false, reachable: false });
  }
  try {
    const response = await fetch(config.url.replace(/\/+$/, '') + '/rest/v1/', {
      headers: {
        apikey: config.anonKey,
        Authorization: 'Bearer ' + config.anonKey,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(4000),
    });
    await response.arrayBuffer().catch(() => {});
    res.json({
      configured: true,
      reachable: response.ok || response.status === 404,
      statusCode: response.status,
    });
  } catch (e) {
    res.json({ configured: true, reachable: false });
  }
});

module.exports = router;
