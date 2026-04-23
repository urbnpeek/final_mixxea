/**
 * upload.js — File upload helper
 * Production: Vercel Blob (requires BLOB_READ_WRITE_TOKEN env var)
 * Dev fallback: local path string (file not actually saved — dev only)
 */

const path = require('path');
const { v4: uuid } = require('uuid');

async function uploadFile(file, folder) {
  if (!file) return '';

  const ext = path.extname(file.originalname || '').toLowerCase();
  const filename = `${folder}/${uuid()}${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = require('@vercel/blob');
    const { url } = await put(filename, file.buffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: file.mimetype
    });
    return url;
  }

  // Local dev — return a path (file won't persist but won't crash)
  return `/uploads/${filename}`;
}

module.exports = { uploadFile };
