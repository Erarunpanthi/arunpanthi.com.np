import {
  h,
  icon,
  clear,
  pageHead,
  toast,
  confirmDialog,
  loadingView,
  notice,
  badge,
} from '../ui.js';
import { state, stage, stagedFor } from '../store.js';
import * as api from '../api.js';
import {
  parseNavbar,
  serializeNavbar,
  parseSocial,
  serializeSocial,
  parseFooter,
  serializeFooter,
  DEFAULT_NAVBAR,
  ICON_SUGGESTIONS
} from '../lib/navigation.js';

let ctxRef = null;
let container = null;
let activeTab = 'navbar';
const docs = {}; // key -> { path, html, data, dirty }
let leaveHooked = false;

const TABS = [
  { id: 'navbar', label: 'Navbar', icon: 'menu' },
  { id: 'social', label: 'Social links', icon: 'globe' },
  { id: 'footer', label: 'Footer', icon: 'panel' }
];

const PATHS = () => ({
  navbar: state.config.paths.navbar,
  social: state.config.paths.social,
  footer: state.config.paths.footer
});

function anyDirty() {
  return Object.values(docs).some((doc) => doc.dirty);
}

export async function render(root, ctx) {
  destroy();
  ctxRef = ctx;
  root.append(
    pageHead('Navigation & footer', 'The menu, social icons and copyright line shown on every page.', [
      h('button', { class: 'btn btn-sm', type: 'button', onClick: () => ctx.navigate('files', { path: PATHS().navbar }) }, icon('code', 15), 'Raw HTML')
    ])
  );
  container = h('div');
  root.append(container);

  leaveHooked = true;
  state.leaveGuard = async () => {
    if (!anyDirty()) return true;
    return confirmDialog({
      title: 'Discard navigation edits?',
      message: 'Some of your menu or footer changes are not saved as a draft.',
      confirmLabel: 'Discard edits',
      danger: true
    });
  };
  state.saveHandler = saveAll;

  renderTabs();
  await loadAll();
}

export function destroy() {
  if (leaveHooked) {
    state.saveHandler = null;
    state.leaveGuard = null;
    leaveHooked = false;
  }
  container = null;
  ctxRef = null;
}

function renderTabs() {
  if (!container) return;
  let bar = container.querySelector('.tabs');
  if (!bar) {
    bar = h('div', { class: 'tabs', role: 'tablist' });
    container.append(bar);
    container.append(h('div', { class: 'tab-panel' }));
  }
  clear(bar);
  bar.append(
    ...TABS.map((tab) =>
      h(
        'button',
        {
          class: `tab ${activeTab === tab.id ? 'active' : ''}`,
          type: 'button',
          role: 'tab',
          'aria-selected': String(activeTab === tab.id),
          onClick: () => {
            if (activeTab === tab.id) return;
            activeTab = tab.id;
            renderTabs();
            renderTab();
          }
        },
        icon(tab.icon, 16),
        tab.label,
        docs[tab.id]?.dirty ? h('span', { class: 'tab-dot' }) : null
      )
    )
  );
}

async function loadAll() {
  const paths = PATHS();
  for (const tab of TABS) {
    const path = paths[tab.id];
    const panel = container?.querySelector('.tab-panel');
    if (!panel) return;
    if (!docs[tab.id]) panel.append(loadingView('Loading ' + path + '…'));
    try {
      const staged = stagedFor(path);
      const file = staged?.text !== undefined ? { text: staged.text, sha: staged.originalSha } : await api.getFile(path);
      docs[tab.id] = buildDoc(tab.id, path, file.text, file.sha, !!staged);
    } catch (error) {
      docs[tab.id] = { path, error: error.message };
    }
    if (docs[tab.id].error) {
      clear(panel);
      panel.append(
        notice(`Could not load ${path}: ${docs[tab.id].error}`, 'danger', 'alert')
      );
    }
    if (activeTab === tab.id) renderTab();
  }
  renderTabs();
}

function buildDoc(key, path, html, sha, isDraft) {
  if (key === 'navbar') {
    let items = parseNavbar(html);
    if (!items.length) items = DEFAULT_NAVBAR.map((item) => ({ ...item }));
    return { path, html, sha, isDraft, dirty: false, data: { items: items.map((item) => ({ ...item })) } };
  }
  if (key === 'social') {
    return { path, html, sha, isDraft, dirty: false, data: parseSocial(html) };
  }
  const footer = parseFooter(html);
  return { path, html, sha, isDraft, dirty: false, data: footer };
}

