/**
 * Public HTML for the booking path and artist profiles.
 * Copy and facts come only from the artist/release/event records already stored.
 * No awards, bios, or career claims are added here.
 */

const slugify = require('../utils/slugify');
const { visibleReleases, visibleEvents, visibleNews } = require('../lib/rosterCatalog');
const { canonicalOrigin } = require('../lib/siteUrl');
const { publicDetailExists } = require('../lib/publicDetail');

const BASE = canonicalOrigin();
const BOOKING_EMAIL = 'booking@mixxea.com';

const TILE_COLORS = [
  'rgba(232,255,0,.07)',
  'rgba(0,200,255,.08)',
  'rgba(255,45,107,.07)',
  'rgba(255,184,0,.07)',
  'rgba(232,255,0,.06)',
  'rgba(0,200,255,.06)',
  'rgba(255,45,107,.07)',
];

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function listArtists(artists) {
  return (Array.isArray(artists) ? artists : []).filter((artist) => String(artist && artist.name || '').trim());
}

function artistSlug(artist) {
  const explicit = String(artist.slug || '').trim();
  return slugify(explicit || artist.name);
}

function findArtist(artists, slug) {
  const wanted = slugify(slug);
  if (!wanted) return null;
  return listArtists(artists).find((artist) => artistSlug(artist) === wanted || slugify(artist.name) === wanted) || null;
}

function isBookable(artist) {
  const type = String(artist.type || '').trim().toLowerCase();
  return type !== 'label';
}

function safeUrl(value) {
  const url = String(value || '').trim();
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  return '';
}

function place(artist) {
  return [artist.city, artist.country].filter(Boolean).join(', ');
}

function metaLine(artist) {
  return [artist.genre, place(artist)].filter(Boolean).join(' · ');
}

function rosterLabel(artist) {
  const type = String(artist.type || '').trim().toLowerCase();
  if (type === 'both') return 'Label and booking';
  if (type === 'label') return 'Label';
  if (type === 'booking' || type === 'agency') return 'Booking';
  return '';
}

function factualLead(artist) {
  const bits = [`${artist.name} is listed on the Mixxea roster.`];
  if (artist.genre) bits.push(`Genre: ${artist.genre}.`);
  const where = place(artist);
  if (where) bits.push(`Location: ${where}.`);
  return bits.join(' ');
}

function jsonScript(data) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">${json}</script>`;
}

function itemList(artists) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: listArtists(artists).map((artist, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: artist.name,
      url: `${BASE}/artists/${artistSlug(artist)}`,
    })),
  };
}

