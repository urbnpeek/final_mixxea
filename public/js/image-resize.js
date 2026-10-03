/**
 * Resize covers in the browser before upload.
 * Cover 1600px WebP ≤250KB, thumb 600px WebP ≤80KB, OG 1200×630 JPEG ≤200KB.
 */
(function () {
  function blobFrom(canvas, type, quality) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), type, quality);
    });
  }

  async function draw(file, width, height, cover) {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const scale = cover
      ? Math.max(width / bitmap.width, height / bitmap.height)
      : Math.min(width / bitmap.width, height / bitmap.height, 1);
    const dw = bitmap.width * scale;
    const dh = bitmap.height * scale;
    const dx = (width - dw) / 2;
    const dy = (height - dh) / 2;
    ctx.fillStyle = '#02020a';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, dx, dy, dw, dh);
    if (bitmap.close) bitmap.close();
    return canvas;
  }

  function fittedSize(width, height, maxEdge) {
    const scale = Math.min(1, maxEdge / Math.max(width, height));
    return {
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale)),
    };
  }

  async function encode(canvas, type, maxBytes) {
    let quality = type === 'image/jpeg' ? 0.82 : 0.8;
    let blob = await blobFrom(canvas, type, quality);
    if (!blob) {
      blob = await blobFrom(canvas, 'image/jpeg', quality);
      type = 'image/jpeg';
    }
    while (blob && blob.size > maxBytes && quality > 0.4) {
      quality -= 0.08;
      blob = await blobFrom(canvas, type, quality);
    }
    return blob;
  }

  async function prepareReleaseImages(file) {
    const probe = await createImageBitmap(file);
    const size = fittedSize(probe.width, probe.height, 1600);
    const thumb = fittedSize(probe.width, probe.height, 600);
    if (probe.close) probe.close();
    const coverCanvas = await draw(file, size.width, size.height, false);
    const thumbCanvas = await draw(file, thumb.width, thumb.height, false);
    const ogCanvas = await draw(file, 1200, 630, true);
    const cover = await encode(coverCanvas, 'image/webp', 250 * 1024);
    const thumbBlob = await encode(thumbCanvas, 'image/webp', 80 * 1024);
    const og = await encode(ogCanvas, 'image/jpeg', 200 * 1024);
    return {
      cover,
      thumb: thumbBlob,
      og,
      w: size.width,
      h: size.height,
    };
  }

  window.prepareReleaseImages = prepareReleaseImages;
})();