function renderTab() {
  const panel = container?.querySelector('.tab-panel');
  const doc = docs[activeTab];
  if (!panel) return;
  clear(panel);
  if (!doc) {
    panel.append(loadingView());
    return;
  }
  if (doc.error) {
    panel.append(notice(`Could not load ${doc.path}: ${doc.error}`, 'danger', 'alert'));
    return;
  }

  const head = h(
    'div',
    { class: 'card-head card-head-wrap' },
    h(
      'div',
      { class: 'grow' },
      h('h2', { class: 'panel-title' }, TABS.find((tab) => tab.id === activeTab).label, doc.dirty ? badge('Unsaved', 'warn') : null),
      h('div', { class: 'mono tiny muted' }, doc.path)
    ),
    h(
      'div',
      { class: 'row-wrap' },
      h('button', { class: 'btn btn-sm', type: 'button', onClick: () => reloadTab(activeTab) }, icon('rotate', 14), 'Reload'),
      h(
        'button',
        { class: 'btn btn-sm btn-primary', type: 'button', onClick: () => saveTab(activeTab), disabled: !doc.dirty },
        icon('save', 14),
        'Save draft'
      )
    )
  );

  const body = h('div', { class: 'card-body' });
  if (activeTab === 'navbar') body.append(navbarEditor(doc));
  else if (activeTab === 'social') body.append(socialEditor(doc));
  else body.append(footerEditor(doc));

  panel.append(h('div', { class: 'card' }, head, body));
}

function markDirty(doc, dirty) {
  doc.dirty = dirty;
  renderTabs();
  const save = container?.querySelector('.tab-panel .card-head .btn-primary');
  if (save) save.disabled = !doc.dirty;
  const title = container?.querySelector('.tab-panel .panel-title');
  if (title) {
    const existing = title.querySelector('.badge');
    if (doc.dirty && !existing) title.append(badge('Unsaved', 'warn'));
    else if (!doc.dirty && existing) existing.remove();
  }
}

function iconPreview(iconClass) {
  return h(
    'span',
    { class: 'icon-preview', title: iconClass || 'no icon' },
    h('i', { class: iconClass || 'fas fa-question' })
  );
}

