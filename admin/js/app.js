/* Admin application: boot, login, shell, routing and the publish flow. */

import {
  h,
  icon,
  clear,
  toast,
  confirmDialog,
  withBusy,
  spinner,
  loadingView,
  errorState,
  badge
} from './ui.js';
import * as store from './store.js';
import * as api from './api.js';
import { createStagingDrawer } from './components/staging.js';
import { openPublishDialog } from './components/publish.js';

const ROUTES = {
  dashboard: { label: 'Dashboard', subtitle: 'Your site at a glance', iconName: 'dashboard', group: 'Overview', load: () => import('./views/dashboard.js') },
  files: { label: 'Files', subtitle: 'Edit any file in the repository', iconName: 'file-text', group: 'Content', load: () => import('./views/files.js') },
  uploads: { label: 'Uploads', subtitle: 'Add images, PDFs and documents', iconName: 'upload', group: 'Content', load: () => import('./views/uploads.js') },
  'current-affairs': { label: 'Weekly current affairs', subtitle: 'Wednesday question bank', iconName: 'calendar', group: 'Content', load: () => import('./views/current-affairs.js') },
  'practice-tests': { label: 'Practice tests', subtitle: 'Timed subject-wise test sets', iconName: 'book', group: 'Content', load: () => import('./views/practice-tests.js') },
  pages: { label: 'Page text', subtitle: 'Headings and paragraphs, no HTML', iconName: 'edit', group: 'Content', load: () => import('./views/pages.js') },
  seo: { label: 'SEO & metadata', subtitle: 'Titles, descriptions, social previews', iconName: 'search', group: 'Content', load: () => import('./views/seo.js') },
  navigation: { label: 'Navigation & footer', subtitle: 'Navbar, social links, footer', iconName: 'layers', group: 'Site', load: () => import('./views/navigation.js') },
  history: { label: 'History & backups', subtitle: 'Recent commits and restores', iconName: 'clock', group: 'Site', load: () => import('./views/history.js') },
  pulls: { label: 'Pull requests', subtitle: 'Review and merge admin PRs', iconName: 'pull', group: 'Site', load: () => import('./views/pulls.js') },
  settings: { label: 'Settings', subtitle: 'Connection, preferences and tools', iconName: 'settings', group: 'Site', load: () => import('./views/settings.js') }
};
const GROUPS = ['Overview', 'Content', 'Site'];

let appEl = null;
let viewEl = null;
let titleEl = null;
let subtitleEl = null;
let stagedChip = null;
let publishButton = null;
let navElements = new Map();
let changesNavBadge = null;
let drawer = null;
let currentRoute = { name: 'dashboard', query: {} };
let currentModule = null;
let routeToken = 0;
let hashBound = false;
let sessionBound = false;

/* ------------------------------------------------------------------ */
/* boot                                                                */
/* ------------------------------------------------------------------ */

async function boot() {
  appEl = document.getElementById('app');
  await store.loadConfig();
  store.loadLocal();
  store.bindSystemTheme();

  const existingHealth = await checkHealth(store.state.settings.apiBase || null);

  if (!store.state.session) {
    renderLogin(existingHealth);
    return;
  }
  if (store.sessionRemaining() <= 0) {
    store.clearSession();
    renderLogin(existingHealth);
    return;
  }

  try {
    const me = await api.me();
    store.state.user = me.user;
    store.state.repo = me.repo;
    if (me.repo) {
      store.state.config.repo = { ...store.state.config.repo, ...me.repo };
    }
    store.updateSessionUser(me.user);
    store.state.health = {
      ...(store.state.health || {}),
      dryRun: me.dryRun,
      repo: { ...(store.state.health?.repo || {}), ...me.repo },
      publishMode: me.publishMode,
      limits: me.limits
    };
  } catch (error) {
    if (error.status === 401) {
      renderLogin(null, error.message);
      return;
    }
    /* Server temporarily unreachable — keep the session and show the shell;
       views will surface their own errors. */
  }

  renderShell();
  await refreshTree({ silent: true });
  await renderRoute();
}

