# Homepage performance audit — 2026-10-02

Live URL: `https://www.mixxea.com/`  
Tool: Lighthouse CLI 12.6.1, headless Chrome 148. Mobile is the default preset (simulated slow 4G, 4× CPU). Desktop is `--preset=desktop`. Three runs each. Figures below are the **median** of the three runs. Scores and Core Web Vitals are the values Lighthouse uses for the performance category.

## Core Web Vitals (before)

| Metric | Mobile median | Desktop median |
| --- | ---: | ---: |
| Performance score | 70 | 90 |
| LCP | 10.8 s | 2.0 s |
| FCP | 2.8 s | 0.8 s |
| TBT | 0 ms | 0 ms |
| CLS | 0.003 | 0.027 |
| Speed Index | 2.8 s | 0.8 s |
| Total weight | 1,810,295 B (1,768 KiB) | 1,810,672 B (1,768 KiB) |
| Requests | 30 | 30 |

Mobile run scores were 74, 70, 70. Desktop run scores were 91, 90, 73. The low desktop score was a CLS outlier of 0.351 caused by the hero web-font swap; the other two desktop CLS samples were 0.027.

### Ratings (mobile / desktop)

Thresholds from web.dev: LCP good &lt; 2.5 s, FCP good &lt; 1.8 s, TBT good &lt; 200 ms, CLS good &lt; 0.1, Speed Index good &lt; 3.4 s.

- LCP: mobile poor, desktop good
- FCP: mobile needs improvement, desktop good
- TBT: good on both
- CLS: good on both at the median (one desktop run was poor)
- Speed Index: good on both

Mobile LCP is almost entirely render delay, not a late image download. On the median mobile run the LCP element is `section#hero > div.h-content > div.h-bot > p.h-tag` (“Electronic music for every underground.”). About 94% of that LCP is render delay under simulated throttling. Lighthouse’s unthrottled phase breakdown on the same trace was only ~37 ms TTFB and ~246 ms render delay; the 10.8 s figure is the simulated score. The simulation is dominated by decoding ~1.6 MB of PNG artist photos and by the render-blocking Google Fonts stylesheet.

Desktop LCP is `section#hero > div.h-bg-txt` (the giant stroked “MIXXEA”). It is text, not an image. About 90% of desktop LCP is render delay while Anton is discovered through the Google Fonts CSS chain.

There is **no LCP image**. The hero is type, a canvas, and CSS. `fetchpriority="high"` and an image preload are not applicable. The critical resources are the Syne (mobile LCP text), Anton (desktop LCP text), and Syne Mono (nav and eyebrow) latin woff2 files.

## Images

Successful image bytes are three artist PNGs on Vercel Blob. Together they are about 1.63 MB of the 1.77 MB page. Two news `<img>` tags 404 and return a 3.8 KB HTML error. The favicon is a 252 B SVG.

Displayed sizes are from the mobile Lighthouse image-delivery insight. None of these images had `loading="lazy"`, `width`/`height`, or a modern format. Artist tiles are `object-fit: cover` at opacity 0.55 inside a fixed box (300×420 desktop, 260×360 under 900px, `82vw` max 280×340 under 640px).

| Image | Format | Bytes | Intrinsic | Displayed (mobile) | Lazy |
| --- | --- | ---: | --- | --- | --- |
| David Hopperman photo (`…/5123c006-….png`) | PNG | 742,062 | 694×862 | 280×348 | no |
| Eddie Bitar photo (`…/d32e0f88-….png`) | PNG | 474,345 | 639×654 | 332×340 | no |
| Wally Lopez photo (`…/6025a5c6-….png`) | PNG | 449,512 | 932×507 | tile crop, not flagged as oversized | no |
| `/uploads/artwork/4d4860c3-….png` (news) | 404 HTML | 3,826 | unknown (file missing) | news card | no |
| `/uploads/artwork/fef4b19e-….png` (news) | 404 HTML | 3,826 | unknown (file missing) | news card | no |
| `/favicon.svg` | SVG | 252 | vector | favicon | n/a |

