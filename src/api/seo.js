/**
 * seo.js — Automated SEO: dynamic sitemap + JSON-LD schema endpoints.
 *
 * Routes (mounted at /api/seo in server.js):
 *   GET /api/seo/schema.json          → homepage JSON-LD with real DB data
 *   GET /api/seo/news/:slug/schema.json → Article JSON-LD for a news post
 *
 * Sitemap is handled directly in server.js via generateSitemap().
 */

const express = require('express');
const db      = require('./db');
const slugify = require('../utils/slugify');
const router  = express.Router();

const BASE = process.env.CANONICAL_BASE_URL || 'https://mixxea.com';

/* ── Shared sitemap XML generator (called by server.js for GET /sitemap.xml) ─ */
async function generateSitemap() {
  const [releases, artists, events, news] = await Promise.all([
    db.get('releases'),
    db.get('artists'),
    db.get('events'),
    db.get('news'),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  const staticUrls = [
    { loc: `${BASE}/`,                          lastmod: today, changefreq: 'weekly',  priority: '1.0' },
    { loc: `${BASE}/record-label`,              lastmod: today, changefreq: 'monthly', priority: '0.9' },
    { loc: `${BASE}/booking-agency`,            lastmod: today, changefreq: 'monthly', priority: '0.9' },
    { loc: `${BASE}/artist-management`,         lastmod: today, changefreq: 'monthly', priority: '0.8' },
    { loc: `${BASE}/electronic-music-artists`,  lastmod: today, changefreq: 'monthly', priority: '0.8' },
    { loc: `${BASE}/submit-demo`,               lastmod: today, changefreq: 'monthly', priority: '0.7' },
  ];

  const newsUrls = news
    .filter(n => n.status === 'published')
    .map(n => ({
      loc: `${BASE}/news/${n.slug || slugify(n.title)}`,
      lastmod: n.date || (n.createdAt || '').slice(0, 10) || today,
      changefreq: 'weekly',
      priority: '0.8',
    }));

  const releaseUrls = releases
    .filter(r => r.status !== 'draft')
    .map(r => ({
      loc: `${BASE}/releases/${r.slug || slugify(r.title)}`,
      lastmod: r.date || (r.createdAt || '').slice(0, 10) || today,
      changefreq: 'monthly',
      priority: '0.7',
    }));

  const artistUrls = artists.map(a => ({
    loc: `${BASE}/artists/${a.slug || slugify(a.name)}`,
    lastmod: today,
    changefreq: 'monthly',
    priority: '0.7',
  }));

  const eventUrls = events
    .filter(e => e.status !== 'cancelled')
    .map(e => ({
      loc: `${BASE}/events/${slugify(`${e.artist || ''} ${e.venue} ${e.date || ''}`.trim())}`,
      lastmod: e.date || today,
      changefreq: 'weekly',
      priority: '0.6',
    }));

  const all = [...staticUrls, ...newsUrls, ...releaseUrls, ...artistUrls, ...eventUrls];

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"',
    '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...all.map(u => [
      '  <url>',
      `    <loc>${u.loc}</loc>`,
      u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>` : '',
      `    <changefreq>${u.changefreq}</changefreq>`,
      `    <priority>${u.priority}</priority>`,
      '  </url>',
    ].filter(Boolean).join('\n')),
    '</urlset>',
  ].join('\n');
}

/* ── Homepage JSON-LD (real data from DB) ────────────────────────────────── */
router.get('/schema.json', async (req, res) => {
  try {
    const [releases, artists, events] = await Promise.all([
      db.get('releases'),
      db.get('artists'),
      db.get('events'),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const liveReleases  = releases.filter(r => r.status === 'out' || r.status === 'pre').slice(0, 6);
    const signedArtists = artists.filter(a => a.status === 'signed').slice(0, 6);
    const upcoming      = events.filter(e => e.status === 'confirmed' && (e.date || '') >= today).slice(0, 4);

    const schema = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': `${BASE}/#website`,
          'url': `${BASE}/`,
          'name': 'Mixxea & Freq Vault',
          'description': 'Electronic music record label, artist management and booking agency.',
          'publisher': { '@id': `${BASE}/#mixxea` },
          'potentialAction': {
            '@type': 'SearchAction',
            'target': { '@type': 'EntryPoint', 'urlTemplate': `${BASE}/?s={search_term_string}` },
            'query-input': 'required name=search_term_string',
          },
        },
        {
          '@type': 'Organization',
          '@id': `${BASE}/#mixxea`,
          'name': 'Mixxea',
          'url': `${BASE}/record-label`,
          'description': 'Independent electronic music record label focused on artist development and releases.',
          'logo': { '@type': 'ImageObject', 'url': `${BASE}/og/mixxea-og.svg` },
          'sameAs': [
            'https://www.instagram.com/mixxeaofficial/',
            'https://twitter.com/mixxeaofficial',
          ],
        },
        {
          '@type': 'Organization',
          '@id': `${BASE}/#freqvault`,
          'name': 'Freq Vault',
          'url': `${BASE}/booking-agency`,
          'description': 'Artist management and booking agency for DJs, producers, and electronic live acts.',
          'logo': { '@type': 'ImageObject', 'url': `${BASE}/og/mixxea-og.svg` },
        },
        ...liveReleases.map(r => ({
          '@type': 'MusicAlbum',
          'name': r.title,
          'byArtist': { '@type': 'MusicGroup', 'name': r.artist },
          'url': `${BASE}/releases/${r.slug || slugify(r.title)}`,
          ...(r.artwork      ? { 'image': r.artwork }       : {}),
          ...(r.date         ? { 'datePublished': r.date }  : {}),
          ...(r.description  ? { 'description': r.description } : {}),
        })),
        ...signedArtists.map(a => ({
          '@type': 'MusicGroup',
          'name': a.name,
          'url': `${BASE}/artists/${a.slug || slugify(a.name)}`,
          ...(a.genre  ? { 'genre': a.genre }       : {}),
          ...(a.bio    ? { 'description': a.bio }   : {}),
          ...(a.photo  ? { 'image': a.photo }       : {}),
        })),
        ...upcoming.map(e => ({
          '@type': 'MusicEvent',
          'name': `${e.artist || 'Live'} at ${e.venue}`,
          'startDate': e.date,
          'eventStatus': 'https://schema.org/EventScheduled',
          'eventAttendanceMode': 'https://schema.org/OfflineEventAttendanceMode',
          'location': {
            '@type': 'Place',
            'name': e.venue,
            'address': {
              '@type': 'PostalAddress',
              'addressLocality': e.city || '',
              'addressCountry': e.country || '',
            },
          },
          'organizer': { '@id': `${BASE}/#freqvault` },
          ...(e.ticketLink ? { 'offers': { '@type': 'Offer', 'url': e.ticketLink, 'availability': 'https://schema.org/InStock' } } : {}),
        })),
        {
          '@type': 'BreadcrumbList',
          '@id': `${BASE}/#breadcrumb`,
          'itemListElement': [
            { '@type': 'ListItem', 'position': 1, 'name': 'Home',           'item': `${BASE}/` },
            { '@type': 'ListItem', 'position': 2, 'name': 'Record Label',   'item': `${BASE}/record-label` },
            { '@type': 'ListItem', 'position': 3, 'name': 'Booking Agency', 'item': `${BASE}/booking-agency` },
          ],
        },
      ],
    };

    res.set('Content-Type', 'application/json');
    res.set('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
    res.json(schema);
  } catch (e) {
    console.error('[SEO] schema.json error:', e);
    res.status(500).json({ error: 'Schema unavailable' });
  }
});

