/* Admin API — runtime-agnostic request handler.
 * Adapters (Node server + Cloudflare Worker) only translate HTTP in/out. */

import {
  bearerFromHeaders,
  bytesToBase64,
  createSession,
  sessionTtlSeconds,
  verifySession,
  verifyPassword
} from './auth.js';
import { GitHubError } from './github.js';
import {
  baseName,
  extensionOf,
  guessContentType,
  isAllowedUploadName,
  isForbiddenRepoPath,
  normalizeRepoPath,
  publicUrlFor,
  slugifyFileName
} from './paths.js';

const VERSION = '1.0.0';
const MAX_FILES_PER_COMMIT = 300;
const MAX_TEXT_CHARS = 6 * 1024 * 1024;
const DEFAULT_MAX_UPLOAD_MB = 25;
const COMMIT_MESSAGE_LIMIT = 500;

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.ico', '.bmp', '.pdf',
  '.zip', '.rar', '.7z', '.epub', '.mp3', '.mp4', '.webm', '.wav', '.ogg',
  '.woff', '.woff2', '.ttf', '.otf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'
]);

const LANGUAGE_BY_EXTENSION = {
  '.html': 'html', '.htm': 'html',
  '.css': 'css',
  '.js': 'javascript', '.mjs': 'javascript',
  '.json': 'json', '.webmanifest': 'json',
  '.xml': 'xml', '.svg': 'xml',
  '.md': 'markdown', '.txt': 'text', '.csv': 'text',
  '.htaccess': 'text', '.yml': 'yaml', '.yaml': 'yaml'
};

class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function jsonResponse(status, body, headers = {}) {
  return {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
    body: JSON.stringify(body)
  };
}

function errorResponse(status, code, message, details) {
  return jsonResponse(status, { error: { code, message, ...(details ? { details } : {}) } });
}

function normalizeBase64(input) {
  const clean = String(input || '').replace(/\s+/g, '');
  if (!clean) return '';
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean)) return null;
  return clean;
}

function decodedBase64Length(base64) {
  const clean = base64.replace(/=+$/, '');
  return Math.floor((clean.length * 3) / 4);
}

function textToBase64(text) {
  return bytesToBase64(new TextEncoder().encode(text));
}

function isProbablyBinary(repoPath, base64) {
  const ext = extensionOf(repoPath);
  if (BINARY_EXTENSIONS.has(ext)) return true;
  if (!base64) return false;
  const sample = base64.slice(0, 4096);
  try {
    const bytes = Uint8Array.from(atob(sample.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(sample.length / 4) * 4, '=')), (c) =>
      c.charCodeAt(0)
    );
    return bytes.includes(0);
  } catch {
    return true;
  }
}

function decodeUtf8(base64) {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function languageFor(repoPath) {
  const ext = extensionOf(repoPath);
  if (LANGUAGE_BY_EXTENSION[ext]) return LANGUAGE_BY_EXTENSION[ext];
  const name = baseName(repoPath).toLowerCase();
  if (name === '.htaccess' || name === 'cname' || name === 'robots.txt') return 'text';
  return 'text';
}

function defaultCommitMessage(files) {
  if (files.length === 1) {
    const file = files[0];
    if (file.delete) return `Delete ${file.path}`;
    return `Update ${file.path}`;
  }
  return `Update ${files.length} files from admin panel`;
}

function sanitizeCommitMessage(message, files) {
  const text = String(message || '').replace(/\r\n/g, '\n').trim();
  if (!text) return defaultCommitMessage(files);
  return text.slice(0, COMMIT_MESSAGE_LIMIT);
}

function createLoginLimiter({ maxFailures = 8, windowMs = 10 * 60 * 1000, blockMs = 15 * 60 * 1000 } = {}) {
  const map = new Map();
  function prune(now) {
    if (map.size < 2000) return;
    for (const [key, entry] of map) {
      if (entry.resetAt < now && entry.blockedUntil < now) map.delete(key);
    }
  }
  return {
    check(ip, now = Date.now()) {
      prune(now);
      const entry = map.get(ip);
      if (!entry) return { allowed: true };
      if (entry.blockedUntil > now) {
        return { allowed: false, retryAfter: Math.ceil((entry.blockedUntil - now) / 1000) };
      }
      if (entry.resetAt < now) {
        map.delete(ip);
        return { allowed: true };
      }
      if (entry.failures >= maxFailures) {
        entry.blockedUntil = now + blockMs;
        return { allowed: false, retryAfter: Math.ceil(blockMs / 1000) };
      }
      return { allowed: true };
    },
    fail(ip, now = Date.now()) {
      const entry = map.get(ip) || { failures: 0, resetAt: now + windowMs, blockedUntil: 0 };
      entry.failures += 1;
      if (entry.resetAt < now) {
        entry.failures = 1;
        entry.resetAt = now + windowMs;
      }
      if (entry.failures >= maxFailures) entry.blockedUntil = now + blockMs;
      map.set(ip, entry);
      return entry;
    },
    succeed(ip) {
      map.delete(ip);
    }
  };
}

function corsHeaders(allowedOrigins, origin) {
  const list = Array.isArray(allowedOrigins) ? allowedOrigins : String(allowedOrigins || '').split(',');
  const cleaned = list.map((item) => item.trim()).filter(Boolean);
  const allowAll = cleaned.includes('*');
  const allowed = allowAll || !origin || cleaned.includes(origin);
  const headers = {
    Vary: 'Origin',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Requested-With',
    'Access-Control-Max-Age': '600'
  };
  if (allowed && origin) headers['Access-Control-Allow-Origin'] = allowAll ? '*' : origin;
  else if (allowed && allowAll) headers['Access-Control-Allow-Origin'] = '*';
  return headers;
}

function parsePositiveInt(value, fallback, min, max) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(num)));
}

