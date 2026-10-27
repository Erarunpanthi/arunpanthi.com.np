/* Cache-busting helper for the admin SPA.
 * .htaccess marks CSS/JS immutable, so every publish that changes a script or
 * stylesheet should also bump the ?v=YYYYMMDD stamp on the pages that load it. */

import { assetStamp, bumpAssetVersions } from './asset-version.js';
import { stagedFor } from '../store.js';

function basename(path) {
  return String(path || '').split('/').pop();
}

function references(html, path) {
  const name = basename(path);
  return !!name && String(html || '').includes(name);
}

/**
 * Stages cache-bumped copies of every candidate page that loads `targetPath`.
 * Returns the list of paths that were staged.
 */
export async function stageDependents({ targetPath, candidates, getFile, stage, stamp = assetStamp() }) {
  const changed = [];
  for (const candidate of candidates) {
    if (!candidate || candidate === targetPath) continue;
    try {
      const existing = stagedFor(candidate);
      const text = existing?.text !== undefined ? existing.text : (await getFile(candidate)).text;
      if (!references(text, targetPath)) continue;
      const next = bumpAssetVersions(text, stamp);
      if (!next.count || next.html === text) continue;
      if (next.html === (existing?.text ?? '')) {
        continue;
      }
      stage({
        path: candidate,
        text: next.html,
        originalText: existing ? existing.originalText : text,
        size: next.html.length
      });
      changed.push(candidate);
    } catch {
      /* a missing dependent page must never block the main save */
    }
  }
  return changed;
}

/** Pages that are likely to load a given asset. */
export function defaultCandidates() {
  return ['index.html'];
}
