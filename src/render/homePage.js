/**
 * Homepage for Direction A. Copy is the approved deck.
 */

const fs = require('fs');
const path = require('path');
const { visibleReleases, visibleNews, visibleEvents } = require('../lib/rosterCatalog');
const pages = require('./publicPages');
const blocks = require('./blocks');

const ROSTER_WIDTH = {
  'david-hopperman': 800,
  'wally-lopez': 400,
  'eddie-bitar': 480,
};

const SOCIALS = [
  ['Spotify', 'https://open.spotify.com/user/g2uczos6zb7b5hzeyckxk2xwq?si=59fb44d4a4a244ad'],
  ['Beatport', 'https://www.beatport.com/label/mixxea-records/79255'],
  ['SoundCloud', 'https://soundcloud.com/mixxea'],
  ['YouTube', 'https://www.youtube.com/@mixxeamusic6902'],
  ['Instagram — Mixxea', 'https://www.instagram.com/mixxea_/'],
  ['Instagram — FreqVault', 'https://www.instagram.com/freqvault/'],
];

function rosterArtists(artists) {
  return pages.listArtists(artists)
    .filter((artist) => artist.onRoster !== false)
    .sort((a, b) => (Number(a.featured) || 99) - (Number(b.featured) || 99));
}

function homeReleases(releases) {
  const sorted = pages.sortReleases(releases).filter((release) => pages.coverUrl(release, false) || pages.coverUrl(release, true));
  const out = sorted.filter((release) => !['pre', 'draft'].includes(String(release.status || '').toLowerCase()));
  const pre = sorted.filter((release) => String(release.status || '').toLowerCase() === 'pre').slice(0, 1);
  return out.slice(0, 4).concat(pre);
}

function latestRelease(releases) {
  return pages.sortReleases(releases).find((release) => String(release.status || '').toLowerCase() === 'out')
    || pages.sortReleases(releases)[0]
    || null;
}

function rosterNote(count) {
  if (!count) return '';
  if (count === 3) return 'All three artists bookable through FreqVault — booking@mixxea.com';
  if (count === 1) return 'One artist bookable through FreqVault — booking@mixxea.com';
  return `All ${count} artists bookable through FreqVault — booking@mixxea.com`;
}

function roleTag(artist) {
  const type = String(artist.type || '').toLowerCase();
  let label = 'Label';
  if (type === 'both') label = 'Label + Agency';
  else if (type === 'booking' || type === 'agency') label = 'Agency';
  const cls = pages.isBookable(artist) ? 'meta sig' : 'meta';
  return `<div class="${cls}">${pages.esc(label)}</div>`;
}

function rosterSrcset(slug, photo) {
  const master = ROSTER_WIDTH[slug] || 800;
  const parts = [];
  const listed = new Set();
  for (const extra of [400, 600, 800]) {
    if (extra > master) continue;
    const file = path.join(__dirname, '../../public/img/roster', `${slug}-${extra}.webp`);
    if (!fs.existsSync(file)) continue;
    parts.push(`/img/roster/${slug}-${extra}.webp ${extra}w`);
    listed.add(extra);
  }
  if (photo && !listed.has(master)) parts.push(`${photo} ${master}w`);
  return parts.join(', ');
}

function rosterCard(artist) {
  const slug = pages.artistSlug(artist);
  const photo = pages.safeUrl(artist.photo);
  const where = [artist.country, artist.city].filter(Boolean).join(', ');
  const meta = [artist.genre, where].filter(Boolean).join(' · ');
  const book = pages.isBookable(artist)
    ? `<a href="/booking-agency?artist=${pages.esc(slug)}#inquiry">Book →</a>`
    : '';
  const width = ROSTER_WIDTH[slug] || 800;
  return `<article class="roster-card">
    <a href="/artists/${pages.esc(slug)}"><img src="${pages.esc(photo)}" srcset="${pages.esc(rosterSrcset(slug, photo))}" sizes="(min-width:1024px) 33vw, 264px" alt="${pages.esc(artist.photoAlt || artist.name + ', portrait')}" width="${width}" height="${Math.round(width * 1.25)}" loading="lazy" decoding="async"></a>
    ${roleTag(artist)}
    <h3>${pages.esc(artist.name)}</h3>
    <div class="meta" style="margin-top:8px">${pages.esc(meta)}</div>
    <div class="links"><a href="/artists/${pages.esc(slug)}">Profile →</a>${book}</div>
  </article>`;
}

