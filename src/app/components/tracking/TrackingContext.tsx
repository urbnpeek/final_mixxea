/**
 * MIXXEA TrackingContext
 * ─────────────────────────────────────────────────────────────────────────────
 * Central tracking provider that:
 *   1. Manages GDPR consent state (persisted in localStorage)
 *   2. Loads GA4 / Meta Pixel / TikTok Pixel scripts on-demand (post-consent)
 *   3. Implements GA4 Consent Mode v2 (analytics_storage / ad_storage)
 *   4. Exposes trackEvent() and trackPageView() to the entire app
 *   5. Auto-fires page_view on every React Router navigation
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'react-router';
import { TRACKING_CONFIG, CONSENT_STORAGE_KEY, CONSENT_EXPIRY_DAYS } from './config';
import { EVENTS, META_EVENT_MAP, TIKTOK_EVENT_MAP, type EventName } from './events';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ConsentState {
  /** Necessary cookies — always true, no opt-out */
  necessary: true;
  /** GA4 analytics tracking */
  analytics: boolean;
  /** Meta Pixel + TikTok Pixel marketing/retargeting */
  marketing: boolean;
  /** ISO timestamp of when consent was recorded */
  timestamp: string;
}

export interface TrackingContextValue {
  consent: ConsentState | null;
  hasConsented: boolean;
  grantAll: () => void;
  denyAll: () => void;
  updateConsent: (partial: Pick<ConsentState, 'analytics' | 'marketing'>) => void;
  trackEvent: (name: EventName | string, params?: Record<string, unknown>) => void;
  trackPageView: (path: string, title?: string) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const TrackingContext = createContext<TrackingContextValue | null>(null);

export function useTracking() {
  const ctx = useContext(TrackingContext);
  if (!ctx) throw new Error('useTracking must be used within <TrackingProvider>');
  return ctx;
}

// ─── Script loaders ──────────────────────────────────────────────────────────

function initGA4ConsentMode() {
  if (typeof window === 'undefined') return;
  // GA4 Consent Mode v2 default — all denied until explicit consent
  (window as any).dataLayer = (window as any).dataLayer || [];
  function gtag(...args: unknown[]) { (window as any).dataLayer.push(args); }
  gtag('consent', 'default', {
    analytics_storage:    'denied',
    ad_storage:           'denied',
    ad_user_data:         'denied',
    ad_personalization:   'denied',
    wait_for_update:       500,
  });
  gtag('js', new Date());
  (window as any).gtag = gtag;
}

function loadGA4(measurementId: string) {
  if (!measurementId || measurementId.includes('X') || document.getElementById('mixxea-ga4')) return;
  const s = document.createElement('script');
  s.id = 'mixxea-ga4';
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(s);
  const inline = document.createElement('script');
  inline.id = 'mixxea-ga4-init';
  inline.text = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${measurementId}',{send_page_view:false});`;
  document.head.appendChild(inline);
}

function loadMetaPixel(pixelId: string) {
  if (!pixelId || pixelId.includes('X') || document.getElementById('mixxea-meta-pixel')) return;

  // Official Meta Pixel base code — exact snippet from Meta Events Manager
  const s = document.createElement('script');
  s.id = 'mixxea-meta-pixel';
  s.text = `!function(f,b,e,v,n,t,s)\n{if(f.fbq)return;n=f.fbq=function(){n.callMethod?\nn.callMethod.apply(n,arguments):n.queue.push(arguments)};\nif(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';\nn.queue=[];t=b.createElement(e);t.async=!0;\nt.src=v;s=b.getElementsByTagName(e)[0];\ns.parentNode.insertBefore(t,s)}(window,document,'script',\n'https://connect.facebook.net/en_US/fbevents.js');\nfbq('init','${pixelId}');\nfbq('track','PageView');`;
  document.head.appendChild(s);
}

function loadTikTokPixel(pixelId: string) {
  if (!pixelId || pixelId.includes('X') || document.getElementById('mixxea-ttq')) return;
  const s = document.createElement('script');
  s.id = 'mixxea-ttq';
  s.text = `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=d.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${pixelId}');ttq.page()}(window,document,'ttq');`;
  document.head.appendChild(s);
}

// ─── Consent helpers ─────────────────────────────────────────────────────────

function readStoredConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentState & { timestamp: string };
    // Check expiry
    const stored = new Date(parsed.timestamp).getTime();
    const expiryMs = CONSENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    if (Date.now() - stored > expiryMs) {
      localStorage.removeItem(CONSENT_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeConsent(consent: ConsentState) {
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
}

// ─── GA4 consent mode updater ────────────────────────────────────────────────

function updateGA4Consent(analytics: boolean, marketing: boolean) {
  const gtag = (window as any).gtag;
  if (typeof gtag !== 'function') return;
  gtag('consent', 'update', {
    analytics_storage:  analytics  ? 'granted' : 'denied',
    ad_storage:         marketing  ? 'granted' : 'denied',
    ad_user_data:       marketing  ? 'granted' : 'denied',
    ad_personalization: marketing  ? 'granted' : 'denied',
  });
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function TrackingProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsentState] = useState<ConsentState | null>(null);
  const scriptsLoaded = useRef({ ga4: false, meta: false, tiktok: false });

  // ── Initialise consent mode immediately (before scripts load) ──
  useEffect(() => {
    initGA4ConsentMode();
    const stored = readStoredConsent();
    if (stored) {
      setConsentState(stored);
    }
  }, []);

  // ── Load / update scripts whenever consent changes ─────────────
  useEffect(() => {
    if (!consent) return;

    if (consent.analytics && TRACKING_CONFIG.ga4.enabled) {
      if (!scriptsLoaded.current.ga4) {
        loadGA4(TRACKING_CONFIG.ga4.measurementId);
        scriptsLoaded.current.ga4 = true;
      }
    }
    if (consent.marketing) {
      if (TRACKING_CONFIG.metaPixel.enabled && !scriptsLoaded.current.meta) {
        loadMetaPixel(TRACKING_CONFIG.metaPixel.pixelId);
        scriptsLoaded.current.meta = true;
      }
      if (TRACKING_CONFIG.tiktokPixel.enabled && !scriptsLoaded.current.tiktok) {
        loadTikTokPixel(TRACKING_CONFIG.tiktokPixel.pixelId);
        scriptsLoaded.current.tiktok = true;
      }
    }
    updateGA4Consent(consent.analytics, consent.marketing);
  }, [consent]);

  // ─── Consent actions ─────────────────────────────────────────────

  const applyConsent = useCallback((analytics: boolean, marketing: boolean) => {
    const next: ConsentState = { necessary: true, analytics, marketing, timestamp: new Date().toISOString() };
    writeConsent(next);
    setConsentState(next);
  }, []);

  const grantAll = useCallback(() => applyConsent(true, true), [applyConsent]);
  const denyAll  = useCallback(() => applyConsent(false, false), [applyConsent]);
  const updateConsent = useCallback(
    (partial: Pick<ConsentState, 'analytics' | 'marketing'>) => applyConsent(partial.analytics, partial.marketing),
    [applyConsent],
  );

  // ─── Event tracking ──────────────────────────────────────────────

  const trackEvent = useCallback((name: EventName | string, params: Record<string, unknown> = {}) => {
    // GA4
    if (consent?.analytics && typeof (window as any).gtag === 'function') {
      (window as any).gtag('event', name, params);
    }
    // Meta Pixel
    if (consent?.marketing && typeof (window as any).fbq === 'function') {
      const standardEvent = META_EVENT_MAP[name as EventName];
      if (standardEvent) {
        (window as any).fbq('track', standardEvent, params);
      } else {
        (window as any).fbq('trackCustom', name, params);
      }
    }
    // TikTok Pixel
    if (consent?.marketing && typeof (window as any).ttq !== 'undefined') {
      const standardEvent = TIKTOK_EVENT_MAP[name as EventName];
      if (standardEvent) {
        (window as any).ttq.track(standardEvent, params);
      } else {
        (window as any).ttq.track(name, params);
      }
    }
    // Dev log
    if (process.env.NODE_ENV === 'development') {
      console.log(`[MIXXEA Track] ${name}`, params);
    }
  }, [consent]);

  const trackPageView = useCallback((path: string, title?: string) => {
    const params = { page_path: path, page_title: title || document.title };

    if (consent?.analytics && typeof (window as any).gtag === 'function') {
      (window as any).gtag('event', 'page_view', params);
    }
    if (consent?.marketing && typeof (window as any).fbq === 'function') {
      (window as any).fbq('track', 'PageView');
    }
    if (consent?.marketing && typeof (window as any).ttq !== 'undefined') {
      (window as any).ttq.page();
    }
    if (process.env.NODE_ENV === 'development') {
      console.log(`[MIXXEA PageView] ${path}`);
    }
  }, [consent]);

  return (
    <TrackingContext.Provider
      value={{
        consent,
        hasConsented: consent !== null,
        grantAll,
        denyAll,
        updateConsent,
        trackEvent,
        trackPageView,
      }}
    >
      <PageViewTracker trackPageView={trackPageView} />
      {children}
      {/* Meta Pixel noscript fallback — hidden 1×1 image beacon */}
      {consent?.marketing && TRACKING_CONFIG.metaPixel.enabled && !TRACKING_CONFIG.metaPixel.pixelId.includes('X') && (
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src={`https://www.facebook.com/tr?id=${TRACKING_CONFIG.metaPixel.pixelId}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
      )}
    </TrackingContext.Provider>
  );
}

// ─── Auto page-view tracker ──────────────────────────────────────────────────
// Separate component so it can call useLocation() inside the Router context.

function PageViewTracker({ trackPageView }: { trackPageView: (path: string, title?: string) => void }) {
  const location = useLocation();
  const prevPath = useRef<string>('');

  useEffect(() => {
    const path = location.pathname + location.search;
    if (path === prevPath.current) return;
    prevPath.current = path;
    // Small delay so the page title can update first
    const t = setTimeout(() => trackPageView(path, document.title), 120);
    return () => clearTimeout(t);
  }, [location, trackPageView]);

  return null;
}