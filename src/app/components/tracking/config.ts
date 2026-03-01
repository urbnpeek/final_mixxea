/**
 * MIXXEA Global Tracking Configuration
 * ─────────────────────────────────────────────────────────────────────────────
 * Replace the placeholder IDs below with your real pixel/measurement IDs.
 * These values are intentionally client-safe (public IDs only).
 *
 * ⚠️  Never store secret keys or server-side tokens here.
 *
 * GA4:        https://analytics.google.com  → Admin → Data Streams → Measurement ID
 * Meta Pixel: https://business.facebook.com → Events Manager → Pixel ID
 * TikTok:     https://ads.tiktok.com        → Assets → Events → Pixel ID
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const TRACKING_CONFIG = {
  ga4: {
    /** Google Analytics 4 Measurement ID  e.g.  "G-ABCDE12345" */
    measurementId: 'G-XXXXXXXXXX',
    enabled: true,
  },
  metaPixel: {
    /** Meta (Facebook) Pixel ID */
    pixelId: '1331927570650344',
    enabled: true,
  },
  tiktokPixel: {
    /** TikTok Pixel ID  e.g.  "C4G6EXAMPLE1234" */
    pixelId: 'XXXXXXXXXXXXXXXXXX',
    enabled: true,
  },
} as const;

/** localStorage key used to persist consent decisions */
export const CONSENT_STORAGE_KEY = 'mixxea_cookie_consent_v1';

/** How many days before the consent banner re-appears (GDPR recommends ≤ 13 months) */
export const CONSENT_EXPIRY_DAYS = 180;