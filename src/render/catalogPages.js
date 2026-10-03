/**
 * Server-rendered /releases and /news catalogue pages.
 */

const pages = require('./publicPages');
const blocks = require('./blocks');
const { canonicalOrigin } = require('../lib/siteUrl');
const { renderMarkdown, markdownToText } = require('../lib/markdown');
const { categoryLabel, publicCategory, categoryAccent } = require('../lib/categories');

const BASE = canonicalOrigin();
const RELEASE_PAGE_SIZE = 24;
const NEWS_PAGE_SIZE = 12;

function pageCount(total, size) {
  return Math.max(1, Math.ceil(total / size));
}

function slicePage(items, page, size) {
  const pagesCount = pageCount(items.length, size);
  const current = Math.min(Math.max(Number(page) || 1, 1), pagesCount);
  const start = (current - 1) * size;
  return { current, pages: pagesCount, items: items.slice(start, start + size) };
}

function withQuery(path, query) {
  const params = new URLSearchParams();
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value != null && value !== '') params.set(key, String(value));
  });
  const text = params.toString();
  return text ? `${path}?${text}` : path;
}

function pager(path, query, current, pagesCount) {
  if (pagesCount < 2) return { html: '', extra: '' };
  const prev = current > 1 ? withQuery(path, { ...query, page: current - 1 }) : '';
  const next = current < pagesCount ? withQuery(path, { ...query, page: current + 1 }) : '';
  const links = [];
  if (prev) links.push(`<a class="btn" href="${pages.esc(prev)}" rel="prev">Previous</a>`);
  links.push(`<span class="meta">Page ${current} of ${pagesCount}</span>`);
  if (next) links.push(`<a class="btn" href="${pages.esc(next)}" rel="next">Next</a>`);
  const extra = [prev ? `<link rel="prev" href="${pages.esc(prev)}">` : '', next ? `<link rel="next" href="${pages.esc(next)}">` : ''].join('');
  return { html: `<div class="pager">${links.join('')}</div>`, extra };
}