function nameTokens(value) {
  return String(value || '')
    .toLowerCase()
    .split(/[,/&+]|\band\b/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function matchesArtist(value, name) {
  const wanted = String(name || '').trim().toLowerCase();
  if (!wanted) return false;
  return nameTokens(value).includes(wanted) || String(value || '').trim().toLowerCase() === wanted;
}

function releaseHref(release) {
  const slug = slugify(release.slug || release.title);
  if (!slug || !publicDetailExists('releases', slug)) return '';
  return `/releases/${slug}`;
}

function eventHref(event) {
  const slug = slugify(`${event.artist || ''} ${event.venue || ''} ${event.date || ''}`.trim());
  if (!slug || !publicDetailExists('events', slug)) return '';
  return `/events/${slug}`;
}

function renderHomeTiles(artists) {
  const list = listArtists(artists);
  if (!list.length) {
    return '<div class="a-tile"><div class="at-ov"></div><div class="at-c"><div class="at-genre">Roster</div><div class="at-name">Updating</div><div class="at-meta"><span><a href="mailto:booking@mixxea.com">booking@mixxea.com</a></span></div></div></div>';
  }

  return list.map((artist, index) => {
    const slug = artistSlug(artist);
    const name = esc(artist.name);
    const genre = esc(artist.genre || 'Artist');
    const where = [artist.country, artist.city].filter(Boolean).map(esc).join(' / ');
    const photo = safeUrl(artist.photo);
    const initials = esc(String(artist.name).trim().slice(0, 2));
    const visual = photo
      ? `<img src="${esc(photo)}" alt="${name}" style="width:100%;height:100%;object-fit:cover;opacity:.55">`
      : initials;
    const book = isBookable(artist)
      ? `<a href="/booking-agency?artist=${esc(slug)}" class="at-btn at-btn-g">Book</a>`
      : '';
    return `<div class="a-tile">
        <div class="at-bg" style="color:${TILE_COLORS[index % TILE_COLORS.length]}">${visual}</div>
        <div class="at-ov"></div>
        <div class="at-c">
          <div class="at-genre">${genre}</div>
          <a class="at-name" href="/artists/${esc(slug)}">${name}</a>
          <div class="at-meta">${where ? `<span>${where}</span>` : ''}</div>
          <div class="at-btns"><a href="/artists/${esc(slug)}" class="at-btn at-btn-y">Profile</a>${book}</div>
        </div>
      </div>`;
  }).join('');
}

function renderDirectoryCards(artists) {
  const list = listArtists(artists);
  if (!list.length) {
    return `<p class="section-intro">No artists are published on the roster yet. For a booking inquiry, email <a href="mailto:${BOOKING_EMAIL}">${BOOKING_EMAIL}</a>.</p>`;
  }

  return list.map((artist) => {
    const slug = artistSlug(artist);
    const meta = metaLine(artist);
    const bio = String(artist.bio || '').trim();
    const book = isBookable(artist)
      ? `<a class="btn btn-primary" href="/booking-agency?artist=${esc(slug)}">Book</a>`
      : '';
    return `<article class="artist-card">
      ${meta ? `<span class="artist-meta">${esc(meta)}</span>` : ''}
      <h3><a href="/artists/${esc(slug)}">${esc(artist.name)}</a></h3>
      ${bio ? `<p>${esc(bio)}</p>` : ''}
      <div class="actions">${book}<a class="btn btn-secondary" href="/artists/${esc(slug)}">Profile</a></div>
    </article>`;
  }).join('');
}

function renderArtistOptions(artists, selectedSlug) {
  const wanted = slugify(selectedSlug || '');
  return listArtists(artists).map((artist) => {
    const slug = artistSlug(artist);
    const selected = wanted && (slug === wanted || slugify(artist.name) === wanted) ? ' selected' : '';
    return `<option value="${esc(artist.name)}" data-slug="${esc(slug)}"${selected}>${esc(artist.name)}</option>`;
  }).join('');
}

function formatNewsDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function formatEventDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return esc(value || '');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = date.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }).toUpperCase();
  return `${day} ${month}<br>${date.getUTCFullYear()}`;
}

function releaseStatus(release) {
  if (release.status === 'out') return { cls: 's-out', label: 'Out Now' };
  if (release.status === 'pre') return { cls: 's-pre', label: 'Pre-Order' };
  return { cls: 's-pre', label: 'Coming Soon' };
}

