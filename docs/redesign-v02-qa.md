# Direction A (CATALOGUE) — local QA

Vercel Preview for this project uses production KV and Blob credentials, so this run did not open the preview admin, did not call a write API, and did not run the migration with `--apply`. Lighthouse and the screenshots below are from a local server with fixture data shaped like the catalogue before the migration, and with `VERCEL_ENV=preview` so the same in-memory transform the preview uses is applied at read time.

```bash
node scripts/serve-redesign-preview.js
```

The script refuses to start if Redis credentials are set, copies `test/fixtures/redesign` into `data/*.json` for the process lifetime, and restores those files on exit.

## Lighthouse

Homepage, local Chrome, fixture data. Scores are from Lighthouse  (mobile throttling / desktop preset).

| | Performance | Accessibility | Best practices | LCP | CLS | LCP element |
|---|---:|---:|---:|---:|---:|---|
| Mobile | 92 | 100 | 79 | 2.1 s | 0.0002 | `figure.hero-portrait > img` |
| Desktop | 100 | 100 | 78 | 0.5 s | 0.0027 | `h1.h-title` |

Acceptance on mobile is met for performance (≥ 90), accessibility (≥ 95), CLS (< 0.05), zero console errors, and the LCP element (the Hopperman portrait). The §13 mobile LCP budget is under 2.0 s. This throttled local run measured 2.1 s. Most of that is render delay after the 31 KB image has loaded, not the image weight.

Best-practices stays under 100 because GA4 and the Meta pixel set third-party cookies. Those tags are required. Console CSP errors from the first run were cleared by adding the hosts those tags actually call (see deviations).

Checked on the fixture server: no 404 assets on the homepage, releases, release detail, news, category, or article pages. `/artists/vexr` and `/artists/lyda` are 404. The homepage, `/api/artists`, `/api/releases`, and `/sitemap.xml` contain none of VEXR, LYDA, MXA004, MXA005, or `Est. 2024`. Book links render for David Hopperman, Wally Lopez, and Eddie Bitar only.

## Migration dry-run

`node scripts/migrate-redesign-data.js --fixtures test/fixtures/redesign`

```
redesign migration (dry-run)
source: fixtures:/workspace/test/fixtures/redesign
  change  artists  david-hopperman  David Hopperman  [bookable, bookingEmail, country, featured, genre, onRoster, photo, photoAlt]
  change  artists  wally-lopez  Wally Lopez  [bookable, bookingEmail, country, featured, genre, onRoster, photo, photoAlt]
  change  artists  eddie-bitar  Eddie Bitar  [bookable, bookingEmail, featured, onRoster, photo, photoAlt]
  delete  artists  vexr  VEXR
  delete  artists  lyda  LYDA
  add  artists  s1nce  S1NCE
  add  artists  fl3x  FL3X
  delete  releases  mxa004  Grind System EP
  delete  releases  mxa005-drafted  Void Protocol
  change  releases  rel-love  Love & Fake  [apple, artists, bandcamp, links, soundcloud, spotify, status]
  change  releases  rel-naka  Naka  [apple, artists, artworkThumb, bandcamp, beatport, cover, description, embed, format, label, links, ogImage, releaseDate, slug, soundcloud, type, youtube]
  add  releases  mxx-087  Corazon
  delete  news  post-vexr  VEXR in the studio
  delete  events  ev-lyda  ev-lyda
  add  categories  label  Label
  add  categories  agency  Agency
  add  categories  releases  Releases
  add  categories  artists  Artists
18 difference(s)
no changes written
```

The fixture includes the cases Fuad may already have done by hand: MXA005 is already `draft`, and a second unit-test pass starts from a Hopperman record whose email is already `booking@mixxea.com`. The draft fake release is still deleted. The corrected email is left alone. `transform(transform(data))` is stable.

