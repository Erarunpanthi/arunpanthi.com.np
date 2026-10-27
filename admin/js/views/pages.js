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
} from '../ui.js';
import { state, htmlPages, stage, stagedFor, publicUrl } from '../store.js';
import * as api from '../api.js';
import { extractTextNodes, groupTextNodes, applyTextChanges, textStats } from '../lib/html-text.js';

let ctxRef = null;
let listEl = null;
let mainEl = null;
let searchValue = '';
let current = null; // { path, html, nodes, groups, draft: {}, saved: {} }
let dirty = false;

const FEATURED = () => state.config.featuredPages || [];

function pageLabel(path) {
  const clean = path.replace(/\.html?$/i, '');
  const parts = clean.split('/');
  const last = parts[parts.length - 1];
  const name = (last === 'index' ? parts[parts.length - 2] || 'Home' : last)
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
  return name;
}

function pageList() {
  const pages = htmlPages();
  const byPath = new Map(pages.map((page) => [page.path, page]));
  const featured = FEATURED().filter((path) => byPath.has(path));
  const rest = pages.filter((page) => !featured.includes(page.path));
  return { featured: featured.map((path) => byPath.get(path)), rest };
}

export async function render(root, ctx) {
  destroy();
  ctxRef = ctx;
  if (!state.tree) await ctx.refreshTree({ silent: true });

  root.append(
    pageHead('Page text', 'Edit headings and paragraphs like a document — no HTML required.', [
      h(
        'button',
        { class: 'btn btn-sm', type: 'button', onClick: () => ctx.navigate('files') },
        icon('code', 15),
        'Open full HTML editor'
      )
    ])
  );

  const search = h('input', {
    class: 'input input-sm',
    type: 'search',
    placeholder: 'Find a page…',
    value: searchValue,
    onInput: (event) => {
      searchValue = event.target.value;
      renderList();
    }
  });

  listEl = h('div', { class: 'page-list' });
  const listCard = h(
    'aside',
    { class: 'card page-list-card' },
    h('div', { class: 'tree-search' }, search),
    listEl,
    h('div', { class: 'tree-foot' }, h('span', { class: 'tiny muted' }, `${htmlPages().length} HTML pages`))
  );
  mainEl = h('div', { class: 'page-editor' });
  root.append(h('div', { class: 'pages-layout' }, listCard, mainEl));

  renderList();
  renderEmpty();

  state.leaveGuard = async () => {
    if (!dirty) return true;
    return confirmDialog({
      title: 'Discard text edits?',
      message: 'You have text changes that are not saved as a draft yet.',
      confirmLabel: 'Discard edits',
      danger: true
    });
  };
  state.saveHandler = saveDraft;

  if (ctx.query.path) await openPage(ctx.query.path);
}

export function destroy() {
  state.saveHandler = null;
  state.leaveGuard = null;
  current = null;
  dirty = false;
  listEl = null;
  mainEl = null;
  ctxRef = null;
}

function renderList() {
  if (!listEl) return;
  clear(listEl);
  const { featured, rest } = pageList();
  const needle = searchValue.trim().toLowerCase();
  const matches = (page) => !needle || page.path.toLowerCase().includes(needle) || pageLabel(page.path).toLowerCase().includes(needle);

  const visibleFeatured = featured.filter(matches);
  const visibleRest = rest.filter(matches);

  if (visibleFeatured.length) {
    listEl.append(h('div', { class: 'list-label' }, 'Main pages'));
    for (const page of visibleFeatured) listEl.append(pageRow(page));
  }
  if (visibleRest.length) {
    listEl.append(h('div', { class: 'list-label' }, visibleFeatured.length ? 'All pages' : 'Pages'));
    for (const page of visibleRest) listEl.append(pageRow(page));
  }
  if (!visibleFeatured.length && !visibleRest.length) {
    listEl.append(h('div', { class: 'tree-empty' }, 'No pages match that search.'));
  }
}