Lighthouse estimated about 1,523 KiB from modern formats and about 680 KiB from responsive sizing. David is the oversized one (694 px wide for a ~280–300 px tile). Eddie is already close to 2×. Wally is a wide crop; the format, not the pixel count, is the waste. Blob cache is `public, max-age=2592000` (30 days). There are not 10 distinct successful images on the homepage.

The originals stay on Blob and remain the `<img src>` fallback. This change adds AVIF and WebP `srcset` files under `public/media/artists/` and does not delete the Blob objects.

## Fonts

The homepage requested one Google stylesheet:

`https://fonts.googleapis.com/css2?family=Anton&family=Syne:wght@400;500;600;700;800&family=Syne+Mono&display=swap`

| Family | Weights requested | What actually downloads | Source | font-display | Preload |
| --- | --- | --- | --- | --- | --- |
| Anton | 400 | latin woff2, 12,004 B | fonts.gstatic.com | `swap` (in the Google CSS) | no |
| Syne | 400, 500, 600, 700, 800 | one variable latin woff2 (`wght` 400–800), 34,560 B | fonts.gstatic.com | `swap` | no |
| Syne Mono | 400 | latin woff2, 10,896 B | fonts.gstatic.com | `swap` | no |

Chrome only downloads the latin subset (unicode-range). Greek and Vietnamese faces in the stylesheet are not fetched. Syne’s five weights are the same variable file, so dropping 500 and 800 from the CSS URL does not shrink the download. Weight 500 is used once, on a hidden admin label. Weight 800 is not used in the homepage CSS. The body, the mobile LCP paragraph, and headings use Syne 400 / 600 / 700. Anton is the display face. Syne Mono is UI labels.

The stylesheet is the only render-blocking resource Lighthouse flagged, about 1,169 B transferred and an estimated 520–770 ms. The font files are then a second hop. `preconnect` was already present for `fonts.googleapis.com` and `fonts.gstatic.com`. Total font transfer was about 58 KB across 3 requests, plus the CSS.

CLS on the hero is attributed to those three font files swapping in. Median CLS is still in the “good” range.

## JavaScript

| File | Uncompressed | Brotli (live) | How it loads |
| --- | ---: | ---: | --- |
| `/js/app.js?v=10` | 32,390 B | ~8,282 B | end of `<body>`, no `defer`/`async` |
| `/js/admin.js?v=10` | 59,652 B | ~15,713 B | immediately after `app.js`, no `defer`/`async` |
| Inline classic scripts in `index.html` | ~23 KB | part of the HTML | parser-blocking, includes GTM bootstrap, admin UI, scroll reveal |
| GTM `gtm.js`, gtag, Meta `fbevents.js` | 0 B | — | tags are in the HTML; responses were status -1 / 0 bytes |

Lighthouse did not flag unused JavaScript (audit score 1) or render-blocking scripts. The two local files are parser-blocking at the end of the body, so they delay `DOMContentLoaded` but not first paint. `app.js` then refetches `/api/artists` (four times), `/api/releases`, `/api/news`, `/api/events`, and `/api/auth/artist/check`, and rewrites the roster, releases, news, and events that the server already rendered.

Third-party script URLs in the document:

- `https://www.googletagmanager.com/gtm.js?id=GTM-KCNCSXM7`
- `https://www.googletagmanager.com/gtag/js?id=G-MEVRRCQQ5T` (`async`)
- `https://connect.facebook.net/en_US/fbevents.js` (injected `async`)

Helmet CSP is `script-src 'self' 'unsafe-inline'`. Chrome blocks those three external scripts. They do not currently execute. That is existing behavior; this change does not alter the CSP or the tags.

## CSS

Homepage CSS is one inline `<style>` block, about 56 KB, inside the HTML document. It is not a separate request. The only external stylesheet is the Google Fonts CSS above, and that was the only render-blocking request. Other stylesheets (`seo-pages.css`, `dj-pool.css`) are not used on the homepage.