async function checkHealth(base) {
  try {
    const data = await api.health(base === null ? null : base || '');
    store.state.health = data;
    return data;
  } catch (error) {
    store.state.health = null;
    return { error };
  }
}

/* ------------------------------------------------------------------ */
/* login                                                               */
/* ------------------------------------------------------------------ */

function renderLogin(healthState = null, initialError = '') {
  clear(appEl);
  document.title = 'Sign in · CivPrepMaster admin';
  removeDrawers();
  currentModule?.destroy?.();
  currentModule = null;

  const settings = store.state.settings;
  const passwordInput = h('input', {
    class: 'input',
    type: 'password',
    autocomplete: 'current-password',
    placeholder: 'Your admin password'
  });
  const rememberInput = h('input', { type: 'checkbox', checked: !!settings.remember });
  const backendInput = h('input', {
    class: 'input',
    type: 'url',
    placeholder: 'https://admin-api.example.com',
    value: settings.apiBase || ''
  });
  const statusText = h('span', null, 'Checking connection…');
  const statusDot = h('span', { class: 'status-dot' });
  const errorBox = h('div', { hidden: !initialError });
  const submitButton = h(
    'button',
    { class: 'btn btn-primary btn-lg btn-block', type: 'submit' },
    icon('lock', 18),
    'Sign in'
  );

  if (initialError) {
    errorBox.className = 'notice danger';
    errorBox.append(icon('alert', 18), h('div', null, initialError));
  }

  function setStatus(kind, text) {
    statusDot.className = 'status-dot ' + kind;
    statusText.textContent = text;
  }

  function showError(message) {
    errorBox.hidden = false;
    errorBox.className = 'notice danger';
    clear(errorBox);
    errorBox.append(icon('alert', 18), h('div', null, message));
  }

  function showHealth(data) {
    if (!data || data.error) {
      setStatus('bad', 'Backend unreachable — set its URL below');
      return;
    }
    const repo = data.repo || {};
    setStatus('ok', `Connected to ${repo.owner}/${repo.name}${data.dryRun ? ' · dry run' : ''}`);
  }

  showHealth(healthState);

  async function saveBackend() {
    const value = backendInput.value.trim().replace(/\/+$/, '');
    store.saveSettings({ apiBase: value });
    setStatus('', 'Checking connection…');
    const data = await checkHealth(value);
    showHealth(data);
    if (!data.error) toast('Backend connection verified', { type: 'success', timeout: 2500 });
  }

  async function submit(event) {
    event.preventDefault();
    errorBox.hidden = true;
    const password = passwordInput.value;
    if (!password) {
      passwordInput.focus();
      showError('Enter the admin password');
      return;
    }
    const backend = backendInput.value.trim().replace(/\/+$/, '');
    store.saveSettings({ apiBase: backend, remember: rememberInput.checked });
    submitButton.disabled = true;
    const original = submitButton.innerHTML;
    clear(submitButton);
    submitButton.append(spinner(18), h('span', null, 'Signing in…'));
    try {
      const data = await withBusy(() => api.login(password));
      store.setSession(
        { token: data.token, expiresAt: data.expiresAt, user: data.user },
        rememberInput.checked
      );
      store.state.user = data.user;
      store.state.repo = data.repo;
      store.state.health = {
        ...(store.state.health || {}),
        dryRun: data.dryRun,
        repo: data.repo
      };
      store.state.config.repo = { ...store.state.config.repo, ...data.repo };
      renderShell();
      await refreshTree({ silent: true });
      await renderRoute();
      toast(`Welcome back, ${data.user?.name || data.user?.login || 'admin'}`, { type: 'success', timeout: 3000 });
    } catch (error) {
      showError(error.message || 'Could not sign in');
      passwordInput.focus();
      passwordInput.select();
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = original;
    }
  }

  const form = h(
    'form',
    { class: 'login-form', onSubmit: submit },
    h('div', { class: 'field' }, h('label', { for: 'admin-password' }, 'Admin password'), passwordInput),
    h('label', { class: 'checkbox' }, rememberInput, h('span', null, 'Keep me signed in on this device')),
    h('div', { class: 'login-status' }, statusDot, statusText),
    errorBox,
    submitButton,
    h(
      'details',
      { class: 'login-advanced' },
      h('summary', null, 'Backend connection'),
      h(
        'div',
        { class: 'stack-sm', style: 'margin-top:12px' },
        h('label', { class: 'label' }, 'Admin API URL'),
        h(
          'div',
          { class: 'input-with-button' },
          backendInput,
          h('button', { class: 'btn', type: 'button', onClick: saveBackend }, 'Test')
        ),
        h('span', { class: 'hint' }, 'Leave empty when this page is served by the admin server itself.'),
        h(
          'div',
          { class: 'help-box' },
          h('strong', null, 'GitHub Pages setup:'),
          ' deploy ',
          h('code', null, 'admin-server/'),
          ' (Node or Cloudflare Worker), then paste its URL above. The GitHub token stays on the server — never in this browser.'
        )
      )
    )
  );

  passwordInput.id = 'admin-password';

  const brand = h(
    'section',
    { class: 'login-brand' },
    h(
      'div',
      { class: 'login-logo' },
      h('span', { class: 'mark' }, 'C'),
      h('span', null, 'CivPrepMaster', h('span', { style: 'opacity:.6;font-weight:400' }, ' · admin'))
    ),
    h(
      'div',
      { class: 'login-hero' },
      h('h1', null, 'Run your website without touching GitHub.'),
      h('p', null, 'Edit pages, upload study material and publish new tests from one calm, focused dashboard.'),
      h(
        'div',
        { class: 'login-features' },
        feature('sparkles', 'Publish in one click', 'Direct commit or pull request — your choice every time.'),
        feature('layers', 'Everything editable', 'Files, images, question banks, navigation and SEO.'),
        feature('shield', 'Safe by design', 'Password-protected API, server-side token and a full preview before publishing.')
      )
    ),
    h('div', { class: 'login-foot' }, 'arunpanthi.com.np · CivPrepMaster')
  );

  const panel = h(
    'section',
    { class: 'login-panel' },
    h(
      'div',
      { class: 'login-card' },
      h('h2', null, 'Welcome back'),
      h('p', null, 'Sign in to manage arunpanthi.com.np.'),
      form,
      h(
        'div',
        { class: 'login-perks' },
        h('span', null, icon('lock', 13), 'Password only'),
        h('span', null, icon('server', 13), 'Token stored server-side'),
        h('span', null, icon('clock', 13), 'Sessions expire automatically')
      )
    )
  );

  appEl.append(h('div', { class: 'login' }, brand, panel));
  setTimeout(() => passwordInput.focus(), 60);
}

