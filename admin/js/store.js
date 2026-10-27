/* Client-side state, local drafts and preferences for the admin panel. */

const KEYS = {
  settings: 'cpm.admin.settings.v1',
  session: 'cpm.admin.session.v1',
  staged: 'cpm.admin.staged.v1'
};

export const DEFAULT_CONFIG = {
  apiBase: '',
  repo: { owner: 'Erarunpanthi', name: 'arunpanthi.com.np', branch: 'main' },
  siteUrl: 'https://arunpanthi.com.np',
  publishMode: 'direct',
  maxUploadMB: 25,
  uploadFolders: ['Photos', 'assets', 'Resources'],
  paths: {
    currentAffairs: 'Psc-preparation/Current-Affairs/tests.js',
    practiceTestDir: 'Psc-preparation/Test',
    practiceTestIndex: 'Psc-preparation/Test/index.html',
    practiceTestTemplate: 'Psc-preparation/Test/1.1-1.html',
    navbar: 'partials/navbar.html',
    social: 'partials/social.html',
    footer: 'partials/footer.html',
    sitemap: 'sitemap.xml'
  },
  featuredPages: ['index.html', 'aboutus.html', 'contactus.html', 'resources.html']
};

export const DEFAULT_SETTINGS = {
  apiBase: '',
  publishMode: '',
  theme: 'system',
  editorFont: 13,
  remember: false,
  optimizeImages: true,
  showBackendFiles: false,
  showNavText: false
};

export const state = {
  config: structuredClone(DEFAULT_CONFIG),
  settings: { ...DEFAULT_SETTINGS },
  session: null,
  health: null,
  user: null,
  repo: null,
  tree: null,
  fileMap: new Map(),
  staged: new Map(),
  stagedSkipped: 0,
  route: { name: 'dashboard', query: {} },
  saveHandler: null,
  leaveGuard: null,
  viewDirty: false
};

function readJson(storage, key, fallback) {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* config + settings                                                   */
/* ------------------------------------------------------------------ */

export async function loadConfig() {
  try {
    const response = await fetch(new URL('./config.json', window.location.href), { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      state.config = {
        ...structuredClone(DEFAULT_CONFIG),
        ...data,
        repo: { ...DEFAULT_CONFIG.repo, ...(data.repo || {}) },
        paths: { ...DEFAULT_CONFIG.paths, ...(data.paths || {}) }
      };
    }
  } catch {
    /* keep defaults; the setup screen explains what is missing */
  }
  return state.config;
}

export function loadLocal() {
  const settings = readJson(localStorage, KEYS.settings, {});
  state.settings = { ...DEFAULT_SETTINGS, ...(settings || {}) };

  const localSession = readJson(localStorage, KEYS.session, null);
  const sessionSession = readJson(sessionStorage, KEYS.session, null);
  const session = localSession || sessionSession;
  if (session && session.token && (!session.expiresAt || session.expiresAt > Date.now())) {
    state.session = session;
    if (localSession) state.settings.remember = true;
  } else {
    localStorage.removeItem(KEYS.session);
    sessionStorage.removeItem(KEYS.session);
  }

  const staged = readJson(localStorage, KEYS.staged, null);
  if (staged && Array.isArray(staged.changes)) {
    let bytes = 0;
    for (const change of staged.changes) {
      if (!change || !change.path) continue;
      const size = (change.text?.length || 0) + (change.base64?.length || 0);
      if (bytes + size > 4 * 1024 * 1024) {
        state.stagedSkipped += 1;
        continue;
      }
      bytes += size;
      state.staged.set(change.path, change);
    }
  }

  applyTheme(state.settings.theme);
}

export function saveSettings(patch) {
  state.settings = { ...state.settings, ...patch };
  writeJson(localStorage, KEYS.settings, state.settings);
  if (patch.theme) applyTheme(patch.theme);
  return state.settings;
}

export function applyTheme(theme) {
  const root = document.documentElement;
  const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const effective = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
  root.setAttribute('data-theme', effective === 'dark' ? 'dark' : 'light');
  root.style.setProperty('--editor-font', (state.settings.editorFont || 13) + 'px');
}

let systemThemeBound = false;
export function bindSystemTheme() {
  if (systemThemeBound || !window.matchMedia) return;
  systemThemeBound = true;
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (state.settings.theme === 'system') applyTheme('system');
  });
}

/* ------------------------------------------------------------------ */
/* session                                                             */
/* ------------------------------------------------------------------ */

export function setSession(session, remember = false) {
  state.session = session;
  state.settings.remember = !!remember;
  writeJson(localStorage, KEYS.settings, state.settings);
  if (remember) {
    writeJson(localStorage, KEYS.session, session);
    sessionStorage.removeItem(KEYS.session);
  } else {
    writeJson(sessionStorage, KEYS.session, session);
    localStorage.removeItem(KEYS.session);
  }
}

export function updateSessionUser(user) {
  if (!state.session) return;
  state.session.user = user;
  const storage = state.settings.remember ? localStorage : sessionStorage;
  writeJson(storage, KEYS.session, state.session);
}

export function clearSession() {
  state.session = null;
  state.user = null;
  localStorage.removeItem(KEYS.session);
  sessionStorage.removeItem(KEYS.session);
}

export function sessionRemaining(session = state.session) {
  if (!session || !session.expiresAt) return 0;
  return Math.max(0, session.expiresAt - Date.now());
}

/* ------------------------------------------------------------------ */
/* repository tree                                                     */
/* ------------------------------------------------------------------ */

export function setTree(data) {
  state.tree = { ...data, loadedAt: Date.now() };
  state.fileMap = new Map();
  for (const entry of data.entries || []) {
    if (entry.type === 'file') state.fileMap.set(entry.path, entry);
  }
}