## Caching

`vercel.json` had a catch-all `Cache-Control: no-store, no-cache, must-revalidate` on `/(.*)`. On the live site the Express response header is what the browser receives (the function header wins over that catch-all):

| Resource | Live `Cache-Control` | Where it is set |
| --- | --- | --- |
| `GET /` HTML | `no-store, no-cache, must-revalidate` | `sendHtml()` and the vercel.json catch-all |
| `/js/app.js`, `/js/admin.js` | `public, max-age=0` | `express.static` `maxAge: 0` for `/js` |
| `/favicon.svg` and other svg/png/css/woff | `public, max-age=2592000, immutable` | `express.static` `setHeaders` |
| `/record-label`, `/robots.txt`, `/manifest.json` | `public, max-age=0` | `sendFile` / static default |
| `/api/artists` (and the other public JSON GETs) | `public, max-age=0, must-revalidate` | route handlers, not the vercel.json `no-store` |
| Blob artist PNGs | `public, max-age=2592000` | Vercel Blob |
| `/sitemap.xml` | `public, s-maxage=3600, stale-while-revalidate=86400` | route + vercel.json |

`no-store` on the HTML document blocks back/forward cache. The `?v=10` query on the scripts was not a content hash and was paired with `max-age=0`, so it did not cache.

## Compression

Vercel’s edge already Brotli-compresses text. A live request with `Accept-Encoding: br` returned `content-encoding: br` for the HTML (162 KB → ~35 KB), `app.js`, and `admin.js`. Lighthouse’s text-compression audit passed. Express itself does not compress. Image bodies are already compressed pixels (PNG), which is why Brotli does not help them; the win is AVIF/WebP.

## LCP element

| Form factor | Element | Why it is late |
| --- | --- | --- |
| Mobile | `<p class="h-tag">` inside `.h-content.rv` | Simulated render delay while large PNGs decode and fonts arrive through a blocking CSS chain. The node is Syne, not an image. |
| Desktop | `<div class="h-bg-txt">MIXXEA</div>` | Anton is not preloaded. The face is found only after the Google CSS download. |

On viewports under 640px, `.h-bg-txt` is `display: none`, which is why mobile LCP is the paragraph instead of the background wordmark. `.h-content` also receives `.animate` (opacity 0) until an `IntersectionObserver` adds `.in`. That fade is a separate, intentional entrance. It was not removed.

## Quick wins, ranked by impact then effort

1. **AVIF/WebP artist photos, sized for the tile.** Highest impact. Lighthouse estimated ~1.5 MB and several seconds of simulated LCP. Implemented. Originals kept as the `<img>` fallback.
2. **Self-host the three latin faces, `font-display: swap`, preload them, drop the render-blocking Google CSS.** About 0.5–0.8 s and the font-discovery chain. Implemented. Latin-ext stays available via `unicode-range` and is not preloaded. Greek and Vietnamese were not downloaded before and are not hosted.
3. **`loading="lazy"` and `decoding="async"` on roster, release, and news images.** They are below the hero. The hero has no image, so nothing there is lazy-loaded. Implemented. `width` and `height` are set from the intrinsic file (or the news card box when the file 404s).
4. **Cache hashed JS (`?v=<content hash>`) and hashed fonts/media for a year, `immutable`.** HTML is `public, max-age=0, must-revalidate` so a reload revalidates and back/forward cache can work. Implemented. Unversioned `/js/*.js` stays `max-age=0`.
5. **`defer` on `app.js` and `admin.js`.** Keeps execution order. They stay at the end of the body, after the inline script that defines `openAdmin`. Implemented.
6. **Stop forcing `.rv` hero content to `opacity: 0` before the observer runs.** Would cut the real fade-in delay on the mobile LCP text. Not done: it changes the entrance animation.
7. **Move the admin overlay and its inline script off the homepage document.** Large HTML on every visit. Not done: it changes when admin UI is available.
8. **Repair the two 404 news images.** The files are not in the repo or on the live server. Not invented.

