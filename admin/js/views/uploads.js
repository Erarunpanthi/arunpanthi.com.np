import {
  h,
  icon,
  clear,
  pageHead,
  toast,
  badge,
  formatBytes,
  slugify,
  withBusy
} from '../ui.js';
import { state, treeFiles, stage, stagedFor, publicUrl } from '../store.js';
import { optimizeImage, isOptimizableImage, readFileAsBase64 } from '../lib/image.js';

let ctxRef = null;
let dropEl = null;
let queueEl = null;
let folderSelect = null;
let optimizeInput = null;
let fileInput = null;
let queue = [];
let ctxIndex = 0;

const ACCEPT = 'image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.zip,.json,.html,.css,.js';
const BLOCKED = /\.(exe|msi|bat|cmd|com|scr|jar|dll|so|dylib|bin|apk|dmg|iso|vbs|ps1)$/i;

function folders() {
  const configured = state.config.uploadFolders || ['Photos'];
  return [...new Set(['Photos', ...configured, ''])];
}

function limitBytes() {
  return (state.health?.limits?.maxUploadMB || state.config.maxUploadMB || 25) * 1024 * 1024;
}

function pathTaken(path) {
  return treeFiles().some((file) => file.path === path) || !!stagedFor(path);
}

function splitName(fileName) {
  const dot = fileName.lastIndexOf('.');
  return dot > 0 ? { base: fileName.slice(0, dot), ext: fileName.slice(dot).toLowerCase() } : { base: fileName, ext: '' };
}

function uniquePath(folder, base, ext) {
  const cleanBase = slugify(base, 'file').slice(0, 80);
  let candidate = `${folder ? folder.replace(/\/+$/, '') + '/' : ''}${cleanBase}${ext}`;
  let counter = 2;
  while (pathTaken(candidate) || queue.some((item) => item.path === candidate)) {
    candidate = `${folder ? folder.replace(/\/+$/, '') + '/' : ''}${cleanBase}-${counter}${ext}`;
    counter += 1;
    if (counter > 200) break;
  }
  return candidate;
}

