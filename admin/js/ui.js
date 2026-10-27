/* DOM helpers, icons, modals, toasts and formatting for the admin panel. */

const ICONS = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  'file-text': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h5"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  upload: '<path d="M12 16V4"/><path d="m6 10 6-6 6 6"/><path d="M4 20h16"/>',
  download: '<path d="M12 4v12"/><path d="m6 10 6 6 6-6"/><path d="M4 20h16"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 1 1 5.1 2.2c-.9.8-2.2 1.4-2.2 2.8"/><path d="M12 17h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pull: '<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M6 8.5v7"/><path d="M18 15.5V9a3 3 0 0 0-3-3h-3"/><path d="m13 4-2 2 2 2"/>',
  settings: '<path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><circle cx="4" cy="12" r="2"/><circle cx="12" cy="10" r="2"/><circle cx="20" cy="14" r="2"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.3L21 8"/><path d="M21 3v5h-5"/>',
  external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/>',
  check: '<path d="m5 12 5 5L20 7"/>',
  'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  'x-circle': '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6"/><path d="m15 9-6 6"/>',
  'chevron-right': '<path d="m9 6 6 6-6 6"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'chevron-left': '<path d="m15 6-6 6 6 6"/>',
  'chevron-up': '<path d="m6 15 6-6 6 6"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  code: '<path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  'arrow-up': '<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>',
  'arrow-down': '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
  'arrow-left': '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18Z"/>',
  sparkles: '<path d="m12 3 1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8Z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9Z"/>',
  server: '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7h.01"/><path d="M7 16h.01"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
  calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4"/><path d="M16 2v4"/><path d="M3 10h18"/>',
  link: '<path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"/>',
  layers: '<path d="m12 2 9 5-9 5-9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  archive: '<rect x="2" y="4" width="20" height="5" rx="1"/><path d="M4 9v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9"/><path d="M10 13h4"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  video: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m22 8-6 4 6 4Z"/>',
  branch: '<circle cx="6" cy="5" r="2.5"/><circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="9" r="2.5"/><path d="M6 7.5v9"/><path d="M18 11.5c0 4-3 5-6 5"/>',
  cloud: '<path d="M17 18a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.5A3.5 3.5 0 0 0 6 18Z"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  palette: '<circle cx="12" cy="12" r="9"/><circle cx="8" cy="9" r="1"/><circle cx="15" cy="9" r="1"/><circle cx="9" cy="15" r="1"/><path d="M12 21a3 3 0 0 1 0-6 3 3 0 0 0 0-6"/>',
  rotate: '<path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.4 2.6L3 8"/><path d="M3 3v5h5"/>',
  play: '<path d="m6 4 14 8-14 8Z"/>',
  filter: '<path d="M22 3H2l8 9.5V19l4 2v-8.5Z"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m11 12 9-9"/><path d="m17 4 3 3"/><path d="m14 7 3 3"/>',
  terminal: '<path d="m4 17 6-6-6-6"/><path d="M12 19h8"/>',
  trending: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  users: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M16 3.5a4 4 0 0 1 0 7.5"/><path d="M22 21a6 6 0 0 0-4-5.7"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/>',
  'check-square': '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m8 12 3 3 5-6"/>',
  panel: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
  filter: '<path d="M22 3H2l8 9.5V19l4 2v-8.5Z"/>',
  dot: '<circle cx="12" cy="12" r="4"/>',
  loader: '<path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m7.8 16.2-2.9 2.9"/><path d="M2 12h4"/><path d="m7.8 7.8-2.9-2.9"/>'
};

export function icon(name, size = 18, className = '') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  if (className) svg.setAttribute('class', className);
  svg.innerHTML = ICONS[name] || ICONS.file;
  return svg;
}

export function append(parent, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false || child === true) continue;
    parent.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return parent;
}

