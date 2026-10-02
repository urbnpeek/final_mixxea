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

GA4 and the Meta pixel stay unloaded until the visitor accepts analytics or marketing. A Lighthouse run with no choice stored does not load those tags.

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
- Direct gtag for `G-MEVRRCQQ5T` only. The empty container `GTM-KCNCSXM7` is gone. `G-BQW5PQ4Y99` and `G-PW4MLCMX1L` are not in the page. Consent Mode v2 defaults are denied, and `gtag.js` plus the Meta pixel (`1331927570650344`) load only after the matching choice. The choice is stored in `localStorage` under `mx-consent`. Footer “Cookie settings” reopens the banner.
- Production CSP keeps a per-request script nonce (no `unsafe-inline` and no `unsafe-eval` on `script-src`). Extra hosts kept after a Chrome console check: `https://analytics.google.com`, `https://www.google.com`, and `https://stats.g.doubleclick.net` on `connect-src` (GA4 collect and the linked Google tag); `'unsafe-inline'` on `style-src` (template `style` attributes); `'unsafe-inline'` on `script-src-attr` (admin and demo-form event handlers); `https://fonts.googleapis.com` and `https://fonts.gstatic.com` (DJ pool fonts); `https://cdnjs.cloudflare.com` (DJ pool JSZip). Preview (`VERCEL_ENV=preview`) also allows the Vercel Toolbar hosts: `https://vercel.live` on script, style, font, img, connect, and frame; `wss://ws-us3.pusher.com` on connect; `https://assets.vercel.com` on font; `https://vercel.com` and `blob:` on img.
- Corazon (MXX-087) Spotify is the URL Kira verified: `https://open.spotify.com/track/0McK0zrgqBM0xx8scNhegq`, with embed id `0McK0zrgqBM0xx8scNhegq`. Apple Music and Beatport on Naka and Corazon stay empty.
- S1NCE and FL3X are added as label artists with `onRoster: false` and `bookable: false`, so their releases pass the credit check and they do not get roster cards.
- Roster `srcset` lists only files on disk, and never a width above the real photo. Hopperman: 400, 600, and 800 (`david-hopperman-800.webp`). Lopez: `wally-lopez-400.webp` only. Bitar: `eddie-bitar-400.webp` plus the existing 480w file, which stays his largest candidate.
- Unpublished covers (MXX-052, 007, 054, 055, 057) are not in `public/`. Those releases stay `draft`.
- `/admin` serves the existing admin document with `noindex`. It is not linked from the public nav, and `admin.js` is not on the public homepage.
- Desktop Lighthouse picks the H1 as LCP because the 136 px headline box is larger than the portrait. Mobile, which is the acceptance run, picks the portrait.

## QA fix pass

Kira's fix-first notes are in the same preview branch. Checked locally with `VERCEL_ENV=preview` at 390, 768, 1024, and 1440. No page in that set was wider than the viewport.

Five mobile Lighthouse runs on the homepage (Lighthouse 12.8.2, simulated mobile throttling). LCP values: 2.180 s, 2.178 s, 2.181 s, 2.180 s, 2.181 s. Median LCP 2.18 s. The LCP element is the Hopperman portrait. CLS stayed 0.0002.

Headless Chrome, no stored choice: no requests to `google-analytics.com`, `analytics.google.com`, or `facebook.com`, and `fbevents.js` is not requested. `gtag.js` is not loaded, so there is no cookieless `gcs=G100` ping. Reject all stores `{analytics:false,marketing:false}` and still sends nothing. Accept all sends a GA4 `page_view` for `G-MEVRRCQQ5T` with `gcs=G111` to `https://analytics.google.com/g/collect` and loads `fbevents.js`. Google’s downloaded gtag container also emits a second `page_view` for the linked property `G-BQW5PQ4Y99`; that id is not in our code.

Signed-out admin API checks are in the PR report. Writes return 403. Catalogue reads `GET /api/releases`, `/api/artists`, `/api/news`, `/api/events`, and `/api/news/categories` stay public.

## Go-live order

Do not run either migration with `--apply` until Fuad signs off and these land in this order:

1. Merge PR #10.
2. Merge PR #11.
3. `node scripts/migrate-redesign-data.js --apply`
4. `node scripts/migrate-private-blobs.js --apply`

`--apply` on the private-blob script copies each public demo and contract blob to private storage, updates the KV record, and deletes the public copy only after the private copy is verified. It writes a JSON backup under `data/backups/` first. It was not run here.

Set `UNSUBSCRIBE_SECRET` before newsletter mail is sent. Private Blob uses the existing `BLOB_READ_WRITE_TOKEN` with `access: 'private'`. No extra Blob env var.

## Still blocked on confirmation

Unconfirmed dates stay `draft`. Unconfirmed links stay empty.

- Dates: MXX-052 (01 Jul 2019 on file), MXX-007 (07 Aug 2017 on file), MXX-054, MXX-055, MXX-057 (no date on file).
- Links: Apple Music and Beatport for MXX-092 and MXX-087. Spotify for MXX-052 and MXX-007. Every platform link for MXX-054, MXX-055, and MXX-057. Corazon Spotify is confirmed and is no longer on this list.