function releaseJsonLd(release) {
  const slug = pages.releaseSlug(release);
  const url = `${BASE}/releases/${slug}`;
  const image = pages.absoluteAsset(pages.coverUrl(release, false) || release.artwork || release.ogImage) || `${BASE}/og/mixxea-og.jpg`;
  const byArtist = { '@type': 'MusicGroup', name: release.artist || 'Mixxea' };
  const sameAs = blocks.filledPlatforms(release).map((item) => item.href);
  const description = markdownToText((release.seo && release.seo.description) || release.description || '').slice(0, 160);
  const format = String(release.format || release.type || '').toLowerCase();
  const base = {
    name: release.title,
    url,
    byArtist,
    recordLabel: { '@type': 'Organization', name: 'Mixxea Records' },
    ...(release.date ? { datePublished: release.date } : {}),
    image,
    ...(description ? { description } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
  if (!format || format === 'single') {
    return { '@type': 'MusicRecording', ...base };
  }
  const albumType = { ep: 'EP', album: 'Album', compilation: 'Compilation', remix: 'Remix', remixes: 'Remix' }[format] || 'Album';
  return { '@type': 'MusicAlbum', ...base, albumReleaseType: albumType };
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

function sortCatalogue(releases, sort) {
  const list = [...(Array.isArray(releases) ? releases : [])];
  if (sort === 'date') return pages.sortReleases(list);
  return list.sort((a, b) => String(b.catNo || '').localeCompare(String(a.catNo || ''), undefined, { numeric: true }));
}

function formatLabel(value) {
  const key = String(value || '').trim().toLowerCase();
  const labels = { single: 'Single', ep: 'EP', album: 'Album', remixes: 'Remixes', remix: 'Remix' };
  return labels[key] || value;
}

function renderReleasePage(release, artists, options = {}) {
  const slug = pages.releaseSlug(release);
  const title = release.title || 'Release';
  const seo = release.seo || {};
  const description = String(seo.description || markdownToText(release.description) || `${title} by ${release.artist} on Mixxea Records.`).slice(0, 160);
  const pageTitle = seo.title || `${title} — ${release.artist} | Mixxea Records`;
  const image = pages.absoluteAsset(seo.ogImage || release.ogImage || pages.coverUrl(release, false) || release.artwork) || `${BASE}/og/mixxea-og.jpg`;
  const platforms = blocks.filledPlatforms(release);
  const buttons = platforms.map((item, index) => `<a class="btn ${index === 0 ? 'paper' : ''}" href="${pages.esc(item.href)}" target="_blank" rel="noopener">${pages.esc(item.label)}</a>`).join('');
  const facts = [
    ['Release date', pages.formatCatalogueDate(release.date || release.releaseDate)],
    ['Genre', release.genre],
    ['Label', release.label || 'Mixxea Records'],
    ['Cat. no.', release.catNo],
    (release.format || release.type) ? ['Format', formatLabel(release.format || release.type)] : null,
  ].filter((row) => row && row[1]);
  const related = pages.sortReleases((options.relatedReleases || [])).slice(0, 4);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      releaseJsonLd(release),
      breadcrumb([
        { name: 'Home', url: `${BASE}/` },
        { name: 'Releases', url: `${BASE}/releases` },
        { name: title, url: `${BASE}/releases/${slug}` },
      ]),
    ],
  };
  const body = `${pages.siteNav('/releases')}
<main id="content">
<section class="band"><div class="wrap">
  <p class="crumbs"><a href="/">Home</a> / <a href="/releases">Releases</a> / <span>${pages.esc(title)}</span></p>
  <div class="release-layout">
    <div class="release-cover">${blocks.coverPicture(release, { eager: true, sizes: '(min-width:1024px) 640px, 100vw' })}</div>
    <div class="release-info">
      <p class="meta acid">${pages.esc(release.catNo || '')} · ${pages.esc(release.status || '')}</p>
      <h1 class="d-l">${pages.esc(title)}</h1>
      <p class="h3" style="font-size:36px;margin-top:12px">${pages.esc(release.artist || '')}</p>
      <dl class="dl">${facts.map(([label, value]) => `<dt>${pages.esc(label)}</dt><dd>${pages.esc(value)}</dd>`).join('')}</dl>
      <div class="platforms">${buttons}</div>
      ${blocks.embedBlock(release)}
      ${release.description ? `<div class="a-body" style="margin-top:24px">${renderMarkdown(release.description)}</div>` : ''}
    </div>
  </div>
</div></section>
<section class="band"><div class="wrap">
  <div class="band-head"><h2 class="d-m">Also on Mixxea.</h2><a href="/releases">View all releases →</a></div>
  <div class="rel-grid">${related.map((item) => blocks.releaseCard(item)).join('')}</div>
</div></section>
</main>
${pages.siteFooter()}`;
  return pages.pageShell({
    title: pageTitle,
    description,
    canonicalPath: `/releases/${slug}`,
    robots: options.preview ? 'noindex, nofollow' : 'index,follow',
    ogType: 'music.album',
    ogImage: image,
    extraHead: blocks.coverPreload(release),
    jsonLd,
    body,
  });
}

function renderReleaseIndex(releases, query) {
  const genre = String(query.genre || '');
  const sort = String(query.sort || 'cat');
  const view = String(query.view || '');
  let filtered = sortCatalogue(releases, sort);
  if (genre) filtered = filtered.filter((item) => String(item.genre || '').toLowerCase() === genre.toLowerCase());
  const paged = slicePage(filtered, query.page, RELEASE_PAGE_SIZE);
  const genres = [...new Set((releases || []).map((item) => String(item.genre || '').trim()).filter(Boolean))];
  const chips = [`<a class="chip${!genre ? ' on' : ''}" href="/releases">All</a>`]
    .concat(genres.map((name) => `<a class="chip${name.toLowerCase() === genre.toLowerCase() ? ' on' : ''}" href="${pages.esc(withQuery('/releases', { genre: name, sort, view }))}">${pages.esc(name)}</a>`))
    .join('');
  const rows = paged.items.length
    ? paged.items.map((release) => {
      const href = pages.releaseHref(release);
      const listen = blocks.filledPlatforms(release).map((item) => `<a href="${pages.esc(item.href)}" target="_blank" rel="noopener">${pages.esc(item.label)}</a>`).join(' ');
      const thumb = pages.coverUrl(release, true);
      return `<tr>
        <td>${thumb ? `<img src="${pages.esc(thumb)}" alt="" width="44" height="44">` : ''}</td>
        <td class="meta acid">${pages.esc(release.catNo || '')}</td>
        <td><a href="${pages.esc(href)}">${pages.esc(release.title || '')}</a></td>
        <td>${pages.esc(release.artist || '')}</td>
        <td class="meta">${pages.esc(release.genre || '—')}</td>
        <td><time datetime="${pages.esc(String(release.date || '').slice(0, 10))}">${pages.esc(pages.formatCatalogueDate(release.date || release.releaseDate))}</time></td>
        <td>${listen}</td>
      </tr>`;
    }).join('')
    : '<tr><td colspan="7">No releases on file yet.</td></tr>';
  const grid = paged.items.length
    ? paged.items.map((release, index) => blocks.releaseCard(release).replace('loading="lazy"', index < 4 ? 'loading="lazy"' : 'loading="lazy"')).join('')
    : '<p class="body">No releases on file yet.</p>';
  const queryBase = { genre, sort, view: view || undefined };
  const links = pager('/releases', queryBase, paged.current, paged.pages);
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
            position: index + 1 + ((paged.current - 1) * RELEASE_PAGE_SIZE),
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
  const body = `${pages.siteNav('/releases')}
<main id="content" class="cat ${view === 'grid' ? 'force-grid' : ''} ${view === 'table' ? 'force-table' : ''}">
<section class="band"><div class="wrap">
  <p class="meta">Mixxea Records — Catalogue</p>
  <div class="band-head"><h1 class="d-l">Releases.</h1>
    <span class="view-switch"><a href="${pages.esc(withQuery('/releases', { genre, sort, view: 'table' }))}">Table</a> · <a href="${pages.esc(withQuery('/releases', { genre, sort, view: 'grid' }))}">Grid</a></span>
  </div>
  <div class="chips">${chips}</div>
  <div class="view-table"><table class="rel-table"><thead><tr><th></th><th><a href="${pages.esc(withQuery('/releases', { genre, sort: 'cat', view }))}"${sort === 'cat' ? ' aria-current="true"' : ''}>Cat no.</a></th><th>Title</th><th>Artist</th><th>Genre</th><th><a href="${pages.esc(withQuery('/releases', { genre, sort: 'date', view }))}"${sort === 'date' ? ' aria-current="true"' : ''}>Release date</a></th><th>Listen</th></tr></thead><tbody>${rows}</tbody></table></div>
  <div class="view-grid"><div class="rel-grid">${grid}</div></div>
  ${links.html}
</div></section>
</main>
${pages.siteFooter()}`;
  return pages.pageShell({
    title: 'Releases | Mixxea Records',
    description: 'Releases from Mixxea Records, the independent electronic music label.',
    canonicalPath: query.page > 1 ? `/releases?page=${paged.current}` : '/releases',
    extraHead: links.extra,
    jsonLd,
    body,
  });
}

function clipWords(text, max) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max + 1).replace(/\s+\S*$/, '').trim();
  return `${cut || clean.slice(0, max).trim()}…`;
}

