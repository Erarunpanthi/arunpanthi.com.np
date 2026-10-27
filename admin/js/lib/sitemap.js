/* Canonical extraction + sitemap.xml generation. */

import { decodeEntities } from './html-text.js';

export function extractCanonical(html) {
  const source = String(html || '');
  const patterns = [
    /<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i,
    /<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(source);
    if (match) return decodeEntities(match[1]).trim();
  }
  return null;
}

export function parseSitemap(xml) {
  const entries = [];
  const regex = /<url>([\s\S]*?)<\/url>/gi;
  let match;
  while ((match = regex.exec(xml || ''))) {
    const block = match[1];
    const value = (tag) => {
      const found = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i').exec(block);
      return found ? decodeEntities(found[1]).trim() : '';
    };
    const loc = value('loc');
    if (!loc) continue;
    entries.push({
      loc,
      lastmod: value('lastmod'),
      changefreq: value('changefreq'),
      priority: value('priority')
    });
  }
  return entries;
}

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildSitemap(entries) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ''
  ];
  for (const entry of entries) {
    lines.push('  <url>');
    lines.push(`    <loc>${escapeXml(entry.loc)}</loc>`);
    if (entry.lastmod) lines.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`);
    if (entry.changefreq) lines.push(`    <changefreq>${escapeXml(entry.changefreq)}</changefreq>`);
    if (entry.priority) lines.push(`    <priority>${escapeXml(entry.priority)}</priority>`);
    lines.push('  </url>');
  }
  lines.push('', '</urlset>', '');
  return lines.join('\n');
}

function todayIso(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/** Loose key used only for matching URLs (not for output). */
export function normalizeLoc(loc) {
  try {
    const url = new URL(loc);
    let pathname = url.pathname.replace(/\/+$/, '');
    pathname = pathname.replace(/\/index\.html?$/i, '').replace(/\.html?$/i, '');
    return (url.host + pathname).toLowerCase();
  } catch {
    return String(loc || '').toLowerCase().replace(/\/+$/, '').replace(/\.html?$/, '');
  }
}

function isHomepage(loc) {
  try {
    const url = new URL(loc);
    return url.pathname === '/' || url.pathname === '';
  } catch {
    return false;
  }
}

/**
 * Adds canonical URLs that are missing from sitemap.xml while preserving every
 * existing entry (and its lastmod/changefreq/priority) as-is.
 *
 * pages: [{ path, canonical }]
 * removeMissing: drop entries whose page no longer exists.
 */
export function generateSitemap(pages, existingXml, { today = new Date(), removeMissing = false } = {}) {
  const existing = parseSitemap(existingXml);
  const existingKeys = new Set(existing.map((entry) => normalizeLoc(entry.loc)));
  const pageKeys = new Set();
  const additions = [];

  for (const page of pages) {
    if (!page.canonical) continue;
    if (/\/admin(\/|$)/i.test(page.path || '')) continue;
    if (/^404\.html$/i.test(page.path || '')) continue;
    const key = normalizeLoc(page.canonical);
    if (pageKeys.has(key)) continue;
    pageKeys.add(key);
    if (existingKeys.has(key)) continue;

    const depth = String(page.path || '').split('/').filter(Boolean).length;
    const home = isHomepage(page.canonical);
    additions.push({
      loc: page.canonical,
      lastmod: todayIso(today),
      changefreq: home ? 'daily' : 'weekly',
      priority: home ? '1.0' : depth <= 1 ? '0.9' : '0.8'
    });
  }

  const missing = existing.filter((entry) => !pageKeys.has(normalizeLoc(entry.loc)));
  const kept = removeMissing ? existing.filter((entry) => pageKeys.has(normalizeLoc(entry.loc))) : existing;

  additions.sort((a, b) => {
    if (isHomepage(a.loc) !== isHomepage(b.loc)) return isHomepage(a.loc) ? -1 : 1;
    if (Number(b.priority) !== Number(a.priority)) return Number(b.priority) - Number(a.priority);
    return a.loc.localeCompare(b.loc);
  });

  const entries = [...kept, ...additions];

  return {
    xml: buildSitemap(entries),
    total: entries.length,
    added: additions.map((entry) => entry.loc),
    removed: missing.map((entry) => entry.loc)
  };
}
