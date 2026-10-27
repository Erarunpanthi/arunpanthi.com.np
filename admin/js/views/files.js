import {
  h,
  icon,
  clear,
  pageHead,
  toast,
  confirmDialog,
  promptDialog,
  openModal,
  spinner,
  badge,
  formatBytes,
  timeAgo,
  copyText,
  downloadBlob,
  isImagePath,
  isPdfPath,
  isMediaPath,
  languageForPath,
  fileIconName,
  emptyState,
  notice,
  loadingView
} from '../ui.js';
import {
  state,
  treeFiles,
  findFile,
  stage,
  unstage,
  stagedFor,
  publicUrl
} from '../store.js';
import * as api from '../api.js';
import { createCodeEditor } from '../lib/code-editor.js';

let ctxRef = null;
let treeScroll = null;
let pane = null;
let searchInput = null;
let editor = null;
let loaded = null;
let dirty = false;
let filter = '';
let currentPath = '';
let expanded = new Set(['partials', 'Psc-preparation', 'Resources', 'NEC-license-preparation']);
let objectUrl = null;
let replaceInput = null;

const TEMPLATES = {
  html: (title) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" href="/css/styles.css">
</head>
<body>
  <div id="navbar"></div>

  <main class="container">
    <h1>${title}</h1>
  </main>

  <div id="social-section"></div>
  <div id="footer"></div>
  <script src="/js/layout.js" defer></script>
</body>
</html>
`,
  css: () => `/* ${titleFromPath(currentPath) || 'New stylesheet'} */\n\n`,
  js: () => `/* ${titleFromPath(currentPath) || 'New script'} */\n\n`,
  json: () => `{}\n`,
  text: () => ''
};

function titleFromPath(path) {
  const name = String(path || '').split('/').pop() || '';
  return name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function mimeFor(path) {
  if (/\.png$/i.test(path)) return 'image/png';
  if (/\.jpe?g$/i.test(path)) return 'image/jpeg';
  if (/\.webp$/i.test(path)) return 'image/webp';
  if (/\.gif$/i.test(path)) return 'image/gif';
  if (/\.svg$/i.test(path)) return 'image/svg+xml';
  if (/\.ico$/i.test(path)) return 'image/x-icon';
  if (/\.pdf$/i.test(path)) return 'application/pdf';
  return 'application/octet-stream';
}

function allFiles() {
  const files = treeFiles();
  for (const change of state.staged.values()) {
    if (change.action === 'create' && change.text !== undefined && !files.some((file) => file.path === change.path)) {
      files.push({ path: change.path, type: 'file', size: change.text.length, sha: null, staged: true });
    }
  }
  return files;
}

export async function render(root, ctx) {
  destroy({ keepRoot: true });
  ctxRef = ctx;
  if (!state.tree) await ctx.refreshTree({ silent: true });

  root.append(
    pageHead('Files', 'Browse, edit and publish any file in the repository.', [
      h('button', { class: 'btn', type: 'button', onClick: openFileDialog }, icon('plus', 16), 'New file'),
      h('button', { class: 'btn', type: 'button', onClick: () => ctx.navigate('uploads') }, icon('upload', 16), 'Upload')
    ])
  );

  searchInput = h('input', {
    class: 'input input-sm',
    type: 'search',
    placeholder: 'Search files…',
    value: filter,
    onInput: (event) => {
      filter = event.target.value;
      renderTree();
    }
  });

  treeScroll = h('div', { class: 'tree-scroll' });
  const treeCard = h(
    'aside',
    { class: 'card tree-card' },
    h('div', { class: 'tree-search' }, searchInput),
    treeScroll,
    h(
      'div',
      { class: 'tree-foot' },
      h('span', { class: 'tiny muted grow' }, `${allFiles().length} files`),
      h(
        'button',
        {
          class: 'icon-btn',
          type: 'button',
          title: 'Reload from GitHub',
          'aria-label': 'Reload from GitHub',
          onClick: async () => {
            await ctx.refreshTree({ force: true });
            renderTree();
          }
        },
        icon('refresh', 15)
      )
    )
  );

  pane = h('div', { class: 'file-view' });
  root.append(h('div', { class: 'files-layout' }, treeCard, pane));

  renderTree();
  renderWelcome();

  state.saveHandler = saveDraft;
  state.leaveGuard = async () => {
    if (!dirty) return true;
    return confirmDialog({
      title: 'Discard unsaved changes?',
      message: `“${currentPath}” has edits that have not been saved as a draft.`,
      confirmLabel: 'Discard edits',
      danger: true
    });
  };

  if (ctx.query.path) await openFile(ctx.query.path);
}

export function destroy({ keepRoot = false } = {}) {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }
  editor?.destroy?.();
  editor = null;
  loaded = null;
  dirty = false;
  replaceInput?.remove();
  replaceInput = null;
  if (state.saveHandler === saveDraft) state.saveHandler = null;
  state.leaveGuard = null;
  if (!keepRoot) {
    pane = null;
    treeScroll = null;
    ctxRef = null;
  }
}

/* ------------------------------------------------------------------ */
/* tree                                                               */
/* ------------------------------------------------------------------ */

function buildModel() {
  const rootNode = { dirs: new Map(), files: [] };
  for (const file of allFiles()) {
    const parts = file.path.split('/');
    let node = rootNode;
    for (let index = 0; index < parts.length - 1; index++) {
      const dirPath = parts.slice(0, index + 1).join('/');
      if (!node.dirs.has(parts[index])) {
        node.dirs.set(parts[index], { name: parts[index], path: dirPath, dirs: new Map(), files: [] });
      }
      node = node.dirs.get(parts[index]);
    }
    node.files.push({ ...file, name: parts[parts.length - 1] });
  }
  return rootNode;
}

function renderTree() {
  if (!treeScroll) return;
  clear(treeScroll);

  if (filter.trim()) {
    const needle = filter.trim().toLowerCase();
    const matches = allFiles()
      .filter((file) => file.path.toLowerCase().includes(needle))
      .sort((a, b) => a.path.localeCompare(b.path))
      .slice(0, 400);
    if (!matches.length) {
      treeScroll.append(h('div', { class: 'tree-empty' }, 'No files match that search.'));
      return;
    }
    for (const file of matches) treeScroll.append(fileRow(file, 0, file.path));
    return;
  }

  const rootNode = buildModel();
  const dirs = [...rootNode.dirs.values()].sort((a, b) => a.name.localeCompare(b.name));
  const files = [...rootNode.files].sort((a, b) => a.name.localeCompare(b.name));
  for (const dir of dirs) renderDir(dir, 0);
  for (const file of files) treeScroll.append(fileRow(file, 0, file.name));
}

function renderDir(node, depth) {
  const isOpen = expanded.has(node.path);
  const row = h(
    'button',
    {
      class: 'tree-row dir',
      type: 'button',
      style: `padding-left:${6 + depth * 14}px`,
      onClick: () => {
        if (expanded.has(node.path)) expanded.delete(node.path);
        else expanded.add(node.path);
        renderTree();
      }
    },
    h('span', { class: 'twisty' }, icon(isOpen ? 'chevron-down' : 'chevron-right', 13)),
    icon('folder', 15),
    h('span', { class: 'file-label' }, node.name)
  );
  treeScroll.append(row);
  if (!isOpen) return;
  const dirs = [...node.dirs.values()].sort((a, b) => a.name.localeCompare(b.name));
  const files = [...node.files].sort((a, b) => a.name.localeCompare(b.name));
  for (const dir of dirs) renderDir(dir, depth + 1);
  for (const file of files) treeScroll.append(fileRow(file, depth + 1, file.name));
}

function fileRow(file, depth, label) {
  const change = stagedFor(file.path);
  return h(
    'button',
    {
      class: `tree-row ${currentPath === file.path ? 'active' : ''}`,
      type: 'button',
      title: file.path,
      style: `padding-left:${6 + depth * 14}px`,
      onClick: () => requestOpenFile(file.path)
    },
    h('span', { class: 'twisty' }),
    icon(fileIconName(file.path), 14),
    h('span', { class: 'file-label' }, label),
    change ? h('span', { class: 'staged-dot', title: 'Pending change' }) : null
  );
}

function expandFor(path) {
  const parts = path.split('/');
  for (let index = 1; index < parts.length; index++) {
    expanded.add(parts.slice(0, index).join('/'));
  }
}

async function requestOpenFile(path) {
  if (path === currentPath) return;
  if (dirty) {
    const ok = await confirmDialog({
      title: 'Discard unsaved edits?',
      message: `Changes to “${currentPath}” are not saved as a draft yet.`,
      confirmLabel: 'Discard edits',
      danger: true
    });
    if (!ok) return;
  }
  await openFile(path);
}

/* ------------------------------------------------------------------ */
/* welcome                                                            */
/* ------------------------------------------------------------------ */

function renderWelcome() {
  if (!pane) return;
  clear(pane);
  pane.append(
    h(
      'div',
      { class: 'card' },
      h(
        'div',
        { class: 'card-body' },
        emptyState({
          iconName: 'file-text',
          title: 'Pick a file to start editing',
          message: 'Every HTML page, stylesheet, script and JSON file in the repository is editable here. Changes are held as drafts until you publish.'
        }),
        h(
          'div',
          { class: 'quick-grid', style: 'margin-top:22px' },
          quickFile('Homepage', 'index.html'),
          quickFile('Navbar', state.config.paths.navbar),
          quickFile('Footer', state.config.paths.footer),
          quickFile('Current affairs', state.config.paths.currentAffairs),
          quickFile('Practice test index', state.config.paths.practiceTestIndex),
          quickFile('Sitemap', state.config.paths.sitemap)
        )
      )
    )
  );
}

function quickFile(label, path) {
  return h(
    'button',
    { class: 'quick-action', type: 'button', onClick: () => requestOpenFile(path) },
    h('span', { class: 'qa-icon' }, icon(fileIconName(path), 18)),
    h('span', null, h('strong', null, label), h('span', { class: 'mono', style: 'font-size:11px' }, path))
  );
}

/* ------------------------------------------------------------------ */
/* open + render file                                                 */
/* ------------------------------------------------------------------ */

async function openFile(path) {
  if (!pane) return;
  currentPath = path;
  expandFor(path);
  renderTree();
  ctxRef?.setQuery?.({ path });
  clear(pane);
  pane.append(loadingView('Loading ' + path + '…'));

  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }
  editor?.destroy?.();
  editor = null;
  loaded = null;
  dirty = false;

  const change = stagedFor(path);
  const inRepo = !!findFile(path);

  try {
    let file;
    if (inRepo) {
      file = await api.getFile(path);
    } else if (change && (change.text !== undefined || change.base64 !== undefined)) {
      file = {
        path,
        text: change.text !== undefined ? change.text : null,
        base64: change.base64 || null,
        isBinary: change.text === undefined,
        size: change.size || (change.text?.length || 0),
        sha: null,
        language: languageForPath(path)
      };
    } else {
      throw new Error('This file is not in the repository yet');
    }

    if (change?.delete) {
      clear(pane);
      pane.append(
        h(
          'div',
          { class: 'card' },
          h(
            'div',
            { class: 'card-body' },
            notice(
              h('div', null, h('strong', null, 'This file is staged for deletion. '), 'Publish the changes to remove it, or undo below.'),
              'danger',
              'trash'
            ),
            h(
              'button',
              { class: 'btn', style: 'margin-top:12px', type: 'button', onClick: () => { unstage(path); openFile(path); } },
              icon('rotate', 15),
              'Undo deletion'
            )
          )
        )
      );
      return;
    }

    const publishedText = file.isBinary ? null : file.text;
    const displayText = change?.text !== undefined ? change.text : publishedText;
    const baseline = displayText ?? '';

    loaded = {
      path,
      isBinary: file.isBinary,
      originalText: publishedText ?? '',
      publishedBase64: file.base64 || null,
      sha: file.sha,
      size: file.size,
      baseline,
      inRepo
    };

    clear(pane);
    pane.append(buildHeader(file));
    if (file.isBinary) {
      pane.append(buildBinaryPane(file, change));
    } else if (displayText === null) {
      pane.append(
        h('div', { class: 'card' }, h('div', { class: 'card-body' }, notice('This file is too large to edit in the browser. Download it instead.', 'warn', 'alert')))
      );
    } else {
      pane.append(buildTextPane(displayText, baseline));
    }
    updateDirtyIndicator();
  } catch (error) {
    clear(pane);
    pane.append(
      h(
        'div',
        { class: 'card' },
        h(
          'div',
          { class: 'card-body' },
          emptyState({
            iconName: 'alert',
            title: 'Could not open this file',
            message: error.message,
            actionLabel: 'Back to overview',
            onAction: renderWelcome
          })
        )
      )
    );
  }
}

function buildHeader(file) {
  const change = stagedFor(file.path);
  const badges = h('span', { class: 'row-wrap', id: 'file-badges' });
  if (change) badges.append(badge(change.delete ? 'Staged delete' : change.action === 'create' ? 'New draft' : 'Staged edit', change.delete ? 'danger' : 'warn'));
  if (file.isBinary) badges.append(badge('Binary', ''));
  badges.append(badge(languageForPath(file.path).toUpperCase(), 'info'));

  const header = h(
    'div',
    { class: 'file-head' },
    h(
      'div',
      { class: 'file-title' },
      h('h2', null, icon(fileIconName(file.path), 18), file.path.split('/').pop(), badges),
      h('div', { class: 'path' }, file.path)
    ),
    h(
      'div',
      { class: 'file-actions' },
      h('button', { class: 'btn btn-sm', type: 'button', onClick: () => openHistory(file.path) }, icon('clock', 14), 'History'),
      h(
        'button',
        {
          class: 'btn btn-sm btn-icon',
          type: 'button',
          title: 'Copy public URL',
          'aria-label': 'Copy public URL',
          onClick: () => copyText(publicUrl(file.path))
        },
        icon('link', 15)
      ),
      h(
        'button',
        {
          class: 'btn btn-sm btn-icon',
          type: 'button',
          title: 'Download file',
          'aria-label': 'Download file',
          onClick: () => downloadCurrent(file)
        },
        icon('download', 15)
      ),
      h('button', { class: 'btn btn-sm btn-icon', type: 'button', title: 'Rename or move', 'aria-label': 'Rename or move', onClick: () => renameFile(file.path) }, icon('edit', 15)),
      h('button', { class: 'btn btn-sm btn-icon btn-danger', type: 'button', title: 'Delete file', 'aria-label': 'Delete file', onClick: () => deleteFile(file.path) }, icon('trash', 15))
    )
  );
  return header;
}

function buildTextPane(text, baseline) {
  const wrapButton = h(
    'button',
    { class: 'btn btn-sm btn-ghost', type: 'button' },
    icon('code', 14),
    'Wrap'
  );
  const findButton = h(
    'button',
    { class: 'btn btn-sm btn-ghost', type: 'button', onClick: () => editor?.openFind() },
    icon('search', 14),
    'Find'
  );
  const resetButton = h(
    'button',
    { class: 'btn btn-sm', type: 'button' },
    icon('rotate', 14),
    'Reset'
  );
  const saveButton = h(
    'button',
    { class: 'btn btn-sm btn-primary', type: 'button', onClick: () => saveDraft() },
    icon('save', 14),
    'Save draft'
  );

  const toolbar = h(
    'div',
    { class: 'editor-toolbar' },
    badge(languageForPath(currentPath).toUpperCase(), 'info'),
    wrapButton,
    findButton,
    h('span', { class: 'spacer' }),
    resetButton,
    saveButton
  );

  const caretEl = h('span', null, 'Ln 1, Col 1');
  const dirtyEl = h('span', { class: 'dirty', hidden: true }, 'Unsaved edits');
  const sizeEl = h('span', null, formatBytes(text.length));
  const status = h('div', { class: 'editor-status' }, caretEl, sizeEl, h('span', null, 'UTF-8'), dirtyEl, h('span', { class: 'grow' }), h('span', { class: 'mono' }, currentPath));

  editor = createCodeEditor({
    value: text,
    language: languageForPath(currentPath),
    onChange: () => {
      dirty = editor && editor.getValue() !== loaded?.baseline;
      updateDirtyIndicator();
      sizeEl.textContent = formatBytes(editor ? editor.getValue().length : 0);
    },
    onCaret: (caret) => {
      caretEl.textContent = `Ln ${caret.line}, Col ${caret.column}`;
    }
  });

  wrapButton.addEventListener('click', () => {
    editor.element.classList.toggle('wrap');
    wrapButton.classList.toggle('btn-soft');
  });
  resetButton.addEventListener('click', async () => {
    if (!editor || !loaded) return;
    const ok = await confirmDialog({
      title: 'Reset this editor?',
      message: 'The editor goes back to the last saved draft (or the published file if nothing is saved).',
      confirmLabel: 'Reset editor'
    });
    if (!ok) return;
    editor.setValue(loaded.baseline, { silent: true });
    dirty = false;
    updateDirtyIndicator();
    toast('Editor reset', { type: 'info', timeout: 1800 });
  });

  if (baseline === '') saveButton.disabled = true;

  return h('div', { class: 'editor-frame' }, toolbar, editor.element, status);
}

function buildBinaryPane(file, change) {
  const preview = h('div', { class: 'binary-preview' });
  const url = h('div', { class: 'file-meta' });
  const actions = h('div', { class: 'row-wrap' });

  replaceInput = h('input', { type: 'file', hidden: true });
  replaceInput.addEventListener('change', () => handleReplace(file));

  actions.append(
    h('button', { class: 'btn btn-primary', type: 'button', onClick: () => replaceInput.click() }, icon('upload', 16), 'Replace file'),
    h(
      'button',
      { class: 'btn', type: 'button', onClick: () => window.open(publicUrl(file.path), '_blank', 'noopener') },
      icon('external', 15),
      'Open published file'
    )
  );

  if (change?.base64) {
    const src = `data:${mimeFor(file.path)};base64,${change.base64}`;
    renderBinaryPreview(preview, file.path, src);
    url.append(h('span', { class: 'small muted' }, 'Showing your staged replacement'));
  } else if (file.isBinary && loaded?.inRepo) {
    preview.append(spinner(20), h('span', { class: 'small muted' }, 'Loading preview…'));
    api
      .fileObjectUrl(file.path)
      .then(({ url: blobUrl }) => {
        objectUrl = blobUrl;
        clear(preview);
        renderBinaryPreview(preview, file.path, blobUrl);
      })
      .catch(() => {
        clear(preview);
        preview.append(h('span', { class: 'small muted' }, 'Preview unavailable — download the file instead.'));
      });
  } else {
    preview.append(h('span', { class: 'small muted' }, 'New binary file'));
  }

  return h(
    'div',
    { class: 'editor-frame' },
    h('div', { class: 'editor-toolbar' }, badge(formatBytes(file.size || (change?.base64?.length || 0) * 0.75), ''), h('span', { class: 'spacer' }), actions, replaceInput),
    preview,
    h('div', { class: 'editor-status' }, h('span', null, file.path), h('span', { class: 'grow' }), url)
  );
}

function renderBinaryPreview(container, path, src) {
  if (isImagePath(path)) {
    container.append(h('img', { src, alt: path }));
  } else if (isPdfPath(path)) {
    container.append(h('iframe', { src, title: 'PDF preview' }));
  } else if (isMediaPath(path)) {
    container.append(
      /\.(mp4|webm)$/i.test(path)
        ? h('video', { src, controls: true, style: 'max-width:100%;border-radius:10px' })
        : h('audio', { src, controls: true })
    );
  } else {
    container.append(
      icon('file', 34),
      h('span', { class: 'small muted' }, 'No inline preview for this file type.')
    );
  }
}

function updateDirtyIndicator() {
  const dirtyEl = pane?.querySelector('.editor-status .dirty');
  if (dirtyEl) dirtyEl.hidden = !dirty;
  const saveButton = pane?.querySelector('.editor-toolbar .btn-primary');
  if (saveButton) saveButton.disabled = !dirty;
}

function saveDraft() {
  if (!loaded || !editor || loaded.isBinary) return;
  const text = editor.getValue();
  if (text === loaded.baseline) {
    toast('No changes to save', { type: 'info', timeout: 1800 });
    return;
  }
  stage({
    path: loaded.path,
    text,
    originalText: loaded.originalText,
    originalSha: loaded.sha,
    size: text.length
  });
  loaded.baseline = text;
  dirty = false;
  updateDirtyIndicator();
  refreshHeaderBadges();
  toast('Saved to pending changes', { type: 'success', timeout: 2400 });
}

function refreshHeaderBadges() {
  const wrap = pane?.querySelector('#file-badges');
  if (!wrap) return;
  const change = stagedFor(currentPath);
  clear(wrap);
  if (change) wrap.append(badge(change.action === 'create' ? 'New draft' : 'Staged edit', 'warn'));
  if (loaded?.isBinary) wrap.append(badge('Binary', ''));
  wrap.append(badge(languageForPath(currentPath).toUpperCase(), 'info'));
}

/* ------------------------------------------------------------------ */
/* actions                                                            */
/* ------------------------------------------------------------------ */

async function downloadCurrent(file) {
  try {
    if (stagedFor(file.path)?.base64) {
      const change = stagedFor(file.path);
      const bytes = Uint8Array.from(atob(change.base64), (char) => char.charCodeAt(0));
      downloadBlob(new Blob([bytes], { type: mimeFor(file.path) }), file.path.split('/').pop());
      return;
    }
    const blob = await api.downloadFileBlob(file.path);
    downloadBlob(blob, file.path.split('/').pop());
  } catch (error) {
    toast(error.message, { type: 'error' });
  }
}

async function handleReplace(file) {
  const picked = replaceInput?.files?.[0];
  if (!picked) return;
  const limit = (state.health?.limits?.maxUploadMB || state.config.maxUploadMB || 25) * 1024 * 1024;
  if (picked.size > limit) {
    toast(`Files must be smaller than ${formatBytes(limit)}`, { type: 'error' });
    return;
  }
  try {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        resolve(result.slice(result.indexOf(',') + 1));
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(picked);
    });
    stage({ path: file.path, base64, size: picked.size, originalText: undefined, originalSha: loaded?.sha });
    toast('Replacement staged — publish to upload it', { type: 'success' });
    await openFile(file.path);
  } catch (error) {
    toast(error.message, { type: 'error' });
  } finally {
    if (replaceInput) replaceInput.value = '';
  }
}

async function openFileDialog() {
  const pathInput = h('input', { class: 'input', placeholder: 'e.g. Psc-preparation/Test/1.2-3.html' });
  const templateSelect = h(
    'select',
    { class: 'select' },
    h('option', { value: 'html' }, 'HTML page'),
    h('option', { value: 'css' }, 'Stylesheet'),
    h('option', { value: 'js' }, 'JavaScript'),
    h('option', { value: 'json' }, 'JSON'),
    h('option', { value: 'text' }, 'Empty text file')
  );
  openModal({
    title: 'New file',
    subtitle: 'Folders are created automatically when you publish.',
    content: h(
      'div',
      { class: 'stack-sm' },
      h('label', { class: 'label' }, 'File path'),
      pathInput,
      h('label', { class: 'label' }, 'Start with'),
      templateSelect
    ),
    actions: [
      { label: 'Cancel', variant: 'ghost' },
      {
        label: 'Create draft',
        variant: 'primary',
        iconName: 'plus',
        onClick: async () => {
          const raw = pathInput.value.trim().replace(/^\/+/, '');
          if (!raw) {
            toast('Enter a file path', { type: 'warn' });
            return false;
          }
          if (raw.includes('..') || raw.includes('\\')) {
            toast('Invalid path', { type: 'error' });
            return false;
          }
          if (findFile(raw) || stagedFor(raw)) {
            toast('That file already exists', { type: 'error' });
            return false;
          }
          const type = templateSelect.value;
          const extension = type === 'text' ? '' : '.' + type;
          const finalPath = /\.[a-z0-9]{1,8}$/i.test(raw) ? raw : raw + extension;
          currentPath = finalPath;
          const content = TEMPLATES[type] ? TEMPLATES[type](titleFromPath(finalPath)) : '';
          stage({ path: finalPath, text: content, originalText: '', size: content.length });
          toast('Draft created — edit and publish when ready', { type: 'success' });
          await openFile(finalPath);
        }
      }
    ]
  });
  setTimeout(() => pathInput.focus(), 60);
}

async function renameFile(path) {
  const next = await promptDialog({
    title: 'Rename or move file',
    label: 'New path',
    value: path,
    hint: 'Include folders, for example “Photos/new-name.jpg”. Links on the site are not updated automatically.',
    confirmLabel: 'Stage rename'
  });
  if (!next) return;
  const clean = next.trim().replace(/^\/+/, '').replace(/\\/g, '/');
  if (!clean || clean === path) return;
  if (clean.includes('..') || findFile(clean) || stagedFor(clean)) {
    toast('That path is not available', { type: 'error' });
    return;
  }
  try {
    const change = stagedFor(path);
    let base64 = change?.base64;
    let text = change?.text;
    if (text === undefined && base64 === undefined) {
      const file = await api.getFile(path);
      if (file.isBinary) base64 = file.base64;
      else text = file.text;
    }
    if (text !== undefined) {
      stage({ path: clean, text, originalText: '', size: text.length });
    } else {
      stage({ path: clean, base64, size: loaded?.size || 0, originalText: undefined });
    }
    if (findFile(path)) stage({ path, delete: true, originalText: loaded?.originalText });
    else unstage(path);
    toast('Rename staged', { type: 'success' });
    dirty = false;
    await openFile(clean);
  } catch (error) {
    toast(error.message, { type: 'error', title: 'Rename failed' });
  }
}

async function deleteFile(path) {
  const ok = await confirmDialog({
    title: 'Delete this file?',
    message: `“${path}” will be removed from the website when you publish.`,
    confirmLabel: 'Stage deletion',
    danger: true
  });
  if (!ok) return;
  if (findFile(path)) {
    stage({ path, delete: true, originalText: loaded?.originalText });
  } else {
    unstage(path);
  }
  dirty = false;
  toast('Deletion staged', { type: 'success' });
  currentPath = '';
  ctxRef?.setQuery?.({});
  renderTree();
  renderWelcome();
}

async function openHistory(path) {
  const modal = openModal({
    title: 'File history',
    subtitle: path,
    size: 'lg',
    content: loadingView('Loading commits…')
  });
  try {
    const data = await api.getCommits({ path, perPage: 20 });
    const commits = data.commits || [];
    clear(modal.body);
    if (!commits.length) {
      modal.body.append(h('div', { class: 'muted' }, 'No commit history found for this path.'));
      return;
    }
    modal.body.append(
      h(
        'div',
        { class: 'timeline' },
        commits.map((commit) =>
          h(
            'div',
            { class: 'timeline-item' },
            h('span', { class: 'timeline-dot' }, icon('branch', 14)),
            h(
              'div',
              { class: 'timeline-body' },
              h('strong', null, commit.message || '(no message)'),
              h('span', null, `${commit.author?.name || 'Unknown'} · ${timeAgo(commit.author?.date)} · ${commit.shortSha}`)
            ),
            h(
              'button',
              {
                class: 'btn btn-sm',
                type: 'button',
                onClick: async () => {
                  try {
                    const file = await api.getFile(path, commit.sha);
                    const ok = await confirmDialog({
                      title: 'Load this version?',
                      message: 'The editor will show this older version. Save it as a draft to restore it on the site.',
                      confirmLabel: 'Load version'
                    });
                    if (!ok) return;
                    modal.close();
                    if (file.isBinary) {
                      stage({ path, base64: file.base64, size: file.size, originalText: undefined });
                      toast('Older version staged', { type: 'success' });
                      await openFile(path);
                    } else {
                      if (!editor) {
                        await openFile(path);
                      }
                      editor?.setValue(file.text, { silent: true });
                      dirty = true;
                      updateDirtyIndicator();
                      toast('Older version loaded — save as a draft to keep it', { type: 'info' });
                    }
                  } catch (error) {
                    toast(error.message || 'That version is not available', { type: 'error' });
                  }
                }
              },
              icon('rotate', 14),
              'Load'
            ),
            commit.htmlUrl
              ? h('a', { class: 'icon-btn', href: commit.htmlUrl, target: '_blank', rel: 'noopener', title: 'Open commit' }, icon('external', 14))
              : null
          )
        )
      )
    );
  } catch (error) {
    clear(modal.body);
    modal.body.append(h('div', { class: 'notice danger' }, icon('alert', 16), error.message));
  }
}