function categoryChips(activeSlug, posts) {
  const seen = new Set();
  const used = [];
  for (const post of posts || []) {
    const cat = publicCategory(post.category);
    if (!cat || seen.has(cat.slug)) continue;
    seen.add(cat.slug);
    used.push(cat);
  }
  used.sort((a, b) => String(a.label).localeCompare(String(b.label)));
  return [`<a class="chip${!activeSlug ? ' on' : ''}" href="/news">All</a>`]
    .concat(used.map((cat) => `<a class="chip${cat.slug === activeSlug ? ' on' : ''}" href="/news/category/${pages.esc(cat.slug)}">${pages.esc(cat.label)}</a>`))
    .join('');
}

function renderNewsIndex(posts, query) {
  const paged = slicePage(pages.sortNews(posts), query.page, NEWS_PAGE_SIZE);
  const [featured, ...rest] = paged.items;
  const featureAccent = featured ? categoryAccent(featured.category) : 'acid';
  const featureWhen = featured ? pages.formatCatalogueDate(featured.date || featured.publishedAt || featured.createdAt) : '';
  const featureImage = featured ? pages.publicImage(pages.coverUrl(featured, false) || featured.image) : '';
  const feature = featured
    ? `<a class="feature" href="/news/${pages.esc(pages.newsSlug(featured))}"><span class="pic">${featureImage ? `<img src="${pages.esc(featureImage)}" alt="${pages.esc(featured.imageAlt || featured.title || '')}" width="1200" height="675">` : `<span class="ph" style="aspect-ratio:16/9"><span class="meta ${featureAccent}">${pages.esc(categoryLabel(featured.category) || 'News')}</span><b>NEWS</b></span>`}</span><span class="txt"><span class="meta ${featureAccent}">${pages.esc([categoryLabel(featured.category), featureWhen].filter(Boolean).join(' · '))}</span><span class="title" style="font-size:30px;display:block;margin-top:12px">${pages.esc(featured.title || '')}</span><span class="body">${pages.esc(clipWords(featured.excerpt || markdownToText(featured.body), 160))}</span></span></a>`
    : '<p class="body">No news is published yet.</p>';
  const cards = rest.map((post) => blocks.newsCard(post, { excerpt: true })).join('');
  const links = pager('/news', {}, paged.current, paged.pages);
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
            position: index + 1 + ((paged.current - 1) * NEWS_PAGE_SIZE),
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
  const body = `${pages.siteNav('/news')}
<main id="content">
<section class="band"><div class="wrap">
  <h1 class="d-l">News.</h1>
  <div class="chips">${categoryChips('', posts)}</div>
  ${feature}
  <div class="news-grid" style="margin-top:var(--s-7)">${cards}</div>
  ${links.html}
</div></section>
</main>
${pages.siteFooter()}`;
  return pages.pageShell({
    title: 'News | Mixxea Records',
    description: 'News from Mixxea Records and FreqVault.',
    canonicalPath: query.page > 1 ? `/news?page=${paged.current}` : '/news',
    extraHead: links.extra,
    jsonLd,
    body,
  });
}

