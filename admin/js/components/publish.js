/* Publish dialog: direct commit or pull request, with conflict handling. */

import { h, icon, openModal, toast, badge, withBusy, confirmDialog, spinner } from '../ui.js';
import {
  state,
  stagedChanges,
  stagedPayload,
  stageSummary,
  clearStaged,
  invalidateTree,
  publishDefault,
  branchName,
  repoLabel,
  siteUrl
} from '../store.js';
import * as api from '../api.js';
import { diffLines, diffStats } from '../lib/diff.js';

function defaultMessage(changes) {
  const names = changes.slice(0, 3).map((change) => change.path.split('/').pop());
  const summary = stageSummary();
  const verb = summary.deleted === changes.length ? 'Remove' : summary.created === changes.length ? 'Add' : 'Update';
  const more = changes.length > 3 ? ` +${changes.length - 3} more` : '';
  return `Admin: ${verb.toLowerCase()} ${names.join(', ')}${more}`;
}

function actionBadge(change) {
  if (change.delete) return badge('Delete', 'danger');
  if (change.action === 'create') return badge('New', 'brand');
  return badge('Update', 'info');
}

export function openPublishDialog({ onPublished } = {}) {
  const changes = stagedChanges();
  if (!changes.length) {
    toast('There are no changes to publish', { type: 'info' });
    return;
  }
  const summary = stageSummary();
  const dryRun = !!state.health?.dryRun;
  const readOnly = !!state.health?.readOnly;

  const mode = publishDefault() === 'pr' ? 'pr' : 'direct';

  const modeDirect = h('input', { type: 'radio', name: 'publish-mode', value: 'direct', checked: mode === 'direct' });
  const modePr = h('input', { type: 'radio', name: 'publish-mode', value: 'pr', checked: mode === 'pr' });

  const messageInput = h('textarea', {
    class: 'textarea',
    rows: 2,
    value: defaultMessage(changes),
    placeholder: 'Describe this change'
  });

  const prFields = h(
    'div',
    { class: 'stack-sm', hidden: mode !== 'pr' },
    h('label', { class: 'label' }, 'Pull request title'),
    h('input', { class: 'input', value: defaultMessage(changes), 'data-pr-title': 'true' }),
    h('label', { class: 'label' }, 'Pull request description (optional)'),
    h('textarea', { class: 'textarea', rows: 3, placeholder: 'Extra context for the pull request' })
  );

  const directCard = h(
    'label',
    { class: 'mode-card' },
    modeDirect,
    h(
      'span',
      { class: 'mode-text' },
      h('strong', null, 'Commit to ' + branchName()),
      h('span', null, `Goes live on ${siteUrl().replace(/^https?:\/\//, '')} in about a minute.`)
    )
  );
  const prCard = h(
    'label',
    { class: 'mode-card' },
    modePr,
    h(
      'span',
      { class: 'mode-text' },
      h('strong', null, 'Open a pull request'),
      h('span', null, 'Changes wait for your approval on GitHub before going live.')
    )
  );

  let primaryButton = null;
  function primaryLabel() {
    return dryRun ? 'Simulate publish' : modePr.checked ? 'Open pull request' : 'Publish now';
  }
  function updatePrimaryButton() {
    if (!primaryButton) return;
    primaryButton.replaceChildren(icon('send', 16), h('span', null, primaryLabel()));
  }
  function syncMode() {
    const pr = modePr.checked;
    prFields.hidden = !pr;
    directCard.classList.toggle('selected', !pr);
    prCard.classList.toggle('selected', pr);
    updatePrimaryButton();
  }
  modeDirect.addEventListener('change', syncMode);
  modePr.addEventListener('change', syncMode);
  syncMode();

  const changeRows = changes.map((change) => {
    let stats = null;
    if (!change.delete && change.text !== undefined && change.originalText !== undefined) {
      stats = diffStats(diffLines(change.originalText, change.text));
    }
    return h(
      'div',
      { class: 'change-file-row' },
      icon(change.path.endsWith('.html') ? 'file-text' : change.path.match(/\.(png|jpe?g|webp|gif|svg)$/i) ? 'image' : 'file', 15),
      h('span', { class: 'mono truncate grow' }, change.path),
      stats ? h('span', { class: 'tiny muted nowrap' }, `+${stats.added} −${stats.removed}`) : null,
      actionBadge(change)
    );
  });

  const content = h(
    'div',
    { class: 'stack' },
    dryRun
      ? h(
          'div',
          { class: 'notice warn' },
          icon('alert', 18),
          h('div', null, h('strong', null, 'Dry run mode. '), 'Publishing is simulated — no commit will be created.')
        )
      : null,
    readOnly
      ? h('div', { class: 'notice danger' }, icon('lock', 18), h('div', null, h('strong', null, 'Read-only server. '), 'Publishing is disabled.'))
      : null,
    h(
      'div',
      { class: 'sub-card' },
      h(
        'div',
        { class: 'sub-card-head' },
        h('h3', null, `${summary.total} file${summary.total === 1 ? '' : 's'} to publish`),
        h('span', { class: 'small muted' }, `${summary.created} new · ${summary.updated} updated · ${summary.deleted} deleted`)
      ),
      h('div', { class: 'sub-card-body stack-sm' }, h('div', { class: 'change-file-list' }, changeRows))
    ),
    h(
      'div',
      { class: 'stack-sm' },
      h('label', { class: 'label' }, 'Commit message'),
      messageInput,
      h('span', { class: 'hint' }, 'This message appears in the repository history.')
    ),
    h('div', { class: 'stack-sm' }, h('label', { class: 'label' }, 'How should this publish?'), h('div', { class: 'mode-grid' }, directCard, prCard)),
    prFields
  );

  const modal = openModal({
    title: 'Publish changes',
    subtitle: `${repoLabel()} · ${branchName()}`,
    size: 'lg',
    content,
    actions: [
      { label: 'Cancel', variant: 'ghost' },
      {
        label: primaryLabel(),
        variant: 'primary',
        iconName: 'send',
        onClick: async (close, button) => {
          if (readOnly) {
            toast('This server is read-only', { type: 'error' });
            return false;
          }
          const message = messageInput.value.trim();
          if (!message) {
            messageInput.focus();
            toast('Add a commit message', { type: 'warn' });
            return false;
          }
          const prTitle = prFields.querySelector('[data-pr-title]').value.trim();
          const prBody = prFields.querySelector('textarea').value.trim();
          button.disabled = true;
          const original = button.innerHTML;
          button.innerHTML = '';
          button.append(spinner(16), h('span', null, 'Publishing…'));
          try {
            const result = await api.publish({
              files: stagedPayload(),
              message,
              mode: modePr.checked ? 'pr' : 'direct',
              expectedHead: state.tree?.headSha || undefined,
              title: prTitle,
              body: prBody
            });
            clearStaged();
            invalidateTree();
            close();
            if (onPublished) onPublished(result);
            openSuccessDialog(result, changes);
          } catch (error) {
            if (error.status === 409) {
              toast('The repository changed since this page was loaded', { type: 'warn', title: 'Needs a refresh' });
              const force = await confirmDialog({
                title: 'Repository changed',
                message:
                  'Someone (or an earlier publish) committed to the branch while you were editing. Overwriting could undo that work.',
                details: error.details?.head ? `Current head: ${error.details.head}` : null,
                confirmLabel: 'Overwrite anyway',
                danger: true
              });
              if (force) {
                try {
                  const forced = await api.publish({
                    files: stagedPayload(),
                    message,
                    mode: modePr.checked ? 'pr' : 'direct',
                    expectedHead: undefined,
                    title: prTitle,
                    body: prBody,
                    force: true
                  });
                  clearStaged();
                  invalidateTree();
                  close();
                  if (onPublished) onPublished(forced);
                  openSuccessDialog(forced, changes);
                } catch (forceError) {
                  toast(forceError.message, { type: 'error', title: 'Publish failed' });
                }
              }
            } else {
              toast(error.message, { type: 'error', title: 'Publish failed' });
            }
          } finally {
            button.disabled = false;
            button.innerHTML = original;
          }
        }
      }
    ]
  });

  primaryButton = modal.footer?.querySelector('.btn-primary') || null;
  updatePrimaryButton();
  return modal;
}

