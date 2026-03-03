// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — useSEO hook
//  Dynamically injects <title>, <meta>, <link canonical>, hreflang, OG & Twitter
//  into the document head on every route change.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect } from 'react';
import { SEOConfig, SITE_NAME, OG_IMAGE, TWITTER_HANDLE } from './seoConfig';

function setMeta(name: string, content: string, attr: 'name' | 'property' = 'name') {
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLink(rel: string, href: string, hreflang?: string) {
  const selector = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]:not([hreflang])`;
  let el = document.querySelector(selector) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    if (hreflang) el.setAttribute('hreflang', hreflang);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function removeHreflangLinks() {
  document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());
}

export function useSEO(config: SEOConfig) {
  useEffect(() => {
    const {
      title,
      description,
      keywords,
      ogTitle,
      ogDescription,
      ogImage,
      canonical,
      hreflang,
      noIndex,
    } = config;

    // ── Page title ───────────────────────────────────────────────────────────
    document.title = title;

    // ── Basic meta ───────────────────────────────────────────────────────────
    setMeta('description', description);
    if (keywords?.length) setMeta('keywords', keywords.join(', '));

    // ── Robots ───────────────────────────────────────────────────────────────
    setMeta('robots', noIndex ? 'noindex, nofollow' : 'index, follow');
    setMeta('googlebot', noIndex ? 'noindex, nofollow' : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1');

    // ── Open Graph ───────────────────────────────────────────────────────────
    setMeta('og:type',        'website',                         'property');
    setMeta('og:site_name',   SITE_NAME,                         'property');
    setMeta('og:title',       ogTitle || title,                  'property');
    setMeta('og:description', ogDescription || description,      'property');
    setMeta('og:image',       ogImage || OG_IMAGE,               'property');
    setMeta('og:image:width',  '1200',                           'property');
    setMeta('og:image:height', '630',                            'property');
    if (canonical) setMeta('og:url', canonical, 'property');

    // ── Twitter / X Card ─────────────────────────────────────────────────────
    setMeta('twitter:card',        'summary_large_image');
    setMeta('twitter:site',        TWITTER_HANDLE);
    setMeta('twitter:creator',     TWITTER_HANDLE);
    setMeta('twitter:title',       ogTitle || title);
    setMeta('twitter:description', ogDescription || description);
    setMeta('twitter:image',       ogImage || OG_IMAGE);

    // ── Canonical ────────────────────────────────────────────────────────────
    if (canonical) setLink('canonical', canonical);

    // ── Hreflang (international) ─────────────────────────────────────────────
    removeHreflangLinks();
    if (hreflang) {
      Object.entries(hreflang).forEach(([lang, href]) => {
        setLink('alternate', href, lang);
      });
    }

    // ── Additional discovery meta ─────────────────────────────────────────────
    setMeta('theme-color', '#000000');
    setMeta('application-name', SITE_NAME);
    setMeta('apple-mobile-web-app-capable', 'yes');
    setMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');

  }, [
    config.title,
    config.description,
    config.canonical,
    config.noIndex,
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Helper: use a one-off SEO config without the full config type
// ─────────────────────────────────────────────────────────────────────────────
export function useSEOPage(overrides: Partial<SEOConfig> & { title: string; description: string }) {
  useSEO({
    keywords: [],
    ...overrides,
  } as SEOConfig);
}
