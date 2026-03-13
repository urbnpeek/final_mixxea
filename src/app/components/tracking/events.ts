/**
 * MIXXEA Tracking Event Catalog
 * ─────────────────────────────────────────────────────────────────────────────
 * All custom events fired across the MIXXEA platform are defined here.
 * Use the `trackEvent()` helper from TrackingContext wherever you need to
 * fire an event from a component.
 *
 * Event naming convention: snake_case, descriptive verb + noun pairs.
 *
 * Mapped to:
 *   ✅ Google Analytics 4  (gtag custom events)
 *   ✅ Meta Pixel           (fbq standard + custom events)
 *   ✅ TikTok Pixel         (ttq standard + custom events)
 *   ✅ Spotify Pixel        (spdt standard + custom events)
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Standard event names ────────────────────────────────────────────────────

export const EVENTS = {
  // ── Page / Navigation ──────────────────────────────────────────
  PAGE_VIEW: 'page_view',

  // ── Auth ───────────────────────────────────────────────────────
  /** User completes account registration */
  SIGN_UP: 'sign_up',
  /** User logs into existing account */
  LOGIN: 'login',
  /** User views the auth page */
  VIEW_AUTH: 'view_auth_page',

  // ── Landing / Marketing ────────────────────────────────────────
  /** Hero CTA "Get Started Free" clicked */
  HERO_CTA_CLICK: 'hero_cta_click',
  /** Pricing section becomes visible */
  VIEW_PRICING: 'view_pricing',
  /** User clicks a pricing plan button */
  SELECT_PLAN: 'select_plan',
  /** FAQ item expanded */
  FAQ_EXPAND: 'faq_expand',

  // ── Distribution ───────────────────────────────────────────────
  /** User starts a new release upload */
  DISTRIBUTION_START: 'distribution_start',
  /** User submits a release for distribution */
  DISTRIBUTION_SUBMIT: 'distribution_submit',

  // ── Promotions / Campaigns ─────────────────────────────────────
  /** User views the promotions page */
  VIEW_CAMPAIGNS: 'view_campaigns',
  /** User selects a campaign type/package */
  SELECT_CAMPAIGN: 'select_campaign',
  /** User adds a campaign to cart (initiates checkout) */
  ADD_TO_CART: 'add_to_cart',

  // ── Credits / Checkout ─────────────────────────────────────────
  /** User views the credits/checkout page */
  VIEW_CREDITS: 'view_credits',
  /** User initiates a credit purchase */
  BEGIN_CHECKOUT: 'begin_checkout',
  /** Payment completes successfully */
  PURCHASE: 'purchase',
  /** Payment fails */
  PAYMENT_FAILED: 'payment_failed',

  // ── Publishing ─────────────────────────────────────────────────
  /** User views publishing admin page */
  VIEW_PUBLISHING: 'view_publishing',
  /** User registers a new work */
  REGISTER_WORK: 'register_work',

  // ── Smart Pages ────────────────────────────────────────────────
  /** User creates / edits a Smart Page */
  SMART_PAGE_EDIT: 'smart_page_edit',
  /** Public visitor lands on a Smart Page */
  SMART_PAGE_VIEW: 'smart_page_view',

  // ── Playlist Marketplace ───────────────────────────────────────
  /** User views the playlist marketplace */
  VIEW_MARKETPLACE: 'view_marketplace',
  /** User pitches to a playlist */
  PITCH_PLAYLIST: 'pitch_playlist',

  // ── Royalty Splits ─────────────────────────────────────────────
  /** User creates a royalty split */
  CREATE_SPLIT: 'create_split',

  // ── Analytics (MIXXEA analytics page viewed) ───────────────────
  VIEW_ANALYTICS: 'view_analytics',

  // ── Settings ───────────────────────────────────────────────────
  /** User updates account settings */
  UPDATE_SETTINGS: 'update_settings',

  // ── Engagement ─────────────────────────────────────────────────
  /** User opens support ticket or message */
  OPEN_TICKET: 'open_ticket',
} as const;

export type EventName = typeof EVENTS[keyof typeof EVENTS];