function renderReleaseCards(releases) {
  const list = Array.isArray(releases) ? releases : [];
  if (!list.length) return '<p class="catalog-empty">No releases on file yet.</p>';

  return list.map((release, index) => {
    const featured = index === 0;
    const status = releaseStatus(release);
    const artwork = safeUrl(release.artwork);
    const mark = esc(release.catNo ? String(release.catNo).slice(-3) : String(release.title || '').slice(0, 2).toUpperCase());
    const visual = artwork
      ? `<img src="${esc(artwork)}" alt="${esc(release.title || '')}" style="width:100%;height:100%;object-fit:cover;opacity:.4">`
      : mark;
    const links = [
      ['beatport', 'Beatport'],
      ['spotify', 'Spotify'],
      ['apple', 'Apple'],
      ['soundcloud', 'SoundCloud'],
      ['bandcamp', 'Bandcamp'],
    ].map(([key, label]) => {
      const href = safeUrl(release[key]);
      return href ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer" class="dsp-link">${label}</a>` : '';
    }).join('');
    const when = formatNewsDate(release.date);
    const who = [release.artist, when].filter(Boolean).join(' — ');
    return `<div class="r-card${featured ? ' r-card-featured' : ''}" data-track="${index}">
        <div class="rc-art${featured ? ' big' : ''}" style="color:rgba(232,255,0,.08)">${visual}</div>
        <div class="rc-grad"></div>
        <div class="rc-status ${status.cls}">${status.label}</div>
        <button class="rc-play" onclick="playTrack(${index}, event)">▶</button>
        <div class="rc-cnt${featured ? ' big' : ''}">
          <div class="rc-cat">${esc([release.genre, release.catNo].filter(Boolean).join(' · '))}</div>
          <div class="rc-title${featured ? ' big' : ''}">${esc(String(release.title || '').toUpperCase())}</div>
          <div class="rc-who">${esc(who)}</div>
        </div>
        <div class="rc-dsp">${links}</div>
      </div>`;
  }).join('');
}

function newsSlug(item) {
  return slugify(item && (item.slug || item.title));
}

function renderNewsCards(news) {
  const list = Array.isArray(news) ? news : [];
  if (!list.length) return '<p class="catalog-empty">No news on file yet.</p>';

  return list.map((item, index) => {
    const image = safeUrl(item.image);
    const slug = newsSlug(item);
    const href = slug ? `/news/${esc(slug)}` : '/#news';
    const visual = image
      ? `<img src="${esc(image)}" alt="${esc(item.title || '')}" style="width:100%;height:100%;object-fit:cover">`
      : `<span style="font-family:var(--Anton);font-size:80px;color:rgba(232,255,0,.08)">${esc(String(item.title || '').slice(0, 2).toUpperCase())}</span>`;
    return `<a class="n-card${index === 0 ? ' n-card-featured' : ''}" href="${href}">
        <div class="nc-img">${visual}</div>
        <div class="nc-cat">${esc(item.category || 'News')}</div>
        <div class="nc-title">${esc(item.title || '')}</div>
        <div class="nc-date">${esc(formatNewsDate(item.date || item.createdAt))}</div>
        <div class="nc-arr">↗</div>
      </a>`;
  }).join('');
}

function renderEventRows(events) {
  const list = Array.isArray(events) ? events : [];
  if (!list.length) return '<p class="catalog-empty">No shows on file yet.</p>';

  return list.map((event) => {
    const where = [event.city, event.country].filter(Boolean).join(', ');
    const tickets = safeUrl(event.ticketLink)
      ? `<a href="${esc(safeUrl(event.ticketLink))}" target="_blank" rel="noopener noreferrer" style="color:inherit">Get Tickets ↗</a>`
      : (String(event.status || '').toLowerCase() === 'hold' ? 'On Hold' : 'TBA');
    return `<div class="ev-row">
        <div class="ev-date">${formatEventDate(event.date)}</div>
        <div><div class="ev-venue">${esc(event.venue || '')}</div><div class="ev-loc">${esc(where)}</div></div>
        <div class="ev-artist">${esc(event.artist || '')}</div>
        <div class="ev-type">${esc(event.type || '')}</div>
        <div class="ev-tix">${tickets}</div>
      </div>`;
  }).join('');
}

function renderMarquee(artists) {
  const names = listArtists(artists).map((artist) => String(artist.name).toUpperCase());
  const brand = ['MIXXEA RECORDS', 'FREQ VAULT', 'BOOKING', 'ARTIST ROSTER'];
  const items = (names.length ? names.concat(brand) : brand);
  const line = items.map((text) => `<span class="mq-i">${esc(text)} <span class="mq-dot">◆</span></span>`).join('');
  return line + line;
}

function homeBundle(artistsOrBundle) {
  if (Array.isArray(artistsOrBundle) || artistsOrBundle == null) {
    return { artists: artistsOrBundle || [], releases: [], events: [], news: [] };
  }
  return {
    artists: artistsOrBundle.artists || [],
    releases: artistsOrBundle.releases || [],
    events: artistsOrBundle.events || [],
    news: artistsOrBundle.news || [],
  };
}