function pageRow(page) {
  const change = stagedFor(page.path);
  return h(
    'button',
    {
      class: `page-row ${current?.path === page.path ? 'active' : ''}`,
      type: 'button',
      onClick: async () => {
        if (page.path === current?.path) return;
        if (dirty) {
          const ok = await confirmDialog({
            title: 'Discard text edits?',
            message: 'You have unsaved text changes on this page.',
            confirmLabel: 'Discard edits',
            danger: true
          });
          if (!ok) return;
        }
        await openPage(page.path);
      }
    },
    h('span', { class: 'page-row-name' }, pageLabel(page.path)),
    h('span', { class: 'page-row-path mono' }, page.path),
    change ? h('span', { class: 'staged-dot' }) : null
  );
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
          iconName: 'edit',
          title: 'Choose a page to edit its text',
          message: 'Headings and paragraphs are listed section by section. Links, images and layout stay untouched.'
        })
      )
    )
  );
}

async function openPage(path) {
  if (!mainEl) return;
  ctxRef?.setQuery?.({ path });
  clear(mainEl);
  mainEl.append(loadingView('Loading ' + path + '…'));
  renderList();

  try {
    const staged = stagedFor(path);
    const file = staged?.text !== undefined ? { text: staged.text, sha: staged.originalSha } : await api.getFile(path);
    const html = file.text;
    const nodes = extractTextNodes(html);
    const groups = groupTextNodes(nodes);
    const draft = {};
    nodes.forEach((node, index) => {
      draft[index] = node.text;
    });
    current = { path, html, nodes, groups, draft, saved: { ...draft }, sha: file.sha, staged };
    dirty = false;
    renderEditor();
  } catch (error) {
    clear(mainEl);
    mainEl.append(
      h(
        'div',
        { class: 'card' },
        h(
          'div',
          { class: 'card-body' },
          emptyState({ iconName: 'alert', title: 'Could not load this page', message: error.message })
        )
      )
    );
  }
}

function renderEditor() {
  if (!mainEl || !current) return;
  clear(mainEl);
  const stats = textStats(current.nodes);
  const changedCount = countChanged();

  const body = h('div', { class: 'text-groups' });
  current.groups.forEach((group, groupIndex) => {
    const groupNodes = group.nodes.map((node) => ({ node, index: current.nodes.indexOf(node) }));
    body.append(
      h(
        'details',
        { class: 'text-group', open: groupIndex < 3 },
        h(
          'summary',
          null,
          h('span', { class: 'tg-title' }, group.heading),
          h('span', { class: 'tg-meta' }, `${groupNodes.length} block${groupNodes.length === 1 ? '' : 's'}`)
        ),
        h(
          'div',
          { class: 'tg-body' },
          groupNodes.map(({ node, index }) => textField(node, index))
        )
      )
    );
  });

  const saveButton = h(
    'button',
    { class: 'btn btn-primary', type: 'button', onClick: saveDraft },
    icon('save', 16),
    'Save draft'
  );
  const resetButton = h(
    'button',
    { class: 'btn', type: 'button', onClick: resetDraft },
    icon('rotate', 16),
    'Reset'
  );
  const viewButton = h(
    'a',
    { class: 'btn', href: publicUrl(current.path), target: '_blank', rel: 'noopener' },
    icon('external', 15),
    'View page'
  );

  const counter = h('span', { class: 'tiny muted', id: 'text-changed' });
  saveButton.disabled = true;
  updateCounter(counter);

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
          h('h2', { class: 'panel-title' }, pageLabel(current.path), current.staged ? badge('Draft', 'warn') : null),
          h('div', { class: 'mono tiny muted' }, current.path)
        ),
        h('div', { class: 'row-wrap' }, counter, viewButton, resetButton, saveButton)
      ),
      h(
        'div',
        { class: 'card-body' },
        current.staged?.text !== undefined
          ? notice('Showing your saved draft. Publishing replaces the live page.', 'warn', 'alert')
          : null,
        notice('Only visible text is shown. To change markup, scripts or styles use the Files editor.', 'info', 'info'),
        h('div', { style: 'height:14px' }),
        h(
          'div',
          { class: 'text-summary' },
          h('span', null, `${stats.total} text blocks`),
          h('span', null, `${stats.words} words`),
          h('span', null, `${current.groups.length} sections`)
        ),
        body
      )
    )
  );

  function updateCounter(el) {
    const count = countChanged();
    el.textContent = count ? `${count} edited` : 'No edits yet';
    el.classList.toggle('is-dirty', count > 0);
  }

}

