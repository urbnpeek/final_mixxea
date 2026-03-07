// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — Global SEO Configuration
//  International targeting: EN, ES, PT, FR, DE, JA, KO, AR
//  Services: Music Distribution · Promotions · Publishing · Smart Pages
// ─────────────────────────────────────────────────────────────────────────────

export interface SEOConfig {
  title: string;
  description: string;
  keywords: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonical?: string;
  hreflang?: Record<string, string>;
  noIndex?: boolean;
  schema?: 'home' | 'auth' | 'service' | 'none';
}

export const SITE_URL   = 'https://www.mixxea.com';
export const SITE_NAME  = 'MIXXEA';
export const OG_IMAGE   = 'https://www.mixxea.com/og-image.jpg';
export const TWITTER_HANDLE = '@mixxea';

// ── Hreflang base (same URL for all locales — SPA handles language via browser) ──
const buildHreflang = (path = '') => ({
  'en':    `${SITE_URL}${path}`,
  'en-US': `${SITE_URL}${path}`,
  'en-GB': `${SITE_URL}${path}`,
  'es':    `${SITE_URL}${path}`,
  'es-419':`${SITE_URL}${path}`,
  'pt':    `${SITE_URL}${path}`,
  'pt-BR': `${SITE_URL}${path}`,
  'fr':    `${SITE_URL}${path}`,
  'de':    `${SITE_URL}${path}`,
  'ja':    `${SITE_URL}${path}`,
  'ko':    `${SITE_URL}${path}`,
  'ar':    `${SITE_URL}${path}`,
  'x-default': `${SITE_URL}${path}`,
});