function injectHome(html, artistsOrBundle) {
  const bundle = homeBundle(artistsOrBundle);
  const artists = bundle.artists;
  const releases = visibleReleases(bundle.releases, artists);
  const events = visibleEvents(bundle.events, artists);
  const news = visibleNews(bundle.news, artists);
  const swap = (source, marker, value) => source.replace(
    new RegExp(`<!--${marker}-->[\\s\\S]*?<!--\\/${marker}-->`),
    `<!--${marker}-->${value}<!--/${marker}-->`
  );
  return swap(
    swap(
      swap(
        swap(
          String(html)
            .replace('<!--ROSTER_TILES-->', renderHomeTiles(artists))
            .replaceAll('<!--ARTIST_COUNT-->0<!--/ARTIST_COUNT-->', `<!--ARTIST_COUNT-->${listArtists(artists).length}<!--/ARTIST_COUNT-->`),
          'MARQUEE_ITEMS',
          renderMarquee(artists)
        ),
        'RELEASE_CARDS',
        renderReleaseCards(releases)
      ),
      'NEWS_CARDS',
      renderNewsCards(news)
    ),
    'EVENT_ROWS',
    renderEventRows(events)
  );
}

function injectBooking(html, artists, selectedSlug) {
  const list = listArtists(artists);
  return String(html)
    .replace('<!--ARTIST_OPTIONS-->', renderArtistOptions(list, selectedSlug))
    .replace('<!--ROSTER_CARDS-->', renderDirectoryCards(list))
    .replace('<!--ARTIST_JSONLD-->', jsonScript(itemList(list)));
}

function injectRoster(html, artists) {
  const list = listArtists(artists);
  return String(html)
    .replace('<!--ROSTER_CARDS-->', renderDirectoryCards(list))
    .replace('<!--ARTIST_JSONLD-->', jsonScript(itemList(list)));
}

function trackingHead() {
  return `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-KCNCSXM7');</script>
<!-- End Google Tag Manager -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-MEVRRCQQ5T"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-MEVRRCQQ5T');</script>
<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','1331927570650344');fbq('track','PageView');</script>`;
}

function seoNav(currentPath) {
  const items = [
    ['/record-label', 'Record Label'],
    ['/artist-management', 'Artist Management'],
    ['/booking-agency', 'Booking'],
    ['/submit-demo', 'Submit Demo'],
    ['/electronic-music-artists', 'Artists'],
  ];
  const links = items.map(([href, label]) => {
    const current = href === currentPath ? ' aria-current="page"' : '';
    return `<a href="${href}"${current}>${label}</a>`;
  }).join('');
  return `<header class="topbar"><div class="topbar-inner"><a class="brand" href="/">MIX<span>X</span>EA</a><nav class="nav-links" aria-label="Primary">${links}</nav></div></header>`;
}

function seoFooter() {
  return `<footer class="footer"><div class="footer-inner"><div><div>Jack / FreqVault · Mixxea Records</div><div><a href="mailto:${BOOKING_EMAIL}">${BOOKING_EMAIL}</a> · <a href="${BASE}">mixxea.com</a></div></div><div><a href="/">Home</a> · <a href="/record-label">Label</a> · <a href="/booking-agency">Booking</a> · <a href="/electronic-music-artists">Roster</a></div></div></footer>`;
}

