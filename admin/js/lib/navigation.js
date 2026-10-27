/* Structured editing for partials/navbar.html, social.html and footer.html. */

import { decodeEntities } from './html-text.js';

function escapeAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeText(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function attr(source, name) {
  const regex = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const match = regex.exec(source || '');
  return match ? decodeEntities(match[2] ?? match[3] ?? match[4] ?? '') : '';
}

export function parseNavbar(html) {
  const items = [];
  const regex = /<a\b([^>]*\bclass=["'][^"']*\bnav-item\b[^"']*["'][^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = regex.exec(html || ''))) {
    const anchorAttrs = match[1];
    const inner = match[2];
    const iconMatch = /<i\b([^>]*)>[\s\S]*?<\/i>/i.exec(inner);
    const labelMatch = /<span\b[^>]*>([\s\S]*?)<\/span>/i.exec(inner);
    items.push({
      href: attr(anchorAttrs, 'href'),
      icon: iconMatch ? attr(iconMatch[1], 'class') : '',
      label: labelMatch ? decodeEntities(labelMatch[1].replace(/<[^>]+>/g, '')).trim() : ''
    });
  }
  return items;
}

export function serializeNavbar(items) {
  const lines = ['<nav class="navbar">', '    <div class="navbar-links">'];
  for (const item of items) {
    lines.push(`        <a href="${escapeAttr(item.href)}" class="nav-item">`);
    if (item.icon) lines.push(`            <i class="${escapeAttr(item.icon)}"></i>`);
    lines.push(`            <span>${escapeText(item.label)}</span>`);
    lines.push('        </a>');
  }
  lines.push('    </div>', '</nav>', '');
  return lines.join('\n');
}

export function parseSocial(html) {
  const source = html || '';
  const headingMatch = /<h2[^>]*>([\s\S]*?)<\/h2>/i.exec(source);
  const introMatch = /<p[^>]*>([\s\S]*?)<\/p>/i.exec(source);
  const links = [];
  const regex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = regex.exec(source))) {
    const anchorAttrs = match[1];
    const inner = match[2];
    const iconMatch = /<i\b([^>]*)>([\s\S]*?)<\/i>/i.exec(inner);
    links.push({
      href: attr(anchorAttrs, 'href'),
      label: attr(anchorAttrs, 'aria-label'),
      icon: iconMatch ? attr(iconMatch[1], 'class') : '',
      target: attr(anchorAttrs, 'target') || '_blank'
    });
  }
  return {
    headingIcon: headingMatch ? (/(<i\b[^>]*class=["']([^"']*)["'])/i.exec(headingMatch[1])?.[2] || '') : 'fab fa-connectdevelop',
    headingText: headingMatch ? decodeEntities(headingMatch[1].replace(/<[^>]+>/g, '')).trim() : 'Connect with Us',
    intro: introMatch ? decodeEntities(introMatch[1].replace(/<[^>]+>/g, '')).trim() : '',
    links
  };
}

export function serializeSocial(social) {
  const headingIcon = social.headingIcon || 'fab fa-connectdevelop';
  const lines = [
    '<section class="social-media">',
    `    <h2><i class="${escapeAttr(headingIcon)}"></i> ${escapeText(social.headingText || 'Connect with Us')}</h2>`,
    `    <p>${escapeText(social.intro || '')}</p>`,
    '',
    '      <div class="icons">'
  ];
  for (const link of social.links) {
    lines.push(
      `                <a href="${escapeAttr(link.href)}" target="${escapeAttr(link.target || '_blank')}" aria-label="${escapeAttr(link.label)}"><i class="${escapeAttr(link.icon)}"></i></a>`
    );
  }
  lines.push('      </div>', '</section>', '');
  return lines.join('\n');
}

export function parseFooter(html) {
  const source = html || '';
  const paragraph = /<p[^>]*>([\s\S]*?)<\/p>/i.exec(source);
  const inner = paragraph ? paragraph[1] : '';
  const links = [];
  const regex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = regex.exec(inner))) {
    links.push({
      href: attr(match[1], 'href'),
      label: decodeEntities(match[2].replace(/<[^>]+>/g, '')).trim()
    });
  }
  const beforeBr = inner.split(/<br\s*\/?>/i)[0] || '';
  return {
    copyrightHtml: beforeBr.trim(),
    copyrightText: decodeEntities(beforeBr.replace(/<[^>]+>/g, '')).trim(),
    links
  };
}

export function serializeFooter(footer) {
  const copyright = footer.copyrightHtml || `©<span id="year"></span> ${escapeText(footer.copyrightText || 'CivPrepMaster. All rights reserved.')}`;
  const separator = footer.separator !== undefined ? footer.separator : ' | ';
  const links = (footer.links || [])
    .map((link) => `<a href="${escapeAttr(link.href)}">${escapeText(link.label)}</a>`)
    .join(separator);
  return [
    '<footer class="footer">',
    '    <p>',
    `        ${copyright}${links ? '<br>' : ''}`,
    links ? `        ${links}` : null,
    '    </p>',
    '</footer>',
    ''
  ]
    .filter((line) => line !== null)
    .join('\n');
}

export const DEFAULT_NAVBAR = [
  { href: 'index', icon: 'fas fa-home', label: 'Home' },
  { href: 'Resources', icon: 'fas fa-user-graduate', label: 'Resources' },
  { href: 'NEC-license-preparation', icon: 'fas fa-id-card-alt', label: 'NEC License' },
  { href: 'Psc-preparation', icon: 'fas fa-map-marked-alt', label: 'Loksewa' },
  { href: 'aboutus', icon: 'fas fa-info-circle', label: 'About Us' },
  { href: 'contactus', icon: 'fas fa-envelope', label: 'Contact Us' }
];

export const ICON_SUGGESTIONS = [
  'fas fa-home',
  'fas fa-user-graduate',
  'fas fa-id-card-alt',
  'fas fa-map-marked-alt',
  'fas fa-info-circle',
  'fas fa-envelope',
  'fas fa-book',
  'fas fa-file-alt',
  'fas fa-video',
  'fas fa-download',
  'fas fa-newspaper',
  'fas fa-question-circle',
  'fas fa-calculator',
  'fas fa-graduation-cap',
  'fas fa-chart-line',
  'fas fa-clock',
  'fas fa-star',
  'fas fa-link'
];