export function h(tag, attrs, ...children) {
  const element = document.createElement(tag);
  if (attrs) {
    for (const [rawKey, value] of Object.entries(attrs)) {
      if (value === null || value === undefined || value === false) continue;
      if (rawKey === 'class' || rawKey === 'className') element.className = value;
      else if (rawKey === 'style') {
        if (typeof value === 'string') element.style.cssText = value;
        else Object.assign(element.style, value);
      } else if (rawKey === 'dataset') Object.assign(element.dataset, value);
      else if (rawKey === 'html') element.innerHTML = value;
      else if (rawKey === 'text') element.textContent = value;
      else if (rawKey === 'value') element.value = value;
      else if (rawKey === 'checked' || rawKey === 'disabled' || rawKey === 'selected' || rawKey === 'readOnly' || rawKey === 'required' || rawKey === 'multiple') {
        element[rawKey] = !!value;
      } else if (rawKey === 'ref' && typeof value === 'function') value(element);
      else if (rawKey.startsWith('on') && typeof value === 'function') {
        element.addEventListener(rawKey.slice(2).toLowerCase(), value);
      } else if (value === true) element.setAttribute(rawKey, '');
      else element.setAttribute(rawKey, value);
    }
  }
  append(element, children);
  return element;
}

export function el(html) {
  const template = document.createElement('template');
  template.innerHTML = String(html).trim();
  return template.content.firstElementChild;
}

