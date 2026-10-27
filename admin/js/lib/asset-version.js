/* Cache-busting helper. The site appends ?v=YYYYMMDD to CSS/JS URLs and the
 * .htaccess marks those files immutable, so the stamp must change on deploy. */

export function assetStamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

export function bumpAssetVersions(html, stamp = assetStamp()) {
  let count = 0;
  const output = String(html || '').replace(/(\?|&amp;|&)v=(\d{6,12})\b/g, (match, separator) => {
    count += 1;
    return separator + 'v=' + stamp;
  });
  return { html: output, count };
}

export function findAssetVersions(html) {
  const versions = new Set();
  const regex = /[?&](?:amp;)?v=(\d{6,12})\b/g;
  let match;
  while ((match = regex.exec(String(html || '')))) versions.add(match[1]);
  return [...versions];
}

/** Files worth cache-busting when styles/scripts change. */
export function isCacheableSource(repoPath) {
  return /\.(css|js|woff2?|png|jpe?g|webp|svg)$/i.test(String(repoPath || ''));
}
