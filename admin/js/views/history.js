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
  formatBytes,
  timeAgo,
  downloadBlob
} from '../ui.js';
import { state, stage, repoLabel } from '../store.js';
import * as api from '../api.js';

let ctxRef = null;
let listEl = null;
let page = 1;
let commits = [];
let loading = false;
let hasMore = true;
let pathFilter = '';
const detailCache = new Map();

export async function render(root, ctx) {
  destroy();
  ctxRef = ctx;

  const pathInput = h('input', {
    class: 'input input-sm',
    type: 'search',
    placeholder: 'Filter by file path (optional)…',
    value: pathFilter,
    onInput: (event) => {
      pathFilter = event.target.value.trim();
    },
    onKeydown: (event) => {
      if (event.key === 'Enter') reload();
    }
  });

  root.append(
    pageHead('History & backups', 'Every change the panel has ever published, with one-click restores.', [
      h(
        'a',
        { class: 'btn', href: `https://github.com/${repoLabel()}/commits/${state.config.repo.branch}`, target: '_blank', rel: 'noopener' },
        icon('external', 15),
        'GitHub commits'
      ),
      h('button', { class: 'btn', type: 'button', onClick: downloadBackup }, icon('download', 16), 'Download backup')
    ])
  );

  listEl = h('div', { class: 'timeline history-list' });
  root.append(
    h(
      'div',
      { class: 'card' },
      h(
        'div',
        { class: 'card-head card-head-wrap' },
        h('h2', { class: 'panel-title' }, icon('clock', 17), 'Recent commits'),
        h(
          'div',
          { class: 'row-wrap' },
          pathInput,
          h('button', { class: 'btn btn-sm', type: 'button', onClick: reload }, icon('refresh', 14), 'Refresh')
        )
      ),
      h('div', { class: 'card-body' }, listEl)
    )
  );

  await reload();
}

export function destroy() {
  listEl = null;
  ctxRef = null;
  commits = [];
  page = 1;
  hasMore = true;
  detailCache.clear();
}

async function reload() {
  page = 1;
  commits = [];
  hasMore = true;
  detailCache.clear();
  await loadMore();
}

async function loadMore() {
  if (!listEl || loading || !hasMore) return;
  loading = true;
  if (!commits.length) {
    clear(listEl);
    listEl.append(loadingView('Loading commits…'));
  }
  try {
    const data = await api.getCommits({ page, perPage: 25, path: pathFilter || undefined });
    const batch = data.commits || [];
    commits = commits.concat(batch);
    hasMore = batch.length === 25;
    page += 1;
    renderList();
  } catch (error) {
    clear(listEl);
    listEl.append(notice(error.message, 'danger', 'alert'));
  } finally {
    loading = false;
  }
}

function renderList() {
  if (!listEl) return;
  clear(listEl);
  if (!commits.length) {
    listEl.append(
      emptyState({
        iconName: 'clock',
        title: 'No commits found',
        message: pathFilter ? `Nothing has changed in “${pathFilter}” yet.` : 'Publish something from the panel and it will appear here.'
      })
    );
    return;
  }

  commits.forEach((commit) => {
    const details = h('div', { class: 'commit-details', hidden: true });
    const row = h(
      'div',
      { class: 'timeline-item commit-row' },
      h('span', { class: 'timeline-dot' }, icon('branch', 14)),
      h(
        'div',
        { class: 'timeline-body' },
        h('strong', { class: 'commit-message' }, commit.message || '(no message)'),
        h(
          'span',
          { class: 'commit-meta' },
          `${commit.author?.name || commit.author?.login || 'Unknown'} · ${timeAgo(commit.author?.date)} · `,
          h('span', { class: 'mono' }, commit.shortSha)
        )
      ),
      h(
        'div',
        { class: 'row' },
        h('button', { class: 'btn btn-sm btn-ghost', type: 'button', onClick: () => toggleDetails(commit, details, button) }, 'Details'),
        commit.htmlUrl
          ? h('a', { class: 'icon-btn', href: commit.htmlUrl, target: '_blank', rel: 'noopener', title: 'Open on GitHub', 'aria-label': 'Open on GitHub' }, icon('external', 14))
          : null
      )
    );
    const button = row.querySelector('button');
    listEl.append(h('div', { class: 'commit-block' }, row, details));
  });

  if (hasMore) {
    listEl.append(
      h(
        'div',
        { class: 'row', style: 'justify-content:center;margin-top:6px' },
        h('button', { class: 'btn', type: 'button', onClick: () => loadMore() }, icon('chevron-down', 15), 'Load more')
      )
    );
  }
}