export function clear(node) {
  while (node && node.firstChild) node.removeChild(node.firstChild);
  return node;
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function pluralize(count, singular, plural = singular + 's') {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function formatBytes(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  if (value < 1024) return `${value} B`;
  const units = ['KB', 'MB', 'GB'];
  let size = value / 1024;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size >= 10 ? Math.round(size) : size.toFixed(1)} ${units[index]}`;
}

export function formatDate(value, { withTime = true } = {}) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {})
  });
}

export function timeAgo(value) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 45) return 'just now';
  if (seconds < 90) return '1 min ago';
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  if (seconds < 7200) return '1 hour ago';
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hours ago`;
  if (seconds < 172800) return 'yesterday';
  if (seconds < 2592000) return `${Math.round(seconds / 86400)} days ago`;
  return formatDate(date, { withTime: false });
}

export function slugify(value, fallback = 'file') {
  const text = String(value || '')
    .normalize('NFKC')
    .replace(/[’'"()]/g, '')
    .replace(/[^\p{L}\p{M}\p{N}._@+-]+/gu, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '');
  return text.slice(0, 100) || fallback;
}

export function extensionOf(path) {
  const name = String(path || '').split('/').pop() || '';
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot).toLowerCase() : '';
}

export function fileIconName(path) {
  const ext = extensionOf(path);
  if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.avif', '.ico', '.bmp'].includes(ext)) return 'image';
  if (ext === '.pdf') return 'file-text';
  if (['.js', '.mjs', '.css', '.html', '.htm', '.xml', '.json', '.webmanifest'].includes(ext)) return 'code';
  if (['.mp4', '.webm', '.mov'].includes(ext)) return 'video';
  if (['.mp3', '.wav', '.ogg'].includes(ext)) return 'music';
  if (['.zip', '.rar', '.7z'].includes(ext)) return 'archive';
  return 'file';
}

export function isImagePath(path) {
  return ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.avif', '.bmp', '.ico'].includes(extensionOf(path));
}

export function isPdfPath(path) {
  return extensionOf(path) === '.pdf';
}

export function isMediaPath(path) {
  return ['.mp4', '.webm', '.mp3', '.wav', '.ogg'].includes(extensionOf(path));
}

export function languageForPath(path) {
  const ext = extensionOf(path);
  if (['.html', '.htm'].includes(ext)) return 'html';
  if (ext === '.css') return 'css';
  if (['.js', '.mjs'].includes(ext)) return 'javascript';
  if (['.json', '.webmanifest'].includes(ext)) return 'json';
  if (['.xml', '.svg'].includes(ext)) return 'xml';
  if (ext === '.md') return 'markdown';
  return 'text';
}

export function badge(text, tone = '') {
  return h('span', { class: `badge ${tone}` }, text);
}

export function spinner(size = 18) {
  return icon('loader', size, 'spin');
}

export function loadingView(label = 'Loading…') {
  return h('div', { class: 'view-loading' }, spinner(20), h('span', null, label));
}

export function emptyState({ iconName = 'folder', title, message, actionLabel, onAction } = {}) {
  return h(
    'div',
    { class: 'empty' },
    h('div', { class: 'empty-icon' }, icon(iconName, 24)),
    h('h3', null, title || 'Nothing here yet'),
    message ? h('p', null, message) : null,
    actionLabel ? h('button', { class: 'btn btn-primary', onClick: onAction }, icon('plus', 16), actionLabel) : null
  );
}

export function errorState(message, retry) {
  return h(
    'div',
    { class: 'empty' },
    h('div', { class: 'empty-icon', style: { background: 'var(--danger-soft)', color: 'var(--danger)' } }, icon('alert', 24)),
    h('h3', null, 'Something went wrong'),
    h('p', null, message || 'Please try again.'),
    retry ? h('button', { class: 'btn', onClick: retry }, icon('refresh', 16), 'Try again') : null
  );
}

export function pageHead(title, subtitle, actions = []) {
  return h(
    'div',
    { class: 'page-head' },
    h('div', null, h('h1', null, title), subtitle ? h('p', null, subtitle) : null),
    actions.length ? h('div', { class: 'row-wrap' }, actions) : null
  );
}

export function statCard({ label, value, sub, iconName }) {
  return h(
    'div',
    { class: 'stat' },
    iconName ? h('span', { class: 'stat-icon' }, icon(iconName, 20)) : null,
    h('span', { class: 'stat-label' }, label),
    h('span', { class: 'stat-value' }, value),
    sub ? h('span', { class: 'stat-sub' }, sub) : null
  );
}

export function notice(message, tone = '', iconName = 'info') {
  return h('div', { class: `notice ${tone}` }, icon(iconName, 18), h('div', null, message));
}

export function field({ label, hint, input, id }) {
  return h(
    'div',
    { class: 'field' },
    label ? h('label', { for: id }, label) : null,
    input,
    hint ? h('span', { class: 'hint' }, hint) : null
  );
}

export function textInput({ value = '', placeholder = '', id, type = 'text', autocomplete, onInput, onEnter, autofocus, maxLength } = {}) {
  const input = h('input', {
    class: 'input',
    type,
    value,
    placeholder,
    id,
    autocomplete: autocomplete || 'off',
    maxlength: maxLength,
    onInput,
    onKeydown: onEnter
      ? (event) => {
          if (event.key === 'Enter') onEnter(event);
        }
      : undefined
  });
  if (autofocus) setTimeout(() => input.focus(), 30);
  return input;
}

export function textArea({ value = '', placeholder = '', rows = 3, onInput, id, mono = false } = {}) {
  return h('textarea', {
    class: `textarea ${mono ? 'mono' : ''}`,
    rows,
    id,
    placeholder,
    onInput
  }, value);
}

export function selectBox({ options, value, onChange, id, className = '' } = {}) {
  const select = h('select', { class: `select ${className}`, id, onChange }, options.map((option) =>
    h('option', { value: option.value, selected: String(option.value) === String(value) }, option.label)
  ));
  return select;
}

export function tabs(items, activeId, onChange) {
  return h(
    'div',
    { class: 'tabs', role: 'tablist' },
    items.map((item) =>
      h(
        'button',
        {
          class: `tab ${item.id === activeId ? 'active' : ''}`,
          type: 'button',
          role: 'tab',
          'aria-selected': item.id === activeId ? 'true' : 'false',
          onClick: () => onChange(item.id)
        },
        item.label
      )
    )
  );
}

/* ------------------------------------------------------------------ */
/* progress                                                            */
/* ------------------------------------------------------------------ */

let busyCount = 0;
let progressTimer = null;

function progressBar() {
  let bar = document.querySelector('.progress-bar');
  if (!bar) {
    bar = h('div', { class: 'progress-bar', 'aria-hidden': 'true' });
    document.body.append(bar);
  }
  return bar;
}

export function beginBusy() {
  busyCount += 1;
  const bar = progressBar();
  bar.classList.add('active');
  let width = 8;
  bar.style.width = width + '%';
  clearInterval(progressTimer);
  progressTimer = setInterval(() => {
    width = Math.min(88, width + Math.max(1, (88 - width) * 0.08));
    bar.style.width = width + '%';
  }, 220);
}

export function endBusy() {
  busyCount = Math.max(0, busyCount - 1);
  if (busyCount > 0) return;
  clearInterval(progressTimer);
  const bar = progressBar();
  bar.style.width = '100%';
  setTimeout(() => {
    bar.classList.remove('active');
    bar.style.width = '0';
  }, 260);
}

export async function withBusy(fn) {
  beginBusy();
  try {
    return await fn();
  } finally {
    endBusy();
  }
}

/* ------------------------------------------------------------------ */
/* toasts                                                              */
/* ------------------------------------------------------------------ */

function toastStack() {
  let stack = document.querySelector('.toast-stack');
  if (!stack) {
    stack = h('div', { class: 'toast-stack', 'aria-live': 'polite' });
    document.body.append(stack);
  }
  return stack;
}

const TOAST_ICONS = { success: 'check-circle', error: 'x-circle', warn: 'alert', info: 'info' };

export function toast(message, { type = 'success', title = null, timeout = 4200 } = {}) {
  const node = h(
    'div',
    { class: `toast ${type}` },
    h('span', { class: 't-icon' }, icon(TOAST_ICONS[type] || 'info', 16)),
    h(
      'div',
      { class: 't-body' },
      title ? h('div', { class: 't-title' }, title) : null,
      h('div', { class: title ? 't-msg' : 't-title' }, message)
    ),
    h('button', { class: 't-close', 'aria-label': 'Dismiss', onClick: () => remove() }, icon('x', 14))
  );
  let removed = false;
  function remove() {
    if (removed) return;
    removed = true;
    node.classList.add('leaving');
    setTimeout(() => node.remove(), 220);
  }
  toastStack().append(node);
  if (timeout) setTimeout(remove, timeout);
  return remove;
}

/* ------------------------------------------------------------------ */
/* modals                                                              */
/* ------------------------------------------------------------------ */

export function openModal({ title, subtitle, content, actions = [], size = '', onClose, bodyClass = '' } = {}) {
  const backdrop = h('div', { class: 'modal-backdrop' });
  let closed = false;

  const body = h('div', { class: `modal-body ${bodyClass}` }, content);
  const header = h(
    'div',
    { class: 'modal-head' },
    h('div', null, h('h3', null, title || ''), subtitle ? h('p', null, subtitle) : null),
    h('button', { class: 'modal-close', 'aria-label': 'Close', onClick: () => close() }, icon('x', 18))
  );

  const footer = actions.length
    ? h(
        'div',
        { class: 'modal-foot' },
        actions.map((action) => {
          if (action.hidden) return null;
          return h(
            'button',
            {
              class: `btn ${action.variant ? 'btn-' + action.variant : ''} ${action.left ? 'left' : ''}`,
              type: 'button',
              disabled: action.disabled,
              onClick: async (event) => {
                const button = event.currentTarget;
                if (action.onClick) {
                  button.disabled = true;
                  try {
                    const result = await action.onClick(close, button);
                    if (result !== false) close();
                  } catch (error) {
                    console.error(error);
                    toast(error.message || 'Action failed', { type: 'error' });
                  } finally {
                    button.disabled = false;
                  }
                } else {
                  close();
                }
              }
            },
            action.iconName ? icon(action.iconName, 16) : null,
            action.label
          );
        })
      )
    : null;

  const dialog = h(
    'div',
    { class: `modal ${size ? 'modal-' + size : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title || 'Dialog' },
    header,
    body,
    footer
  );
  backdrop.append(dialog);

  function onKey(event) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
    }
  }

  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey);
    backdrop.remove();
    if (onClose) onClose();
  }

  backdrop.addEventListener('mousedown', (event) => {
    if (event.target === backdrop) close();
  });
  document.addEventListener('keydown', onKey);
  document.body.append(backdrop);
  setTimeout(() => {
    const focusable = dialog.querySelector('input, textarea, select, button:not(.modal-close)');
    if (focusable) focusable.focus();
  }, 40);

  return { close, element: dialog, body, footer, header };
}

export function confirmDialog({
  title = 'Are you sure?',
  message = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  details = null
} = {}) {
  return new Promise((resolve) => {
    let settled = false;
    openModal({
      title,
      size: 'sm',
      content: h(
        'div',
        { class: 'stack-sm' },
        message ? h('p', null, message) : null,
        details ? h('div', { class: 'code-block' }, details) : null
      ),
      actions: [
        { label: cancelLabel, variant: 'ghost', onClick: () => { settled = true; resolve(false); } },
        {
          label: confirmLabel,
          variant: danger ? 'danger' : 'primary',
          iconName: danger ? 'trash' : 'check',
          onClick: () => { settled = true; resolve(true); }
        }
      ],
      onClose: () => {
        if (!settled) resolve(false);
      }
    });
  });
}

export function promptDialog({
  title,
  label,
  value = '',
  placeholder = '',
  hint = '',
  confirmLabel = 'Save',
  multiline = false,
  inputType = 'text'
} = {}) {
  return new Promise((resolve) => {
    let settled = false;
    const input = multiline
      ? h('textarea', { class: 'textarea', rows: 5, placeholder, value })
      : h('input', { class: 'input', type: inputType, placeholder, value });
    if (!multiline) input.value = value;
    const modal = openModal({
      title,
      size: 'sm',
      content: h(
        'div',
        { class: 'stack-sm' },
        label ? h('label', { class: 'label' }, label) : null,
        input,
        hint ? h('span', { class: 'hint' }, hint) : null
      ),
      actions: [
        { label: 'Cancel', variant: 'ghost', onClick: () => { settled = true; resolve(null); } },
        {
          label: confirmLabel,
          variant: 'primary',
          onClick: () => {
            settled = true;
            resolve(input.value);
          }
        }
      ],
      onClose: () => {
        if (!settled) resolve(null);
      }
    });
    if (!multiline) {
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          settled = true;
          modal.close();
          resolve(input.value);
        }
      });
    }
    setTimeout(() => {
      input.focus();
      input.select?.();
    }, 60);
  });
}

/* ------------------------------------------------------------------ */
/* clipboard / downloads                                               */
/* ------------------------------------------------------------------ */

export async function copyText(text) {
  const value = String(text ?? '');
  try {
    await navigator.clipboard.writeText(value);
    toast('Copied to clipboard', { type: 'info', timeout: 1800 });
    return true;
  } catch {
    const area = h('textarea', { style: 'position:fixed;left:-9999px;top:0' });
    area.value = value;
    document.body.append(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    area.remove();
    toast(ok ? 'Copied to clipboard' : 'Could not copy — select the text manually', {
      type: ok ? 'info' : 'error',
      timeout: 2200
    });
    return ok;
  }
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = h('a', { href: url, download: filename, style: 'display:none' });
  document.body.append(anchor);
  anchor.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    anchor.remove();
  }, 1000);
}

export function downloadText(text, filename, type = 'text/plain;charset=utf-8') {
  downloadBlob(new Blob([text], { type }), filename);
}
