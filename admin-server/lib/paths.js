/* Repository path + upload validation. Runtime-agnostic (Node + Workers). */

export const MAX_PATH_LENGTH = 512;
export const MAX_SEGMENT_LENGTH = 160;

export const ALLOWED_UPLOAD_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.avif', '.ico', '.bmp',
  '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.csv',
  '.txt', '.md', '.html', '.htm', '.css', '.js', '.json', '.xml', '.webmanifest',
  '.zip', '.rar', '.7z', '.epub',
  '.mp3', '.mp4', '.webm', '.wav', '.ogg',
  '.woff', '.woff2', '.ttf', '.otf'
]);

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;

/**
 * Normalise a repo-relative path and reject anything that could escape the
 * repository or confuse the GitHub API. Returns null when invalid.
 */
export function normalizeRepoPath(input) {
  if (typeof input !== 'string') return null;
  let p = input.trim().replace(/\\/g, '/');
  if (!p || p.length > MAX_PATH_LENGTH) return null;
  if (CONTROL_CHARS.test(p)) return null;
  if (p.startsWith('/')) p = p.slice(1);
  if (p.endsWith('/')) p = p.slice(0, -1);
  if (!p) return null;

  const segments = p.split('/');
  if (!segments.length) return null;
  for (const segment of segments) {
    if (!segment || segment === '.' || segment === '..') return null;
    if (segment.length > MAX_SEGMENT_LENGTH) return null;
    if (segment.toLowerCase() === '.git') return null;
    if (segment.startsWith('.git')) return null;
    if (WINDOWS_RESERVED.test(segment)) return null;
  }
  return segments.join('/');
}

export function extensionOf(repoPath) {
  const name = String(repoPath || '').split('/').pop() || '';
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return '';
  return name.slice(dot).toLowerCase();
}

export function isAllowedUploadName(repoPath) {
  return ALLOWED_UPLOAD_EXTENSIONS.has(extensionOf(repoPath));
}

export function baseName(repoPath) {
  return String(repoPath || '').split('/').pop() || '';
}

export function dirName(repoPath) {
  const parts = String(repoPath || '').split('/');
  parts.pop();
  return parts.join('/');
}

/** Slug used for uploaded files: keeps unicode letters, removes URL-hostile characters. */
export function slugifyFileName(fileName, fallback = 'file') {
  const name = String(fileName || '').replace(/\\/g, '/').split('/').pop() || '';
  const dot = name.lastIndexOf('.');
  const hasExt = dot > 0;
  const ext = hasExt ? name.slice(dot).toLowerCase() : '';
  const stemRaw = hasExt ? name.slice(0, dot) : name;
  let stem = stemRaw
    .normalize('NFKC')
    .replace(/[’'"()]/g, '')
    .replace(/[^\p{L}\p{M}\p{N}._@+-]+/gu, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '');
  if (!stem) stem = fallback;
  if (stem.length > 80) stem = stem.slice(0, 80).replace(/[-.]+$/, '');
  const safeExt = ext.replace(/[^a-z0-9.]/g, '');
  return stem + safeExt;
}

export function guessContentType(repoPath) {
  switch (extensionOf(repoPath)) {
    case '.html': case '.htm': return 'text/html; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.js': case '.mjs': return 'text/javascript; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.webmanifest': return 'application/manifest+json; charset=utf-8';
    case '.xml': case '.svg': return 'application/xml; charset=utf-8';
    case '.txt': case '.md': return 'text/plain; charset=utf-8';
    case '.csv': return 'text/csv; charset=utf-8';
    case '.png': return 'image/png';
    case '.jpg': case '.jpeg': return 'image/jpeg';
    case '.webp': return 'image/webp';
    case '.gif': return 'image/gif';
    case '.avif': return 'image/avif';
    case '.bmp': return 'image/bmp';
    case '.ico': return 'image/x-icon';
    case '.pdf': return 'application/pdf';
    case '.zip': return 'application/zip';
    case '.rar': return 'application/vnd.rar';
    case '.7z': return 'application/x-7z-compressed';
    case '.epub': return 'application/epub+zip';
    case '.mp3': return 'audio/mpeg';
    case '.wav': return 'audio/wav';
    case '.ogg': return 'audio/ogg';
    case '.mp4': return 'video/mp4';
    case '.webm': return 'video/webm';
    case '.woff': return 'font/woff';
    case '.woff2': return 'font/woff2';
    case '.ttf': return 'font/ttf';
    case '.otf': return 'font/otf';
    case '.doc': return 'application/msword';
    case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.xls': return 'application/vnd.ms-excel';
    case '.xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case '.ppt': return 'application/vnd.ms-powerpoint';
    case '.pptx': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    default: return 'application/octet-stream';
  }
}

/** Public URL for a repository file (used by the uploader + file browser). */
export function publicUrlFor(siteUrl, repoPath) {
  const base = String(siteUrl || '').replace(/\/+$/, '');
  const encoded = String(repoPath || '')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return base + '/' + encoded;
}

/** Files the admin API must never serve or write. */
export function isForbiddenRepoPath(repoPath) {
  const p = String(repoPath || '').toLowerCase();
  return (
    p === '.env' || p.endsWith('/.env') ||
    p.startsWith('.git/') || p === '.git' ||
    p.startsWith('admin-server/') || p === 'admin-server' ||
    p.startsWith('node_modules/') ||
    p.includes('/node_modules/') ||
    p.startsWith('.arena/')
  );
}