function feature(iconName, title, text) {
  return h(
    'div',
    { class: 'login-feature' },
    h('span', { class: 'fi' }, icon(iconName, 17)),
    h('div', null, h('strong', null, title), h('span', null, text))
  );
}

/* ------------------------------------------------------------------ */
/* shell                                                               */
/* ------------------------------------------------------------------ */

function renderShell() {
  clear(appEl);
  removeDrawers();
  navElements = new Map();
  changesNavBadge = null;

  const repo = store.state.health?.repo || store.state.config.repo;
  const sidebar = buildSidebar(repo);
  const topbar = buildTopbar();
  viewEl = h('main', { class: 'view', id: 'view', tabindex: '-1' });
  const main = h('div', { class: 'main' }, topbar.element, viewEl);
  const shell = h('div', { class: 'shell' }, sidebar.element, main);
  appEl.append(shell);

  drawer = createStagingDrawer({
    onPublish: () => {
      drawer.close();
      openPublish();
    },
    onOpenFile: (path) => {
      store.navigate('files', { path });
    }
  });

  titleEl = topbar.title;
  subtitleEl = topbar.subtitle;
  stagedChip = topbar.stagedChip;
  publishButton = topbar.publishButton;

  stagedChip.addEventListener('click', () => drawer.open());
  publishButton.addEventListener('click', () => openPublish());

  window.addEventListener('admin:staged', updateStagedUI);
  updateStagedUI();

  if (!hashBound) {
    hashBound = true;
    window.addEventListener('hashchange', handleHashChange);
  }
  if (!sessionBound) {
    sessionBound = true;
    window.addEventListener('admin:session-expired', () => {
      currentModule?.destroy?.();
      currentModule = null;
      renderLogin(null, 'Your session expired. Please sign in again.');
      toast('Session expired', { type: 'warn' });
    });
    window.addEventListener('admin:save', () => {
      if (store.state.saveHandler) store.state.saveHandler();
      else toast('Nothing to save on this screen', { type: 'info', timeout: 2200 });
    });
    window.addEventListener('beforeunload', (event) => {
      if (store.stagedCount() > 0) {
        event.preventDefault();
        event.returnValue = '';
      }
    });
  }

  currentRoute = store.parseRoute();
  sidebar.setActive(currentRoute.name);
}