async function toggleDetails(commit, container, button) {
  if (!container.hidden) {
    container.hidden = true;
    button.textContent = 'Details';
    return;
  }
  container.hidden = false;
  button.textContent = 'Hide';
  if (container.dataset.loaded) return;

  container.append(loadingView('Loading files…'));
  try {
    let detail = detailCache.get(commit.sha);
    if (!detail) {
      const data = await api.getCommit(commit.sha);
      detail = data.commit;
      detailCache.set(commit.sha, detail);
    }
    clear(container);
    container.dataset.loaded = '1';
    const files = detail.files || [];
    if (!files.length) {
      container.append(h('div', { class: 'muted small' }, 'No file list available for this commit.'));
      return;
    }
    container.append(
      h(
        'div',
        { class: 'commit-files' },
        files.map((file) =>
          h(
            'div',
            { class: 'commit-file' },
            h(
              'div',
              { class: 'commit-file-head' },
              badge(file.status, file.status === 'removed' ? 'danger' : file.status === 'added' ? 'brand' : ''),
              h('span', { class: 'mono small grow' }, file.filename),
              h('span', { class: 'tiny muted' }, `+${file.additions || 0} −${file.deletions || 0}`),
              file.status !== 'removed'
                ? h(
                    'button',
                    {
                      class: 'btn btn-sm btn-ghost',
                      type: 'button',
                      onClick: () => restoreFile(file.filename, commit)
                    },
                    icon('rotate', 13),
                    'Restore'
                  )
                : null
            ),
            file.patch
              ? h(
                  'pre',
                  { class: 'patch' },
                  file.patch.split('\n').slice(0, 60).map((line) => h('span', { class: patchClass(line) }, line + '\n'))
                )
              : null
          )
        )
      )
    );
  } catch (error) {
    clear(container);
    container.append(notice(error.message, 'danger', 'alert'));
  }
}

function patchClass(line) {
  if (line.startsWith('+') && !line.startsWith('+++')) return 'add';
  if (line.startsWith('-') && !line.startsWith('---')) return 'del';
  if (line.startsWith('@@')) return 'hunk';
  return '';
}

async function restoreFile(path, commit) {
  const ok = await confirmDialog({
    title: 'Restore this file?',
    message: `“${path}” will be restored to its version from ${commit.shortSha}. This is staged as a draft — nothing changes on the site until you publish.`,
    confirmLabel: 'Stage restore'
  });
  if (!ok) return;
  try {
    const file = await api.getFile(path, commit.sha);
    if (file.isBinary) {
      stage({ path, base64: file.base64, size: file.size, originalText: undefined, originalSha: file.sha });
    } else {
      stage({ path, text: file.text, originalText: undefined, originalSha: file.sha, size: file.text.length });
    }
    toast(`${path} restored from ${commit.shortSha} — publish to apply`, { type: 'success' });
  } catch (error) {
    toast(error.message, { type: 'error', title: 'Restore failed' });
  }
}

async function downloadBackup() {
  try {
    toast('Preparing the backup archive…', { type: 'info', timeout: 2500 });
    const blob = await api.backup();
    const stamp = new Date().toISOString().slice(0, 10);
    downloadBlob(blob, `arunpanthi-backup-${stamp}.tar.gz`);
    toast(`Backup downloaded (${formatBytes(blob.size)})`, { type: 'success' });
  } catch (error) {
    toast(error.message, { type: 'error', title: 'Backup failed' });
  }
}