function renderNewsCategory(category, posts, query, allPosts) {
  const paged = slicePage(pages.sortNews(posts), query.page, NEWS_PAGE_SIZE);
  const name = category.name || category.label;
  const description = String(category.description || '').slice(0, 160) || `${name} from Mixxea Records.`;
  const rows = paged.items.length
    ? paged.items.map((post) => {
      const href = '/news/' + pages.newsSlug(post);
      const image = pages.coverUrl(post, true);
      const plain = clipWords(post.excerpt || markdownToText(post.body), 160);
      const accent = categoryAccent(post.category);
      const label = categoryLabel(post.category) || 'News';
      const thumb = image
        ? `<img src="${pages.esc(image)}" alt="${pages.esc(post.imageAlt || post.title || '')}" width="240" height="135" loading="lazy">`
        : `<span class="ph pic"><span class="meta ${accent}">${pages.esc(label)}</span><b>NEWS</b></span>`;
      return `<article class="list-row"><a href="${pages.esc(href)}">${thumb}</a><div><h2 class="title"><a href="${pages.esc(href)}">${pages.esc(post.title || 'News')}</a></h2><p class="body">${pages.esc(plain)}</p><p class="meta">${pages.esc([pages.formatCatalogueDate(post.date || post.publishedAt), post.author].filter(Boolean).join(' · '))}</p></div></article>`;
    }).join('')
    : `<p class="body">Nothing in ${pages.esc(name)} yet. <a href="/news">All news</a></p>`;
  const path = `/news/category/${category.slug}`;
  const links = pager(path, {}, paged.current, paged.pages);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name,
        url: `${BASE}${path}`,
        description,
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
        { name, url: `${BASE}${path}` },
      ]),
    ],
  };
  const body = `${pages.siteNav('/news')}
<main id="content">
<section class="band"><div class="wrap">
  <p class="crumbs"><a href="/news">News</a> / <span>${pages.esc(name)}</span></p>
  <h1 class="d-l">${pages.esc(name)}<span style="color:${category.accent === 'agency' ? 'var(--fv-signal-text)' : 'var(--mx-acid)'}">.</span></h1>
  ${category.description ? `<p class="body-l">${pages.esc(description)}</p>` : ''}
  <div class="chips">${categoryChips(category.slug, allPosts || posts)}</div>
  ${rows}
  ${links.html}
</div></section>
</main>
${pages.siteFooter()}`;
  return pages.pageShell({
    title: `${name} | Mixxea News`,
    description,
    canonicalPath: query.page > 1 ? `${path}?page=${paged.current}` : path,
    robots: posts.length ? 'index,follow' : 'noindex,follow',
    extraHead: links.extra,
    jsonLd,
    body,
  });
}

function renderPortal() {
  const body = `${pages.siteNav('/portal')}
<main id="content">
<section class="band"><div class="wrap" style="max-width:640px">
  <h1 class="d-m">Artist login</h1>
  <form class="portal-form" id="portal-login" method="post" action="/api/auth/artist/login">
    <label>Email<input type="email" name="email" required autocomplete="username"></label>
    <label>Password<input type="password" name="password" required autocomplete="current-password"></label>
    <button class="btn acid" type="submit" style="margin-top:20px">Log in</button>
    <p class="note" data-portal-status></p>
  </form>
</div></section>
</main>
${pages.siteFooter()}`;
  return pages.pageShell({
    title: 'Artist login | Mixxea Records',
    description: 'Artist login for Mixxea Records.',
    canonicalPath: '/portal',
    robots: 'noindex,follow',
    body,
  });
}

module.exports = {
  renderReleasePage,
  renderReleaseIndex,
  renderNewsIndex,
  renderNewsCategory,
  renderPortal,
  releaseJsonLd,
};
