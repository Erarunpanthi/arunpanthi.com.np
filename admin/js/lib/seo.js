/* Read and patch SEO <head> tags without disturbing the rest of a page. */

import { decodeEntities } from './html-text.js';

export const SEO_FIELDS = [
  { key: 'title', label: 'Page title', attr: 'title', max: 70, hint: 'Shown in search results and browser tabs (30–65 characters is ideal).' },
  { key: 'description', label: 'Meta description', attr: 'name', name: 'description', max: 180, hint: 'The snippet under the title (70–160 characters).' },
  { key: 'keywords', label: 'Keywords', attr: 'name', name: 'keywords', max: 500, hint: 'Comma separated. Low weight for Google but harmless.' },
  { key: 'robots', label: 'Robots', attr: 'name', name: 'robots', max: 100, hint: 'Usually "index, follow".' },
  { key: 'canonical', label: 'Canonical URL', attr: 'canonical', max: 300, hint: 'Absolute URL of this page.' },
  { key: 'ogTitle', label: 'og:title', attr: 'property', name: 'og:title', max: 100 },
  { key: 'ogDescription', label: 'og:description', attr: 'property', name: 'og:description', max: 200 },
  { key: 'ogImage', label: 'og:image', attr: 'property', name: 'og:image', max: 500 },
  { key: 'ogUrl', label: 'og:url', attr: 'property', name: 'og:url', max: 300 },
  { key: 'ogType', label: 'og:type', attr: 'property', name: 'og:type', max: 50 },
  { key: 'ogSiteName', label: 'og:site_name', attr: 'property', name: 'og:site_name', max: 100 },
  { key: 'twitterCard', label: 'twitter:card', attr: 'name', name: 'twitter:card', max: 50 },
  { key: 'twitterTitle', label: 'twitter:title', attr: 'name', name: 'twitter:title', max: 100 },
  { key: 'twitterDescription', label: 'twitter:description', attr: 'name', name: 'twitter:description', max: 200 },
  { key: 'twitterImage', label: 'twitter:image', attr: 'name', name: 'twitter:image', max: 500 }
];

function escapeAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function parseAttributes(source) {
  const attrs = {};
  const regex = /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let match;
  while ((match = regex.exec(source))) {
    attrs[match[1].toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attrs;
}

function iterateMetaTags(html) {
  const tags = [];
  const regex = /<meta\b[^>]*>/gi;
  let match;
  while ((match = regex.exec(html))) {
    const attrs = parseAttributes(match[0].slice(5, -1));
    tags.push({ start: match.index, end: match.index + match[0].length, text: match[0], attrs });
  }
  return tags;
}

function findMeta(html, attr, key) {
  return iterateMetaTags(html).find((tag) => {
    if (attr === 'name') return String(tag.attrs.name || '').toLowerCase() === key.toLowerCase();
    if (attr === 'property') return String(tag.attrs.property || '').toLowerCase() === key.toLowerCase();
    return false;
  });
}

/** Reads the SEO head fields from an HTML document. */
export function parseSeo(html) {
  const source = String(html || '');
  const titleMatch = /<title>([\s\S]*?)<\/title>/i.exec(source);
  const canonicalMatch = /<link\b[^>]*rel=["']canonical["'][^>]*>/i.exec(source);
  const canonicalAttrs = canonicalMatch ? parseAttributes(canonicalMatch[0].slice(5, -1)) : {};

  const values = {
    title: titleMatch ? decodeEntities(titleMatch[1]).trim() : '',
    canonical: canonicalAttrs.href || ''
  };
  for (const field of SEO_FIELDS) {
    if (field.attr === 'title' || field.attr === 'canonical') continue;
    const tag = findMeta(source, field.attr, field.name);
    values[field.key] = tag ? tag.attrs.content || '' : '';
  }
  return values;
}

function setMetaContent(html, attr, key, value) {
  const tag = findMeta(html, attr, key);
  const text = String(value ?? '').trim();

  if (tag) {
    if (!text) {
      let start = tag.start;
      while (start > 0 && /\s/.test(html[start - 1])) start -= 1;
      return html.slice(0, start) + html.slice(tag.end);
    }
    const contentRegex = /\bcontent\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i;
    const match = contentRegex.exec(tag.text);
    if (match) {
      const attrStart = tag.start + match.index;
      const attrEnd = attrStart + match[0].length;
      return html.slice(0, attrStart) + `content="${escapeAttr(text)}"` + html.slice(attrEnd);
    }
    const insertAt = tag.end - (tag.text.endsWith('/>') ? 2 : 1);
    return html.slice(0, insertAt) + ` content="${escapeAttr(text)}"` + html.slice(insertAt);
  }

  if (!text) return html;
  const tagText = `<meta ${attr}="${escapeAttr(key)}" content="${escapeAttr(text)}">`;
  const headEnd = html.search(/<\/head>/i);
  if (headEnd < 0) return html;
  const lineStart = html.lastIndexOf('\n', headEnd) + 1;
  const indent = /^[ \t]*/.exec(html.slice(lineStart, headEnd))?.[0] || '    ';
  return html.slice(0, lineStart) + indent + tagText + '\n' + html.slice(lineStart);
}

export function setSeoField(html, fieldKey, value) {
  const field = SEO_FIELDS.find((item) => item.key === fieldKey);
  if (!field) throw new Error('Unknown SEO field: ' + fieldKey);

  if (fieldKey === 'title') {
    const text = String(value ?? '').trim();
    if (/<title>[\s\S]*?<\/title>/i.test(html)) {
      if (!text) return html.replace(/<title>[\s\S]*?<\/title>\s*/i, '');
      return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeAttr(text).replace(/&quot;/g, '"')}</title>`);
    }
    if (!text) return html;
    return html.replace(/<\/head>/i, `  <title>${escapeAttr(text).replace(/&quot;/g, '"')}</title>\n</head>`);
  }

  if (fieldKey === 'canonical') {
    const text = String(value ?? '').trim();
    const match = /<link\b[^>]*rel=["']canonical["'][^>]*>/i.exec(html);
    if (match) {
      if (!text) {
        let start = match.index;
        while (start > 0 && /[ \t]/.test(html[start - 1])) start -= 1;
        return html.slice(0, start) + html.slice(match.index + match[0].length);
      }
      return html.slice(0, match.index) + `<link rel="canonical" href="${escapeAttr(text)}" />` + html.slice(match.index + match[0].length);
    }
    if (!text) return html;
    return html.replace(/<\/head>/i, `  <link rel="canonical" href="${escapeAttr(text)}" />\n</head>`);
  }

  return setMetaContent(html, field.attr, field.name, value);
}

export function validateSeo(values, { pagePath = '' } = {}) {
  const issues = [];
  const title = String(values.title || '').trim();
  const description = String(values.description || '').trim();
  if (!title) issues.push({ level: 'error', field: 'title', message: 'Missing page title' });
  else if (title.length > 70) issues.push({ level: 'warn', field: 'title', message: `Title is ${title.length} characters (70 max)` });
  else if (title.length < 25) issues.push({ level: 'warn', field: 'title', message: `Title is short (${title.length} characters)` });

  if (!description) issues.push({ level: 'warn', field: 'description', message: 'Missing meta description' });
  else if (description.length > 180) issues.push({ level: 'warn', field: 'description', message: `Description is ${description.length} characters (180 max)` });
  else if (description.length < 50) issues.push({ level: 'warn', field: 'description', message: `Description is short (${description.length} characters)` });

  if (!values.canonical) issues.push({ level: 'warn', field: 'canonical', message: 'Missing canonical URL' });
  else if (!/^https?:\/\//i.test(values.canonical)) issues.push({ level: 'error', field: 'canonical', message: 'Canonical must be an absolute URL' });

  if (!values.ogImage) issues.push({ level: 'warn', field: 'ogImage', message: 'No social share image (og:image)' });
  if (!values.ogTitle) issues.push({ level: 'warn', field: 'ogTitle', message: 'Missing og:title' });
  if (!values.ogDescription) issues.push({ level: 'warn', field: 'ogDescription', message: 'Missing og:description' });
  if (pagePath && values.canonical) {
    const slug = pagePath.replace(/(^|\/)index\.html$/i, '$1').replace(/\.html$/i, '');
    if (!values.canonical.replace(/\/$/, '').endsWith(slug.replace(/\/$/, ''))) {
      issues.push({ level: 'warn', field: 'canonical', message: 'Canonical does not look like this page' });
    }
  }
  return issues;
}

/** Short summary used in the bulk SEO table. */
export function seoSummary(html) {
  const values = parseSeo(html);
  return {
    title: values.title,
    description: values.description,
    canonical: values.canonical,
    issues: validateSeo(values).length,
    errors: validateSeo(values).filter((issue) => issue.level === 'error').length
  };
}