It is safe against the live shape. Artists, events, and categories are whole-collection records. Releases and news are read from the per-record index when that index exists (PR #10), otherwise from the legacy array. `--apply` writes a JSON backup of every touched record under `data/backups/` first, then updates the same source it read. It was not run here. Do not run it, and do not merge this to production, until Fuad signs off. Until then, `bookable` defaults to false, so a production deploy of this code without the migration would hide every booking CTA.

## Screenshots

Saved at `/opt/cursor/artifacts/redesign-v02/`. Widths are 1440, 1024, 768, and 390.

- `home-*.png` — homepage
- `releases-*.png` — `/releases`
- `release-*.png` — `/releases/s1nce-naka`
- `news-*.png` — `/news`
- `category-*.png` — `/news/category/artists`
- `article-*.png` — Hopperman roster article

## Deviations

- Fonts are self-hosted under `public/fonts/` (latin only). The spec lists that as a later step. It removes the render-blocking Google Fonts stylesheet, which was the main CLS source (the H1 reflowed when Barlow arrived).
- GTM, GA4, and the Meta pixel still load and still send `page_view`, but only after `window` `load`, so they do not compete with the hero image. GA4 DebugView, GTM Preview, and the Meta Pixel Helper were not checked against the Vercel preview.
- CSP is the §7 block plus the hosts those tags call today: `https://analytics.google.com` (the `*.analytics.google.com` wildcard does not cover the apex), `https://www.google.com`, `https://stats.g.doubleclick.net`, `frame-src https://www.facebook.com`, and `form-action https://www.facebook.com`. Production is not widened further. Preview (`VERCEL_ENV=preview`) also allows the Vercel Toolbar hosts from Vercel’s CSP notes: `https://vercel.live` on script, style, font, img, connect, and frame; `wss://ws-us3.pusher.com` on connect; `https://assets.vercel.com` on font; `https://vercel.com` and `blob:` on img.
- Corazon (MXX-087) Spotify is the URL Kira verified: `https://open.spotify.com/track/0McK0zrgqBM0xx8scNhegq`, with embed id `0McK0zrgqBM0xx8scNhegq`. Apple Music and Beatport on Naka and Corazon stay empty.
- S1NCE and FL3X are added as label artists with `onRoster: false` and `bookable: false`, so their releases pass the credit check and they do not get roster cards.
- Roster `srcset` lists only files on disk, and never a width above the real photo. Hopperman: 400, 600, and 800 (`david-hopperman-800.webp`). Lopez: `wally-lopez-400.webp` only. Bitar: `eddie-bitar-400.webp` plus the existing 480w file, which stays his largest candidate.
- Unpublished covers (MXX-052, 007, 054, 055, 057) are not in `public/`. Those releases stay `draft`.
- `/admin` serves the existing admin document with `noindex`. It is not linked from the public nav, and `admin.js` is not on the public homepage.
- Desktop Lighthouse picks the H1 as LCP because the 136 px headline box is larger than the portrait. Mobile, which is the acceptance run, picks the portrait.

## QA fix pass

Kira's fix-first notes are in the same preview branch. Checked locally with `VERCEL_ENV=preview` at 390, 768, 1024, and 1440. No page in that set was wider than the viewport.

Five mobile Lighthouse runs on the homepage (Lighthouse 12.8.2, simulated mobile throttling). LCP values: 2.180 s, 2.178 s, 2.181 s, 2.180 s, 2.181 s. Median LCP 2.18 s. The LCP element is the Hopperman portrait. CLS stayed 0.0002.

Headless Chrome after load: GA4 `page_view` to `https://analytics.google.com/g/collect` with `tid=G-MEVRRCQQ5T` and `en=page_view`. GTM `GTM-KCNCSXM7` also sent a second `page_view` for `G-BQW5PQ4Y99`. The Meta pixel `1331927570650344` loaded `fbevents.js` and `connect.facebook.net/signals/config/1331927570650344`, and the pixel's event count was 1. This headless session did not show a `facebook.com/tr` request. The console had no CSP violations; this server does not send a CSP header.

Signed-out admin API checks are in the PR report. Writes return 403. Catalogue reads `GET /api/releases`, `/api/artists`, `/api/news`, `/api/events`, and `/api/news/categories` stay public.

## Still blocked on confirmation

Unconfirmed dates stay `draft`. Unconfirmed links stay empty.

- Dates: MXX-052 (01 Jul 2019 on file), MXX-007 (07 Aug 2017 on file), MXX-054, MXX-055, MXX-057 (no date on file).
- Links: Apple Music and Beatport for MXX-092 and MXX-087. Spotify for MXX-052 and MXX-007. Every platform link for MXX-054, MXX-055, and MXX-057. Corazon Spotify is confirmed and is no longer on this list.
