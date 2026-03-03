// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — JSON-LD Structured Data (Schema.org)
//  Schemas: Organization · WebSite · Service (×3) · FAQPage · BreadcrumbList
//  Injected dynamically into <head> — helps Google rich results & AI crawlers
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect } from 'react';
import { SITE_URL, SITE_NAME } from './seoConfig';

// ── Inject / update a <script type="application/ld+json"> tag ────────────────
function injectSchema(id: string, schema: object) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(schema, null, 0);
}

function removeSchema(id: string) {
  document.getElementById(id)?.remove();
}

// ─────────────────────────────────────────────────────────────────────────────
//  SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: {
    '@type': 'ImageObject',
    url: `${SITE_URL}/logo.png`,
    width: 512,
    height: 512,
  },
  sameAs: [
    'https://twitter.com/mixxea',
    'https://instagram.com/mixxea',
    'https://www.facebook.com/mixxea',
    'https://www.linkedin.com/company/mixxea',
    'https://www.tiktok.com/@mixxea',
    'https://www.youtube.com/@mixxea',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'onboarding@mixxea.com',
    contactType: 'customer support',
    availableLanguage: ['English', 'Spanish', 'Portuguese', 'French', 'German'],
  },
  foundingDate: '2024',
  description:
    'MIXXEA is a premium music-tech SaaS platform combining music distribution, marketing & promotions agency services, and publishing administration for independent artists and labels worldwide.',
  areaServed: 'Worldwide',
  knowsAbout: [
    'Music Distribution',
    'Music Promotion',
    'Playlist Pitching',
    'Music Publishing',
    'Royalty Management',
    'Music Marketing',
    'TikTok Music Promotion',
    'Spotify Growth',
  ],
};

const webSiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  url: SITE_URL,
  name: SITE_NAME,
  description: 'Music Distribution, Promotion & Publishing Administration Platform',
  publisher: { '@id': `${SITE_URL}/#organization` },
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/auth?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
  inLanguage: ['en', 'es', 'pt', 'fr', 'de', 'ja', 'ko', 'ar'],
};

const distributionServiceSchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  '@id': `${SITE_URL}/#distribution`,
  name: 'Music Distribution Service',
  description:
    'Distribute your music to 70+ streaming platforms worldwide including Spotify, Apple Music, YouTube Music, TikTok, Amazon Music, Tidal, and more. Keep 100% of your royalties.',
  provider: { '@id': `${SITE_URL}/#organization` },
  serviceType: 'Music Distribution',
  areaServed: 'Worldwide',
  availableChannel: {
    '@type': 'ServiceChannel',
    serviceUrl: SITE_URL,
    servicePhone: '',
    availableLanguage: ['English', 'Spanish', 'Portuguese', 'French', 'German'],
  },
  offers: [
    {
      '@type': 'Offer',
      name: 'Starter Plan',
      description: 'Unlimited music distribution with basic analytics and smart link pages',
      price: '19',
      priceCurrency: 'USD',
      priceSpecification: { '@type': 'UnitPriceSpecification', price: '19', priceCurrency: 'USD', unitCode: 'MON' },
    },
    {
      '@type': 'Offer',
      name: 'Growth Plan',
      description: 'Full distribution + playlist pitching + TikTok/IG campaigns',
      price: '39',
      priceCurrency: 'USD',
      priceSpecification: { '@type': 'UnitPriceSpecification', price: '39', priceCurrency: 'USD', unitCode: 'MON' },
    },
    {
      '@type': 'Offer',
      name: 'Pro Plan',
      description: 'Full distribution + agency campaigns + dedicated account manager for labels',
      price: '149',
      priceCurrency: 'USD',
      priceSpecification: { '@type': 'UnitPriceSpecification', price: '149', priceCurrency: 'USD', unitCode: 'MON' },
    },
  ],
};

const promotionServiceSchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  '@id': `${SITE_URL}/#promotions`,
  name: 'Music Promotion & Marketing Agency',
  description:
    'Professional music marketing campaigns including Spotify playlist pitching, TikTok UGC seeding, Instagram promotion, YouTube pre-roll ads, Meta/Google ads, and PR outreach.',
  provider: { '@id': `${SITE_URL}/#organization` },
  serviceType: 'Music Marketing',
  areaServed: 'Worldwide',
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Promotion Services',
    itemListElement: [
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Spotify Playlist Pitching' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'TikTok UGC Campaign' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Instagram Music Promotion' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'YouTube Pre-Roll Ads' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Music PR Outreach' } },
    ],
  },
};

const publishingServiceSchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  '@id': `${SITE_URL}/#publishing`,
  name: 'Music Publishing Administration',
  description:
    'Comprehensive music publishing administration including royalty splits, ISRC & UPC code generation, PRO registration, copyright management, and sync licensing support.',
  provider: { '@id': `${SITE_URL}/#organization` },
  serviceType: 'Music Publishing',
  areaServed: 'Worldwide',
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How does music distribution work with MIXXEA?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Once you upload your music to MIXXEA, we deliver it to 70+ digital streaming platforms worldwide — including Spotify, Apple Music, YouTube Music, TikTok, Amazon Music, and more. You keep 100% of your royalties and rights. Releases typically go live within 24–72 hours.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does MIXXEA take any royalties or ownership of my music?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Absolutely not. MIXXEA operates on a SaaS subscription model — we charge a flat monthly fee and you retain 100% of your royalties, master rights, and publishing ownership.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is playlist pitching?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Playlist pitching is the process of submitting your music to independent Spotify curators and editorial playlists to gain organic streams and new listeners. MIXXEA handles the entire pitching process, targeting the most relevant playlists for your genre.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can labels manage multiple artists under one MIXXEA account?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes — the Pro plan is built for labels, management companies, and music groups with multiple artists. You can manage separate artist profiles, releases, campaigns, and royalty splits from one unified dashboard.',
      },
    },
    {
      '@type': 'Question',
      name: 'What music promotion services does MIXXEA offer?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'MIXXEA offers Spotify playlist pitching, TikTok UGC creator campaigns, Instagram music promotion, YouTube pre-roll advertising, Meta and Google Ads management, and music PR outreach — all with a full KPI report at campaign completion.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does MIXXEA handle music publishing administration?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. MIXXEA includes publishing split tools so you can assign and automate royalty splits among collaborators, producers, and songwriters. We support ISRC/UPC code generation, copyright registration, and PRO registration for broadcast royalties.',
      },
    },
    {
      '@type': 'Question',
      name: 'What platforms does MIXXEA distribute music to?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'MIXXEA distributes to 70+ platforms including Spotify, Apple Music, YouTube Music, TikTok, Amazon Music, Tidal, Deezer, Pandora, SoundCloud, Beatport, Bandcamp, and many regional platforms worldwide.',
      },
    },
    {
      '@type': 'Question',
      name: 'How much does MIXXEA cost?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'MIXXEA offers three plans: Starter at $19/month (unlimited distribution + basic analytics), Growth at $39/month (+ playlist pitching + TikTok/IG campaigns), and Pro at $149/month (full agency services + dedicated account manager for labels).',
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
//  COMPONENT — injects all schemas for the home/landing page
// ─────────────────────────────────────────────────────────────────────────────
export function HomeStructuredData() {
  useEffect(() => {
    injectSchema('ld-organization',   organizationSchema);
    injectSchema('ld-website',        webSiteSchema);
    injectSchema('ld-distribution',   distributionServiceSchema);
    injectSchema('ld-promotions',     promotionServiceSchema);
    injectSchema('ld-publishing',     publishingServiceSchema);
    injectSchema('ld-faq',            faqSchema);

    return () => {
      // Keep org + website globally; remove page-specific schemas on unmount
      removeSchema('ld-distribution');
      removeSchema('ld-promotions');
      removeSchema('ld-publishing');
      removeSchema('ld-faq');
    };
  }, []);

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
//  COMPONENT — always-on global schemas (org + website)
// ─────────────────────────────────────────────────────────────────────────────
export function GlobalStructuredData() {
  useEffect(() => {
    injectSchema('ld-organization', organizationSchema);
    injectSchema('ld-website',      webSiteSchema);
  }, []);

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Export schemas for SEO Dashboard preview
// ─────────────────────────────────────────────────────────────────────────────
export const SCHEMAS_PREVIEW = {
  Organization:        organizationSchema,
  WebSite:             webSiteSchema,
  'Music Distribution': distributionServiceSchema,
  'Music Promotion':   promotionServiceSchema,
  'Publishing Admin':  publishingServiceSchema,
  FAQPage:             faqSchema,
};