function pageShell({ title, description, canonicalPath, robots, jsonLd, body, omitCanonical, ogType, ogImage }) {
  const canonical = canonicalPath ? `${BASE}${canonicalPath}` : '';
  const image = ogImage || `${BASE}/og/mixxea-og.svg`;
  const graph = jsonLd ? jsonScript(jsonLd) : '';
  const canonicalTag = !omitCanonical && canonical
    ? `<link rel="canonical" href="${esc(canonical)}">`
    : '';
  const ogUrl = !omitCanonical && canonical
    ? `<meta property="og:url" content="${esc(canonical)}">`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
${trackingHead()}
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="${robots || 'index,follow'}">
${canonicalTag}
<meta property="og:type" content="${esc(ogType || 'website')}">
<meta property="og:site_name" content="Mixxea">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
${ogUrl}
<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Syne:wght@400;500;600;700;800&family=Syne+Mono&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/seo-pages.css">
${graph}
</head>
<body>
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-KCNCSXM7" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
${body}
</body>
</html>`;
}

function renderArtistNotFound() {
  return pageShell({
    title: 'Artist not found | Mixxea',
    description: 'This artist profile is not on the current Mixxea roster.',
    canonicalPath: '/electronic-music-artists',
    robots: 'noindex,follow',
    body: `${seoNav('/electronic-music-artists')}
<main>
<section class="hero"><div class="wrap">
  <div class="breadcrumbs"><a href="/">Home</a><span>/</span><a href="/electronic-music-artists">Artists</a><span>/</span><span>Not found</span></div>
  <div class="kicker">Artist profile</div>
  <h1>Artist not found</h1>
  <p class="lead">This URL is not a profile on the current roster. Open the artist directory, or send a booking inquiry if you already know who you need.</p>
  <div class="actions"><a class="btn btn-primary" href="/electronic-music-artists">View roster</a><a class="btn btn-secondary" href="/booking-agency">Booking agency</a></div>
</div></section>
</main>
${seoFooter()}`,
  });
}

function renderLinkedHeading(href, text) {
  return href ? `<a href="${esc(href)}">${esc(text)}</a>` : esc(text);
}

function renderArtistPage({ artist, artists, releases, events }) {
  const slug = artistSlug(artist);
  const name = artist.name;
  const lead = factualLead(artist);
  const bio = String(artist.bio || '').trim();
  const photo = safeUrl(artist.photo);
  const bookable = isBookable(artist);
  const roster = Array.isArray(artists) && artists.length ? artists : [artist];
  const ownReleases = visibleReleases(releases, roster).filter((release) => matchesArtist(release.artist, name));
  const ownEvents = visibleEvents(events, roster).filter((event) => matchesArtist(event.artist, name));

  const facts = [
    artist.genre ? ['Genre', artist.genre] : null,
    place(artist) ? ['Location', place(artist)] : null,
    rosterLabel(artist) ? ['Roster', rosterLabel(artist)] : null,
  ].filter(Boolean);

  const socials = [
    safeUrl(artist.instagram) ? ['Instagram', safeUrl(artist.instagram)] : null,
    safeUrl(artist.soundcloud) ? ['SoundCloud', safeUrl(artist.soundcloud)] : null,
    safeUrl(artist.website) ? ['Website', safeUrl(artist.website)] : null,
  ].filter(Boolean);

  const releaseHtml = ownReleases.length
    ? `<section class="section"><div class="wrap"><h2>Releases</h2><div class="grid-2">${ownReleases.map((release) => {
        const href = releaseHref(release);
        const bits = [release.genre, release.catNo, release.date].filter(Boolean).join(' · ');
        return `<article class="artist-card">${bits ? `<span class="artist-meta">${esc(bits)}</span>` : ''}<h3>${renderLinkedHeading(href, release.title || 'Release')}</h3></article>`;
      }).join('')}</div></div></section>`
    : '';

  const eventHtml = ownEvents.length
    ? `<section class="section"><div class="wrap"><h2>Shows on file</h2><div class="grid-2">${ownEvents.map((event) => {
        const href = eventHref(event);
        const bits = [event.date, event.type, event.status].filter(Boolean).join(' · ');
        const where = [event.venue, event.city, event.country].filter(Boolean).join(', ');
        return `<article class="artist-card">${bits ? `<span class="artist-meta">${esc(bits)}</span>` : ''}<h3>${renderLinkedHeading(href, event.venue || 'Show')}</h3>${where ? `<p>${esc(where)}</p>` : ''}</article>`;
      }).join('')}</div></div></section>`
    : '';

  const bookHtml = bookable
    ? `<section class="section" id="book"><div class="wrap"><h2>Book ${esc(name)}</h2><p class="section-intro">Send the date, city, venue, and offer details. The inquiry opens with this artist selected.</p><div class="actions"><a class="btn btn-primary" href="/booking-agency?artist=${esc(slug)}#inquiry">Book this artist</a><a class="btn btn-secondary" href="mailto:${BOOKING_EMAIL}?subject=${encodeURIComponent('Booking ' + name)}">Email ${BOOKING_EMAIL}</a></div><p class="signature">Jack / FreqVault · Mixxea Records / <a href="mailto:${BOOKING_EMAIL}">${BOOKING_EMAIL}</a> / <a href="${BASE}">mixxea.com</a></p></div></section>`
    : `<section class="section"><div class="wrap"><h2>Booking</h2><p class="section-intro">${esc(name)} is on the label roster. Booking requests for agency artists go through Freq Vault.</p><div class="actions"><a class="btn btn-primary" href="/booking-agency">Freq Vault booking agency</a></div></div></section>`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'MusicGroup',
        '@id': `${BASE}/artists/${slug}#artist`,
        name,
        url: `${BASE}/artists/${slug}`,
        ...(artist.genre ? { genre: artist.genre } : {}),
        ...(bio ? { description: bio } : {}),
        ...(photo ? { image: photo } : {}),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE}/` },
          { '@type': 'ListItem', position: 2, name: 'Artists', item: `${BASE}/electronic-music-artists` },
          { '@type': 'ListItem', position: 3, name, item: `${BASE}/artists/${slug}` },
        ],
      },
    ],
  };

  const body = `${seoNav('/electronic-music-artists')}