// ─── Event → Meta Pixel standard event mapping ──────────────────────────────
// Meta has a set of Standard Events with higher optimisation priority.
// https://developers.facebook.com/docs/meta-pixel/reference

export const META_EVENT_MAP: Partial<Record<EventName, string>> = {
  [EVENTS.PAGE_VIEW]:          'PageView',
  [EVENTS.VIEW_PRICING]:       'ViewContent',
  [EVENTS.SELECT_PLAN]:        'ViewContent',
  [EVENTS.SELECT_CAMPAIGN]:    'ViewContent',
  [EVENTS.ADD_TO_CART]:        'AddToCart',
  [EVENTS.BEGIN_CHECKOUT]:     'InitiateCheckout',
  [EVENTS.PURCHASE]:           'Purchase',
  [EVENTS.SIGN_UP]:            'CompleteRegistration',
  [EVENTS.VIEW_MARKETPLACE]:   'Search',
};

// ─── Event → TikTok Pixel standard event mapping ────────────────────────────
// https://ads.tiktok.com/help/article?aid=10028056

export const TIKTOK_EVENT_MAP: Partial<Record<EventName, string>> = {
  [EVENTS.PAGE_VIEW]:          'Pageview',
  [EVENTS.VIEW_PRICING]:       'ViewContent',
  [EVENTS.SELECT_PLAN]:        'ViewContent',
  [EVENTS.SELECT_CAMPAIGN]:    'ViewContent',
  [EVENTS.ADD_TO_CART]:        'AddToCart',
  [EVENTS.BEGIN_CHECKOUT]:     'InitiateCheckout',
  [EVENTS.PURCHASE]:           'CompletePayment',
  [EVENTS.SIGN_UP]:            'CompleteRegistration',
};

// ─── Event → Spotify Pixel event mapping ─────────────────────────────────────
// Spotify supports three event types: view (page), product, lead
// https://ads.spotify.com/en-US/advertising-features/spotify-pixel/
//
// • 'product' → user views/interacts with a purchasable product/service
// • 'lead'    → user submits a form or signs up (lead capture)
// (page views are fired via spdt('view') automatically in trackPageView)

export type SpotifyEventType = 'product' | 'lead';

export interface SpotifyProductParams {
  value?: number;
  currency?: string;
  product_id?: string;
  product_name?: string;
  product_type?: string;
  product_vendor?: string;
  event_id: string;
}

export interface SpotifyLeadParams {
  type?: string;
  category?: string;
  currency?: string;
  value?: number;
  event_id: string;
}

/** Maps MIXXEA events to Spotify 'product' events */
export const SPOTIFY_PRODUCT_MAP: Partial<Record<EventName, Partial<SpotifyProductParams>>> = {
  [EVENTS.VIEW_CREDITS]:    { product_name: 'MIXXEA Credits', product_type: 'credits', product_vendor: 'MIXXEA' },
  [EVENTS.VIEW_PRICING]:    { product_name: 'MIXXEA Plan',    product_type: 'subscription', product_vendor: 'MIXXEA' },
  [EVENTS.SELECT_PLAN]:     { product_name: 'MIXXEA Plan',    product_type: 'subscription', product_vendor: 'MIXXEA' },
  [EVENTS.SELECT_CAMPAIGN]: { product_name: 'MIXXEA Campaign',product_type: 'promotion', product_vendor: 'MIXXEA' },
  [EVENTS.BEGIN_CHECKOUT]:  { product_name: 'MIXXEA Credits', product_type: 'credits', product_vendor: 'MIXXEA' },
  [EVENTS.PURCHASE]:        { product_name: 'MIXXEA Credits', product_type: 'credits', product_vendor: 'MIXXEA' },
};

/** Maps MIXXEA events to Spotify 'lead' events */
export const SPOTIFY_LEAD_MAP: Partial<Record<EventName, Partial<SpotifyLeadParams>>> = {
  [EVENTS.SIGN_UP]:   { type: 'registration', category: 'account' },
  [EVENTS.LOGIN]:     { type: 'login',         category: 'account' },
  [EVENTS.OPEN_TICKET]: { type: 'support',    category: 'engagement' },
};