/* Backend client. The GitHub token lives only on the server; this module only
 * ever sees a short-lived session token. */

import { clearSession, setTree, state } from './store.js';

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'request_failed', details = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function apiBase() {
  const raw = state.settings.apiBase || state.config?.apiBase || '';
  return String(raw).replace(/\/+$/, '');
}

export function apiUrl(path, query) {
  const base = apiBase();
  const url = base + path;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, value);
  }
  const suffix = params.toString();
  return suffix ? `${url}?${suffix}` : url;
}

async function parseError(response) {
  let payload = null;
  try {
    const text = await response.text();
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  const message =
    (payload && payload.error && payload.error.message) ||
    (response.status === 401
      ? 'Your session has expired. Please sign in again.'
      : `Request failed (${response.status})`);
  return new ApiError(message, {
    status: response.status,
    code: (payload && payload.error && payload.error.code) || 'request_failed',
    details: payload && payload.error ? payload.error.details : null
  });
}

async function request(path, { method = 'GET', body, query, auth = true, raw = false, base = null } = {}) {
  if (auth && !state.session?.token) {
    throw new ApiError('Sign in to continue', { status: 401, code: 'unauthorized' });
  }
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) headers.Authorization = 'Bearer ' + state.session.token;

  const url = base !== null ? base.replace(/\/+$/, '') + path : apiUrl(path, query);
  let response;
  try {
    response = await fetch(url + (query && base !== null ? '?' + new URLSearchParams(query).toString() : ''), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store'
    });
  } catch (error) {
    throw new ApiError('Cannot reach the admin API. Check the backend URL and that the server is running.', {
      status: 0,
      code: 'network_error',
      details: error.message
    });
  }

  if (!response.ok) {
    const apiError = await parseError(response);
    if (response.status === 401 && auth) {
      clearSession();
      window.dispatchEvent(new CustomEvent('admin:session-expired'));
    }
    throw apiError;
  }

  if (raw) return response;
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/* ------------------------------------------------------------------ */
/* auth                                                                */
/* ------------------------------------------------------------------ */

export async function health(baseOverride = null) {
  const base = baseOverride !== null ? baseOverride : null;
  return request('/api/health', { auth: false, base });
}

export async function login(password) {
  const data = await request('/api/auth/login', { method: 'POST', body: { password }, auth: false });
  return data;
}

export async function me() {
  return request('/api/auth/me');
}

export async function logout() {
  try {
    await request('/api/auth/logout', { method: 'POST' });
  } catch {
    /* stateless sessions — local sign-out is enough */
  }
}

export async function getAudit(limit = 40) {
  return request('/api/audit', { query: { limit } });
}

/* ------------------------------------------------------------------ */
/* repository                                                          */
/* ------------------------------------------------------------------ */

export async function loadTree({ force = false } = {}) {
  if (!force && state.tree && Date.now() - state.tree.loadedAt < 45000) return state.tree;
  const data = await request('/api/repo/tree');
  setTree(data);
  return state.tree;
}

export async function getFile(path, ref) {
  return request('/api/repo/file', { query: { path, ref } });
}

export async function fileText(path, ref) {
  const file = await getFile(path, ref);
  if (file.isBinary || file.text === null) {
    throw new ApiError('This file is binary and cannot be edited as text', { status: 415, code: 'binary_file' });
  }
  return file;
}

export async function getCommits({ path, page = 1, perPage = 30 } = {}) {
  return request('/api/repo/commits', { query: { path, page, per_page: perPage } });
}

export async function getCommit(sha) {
  return request(`/api/repo/commits/${encodeURIComponent(sha)}`);
}

export async function getPagesStatus() {
  return request('/api/repo/pages');
}

export async function publish({ files, message, mode, expectedHead, title, body, force = false }) {
  return request('/api/repo/publish', {
    method: 'POST',
    body: { files, message, mode, expectedHead, title, body, force }
  });
}

export async function getPullRequests(stateFilter = 'open') {
  return request('/api/repo/pulls', { query: { state: stateFilter } });
}

export async function mergePullRequest(number, method = 'squash') {
  return request(`/api/repo/pulls/${number}/merge`, { method: 'POST', body: { method } });
}

export async function closePullRequest(number) {
  return request(`/api/repo/pulls/${number}/close`, { method: 'POST' });
}

export async function backup() {
  return request('/api/repo/backup', { raw: true });
}

export async function rawFile(path, ref) {
  return request('/api/repo/raw', { raw: true, query: { path, ref } });
}

/** Fetches a repository file as an object URL (for image/PDF previews). */
export async function fileObjectUrl(path, ref) {
  const response = await rawFile(path, ref);
  const blob = await response.blob();
  return { url: URL.createObjectURL(blob), blob, type: blob.type };
}

export async function downloadFileBlob(path, ref) {
  const response = await rawFile(path, ref);
  return response.blob();
}