<main>
<section class="hero"><div class="wrap">
  <div class="breadcrumbs"><a href="/">Home</a><span>/</span><a href="/electronic-music-artists">Artists</a><span>/</span><span>${esc(name)}</span></div>
  <div class="hero-grid">
    <div>
      <div class="kicker">Artist profile</div>
      <h1>${esc(name)}</h1>
      <p class="lead">${esc(lead)}</p>
      <div class="actions">${bookable ? `<a class="btn btn-primary" href="/booking-agency?artist=${esc(slug)}#inquiry">Book this artist</a>` : ''}<a class="btn btn-secondary" href="/electronic-music-artists">Full roster</a></div>
    </div>
    <aside class="hero-card">
      ${photo ? `<img src="${esc(photo)}" alt="${esc(name)}" style="width:100%;aspect-ratio:1;object-fit:cover;margin-bottom:16px">` : `<strong>${esc(String(name).slice(0, 2))}</strong>`}
      <p>${bookable ? `Booking inquiries for ${esc(name)} go to Freq Vault.` : `${esc(name)} is listed on the label roster.`}</p>
      <p class="signature"><a href="mailto:${BOOKING_EMAIL}">${BOOKING_EMAIL}</a></p>
    </aside>
  </div>
</div></section>
${facts.length ? `<section class="section"><div class="wrap"><h2>On file</h2><div class="grid-3">${facts.map(([label, value]) => `<article class="panel"><h3>${esc(label)}</h3><p>${esc(value)}</p></article>`).join('')}</div></div></section>` : ''}
${bio ? `<section class="section"><div class="wrap"><h2>Biography</h2><p class="section-intro">${esc(bio).replace(/\n/g, '<br>')}</p></div></section>` : ''}
${socials.length ? `<section class="section"><div class="wrap"><h2>Links</h2><div class="actions">${socials.map(([label, href]) => `<a class="btn btn-secondary" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`).join('')}</div></div></section>` : ''}
${releaseHtml}
${eventHtml}
${bookHtml}
</main>
${seoFooter()}`;

  return pageShell({
    title: `${name} | Mixxea Artist Profile`,
    description: bio || lead,
    canonicalPath: `/artists/${slug}`,
    jsonLd,
    body,
  });
}

function renderPlainText(value) {
  const text = String(value || '').replace(/\r\n/g, '\n').trim();
  if (!text) return '';
  return text.split(/\n{2,}/).map((para) => `<p>${esc(para).replace(/\n/g, '<br>')}</p>`).join('');
}

function absoluteAsset(value) {
  const url = safeUrl(value);
  if (!url) return '';
  if (url.startsWith('/')) return `${BASE}${url}`;
  return url;
}

function renderNotFound() {
  return pageShell({
    title: 'Page not found | Mixxea',
    description: 'This page is not available on Mixxea.',
    robots: 'noindex, nofollow',
    omitCanonical: true,
    body: `${seoNav()}
