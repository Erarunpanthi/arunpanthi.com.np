import {
  h,
  icon,
  clear,
  pageHead,
  toast,
  confirmDialog,
  loadingView,
  emptyState,
  notice,
  badge,
  withBusy
} from '../ui.js';
import { state, htmlPages, stage, stagedFor, publicUrl, siteUrl } from '../store.js';
import * as api from '../api.js';
import { SEO_FIELDS, parseSeo, setSeoField, validateSeo, seoSummary } from '../lib/seo.js';
import { generateSitemap, parseSitemap } from '../lib/sitemap.js';

let ctxRef = null;
let listEl = null;
let mainEl = null;
let selected = null;
let current = null; // { path, html, sha, values, savedValues, isDraft }
let scanning = false;
let filter = 'all';
let searchValue = '';
const cache = new Map(); // path -> { html, sha, summary, values, error }
const MAX_SCAN = 260;

const GROUPS = [
  { title: 'Search appearance', keys: ['title', 'description', 'canonical', 'robots', 'keywords'] },
  { title: 'Social sharing (Open Graph)', keys: ['ogTitle', 'ogDescription', 'ogImage', 'ogUrl', 'ogType', 'ogSiteName'] },
  { title: 'Twitter card', keys: ['twitterCard', 'twitterTitle', 'twitterDescription', 'twitterImage'] }
];

