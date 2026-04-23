const DEFAULT_SCHEMA = process.env.SUPABASE_DB_SCHEMA || 'public';

function getSupabaseConfig() {
  return {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    schema: DEFAULT_SCHEMA,
    buckets: {
      artwork: process.env.SUPABASE_STORAGE_ARTWORK_BUCKET || 'artwork',
      audio: process.env.SUPABASE_STORAGE_AUDIO_BUCKET || 'audio',
      contracts: process.env.SUPABASE_STORAGE_CONTRACTS_BUCKET || 'contracts'
    }
  };
}

function isSupabaseConfigured() {
  const config = getSupabaseConfig();
  return Boolean(config.url && config.anonKey);
}

function buildRestUrl(table, query) {
  const config = getSupabaseConfig();
  const suffix = query ? (query.startsWith('?') ? query : '?' + query) : '';
  return config.url + '/rest/v1/' + table + suffix;
}

async function supabaseRequest({ table, method = 'GET', query = '', body, serviceRole = false, headers = {} }) {
  const config = getSupabaseConfig();
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Add SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY to .env.');
  }

  const apiKey = serviceRole ? config.serviceRoleKey : config.anonKey;
  const response = await fetch(buildRestUrl(table, query), {
    method,
    headers: {
      apikey: apiKey,
      Authorization: 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Prefer: method === 'GET' ? 'count=exact' : 'return=representation',
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message = typeof data === 'object' && data?.message ? data.message : 'Supabase request failed';
    const error = new Error(message);
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return {
    status: response.status,
    data,
    count: response.headers.get('content-range') || null
  };
}

async function getSupabaseStatus() {
  const config = getSupabaseConfig();
  const base = {
    configured: isSupabaseConfigured(),
    urlPresent: Boolean(config.url),
    anonKeyPresent: Boolean(config.anonKey),
    serviceRolePresent: Boolean(config.serviceRoleKey),
    schema: config.schema,
    buckets: config.buckets
  };

  if (!base.configured) {
    return { ...base, reachable: false };
  }

  try {
    const response = await fetch(config.url + '/rest/v1/', {
      headers: {
        apikey: config.anonKey,
        Authorization: 'Bearer ' + config.anonKey
      }
    });
    return { ...base, reachable: response.ok || response.status === 404, statusCode: response.status };
  } catch (error) {
    return { ...base, reachable: false, error: error.message };
  }
}

module.exports = {
  getSupabaseConfig,
  isSupabaseConfigured,
  supabaseRequest,
  getSupabaseStatus
};