function openSuccessDialog(result, changes) {
  const direct = result.mode !== 'pr';
  const site = siteUrl().replace(/^https?:\/\//, '');
  const commitShort = result.commitSha && result.commitSha.length > 10 ? result.commitSha.slice(0, 7) : result.commitSha;
  const content = h(
    'div',
    { class: 'success-panel' },
    h('div', { class: 'success-icon' }, icon('check', 30)),
    h('h3', null, result.dryRun ? 'Dry run complete' : direct ? 'Published successfully' : 'Pull request opened'),
    h(
      'p',
      null,
      result.dryRun
        ? 'Everything validated. No commit was created because the server is in dry-run mode.'
        : direct
          ? `GitHub Pages usually rebuilds ${site} within a minute.`
          : 'Your changes are on a separate branch. Merge the pull request when you are ready to go live.'
    ),
    h(
      'div',
      { class: 'success-details' },
      h('div', { class: 'kv' }, h('span', null, 'Branch'), h('span', { class: 'mono' }, result.branch || '—')),
      h('div', { class: 'kv' }, h('span', null, 'Files'), h('span', null, String(changes.length))),
      result.commitSha
        ? h(
            'div',
            { class: 'kv' },
            h('span', null, 'Commit'),
            h(
              'a',
              { href: result.commitUrl || '#', target: '_blank', rel: 'noopener', class: 'mono' },
              commitShort
            )
          )
        : null,
      result.prNumber
        ? h(
            'div',
            { class: 'kv' },
            h('span', null, 'Pull request'),
            h('a', { href: result.prUrl, target: '_blank', rel: 'noopener' }, '#' + result.prNumber)
          )
        : null
    )
  );

  openModal({
    title: result.dryRun ? 'Dry run' : 'Done',
    size: 'sm',
    content,
    actions: [
      result.commitUrl
        ? { label: 'View commit', variant: 'ghost', iconName: 'external', onClick: () => window.open(result.commitUrl, '_blank', 'noopener') }
        : null,
      result.prUrl
        ? { label: 'View pull request', variant: 'ghost', iconName: 'external', onClick: () => window.open(result.prUrl, '_blank', 'noopener') }
        : null,
      { label: 'Close', variant: 'primary' }
    ].filter(Boolean)
  });
}