function pages() {
  return htmlPages().filter((page) => !/^admin\//i.test(page.path));
}

export async function render(root, ctx) {
  destroy();
  ctxRef = ctx;
  if (!state.tree) await ctx.refreshTree({ silent: true });

  root.append(
    pageHead('SEO & metadata', 'Titles, descriptions and link previews — the parts search engines and social sites see.', [
      h('button', { class: 'btn', type: 'button', onClick: updateSitemap }, icon('globe', 15), 'Update sitemap'),
      h('button', { class: 'btn btn-primary', type: 'button', onClick: () => scanAll() }, icon('search', 16), 'Scan all pages')
    ])
  );

  const filterSelect = h(
    'select',
    { class: 'select select-sm', 'aria-label': 'Filter pages', onChange: (event) => { filter = event.target.value; renderList(); } },
    h('option', { value: 'all' }, 'All pages'),
    h('option', { value: 'issues' }, 'With issues'),
    h('option', { value: 'missing-title' }, 'Missing title'),
    h('option', { value: 'missing-description' }, 'Missing description'),
    h('option', { value: 'unscanned' }, 'Not scanned')
  );
  const search = h('input', {
    class: 'input input-sm',
    type: 'search',
    placeholder: 'Filter by path…',
    value: searchValue,
    onInput: (event) => {
      searchValue = event.target.value;
      renderList();
    }
  });

  listEl = h('div', { class: 'seo-list' });
  mainEl = h('div', { class: 'seo-main' });

  root.append(
    h(
      'div',
      { class: 'seo-layout' },
      h(
        'aside',
        { class: 'card seo-sidebar' },
        h('div', { class: 'seo-filters' }, search, filterSelect),
        listEl,
        h(
          'div',
          { class: 'tree-foot' },
          h('span', { class: 'tiny muted grow', id: 'scan-status' }, `${cache.size} of ${pages().length} scanned`)
        )
      ),
      mainEl
    )
  );

  state.leaveGuard = async () => {
    if (!isDirty()) return true;
    return confirmDialog({
      title: 'Discard SEO edits?',
      message: 'This page has metadata changes that are not saved as a draft.',
      confirmLabel: 'Discard edits',
      danger: true
    });
  };
  state.saveHandler = savePage;

  renderList();
  renderEmpty();

  const wanted = ctx.query.path;
  if (wanted) await openPage(wanted);
  else await scanFeatured();
}

export function destroy() {
  state.saveHandler = null;
  state.leaveGuard = null;
  current = null;
  selected = null;
  listEl = null;
  mainEl = null;
  ctxRef = null;
}

function isDirty() {
  if (!current) return false;
  return SEO_FIELDS.some((field) => (current.values[field.key] || '') !== (current.savedValues[field.key] || ''));
}

function cacheSummary(path) {
  const entry = cache.get(path);
  if (!entry || entry.error) return null;
  return entry.summary;
}

function renderList() {
  if (!listEl) return;
  clear(listEl);
  const needle = searchValue.trim().toLowerCase();
  const visible = pages().filter((page) => {
    if (needle && !page.path.toLowerCase().includes(needle)) return false;
    const summary = cacheSummary(page.path);
    if (filter === 'unscanned') return !summary;
    if (filter === 'issues') return summary && summary.issues > 0;
    if (filter === 'missing-title') return summary && !summary.title;
    if (filter === 'missing-description') return summary && !summary.description;
    return true;
  });

  const statusEl = listEl.closest('.seo-sidebar')?.querySelector('#scan-status');
  if (statusEl) statusEl.textContent = `${cache.size} of ${pages().length} scanned`;

  if (!visible.length) {
    listEl.append(h('div', { class: 'tree-empty' }, pages().length ? 'No pages match this filter.' : 'No HTML pages found.'));
    return;
  }

  let shown = 0;
  for (const page of visible) {
    if (shown++ > 400) {
      listEl.append(h('div', { class: 'tree-empty' }, `+ ${visible.length - 400} more…`));
      break;
    }
    const summary = cacheSummary(page.path);
    listEl.append(
      h(
        'button',
        {
          class: `seo-row ${selected === page.path ? 'active' : ''}`,
          type: 'button',
          onClick: () => openPage(page.path)
        },
        h(
          'div',
          { class: 'seo-row-main' },
          h('span', { class: 'seo-row-title' }, summary?.title || h('span', { class: 'muted' }, page.path.split('/').pop())),
          h('span', { class: 'seo-row-path mono' }, page.path)
        ),
        h(
          'span',
          { class: 'seo-row-status' },
          stagedFor(page.path) ? h('span', { class: 'staged-dot' }) : null,
          summary
            ? summary.errors
              ? badge(`${summary.errors} error${summary.errors === 1 ? '' : 's'}`, 'danger')
              : summary.issues
                ? badge(`${summary.issues}`, 'warn')
                : badge('OK', 'brand')
            : h('span', { class: 'tiny muted' }, '—')
        )
      )
    );
  }
}

function renderEmpty() {
  if (!mainEl) return;
  clear(mainEl);
  mainEl.append(
    h(
      'div',
      { class: 'card' },
      h(
        'div',
        { class: 'card-body' },
        emptyState({
          iconName: 'search',
          title: 'Choose a page to review its metadata',
          message: 'Each page gets a search preview, editable title and description, canonical URL and social-share tags.'
        }),
        h(
          'div',
          { class: 'row-wrap', style: 'justify-content:center;margin-top:8px' },
          h('button', { class: 'btn btn-sm', type: 'button', onClick: () => scanAll() }, icon('search', 14), 'Scan every page for issues')
        )
      )
    )
  );
}

async function loadPage(path) {
  if (cache.has(path) && cache.get(path).html) return cache.get(path);
  const staged = stagedFor(path);
  const file = staged?.text !== undefined ? { text: staged.text, sha: staged.originalSha } : await api.getFile(path);
  const entry = {
    html: file.text,
    sha: file.sha,
    values: parseSeo(file.text),
    summary: seoSummary(file.text),
    isDraft: !!staged
  };
  cache.set(path, entry);
  return entry;
}

async function scanFeatured() {
  const featured = (state.config.featuredPages || []).filter((path) => pages().some((page) => page.path === path));
  if (!featured.length) return;
  scanning = true;
  for (const path of featured) {
    if (cache.has(path) && cache.get(path).html) continue;
    try {
      await loadPage(path);
      renderList();
    } catch {
      /* keep scanning */
    }
  }
  scanning = false;
  renderList();
}

async function scanAll() {
  if (scanning) return;
  const all = pages().filter((page) => !(cache.get(page.path)?.html)).slice(0, MAX_SCAN);
  if (!all.length) {
    toast('All pages are already scanned', { type: 'info' });
    return;
  }
  scanning = true;
  const statusEl = listEl?.closest('.seo-sidebar')?.querySelector('#scan-status');
  let done = 0;
  await withBusy(async () => {
    const queue = [...all];
    async function worker() {
      while (queue.length) {
        const page = queue.shift();
        try {
          await loadPage(page.path);
        } catch (error) {
          cache.set(page.path, { error: error.message });
        }
        done += 1;
        if (statusEl) statusEl.textContent = `Scanning… ${done}/${all.length}`;
        if (done % 8 === 0) renderList();
      }
    }
    await Promise.all([worker(), worker(), worker()]);
  });
  scanning = false;
  renderList();
  toast(`Scanned ${done} pages`, { type: 'success' });
}

async function openPage(path) {
  if (path === selected && current) return;
  if (isDirty()) {
    const ok = await confirmDialog({
      title: 'Discard SEO edits?',
      message: 'Changes on the current page are not saved as a draft.',
      confirmLabel: 'Discard edits',
      danger: true
    });
    if (!ok) return;
  }
  selected = path;
  current = null;
  ctxRef?.setQuery?.({ path });
  renderList();
  clear(mainEl);
  mainEl.append(loadingView('Loading ' + path + '…'));

  try {
    const entry = await loadPage(path);
    current = {
      path,
      html: entry.html,
      sha: entry.sha,
      values: { ...entry.values },
      savedValues: { ...entry.values },
      isDraft: entry.isDraft
    };
    renderEditor();
    renderList();
  } catch (error) {
    clear(mainEl);
    mainEl.append(
      h(
        'div',
        { class: 'card' },
        h('div', { class: 'card-body' }, notice(`Could not load ${path}: ${error.message}`, 'danger', 'alert'))
      )
    );
  }
}

function renderEditor() {
  if (!mainEl || !current) return;
  clear(mainEl);
  const values = current.values;
  const issues = validateSeo(values, { pagePath: current.path });

  /* ---- search preview ---- */
  const previewTitle = h('span', { class: 'serp-title' });
  const previewUrl = h('span', { class: 'serp-url' });
  const previewDescription = h('span', { class: 'serp-description' });
  const preview = h('div', { class: 'serp' }, previewUrl, previewTitle, previewDescription);

  function updatePreview() {
    previewTitle.textContent = values.title || 'Missing page title';
    previewDescription.textContent = values.description || 'No meta description — search engines will invent a snippet from the page text.';
    previewUrl.textContent = (values.canonical || publicUrl(current.path)).replace(/^https?:\/\//, '');
    previewTitle.classList.toggle('is-missing', !values.title);
    previewDescription.classList.toggle('is-missing', !values.description);
  }
  updatePreview();

  /* ---- fields ---- */
  const fieldsBody = h('div');
  const issueBox = h('div', { class: 'issue-list' });
  const counters = new Map();

  function updateIssues() {
    const list = validateSeo(values, { pagePath: current.path });
    clear(issueBox);
    if (!list.length) {
      issueBox.append(h('div', { class: 'issue ok' }, icon('check-circle', 15), 'Metadata looks complete.'));
    } else {
      for (const issue of list) {
        issueBox.append(
          h(
            'div',
            { class: `issue ${issue.level === 'error' ? 'error' : 'warn'}` },
            icon(issue.level === 'error' ? 'x-circle' : 'alert', 15),
            h('span', null, issue.message)
          )
        );
      }
    }
    updatePreview();
    const save = mainEl?.querySelector('.card-head .btn-primary');
    if (save) save.disabled = !isDirty();
    const title = mainEl?.querySelector('.panel-title');
    if (title) {
      const existing = title.querySelector('.badge-unsaved');
      if (isDirty() && !existing) title.append(h('span', { class: 'badge warn badge-unsaved' }, 'Unsaved'));
      else if (!isDirty() && existing) existing.remove();
    }
  }

  for (const group of GROUPS) {
    const groupFields = SEO_FIELDS.filter((field) => group.keys.includes(field.key));
    const rows = groupFields.map((field) => {
      const value = values[field.key] || '';
      const counter = h('span', { class: `tf-count tiny ${value.length > field.max ? 'warn-text' : 'muted'}` }, `${value.length}${field.max ? '/' + field.max : ''}`);
      counters.set(field.key, { el: counter, max: field.max });

      const input =
        field.key === 'description' || field.key === 'ogDescription' || field.key === 'twitterDescription' || field.key === 'keywords'
          ? h('textarea', { class: 'textarea', rows: 2, id: 'seo-' + field.key })
          : h('input', { class: 'input', id: 'seo-' + field.key, value });

      if (input.tagName === 'TEXTAREA') input.value = value;
      input.addEventListener('input', () => {
        values[field.key] = input.value;
        counter.textContent = `${input.value.length}${field.max ? '/' + field.max : ''}`;
        counter.classList.toggle('warn-text', input.value.length > field.max);
        counter.classList.toggle('muted', input.value.length <= field.max);
        updateIssues();
      });

      return h(
        'div',
        { class: 'seo-field' },
        h('div', { class: 'seo-field-head' }, h('label', { class: 'label', for: input.id }, field.label), counter),
        input,
        field.hint ? h('span', { class: 'hint' }, field.hint) : null
      );
    });
    fieldsBody.append(
      h(
        'details',
        { class: 'text-group', open: group.title === 'Search appearance' },
        h('summary', null, h('span', { class: 'tg-title' }, group.title), h('span', { class: 'tg-meta' }, `${groupFields.length} fields`)),
        h('div', { class: 'tg-body' }, rows)
      )
    );
  }

  const saveButton = h('button', { class: 'btn btn-primary', type: 'button', onClick: savePage, disabled: true }, icon('save', 16), 'Save draft');
  const autofillButton = h(
    'button',
    {
      class: 'btn btn-sm',
      type: 'button',
      title: 'Copy the title and description into the social fields',
      onClick: () => {
        const patch = {
          ogTitle: values.ogTitle || values.title,
          twitterTitle: values.twitterTitle || values.title,
          ogDescription: values.ogDescription || values.description,
          twitterDescription: values.twitterDescription || values.description,
          ogUrl: values.ogUrl || values.canonical,
          canonical: values.canonical || publicUrl(current.path)
        };
        Object.assign(values, patch);
        renderEditor();
        const save = mainEl?.querySelector('.card-head .btn-primary');
        if (save) save.disabled = false;
        toast('Filled empty social fields from the main metadata', { type: 'info' });
      }
    },
    icon('sparkles', 14),
    'Fill social fields'
  );

  mainEl.append(
    h(
      'div',
      { class: 'card' },
      h(
        'div',
        { class: 'card-head card-head-wrap' },
        h(
          'div',
          { class: 'grow' },
          h('h2', { class: 'panel-title' }, current.path.split('/').pop(), current.isDraft ? badge('Draft', 'warn') : null),
          h('div', { class: 'mono tiny muted' }, current.path)
        ),
        h(
          'div',
          { class: 'row-wrap' },
          h('a', { class: 'btn btn-sm', href: publicUrl(current.path), target: '_blank', rel: 'noopener' }, icon('external', 14), 'Open page'),
          autofillButton,
          saveButton
        )
      ),
      h(
        'div',
        { class: 'card-body stack' },
        current.isDraft ? notice('Showing your draft version of this page.', 'warn', 'alert') : null,
        h('div', { class: 'serp-wrap' }, h('div', { class: 'list-label' }, 'Search preview'), preview),
        h('div', { class: 'divider' }),
        fieldsBody,
        h('div', { class: 'divider' }),
        h('h3', { class: 'panel-title' }, icon('alert', 17), 'Checks'),
        issueBox,
        h(
          'div',
          { class: 'save-bar' },
          h('span', { class: 'tiny muted grow' }, 'Canonical URLs must be absolute and match this page.'),
          h('span', { class: 'tiny muted' }, `${issues.length} note${issues.length === 1 ? '' : 's'}`)
        )
      )
    )
  );

  updateIssues();
}

async function savePage() {
  if (!current) return;
  const changed = SEO_FIELDS.filter((field) => (current.values[field.key] || '') !== (current.savedValues[field.key] || ''));
  if (!changed.length) {
    toast('No metadata changes to save', { type: 'info', timeout: 1800 });
    return;
  }
  let html = current.html;
  for (const field of changed) html = setSeoField(html, field.key, current.values[field.key]);
  if (html === current.html) {
    toast('Nothing changed in the file', { type: 'info' });
    return;
  }
  await withBusy(async () => {
    stage({
      path: current.path,
      text: html,
      originalText: current.html,
      originalSha: current.sha,
      size: html.length
    });
    current.html = html;
    current.savedValues = { ...current.values };
    const entry = cache.get(current.path);
    if (entry) {
      entry.html = html;
      entry.values = { ...current.values };
      entry.summary = seoSummary(html);
      entry.isDraft = true;
    }
    renderEditor();
    renderList();
    toast(`${changed.length} metadata field${changed.length === 1 ? '' : 's'} saved as a draft`, { type: 'success' });
  });
}

/* ------------------------------------------------------------------ */
/* sitemap                                                            */
/* ------------------------------------------------------------------ */

async function updateSitemap() {
  const unscanned = pages().filter((page) => !cache.get(page.path)?.html);
  if (unscanned.length > 40) {
    const ok = await confirmDialog({
      title: 'Scan pages first?',
      message: `${unscanned.length} pages have not been scanned yet, so their canonical URLs are unknown. Scan them now before updating the sitemap?`,
      confirmLabel: 'Scan then update'
    });
    if (!ok) return;
    await scanAll();
  }

  await withBusy(async () => {
    try {
      const sitemapPath = state.config.paths.sitemap;
      const staged = stagedFor(sitemapPath);
      const xml = staged?.text !== undefined ? staged.text : (await api.getFile(sitemapPath)).text;
      const existing = parseSitemap(xml);

      const scanned = [];
      for (const page of pages()) {
        const entry = cache.get(page.path);
        if (!entry?.values) continue;
        scanned.push({ path: page.path, canonical: entry.values.canonical || canonicalGuess(page.path) });
      }

      const result = generateSitemap(scanned, xml);
      if (!result.added.length) {
        toast(`Sitemap is already complete (${existing.length} URLs)`, { type: 'info' });
        return;
      }
      stage({
        path: sitemapPath,
        text: result.xml,
        originalText: xml,
        originalSha: staged?.originalSha,
        size: result.xml.length
      });
      toast(`${result.added.length} URL${result.added.length === 1 ? '' : 's'} added to sitemap.xml`, { type: 'success' });
    } catch (error) {
      toast(error.message, { type: 'error', title: 'Could not update the sitemap' });
    }
  });
}

function canonicalGuess(path) {
  const base = siteUrl().replace(/\/$/, '');
  if (/^index\.html?$/i.test(path)) return base + '/';
  return `${base}/${path.replace(/\/index\.html?$/i, '').replace(/\.html?$/i, '')}`;
}