## After (this PR’s Vercel preview)

Same Lighthouse CLI (12.6.1, 3 runs, median) against the preview deployment `final-mixxea-378nueprv-urbnpeeks-projects.vercel.app`, which is the build of this branch. The preview is behind Vercel Authentication; the runs used a short-lived bypass cookie and were not a redirect. SSR HTML on that deployment includes the three artist `<picture>` elements, so the missing image bytes are lazy-load deferral, not missing content. Vercel Brotli is on (`content-encoding: br`).

| Metric | Mobile before (www) | Mobile after (preview) | Desktop before (www) | Desktop after (preview) |
| --- | ---: | ---: | ---: | ---: |
| Performance | 70 | 98 | 90 | 100 |
| LCP | 10.8 s | 2.4 s | 2.0 s | 0.61 s |
| FCP | 2.8 s | 1.1 s | 0.8 s | 0.33 s |
| TBT | 0 ms | 0 ms | 0 ms | 0 ms |
| CLS | 0.003 | 0 | 0.027 | 0 |
| Speed Index | 2.8 s | 1.4 s | 0.8 s | 0.57 s |
| Total weight | 1,810,295 B | 128,283 B | 1,810,672 B | 128,249 B |
| Requests | 30 | 23 | 30 | 23 |

Preview mobile run 1 transfer: document ~38 KB (brotli), three latin fonts ~58 KB, no image bytes during the trace. Mobile LCP moved to the nav wordmark (`a.nav-logo`). Desktop LCP stayed on `div.h-bg-txt`.

A local `node server.js` run (no Brotli) scored 90 mobile / 100 desktop with a 348 KB uncompressed transfer. Those numbers are not the comparison above. Local Lighthouse did flag ~50 KB of unused JavaScript in `admin.js`, which is still downloaded on every homepage view.

## What this PR changes

- `public/media/artists/`: AVIF and WebP variants of the three live roster photos. David is capped at 640 px wide (2× the 300 px tile). Eddie stays at its intrinsic 639 px. Wally is served at 480 and 800 px wide. The Blob PNG remains the fallback `src`.
- `public/fonts/`: latin and latin-ext woff2 for Anton, Syne (variable 400–800), and Syne Mono, content-hashed. Homepage `@font-face` uses `font-display: swap`. The three latin files used in the first viewport are preloaded. The Google Fonts stylesheet and its preconnects are removed from the homepage only. Other pages still use Google Fonts.
- Homepage images rendered on the server and again in `app.js` get `width`/`height`, `decoding="async"`, and `loading="lazy"`. No hero image, so no `fetchpriority="high"` image preload.
- `app.js` and `admin.js` use `defer`. The homepage rewrites `?v=` to a hash of the file.
- HTML cache is `public, max-age=0, must-revalidate`. Versioned `/js/*?v=`, `/fonts/`, and `/media/` are `public, max-age=31536000, immutable`. The vercel.json catch-all `no-store` is removed so it cannot override those.
- API `no-store`, sitemap caching, redirects, SEO tags, GTM/GA4/Meta snippets, and CSP are unchanged.

## Left out on purpose

- Opening CSP `script-src` for Tag Manager, GA4, or Meta. The tags are unchanged and still blocked, which is the current analytics behavior. Allowing them would add third-party JavaScript.
- Preconnect to `googletagmanager.com` or `facebook.net`. Those requests are blocked and a preconnect would be unused. After self-hosting, the old Google Fonts preconnects are unused on the homepage and were removed there.
- Deleting the 404 upload paths or substituting new art.
- Changing the scroll-reveal, canvas, marquee, colors, type scale, or copy.
- Extracting the inline admin document or the 56 KB inline stylesheet. Both would help repeat views but are a larger structural edit.
- Glyph-subsetting Syne below the latin range. New artist names could need characters that a page-specific subset would drop.
- `size-adjust` fallbacks. They can change line breaks if the metrics are wrong.
