/**
 * Cookie banner layout and focus. Run: node test/cookie-banner.js
 */
const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(__dirname, '../public/css/site.css'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, '../public/js/consent.js'), 'utf8');
const home = fs.readFileSync(path.join(__dirname, '../src/render/homePage.js'), 'utf8');

function assert(cond, message) {
  if (!cond) {
    console.error('FAIL', message);
    process.exit(1);
  }
}

assert(css.includes('@media (max-width:480px)'), 'stacked buttons stay at 390px');
assert(!css.includes('max-width:390px'), 'old 390px breakpoint still present');
assert(css.includes('max-height:calc(100dvh - 24px)'), 'preferences max-height missing');
assert(!css.includes('max-height:268px'), 'capped preferences height still present');
assert(!css.includes('.consent.is-prefs .consent-row{position:sticky'), 'sticky preference buttons still present');
assert(css.includes('rgba(2,2,10,.82)'), 'hero caption scrim missing');
assert(js.includes('if (opener)'), 'footer reopen does not focus the banner');
assert(!js.includes('if (!opener) root.focus'), 'banner still focused on load');
assert(js.includes('function fitBanner'), 'preferences banner does not size itself');
assert(js.includes("document.querySelector('[data-consent-avoid]')"), 'catalogue avoidance is not marked');
assert(!js.includes('Explore the catalogue'), 'catalogue link is still matched by text');
assert(home.includes('data-consent-avoid'), 'hero catalogue link is not marked');
assert(!js.includes('Math.max(1, room)'), 'preferences banner can still shrink to 1px');

const source = js.match(/function preferenceLimit\(content, cap, room\) \{[\s\S]*?\n  \}/);
assert(source, 'preferenceLimit missing');
const preferenceLimit = new Function(source[0] + '\nreturn preferenceLimit;')();
assert(preferenceLimit(343, 544, 1) === 544, 'short room hides the choices');
assert(preferenceLimit(337, 828, 281) === 828, 'content that misses the gap should use the viewport cap');
assert(preferenceLimit(200, 828, 281) === 281, 'content that fits the gap should avoid the link');
assert(preferenceLimit(200, 800, 400) === 400, 'avoidance cap dropped');
assert(preferenceLimit(600, 544, 100) === 544, 'tall content should scroll inside the viewport cap');
assert(preferenceLimit(300, 544, null) === 544, 'missing link should use the viewport cap');

console.log('ok  cookie banner');
