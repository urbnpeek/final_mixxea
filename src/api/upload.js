/**
 * upload.js — File upload helper
 * Production: Vercel Blob (requires BLOB_READ_WRITE_TOKEN env var)
 * Dev fallback: local path string (file not actually saved — dev only)
 */

const fs = require('fs');
const path = require('path');
const { v4: uuid } = require('uuid');
const { storePrivateLocal } = require('../lib/privateFiles');

async function uploadFile(file, folder, options = {}) {
  if (!file) return '';

  const access = options.access === 'private' ? 'private' : 'public';
  const ext = path.extname(file.originalname || '').toLowerCase();
  const filename = `${folder}/${uuid()}${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = require('@vercel/blob');
    const { url } = await put(filename, file.buffer, {
      access,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: file.mimetype
    });
    console.log('[UPLOAD] Blob upload ok:', access, url);
    return url;
  }

  // In production without Blob token, log clearly and return empty so it's obvious
  if (process.env.NODE_ENV === 'production') {
    console.error('[UPLOAD] BLOB_READ_WRITE_TOKEN not set — file upload skipped');
    return '';
  }

  if (access === 'private') {
    try {
      const ref = storePrivateLocal(filename, file.buffer);
      console.log('[UPLOAD] Private local file saved');
      return ref;
    } catch (error) {
      console.error('[UPLOAD] Failed to save private file:', error.message);
      return '';
    }
  }

  // Local dev fallback for public assets (artwork, news): public uploads folder.
  const uploadDir = path.join(__dirname, '../../public/uploads', folder);
  const targetPath = path.join(uploadDir, path.basename(filename));

  try {
    fs.mkdirSync(uploadDir, { recursive: true });
    fs.writeFileSync(targetPath, file.buffer);
    console.log('[UPLOAD] Local file saved:', `/uploads/${filename}`);
    return `/uploads/${filename}`;
  } catch (error) {
    console.error('[UPLOAD] Failed to save local file:', error.message);
    return '';
  }
}

module.exports = { uploadFile };
