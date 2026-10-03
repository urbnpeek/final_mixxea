/**
 * Cookie banner layout and focus. Run: node test/cookie-banner.js
 */
const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(__dirname, '../public/css/site.css'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, '../public/js/consent.js'), 'utf8');

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
assert(js.includes('function fitBanner'), 'preferences banner does not avoid the catalogue link');

console.log('ok  cookie banner');
