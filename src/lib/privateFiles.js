/**
 * Private storage for demo audio and contract files.
 * Vercel Blob uses access: 'private' (supported by @vercel/blob 2.3.3).
 * Without a Blob token, files are written outside public/ and served only
 * through an authenticated route.
 */
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

const PRIVATE_ROOT = path.resolve(__dirname, '../../data/private-uploads');

function isPublicBlobUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' && url.hostname.endsWith('.public.blob.vercel-storage.com');
  } catch (error) {
    return false;
  }
}

function isPrivateBlobUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' && url.hostname.endsWith('.private.blob.vercel-storage.com');
  } catch (error) {
    return false;
  }
}

function pathnameFromBlobUrl(value) {
  const url = new URL(String(value));
  return decodeURIComponent(url.pathname.replace(/^\/+/, ''));
}

function privateDestination(pathname) {
  const clean = String(pathname || '').replace(/^\/+/, '');
  if (clean.startsWith('private/')) return clean;
  return `private/${clean}`;
}

function isLocalPublicPath(value) {
  const text = String(value || '');
  return text.startsWith('/uploads/') && !text.includes('..');
}

function planPrivateMigration({ demos = [], contracts = [] } = {}) {
  const items = [];
  function push(collection, record) {
    const file = record && record.file;
    if (!file || !record.id) return;
    if (isPublicBlobUrl(file)) {
      const pathname = pathnameFromBlobUrl(file);
      items.push({
        collection,
        id: record.id,
        kind: 'blob',
        from: file,
        pathname: privateDestination(pathname),
      });
      return;
    }
    if (isLocalPublicPath(file)) {
      items.push({
        collection,
        id: record.id,
        kind: 'local',
        from: file,
        pathname: privateDestination(file.replace(/^\/uploads\//, '')),
      });
    }
  }
  demos.forEach((record) => push('demos', record));
  contracts.forEach((record) => push('contracts', record));
  return items;
}

function applyCopiedUrl(records, item, nextUrl) {
  return (records || []).map((record) => (
    record && record.id === item.id ? { ...record, file: nextUrl } : record
  ));
}

function clientFileHref(record, downloadPath) {
  if (!record || !record.file) return '';
  return downloadPath;
}

function presentRecord(record, downloadPath) {
  if (!record || typeof record !== 'object') return record;
  const copy = { ...record };
  if (copy.file) copy.file = downloadPath;
  return copy;
}

function localPrivateRef(relativePath) {
  return `private:${String(relativePath || '').replace(/^\/+/, '')}`;
}

function resolveLocalPrivate(stored) {
  const rel = String(stored || '').slice('private:'.length).replace(/^\/+/, '');
  if (!rel || rel.includes('..') || path.isAbsolute(rel)) return '';
  const root = PRIVATE_ROOT;
  const full = path.resolve(root, rel);
  if (full !== root && !full.startsWith(root + path.sep)) return '';
  return full;
}

function storePrivateLocal(relativePath, buffer) {
  const ref = localPrivateRef(relativePath);
  const full = resolveLocalPrivate(ref);
  if (!full) throw new Error('Invalid private path');
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, buffer);
  return ref;
}

function contentTypeFor(stored) {
  const ext = path.extname(String(stored || '').split('?')[0]).toLowerCase();
  const types = {
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.aiff': 'audio/aiff',
    '.aif': 'audio/aiff',
    '.flac': 'audio/flac',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
  };
  return types[ext] || 'application/octet-stream';
}

async function sendStoredFile(res, stored) {
  const value = String(stored || '');
  if (!value) {
    res.status(404).json({ error: 'No file' });
    return;
  }
  res.set('Cache-Control', 'private, no-store');
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Robots-Tag', 'noindex, nofollow');

  if (value.startsWith('private:') || isLocalPublicPath(value)) {
    const full = value.startsWith('private:')
      ? resolveLocalPrivate(value)
      : path.resolve(__dirname, '../../public', value.replace(/^\/+/, ''));
    const allowed = value.startsWith('private:')
      ? full
      : (full.startsWith(path.resolve(__dirname, '../../public/uploads') + path.sep) ? full : '');
    if (!allowed || !fs.existsSync(allowed) || !fs.statSync(allowed).isFile()) {
      res.status(404).json({ error: 'File not found' });
      return;
    }
    res.set('Content-Type', contentTypeFor(allowed));
    fs.createReadStream(allowed).pipe(res);
    return;
  }

  const access = isPrivateBlobUrl(value) ? 'private' : (isPublicBlobUrl(value) ? 'public' : '');
  if (!access) {
    res.status(404).json({ error: 'File not found' });
    return;
  }
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    res.status(404).json({ error: 'File not found' });
    return;
  }
  const { get } = require('@vercel/blob');
  const result = await get(value, { access, token });
  if (!result || !result.stream) {
    res.status(404).json({ error: 'File not found' });
    return;
  }
  res.set('Content-Type', (result.blob && result.blob.contentType) || contentTypeFor(value));
  Readable.fromWeb(result.stream).pipe(res);
}

module.exports = {
  PRIVATE_ROOT,
  isPublicBlobUrl,
  isPrivateBlobUrl,
  pathnameFromBlobUrl,
  privateDestination,
  planPrivateMigration,
  applyCopiedUrl,
  clientFileHref,
  presentRecord,
  localPrivateRef,
  resolveLocalPrivate,
  storePrivateLocal,
  sendStoredFile,
};
