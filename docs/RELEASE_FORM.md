# Approved demo → release details form

## Flow
1. Admin → Demos → **Approve**. A confirm asks whether to email the artist.
   - OK: `POST /api/demos/:id/approve` sets `status: approved`, creates a release link and emails it.
   - Cancel: status only (old behaviour, no email).
2. The artist opens `https://mixxea.com/release/<token>` (noindex, no-referrer, no analytics), checks the
   prefilled details, adds credits/splits, and uploads the **WAV** (required, .wav, max 500 MB) and optional
   artwork (.jpg/.png, max 20 MB). Files go **directly from the browser to private Vercel Blob storage**
   (client upload; `POST /api/release/:token/upload` only signs a short-lived, WAV-only/size-capped token).
3. Submit (`POST /api/release/:token`): server re-validates, confirms the files exist in storage (`head`),
   stores `demo.release.details/wav/artwork`, and emails the A&R list.
4. Admin sees per approved demo: link sent / details / WAV, the submitted details, and downloads files via
   `/api/demos/:id/release-file/wav|artwork` (admin session only; private Blob files have no presigned URL,
   so they are streamed).
5. **Resend link** creates a new token (old one stops working) and re-opens the form for corrections.

## Token
256-bit random (base64url), only the SHA-256 hash + `expiresAt` stored on the demo in `db:demos`.
Default life 30 days (`RELEASE_LINK_TTL_DAYS`, 1–90). Links stop working if the demo is no longer `approved`.

## Email safety
Approval emails reach the artist **only when `VERCEL_ENV=production`**. Everywhere else they go to the A&R
list (`DEMO_NOTIFY_EMAILS`/`AR_EMAIL`/admin notify) with a `[TEST - not sent to artist]` subject, or are only
logged when `EMAIL_MODE=log`. Sender: `EMAIL_FROM_DEMO` (default `Mixxea Records A&R <demo@mixxea.com>`).

## Preview isolation
`DB_MODE=memory` (ignored in production) keeps all data in memory with labelled example demos and never
touches Redis. Set `PREVIEW_RELEASE_TOKEN` (43-char base64url) to get a working example link.

## Env (names only)
Existing: `BLOB_READ_WRITE_TOKEN`, `RESEND_API_KEY`, `EMAIL_FROM_DEMO`, `DEMO_NOTIFY_EMAILS` or `AR_EMAIL`,
`PUBLIC_APP_URL` (optional). New, optional: `RELEASE_LINK_TTL_DAYS`, `EMAIL_MODE` (`log`), `DB_MODE` (`memory`,
preview only), `PREVIEW_RELEASE_TOKEN` (preview only).

## Rebuilding the browser upload bundle
`public/js/vendor/vercel-blob-client.js` = `export { upload } from '@vercel/blob/client'` bundled with
`npx esbuild@0.24.0 entry.mjs --bundle --format=iife --global-name=MixxeaBlob --platform=browser --minify --target=es2019`.

## Rollback
Revert the merge commit and redeploy. Demo records keep an extra `release` field, which older code ignores.
Uploaded files stay in Blob under `private/releases/<demoId>/`.
