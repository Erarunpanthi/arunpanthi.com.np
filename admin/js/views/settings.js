import {
  h,
  icon,
  clear,
  pageHead,
  toast,
  confirmDialog,
  notice,
  badge,
  timeAgo,
  loadingView,
  formatBytes,
  downloadBlob
} from '../ui.js';
import {
  state,
  DEFAULT_SETTINGS,
  saveSettings,
  applyTheme,
  clearStaged,
  stagedCount,
  sessionRemaining,
  repoLabel,
  branchName,
  siteUrl
} from '../store.js';
import * as api from '../api.js';
import { apiBase } from '../api.js';

let ctxRef = null;
let auditEl = null;

function sessionLabel() {
  const seconds = sessionRemaining();
  if (!seconds) return 'Expired';
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))} min left`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} h left`;
  return `${Math.round(seconds / 86400)} d left`;
}

export async function render(root, ctx) {
  destroy();
  ctxRef = ctx;
  const rerender = () => {
    clear(root);
    render(root, ctx);
  };
  const user = state.user || {};
  const health = state.health || {};

  root.append(pageHead('Settings', 'Connection, appearance and housekeeping.', []));

  /* ---------------- account ---------------- */
  root.append(
    h(
      'div',
      { class: 'card' },
      h('div', { class: 'card-head' }, h('h2', { class: 'panel-title' }, icon('shield', 17), 'Account & connection')),
      h(
        'div',
        { class: 'card-body stack' },
        h(
          'div',
          { class: 'account-row' },
          user.avatarUrl
            ? h('img', { class: 'avatar avatar-lg', src: user.avatarUrl, alt: '' })
            : h('span', { class: 'avatar avatar-lg placeholder' }, icon('users', 22)),
          h(
            'div',
            { class: 'grow' },
            h('strong', null, user.name || user.login || 'Signed in'),
            h('div', { class: 'small muted' }, user.login ? `@${user.login}` : 'GitHub account'),
            h('div', { class: 'row-wrap', style: 'margin-top:6px' }, badge(`Session ${sessionLabel()}`, 'info'))
          ),
          h(
            'button',
            {
              class: 'btn',
              type: 'button',
              onClick: async () => {
                const ok = await confirmDialog({ title: 'Sign out?', message: 'Unpublished drafts stay saved in this browser.', confirmLabel: 'Sign out' });
                if (!ok) return;
                await api.logout();
                location.hash = '';
                location.reload();
              }
            },
            icon('logout', 15),
            'Sign out'
          )
        ),
        h('div', { class: 'divider' }),
        h(
          'div',
          { class: 'kv-grid' },
          kv('Repository', h('span', { class: 'mono' }, repoLabel())),
          kv('Branch', h('span', { class: 'mono' }, branchName())),
          kv('Website', h('a', { href: siteUrl(), target: '_blank', rel: 'noopener' }, siteUrl().replace(/^https?:\/\//, ''))),
          kv('API', h('span', { class: 'mono' }, apiBase() || 'same origin')),
          kv('Server version', h('span', { class: 'mono' }, health.version || '—')),
          kv(
            'Modes',
            h(
              'span',
              { class: 'row-wrap' },
              health.dryRun ? badge('Dry run', 'warn') : badge('Live', 'brand'),
              health.readOnly ? badge('Read-only', 'danger') : null,
              health.github === false ? badge('GitHub not configured', 'danger') : null
            )
          )
        )
      )
    )
  );

  /* ---------------- api base ---------------- */
  const apiInput = h('input', { class: 'input mono', value: state.settings.apiBase || state.config.apiBase || '', placeholder: 'https://admin.arunpanthi.com.np' });
  const testResult = h('span', { class: 'tiny muted' });
  root.append(
    h(
      'div',
      { class: 'card' },
      h('div', { class: 'card-head' }, h('h2', { class: 'panel-title' }, icon('server', 17), 'Backend address')),
      h(
        'div',
        { class: 'card-body stack' },
        h(
          'p',
          { class: 'small muted' },
          'Leave this empty when the panel is served by the admin server. Point it at your deployed API when the panel is hosted on GitHub Pages.'
        ),
        h('div', { class: 'row-wrap' }, h('div', { class: 'grow' }, apiInput), testResult),
        h(
          'div',
          { class: 'row-wrap' },
          h(
            'button',
            {
              class: 'btn',
              type: 'button',
              onClick: async () => {
                clear(testResult);
                testResult.append(loadingView('Testing…'));
                try {
                  const result = await api.health(apiInput.value.trim() || null);
                  clear(testResult);
                  testResult.append(badge(`OK · v${result.version || '?'}`, 'brand'));
                  if (result.repo) {
                    toast(`Connected to ${result.repo.owner}/${result.repo.name} (${result.repo.branch})`, { type: 'success' });
                  } else {
                    toast('Backend reachable', { type: 'success' });
                  }
                } catch (error) {
                  clear(testResult);
                  testResult.append(badge('Unreachable', 'danger'));
                  toast(error.message, { type: 'error', title: 'Connection failed' });
                }
              }
            },
            icon('terminal', 15),
            'Test connection'
          ),
          h(
            'button',
            {
              class: 'btn btn-primary',
              type: 'button',
              onClick: () => {
                saveSettings({ apiBase: apiInput.value.trim() });
                toast('Backend address saved — reloading…', { type: 'success', timeout: 1200 });
                setTimeout(() => location.reload(), 700);
              }
            },
            icon('save', 15),
            'Save & reload'
          )
        )
      )
    )
  );

  /* ---------------- preferences ---------------- */
  const themeSelect = h(
    'select',
    {
      class: 'select',
      onChange: (event) => {
        saveSettings({ theme: event.target.value });
        applyTheme(event.target.value);
        toast('Theme updated', { type: 'info', timeout: 1500 });
      }
    },
    h('option', { value: 'system', selected: state.settings.theme === 'system' }, 'Match the system'),
    h('option', { value: 'light', selected: state.settings.theme === 'light' }, 'Light'),
    h('option', { value: 'dark', selected: state.settings.theme === 'dark' }, 'Dark')
  );

  const publishSelect = h(
    'select',
    {
      class: 'select',
      onChange: (event) => {
        saveSettings({ publishMode: event.target.value });
        toast('Default publish mode updated', { type: 'info', timeout: 1500 });
      }
    },
    h('option', { value: '', selected: !state.settings.publishMode }, 'Server default'),
    h('option', { value: 'direct', selected: state.settings.publishMode === 'direct' }, 'Direct commit to the live branch'),
    h('option', { value: 'pr', selected: state.settings.publishMode === 'pr' }, 'Pull request for review')
  );

  const fontInput = h('input', {
    class: 'input',
    type: 'number',
    min: '11',
    max: '20',
    step: '1',
    value: String(state.settings.editorFont || 13),
    onChange: (event) => {
      const value = Math.min(20, Math.max(11, Number(event.target.value) || 13));
      event.target.value = String(value);
      saveSettings({ editorFont: value });
      applyTheme(state.settings.theme || 'system');
    }
  });

  const toggle = (key, label, hint) => {
    const input = h('input', { type: 'checkbox', checked: !!state.settings[key] });
    input.checked = !!state.settings[key];
    input.addEventListener('change', () => saveSettings({ [key]: input.checked }));
    return h(
      'label',
      { class: 'pref-row' },
      input,
      h('span', { class: 'grow' }, h('strong', null, label), hint ? h('span', { class: 'hint block' }, hint) : null)
    );
  };

  root.append(
    h(
      'div',
      { class: 'card' },
      h('div', { class: 'card-head' }, h('h2', { class: 'panel-title' }, icon('palette', 17), 'Preferences')),
      h(
        'div',
        { class: 'card-body stack' },
        h('div', { class: 'form-grid' }, h('label', { class: 'field' }, h('span', { class: 'label' }, 'Theme'), themeSelect), h('label', { class: 'field' }, h('span', { class: 'label' }, 'Default publish mode'), publishSelect)),
        h('div', { class: 'form-grid' }, h('label', { class: 'field' }, h('span', { class: 'label' }, 'Editor font size'), fontInput)),
        h('div', { class: 'divider' }),
        toggle('optimizeImages', 'Shrink large photos on upload', 'Resizes to fit 1800 px before staging.'),
        toggle('showBackendFiles', 'Show admin-server files in the file tree', 'Only needed while developing the backend itself.'),
        toggle('remember', 'Keep me signed in on this device', 'Stores the session in local storage instead of session storage.')
      )
    )
  );

  /* ---------------- audit ---------------- */
  auditEl = h('div', { class: 'audit-list' }, h('div', { class: 'muted small' }, 'Loading…'));
  root.append(
    h(
      'div',
      { class: 'card' },
      h(
        'div',
        { class: 'card-head card-head-wrap' },
        h('h2', { class: 'panel-title' }, icon('terminal', 17), 'Activity log'),
        h(
          'div',
          { class: 'row-wrap' },
          h('button', { class: 'btn btn-sm', type: 'button', onClick: loadAudit }, icon('refresh', 14), 'Refresh'),
          h('button', { class: 'btn btn-sm', type: 'button', onClick: downloadBackup }, icon('download', 14), 'Download backup')
        )
      ),
      h('div', { class: 'card-body' }, auditEl)
    )
  );

  /* ---------------- housekeeping ---------------- */
  root.append(
    h(
      'div',
      { class: 'card' },
      h('div', { class: 'card-head' }, h('h2', { class: 'panel-title' }, icon('alert', 17), 'Housekeeping')),
      h(
        'div',
        { class: 'card-body stack' },
        h(
          'div',
          { class: 'pref-row' },
          h(
            'span',
            { class: 'grow' },
            h('strong', null, 'Pending drafts'),
            h('span', { class: 'hint block' }, `${stagedCount()} draft${stagedCount() === 1 ? '' : 's'} saved in this browser`)
          ),
          h(
            'button',
            {
              class: 'btn btn-sm btn-danger',
              type: 'button',
              onClick: async () => {
                const ok = await confirmDialog({
                  title: 'Discard all drafts?',
                  message: 'Every unpublished change in this browser is deleted. Published files are not affected.',
                  confirmLabel: 'Discard drafts',
                  danger: true
                });
                if (!ok) return;
                clearStaged();
                toast('Drafts discarded', { type: 'success' });
                ctxRef?.updateStagedUI?.();
                rerender();
              }
            },
            icon('trash', 14),
            'Discard drafts'
          )
        ),
        h(
          'div',
          { class: 'pref-row' },
          h(
            'span',
            { class: 'grow' },
            h('strong', null, 'Preferences'),
            h('span', { class: 'hint block' }, 'Reset theme, publish mode and other local options.')
          ),
          h(
            'button',
            {
              class: 'btn btn-sm',
              type: 'button',
              onClick: async () => {
                const ok = await confirmDialog({ title: 'Reset preferences?', message: 'Local options go back to their defaults. Drafts are kept.', confirmLabel: 'Reset preferences' });
                if (!ok) return;
                saveSettings({ ...DEFAULT_SETTINGS, apiBase: state.settings.apiBase, remember: state.settings.remember });
                toast('Preferences reset', { type: 'success' });
                rerender();
              }
            },
            icon('rotate', 14),
            'Reset'
          )
        ),
        h('div', { class: 'divider' }),
        h(
          'details',
          { class: 'text-group' },
          h('summary', null, h('span', { class: 'tg-title' }, 'How to change the admin password')),
          h(
            'div',
            { class: 'tg-body' },
            h(
              'ol',
              { class: 'small muted doc-list' },
              h('li', null, 'In the repository, run: ', h('code', null, 'node admin-server/hash-password.mjs "your-new-password"')),
              h('li', null, 'Copy the printed hash into the hosting environment as ', h('code', null, 'ADMIN_PASSWORD_HASH'), '.'),
              h('li', null, 'Remove the plain ', h('code', null, 'ADMIN_PASSWORD'), ' variable if it is set.'),
              h('li', null, 'Redeploy the backend and sign in again.')
            )
          )
        )
      )
    )
  );

  loadAudit();
}

export function destroy() {
  auditEl = null;
  ctxRef = null;
}

function kv(label, value) {
  return h('div', { class: 'kv' }, h('span', null, label), h('span', null, value));
}

async function loadAudit() {
  if (!auditEl) return;
  clear(auditEl);
  auditEl.append(loadingView('Loading activity…'));
  try {
    const data = await api.getAudit(60);
    const entries = data.entries || [];
    clear(auditEl);
    if (!entries.length) {
      auditEl.append(h('div', { class: 'muted small' }, 'No activity recorded yet.'));
      return;
    }
    auditEl.append(
      h(
        'div',
        { class: 'audit-table' },
        entries.map((entry) =>
          h(
            'div',
            { class: 'audit-row' },
            h('span', { class: `audit-dot ${entry.ok === false ? 'bad' : ''}` }),
            h(
              'div',
              { class: 'grow' },
              h('strong', { class: 'small' }, entry.action || 'request'),
              entry.detail ? h('span', { class: 'hint block mono' }, String(entry.detail).slice(0, 220)) : null
            ),
            h('span', { class: 'tiny muted' }, timeAgo(entry.at)),
            h('span', { class: 'tiny muted mono' }, entry.ip || '')
          )
        )
      )
    );
  } catch (error) {
    clear(auditEl);
    auditEl.append(notice(error.message, 'danger', 'alert'));
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
