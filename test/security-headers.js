/**
 * CSP hashes, consent headers, and cookie disclosure.
 * Run: node test/security-headers.js
 */
const http = require('http');
const { hashSource, bodiesFromHtml } = require('../src/lib/scriptHashes');

delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;

function request(port, urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.get({ hostname: '127.0.0.1', port, path: urlPath }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks).toString('utf8'),
      }));
    });
    req.on('error', reject);
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function directive(csp, name) {
  return (csp || '').split(';').map((part) => part.trim()).find((part) => part === name || part.startsWith(name + ' ')) || '';
}

async function main() {
  const app = require('../server');
  const server = await new Promise((resolve) => {
    const handle = app.listen(0, '127.0.0.1', () => resolve(handle));
  });
  const port = server.address().port;
  const paths = ['/', '/privacy', '/news', '/releases', '/booking-agency', '/portal', '/admin', '/dj-pool.html'];
  try {
    for (const urlPath of paths) {
      const res = await request(port, urlPath);
      assert(res.status === 200, urlPath + ' status ' + res.status);
      const csp = res.headers['content-security-policy'] || '';
      const scriptSrc = directive(csp, 'script-src');
      const scriptSrcAttr = directive(csp, 'script-src-attr');
      assert(scriptSrc && !scriptSrc.includes('unsafe-inline') && !scriptSrc.includes('unsafe-eval'), urlPath + ' script-src ' + scriptSrc);
      assert(!csp.includes('cdnjs.cloudflare.com'), urlPath + ' still allows cdnjs');
      assert(scriptSrcAttr === "script-src-attr 'none'", urlPath + ' script-src-attr ' + scriptSrcAttr);
      assert(!res.body.includes('nonce='), urlPath + ' still has a CSP nonce');
      assert(!/\son(?:click|change|input|submit)\s*=/i.test(res.body), urlPath + ' inline handler');
      assert(!res.body.includes('cdnjs.cloudflare.com'), urlPath + ' loads cdnjs');
      assert(res.headers['permissions-policy'] === 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()', urlPath + ' permissions');
      const hsts = res.headers['strict-transport-security'] || '';
      assert(hsts === 'max-age=63072000; includeSubDomains', urlPath + ' hsts ' + hsts);
      assert(csp.includes('https://pagead2.googlesyndication.com'), urlPath + ' ads connect missing');
      assert(csp.includes('https://www.googleadservices.com'), urlPath + ' adservices missing');
      assert(csp.includes('https://googleads.g.doubleclick.net'), urlPath + ' googleads missing');
      assert(/frame-src[^;]*https:\/\/www\.facebook\.com/.test(csp), urlPath + ' facebook frame');
      assert(/form-action[^;]*https:\/\/www\.facebook\.com/.test(csp), urlPath + ' facebook form');
      bodiesFromHtml(res.body).forEach((body) => {
        const hash = hashSource(body);
        assert(scriptSrc.includes(hash), urlPath + ' missing hash for inline script');
      });
      console.log('ok ', urlPath);
    }

    const home = await request(port, '/');
    assert(String(home.headers['cache-control']).includes('s-maxage=300'), 'home cache ' + home.headers['cache-control']);
    const booking = await request(port, '/booking-agency');
    assert(String(booking.headers['cache-control']).includes('no-store'), 'booking cache');
    const privacy = await request(port, '/privacy');
    assert(privacy.body.includes('_ga_BQW5PQ4Y99'), 'linked GA cookie missing');
    assert(privacy.body.includes('_gcl_au'), 'ads linker cookie missing');
    assert(privacy.body.includes('_fbp'), 'meta cookie missing');
    assert(privacy.body.includes('Google Analytics measurement ID used by our Google tag'), 'neutral measurement wording');
    assert(privacy.body.includes('Freq Grup SRL'), 'controller changed');
    const consent = require('fs').readFileSync(require('path').join(__dirname, '../public/js/consent.js'), 'utf8');
    assert(consent.includes('domain=.mixxea.com'), 'mixxea cookie domain');
    assert(consent.includes("'_ga_*'") && consent.includes("'_gcl_*'") && consent.includes("'_gcl_au'"), 'cookie patterns');
    const applyAt = consent.indexOf('function apply');
    const updateAt = consent.indexOf("gtag('consent', 'update'", applyAt);
    const clearAt = consent.indexOf('clearTracking(choice)', applyAt);
    assert(updateAt !== -1 && clearAt !== -1 && updateAt < clearAt, 'consent update before cookie clear');
    console.log('ok  disclosure and cookie clear');
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
