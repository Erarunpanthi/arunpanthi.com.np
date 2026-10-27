/* Slide-over drawer listing everything staged for the next publish. */

import { h, icon, clear, formatBytes, badge, confirmDialog, toast, emptyState, isImagePath } from '../ui.js';
import { stagedChanges, stageSummary, unstage, clearStaged, isStaged } from '../store.js';
import { diffLines, compactDiff, diffStats } from '../lib/diff.js';

const ACTION_LABELS = { create: 'New', update: 'Updated', delete: 'Deleted' };

function mimeFor(path) {
  if (/\.png$/i.test(path)) return 'image/png';
  if (/\.jpe?g$/i.test(path)) return 'image/jpeg';
  if (/\.webp$/i.test(path)) return 'image/webp';
  if (/\.gif$/i.test(path)) return 'image/gif';
  if (/\.svg$/i.test(path)) return 'image/svg+xml';
  return 'application/octet-stream';
}

export function createStagingDrawer({ onPublish, onOpenFile } = {}) {
  const body = h('div', { class: 'drawer-body' });
  const subtitle = h('p', null, 'Review before publishing');
  const closeButton = h(
    'button',
    { class: 'icon-btn', 'aria-label': 'Close pending changes', onClick: () => close() },
    icon('x', 18)
  );
  const head = h('div', { class: 'drawer-head' }, h('div', { class: 'grow' }, h('h3', null, 'Pending changes'), subtitle), closeButton);

  const discardButton = h(
    'button',
    { class: 'btn', type: 'button', onClick: () => discardAll() },
    icon('trash', 16),
    'Discard'
  );
  const publishButton = h(
    'button',
    { class: 'btn btn-primary grow', type: 'button', onClick: () => onPublish && onPublish() },
    icon('send', 16),
    'Publish changes'
  );
  const foot = h('div', { class: 'drawer-foot' }, discardButton, publishButton);
  const drawer = h('aside', { class: 'drawer', 'aria-label': 'Pending changes' }, head, body, foot);
  const backdrop = h('div', { class: 'drawer-backdrop', onClick: () => close() });
  document.body.append(backdrop, drawer);

  function update() {
    const changes = stagedChanges();
    const summary = stageSummary();
    subtitle.textContent = changes.length
      ? `${summary.total} file${summary.total === 1 ? '' : 's'} ready to publish`
      : 'Nothing staged yet';
    discardButton.disabled = !changes.length;
    publishButton.disabled = !changes.length;
    clear(body);

    if (!changes.length) {
      body.append(
        emptyState({
          iconName: 'check-square',
          title: 'No pending changes',
          message: 'Edits you save from any screen are collected here. Nothing goes live until you press Publish.'
        })
      );
      return;
    }

    for (const change of changes) {
      body.append(buildChange(change));
    }
  }

  function buildChange(change) {
    const isBinary = change.delete === false && change.text === undefined;
    const action = change.delete ? 'delete' : change.action || 'update';
    const stats = !isBinary && !change.delete ? diffStats(diffLines(change.originalText || '', change.text || '')) : null;
    const meta = change.delete
      ? 'Will be removed'
      : isBinary
        ? formatBytes(change.size || Math.round((change.base64?.length || 0) * 0.75))
        : stats
          ? `${stats.added ? '+' + stats.added : ''}${stats.added && stats.removed ? ' ' : ''}${stats.removed ? '−' + stats.removed : ''} lines`
          : 'Changed';

    const bodyEl = h('div', { class: 'change-body', hidden: true });
    let rendered = false;

    const item = h('div', { class: 'change-item' });
    const chevron = h('span', { class: 'muted' }, icon('chevron-right', 14));
    const headEl = h(
      'div',
      {
        class: 'change-head',
        role: 'button',
        tabindex: '0',
        onClick: () => toggle(),
        onKeydown: (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggle();
          }
        }
      },
      h('span', { class: 'file-ico' }, icon(isImagePath(change.path) ? 'image' : 'file-text', 16)),
      h('div', { class: 'change-path' }, h('strong', null, change.path), h('span', null, meta)),
      badge(ACTION_LABELS[action] || 'Changed', action === 'delete' ? 'danger' : action === 'create' ? 'brand' : 'info'),
      chevron,
      h(
        'button',
        {
          class: 'icon-btn danger',
          type: 'button',
          title: 'Remove from this publish',
          'aria-label': 'Remove from this publish',
          onClick: (event) => {
            event.stopPropagation();
            unstage(change.path);
            toast('Removed from pending changes', { type: 'info', timeout: 2000 });
          }
        },
        icon('trash', 14)
      )
    );

    function renderBody() {
      if (rendered) return;
      rendered = true;
      clear(bodyEl);

      if (onOpenFile && !change.delete) {
        bodyEl.append(
          h(
            'button',
            {
              class: 'btn btn-sm btn-ghost',
              type: 'button',
              onClick: () => {
                close();
                onOpenFile(change.path);
              }
            },
            icon('edit', 14),
            'Open in editor'
          )
        );
      }

      if (change.delete) {
        bodyEl.append(h('div', { class: 'notice danger' }, icon('alert', 16), 'This file will be deleted from the repository.'));
        if (change.originalText) {
          const diff = h('div', { class: 'diff' });
          for (const op of compactDiff(diffLines(change.originalText, ''), { context: 2 })) {
            diff.append(diffLine(op));
          }
          bodyEl.append(diff);
        }
      } else if (isBinary) {
        if (isImagePath(change.path) && change.base64 && change.base64.length < 2_000_000) {
          bodyEl.append(
            h('img', {
              src: `data:${mimeFor(change.path)};base64,${change.base64}`,
              alt: 'Preview',
              style: 'max-height:200px;border-radius:8px;border:1px solid var(--line)'
            })
          );
        } else {
          bodyEl.append(h('div', { class: 'notice' }, icon('file', 16), 'Binary file — a new version will be uploaded.'));
        }
      } else {
        const diff = h('div', { class: 'diff' });
        for (const op of compactDiff(diffLines(change.originalText || '', change.text || ''), { context: 2 })) {
          diff.append(diffLine(op));
        }
        bodyEl.append(diff);
      }
    }

    function toggle() {
      const open = bodyEl.hidden;
      bodyEl.hidden = !open;
      item.classList.toggle('open', open);
      clear(chevron);
      chevron.append(icon(open ? 'chevron-down' : 'chevron-right', 14));
      if (open) renderBody();
    }

    item.append(headEl, bodyEl);
    return item;
  }

  async function discardAll() {
    const ok = await confirmDialog({
      title: 'Discard all pending changes?',
      message: 'Every draft in this panel will be lost. The repository will not be touched.',
      confirmLabel: 'Discard all',
      danger: true
    });
    if (!ok) return;
    clearStaged();
    toast('Pending changes discarded', { type: 'info' });
  }

  function open() {
    update();
    backdrop.classList.add('open');
    drawer.classList.add('open');
  }

  function close() {
    backdrop.classList.remove('open');
    drawer.classList.remove('open');
  }

  window.addEventListener('admin:staged', update);

  return { open, close, update, drawer, backdrop };
}

export function diffLine(op) {
  if (op.type === 'skip') return h('div', { class: 'diff-line skip' }, op.text);
  const marker = op.type === 'add' ? '+' : op.type === 'remove' ? '−' : ' ';
  return h(
    'div',
    { class: `diff-line ${op.type === 'same' ? '' : op.type}` },
    h('span', { class: 'ln' }, op.type === 'add' ? op.newLine || '' : op.oldLine || ''),
    h('span', { class: 'marker' }, marker),
    h('span', { class: 'code' }, op.text || ' ')
  );
}