function renderHome(bundle) {
  const artists = rosterArtists(bundle.artists);
  const allArtists = pages.listArtists(bundle.artists);
  const releases = visibleReleases(bundle.releases, allArtists);
  const news = visibleNews(bundle.news, allArtists);
  const events = visibleEvents(bundle.events, allArtists);
  const cards = artists.filter((artist) => pages.safeUrl(artist.photo));
  const textOnly = artists.filter((artist) => !pages.safeUrl(artist.photo)).map((artist) => artist.name);
  const bookableCount = artists.filter((artist) => pages.isBookable(artist)).length;
  const shown = homeReleases(releases);
  const latest = latestRelease(releases.filter((release) => pages.coverUrl(release, true) || pages.coverUrl(release, false)));
  const latestHref = latest ? pages.releaseHref(latest) : '/releases';
  const latestSpotify = latest ? ((latest.links && latest.links.spotify) || latest.spotify) : '';
  const year = new Date().getFullYear();
  const upcoming = events.filter((event) => String(event.date || '') >= new Date().toISOString().slice(0, 10));
  const shows = upcoming.length >= 2
    ? `<section class="band"><div class="wrap"><div class="band-head"><h2 class="d-m">Shows.</h2></div>${upcoming.slice(0, 6).map((event) => `<p class="body">${pages.esc([event.date, event.artist, event.venue, event.city].filter(Boolean).join(' · '))}</p>`).join('')}</div></section>`
    : '';

  const latestHtml = latest ? `<div class="latest">
      <span class="meta acid">Latest</span>
      ${pages.coverUrl(latest, true) ? `<a href="${pages.esc(latestHref)}" aria-label="${pages.esc((latest.artist || '') + ' — ' + (latest.title || 'Release'))}"><img src="${pages.esc(pages.coverUrl(latest, true))}" width="44" height="44" alt=""></a>` : ''}
      <div class="mid">
        <span class="meta catno">${pages.esc(latest.catNo || '')}</span>
        <a class="t" href="${pages.esc(latestHref)}">${pages.esc(latest.artist || '')} — ${pages.esc(latest.title || '')}</a>
        <span class="meta when">${pages.esc([latest.genre, pages.formatCatalogueDate(latest.date || latest.releaseDate)].filter(Boolean).join(' · '))}</span>
      </div>
      <div class="sp">
        ${pages.safeUrl(latestSpotify) ? `<a href="${pages.esc(pages.safeUrl(latestSpotify))}" target="_blank" rel="noopener">▶ Spotify</a>` : ''}
        <a href="/releases">All releases →</a>
      </div>
    </div>` : '';

  const body = `${pages.siteNav('/')}
<main id="content">
  <section class="hero">
    <div class="wrap">
      <div class="hero-grid">
        <div class="hero-copy">
          <p class="meta kicker">Mixxea Records × FreqVault Agency</p>
          <h1 class="h-title">Electronic music label <span class="amp">&amp;</span> booking agency.</h1>
          <p class="body-l">Mixxea Records is an independent electronic music label. FreqVault is our agency — booking and artist management for DJs, producers and live acts.</p>
          <div class="hero-ctas">
            <a class="btn acid" href="/booking-agency#inquiry">Book an artist <small>booking@mixxea.com</small></a>
            <a class="btn" href="/releases">Explore the catalogue →</a>
          </div>
        </div>
        <figure class="hero-portrait">
          <img src="/img/hero/hopperman_4x5_840.webp"
            srcset="/img/hero/hopperman_4x5_560.webp 560w, /img/hero/hopperman_4x5_640.webp 640w, /img/hero/hopperman_4x5_840.webp 840w, /img/hero/hopperman_4x5_1120.webp 1120w"
            sizes="(min-width:1024px) 533px, 100vw" width="1120" height="1400"
            alt="David Hopperman, black-and-white portrait" fetchpriority="high">
          <figcaption class="hero-cap"><span class="meta">On the roster — David Hopperman</span><span class="meta">Marseille</span></figcaption>
        </figure>
      </div>
      ${latestHtml}
    </div>
  </section>

  <section class="band">
    <div class="wrap">
      <p class="meta">01 — Who we are · Since 2013 · Label &amp; management since 2017</p>
      <div class="grid" style="margin-top:var(--s-5);align-items:end">
        <h2 class="d-l" style="grid-column:1 / span 7">One house. Two doors.</h2>
        <p class="body" style="grid-column:8 / span 5">The label releases the music. The agency puts the artists in front of rooms. Same team, same standards.</p>
      </div>
      <div class="doors">
        <article class="door">
          <div class="door-top"><span class="meta acid">The label</span><span class="meta">Mixxea Records</span></div>
          <h3 class="h3">Releases, publishing &amp; artist development.</h3>
          <p class="body">Global distribution to every major DSP, publishing and sync, release marketing and long-term artist development.</p>
          <ul>
            <li>Global distribution<span>Spotify · Apple Music · Beatport</span></li>
            <li>Publishing &amp; sync<span>TV · Film · Ads · Games</span></li>
            <li>Release marketing<span>Per release</span></li>
          </ul>
          <a class="cta meta acid" href="/record-label">Explore the label →</a>
        </article>
        <article class="door">
          <div class="door-top"><span class="meta sig">The agency</span><img class="fv-mark" src="/img/freqvault-signal-stack.png" alt="FreqVault" width="47" height="42"></div>
          <h3 class="h3">Bookings, management &amp; tour production.</h3>
          <p class="body">Festival, club and private bookings — first offer to final settlement. Career management, brand deals and tour logistics.</p>
          <ul>
            <li>Live bookings<span>Festivals · Clubs · Private</span></li>
            <li>Artist management<span>Strategy · Brand deals</span></li>
            <li>Tour production<span>Routing · Riders · Travel</span></li>
          </ul>
          <a class="cta meta sig" href="/booking-agency#inquiry">Book through FreqVault → booking@mixxea.com</a>
        </article>
      </div>
    </div>
  </section>

  <section class="band" id="roster">
    <div class="wrap">
      <div class="band-head"><div><p class="meta">02 — Artists</p><h2 class="d-l">The roster.</h2></div><a href="/electronic-music-artists">All artists →</a></div>
      <div class="roster-grid">${cards.map(rosterCard).join('')}</div>
      ${textOnly.length ? `<p class="also body">Also on the roster: ${pages.esc(textOnly.join(', '))}</p>` : ''}
      ${bookableCount ? `<p class="meta" style="margin-top:var(--s-5)">${pages.esc(rosterNote(bookableCount))}</p>` : ''}
    </div>
  </section>

  <section class="band" id="releases">
    <div class="wrap">
      <div class="band-head"><div><p class="meta">03 — Catalogue</p><h2 class="d-l">Latest releases.</h2></div><a href="/releases">View all releases →</a></div>
      <div class="rel-grid">${shown.map((release) => blocks.releaseCard(release)).join('') || '<p class="body">No releases on file yet.</p>'}</div>
    </div>
  </section>
  ${shows}
  <section class="book" id="book">
    <div class="wrap book-grid">
      <div>
        <p class="meta sig">04 — Booking · FreqVault Agency</p>
        <h2 class="d-l">Book an artist.</h2>
        <a class="mail" href="mailto:booking@mixxea.com">booking@mixxea.com</a>
      </div>
      <div>
        <p class="body">Festivals, clubs, private events and branded shows. Tell us the date, city and capacity — our team responds to every booking inquiry within 48 hours.</p>
        <p style="margin-top:var(--s-5)"><a class="btn sig" href="/booking-agency#inquiry">Send a booking request →</a></p>
      </div>
    </div>
  </section>

  <section class="band" id="news">
    <div class="wrap">
      <div class="band-head"><div><p class="meta">05 — News</p><h2 class="d-l">From the label.</h2></div><a href="/news">All news →</a></div>
      <div class="news-grid">${news.slice(0, 3).map((post, index) => blocks.newsCard(post, { featured: index === 0 })).join('')}</div>
    </div>
  </section>

  <section class="band" id="demos">
    <div class="wrap demo-grid">
      <div>
        <p class="meta">06 — Demos</p>
        <h2 class="d-m">Send us your music.</h2>
        <p class="body" style="margin-top:var(--s-4)">Share a private SoundCloud (or similar) streaming link with a short note on who you are.</p>
      </div>
      <div>
        <div class="demo-row"><span>A&amp;R / demos</span><a href="mailto:ar@mixxea.com">ar@mixxea.com</a></div>
        <div class="demo-row"><span>General label enquiries</span><a href="mailto:info@mixxea.com">info@mixxea.com</a></div>
        <div class="demo-row"><a href="/submit-demo">Submit through the artist portal →</a></div>
      </div>
    </div>
  </section>
</main>
${pages.siteFooter({ year, socials: SOCIALS })}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://www.mixxea.com/#mixxea',
        name: 'Mixxea Records',
        url: 'https://www.mixxea.com/',
        foundingDate: '2013',
        email: 'booking@mixxea.com',
        department: [{ '@type': 'Organization', name: 'FreqVault Agency' }],
      },
    ],
  };

  return pages.pageShell({
    title: 'Mixxea Records & FreqVault Agency — Electronic Music Label & Booking Agency',
    description: 'Independent electronic music label Mixxea Records and booking agency FreqVault. Releases, artist management and bookings — booking@mixxea.com.',
    canonicalPath: '/',
    jsonLd,
    extraHead: `<link rel="preload" as="image" type="image/webp" imagesrcset="/img/hero/hopperman_4x5_560.webp 560w, /img/hero/hopperman_4x5_640.webp 640w, /img/hero/hopperman_4x5_840.webp 840w, /img/hero/hopperman_4x5_1120.webp 1120w" imagesizes="(min-width:1024px) 533px, 100vw" fetchpriority="high">`,
    body,
  });
}

module.exports = { renderHome, SOCIALS, rosterNote };