// ─────────────────────────────────────────────────────────────────────────────
//  PAGE SEO MAP
// ─────────────────────────────────────────────────────────────────────────────
export const SEO_PAGES: Record<string, SEOConfig> = {

  // ── Home / Landing ────────────────────────────────────────────────────────
  '/': {
    title: 'MIXXEA — Music Distribution, Promotion & Publishing Administration',
    description:
      'MIXXEA is a premium music-tech SaaS for independent artists and labels. Distribute to 70+ platforms, launch Spotify & TikTok campaigns, pitch playlists, and manage your publishing rights — all in one dashboard.',
    keywords: [
      // Distribution
      'music distribution', 'music distribution service', 'independent music distribution',
      'distribute music online', 'distribute music to spotify', 'music distribution platform',
      'best music distributor', 'upload music to spotify', 'music distribution for artists',
      // Promotion
      'music promotion', 'music marketing agency', 'spotify playlist promotion',
      'playlist pitching service', 'tiktok music promotion', 'instagram music promotion',
      'music pr agency', 'independent artist promotion', 'music campaign agency',
      // Publishing
      'music publishing administration', 'royalty splits', 'music publishing rights',
      'music royalty management', 'publishing administration service', 'ISRC codes',
      // International
      'distribución musical', 'distribuição musical', 'distribution musicale',
      'musikvertrieb', 'música streaming distribución', 'musique distribution',
      // Brand
      'mixxea', 'mixxea music', 'mixxea distribution',
    ],
    ogTitle: 'MIXXEA — The Music-Tech Platform for Artists & Labels',
    ogDescription:
      'Distribute worldwide. Promote professionally. Publish and get paid. MIXXEA is your all-in-one music business platform.',
    ogImage: OG_IMAGE,
    canonical: `${SITE_URL}/`,
    hreflang: buildHreflang('/'),
    schema: 'home',
  },

  // ── Auth ─────────────────────────────────────────────────────────────────
  '/auth': {
    title: 'Sign Up or Log In — MIXXEA Music Platform',
    description:
      'Create your MIXXEA account and start distributing music globally, running marketing campaigns, and managing your publishing rights today. Free to start.',
    keywords: [
      'sign up music distribution', 'music platform account', 'music distributor sign up',
      'mixxea login', 'mixxea sign up', 'artist account music platform',
      'music marketing platform signup', 'registrarse distribución musical',
    ],
    canonical: `${SITE_URL}/auth`,
    noIndex: false,
    schema: 'auth',
  },

  // ── Dashboard (gated) ────────────────────────────────────────────────────
  '/dashboard': {
    title: 'Artist Dashboard — MIXXEA',
    description: 'Manage your music releases, campaigns, royalties, and analytics from your MIXXEA dashboard.',
    keywords: ['music artist dashboard', 'music distribution dashboard', 'mixxea dashboard'],
    noIndex: true,
    schema: 'none',
  },

  // ── Admin (gated) ────────────────────────────────────────────────────────
  '/admin': {
    title: 'Admin Panel — MIXXEA',
    description: 'MIXXEA admin control panel.',
    keywords: [],
    noIndex: true,
    schema: 'none',
  },

  // ── Blog index ───────────────────────────────────────────────────────────
  '/blog': {
    title: 'Music Industry Blog — MIXXEA | Distribution, Promotion & Publishing Guides',
    description: 'Expert guides for independent artists and labels. Learn music distribution, Spotify growth, TikTok promotion, playlist pitching, publishing administration, and more.',
    keywords: [
      'music industry blog', 'music distribution guide', 'spotify growth tips',
      'music marketing blog', 'independent artist tips', 'playlist pitching guide',
      'tiktok music strategy', 'music publishing guide', 'royalty management tips',
    ],
    canonical: `${SITE_URL}/blog`,
    hreflang: buildHreflang('/blog'),
    schema: 'none',
  },

  // ── Blog post (dynamic — BlogPost.tsx applies its own useSEO per post) ──
  '/blog/:slug': {
    title: 'MIXXEA Blog — Music Industry Guides',
    description: 'Expert guides for independent artists and labels.',
    keywords: ['music industry', 'music distribution', 'mixxea'],
    noIndex: false,
    schema: 'none',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
//  TARGET KEYWORD STRATEGY — for SEO Dashboard display
// ─────────────────────────────────────────────────────────────────────────────
export interface KeywordData {
  keyword: string;
  market: string;
  language: string;
  volume: string;      // estimated monthly searches
  difficulty: 'Low' | 'Medium' | 'High';
  intent: 'Informational' | 'Commercial' | 'Transactional' | 'Navigational';
  service: 'Distribution' | 'Promotions' | 'Publishing' | 'Platform' | 'Brand';
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
}

export const TARGET_KEYWORDS: KeywordData[] = [
  // ── DISTRIBUTION ──────────────────────────────────────────────────────────
  { keyword: 'music distribution service',        market: 'Global / EN', language: 'en', volume: '18,000', difficulty: 'High',   intent: 'Commercial',     service: 'Distribution', priority: 'Critical' },
  { keyword: 'independent music distribution',     market: 'Global / EN', language: 'en', volume: '12,000', difficulty: 'High',   intent: 'Commercial',     service: 'Distribution', priority: 'Critical' },
  { keyword: 'best music distributor 2025',        market: 'US / EN',     language: 'en', volume: '9,500',  difficulty: 'High',   intent: 'Transactional',  service: 'Distribution', priority: 'Critical' },
  { keyword: 'distribute music online free',       market: 'Global / EN', language: 'en', volume: '8,200',  difficulty: 'Medium', intent: 'Transactional',  service: 'Distribution', priority: 'High'     },
  { keyword: 'upload music to spotify',            market: 'Global / EN', language: 'en', volume: '22,000', difficulty: 'High',   intent: 'Transactional',  service: 'Distribution', priority: 'Critical' },
  { keyword: 'music distribution platform',        market: 'Global / EN', language: 'en', volume: '6,600',  difficulty: 'Medium', intent: 'Commercial',     service: 'Distribution', priority: 'High'     },
  { keyword: 'distribución musical online',        market: 'ES / LATAM',  language: 'es', volume: '5,400',  difficulty: 'Low',    intent: 'Commercial',     service: 'Distribution', priority: 'High'     },
  { keyword: 'distribuição musical online',        market: 'BR / PT',     language: 'pt', volume: '4,800',  difficulty: 'Low',    intent: 'Commercial',     service: 'Distribution', priority: 'High'     },
  { keyword: 'distribution musicale spotify',      market: 'FR',          language: 'fr', volume: '3,200',  difficulty: 'Low',    intent: 'Commercial',     service: 'Distribution', priority: 'Medium'   },
  { keyword: 'musik auf spotify veröffentlichen',  market: 'DE',          language: 'de', volume: '2,900',  difficulty: 'Low',    intent: 'Transactional',  service: 'Distribution', priority: 'Medium'   },
  { keyword: 'music distribution Nigeria',         market: 'NG / AF',     language: 'en', volume: '1,900',  difficulty: 'Low',    intent: 'Commercial',     service: 'Distribution', priority: 'High'     },
  { keyword: 'music distribution for labels',      market: 'Global / EN', language: 'en', volume: '2,100',  difficulty: 'Medium', intent: 'Commercial',     service: 'Distribution', priority: 'High'     },

  // ── PROMOTIONS ────────────────────────────────────────────────────────────
  { keyword: 'spotify playlist pitching service',  market: 'Global / EN', language: 'en', volume: '14,000', difficulty: 'High',   intent: 'Transactional',  service: 'Promotions', priority: 'Critical' },
  { keyword: 'music promotion agency',             market: 'Global / EN', language: 'en', volume: '11,000', difficulty: 'High',   intent: 'Commercial',     service: 'Promotions', priority: 'Critical' },
  { keyword: 'tiktok music promotion service',     market: 'Global / EN', language: 'en', volume: '8,800',  difficulty: 'Medium', intent: 'Commercial',     service: 'Promotions', priority: 'Critical' },
  { keyword: 'instagram music promotion',          market: 'Global / EN', language: 'en', volume: '7,300',  difficulty: 'Medium', intent: 'Commercial',     service: 'Promotions', priority: 'High'     },
  { keyword: 'playlist pitching for artists',      market: 'Global / EN', language: 'en', volume: '5,600',  difficulty: 'Medium', intent: 'Transactional',  service: 'Promotions', priority: 'High'     },
  { keyword: 'music marketing agency for artists', market: 'Global / EN', language: 'en', volume: '4,900',  difficulty: 'Medium', intent: 'Commercial',     service: 'Promotions', priority: 'High'     },
  { keyword: 'youtube music promotion',            market: 'Global / EN', language: 'en', volume: '9,200',  difficulty: 'High',   intent: 'Commercial',     service: 'Promotions', priority: 'High'     },
  { keyword: 'promoción musical spotify',          market: 'ES / LATAM',  language: 'es', volume: '4,100',  difficulty: 'Low',    intent: 'Commercial',     service: 'Promotions', priority: 'High'     },
  { keyword: 'promoção musical spotify',           market: 'BR',          language: 'pt', volume: '3,700',  difficulty: 'Low',    intent: 'Commercial',     service: 'Promotions', priority: 'High'     },
  { keyword: 'promotion musicale spotify',         market: 'FR',          language: 'fr', volume: '2,400',  difficulty: 'Low',    intent: 'Commercial',     service: 'Promotions', priority: 'Medium'   },
  { keyword: 'musik promotion agentur',            market: 'DE',          language: 'de', volume: '1,800',  difficulty: 'Low',    intent: 'Commercial',     service: 'Promotions', priority: 'Medium'   },
  { keyword: 'Spotify プレイリスト ピッチング',         market: 'JP',          language: 'ja', volume: '1,200',  difficulty: 'Low',    intent: 'Commercial',     service: 'Promotions', priority: 'Medium'   },

  // ── PUBLISHING ────────────────────────────────────────────────────────────
  { keyword: 'music publishing administration',    market: 'Global / EN', language: 'en', volume: '6,800',  difficulty: 'Medium', intent: 'Commercial',     service: 'Publishing', priority: 'Critical' },
  { keyword: 'royalty splits for artists',         market: 'Global / EN', language: 'en', volume: '4,200',  difficulty: 'Low',    intent: 'Informational',  service: 'Publishing', priority: 'High'     },
  { keyword: 'music royalty management software',  market: 'Global / EN', language: 'en', volume: '3,100',  difficulty: 'Low',    intent: 'Commercial',     service: 'Publishing', priority: 'High'     },
  { keyword: 'sync licensing music',               market: 'Global / EN', language: 'en', volume: '5,500',  difficulty: 'Medium', intent: 'Commercial',     service: 'Publishing', priority: 'High'     },
  { keyword: 'ISRC code generator',                market: 'Global / EN', language: 'en', volume: '7,800',  difficulty: 'Low',    intent: 'Transactional',  service: 'Publishing', priority: 'High'     },
  { keyword: 'UPC barcode music',                  market: 'Global / EN', language: 'en', volume: '5,100',  difficulty: 'Low',    intent: 'Transactional',  service: 'Publishing', priority: 'Medium'   },
  { keyword: 'administración editorial musical',   market: 'ES / LATAM',  language: 'es', volume: '2,300',  difficulty: 'Low',    intent: 'Commercial',     service: 'Publishing', priority: 'Medium'   },
  { keyword: 'administração editorial musical',    market: 'BR',          language: 'pt', volume: '1,800',  difficulty: 'Low',    intent: 'Commercial',     service: 'Publishing', priority: 'Medium'   },

  // ── PLATFORM ──────────────────────────────────────────────────────────────
  { keyword: 'music smart links',                  market: 'Global / EN', language: 'en', volume: '5,900',  difficulty: 'Medium', intent: 'Commercial',     service: 'Platform', priority: 'High'     },
  { keyword: 'music link in bio',                  market: 'Global / EN', language: 'en', volume: '4,400',  difficulty: 'Low',    intent: 'Commercial',     service: 'Platform', priority: 'High'     },
  { keyword: 'pre-save campaign spotify',          market: 'Global / EN', language: 'en', volume: '3,800',  difficulty: 'Low',    intent: 'Transactional',  service: 'Platform', priority: 'High'     },
  { keyword: 'music analytics dashboard',          market: 'Global / EN', language: 'en', volume: '2,900',  difficulty: 'Low',    intent: 'Commercial',     service: 'Platform', priority: 'Medium'   },
  { keyword: 'all-in-one music platform',          market: 'Global / EN', language: 'en', volume: '3,500',  difficulty: 'Medium', intent: 'Commercial',     service: 'Platform', priority: 'High'     },
  { keyword: 'music saas platform',                market: 'Global / EN', language: 'en', volume: '1,600',  difficulty: 'Low',    intent: 'Commercial',     service: 'Platform', priority: 'Medium'   },

  // ── BRAND ─────────────────────────────────────────────────────────────────
  { keyword: 'mixxea',                             market: 'Global',      language: 'en', volume: '2,800',  difficulty: 'Low',    intent: 'Navigational',   service: 'Brand', priority: 'Critical' },
  { keyword: 'mixxea music distribution',          market: 'Global',      language: 'en', volume: '1,400',  difficulty: 'Low',    intent: 'Navigational',   service: 'Brand', priority: 'High'     },
  { keyword: 'mixxea review',                      market: 'Global',      language: 'en', volume: '900',    difficulty: 'Low',    intent: 'Informational',  service: 'Brand', priority: 'Medium'   },
];

// ─────────────────────────────────────────────────────────────────────────────
//  INTERNATIONAL MARKETS
// ─────────────────────────────────────────────────────────────────────────────
export const INTERNATIONAL_MARKETS = [
  { code: 'en-US', region: 'United States',    flag: '🇺🇸', priority: 'Primary',   keywords: 22, status: 'Active'  },
  { code: 'en-GB', region: 'United Kingdom',   flag: '🇬🇧', priority: 'Primary',   keywords: 18, status: 'Active'  },
  { code: 'pt-BR', region: 'Brazil',           flag: '🇧🇷', priority: 'Primary',   keywords: 14, status: 'Active'  },
  { code: 'es',    region: 'Spain / LATAM',    flag: '🇪🇸', priority: 'Primary',   keywords: 16, status: 'Active'  },
  { code: 'fr',    region: 'France / Africa',  flag: '🇫🇷', priority: 'Secondary', keywords: 10, status: 'Active'  },
  { code: 'de',    region: 'Germany',          flag: '🇩🇪', priority: 'Secondary', keywords: 9,  status: 'Active'  },
  { code: 'ja',    region: 'Japan',            flag: '🇯🇵', priority: 'Secondary', keywords: 6,  status: 'Active'  },
  { code: 'ko',    region: 'South Korea',      flag: '🇰🇷', priority: 'Growth',    keywords: 4,  status: 'Planned' },
  { code: 'ar',    region: 'Middle East',      flag: '🇦🇪', priority: 'Growth',    keywords: 3,  status: 'Planned' },
  { code: 'en-NG', region: 'Nigeria / Africa', flag: '🇳🇬', priority: 'Growth',    keywords: 5,  status: 'Active'  },
];

// ─────────────────────────────────────────────────────────────────────────────
//  SITEMAP — all public routes
// ─────────────────────────────────────────────────────────────────────────────
export const SITEMAP_URLS = [
  { loc: '/',     changefreq: 'weekly',  priority: '1.0' },
  { loc: '/auth', changefreq: 'monthly', priority: '0.8' },
  { loc: '/blog', changefreq: 'weekly',  priority: '0.9' },
];

// ─────────────────────────────────────────────────────────────────────────────
//  TECHNICAL SEO CHECKLIST
// ─────────────────────────────────────────────────────────────────────────────
export const TECHNICAL_SEO_CHECKLIST = [
  { id: 'meta-title',       label: 'Dynamic page titles',              status: 'done',    category: 'On-Page'    },
  { id: 'meta-desc',        label: 'Meta descriptions per page',       status: 'done',    category: 'On-Page'    },
  { id: 'og-tags',          label: 'Open Graph tags (Facebook/LinkedIn)', status: 'done', category: 'Social'     },
  { id: 'twitter-card',     label: 'Twitter Card meta tags',           status: 'done',    category: 'Social'     },
  { id: 'canonical',        label: 'Canonical URLs',                   status: 'done',    category: 'On-Page'    },
  { id: 'hreflang',         label: 'Hreflang international tags',      status: 'done',    category: 'International' },
  { id: 'json-ld-org',      label: 'Organization schema (JSON-LD)',    status: 'done',    category: 'Schema'     },
  { id: 'json-ld-website',  label: 'WebSite + SearchAction schema',    status: 'done',    category: 'Schema'     },
  { id: 'json-ld-service',  label: 'Service schema per offering',      status: 'done',    category: 'Schema'     },
  { id: 'json-ld-faq',      label: 'FAQ schema for rich snippets',     status: 'done',    category: 'Schema'     },
  { id: 'json-ld-breadcrumb','label': 'BreadcrumbList schema',         status: 'done',    category: 'Schema'     },
  { id: 'sitemap-xml',      label: 'sitemap.xml',                      status: 'done',    category: 'Technical'  },
  { id: 'robots-txt',       label: 'robots.txt',                       status: 'done',    category: 'Technical'  },
  { id: 'vercel-rewrites',  label: 'Vercel SPA rewrites (404 fix)',    status: 'done',    category: 'Technical'  },
  { id: 'page-speed',       label: 'Core Web Vitals (LCP/FID/CLS)',    status: 'review',  category: 'Performance' },
  { id: 'https',            label: 'HTTPS / SSL certificate',          status: 'done',    category: 'Technical'  },
  { id: 'mobile',           label: 'Mobile responsive design',         status: 'done',    category: 'Technical'  },
  { id: 'og-image',         label: 'OG image (1200×630px)',            status: 'review',  category: 'Social'     },
  { id: 'ga4',              label: 'Google Analytics 4 (G-MEVRRCQQ5T)', status: 'done',  category: 'Analytics'  },
  { id: 'meta-pixel',       label: 'Meta Pixel (1331927570650344)',     status: 'done',    category: 'Analytics'  },
  { id: 'gsc',              label: 'Google Search Console verified',   status: 'review',  category: 'Analytics'  },
  { id: 'backlinks',        label: 'Backlink outreach strategy',       status: 'planned', category: 'Off-Page'   },
  { id: 'content-blog',     label: 'SEO blog / content marketing',     status: 'planned', category: 'Content'    },
];
