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
  timeAgo,
  withBusy
} from '../ui.js';
import { state, repoLabel, invalidateTree } from '../store.js';
import * as api from '../api.js';

let ctxRef = null;
let listEl = null;
let filter = 'open';
let refreshing = false;

export async function render(root, ctx) {
  destroy();
  ctxRef = ctx;

  root.append(
    pageHead('Pull requests', 'Changes published in review mode wait here until you merge them.', [
      h(
        'a',
        { class: 'btn', href: `https://github.com/${repoLabel()}/pulls`, target: '_blank', rel: 'noopener' },
        icon('external', 15),
        'Open on GitHub'
      ),
      h('button', { class: 'btn btn-primary', type: 'button', onClick: () => refresh(true) }, icon('refresh', 16), 'Refresh')
    ])
  );

  const tabsBar = h('div', { class: 'tabs' });
  const tab = (id, label) =>
    h(
      'button',
      {
        class: `tab ${filter === id ? 'active' : ''}`,
        type: 'button',
        onClick: () => {
          if (filter === id) return;
          filter = id;
          clear(tabsBar);
          tabsBar.append(tab('open', 'Open'), tab('closed', 'Closed'));
          refresh();
        }
      },
      label
    );
  tabsBar.append(tab('open', 'Open'), tab('closed', 'Closed'));

  listEl = h('div', { class: 'pr-list' });
  root.append(tabsBar, listEl);

  await refresh();
}

export function destroy() {
  listEl = null;
  ctxRef = null;
}

async function refresh(showToast = false) {
  if (!listEl || refreshing) return;
  refreshing = true;
  clear(listEl);
  listEl.append(loadingView('Loading pull requests…'));
  try {
    const data = await api.getPullRequests(filter);
    const pulls = data.pulls || data.pullRequests || [];
    clear(listEl);
    if (!pulls.length) {
      listEl.append(
        emptyState({
          iconName: 'pull',
          title: filter === 'open' ? 'No open pull requests' : 'No closed pull requests',
          message:
            filter === 'open'
              ? 'Publish with “Pull request” selected and it will show up here for review before it reaches the live site.'
              : 'Merged and closed admin pull requests will be listed here.'
        })
      );
      if (showToast) toast('Pull requests refreshed', { type: 'info', timeout: 1600 });
      return;
    }
    for (const pull of pulls) listEl.append(pullCard(pull));
    if (showToast) toast('Pull requests refreshed', { type: 'info', timeout: 1600 });
  } catch (error) {
    clear(listEl);
    listEl.append(
      h(
        'div',
        { class: 'card' },
        h(
          'div',
          { class: 'card-body' },
          notice(error.message, 'danger', 'alert'),
          h('p', { class: 'small muted', style: 'margin-top:10px' }, 'Pull requests need a GitHub token with “Pull requests: write” permission.')
        )
      )
    );
  } finally {
    refreshing = false;
  }
}

function pullCard(pull) {
  const actions = h('div', { class: 'row-wrap' });
  if (filter === 'open') {
    actions.append(
      h(
        'button',
        {
          class: 'btn btn-sm',
          type: 'button',
          onClick: () => merge(pull, 'squash')
        },
        icon('check', 14),
        'Squash & merge'
      ),
      h(
        'button',
        {
          class: 'btn btn-sm btn-ghost',
          type: 'button',
          onClick: () => merge(pull, 'merge')
        },
        icon('pull', 14),
        'Merge commit'
      ),
      h(
        'button',
        {
          class: 'btn btn-sm btn-ghost btn-danger',
          type: 'button',
          onClick: () => closePull(pull)
        },
        icon('x', 14),
        'Close'
      )
    );
  }
  if (pull.url) {
    actions.append(h('a', { class: 'btn btn-sm btn-ghost', href: pull.url, target: '_blank', rel: 'noopener' }, icon('external', 14), 'View diff'));
  }

  return h(
    'div',
    { class: 'card pr-card' },
    h(
      'div',
      { class: 'card-body' },
      h(
        'div',
        { class: 'pr-head' },
        h(
          'div',
          { class: 'grow' },
          h(
            'h3',
            { class: 'pr-title' },
            h('span', { class: 'mono muted' }, `#${pull.number}`),
            pull.title,
            pull.draft ? badge('Draft', '') : null
          ),
          h(
            'div',
            { class: 'row-wrap small muted' },
            h('span', { class: 'mono' }, pull.branch),
            icon('arrow-right', 12),
            h('span', { class: 'mono' }, pull.base),
            h('span', { class: 'dot-sep' }),
            h('span', null, `${pull.user || 'unknown'} · ${timeAgo(pull.updatedAt || pull.createdAt)}`)
          )
        ),
        h(
          'span',
          { class: 'pr-status' },
          badge(pull.state === 'closed' ? 'Closed' : 'Open', pull.state === 'closed' ? '' : 'brand')
        )
      ),
      actions.childElementCount ? h('div', { class: 'pr-actions' }, actions) : null
    )
  );
}

async function merge(pull, method) {
  const ok = await confirmDialog({
    title: `Merge #${pull.number}?`,
    message:
      method === 'squash'
        ? 'Commits are squashed into a single commit on the live branch. GitHub Pages rebuilds in about a minute.'
        : 'A merge commit is added to the live branch. GitHub Pages rebuilds in about a minute.',
    confirmLabel: 'Merge now'
  });
  if (!ok) return;
  await withBusy(async () => {
    try {
      await api.mergePullRequest(pull.number, method);
      toast(`#${pull.number} merged — the site rebuilds shortly`, { type: 'success' });
      invalidateTree();
      await ctxRef?.refreshTree({ force: true, silent: true });
      await refresh();
    } catch (error) {
      toast(error.message, { type: 'error', title: 'Merge failed' });
    }
  });
}

async function closePull(pull) {
  const ok = await confirmDialog({
    title: `Close #${pull.number}?`,
    message: 'The pull request is closed without merging. The draft branch stays on GitHub unless it is deleted.',
    confirmLabel: 'Close pull request',
    danger: true
  });
  if (!ok) return;
  await withBusy(async () => {
    try {
      await api.closePullRequest(pull.number);
      toast(`#${pull.number} closed`, { type: 'success' });
      await refresh();
    } catch (error) {
      toast(error.message, { type: 'error', title: 'Could not close' });
    }
  });
}