function buildSidebar(repo) {
  const nav = h('nav', { class: 'sidebar-nav' });
  const navBadge = h('span', { class: 'nav-badge', hidden: true }, '0');
  changesNavBadge = navBadge;

  for (const group of GROUPS) {
    const items = Object.entries(ROUTES).filter(([, config]) => config.group === group);
    const groupEl = h('div', { class: 'nav-group' }, h('div', { class: 'nav-label' }, group));
    for (const [name, config] of items) {
      const button = h(
        'button',
        {
          class: 'nav-item',
          type: 'button',
          onClick: () => {
            closeSidebar();
            store.navigate(name);
          }
        },
        icon(config.iconName, 17),
        h('span', { class: 'truncate' }, config.label)
      );
      navElements.set(name, button);
      groupEl.append(button);
    }
    nav.append(groupEl);
  }

  const changesButton = h(
    'button',
    {
      class: 'nav-item',
      type: 'button',
      onClick: () => {
        closeSidebar();
        drawer?.open();
      }
    },
    icon('send', 17),
    h('span', { class: 'truncate' }, 'Pending changes'),
    navBadge
  );

  const siteLink = h(
    'a',
    { class: 'nav-item', href: store.siteUrl() || '#', target: '_blank', rel: 'noopener' },
    icon('globe', 17),
    h('span', { class: 'truncate' }, 'View website'),
    icon('external', 13)
  );

  nav.append(h('div', { class: 'nav-group' }, h('div', { class: 'nav-label' }, 'Publish'), changesButton, siteLink));

  const user = store.state.user || { login: 'admin', name: 'Administrator' };
  const initials = (user.name || user.login || 'A')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  const userChip = h(
    'div',
    { class: 'user-chip' },
    h(
      'span',
      { class: 'avatar' },
      user.avatarUrl ? h('img', { src: user.avatarUrl, alt: '' }) : initials || 'A'
    ),
    h('div', { class: 'uc-text' }, h('strong', { class: 'truncate' }, user.name || user.login || 'Admin'), h('span', null, store.repoLabel()))
  );

  const signOut = h(
    'button',
    { class: 'icon-btn', title: 'Sign out', 'aria-label': 'Sign out', onClick: signOutUser },
    icon('logout', 17)
  );

  const sidebarEl = h(
    'aside',
    { class: 'sidebar', id: 'sidebar' },
    h(
      'div',
      { class: 'sidebar-head' },
      h('span', { class: 'brand-mark' }, 'C'),
      h(
        'div',
        { class: 'brand-text' },
        h('strong', null, 'CivPrepMaster'),
        h('span', null, 'Admin panel')
      ),
      h('button', { class: 'icon-btn menu-btn', style: 'margin-left:auto', 'aria-label': 'Close menu', onClick: closeSidebar }, icon('x', 18))
    ),
    h(
      'div',
      { class: 'repo-pill' },
      icon('branch', 13),
      h('span', { class: 'mono truncate' }, `${repo.owner}/${repo.name}`),
      h('span', { class: 'muted tiny nowrap' }, repo.branch || 'main')
    ),
    nav,
    h('div', { class: 'sidebar-foot' }, userChip, h('div', { class: 'row' }, signOut, h('span', { class: 'tiny muted' }, 'Signed in')))
  );

  const backdrop = h('div', { class: 'sidebar-backdrop', onClick: closeSidebar });

  return {
    element: h('div', { style: 'display:contents' }, sidebarEl, backdrop),
    setActive(name) {
      for (const [key, button] of navElements) button.classList.toggle('active', key === name);
    },
    close: closeSidebar
  };
}

