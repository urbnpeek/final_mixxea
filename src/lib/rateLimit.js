/**
 * Sliding-window rate limit for public form posts.
 *
 * Uses the same Upstash Redis REST credentials as the content store
 * (KV_REST_API_URL / KV_REST_API_TOKEN, or UPSTASH_REDIS_REST_URL /
 * UPSTASH_REDIS_REST_TOKEN). When those are unset, counts stay in memory
 * on this process only. A multi-instance deploy (Vercel) needs Redis/KV
 * configured or each instance enforces its own window.
 */

const crypto = require('crypto');
const { isRedisConfigured, redisEval } = require('./kvRecords');

const LIMIT = 8;
const WINDOW_MS = 60 * 1000;

const SLIDING_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local member = ARGV[3]
redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)
redis.call('ZADD', key, now, member)
local count = redis.call('ZCARD', key)
redis.call('PEXPIRE', key, window)
return count
`;

const memory = new Map();

function memoryConsume(key, now) {
  const cutoff = now - WINDOW_MS;
  const hits = (memory.get(key) || []).filter((stamp) => stamp > cutoff);
  hits.push(now);
  memory.set(key, hits);
  return hits.length;
}

function backend() {
  return isRedisConfigured() ? 'redis' : 'memory';
}

async function consume(bucket, ip, now = Date.now()) {
  const key = `rl:v1:${bucket}:${ip || 'unknown'}`;
  if (isRedisConfigured()) {
    const member = `${now}:${crypto.randomBytes(8).toString('hex')}`;
    const count = await redisEval(SLIDING_LUA, [key], [now, WINDOW_MS, member]);
    return Number(count);
  }
  return memoryConsume(key, now);
}

function resetMemory() {
  memory.clear();
}

module.exports = {
  LIMIT,
  WINDOW_MS,
  backend,
  consume,
  resetMemory,
};