export async function render(root, ctx) {
  destroy();
  ctxRef = ctx;
  if (!state.tree) await ctx.refreshTree({ silent: true });

  root.append(pageHead('Uploads', 'Add images, PDFs and documents straight to the repository.', []));

  folderSelect = h(
    'select',
    { class: 'select', 'aria-label': 'Destination folder' },
    folders().map((folder) => h('option', { value: folder }, folder ? `/${folder}` : '/ (site root)'))
  );
  optimizeInput = h('input', { type: 'checkbox', checked: true, id: 'optimize-images' });
  optimizeInput.checked = true;

  fileInput = h('input', { type: 'file', multiple: true, accept: ACCEPT, hidden: true });
  fileInput.addEventListener('change', () => {
    addFiles([...fileInput.files]);
    fileInput.value = '';
  });

  const chooseButton = h('button', { class: 'btn btn-primary', type: 'button', onClick: () => fileInput.click() }, icon('upload', 16), 'Choose files');
  const cameraButton = h(
    'button',
    { class: 'btn', type: 'button', onClick: () => ctx.navigate('files', { path: 'Photos' }) },
    icon('folder', 16),
    'Browse upload folder'
  );

  dropEl = h(
    'div',
    {
      class: 'dropzone',
      tabindex: '0',
      role: 'button',
      'aria-label': 'Drop files here or press Enter to choose files',
      onClick: () => fileInput.click(),
      onKeydown: (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          fileInput.click();
        }
      }
    },
    h('div', { class: 'drop-icon' }, icon('upload', 26)),
    h('h3', null, 'Drop files here'),
    h('p', null, `or click to browse. Up to ${formatBytes(limitBytes())} per file.`),
    h('div', { class: 'row-wrap', style: 'justify-content:center' }, chooseButton, cameraButton)
  );

  dropEl.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropEl.classList.add('dragging');
  });
  dropEl.addEventListener('dragleave', () => dropEl.classList.remove('dragging'));
  dropEl.addEventListener('drop', (event) => {
    event.preventDefault();
    dropEl.classList.remove('dragging');
    const files = [...(event.dataTransfer?.files || [])];
    if (files.length) addFiles(files);
  });

  queueEl = h('div', { class: 'upload-queue' });

  root.append(fileInput);
  root.append(
    h(
      'div',
      { class: 'stack' },
      h(
        'div',
        { class: 'card' },
        h(
          'div',
          { class: 'card-head card-head-wrap' },
          h('h2', { class: 'panel-title' }, icon('folder', 17), 'Destination'),
          h('span', { class: 'small muted' }, 'Files keep their name; unsafe characters are replaced.')
        ),
        h(
          'div',
          { class: 'card-body' },
          h(
            'div',
            { class: 'upload-options' },
            h('div', { class: 'field' }, h('label', { class: 'label' }, 'Folder'), folderSelect),
            h(
              'label',
              { class: 'checkbox' },
              optimizeInput,
              h('span', null, 'Shrink large photos before uploading', h('span', { class: 'hint block' }, 'Resizes to 1800 px and re-compresses. Keeps the original if there is no gain.'))
            )
          )
        )
      ),
      dropEl,
      queueEl,
      h(
        'div',
        { class: 'card' },
        h('div', { class: 'card-head' }, h('h3', { class: 'panel-title' }, icon('info', 17), 'Where to use the files')),
        h(
          'div',
          { class: 'card-body' },
          h(
            'p',
            { class: 'small muted' },
            'After publishing, reference the file in a page with its relative path or copy the public URL. Images dropped into ',
            h('code', null, 'Photos'),
            ' are served from ',
            h('code', null, publicUrl('Photos/example.jpg')),
            '.'
          ),
          h(
            'div',
            { class: 'row-wrap' },
            h('button', { class: 'btn btn-sm', type: 'button', onClick: () => ctx.navigate('files') }, icon('code', 14), 'Open file editor'),
            h('button', { class: 'btn btn-sm', type: 'button', onClick: () => ctx.openPublish() }, icon('send', 14), 'Publish pending changes')
          )
        )
      )
    )
  );

  renderQueue();
}

export function destroy() {
  for (const item of queue) {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
  }
  queue = [];
  dropEl = null;
  queueEl = null;
  folderSelect = null;
  fileInput = null;
  optimizeInput = null;
  ctxRef = null;
}

/* ------------------------------------------------------------------ */

async function addFiles(files) {
  if (!files.length) return;
  const limit = limitBytes();
  const folder = folderSelect.value;
  let accepted = 0;

  for (const file of files) {
    const { base, ext } = splitName(file.name);
    if (BLOCKED.test(file.name)) {
      toast(`${file.name} is not an allowed file type`, { type: 'error' });
      continue;
    }
    if (file.size > limit) {
      toast(`${file.name} is ${formatBytes(file.size)} — the limit is ${formatBytes(limit)}`, { type: 'error' });
      continue;
    }
    if (file.size === 0) {
      toast(`${file.name} is empty`, { type: 'warn' });
      continue;
    }
    const item = {
      id: ++ctxIndex,
      file,
      name: base,
      ext,
      folder,
      blob: file,
      originalBytes: file.size,
      optimized: false,
      previewUrl: null,
      status: 'ready',
      path: ''
    };
    item.path = uniquePath(folder, base, ext);
    queue.push(item);
    accepted += 1;
    if (isOptimizableImage(file) && optimizeInput.checked) {
      item.status = 'optimizing';
      renderQueue();
      try {
        const result = await optimizeImage(file);
        if (result.changed) {
          item.blob = result.blob;
          item.optimized = true;
          item.optimizedBytes = result.blob.size;
        }
      } catch {
        /* keep the original on any failure */
      }
      item.status = 'ready';
    }
    if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(file.name)) {
      item.previewUrl = URL.createObjectURL(item.blob);
    }
    renderQueue();
  }

  if (accepted) toast(`${accepted} file${accepted === 1 ? '' : 's'} ready to upload`, { type: 'info', timeout: 2000 });
  renderQueue();
}