function buildTopbar() {
  const title = h('div', { class: 'topbar-title' }, 'Dashboard');
  const subtitle = h('div', { class: 'topbar-sub' }, store.repoLabel());
  const menuButton = h(
    'button',
    { class: 'btn btn-ghost btn-icon menu-btn', 'aria-label': 'Open menu', onClick: openSidebar },
    icon('menu', 20)
  );

  const stagedChip = h(
    'button',
    { class: 'btn btn-sm', type: 'button', title: 'Review pending changes' },
    icon('send', 15),
    h('span', null, 'No changes')
  );
  const refreshButton = h(
    'button',
    {
      class: 'btn btn-sm btn-icon',
      type: 'button',
      title: 'Reload repository files',
      'aria-label': 'Reload repository files',
      onClick: () => refreshTree({ force: true })
    },
    icon('refresh', 16)
  );
  const publishButton = h(
    'button',
    { class: 'btn btn-primary', type: 'button' },
    icon('send', 16),
    h('span', null, 'Publish')
  );

  const badges = h('div', { class: 'row', id: 'health-badges' });
  if (store.state.health?.dryRun) badges.append(badge('Dry run', 'warn'));
  if (store.state.health?.readOnly) badges.append(badge('Read-only', 'danger'));

  const element = h(
    'header',
    { class: 'topbar' },
    menuButton,
    h('div', null, title, subtitle),
    badges,
    h(
      'div',
      { class: 'topbar-actions' },
      stagedChip,
      refreshButton,
      publishButton,
      h(
        'button',
        {
          class: 'btn btn-sm btn-icon',
          type: 'button',
          title: 'Toggle dark mode',
          'aria-label': 'Toggle dark mode',
          onClick: toggleTheme
        },
        icon('palette', 16)
      )
    )
  );

  return { element, title, subtitle, stagedChip, publishButton };
}

function openSidebar() {
  document.getElementById('sidebar')?.classList.add('open');
  document.querySelector('.sidebar-backdrop')?.classList.add('open');
}

function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.querySelector('.sidebar-backdrop')?.classList.remove('open');
}

function toggleTheme() {
  const current = store.state.settings.theme;
  const next = current === 'dark' ? 'light' : 'dark';
  store.saveSettings({ theme: next });
  toast(`Switched to ${next} mode`, { type: 'info', timeout: 1600 });
  renderShell();
  renderRoute();
}

function updateStagedUI() {
  if (!stagedChip) return;
  const summary = store.stageSummary();
  const count = summary.total;
  clear(stagedChip);
  stagedChip.append(
    icon('send', 15),
    h('span', null, count ? `${count} pending` : 'No changes'
    )
  );
  stagedChip.classList.toggle('btn-soft', count > 0);
  if (publishButton) {
    publishButton.disabled = count === 0 || !!store.state.health?.readOnly;
    clear(publishButton);
    publishButton.append(icon('send', 16), h('span', null, count ? `Publish ${count}` : 'Publish'));
  }
  if (changesNavBadge) {
    changesNavBadge.hidden = count === 0;
    changesNavBadge.textContent = String(count);
  }
  drawer?.update();
}

async function refreshTree({ force = false, silent = false } = {}) {
  try {
    await withBusy(() => api.loadTree({ force }));
    if (!silent) toast('Repository synced', { type: 'success', timeout: 2000 });
    if (subtitleEl) {
      const head = store.state.tree?.headSha ? store.state.tree.headSha.slice(0, 7) : '';
      subtitleEl.textContent = `${store.repoLabel()} · ${store.branchName()}${head ? ' · ' + head : ''}`;
    }
    return store.state.tree;
  } catch (error) {
    if (error.status === 401) return null;
    toast(error.message, { type: 'error', title: 'Could not load repository' });
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* routing                                                             */
/* ------------------------------------------------------------------ */

function queryString(query) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, value);
  }
  const text = params.toString();
  return text ? '?' + text : '';
}