<main>
<section class="hero"><div class="wrap">
  <div class="kicker">404</div>
  <h1>Page not found</h1>
  <p class="lead">This URL is not a page on Mixxea. The homepage, roster, booking agency, and published news are linked below.</p>
  <div class="actions"><a class="btn btn-primary" href="/">Home</a><a class="btn btn-secondary" href="/booking-agency">Booking agency</a><a class="btn btn-secondary" href="/electronic-music-artists">Artists</a></div>
</div></section>
</main>
${seoFooter()}`,
  });
}

function renderNewsArticle(article) {
  const slug = newsSlug(article);
  const title = String(article.title || 'News').trim() || 'News';
  const bodyText = String(article.body || article.excerpt || '').trim();
  const description = bodyText.replace(/\s+/g, ' ').slice(0, 160) || `${title} — Mixxea Records.`;
  const image = absoluteAsset(article.image) || `${BASE}/og/mixxea-og.svg`;
  const when = formatNewsDate(article.date || article.createdAt);
  const category = String(article.category || 'News').trim() || 'News';
  const author = String(article.author || 'Mixxea Records').trim() || 'Mixxea Records';
  const canonicalPath = `/news/${slug}`;
  const canonical = `${BASE}${canonicalPath}`;
  const published = article.date || String(article.createdAt || '').slice(0, 10);
  const modified = String(article.updatedAt || article.date || article.createdAt || '').slice(0, 10);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    image,
    datePublished: published,
    dateModified: modified,
    author: { '@type': 'Organization', name: author, '@id': `${BASE}/#mixxea` },
    publisher: { '@type': 'Organization', name: 'Mixxea Records', '@id': `${BASE}/#mixxea` },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    url: canonical,
  };
  const figure = absoluteAsset(article.image)
    ? `<figure class="article-figure"><img src="${esc(absoluteAsset(article.image))}" alt="${esc(title)}"></figure>`
    : '';
  const meta = [when, author].filter(Boolean).map(esc).join(' · ');
  const body = `${seoNav()}
<main>
<section class="hero"><div class="wrap">
  <div class="breadcrumbs"><a href="/">Home</a><span>/</span><a href="/#news">News</a><span>/</span><span>${esc(title)}</span></div>
  <div class="kicker">${esc(category)}</div>
  <h1 class="article-title">${esc(title)}</h1>
  ${meta ? `<p class="article-meta">${meta}</p>` : ''}
  ${figure}
  <div class="article-body">${renderPlainText(bodyText)}</div>
  <div class="actions"><a class="btn btn-secondary" href="/#news">All news</a><a class="btn btn-primary" href="/booking-agency">Booking agency</a></div>
</div></section>
</main>
${seoFooter()}`;

  return pageShell({
    title: `${title} | Mixxea Records`,
    description,
    canonicalPath,
    ogType: 'article',
    ogImage: image,
    jsonLd,
    body,
  });
}

module.exports = {
  BOOKING_EMAIL,
  artistSlug,
  findArtist,
  isBookable,
  factualLead,
  injectHome,
  injectBooking,
  injectRoster,
  renderArtistPage,
  renderArtistNotFound,
  renderNewsArticle,
  renderNotFound,
  renderHomeTiles,
  renderDirectoryCards,
};