function renderQueue() {
  if (!queueEl) return;
  clear(queueEl);
  if (!queue.length) return;

  const total = queue.reduce((sum, item) => sum + (item.blob.size || 0), 0);

  const rows = queue.map((item) => {
    const thumb = item.previewUrl
      ? h('img', { class: 'upload-thumb', src: item.previewUrl, alt: '' })
      : h('span', { class: 'upload-thumb file' }, icon('file', 20));

    const nameInput = h('input', {
      class: 'input input-sm',
      value: item.name,
      'aria-label': 'File name',
      onInput: (event) => {
        item.name = event.target.value;
        item.path = uniquePath(item.folder, item.name || 'file', item.ext);
        pathEl.textContent = item.path;
      }
    });
    const pathEl = h('span', { class: 'tiny muted mono' }, item.path);

    return h(
      'div',
      { class: 'upload-row' },
      thumb,
      h(
        'div',
        { class: 'upload-fields' },
        h('div', { class: 'upload-name-row' }, nameInput, h('span', { class: 'upload-ext mono' }, item.ext)),
        pathEl,
        h(
          'div',
          { class: 'row-wrap tiny muted' },
          h('span', null, formatBytes(item.originalBytes)),
          item.optimized ? icon('arrow-right', 12) : null,
          item.optimized ? h('span', { class: 'good-text' }, formatBytes(item.blob.size)) : null,
          item.optimized ? badge('optimized', 'brand') : null,
          item.status === 'optimizing' ? h('span', null, 'Optimizing…') : null
        )
      ),
      h(
        'div',
        { class: 'upload-actions' },
        stagedFor(item.path)
          ? h('span', { class: 'small good-text row' }, icon('check-circle', 14), 'Staged')
          : null,
        h(
          'button',
          {
            class: 'icon-btn',
            type: 'button',
            title: 'Remove',
            'aria-label': 'Remove',
            onClick: () => {
              if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
              queue = queue.filter((entry) => entry.id !== item.id);
              renderQueue();
            }
          },
          icon('x', 15)
        )
      )
    );
  });

  const uploadButton = h(
    'button',
    { class: 'btn btn-primary', type: 'button', onClick: uploadAll },
    icon('upload', 16),
    `Add ${queue.length} file${queue.length === 1 ? '' : 's'} to pending changes`
  );

  queueEl.append(
    h(
      'div',
      { class: 'card upload-card' },
      h(
        'div',
        { class: 'card-head card-head-wrap' },
        h('h3', { class: 'panel-title' }, icon('upload', 17), `${queue.length} file${queue.length === 1 ? '' : 's'} ready`),
        h(
          'div',
          { class: 'row-wrap' },
          h('span', { class: 'small muted' }, formatBytes(total)),
          h(
            'button',
            {
              class: 'btn btn-sm btn-ghost',
              type: 'button',
              onClick: () => {
                for (const item of queue) if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
                queue = [];
                renderQueue();
              }
            },
            icon('trash', 14),
            'Clear'
          ),
          uploadButton
        )
      ),
      h('div', { class: 'card-body' }, h('div', { class: 'upload-list' }, rows))
    )
  );
}

async function uploadAll() {
  if (!queue.length) return;
  const items = queue.filter((item) => item.status !== 'optimizing');
  await withBusy(async () => {
    let staged = 0;
    for (const item of items) {
      try {
        const base64 = await readFileAsBase64(item.blob);
        stage({
          path: item.path,
          base64,
          size: item.blob.size,
          originalText: undefined
        });
        staged += 1;
        item.status = 'staged';
      } catch (error) {
        toast(`${item.path}: ${error.message}`, { type: 'error' });
      }
    }
    for (const item of queue) if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    queue = [];
    if (staged) {
      toast(`${staged} file${staged === 1 ? '' : 's'} added to pending changes — publish to see them online`, { type: 'success' });
      const folder = folderSelect?.value || 'Photos';
      if (folder) {
        ctxRef?.navigate('files', { path: `${folder.replace(/\/+$/, '')}` });
      }
    }
    renderQueue();
  });
}