function textField(node, index) {
  const id = 'txt-' + index;
  const countEl = h('span', { class: 'tf-count tiny muted' }, String((current.draft[index] || '').length));

  const area = h('textarea', {
    class: `textarea tf-input ${node.isHeading ? 'is-heading' : ''}`,
    id,
    rows: node.isHeading ? 1 : Math.min(14, Math.max(2, Math.ceil(node.text.length / 90)))
  });
  area.value = current.draft[index];

  const field = h(
    'div',
    { class: `text-field ${current.draft[index] !== node.text ? 'changed' : ''}` },
    h(
      'div',
      { class: 'tf-head' },
      h('label', { class: 'tf-label', for: id }, node.isHeading ? `Heading · ${node.tag.toUpperCase()}` : `Text · ${node.tag || 'body'}`),
      countEl
    ),
    area
  );

  area.addEventListener('input', () => {
    const value = area.value;
    current.draft[index] = value;
    countEl.textContent = String(value.length);
    field.classList.toggle('changed', value !== node.text);
    dirty = countChanged() > 0;
    const counter = mainEl?.querySelector('#text-changed');
    if (counter) {
      const count = countChanged();
      counter.textContent = count ? `${count} edited` : 'No edits yet';
      counter.classList.toggle('is-dirty', count > 0);
    }
    const save = mainEl?.querySelector('.card-head .btn-primary');
    if (save) save.disabled = !dirty;
  });

  if (node.isHeading) {
    area.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        area.blur();
      }
    });
  }
  return field;
}

function countChanged() {
  if (!current) return 0;
  let count = 0;
  for (const [index, value] of Object.entries(current.draft)) {
    if (value !== current.nodes[Number(index)]?.text) count += 1;
  }
  return count;
}

async function resetDraft() {
  if (!current) return;
  if (!countChanged()) {
    toast('No edits to reset', { type: 'info', timeout: 1600 });
    return;
  }
  const ok = await confirmDialog({ title: 'Reset all text on this page?', message: 'Unsaved text edits will be discarded.', confirmLabel: 'Reset', danger: true });
  if (!ok) return;
  current.draft = { ...current.saved };
  current.nodes.forEach((node, index) => (current.draft[index] = node.text));
  dirty = false;
  renderEditor();
}

function saveDraft() {
  if (!current) return;
  const changes = {};
  for (const [index, value] of Object.entries(current.draft)) {
    if (value !== current.nodes[Number(index)].text) changes[index] = value;
  }
  if (!Object.keys(changes).length) {
    toast('No changes to save', { type: 'info', timeout: 1600 });
    return;
  }
  const html = applyTextChanges(current.html, current.nodes, changes);
  stage({
    path: current.path,
    text: html,
    originalText: current.html,
    originalSha: current.sha,
    size: html.length
  });

  // rebase the editor on the new HTML so further edits are relative to the draft
  const nodes = extractTextNodes(html);
  const groups = groupTextNodes(nodes);
  const draft = {};
  nodes.forEach((node, index) => (draft[index] = node.text));
  current = { ...current, html, nodes, groups, draft, saved: { ...draft } };
  dirty = false;
  renderEditor();
  renderList();
  toast(`${Object.keys(changes).length} text change${Object.keys(changes).length === 1 ? '' : 's'} saved as a draft`, { type: 'success' });
}
