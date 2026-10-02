/**
 * Shared catalogue markup for the public redesign.
 */

const pages = require('./publicPages');

const PLATFORMS = [
  ['spotify', 'Spotify'],
  ['apple', 'Apple Music'],
  ['beatport', 'Beatport'],
  ['soundcloud', 'SoundCloud'],
  ['bandcamp', 'Bandcamp'],
];

function platformHref(release, key) {
  return pages.safeUrl((release.links && release.links[key]) || release[key]);
}

function filledPlatforms(release) {
  return PLATFORMS.map(([key, label]) => {
    const href = platformHref(release, key);
    return href ? { key, label, href } : null;
  }).filter(Boolean);
}

function catTail(release) {
  const cat = String(release.catNo || '');
  const digits = cat.replace(/\D/g, '');
  return digits ? digits.slice(-3) : '000';
}

function coverFallback(release) {
  return `<div class="ph" role="img" aria-label="Artwork pending for ${pages.esc(release.title || 'release')}"><span class="meta">Mixxea Records</span><b>${pages.esc(catTail(release))}</b><span class="meta acid">Artwork pending</span></div>`;
}

function coverPicture(release, { eager = false, sizes = '(min-width:1024px) 310px, 50vw' } = {}) {
  const full = pages.coverUrl(release, false);
  const thumb = pages.coverUrl(release, true) || full;
  if (!full && !thumb) return coverFallback(release);
  const alt = pages.esc((release.cover && release.cover.alt) || `${release.title || 'Release'} by ${release.artist || 'Mixxea'}, cover artwork`);
  const src = pages.esc(thumb);
  const srcset = [thumb && thumb !== full ? `${pages.esc(thumb)} 600w` : '', full ? `${pages.esc(full)} 1600w` : ''].filter(Boolean).join(', ');
  const load = eager ? 'fetchpriority="high"' : 'loading="lazy"';
  return `<img src="${src}" ${srcset ? `srcset="${srcset}" sizes="${sizes}"` : ''} width="1600" height="1600" alt="${alt}" ${load} decoding="async">`;
}

function releaseCard(release) {
  const href = pages.releaseHref(release);
  const when = pages.formatCatalogueDate(release.date || release.releaseDate);
  const platforms = filledPlatforms(release);
  const links = platforms.map((item) => `<a href="${pages.esc(item.href)}" target="_blank" rel="noopener">${pages.esc(item.label)}</a>`).join('');
  const quick = platforms[0]
    ? `<span class="quick"><a href="${pages.esc(platforms[0].href)}" target="_blank" rel="noopener">▶ ${pages.esc(platforms[0].label)}</a><a href="${pages.esc(href)}">Release page →</a></span>`
    : '';
  return `<article class="rc">
    <a class="cov" href="${pages.esc(href)}">${coverPicture(release)}${quick}</a>
    <div class="row"><span class="meta acid">${pages.esc(release.catNo || '')}</span><time class="meta" datetime="${pages.esc(String(release.date || release.releaseDate || '').slice(0, 10))}">${pages.esc(when)}</time></div>
    <h3><a href="${pages.esc(href)}">${pages.esc(release.title || 'Release')}</a></h3>
    <div class="who">${pages.esc(release.artist || '')}</div>
    <div class="meta" style="margin-top:6px">${pages.esc(release.genre || '')}</div>
    ${links ? `<div class="dsp">${links}</div>` : ''}
  </article>`;
}

function newsCard(post, { featured = false, excerpt = false } = {}) {
  const href = '/news/' + pages.newsSlug(post);
  const image = pages.coverUrl(post, true) || pages.safeUrl(post.image);
  const alt = pages.esc(post.imageAlt || (post.cover && post.cover.alt) || post.title || '');
  const category = pages.esc(post.category || 'News');
  const accent = /agency|freqvault/i.test(String(post.category || '')) ? 'sig' : 'acid';
  const when = pages.formatCatalogueDate(post.date || post.publishedAt || post.createdAt);
  const visual = image
    ? `<img src="${pages.esc(image)}" alt="${alt}" width="800" height="533" loading="lazy" decoding="async">`
    : `<span class="ph" style="aspect-ratio:3/2"><span class="meta ${accent}">${category}</span><b>NEWS</b></span>`;
  const blurb = excerpt ? `<p class="small excerpt">${pages.esc(post.excerpt || '')}</p>` : '';
  return `<a class="nc${featured ? ' featured' : ''}" href="${pages.esc(href)}">
    <span class="pic">${visual}</span>
    <span class="meta ${accent}">${category}${when ? ' · ' + pages.esc(when) : ''}</span>
    <span class="title">${pages.esc(post.title || 'News')}</span>
    ${blurb}
  </a>`;
}

function embedBlock(release) {
  const spotify = platformHref(release, 'spotify');
  const id = (release.embed && release.embed.id) || (String(spotify).match(/track\/([A-Za-z0-9]+)/) || [])[1] || '';
  if (!id) return '';
  const thumb = pages.coverUrl(release, true) || pages.coverUrl(release, false) || '';
  const title = `${release.artist || ''} — ${release.title || ''}`.replace(/^ — | — $/g, '');
  return `<div class="embed" data-embed="spotify" data-src="https://open.spotify.com/embed/track/${pages.esc(id)}" data-h="152">
    ${thumb ? `<img src="${pages.esc(thumb)}" width="96" height="96" alt="">` : ''}
    <div><p class="meta">Spotify</p><p class="t">${pages.esc(title)}</p><p class="small">Press play to load the Spotify player</p></div>
    <button class="play" type="button" aria-label="Load Spotify player for ${pages.esc(title)}">▶</button>
    <a class="fallback" href="${pages.esc(spotify || 'https://open.spotify.com/track/' + id)}" target="_blank" rel="noopener">Open in Spotify ↗</a>
  </div>`;
}

module.exports = {
  PLATFORMS,
  filledPlatforms,
  coverPicture,
  coverFallback,
  releaseCard,
  newsCard,
  embedBlock,
};