/* ── Per-article JSON-LD ─────────────────────────────────────────────────── */
router.get('/news/:slug/schema.json', async (req, res) => {
  try {
    const news    = await db.get('news');
    const article = news.find(n =>
      (n.slug || slugify(n.title)) === req.params.slug && n.status === 'published'
    );
    if (!article) return res.status(404).json({ error: 'Not found' });

    const articleSlug = article.slug || slugify(article.title);
    const description = (article.body || '').slice(0, 160).replace(/\n/g, ' ');

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      'headline': article.title,
      'description': description,
      'image': article.image || `${BASE}/og/mixxea-og.svg`,
      'datePublished': article.date || (article.createdAt || '').slice(0, 10),
      'dateModified':  (article.updatedAt || article.date || article.createdAt || '').slice(0, 10),
      'author': {
        '@type': 'Organization',
        'name': article.author || 'Mixxea Records',
        '@id': `${BASE}/#mixxea`,
      },
      'publisher': {
        '@type': 'Organization',
        'name': 'Mixxea Records',
        '@id': `${BASE}/#mixxea`,
      },
      'mainEntityOfPage': { '@type': 'WebPage', '@id': `${BASE}/news/${articleSlug}` },
      'url': `${BASE}/news/${articleSlug}`,
    };

    res.set('Content-Type', 'application/json');
    res.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.json(schema);
  } catch (e) {
    console.error('[SEO] news schema error:', e);
    res.status(500).json({ error: 'Schema unavailable' });
  }
});

module.exports = { router, generateSitemap };
