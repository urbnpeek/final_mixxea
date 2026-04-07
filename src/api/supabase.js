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
    configured: Boolean(config.url && config.anonKey && config.serviceRoleKey),
    urlPresent: Boolean(config.url),
    anonKeyPresent: Boolean(config.anonKey),
    serviceRolePresent: Boolean(config.serviceRoleKey),
    schema: config.schema,
    buckets: config.buckets
  });
});

module.exports = router;