async function handleHashChange() {
  const next = store.parseRoute();
  if (store.state.leaveGuard) {
    const ok = await store.state.leaveGuard(next);
    if (!ok) {
      history.replaceState(null, '', `#/${currentRoute.name}${queryString(currentRoute.query)}`);
      return;
    }
    store.state.leaveGuard = null;
  }
  if (next.name === currentRoute.name && next.query.path === currentRoute.query.path) return;
  currentRoute = next;
  await renderRoute();
}

async function renderRoute() {
  const token = ++routeToken;
  const route = ROUTES[currentRoute.name] ? currentRoute : { ...currentRoute, name: 'dashboard', query: {} };
  if (route !== currentRoute) currentRoute = route;
  const config = ROUTES[route.name];

  document.title = config.label + ' · CivPrepMaster admin';
  if (titleEl) titleEl.textContent = config.label;
  if (subtitleEl) {
    const head = store.state.tree?.headSha ? store.state.tree.headSha.slice(0, 7) : '';
    subtitleEl.textContent = config.subtitle + (head ? ` · ${head}` : '');
  }
  for (const [key, button] of navElements) button.classList.toggle('active', key === route.name);
  closeSidebar();

  currentModule?.destroy?.();
  currentModule = null;
  store.state.saveHandler = null;

  clear(viewEl);
  viewEl.append(loadingView('Loading ' + config.label.toLowerCase() + '…'));

  try {
    const module = await config.load();
    if (token !== routeToken) return;
    currentModule = module;
    clear(viewEl);
    await module.render(viewEl, {
      query: route.query,
      navigate: store.navigate,
      setQuery(query) {
        currentRoute = { ...currentRoute, query: { ...query } };
        history.replaceState(null, '', `#/${currentRoute.name}${queryString(query)}`);
      },
      refreshTree,
      openPublish,
      updateStagedUI
    });
  } catch (error) {
    if (token !== routeToken) return;
    console.error(error);
    clear(viewEl);
    viewEl.append(
      errorState(error.message || 'Could not load this screen', () => renderRoute())
    );
  }
}

function openPublish() {
  if (store.state.health?.readOnly) {
    toast('This server is in read-only mode', { type: 'warn' });
    return;
  }
  if (!store.stagedCount()) {
    toast('Save a change first — then publish it here', { type: 'info' });
    return;
  }
  openPublishDialog({
    onPublished: async (result) => {
      updateStagedUI();
      toast(
        result.dryRun
          ? 'Dry run complete — no commit created'
          : result.mode === 'pr'
            ? `Pull request #${result.prNumber} opened`
            : 'Published — the site rebuilds in about a minute',
        { type: 'success', title: result.dryRun ? 'Dry run' : 'Published' }
      );
      await refreshTree({ force: true, silent: true });
      if (['dashboard', 'history', 'pulls'].includes(currentRoute.name)) renderRoute();
    }
  });
}

async function signOutUser() {
  const ok = await confirmDialog({
    title: 'Sign out?',
    message: 'Any unpublished drafts stay saved in this browser.',
    confirmLabel: 'Sign out'
  });
  if (!ok) return;
  await api.logout();
  store.clearSession();
  currentModule?.destroy?.();
  currentModule = null;
  renderLogin(null);
  toast('Signed out', { type: 'info' });
}

function removeDrawers() {
  document.querySelectorAll('.drawer, .drawer-backdrop').forEach((node) => node.remove());
  drawer = null;
}

/* ------------------------------------------------------------------ */
/* start                                                               */
/* ------------------------------------------------------------------ */

boot().catch((error) => {
  console.error(error);
  const target = document.getElementById('app');
  if (target) {
    clear(target);
    target.append(
      h(
        'div',
        { class: 'view' },
        errorState(error.message || 'The admin panel could not start', () => location.reload())
      )
    );
  }
});