export function createApi({
  github,
  config,
  adminPassword,
  sessionSecret,
  dryRun = false,
  auditLog = [],
  loginLimiter = createLoginLimiter(),
  fetchImpl
}) {
  if (!sessionSecret) throw new Error('sessionSecret is required');
  if (!adminPassword) throw new Error('adminPassword is required');

  const maxUploadMB = Number(config.maxUploadMB) > 0 ? Number(config.maxUploadMB) : DEFAULT_MAX_UPLOAD_MB;
  const maxUploadBytes = maxUploadMB * 1024 * 1024;
  const ttlSeconds = sessionTtlSeconds(config);
  let cachedUser = null;

  async function currentUser() {
    if (cachedUser) return cachedUser;
    if (!github) return null;
    cachedUser = await github.getAuthenticatedUser();
    return cachedUser;
  }

  function record(entry) {
    auditLog.unshift({ at: new Date().toISOString(), ...entry });
    if (auditLog.length > 400) auditLog.length = 400;
  }

  async function requireSession(req) {
    const token = bearerFromHeaders(req.headers);
    if (!token) throw new ApiError(401, 'unauthorized', 'Sign in to continue');
    const claims = await verifySession(sessionSecret, token);
    if (!claims) throw new ApiError(401, 'session_expired', 'Your session has expired. Please sign in again.');
    return claims;
  }

  function assertRepoPath(rawPath) {
    const normalized = normalizeRepoPath(rawPath);
    if (!normalized) throw new ApiError(400, 'invalid_path', `Invalid file path: ${rawPath}`);
    if (isForbiddenRepoPath(normalized)) {
      throw new ApiError(403, 'forbidden_path', `This path cannot be managed from the admin panel: ${normalized}`);
    }
    return normalized;
  }

  function buildFilePayload(files, { allowDelete = true } = {}) {
    if (!Array.isArray(files) || files.length === 0) {
      throw new ApiError(400, 'no_files', 'Add at least one file change before publishing');
    }
    if (files.length > MAX_FILES_PER_COMMIT) {
      throw new ApiError(400, 'too_many_files', `Publish at most ${MAX_FILES_PER_COMMIT} files at once`);
    }
    const seen = new Set();
    const payload = [];
    for (const input of files) {
      if (!input || typeof input !== 'object') throw new ApiError(400, 'invalid_file', 'Invalid file entry');
      const repoPath = assertRepoPath(input.path);
      if (seen.has(repoPath)) {
        throw new ApiError(400, 'duplicate_path', `The same path appears twice: ${repoPath}`);
      }
      seen.add(repoPath);

      if (input.delete) {
        if (!allowDelete) throw new ApiError(400, 'delete_not_allowed', 'Deleting files is not allowed here');
        payload.push({ path: repoPath, delete: true });
        continue;
      }

      let base64 = null;
      if (typeof input.base64 === 'string' && input.base64.length) {
        base64 = normalizeBase64(input.base64);
        if (base64 === null) throw new ApiError(400, 'invalid_base64', `Invalid file data for ${repoPath}`);
      } else if (typeof input.text === 'string') {
        if (input.text.length > MAX_TEXT_CHARS) {
          throw new ApiError(413, 'file_too_large', `${repoPath} is larger than the ${Math.round(MAX_TEXT_CHARS / 1024 / 1024)} MB text limit`);
        }
        base64 = textToBase64(input.text);
      } else {
        throw new ApiError(400, 'missing_content', `No content supplied for ${repoPath}`);
      }

      const bytes = decodedBase64Length(base64);
      if (bytes > maxUploadBytes) {
        throw new ApiError(413, 'file_too_large', `${repoPath} is larger than the ${maxUploadMB} MB upload limit`);
      }
      if (base64.length > maxUploadBytes * 1.4 + 1024) {
        throw new ApiError(413, 'file_too_large', `${repoPath} is too large`);
      }
      const dangerous = /\.(exe|msi|bat|cmd|com|scr|jar|dll|so|dylib|bin|apk|dmg|iso|vbs|ps1)$/i.test(repoPath);
      if (dangerous) {
        throw new ApiError(400, 'unsupported_file_type', `Executable files cannot be uploaded: ${repoPath}`);
      }
      if (!isAllowedUploadName(repoPath) && /\.[a-z0-9]{1,8}$/i.test(repoPath) === false && bytes > 0) {
        throw new ApiError(400, 'unsupported_file_type', `Unsupported file type: ${repoPath}`);
      }
      payload.push({ path: repoPath, base64, size: bytes });
    }
    return payload;
  }

  async function handle(req) {
    const method = String(req.method || 'GET').toUpperCase();
    const path = String(req.path || '/');
    const query = req.query || {};
    const headers = req.headers || {};
    const origin = headers.origin || headers.Origin || '';
    const cors = corsHeaders(config.allowedOrigins, origin);

    if (method === 'OPTIONS') {
      return { status: 204, headers: cors, body: null };
    }

    try {
      const result = await route({ method, path, query, headers, body: req.body, ip: req.ip || 'unknown' });
      return { ...result, headers: { ...cors, ...result.headers } };
    } catch (error) {
      if (error instanceof ApiError) {
        const result = errorResponse(error.status, error.code, error.message, error.details);
        return { ...result, headers: { ...cors, ...result.headers } };
      }
      if (error instanceof GitHubError) {
        const status = error.status === 409 ? 409 : error.status === 404 ? 404 : error.status === 403 ? 403 : 502;
        const result = errorResponse(status, error.code, error.message, error.details);
        return { ...result, headers: { ...cors, ...result.headers } };
      }
      console.error('[admin-api] unexpected error:', error);
      const result = errorResponse(500, 'internal_error', 'Unexpected server error');
      return { ...result, headers: { ...cors, ...result.headers } };
    }
  }

  async function route({ method, path, query, headers, body, ip }) {
    /* ---------- public ---------- */
    if (path === '/api/health' && (method === 'GET' || method === 'HEAD')) {
      return jsonResponse(200, {
        ok: true,
        service: 'arunpanthi-admin',
        version: VERSION,
        time: new Date().toISOString(),
        dryRun: !!dryRun,
        readOnly: !!config.readOnly,
        repo: {
          owner: config.owner,
          name: config.repo,
          branch: config.branch,
          siteUrl: config.siteUrl
        },
        publishMode: config.publishMode || 'direct',
        limits: { maxUploadMB, maxFilesPerCommit: MAX_FILES_PER_COMMIT },
        github: !!github
      });
    }

    if (path === '/api/auth/login' && method === 'POST') {
      const limit = loginLimiter.check(ip);
      if (!limit.allowed) {
        return jsonResponse(
          429,
          { error: { code: 'rate_limited', message: 'Too many failed attempts. Try again later.', retryAfter: limit.retryAfter } },
          { 'Retry-After': String(limit.retryAfter || 900) }
        );
      }
      const password = body && typeof body.password === 'string' ? body.password : '';
      const valid = await verifyPassword(password, adminPassword);
      if (!valid) {
        loginLimiter.fail(ip);
        await new Promise((resolve) => setTimeout(resolve, 250));
        record({ action: 'login_failed', ip });
        return errorResponse(401, 'invalid_credentials', 'Incorrect password');
      }
      loginLimiter.succeed(ip);
      let user = null;
      try {
        user = await currentUser();
      } catch (error) {
        // GitHub connectivity issues should not prevent a valid admin login.
        console.warn('[admin-api] could not load GitHub user:', error.message);
      }
      const session = await createSession(sessionSecret, {
        subject: 'admin',
        ttlSeconds,
        claims: { u: user ? user.login : 'admin' }
      });
      record({ action: 'login', ip, user: user && user.login });
      return jsonResponse(200, {
        token: session.token,
        expiresAt: session.expiresAt,
        user: user || { login: 'admin', name: 'Administrator' },
        dryRun: !!dryRun,
        repo: { owner: config.owner, name: config.repo, branch: config.branch, siteUrl: config.siteUrl }
      });
    }

    if (path === '/api/auth/logout' && method === 'POST') {
      record({ action: 'logout', ip });
      return jsonResponse(200, { ok: true });
    }

    /* ---------- authenticated ---------- */
    const claims = await requireSession({ headers });

    if (path === '/api/auth/me' && method === 'GET') {
      let user = null;
      try {
        user = await currentUser();
      } catch {
        user = { login: claims.u || 'admin', name: 'Administrator' };
      }
      return jsonResponse(200, {
        user,
        expiresAt: claims.exp * 1000,
        dryRun: !!dryRun,
        repo: { owner: config.owner, name: config.repo, branch: config.branch, siteUrl: config.siteUrl },
        publishMode: config.publishMode || 'direct',
        limits: { maxUploadMB, maxFilesPerCommit: MAX_FILES_PER_COMMIT }
      });
    }

    if (!github) {
      throw new ApiError(503, 'github_not_configured', 'The server has no GITHUB_TOKEN configured');
    }

    if (path === '/api/repo' && method === 'GET') {
      const repo = await github.getRepo();
      return jsonResponse(200, { repo, branch: config.branch, publishMode: config.publishMode || 'direct', dryRun: !!dryRun });
    }

    if (path === '/api/repo/tree' && method === 'GET') {
      const ref = query.ref || config.branch;
      const tree = await github.getTree(ref, { recursive: true });
      const head = ref === config.branch ? await github.getRef(config.branch) : null;
      return jsonResponse(200, {
        ref,
        headSha: head ? head.sha : null,
        truncated: tree.truncated,
        entries: tree.entries,
        total: tree.entries.length
      });
    }

    if (path === '/api/repo/file' && method === 'GET') {
      const repoPath = assertRepoPath(query.path);
      const ref = query.ref || config.branch;
      const file = await github.getFile(repoPath, ref);
      const binary = isProbablyBinary(repoPath, file.base64);
      const text = !binary && file.size <= 5 * 1024 * 1024 ? decodeUtf8(file.base64) : null;
      return jsonResponse(200, {
        path: repoPath,
        ref,
        sha: file.sha,
        size: file.size,
        base64: file.base64,
        text,
        isBinary: binary,
        language: languageFor(repoPath),
        publicUrl: publicUrlFor(config.siteUrl, repoPath)
      });
    }

    if ((path === '/api/repo/raw' || path === '/api/repo/download') && method === 'GET') {
      const repoPath = assertRepoPath(query.path);
      const ref = query.ref || config.branch;
      const file = await github.getFile(repoPath, ref);
      const binary = atob(file.base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const download = path.endsWith('/download');
      return {
        status: 200,
        headers: {
          'Content-Type': guessContentType(repoPath),
          'Content-Length': String(bytes.byteLength),
          'Cache-Control': 'no-store',
          'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${baseName(repoPath).replace(/"/g, '')}"`
        },
        body: bytes
      };
    }

    if (path === '/api/repo/exists' && (method === 'GET' || method === 'HEAD')) {
      const repoPath = assertRepoPath(query.path);
      const entry = await github.findEntry(repoPath, query.ref || config.branch);
      return jsonResponse(entry ? 200 : 404, { exists: !!entry, entry: entry || null });
    }

    if (path === '/api/repo/commits' && method === 'GET') {
      const commits = await github.listCommits({
        path: query.path ? assertRepoPath(query.path) : undefined,
        perPage: parsePositiveInt(query.per_page, 30, 1, 100),
        page: parsePositiveInt(query.page, 1, 1, 1000)
      });
      return jsonResponse(200, { commits });
    }

    const commitMatch = /^\/api\/repo\/commits\/([a-f0-9]{7,40})$/i.exec(path);
    if (commitMatch && method === 'GET') {
      const commit = await github.getCommit(commitMatch[1], { withFiles: true });
      return jsonResponse(200, { commit });
    }

    if (path === '/api/repo/pages' && method === 'GET') {
      const pages = await github.getPages();
      return jsonResponse(200, pages);
    }

    if (path === '/api/repo/publish' && method === 'POST') {
      if (config.readOnly) throw new ApiError(403, 'read_only', 'This server is in read-only mode');
      const payload = body || {};
      const files = payload.files;
      const mode = payload.mode === 'pr' ? 'pr' : 'direct';
      const prepared = buildFilePayload(files);
      const message = sanitizeCommitMessage(payload.message, prepared);
      const expectedHead = typeof payload.expectedHead === 'string' && /^[a-f0-9]{40}$/i.test(payload.expectedHead)
        ? payload.expectedHead
        : undefined;
      const force = payload.force === true;

      if (mode === 'pr' && payload.branchName && !/^admin\/[A-Za-z0-9._-]{1,80}$/.test(payload.branchName)) {
        throw new ApiError(400, 'invalid_branch', 'Pull-request branches must start with "admin/"');
      }

      if (dryRun) {
        const result = {
          ok: true,
          dryRun: true,
          mode,
          message,
          commitSha: 'dry-run-' + Date.now().toString(16),
          commitUrl: null,
          branch: mode === 'pr' ? payload.branchName || 'admin/dry-run' : config.branch,
          prNumber: mode === 'pr' ? 0 : null,
          prUrl: null,
          files: prepared.map((file) => ({ path: file.path, status: file.delete ? 'deleted' : 'updated' }))
        };
        record({ action: 'publish_dry_run', ip, user: claims.u, mode, message, files: prepared.map((f) => f.path) });
        return jsonResponse(200, result);
      }

      let result;
      try {
        result =
          mode === 'pr'
            ? await github.publishPullRequest({
                files: prepared,
                message,
                title: String(payload.title || message).slice(0, 200),
                body: typeof payload.body === 'string' ? payload.body.slice(0, 5000) : undefined,
                expectedHead,
                branchName: payload.branchName,
                force
              })
            : await github.publishDirect({ files: prepared, message, expectedHead, force });
      } catch (error) {
        if (error instanceof GitHubError && (error.code === 'github_conflict' || error.status === 422)) {
          const head = await github.getRef(config.branch).catch(() => null);
          return errorResponse(409, 'conflict', 'The repository changed while you were editing. Review and publish again.', {
            head: head && head.sha
          });
        }
        throw error;
      }

      record({
        action: 'publish',
        ip,
        user: claims.u,
        mode,
        message,
        commit: result.commitSha,
        branch: result.branch,
        files: prepared.map((file) => file.path)
      });
      return jsonResponse(200, {
        ok: true,
        dryRun: false,
        mode,
        message,
        ...result,
        commitUrl: result.commitSha ? `https://github.com/${config.owner}/${config.repo}/commit/${result.commitSha}` : null
      });
    }

    if (path === '/api/repo/pulls' && method === 'GET') {
      const pulls = await github.listPullRequests(query.state === 'all' ? 'all' : 'open');
      return jsonResponse(200, { pulls });
    }

    const mergeMatch = /^\/api\/repo\/pulls\/(\d{1,6})\/merge$/.exec(path);
    if (mergeMatch && method === 'POST') {
      if (config.readOnly) throw new ApiError(403, 'read_only', 'This server is in read-only mode');
      const result = await github.mergePullRequest(Number(mergeMatch[1]), (body && body.method) || 'squash');
      record({ action: 'merge_pr', ip, user: claims.u, pr: Number(mergeMatch[1]), merged: result.merged });
      return jsonResponse(200, { ok: true, ...result });
    }

    const closeMatch = /^\/api\/repo\/pulls\/(\d{1,6})\/close$/.exec(path);
    if (closeMatch && method === 'POST') {
      if (config.readOnly) throw new ApiError(403, 'read_only', 'This server is in read-only mode');
      const result = await github.closePullRequest(Number(closeMatch[1]));
      record({ action: 'close_pr', ip, user: claims.u, pr: Number(closeMatch[1]) });
      return jsonResponse(200, { ok: true, ...result });
    }

    if (path === '/api/repo/backup' && method === 'GET') {
      const tarball = await github.getTarball(config.branch);
      const stamp = new Date().toISOString().slice(0, 10);
      return {
        status: 200,
        headers: {
          'Content-Type': 'application/gzip',
          'Content-Length': String(tarball.byteLength),
          'Cache-Control': 'no-store',
          'Content-Disposition': `attachment; filename="${config.repo}-${stamp}.tar.gz"`
        },
        body: tarball
      };
    }

    if (path === '/api/audit' && method === 'GET') {
      const limit = parsePositiveInt(query.limit, 50, 1, 200);
      return jsonResponse(200, { entries: auditLog.slice(0, limit) });
    }

    throw new ApiError(404, 'not_found', `Unknown API route: ${method} ${path}`);
  }

  return {
    handle,
    config: { owner: config.owner, repo: config.repo, branch: config.branch },
    limiter: loginLimiter
  };
}

export { createLoginLimiter, slugifyFileName };
