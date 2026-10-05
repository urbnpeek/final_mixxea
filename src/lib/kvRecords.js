/**
 * Small key/value layer used by the per-record content store.
 * Redis (Upstash REST) when configured, otherwise a local JSON file.
 * compareAndSet is atomic on Redis via EVAL and synchronous on disk.
 */

const fs = require('fs');
const path = require('path');

function redisConfig() {
  return {
    url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '',
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '',
  };
}

function isRedisConfigured() {
  const { url, token } = redisConfig();
  return Boolean(url && token);
}

function localPath() {
  const dir = process.env.KV_LOCAL_DIR || path.join(__dirname, '../../data/kv');
  return { dir, file: path.join(dir, 'store.json') };
}

function localReadAll() {
  const { file } = localPath();
  if (!fs.existsSync(file)) return {};
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function localWriteAll(map) {
  const { dir, file } = localPath();
  fs.mkdirSync(dir, { recursive: true });
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(map));
  fs.renameSync(tmp, file);
}

async function redisCommand(args) {
  const { url, token } = redisConfig();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error('Redis command failed: ' + res.status);
  const json = await res.json();
  if (json.error) throw new Error(String(json.error));
  return json.result;
}

function parseStored(result) {
  if (result == null) return null;
  if (typeof result !== 'string') return result;
  try { return JSON.parse(result); } catch { return result; }
}

async function getKey(key) {
  if (isRedisConfigured()) {
    return parseStored(await redisCommand(['GET', key]));
  }
  const map = localReadAll();
  return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : null;
}

async function setKey(key, value) {
  if (isRedisConfigured()) {
    await redisCommand(['SET', key, JSON.stringify(value)]);
    return;
  }
  const map = localReadAll();
  map[key] = value;
  localWriteAll(map);
}

async function delKey(key) {
  if (isRedisConfigured()) {
    await redisCommand(['DEL', key]);
    return;
  }
  const map = localReadAll();
  delete map[key];
  localWriteAll(map);
}

const CAS_LUA = `
local key = KEYS[1]
local expected = tonumber(ARGV[1])
local payload = ARGV[2]
local raw = redis.call('GET', key)
local currentRev = 0
local updatedBy = ''
local updatedAt = ''
if raw then
  local ok, doc = pcall(cjson.decode, raw)
  if ok and type(doc) == 'table' then
    currentRev = tonumber(doc.rev) or 0
    if doc.updatedBy then updatedBy = tostring(doc.updatedBy) end
    if doc.updatedAt then updatedAt = tostring(doc.updatedAt) end
  end
  if currentRev ~= expected then
    return cjson.encode({ ok = false, conflict = true, rev = currentRev, updatedBy = updatedBy, updatedAt = updatedAt })
  end
elseif expected ~= 0 then
  return cjson.encode({ ok = false, missing = true })
end
redis.call('SET', key, payload)
return cjson.encode({ ok = true })
`;

async function compareAndSet(key, expectedRev, nextDoc) {
  const expected = Number(expectedRev) || 0;
  if (isRedisConfigured()) {
    const raw = await redisCommand(['EVAL', CAS_LUA, '1', key, String(expected), JSON.stringify(nextDoc)]);
    const parsed = parseStored(raw);
    return parsed && typeof parsed === 'object' ? parsed : { ok: false, conflict: true };
  }
  const map = localReadAll();
  const current = Object.prototype.hasOwnProperty.call(map, key) ? map[key] : null;
  if (current) {
    const rev = Number(current.rev) || 0;
    if (rev !== expected) {
      return {
        ok: false,
        conflict: true,
        rev,
        updatedBy: current.updatedBy || '',
        updatedAt: current.updatedAt || '',
      };
    }
  } else if (expected !== 0) {
    return { ok: false, missing: true };
  }
  map[key] = nextDoc;
  localWriteAll(map);
  return { ok: true };
}

async function redisEval(script, keys, args) {
  if (!isRedisConfigured()) throw new Error('Redis is not configured');
  const keyList = Array.isArray(keys) ? keys : [keys];
  const argList = (Array.isArray(args) ? args : [args]).map((value) => String(value));
  return redisCommand(['EVAL', script, String(keyList.length), ...keyList, ...argList]);
}

module.exports = {
  isRedisConfigured,
  getKey,
  setKey,
  delKey,
  compareAndSet,
  redisEval,
};