export function invalidateTree() {
  state.tree = null;
  state.fileMap.clear();
}

export function treeFiles({ includeBackend = false } = {}) {
  const files = [...state.fileMap.values()];
  return includeBackend ? files : files.filter((file) => !isInternalPath(file.path));
}

export function isInternalPath(path) {
  return /^(admin-server|node_modules|\.git|\.github|\.arena)(\/|$)/i.test(String(path || ''));
}

export function findFile(path) {
  return state.fileMap.get(path) || null;
}

export function filesByExtension(extensions) {
  const list = Array.isArray(extensions) ? extensions : [extensions];
  return treeFiles().filter((file) => list.some((ext) => file.path.toLowerCase().endsWith(ext)));
}

export function htmlPages() {
  return treeFiles()
    .filter((file) => /\.html?$/i.test(file.path))
    .filter((file) => !file.path.startsWith('admin/') && !isInternalPath(file.path));
}

/* ------------------------------------------------------------------ */
/* staging                                                             */
/* ------------------------------------------------------------------ */

function stagingSize(entry) {
  return (entry.text?.length || 0) + (entry.base64?.length || 0);
}

export function stage(change) {
  if (!change || !change.path) throw new Error('A path is required');
  const hasContent = typeof change.text === 'string' || typeof change.base64 === 'string';
  if (!hasContent && !change.delete) throw new Error('Nothing to stage for ' + change.path);

  const previous = state.staged.get(change.path);
  const entry = {
    path: change.path,
    text: change.delete ? undefined : change.text !== undefined ? change.text : previous?.text,
    base64: change.delete ? undefined : change.base64 !== undefined ? change.base64 : previous?.base64,
    delete: !!change.delete,
    action: change.delete ? 'delete' : previous && previous.action !== 'create' && findFile(change.path) ? 'update' : previous?.action === 'create' ? 'create' : findFile(change.path) ? 'update' : 'create',
    originalText: change.originalText !== undefined ? change.originalText : previous?.originalText,
    originalSha: change.originalSha !== undefined ? change.originalSha : previous?.originalSha,
    size: change.size !== undefined ? change.size : previous?.size,
    at: Date.now()
  };
  if (!entry.delete && entry.text === undefined && entry.base64 === undefined) {
    throw new Error('No content for ' + change.path);
  }
  state.staged.set(change.path, entry);
  persistStaged();
  emitStaged();
  return entry;
}

export function unstage(path) {
  const removed = state.staged.delete(path);
  if (removed) {
    persistStaged();
    emitStaged();
  }
  return removed;
}

export function clearStaged() {
  state.staged.clear();
  state.stagedSkipped = 0;
  persistStaged();
  emitStaged();
}

export function isStaged(path) {
  return state.staged.has(path);
}

export function stagedFor(path) {
  return state.staged.get(path) || null;
}

export function stagedChanges() {
  return [...state.staged.values()].sort((a, b) => a.path.localeCompare(b.path));
}

export function stagedCount() {
  return state.staged.size;
}

export function stagedPayload() {
  return stagedChanges().map((change) => {
    const payload = { path: change.path };
    if (change.delete) payload.delete = true;
    else if (typeof change.base64 === 'string' && change.text === undefined) payload.base64 = change.base64;
    else payload.text = change.text ?? '';
    return payload;
  });
}

export function stageSummary() {
  const changes = stagedChanges();
  return {
    total: changes.length,
    created: changes.filter((change) => change.action === 'create').length,
    updated: changes.filter((change) => change.action === 'update').length,
    deleted: changes.filter((change) => change.delete).length
  };
}

function persistStaged() {
  const changes = [];
  let bytes = 0;
  let skipped = 0;
  for (const change of state.staged.values()) {
    const size = stagingSize(change);
    if (size > 1.4 * 1024 * 1024 || bytes + size > 3.6 * 1024 * 1024) {
      skipped += 1;
      continue;
    }
    bytes += size;
    changes.push(change);
  }
  state.stagedSkipped = skipped;
  const ok = writeJson(localStorage, KEYS.staged, { savedAt: Date.now(), changes });
  if (!ok) state.stagedSkipped += 1;
}

function emitStaged() {
  window.dispatchEvent(new CustomEvent('admin:staged', { detail: stageSummary() }));
}

/* ------------------------------------------------------------------ */
/* routing helpers                                                     */
/* ------------------------------------------------------------------ */

export function parseRoute() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [name, queryString] = raw.split('?');
  const query = {};
  if (queryString) {
    for (const [key, value] of new URLSearchParams(queryString)) query[key] = value;
  }
  return { name: name || 'dashboard', query };
}

export function navigate(name, query = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, value);
  }
  const suffix = params.toString() ? '?' + params.toString() : '';
  const next = `#/${name}${suffix}`;
  if (location.hash === next) {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    location.hash = next;
  }
}

export function publicUrl(path) {
  const base = (state.health?.repo?.siteUrl || state.config.siteUrl || '').replace(/\/+$/, '');
  const encoded = String(path || '')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return base + '/' + encoded;
}

export function repoLabel() {
  const repo = state.health?.repo || state.config.repo;
  return `${repo.owner}/${repo.name}`;
}

export function branchName() {
  return state.health?.repo?.branch || state.config.repo.branch || 'main';
}

export function publishDefault() {
  return state.settings.publishMode || state.health?.publishMode || state.config.publishMode || 'direct';
}

export function siteUrl() {
  return (state.health?.repo?.siteUrl || state.config.siteUrl || '').replace(/\/+$/, '');
}
