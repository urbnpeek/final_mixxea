const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.resolve(__dirname, '../../public');

function publicDetailPath(folder, slug) {
  const safeFolder = String(folder || '').trim();
  const safeSlug = String(slug || '').trim();
  if (!/^[a-z0-9-]+$/i.test(safeFolder) || !/^[a-z0-9-]+$/i.test(safeSlug)) return '';
  const file = path.resolve(PUBLIC_DIR, safeFolder, safeSlug, 'index.html');
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return '';
  return file;
}

function publicDetailExists(folder, slug) {
  const file = publicDetailPath(folder, slug);
  return Boolean(file && fs.existsSync(file));
}

module.exports = { publicDetailPath, publicDetailExists };
