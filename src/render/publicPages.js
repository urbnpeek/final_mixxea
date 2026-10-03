/**
 * Public HTML for the booking path and artist profiles.
 * Copy and facts come only from the artist/release/event records already stored.
 * No awards, bios, or career claims are added here.
 */

const slugify = require('../utils/slugify');
const { visibleReleases, visibleEvents, visibleNews } = require('../lib/rosterCatalog');
const { canonicalOrigin } = require('../lib/siteUrl');
const { publicDetailExists } = require('../lib/publicDetail');
const { renderMarkdown, markdownToText } = require('../lib/markdown');
const { categoryLabel, publicCategory, categoryAccent } = require('../lib/categories');
const { scrubConfirm } = require('../lib/scrubConfirm');

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
  return scrubConfirm(String(value ?? ''))
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
  return Boolean(artist && artist.bookable === true);
}

function safeUrl(value) {
  const url = String(value || '').trim();
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  return '';
}

function publicImage(value) {
  const url = safeUrl(value);
  if (!url || /\/uploads\//i.test(url)) return '';
  const local = url.replace(/^https?:\/\/(?:www\.)?mixxea\.com(?=\/)/i, '');
  return local || '';
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

function releaseSlug(release) {
  if (!release) return '';
  const explicit = slugify(release.slug);
  if (explicit) return explicit;
  return slugify(`${release.artist || ''}-${release.title || ''}`);
}

function releaseHref(release) {
  const slug = releaseSlug(release);
  if (!slug) return '';
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
  const list = listArtists(artists).filter((artist) => artist.onRoster !== false);
  if (!list.length) {
    return `<p class="section-intro">No artists are published on the roster yet. For a booking inquiry, email <a href="mailto:${BOOKING_EMAIL}">${BOOKING_EMAIL}</a>.</p>`;
  }

  return list.map((artist) => {
    const slug = artistSlug(artist);
    const meta = metaLine(artist);
    const bio = String(artist.bio || '').trim();
    const book = isBookable(artist)
      ? `<a class="btn btn-primary" href="/booking-agency?artist=${esc(slug)}#inquiry">Book</a>`
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
  artists = listArtists(artists).filter((artist) => isBookable(artist));
  const wanted = slugify(selectedSlug || '');
  return listArtists(artists).map((artist) => {
    const slug = artistSlug(artist);
    const selected = wanted && (slug === wanted || slugify(artist.name) === wanted) ? ' selected' : '';
    return `<option value="${esc(artist.name)}" data-slug="${esc(slug)}"${selected}>${esc(artist.name)}</option>`;
  }).join('');
}

function formatNewsDate(value) {
  return formatCatalogueDate(value);
}

function formatCatalogueDate(value) {
  if (!value) return '';
  const raw = scrubConfirm(String(value));
  if (!raw) return '';
  if (/^\d{4}$/.test(raw)) return raw;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function formatEventDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return esc(value || '');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = date.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }).toUpperCase();
  return `${day} ${month}<br>${date.getUTCFullYear()}`;
}

function releaseStatus(release) {
  const status = String(release && release.status || '').toLowerCase();
  if (status === 'pre') return { cls: 's-pre', label: 'Pre-Order' };
  if (status === 'soon') return { cls: 's-pre', label: 'Coming Soon' };
  const date = String((release && (release.releaseDate || release.date)) || '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(date) && date > new Date().toISOString().slice(0, 10)) {
    return { cls: 's-pre', label: 'Coming Soon' };
  }
  return { cls: 's-out', label: 'Out Now' };
}

function sortReleases(releases) {
  return [...(Array.isArray(releases) ? releases : [])].sort((a, b) => {
    const featured = Number(Boolean(b && b.featured)) - Number(Boolean(a && a.featured));
    if (featured) return featured;
    const left = String((a && (a.releaseDate || a.date || a.publishedAt)) || '');
    const right = String((b && (b.releaseDate || b.date || b.publishedAt)) || '');
    return right.localeCompare(left);
  });
}

function coverUrl(record, thumb) {
  const cover = record && record.cover;
  if (thumb) {
    if (cover && cover.thumbUrl) return publicImage(cover.thumbUrl);
    if (record && record.artworkThumb) return publicImage(record.artworkThumb);
  }
  if (cover && cover.url) return publicImage(cover.url);
  return publicImage(record && (record.artwork || record.image));
}

function renderReleaseCards(releases) {
  const list = sortReleases(releases).slice(0, 6);
  if (!list.length) return '<p class="catalog-empty">No releases on file yet.</p>';

  return list.map((release, index) => {
    const featured = index === 0;
    const status = releaseStatus(release);
    const artwork = coverUrl(release, true);
    const alt = (release.cover && release.cover.alt) || release.title || '';
    const width = release.cover && release.cover.w;
    const height = release.cover && release.cover.h;
    const dims = width && height ? ` width="${esc(width)}" height="${esc(height)}"` : '';
    const mark = esc(release.catNo ? String(release.catNo).slice(-3) : String(release.title || '').slice(0, 2).toUpperCase());
    const visual = artwork
      ? `<img src="${esc(artwork)}" alt="${esc(alt)}"${dims} loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover;opacity:.4">`
      : mark;
    const links = [
      ['beatport', 'Beatport'],
      ['spotify', 'Spotify'],
      ['apple', 'Apple'],
      ['soundcloud', 'SoundCloud'],
      ['bandcamp', 'Bandcamp'],
    ].map(([key, label]) => {
      const href = safeUrl(release[key] || (release.links && release.links[key]));
      return href ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer" class="dsp-link">${label}</a>` : '';
    }).join('');
    const when = formatNewsDate(release.date || release.releaseDate);
    const who = [release.artist, when].filter(Boolean).join(' — ');
    const href = releaseHref(release);
    const title = esc(String(release.title || '').toUpperCase());
    return `<div class="r-card${featured ? ' r-card-featured' : ''}" data-track="${index}" data-genre="${esc(String(release.genre || '').toLowerCase())}" data-title="${esc(release.title || '')}" data-artist="${esc(release.artist || '')}" data-art="${mark}" data-audio="${esc(safeUrl(release.audioPreview))}">
        <div class="rc-art${featured ? ' big' : ''}" style="color:rgba(232,255,0,.08)">${href ? `<a href="${esc(href)}">${visual}</a>` : visual}</div>
        <div class="rc-grad"></div>
        <div class="rc-status ${status.cls}">${status.label}</div>
        <button class="rc-play" onclick="playTrack(${index}, event)">▶</button>
        <div class="rc-cnt${featured ? ' big' : ''}">
          <div class="rc-cat">${esc([release.genre, release.catNo].filter(Boolean).join(' · '))}</div>
          <div class="rc-title${featured ? ' big' : ''}">${href ? `<a href="${esc(href)}">${title}</a>` : title}</div>
          <div class="rc-who">${esc(who)}</div>
        </div>
        <div class="rc-dsp">${links}</div>
      </div>`;
  }).join('');
}

function newsSlug(item) {
  return slugify(item && (item.slug || item.title));
}

function sortNews(news) {
  return [...(Array.isArray(news) ? news : [])].sort((a, b) => {
    const left = String((a && (a.publishedAt || a.date || a.createdAt)) || '');
    const right = String((b && (b.publishedAt || b.date || b.createdAt)) || '');
    return right.localeCompare(left);
  });
}

function renderNewsCards(news) {
  const list = sortNews(news).slice(0, 3);
  if (!list.length) return '<p class="catalog-empty">No news on file yet.</p>';

  return list.map((item, index) => {
    const image = coverUrl(item, true);
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
  return `<script>
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
window.gtag=gtag;
gtag('consent','default',{
  ad_storage:'denied',
  analytics_storage:'denied',
  ad_user_data:'denied',
  ad_personalization:'denied',
  wait_for_update:500
});
window.mxLoadAnalytics=function(){
  if(window.__mxGa)return;
  window.__mxGa=true;
  var marketing=false;
  try{
    var stored=JSON.parse(localStorage.getItem('mx-consent')||'null');
    if(stored&&stored.v===1)marketing=!!stored.marketing;
  }catch(e){}
  gtag('consent','update',{
    analytics_storage:'granted',
    ad_storage:marketing?'granted':'denied',
    ad_user_data:marketing?'granted':'denied',
    ad_personalization:marketing?'granted':'denied'
  });
  var s=document.createElement('script');
  s.async=true;
  s.src='https://www.googletagmanager.com/gtag/js?id=G-MEVRRCQQ5T';
  document.head.appendChild(s);
  gtag('js',new Date());
  gtag('config','G-MEVRRCQQ5T');
};
window.mxLoadPixel=function(){
  if(window.__mxPx)return;
  window.__mxPx=true;
  gtag('consent','update',{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted'});
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  fbq('init','1331927570650344');
  fbq('track','PageView');
};
try{
  var saved=JSON.parse(localStorage.getItem('mx-consent')||'null');
  var fresh=false;
  if(saved&&saved.v===1&&typeof saved.at==='string'){
    var then=new Date(saved.at);
    if(!isNaN(then.getTime())){
      var limit=new Date(then.getTime());
      limit.setMonth(limit.getMonth()+12);
      fresh=Date.now()<limit.getTime();
    }
  }
  if(fresh){
    if(saved.analytics)window.mxLoadAnalytics();
    if(saved.marketing)window.mxLoadPixel();
  }
}catch(e){}
</script>`;
}

function stripTrackers(html) {
  return String(html)
    .replace(/<!--\s*Google Tag Manager(?:\s*\(noscript\))?\s*-->[\s\S]*?<!--\s*End Google Tag Manager(?:\s*\(noscript\))?\s*-->/gi, '')
    .replace(/<!--\s*Google tag \(gtag\.js\)\s*-->/gi, '')
    .replace(/<!--\s*Meta Pixel Code\s*-->[\s\S]*?<!--\s*End Meta Pixel Code\s*-->/gi, '')
    .replace(/<script[^>]+googletagmanager\.com\/gtag\/js[^>]*>\s*<\/script>/gi, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (block) => (
      /GTM-KCNCSXM7|gtag\(|fbq\(|fbevents\.js|googletagmanager\.com/.test(block) ? '' : block
    ))
    .replace(/<noscript>\s*<iframe[^>]+googletagmanager\.com\/ns\.html[\s\S]*?<\/noscript>/gi, '')
    .replace(/<noscript>\s*<img[^>]+facebook\.com\/tr[\s\S]*?<\/noscript>/gi, '');
}

const NAV_ITEMS = [
  ['/record-label', 'Label'],
  ['/electronic-music-artists', 'Artists'],
  ['/releases', 'Releases'],
  ['/booking-agency', 'Agency'],
  ['/news', 'News'],
  ['/submit-demo', 'Demos'],
];

function navCurrent(href, currentPath) {
  const path = String(currentPath || '');
  if (href === '/electronic-music-artists') return path === href || path.startsWith('/artists/');
  if (href === '/news') return path === href || path.startsWith('/news/');
  if (href === '/releases') return path === href || path.startsWith('/releases/');
  return path === href;
}

function siteNav(currentPath) {
  const items = NAV_ITEMS.map(([href, label]) => {
    const current = navCurrent(href, currentPath) ? ' aria-current="page"' : '';
    return `<li><a href="${href}"${current}>${label}</a></li>`;
  }).join('');
  const drawer = NAV_ITEMS.map(([href, label]) => `<a class="item" href="${href}">${label}</a>`).join('');
  return `<a class="skip" href="#content">Skip to content</a>
<header class="site-nav">
  <div class="wrap">
    <a class="wm" href="/" aria-label="Mixxea home">MI<i>X</i>XEA</a>
    <nav aria-label="Primary"><ul class="nav-links">${items}</ul></nav>
    <div class="nav-right">
      <a class="mail small" href="mailto:${BOOKING_EMAIL}">${BOOKING_EMAIL}</a>
      <a class="btn acid" href="/booking-agency#inquiry"><span class="wide">Book an artist</span><span class="short">Book</span></a>
      <button class="nav-toggle" type="button" data-menu aria-expanded="false" aria-controls="drawer">Menu</button>
    </div>
  </div>
</header>
<div id="drawer" class="drawer" hidden>
  ${drawer}
  <div class="book-block">
    <div class="meta sig">Booking — FreqVault</div>
    <a href="mailto:${BOOKING_EMAIL}">${BOOKING_EMAIL}</a>
    <div class="socials"><a href="https://www.instagram.com/mixxea_/" target="_blank" rel="noopener">Instagram</a><a href="https://open.spotify.com/user/g2uczos6zb7b5hzeyckxk2xwq?si=59fb44d4a4a244ad" target="_blank" rel="noopener">Spotify</a><a href="https://www.beatport.com/label/mixxea-records/79255" target="_blank" rel="noopener">Beatport</a><a href="https://soundcloud.com/mixxea" target="_blank" rel="noopener">SoundCloud</a></div>
  </div>
</div>`;
}

function siteFooter(options = {}) {
  const year = options.year || new Date().getFullYear();
  const socials = options.socials || [
    ['Spotify', 'https://open.spotify.com/user/g2uczos6zb7b5hzeyckxk2xwq?si=59fb44d4a4a244ad'],
    ['Beatport', 'https://www.beatport.com/label/mixxea-records/79255'],
    ['SoundCloud', 'https://soundcloud.com/mixxea'],
    ['YouTube', 'https://www.youtube.com/@mixxeamusic6902'],
    ['Instagram — Mixxea', 'https://www.instagram.com/mixxea_/'],
    ['Instagram — FreqVault', 'https://www.instagram.com/freqvault/'],
  ];
  const listen = socials.map(([label, href]) => `<li><a href="${esc(href)}" target="_blank" rel="noopener">${esc(label)}</a></li>`).join('');
  return `<footer class="site-footer">
  <div class="wrap ft-grid">
    <div>
      <a class="wm" href="/">MI<i>X</i>XEA</a>
      <p class="body" style="margin-top:12px">Mixxea Records — electronic music label. FreqVault — booking &amp; artist management.</p>
    </div>
    <div>
      <h2>Label</h2>
      <ul>
        <li><a href="/record-label">Label</a></li>
        <li><a href="/releases">Releases</a></li>
        <li><a href="/electronic-music-artists">Artists</a></li>
        <li><a href="/submit-demo">Demos</a></li>
        <li><a href="/news">News</a></li>
      </ul>
    </div>
    <div>
      <h2>Agency</h2>
      <ul>
        <li><a href="/booking-agency">Booking agency</a></li>
        <li><a href="/artist-management">Artist management</a></li>
        <li><a href="mailto:${BOOKING_EMAIL}">${BOOKING_EMAIL}</a></li>
        <li><a href="mailto:press@mixxea.com">press@mixxea.com</a></li>
      </ul>
    </div>
    <div>
      <h2>Listen &amp; follow</h2>
      <ul>${listen}</ul>
    </div>
    <div>
      <h2>Newsletter</h2>
      <form class="nl" data-newsletter action="/api/newsletter/subscribe" method="post">
        <label class="meta" for="nl-email">Email</label>
        <input id="nl-email" name="email" type="email" required autocomplete="email" placeholder="Email" aria-label="Email">
        <button class="btn acid" type="submit">Subscribe</button>
      </form>
      <p class="small" data-nl-status></p>
    </div>
  </div>
  <div class="wrap ft-base">
    <span>&copy; ${year} Mixxea Records · FreqVault Agency · Since 2013</span>
    <span><a href="/privacy">Privacy</a> · <button type="button" class="linkish" data-cookie-settings>Cookie settings</button> · <a href="/portal">Artist login</a></span>
  </div>
</footer>`;
}

function seoNav(currentPath) {
  return siteNav(currentPath);
}

function seoFooter() {
  return siteFooter();
}

function applyChrome(html, currentPath) {
  let out = stripTrackers(html);
  out = out.replace(/<link[^>]+fonts\.googleapis\.com\/css2\?[^>]*>/gi, '');
  if (!out.includes('/css/site.css')) {
    out = out.replace(/<\/head>/i, '<link rel="stylesheet" href="/css/site.css">\n<script>document.documentElement.classList.add("js")</script>\n</head>');
  }
  if (!out.includes('mxLoadAnalytics')) {
    out = out.replace(/<\/head>/i, `${trackingHead()}\n</head>`);
  }
  out = out.replace(/<header\b[^>]*>[\s\S]*?<\/header>/i, siteNav(currentPath));
  out = out.replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/i, siteFooter());
  if (!out.includes('id="content"')) out = out.replace(/<main\b/i, '<main id="content"');
  if (!out.includes('/js/site.js')) out = out.replace(/<\/body>/i, '<script src="/js/site.js" defer></script>\n</body>');
  if (!out.includes('/js/consent.js')) out = out.replace(/<\/body>/i, '<script src="/js/consent.js" defer></script>\n</body>');
  out = out.replace(/Freq Vault/g, 'FreqVault');
  out = out.replace(/Jack \/ FreqVault · Mixxea Records/g, 'FreqVault Agency · Mixxea Records');
  out = out.replace(/Est\. 2024(?:\s*·\s*Global)?/g, 'Since 2013 · Label & management since 2017');
  out = out.replace(/\/og\/mixxea-og\.svg/g, '/og/mixxea-og.jpg');
  return out;
}

function pageShell({ title, description, canonicalPath, robots, jsonLd, body, omitCanonical, ogType, ogImage, extraHead, articleFonts, published, modified, section }) {
  const canonical = canonicalPath ? `${BASE}${canonicalPath}` : '';
  const image = ogImage || `${BASE}/og/mixxea-og.jpg`;
  const graph = jsonLd ? jsonScript(jsonLd) : '';
  const canonicalTag = !omitCanonical && canonical
    ? `<link rel="canonical" href="${esc(canonical)}">`
    : '';
  const ogUrl = !omitCanonical && canonical
    ? `<meta property="og:url" content="${esc(canonical)}">`
    : '';
  const articleMeta = [
    published ? `<meta property="article:published_time" content="${esc(published)}">` : '',
    modified ? `<meta property="article:modified_time" content="${esc(modified)}">` : '',
    section ? `<meta property="article:section" content="${esc(section)}">` : '',
  ].filter(Boolean).join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="preload" as="font" type="font/woff2" href="/fonts/barlow-condensed-normal-900.woff2" crossorigin>
${extraHead || ''}
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="${robots || 'index,follow'}">
${canonicalTag}
<meta property="og:type" content="${esc(ogType || 'website')}">
<meta property="og:site_name" content="Mixxea Records">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
${ogUrl}
<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
${articleMeta}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/css/site.css">
<script>document.documentElement.classList.add('js')</script>
${trackingHead()}
${graph}
</head>
<body>
${body}
<script src="/js/site.js" defer></script>
<script src="/js/consent.js" defer></script>
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
<main id="content">
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
    ? `<section class="band" id="book"><div class="wrap"><h2 class="d-m">Book ${esc(name)}</h2><p class="body">Send the date, city, venue, and offer details. The inquiry opens with this artist selected.</p><div class="hero-ctas" style="margin-top:24px"><a class="btn acid" href="/booking-agency?artist=${esc(slug)}#inquiry">Book this artist</a><a class="btn" href="mailto:${BOOKING_EMAIL}?subject=${encodeURIComponent('Booking ' + name)}">Email ${BOOKING_EMAIL}</a></div><p class="small">FreqVault Agency · Mixxea Records · <a href="mailto:${BOOKING_EMAIL}">${BOOKING_EMAIL}</a></p></div></section>`
    : '';

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
<main id="content">
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
      <p>${bookable ? `Booking inquiries for ${esc(name)} go to FreqVault.` : `${esc(name)} is listed on the label roster.`}</p>
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
  const url = publicImage(value);
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
<main id="content">
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

function renderNewsArticle(article, options = {}) {
  const slug = newsSlug(article);
  const title = String(article.title || 'News').trim() || 'News';
  const plain = markdownToText(article.excerpt || article.body || '');
  const seo = article.seo || {};
  const description = String(seo.description || plain).replace(/\s+/g, ' ').slice(0, 160) || `${title} — Mixxea Records.`;
  const suffix = ' | Mixxea Records';
  const fullTitle = `${title}${suffix}`;
  const pageTitle = seo.title
    ? String(seo.title)
    : (fullTitle.length <= 60 ? fullTitle : `${title.slice(0, Math.max(1, 60 - suffix.length - 1)).trim()}…${suffix}`);
  const image = absoluteAsset((seo.ogImage) || article.ogImage || coverUrl(article, false) || article.image) || `${BASE}/og/mixxea-og.jpg`;
  const when = formatNewsDate(article.date || article.publishedAt || article.createdAt);
  const category = categoryLabel(article.category || 'News') || 'News';
  const categorySlug = (publicCategory(article.category) || {}).slug || '';
  const author = String(article.author || 'Mixxea Records').trim() || 'Mixxea Records';
  const canonicalPath = `/news/${slug}`;
  const canonical = `${BASE}${canonicalPath}`;
  const published = article.date || String(article.publishedAt || article.createdAt || '').slice(0, 10);
  const modified = String(article.updatedAt || article.publishedAt || article.date || article.createdAt || '').slice(0, 10);
  const cover = article.cover || {};
  const dims = cover.w && cover.h ? ` width="${esc(cover.w)}" height="${esc(cover.h)}"` : '';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        headline: title,
        description,
        image,
        datePublished: published,
        dateModified: modified,
        articleSection: category,
        keywords: Array.isArray(article.tags) ? article.tags.join(', ') : '',
        author: { '@type': 'Organization', name: author, '@id': `${BASE}/#mixxea` },
        publisher: { '@type': 'Organization', name: 'Mixxea Records', '@id': `${BASE}/#mixxea` },
        mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
        url: canonical,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE}/` },
          { '@type': 'ListItem', position: 2, name: 'News', item: `${BASE}/news` },
          { '@type': 'ListItem', position: 3, name: title, item: canonical },
        ],
      },
    ],
  };
  const heroSrc = publicImage(coverUrl(article, false) || article.image);
  const accentClass = categoryAccent(article.category);
  const figure = heroSrc
    ? `<figure><img class="article-hero" src="${esc(heroSrc)}" alt="${esc(article.imageAlt || cover.alt || title)}"${dims} fetchpriority="high">${article.imageCaption ? `<figcaption class="small">${esc(article.imageCaption)}</figcaption>` : ''}</figure>`
    : `<figure><div class="ph article-hero" role="img" aria-label="${esc(title)}"><span class="meta ${accentClass}">${esc(category)}</span><b>NEWS</b></div></figure>`;
  const words = plain.split(/\s+/).filter(Boolean).length;
  const read = words ? `${Math.max(1, Math.round(words / 230))} min read` : '';
  const meta = [when, author, read].filter(Boolean).map(esc).join(' · ');
  const categoryHref = categorySlug ? `/news/category/${categorySlug}` : '/news';
  const accent = categoryAccent(article.category);
  const share = `<div class="share"><a data-copy href="${esc(canonical)}">Copy link</a><a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(canonical)}" target="_blank" rel="noopener">X</a><a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonical)}" target="_blank" rel="noopener">Facebook</a><a href="https://wa.me/?text=${encodeURIComponent(canonical)}" target="_blank" rel="noopener">WhatsApp</a><a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(canonical)}" target="_blank" rel="noopener">LinkedIn</a></div>`;
  const stand = article.excerpt ? `<p class="a-standfirst">${esc(article.excerpt)}</p>` : '';
  const related = options.relatedRelease
    ? `<aside><span class="meta">Related release</span><h3><a href="${esc(releaseHref(options.relatedRelease))}">${esc(options.relatedRelease.title || 'Release')}</a></h3><p>${esc(options.relatedRelease.artist || '')}</p></aside>`
    : '';
  const agency = categoryAccent(article.category) === 'sig'
    ? `<section class="book"><div class="wrap"><h2 class="d-m">Book an artist.</h2><a class="mail" href="mailto:${BOOKING_EMAIL}">${BOOKING_EMAIL}</a></div></section>`
    : '';
  const body = `${seoNav('/news')}
<main id="content">
<article class="band"><div class="wrap">
  <p class="crumbs"><a href="/news">News</a> / <a href="${esc(categoryHref)}">${esc(category)}</a></p>
  <p class="meta ${accent}">${esc(category)}</p>
  <h1 class="a-h1 article-title">${esc(title)}</h1>
  ${stand}
  ${meta ? `<p class="article-meta">${meta}</p>` : ''}
  ${share}
  ${figure}
  <div class="a-body article-body">${renderMarkdown(article.body || article.excerpt || '')}</div>
  ${share}
  ${related}
  <p><a class="btn" href="/news">All news →</a></p>
</div></article>
${agency}
</main>
${seoFooter()}`;

  return pageShell({
    title: pageTitle,
    description,
    canonicalPath,
    robots: options.preview ? 'noindex, nofollow' : 'index,follow',
    ogType: 'article',
    ogImage: image,
    articleFonts: true,
    published,
    modified,
    section: category,
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
  pageShell,
  seoNav,
  seoFooter,
  siteNav,
  siteFooter,
  applyChrome,
  listArtists,
  esc,
  safeUrl,
  publicImage,
  formatNewsDate,
  formatCatalogueDate,
  newsSlug,
  releaseSlug,
  releaseHref,
  sortReleases,
  sortNews,
  coverUrl,
  absoluteAsset,
  jsonScript,
};
