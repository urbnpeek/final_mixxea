/**
 * Homepage asset helpers: responsive image markup and cache-busted script URLs.
 * Original image URLs stay as the <img> fallback. Optimized files are additive.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const variants = require('./imageVariants.json');

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderPicture(url, options = {}) {
  const alt = options.alt || '';
  const style = options.style || '';
  const lazy = options.lazy !== false;
  const variant = variants[url];
  const width = (variant && variant.width) || options.width;
  const height = (variant && variant.height) || options.height;
  const dims = width && height ? ` width="${Number(width)}" height="${Number(height)}"` : '';
  const loading = lazy ? ' loading="lazy"' : '';
  const img = `<img src="${esc(url)}" alt="${esc(alt)}"${dims}${loading} decoding="async"${style ? ` style="${esc(style)}"` : ''}>`;
  if (!variant || !variant.avifSrcset) return img;
  return `<picture style="display:block;width:100%;height:100%">` +
    `<source type="image/avif" srcset="${esc(variant.avifSrcset)}" sizes="${esc(variant.sizes)}">` +
    `<source type="image/webp" srcset="${esc(variant.webpSrcset)}" sizes="${esc(variant.sizes)}">` +
    `${img}</picture>`;
}

function jsVersion(fileName) {
  const filePath = path.join(__dirname, '../../public/js', fileName);
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex').slice(0, 10);
}

function versionScriptUrls(html) {
  return String(html).replace(/\/js\/([A-Za-z0-9._-]+)\.js(?:\?[^"'\\\s]*)?/g, (match, name) => {
    const fileName = `${name}.js`;
    try {
      return `/js/${fileName}?v=${jsVersion(fileName)}`;
    } catch (error) {
      return match;
    }
  });
}

function injectImageVariants(html) {
  const json = JSON.stringify(variants).replace(/</g, '\\u003c');
  return String(html).replace('window.__IMG_VARIANTS = null', `window.__IMG_VARIANTS = ${json}`);
}

function prepareHomeHtml(html) {
  return versionScriptUrls(injectImageVariants(html));
}

module.exports = {
  variants,
  renderPicture,
  prepareHomeHtml,
  versionScriptUrls,
};
