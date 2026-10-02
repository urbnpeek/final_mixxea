/**
 * Server-rendered /releases and /news catalogue pages.
 */

const pages = require('./publicPages');
const { canonicalOrigin } = require('../lib/siteUrl');
const { renderMarkdown, markdownToText } = require('../lib/markdown');
const { NEWS_CATEGORIES, categoryLabel } = require('../lib/categories');
const { artistSlug } = pages;

const BASE = canonicalOrigin();
const PAGE_SIZE = 12;

function pageCount(total) {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}

function slicePage(items, page) {
  const current = Math.min(Math.max(Number(page) || 1, 1), pageCount(items.length));
  const start = (current - 1) * PAGE_SIZE;
  return { current, pages: pageCount(items.length), items: items.slice(start, start + PAGE_SIZE) };
}

function pager(basePath, current, pagesCount) {
  if (pagesCount < 2) return '';
  const links = [];
  if (current > 1) links.push(`<a class="btn btn-secondary" href="${basePath}?page=${current - 1}">Previous</a>`);
  links.push(`<span class="article-meta">Page ${current} of ${pagesCount}</span>`);
  if (current < pagesCount) links.push(`<a class="btn btn-secondary" href="${basePath}?page=${current + 1}">Next</a>`);
  return `<div class="actions">${links.join('')}</div>`;
}

