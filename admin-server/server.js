#!/usr/bin/env node
/* Zero-dependency admin API + static preview server.
 *
 *   node admin-server/server.js            # serve site + admin + API
 *   SERVE_SITE=0 node admin-server/server.js   # API only (GitHub Pages setup)
 *
 * Configuration lives in admin-server/.env (see .env.example).
 */

import http from 'node:http';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createApi } from './lib/api.js';
import { createGitHub } from './lib/github.js';
import { generateSecret, hashPassword, verifyPassword } from './lib/auth.js';
import { guessContentType } from './lib/paths.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ------------------------------------------------------------------ */
/* Environment                                                         */
/* ------------------------------------------------------------------ */

async function loadEnvFile(file) {
  let text;
  try {
    text = await fs.readFile(file, 'utf8');
  } catch {
    return;
  }
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

await loadEnvFile(path.join(__dirname, '.env'));

const argv = process.argv.slice(2);
if (argv[0] === '--hash-password') {
  const password = argv[1];
  if (!password) {
    console.error('Usage: node admin-server/server.js --hash-password "your-password"');
    process.exit(1);
  }
  try {
    console.log(await hashPassword(password));
    process.exit(0);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

const env = process.env;
const owner = env.GITHUB_OWNER || 'Erarunpanthi';
const repo = env.GITHUB_REPO || 'arunpanthi.com.np';
const branch = env.GITHUB_BRANCH || 'main';
const siteUrl = env.PUBLIC_SITE_URL || 'https://arunpanthi.com.np';
const port = Number(env.PORT) > 0 ? Number(env.PORT) : 8787;
const host = env.HOST || '0.0.0.0';
const maxUploadMB = Number(env.MAX_UPLOAD_MB) > 0 ? Number(env.MAX_UPLOAD_MB) : 25;
const maxBodyBytes = Math.ceil(maxUploadMB * 1024 * 1024 * 1.45) + 2 * 1024 * 1024;
const serveSite = env.SERVE_SITE !== '0';
const siteRoot = path.resolve(env.SITE_ROOT || path.join(__dirname, '..'));
const allowedOrigins = env.ALLOWED_ORIGINS || 'https://arunpanthi.com.np,https://www.arunpanthi.com.np,http://localhost:' + port;
const publishMode = env.PUBLISH_MODE === 'pr' ? 'pr' : 'direct';
const dryRun = env.DRY_RUN === '1';
const readOnly = env.READ_ONLY === '1';
const trustProxy = env.TRUST_PROXY === '1';

/* ------------------------------------------------------------------ */
/* Secrets                                                             */
/* ------------------------------------------------------------------ */

let sessionSecret = env.SESSION_SECRET;
if (!sessionSecret || sessionSecret.length < 16) {
  sessionSecret = generateSecret();
  console.warn(
    '[admin] SESSION_SECRET is not set — generated a temporary one. Sessions will reset when the server restarts.'
  );
}

let adminPassword = env.ADMIN_PASSWORD_HASH;
let generatedPassword = null;
if (!adminPassword && env.ADMIN_PASSWORD) {
  if (env.ADMIN_PASSWORD.length < 8) {
    console.error('[admin] ADMIN_PASSWORD must be at least 8 characters long.');
    process.exit(1);
  }
  adminPassword = await hashPassword(env.ADMIN_PASSWORD);
} else if (!adminPassword) {
  generatedPassword = generatePassword(18);
  adminPassword = await hashPassword(generatedPassword);
}

if (env.ADMIN_PASSWORD_HASH && !env.ADMIN_PASSWORD_HASH.startsWith('pbkdf2$')) {
  console.error('[admin] ADMIN_PASSWORD_HASH must look like pbkdf2$sha256$... (run --hash-password).');
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* GitHub + API                                                        */
/* ------------------------------------------------------------------ */

let github = null;
if (env.GITHUB_TOKEN) {
  github = createGitHub({ token: env.GITHUB_TOKEN, owner, repo, branch });
} else {
  console.warn('[admin] GITHUB_TOKEN is missing — the API will run in read-only "unconfigured" mode.');
}

const auditLog = [];
const api = createApi({
  github,
  adminPassword,
  sessionSecret,
  dryRun,
  auditLog,
  config: {
    owner,
    repo,
    branch,
    siteUrl,
    maxUploadMB,
    allowedOrigins,
    publishMode,
    readOnly,
    SESSION_TTL_HOURS: env.SESSION_TTL_HOURS
  }
});

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const BLOCKED_PREFIXES = [
  'admin-server/',
  '.git/',
  '.github/',
  'node_modules/',
  '.arena/'
];
const BLOCKED_FILES = new Set(['.env', '.gitignore.tmp']);

function isBlocked(relPath) {
  const p = relPath.replace(/^\/+/, '');
  if (!p) return false;
  if (BLOCKED_FILES.has(p)) return true;
  if (p.split('/').some((segment) => segment === '..' || segment === '' || segment.startsWith('.git'))) return true;
  return BLOCKED_PREFIXES.some((prefix) => p === prefix.slice(0, -1) || p.startsWith(prefix));
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  return await new Promise((resolve, reject) => {
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBodyBytes) {
        reject(Object.assign(new Error('Request body too large'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!chunks.length) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(Object.assign(new Error('Invalid JSON body'), { statusCode: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function clientIp(req) {
  if (trustProxy) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) return String(forwarded).split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
};

const ADMIN_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: http://localhost:* http://127.0.0.1:*",
  "frame-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'"
].join('; ');

async function resolveStaticFile(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
  const normalized = path.posix.normalize(decoded);
  if (!normalized.startsWith('/')) return null;
  let rel = normalized.replace(/^\/+/, '');
  if (rel.endsWith('/')) rel = rel.replace(/\/+$/, '');
  if (isBlocked(rel)) return null;

  const candidates = [];
  if (!rel) candidates.push('index.html');
  else {
    candidates.push(rel);
    if (!path.posix.extname(rel)) candidates.push(rel + '.html');
    candidates.push(path.posix.join(rel, 'index.html'));
    if (/^Psc-preparation\/Current-Affairs\/exam\/date=\d{4}-\d{2}-\d{2}$/.test(rel)) {
      candidates.push('Psc-preparation/Current-Affairs/exam.html');
    }
  }

  for (const candidate of candidates) {
    const absolute = path.resolve(siteRoot, candidate);
    if (absolute !== siteRoot && !absolute.startsWith(siteRoot + path.sep)) continue;
    try {
      const stat = await fs.stat(absolute);
      if (stat.isFile()) return { absolute, relative: candidate, size: stat.size };
    } catch {
      /* try next candidate */
    }
  }
  return null;
}

async function serveStatic(req, res, urlPath) {
  const file = await resolveStaticFile(urlPath);
  if (!file) {
    const notFound = path.join(siteRoot, '404.html');
    try {
      const body = await fs.readFile(notFound);
      res.writeHead(404, {
        ...SECURITY_HEADERS,
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Length': body.byteLength,
        'Cache-Control': 'no-store'
      });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch {
      res.writeHead(404, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
    }
    return;
  }

  const isAdmin = file.relative === 'admin' || file.relative.startsWith('admin/');
  const headers = {
    ...SECURITY_HEADERS,
    'Content-Type': guessContentType(file.relative),
    'Content-Length': file.size,
    'Cache-Control': isAdmin ? 'no-store' : 'no-cache'
  };
  if (isAdmin) {
    headers['Content-Security-Policy'] = ADMIN_CSP;
    headers['X-Robots-Tag'] = 'noindex, nofollow';
  }
  res.writeHead(200, headers);
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  createReadStream(file.absolute).pipe(res);
}

/* ------------------------------------------------------------------ */
/* Server                                                              */
/* ------------------------------------------------------------------ */

const server = http.createServer(async (req, res) => {
  let url;
  try {
    url = new URL(req.url, 'http://localhost');
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad request');
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    let body = null;
    if (['POST', 'PUT', 'PATCH'].includes(req.method || '')) {
      try {
        body = await readJsonBody(req);
      } catch (error) {
        const status = error.statusCode || 400;
        res.writeHead(status, {
          ...SECURITY_HEADERS,
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store'
        });
        res.end(
          JSON.stringify({
            error: {
              code: status === 413 ? 'payload_too_large' : 'invalid_json',
              message: status === 413 ? `Request larger than ${Math.round(maxBodyBytes / 1024 / 1024)} MB` : error.message
            }
          })
        );
        return;
      }
    }

    const query = {};
    for (const [key, value] of url.searchParams) query[key] = value;

    const result = await api.handle({
      method: req.method,
      path: url.pathname,
      query,
      headers: req.headers,
      body,
      ip: clientIp(req)
    });

    const headers = {
      ...SECURITY_HEADERS,
      'Cache-Control': 'no-store',
      ...(result.headers || {})
    };
    res.writeHead(result.status, headers);
    if (result.body === null || result.body === undefined) res.end();
    else if (typeof result.body === 'string') res.end(result.body);
    else if (result.body instanceof Uint8Array) res.end(Buffer.from(result.body));
    else res.end(Buffer.from(result.body));
    return;
  }

  if (!serveSite) {
    res.writeHead(404, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain' });
    res.end('This server only exposes the admin API. Set SERVE_SITE=1 to preview the site.');
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { ...SECURITY_HEADERS, Allow: 'GET, HEAD' });
    res.end('Method not allowed');
    return;
  }

  try {
    await serveStatic(req, res, url.pathname);
  } catch (error) {
    console.error('[static]', error);
    if (!res.headersSent) {
      res.writeHead(500, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain' });
    }
    res.end('Server error');
  }
});

server.listen(port, host, () => {
  const base = `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`;
  console.log('');
  console.log('  CivPrepMaster admin');
  console.log('  -------------------');
  console.log(`  API      ${base}/api/health`);
  if (serveSite) console.log(`  Site     ${base}/`);
  console.log(`  Admin    ${base}/admin/`);
  console.log(`  Repo     ${owner}/${repo} (${branch})`);
  console.log(`  Publish  ${publishMode}${dryRun ? ' · DRY RUN (no real commits)' : ''}${readOnly ? ' · READ ONLY' : ''}`);
  console.log(`  Origins  ${allowedOrigins}`);
  if (generatedPassword) {
    console.log('');
    console.log('  !! No ADMIN_PASSWORD / ADMIN_PASSWORD_HASH was set.');
    console.log(`  Generated admin password for this run: ${generatedPassword}`);
    console.log('  Set ADMIN_PASSWORD_HASH in .env to keep a permanent password.');
  }
  console.log('');
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  });
}
