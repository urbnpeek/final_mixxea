/**
 * Apex mixxea.com -> https://www.mixxea.com 308 with includeSubDomains HSTS.
 * Run: node test/apex-redirect.js
 */
const http = require('http');

delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;

function request(port, urlPath, host, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path: urlPath, method, headers: { Host: host } }, (res) => {
      res.resume();
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers }));
    });
    req.on('error', reject);
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const HSTS = 'max-age=63072000; includeSubDomains';

async function main() {
  const app = require('../server');
  const server = await new Promise((resolve) => {
    const handle = app.listen(0, '127.0.0.1', () => resolve(handle));
  });
  const port = server.address().port;
  try {
    const cases = [
      ['/', 'https://www.mixxea.com/'],
      ['/booking-agency?artist=x&utm_source=ig', 'https://www.mixxea.com/booking-agency?artist=x&utm_source=ig'],
      ['/api/contact', 'https://www.mixxea.com/api/contact'],
      ['/sitemap.xml', 'https://www.mixxea.com/sitemap.xml'],
    ];
    for (const host of ['mixxea.com', 'MIXXEA.com', 'mixxea.com:443']) {
      for (const [urlPath, location] of cases) {
        const res = await request(port, urlPath, host);
        assert(res.status === 308, host + urlPath + ' status ' + res.status);
        assert(res.headers.location === location, host + urlPath + ' location ' + res.headers.location);
        assert(res.headers['strict-transport-security'] === HSTS, host + urlPath + ' hsts ' + res.headers['strict-transport-security']);
      }
    }
    const post = await request(port, '/api/contact', 'mixxea.com', 'POST');
    assert(post.status === 308, 'POST keeps 308 ' + post.status);
    console.log('ok  apex redirects');

    for (const host of ['www.mixxea.com', 'final-mixxea.vercel.app', 'email.mixxea.com']) {
      const res = await request(port, '/', host);
      assert(res.status === 200, host + ' status ' + res.status);
      assert(!res.headers.location, host + ' unexpected redirect');
      assert(res.headers['strict-transport-security'] === HSTS, host + ' hsts');
    }
    console.log('ok  non-apex hosts served');
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