function streamButtons(release) {
  const links = [
    ['spotify', 'Spotify'],
    ['apple', 'Apple Music'],
    ['beatport', 'Beatport'],
    ['soundcloud', 'SoundCloud'],
    ['bandcamp', 'Bandcamp'],
    ['youtube', 'YouTube'],
  ];
  return links.map(([key, label]) => {
    const href = pages.safeUrl((release.links && release.links[key]) || release[key]);
    if (!href) return '';
    return `<a class="btn btn-secondary" href="${pages.esc(href)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  }).join('');
}

function artistLink(release, artists) {
  const name = String(release.artist || '').trim();
  if (!name) return '';
  const match = (Array.isArray(artists) ? artists : []).find((artist) =>
    String(artist.name || '').trim().toLowerCase() === name.toLowerCase()
    || (Array.isArray(release.artistIds) && release.artistIds.includes(artist.id))
  );
  if (!match) return pages.esc(name);
  return `<a href="/artists/${pages.esc(artistSlug(match))}">${pages.esc(match.name)}</a>`;
}

function releaseJsonLd(release, artists) {
  const slug = pages.releaseSlug(release);
  const url = `${BASE}/releases/${slug}`;
  const image = pages.absoluteAsset(pages.coverUrl(release, false) || release.artwork) || `${BASE}/og/mixxea-og.svg`;
  const byArtist = {
    '@type': 'MusicGroup',
    name: release.artist || 'Mixxea',
  };
  const tracks = (release.tracks || []).map((track, index) => ({
    '@type': 'MusicRecording',
    position: index + 1,
    name: track.title,
    ...(track.artist ? { byArtist: { '@type': 'MusicGroup', name: track.artist } } : { byArtist }),
    ...(track.duration ? { duration: track.duration } : {}),
  }));
  const description = markdownToText(release.seo && release.seo.description || release.description || '').slice(0, 160);
  if (release.type === 'single') {
    const recording = {
      '@type': 'MusicRecording',
      name: release.title,
      url,
      byArtist,
      ...(release.date ? { datePublished: release.date } : {}),
      image,
      ...(description ? { description } : {}),
      ...(release.catNo ? { isrcCode: undefined } : {}),
      inAlbum: {
        '@type': 'MusicAlbum',
        name: release.title,
        albumReleaseType: 'Single',
      },
    };
    delete recording.isrcCode;
    if (tracks[0] && tracks[0].duration) recording.duration = tracks[0].duration;
    return recording;
  }
  const albumType = { ep: 'EP', album: 'Album', compilation: 'Compilation', remix: 'Remix' }[release.type] || 'Album';
  return {
    '@type': 'MusicAlbum',
    name: release.title,
    url,
    albumReleaseType: albumType,
    byArtist,
    recordLabel: release.label || 'Mixxea Records',
    ...(release.date ? { datePublished: release.date } : {}),
    ...(release.genre ? { genre: release.genre } : {}),
    image,
    ...(description ? { description } : {}),
    ...(tracks.length ? { numTracks: tracks.length, track: tracks } : {}),
  };
}

function breadcrumb(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

function renderReleasePage(release, artists, options = {}) {
  const slug = pages.releaseSlug(release);
  const title = release.title || 'Release';
  const seo = release.seo || {};
  const description = String(seo.description || markdownToText(release.description) || `${title} by ${release.artist} on Mixxea Records.`).slice(0, 160);
  const pageTitle = seo.title || `${title} — ${release.artist} | Mixxea Records`;
  const image = pages.absoluteAsset(seo.ogImage || pages.coverUrl(release, false) || release.artwork) || `${BASE}/og/mixxea-og.svg`;
  const cover = release.cover || {};
  const dims = cover.w && cover.h ? ` width="${pages.esc(cover.w)}" height="${pages.esc(cover.h)}"` : '';
  const visual = pages.coverUrl(release, false)
    ? `<img src="${pages.esc(pages.absoluteAsset(pages.coverUrl(release, false)))}" alt="${pages.esc(cover.alt || title)}"${dims} decoding="async">`
    : `<strong>${pages.esc(String(title).slice(0, 2))}</strong>`;
  const tracks = (release.tracks || []).length
    ? `<section class="section"><div class="wrap"><h2>Tracklist</h2><ol class="tracklist">${release.tracks.map((track) => `<li><span>${pages.esc(track.title)}</span>${track.duration ? `<em>${pages.esc(track.duration)}</em>` : ''}</li>`).join('')}</ol></div></section>`
    : '';
  const related = (options.relatedNews || []).length
    ? `<section class="section"><div class="wrap"><h2>Related news</h2><div class="grid-2">${options.relatedNews.map((post) => `<article class="artist-card"><h3><a href="/news/${pages.esc(pages.newsSlug(post))}">${pages.esc(post.title)}</a></h3></article>`).join('')}</div></div></section>`
    : '';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      releaseJsonLd(release, artists),
      breadcrumb([
        { name: 'Home', url: `${BASE}/` },
        { name: 'Releases', url: `${BASE}/releases` },
        { name: title, url: `${BASE}/releases/${slug}` },
      ]),
    ],
  };
  const bits = [release.catNo, release.genre, pages.formatNewsDate(release.date || release.releaseDate)].filter(Boolean);
  const body = `${pages.seoNav('/releases')}
<main>
<section class="hero"><div class="wrap">
  <div class="breadcrumbs"><a href="/">Home</a><span>/</span><a href="/releases">Releases</a><span>/</span><span>${pages.esc(title)}</span></div>
  <div class="hero-grid">
    <div>
      <div class="kicker">${pages.esc(release.label || 'Mixxea Records')}</div>
      <h1 class="article-title">${pages.esc(title)}</h1>
      <p class="lead">${artistLink(release, artists)}</p>
      ${bits.length ? `<p class="article-meta">${bits.map((bit) => pages.esc(bit)).join(' · ')}</p>` : ''}
      <div class="article-body">${renderMarkdown(release.description || '')}</div>
      <div class="actions">${streamButtons(release)}<a class="btn btn-primary" href="/releases">All releases</a></div>
    </div>
    <aside class="hero-card release-cover">${visual}</aside>
  </div>
</div></section>
${tracks}
${related}
</main>
${pages.seoFooter()}`;
  return pages.pageShell({
    title: pageTitle,
    description,
    canonicalPath: `/releases/${slug}`,
    robots: options.preview ? 'noindex, nofollow' : 'index,follow',
    ogType: 'music.album',
    ogImage: image,
    jsonLd,
    body,
  });
}

function renderReleaseIndex(releases, query) {
  const type = String(query.type || '').toLowerCase();
  const genre = String(query.genre || '').toLowerCase();
  let filtered = pages.sortReleases(releases);
  if (type) filtered = filtered.filter((item) => String(item.type || '').toLowerCase() === type);
  if (genre) filtered = filtered.filter((item) => String(item.genre || '').toLowerCase().includes(genre));
  const paged = slicePage(filtered, query.page);
  const cards = paged.items.length
    ? paged.items.map((release) => {
      const href = pages.releaseHref(release);
      const image = pages.coverUrl(release, true);
      const alt = (release.cover && release.cover.alt) || release.title || '';
      return `<article class="artist-card release-card">
        <a href="${pages.esc(href)}">${image ? `<img src="${pages.esc(image)}" alt="${pages.esc(alt)}" loading="lazy" decoding="async">` : `<strong>${pages.esc(String(release.title || '').slice(0, 2))}</strong>`}</a>
        <span class="artist-meta">${pages.esc([release.genre, release.catNo].filter(Boolean).join(' · '))}</span>
        <h3><a href="${pages.esc(href)}">${pages.esc(release.title || 'Release')}</a></h3>
        <p>${pages.esc(release.artist || '')}</p>
      </article>`;
    }).join('')
    : '<p class="section-intro">No releases are public for this filter.</p>';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: 'Releases',
        url: `${BASE}/releases`,
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: paged.items.map((release, index) => ({
            '@type': 'ListItem',
            position: index + 1 + ((paged.current - 1) * PAGE_SIZE),
            url: `${BASE}${pages.releaseHref(release)}`,
            name: release.title,
          })),
        },
      },
      breadcrumb([
        { name: 'Home', url: `${BASE}/` },
        { name: 'Releases', url: `${BASE}/releases` },
      ]),
    ],
  };
  const body = `${pages.seoNav('/releases')}
<main>
<section class="hero"><div class="wrap">
  <div class="breadcrumbs"><a href="/">Home</a><span>/</span><span>Releases</span></div>
  <div class="kicker">Catalogue</div>
  <h1>Releases</h1>
  <p class="lead">Music from Mixxea Records. Open a release for the catalogue details and streaming links.</p>
  <div class="catalog-grid">${cards}</div>
  ${pager('/releases', paged.current, paged.pages)}
</div></section>
</main>
${pages.seoFooter()}`;
  return pages.pageShell({
    title: 'Releases | Mixxea Records',
    description: 'Releases from Mixxea Records, the independent electronic music label.',
    canonicalPath: '/releases',
    jsonLd,
    body,
  });
}

function renderNewsIndex(posts, query) {
  const paged = slicePage(pages.sortNews(posts), query.page);
  const chips = NEWS_CATEGORIES.map((cat) => `<a class="btn btn-secondary" href="/news/category/${cat.slug}">${pages.esc(cat.label)}</a>`).join('');
  const cards = paged.items.length
    ? paged.items.map((post) => {
      const href = '/news/' + pages.newsSlug(post);
      const image = pages.coverUrl(post, true);
      return `<article class="artist-card">
        ${image ? `<a href="${pages.esc(href)}"><img src="${pages.esc(image)}" alt="${pages.esc((post.cover && post.cover.alt) || post.title || '')}" loading="lazy" decoding="async"></a>` : ''}
        <span class="artist-meta">${pages.esc(categoryLabel(post.category))}</span>
        <h3><a href="${pages.esc(href)}">${pages.esc(post.title || 'News')}</a></h3>
        <p>${pages.esc(post.excerpt || markdownToText(post.body).slice(0, 160))}</p>
      </article>`;
    }).join('')
    : '<p class="section-intro">No news is published yet.</p>';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['Blog', 'CollectionPage'],
        name: 'News',
        url: `${BASE}/news`,
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: paged.items.map((post, index) => ({
            '@type': 'ListItem',
            position: index + 1 + ((paged.current - 1) * PAGE_SIZE),
            url: `${BASE}/news/${pages.newsSlug(post)}`,
            name: post.title,
          })),
        },
      },
      breadcrumb([
        { name: 'Home', url: `${BASE}/` },
        { name: 'News', url: `${BASE}/news` },
      ]),
    ],
  };
  const body = `${pages.seoNav('/news')}
<main>
<section class="hero"><div class="wrap">
  <div class="breadcrumbs"><a href="/">Home</a><span>/</span><span>News</span></div>
  <div class="kicker">Editorial</div>
  <h1>News</h1>
  <p class="lead">Release notes, artist news, and label updates from Mixxea Records.</p>
  <div class="actions">${chips}</div>
  <div class="catalog-grid">${cards}</div>
  ${pager('/news', paged.current, paged.pages)}
</div></section>
</main>
${pages.seoFooter()}`;
  return pages.pageShell({
    title: 'News | Mixxea Records',
    description: 'News and editorial from Mixxea Records and Freq Vault.',
    canonicalPath: '/news',
    jsonLd,
    body,
  });
}

function renderNewsCategory(category, posts, query) {
  const paged = slicePage(pages.sortNews(posts), query.page);
  const cards = paged.items.length
    ? paged.items.map((post) => `<article class="artist-card"><span class="artist-meta">${pages.esc(pages.formatNewsDate(post.date || post.publishedAt))}</span><h3><a href="/news/${pages.esc(pages.newsSlug(post))}">${pages.esc(post.title || 'News')}</a></h3><p>${pages.esc(post.excerpt || markdownToText(post.body).slice(0, 160))}</p></article>`).join('')
    : '<p class="section-intro">Nothing is published in this category yet.</p>';
  const path = `/news/category/${category.slug}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: category.label,
        url: `${BASE}${path}`,
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: paged.items.map((post, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: `${BASE}/news/${pages.newsSlug(post)}`,
            name: post.title,
          })),
        },
      },
      breadcrumb([
        { name: 'Home', url: `${BASE}/` },
        { name: 'News', url: `${BASE}/news` },
        { name: category.label, url: `${BASE}${path}` },
      ]),
    ],
  };
  const body = `${pages.seoNav('/news')}
<main>
<section class="hero"><div class="wrap">
  <div class="breadcrumbs"><a href="/">Home</a><span>/</span><a href="/news">News</a><span>/</span><span>${pages.esc(category.label)}</span></div>
  <div class="kicker">News</div>
  <h1>${pages.esc(category.label)}</h1>
  <div class="catalog-grid">${cards}</div>
  ${pager(path, paged.current, paged.pages)}
</div></section>
</main>
${pages.seoFooter()}`;
  return pages.pageShell({
    title: `${category.label} | Mixxea News`,
    description: `${category.label} from Mixxea Records.`,
    canonicalPath: path,
    jsonLd,
    body,
  });
}

module.exports = {
  renderReleasePage,
  renderReleaseIndex,
  renderNewsIndex,
  renderNewsCategory,
  releaseJsonLd,
};