function navbarEditor(doc) {
  const list = h('div', { class: 'nav-list' });

  function redraw() {
    clear(list);
    doc.data.items.forEach((item, index) => {
      list.append(
        h(
          'div',
          { class: 'nav-item-row' },
          h('span', { class: 'drag-handle', 'aria-hidden': 'true' }, icon('more', 15)),
          iconPreview(item.icon),
          h(
            'div',
            { class: 'nav-fields' },
            h(
              'div',
              { class: 'nf-main' },
              h(
                'label',
                { class: 'mini-field' },
                h('span', null, 'Label'),
                h('input', {
                  class: 'input input-sm',
                  value: item.label,
                  placeholder: 'Home',
                  onInput: (event) => {
                    item.label = event.target.value;
                    doc.dirty = true;
                    markDirty(doc, true);
                  }
                })
              ),
              h(
                'label',
                { class: 'mini-field' },
                h('span', null, 'Link'),
                h('input', {
                  class: 'input input-sm mono',
                  value: item.href,
                  placeholder: 'aboutus',
                  onInput: (event) => {
                    item.href = event.target.value;
                    doc.dirty = true;
                    markDirty(doc, true);
                  }
                })
              ),
              h(
                'label',
                { class: 'mini-field' },
                h('span', null, 'Icon'),
                h(
                  'select',
                  {
                    class: 'select input-sm',
                    onChange: (event) => {
                      item.icon = event.target.value;
                      doc.dirty = true;
                      markDirty(doc, true);
                      preview.replaceChildren(iconPreview(item.icon));
                    }
                  },
                  [...new Set([item.icon, ...ICON_SUGGESTIONS].filter(Boolean))].map((option) =>
                    h('option', { value: option, selected: option === item.icon }, option)
                  )
                )
              )
            )
          ),
          h(
            'div',
            { class: 'nav-actions' },
            h(
              'button',
              {
                class: 'icon-btn',
                type: 'button',
                title: 'Move up',
                disabled: index === 0,
                onClick: () => {
                  [doc.data.items[index - 1], doc.data.items[index]] = [doc.data.items[index], doc.data.items[index - 1]];
                  doc.dirty = true;
                  markDirty(doc, true);
                  redraw();
                }
              },
              icon('arrow-up', 14)
            ),
            h(
              'button',
              {
                class: 'icon-btn',
                type: 'button',
                title: 'Move down',
                disabled: index === doc.data.items.length - 1,
                onClick: () => {
                  [doc.data.items[index + 1], doc.data.items[index]] = [doc.data.items[index], doc.data.items[index + 1]];
                  doc.dirty = true;
                  markDirty(doc, true);
                  redraw();
                }
              },
              icon('arrow-down', 14)
            ),
            h(
              'button',
              {
                class: 'icon-btn',
                type: 'button',
                title: 'Remove item',
                onClick: async () => {
                  const ok = await confirmDialog({
                    title: 'Remove this menu item?',
                    message: item.label || item.href,
                    confirmLabel: 'Remove',
                    danger: true
                  });
                  if (!ok) return;
                  doc.data.items.splice(index, 1);
                  doc.dirty = true;
                  markDirty(doc, true);
                  redraw();
                }
              },
              icon('trash', 14)
            )
          )
        )
      );
      const preview = list.lastElementChild.querySelector('.icon-preview');
    });
  }

  redraw();

  return h(
    'div',
    null,
    notice(
      'Links without a leading slash open pages relative to the current folder. Use “https://…” for external sites.',
      'info',
      'info'
    ),
    h('div', { style: 'height:14px' }),
    list,
    h(
      'div',
      { class: 'row-wrap', style: 'margin-top:12px' },
      h(
        'button',
        {
          class: 'btn',
          type: 'button',
          onClick: () => {
            doc.data.items.push({ href: '', icon: 'fas fa-link', label: '' });
            doc.dirty = true;
            markDirty(doc, true);
            redraw();
          }
        },
        icon('plus', 15),
        'Add menu item'
      ),
      h(
        'button',
        {
          class: 'btn btn-ghost',
          type: 'button',
          onClick: async () => {
            const ok = await confirmDialog({
              title: 'Restore the default menu?',
              message: 'This replaces the current items with the standard six links.',
              confirmLabel: 'Restore defaults'
            });
            if (!ok) return;
            doc.data.items = DEFAULT_NAVBAR.map((item) => ({ ...item }));
            doc.dirty = true;
            markDirty(doc, true);
            redraw();
          }
        },
        icon('rotate', 15),
        'Restore defaults'
      )
    )
  );
}

function socialEditor(doc) {
  const data = doc.data;
  const links = h('div', { class: 'stack-sm' });

  function redrawLinks() {
    clear(links);
    data.links.forEach((link, index) => {
      links.append(
        h(
          'div',
          { class: 'social-row' },
          h('span', { class: 'icon-preview' }, h('i', { class: link.icon || 'fas fa-link' })),
          h('input', {
            class: 'input input-sm',
            value: link.label,
            placeholder: 'Facebook',
            'aria-label': 'Label',
            onInput: (event) => {
              link.label = event.target.value;
              doc.dirty = true;
              markDirty(doc, true);
            }
          }),
          h('input', {
            class: 'input input-sm mono',
            value: link.href,
            placeholder: 'https://facebook.com/…',
            'aria-label': 'URL',
            onInput: (event) => {
              link.href = event.target.value;
              doc.dirty = true;
              markDirty(doc, true);
            }
          }),
          h('input', {
            class: 'input input-sm mono',
            value: link.icon,
            placeholder: 'fab fa-facebook',
            'aria-label': 'Icon class',
            onInput: (event) => {
              link.icon = event.target.value;
              doc.dirty = true;
              markDirty(doc, true);
              const preview = links.querySelectorAll('.icon-preview i')[index];
              if (preview) preview.className = link.icon;
            }
          }),
          h(
            'button',
            {
              class: 'icon-btn',
              type: 'button',
              title: 'Remove link',
              onClick: () => {
                data.links.splice(index, 1);
                doc.dirty = true;
                markDirty(doc, true);
                redrawLinks();
              }
            },
            icon('trash', 14)
          )
        )
      );
    });
    if (!data.links.length) links.append(h('div', { class: 'muted small' }, 'No social links yet.'));
  }
  redrawLinks();

  const headingInput = h('input', {
    class: 'input',
    value: data.headingText,
    onInput: (event) => {
      data.headingText = event.target.value;
      doc.dirty = true;
      markDirty(doc, true);
    }
  });
  const introInput = h('input', {
    class: 'input',
    value: data.intro,
    onInput: (event) => {
      data.intro = event.target.value;
      doc.dirty = true;
      markDirty(doc, true);
    }
  });

  return h(
    'div',
    { class: 'stack' },
    h('div', { class: 'form-grid' }, labelled('Section heading', headingInput), labelled('Intro line', introInput)),
    h(
      'div',
      null,
      h('div', { class: 'list-label' }, 'Social links'),
      links,
      h(
        'button',
        {
          class: 'btn btn-sm',
          style: 'margin-top:10px',
          type: 'button',
          onClick: () => {
            data.links.push({ label: '', href: '', icon: 'fab fa-facebook', target: '_blank' });
            doc.dirty = true;
            markDirty(doc, true);
            redrawLinks();
          }
        },
        icon('plus', 14),
        'Add social link'
      )
    )
  );
}

