/* Client-side image resizing so uploads do not bloat the repository. */

const OPTIMIZABLE = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function isOptimizableImage(file) {
  return OPTIMIZABLE.has(file.type);
}

export async function optimizeImage(file, { maxWidth = 1800, maxHeight = 1800, quality = 0.88, minBytes = 200 * 1024 } = {}) {
  if (!isOptimizableImage(file) || file.size < minBytes) {
    return { blob: file, changed: false, reason: 'small-or-unsupported' };
  }
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') {
    return { blob: file, changed: false, reason: 'unsupported' };
  }

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { blob: file, changed: false, reason: 'decode-failed' };
  }

  const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
  if (scale > 0.999 && file.size < 1.2 * 1024 * 1024) {
    bitmap.close?.();
    return { blob: file, changed: false, reason: 'already-small' };
  }

  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, file.type, quality));
  if (!blob || blob.size >= file.size) {
    return { blob: file, changed: false, reason: 'no-gain', width: bitmap.width, height: bitmap.height };
  }
  return {
    blob,
    changed: true,
    width,
    height,
    originalWidth: bitmap.width,
    originalHeight: bitmap.height,
    originalBytes: file.size,
    bytes: blob.size
  };
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

export function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error || new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Could not read file'));
    reader.readAsText(file);
  });
}