function footerEditor(doc) {
  const data = doc.data;
  const copyrightInput = h('input', {
    class: 'input',
    value: data.copyrightText,
    onInput: (event) => {
      data.copyrightText = event.target.value;
      data.copyrightHtml = `©<span id="year"></span> ${event.target.value}`;
      doc.dirty = true;
      markDirty(doc, true);
    }
  });

  const links = h('div', { class: 'stack-sm' });
  function redrawLinks() {
    clear(links);
    data.links.forEach((link, index) => {
      links.append(
        h(
          'div',
          { class: 'social-row' },
          h('input', {
            class: 'input input-sm',
            value: link.label,
            placeholder: 'Privacy Policy',
            onInput: (event) => {
              link.label = event.target.value;
              doc.dirty = true;
              markDirty(doc, true);
            }
          }),
          h('input', {
            class: 'input input-sm mono',
            value: link.href,
            placeholder: 'PrivacyPolicy',
            onInput: (event) => {
              link.href = event.target.value;
              doc.dirty = true;
              markDirty(doc, true);
            }
          }),
          h(
            'button',
            {
              class: 'icon-btn',
              type: 'button',
              title: 'Remove link',
              onClick: () => {
                data.links.splice(index, 1);
                doc.dirty = true;
                markDirty(doc, true);
                redrawLinks();
              }
            },
            icon('trash', 14)
          )
        )
      );
    });
  }
  redrawLinks();

  return h(
    'div',
    { class: 'stack' },
    labelled('Copyright text', copyrightInput, 'The year is filled in automatically.'),
    h(
      'div',
      null,
      h('div', { class: 'list-label' }, 'Footer links'),
      links,
      h(
        'button',
        {
          class: 'btn btn-sm',
          style: 'margin-top:10px',
          type: 'button',
          onClick: () => {
            data.links.push({ label: '', href: '' });
            doc.dirty = true;
            markDirty(doc, true);
            redrawLinks();
          }
        },
        icon('plus', 14),
        'Add footer link'
      )
    )
  );
}

function labelled(label, input, hint) {
  return h('label', { class: 'mini-field' }, h('span', null, label), input, hint ? h('span', { class: 'hint' }, hint) : null);
}

async function reloadTab(key) {
  const doc = docs[key];
  if (!doc) return;
  if (doc.dirty) {
    const ok = await confirmDialog({
      title: 'Reload this section?',
      message: 'Unsaved edits will be discarded.',
      confirmLabel: 'Reload',
      danger: true
    });
    if (!ok) return;
  }
  delete docs[key];
  const panel = container?.querySelector('.tab-panel');
  if (panel) {
    clear(panel);
    panel.append(loadingView());
  }
  await loadAll();
}

async function saveTab(key) {
  const doc = docs[key];
  if (!doc) return;
  try {
    const html =
      key === 'navbar'
        ? serializeNavbar(doc.data.items.filter((item) => (item.label || '').trim() || (item.href || '').trim()))
        : key === 'social'
          ? serializeSocial(doc.data)
          : serializeFooter(doc.data);
    stage({
      path: doc.path,
      text: html,
      originalText: doc.html,
      originalSha: doc.sha,
      size: html.length
    });
    doc.dirty = false;
    doc.isDraft = true;
    renderTabs();
    renderTab();
    toast(`${TABS.find((tab) => tab.id === key).label} saved as a draft`, { type: 'success' });
  } catch (error) {
    toast(error.message, { type: 'error', title: 'Could not save' });
  }
}

async function saveAll() {
  const dirtyKeys = Object.keys(docs).filter((key) => docs[key]?.dirty);
  if (!dirtyKeys.length) {
    toast('No changes to save', { type: 'info', timeout: 1600 });
    return;
  }
  for (const key of dirtyKeys) await saveTab(key);
}
