import test from 'node:test';
import assert from 'node:assert/strict';
import { createApi, createLoginLimiter } from '../lib/api.js';
import { hashPassword } from '../lib/auth.js';
import { GitHubError } from '../lib/github.js';

const PASSWORD = 'test-password-123';
const SECRET = 'test-session-secret-1234567890';
const HEAD = 'd'.repeat(40);

function createFakeGitHub(overrides = {}) {
  const calls = [];
  const base = {
    getAuthenticatedUser: async () => ({ login: 'arunpanthi', name: 'Arun Panthi', avatarUrl: 'https://x/y.png' }),
    getRepo: async () => ({ owner: 'Erarunpanthi', name: 'arunpanthi.com.np', defaultBranch: 'main' }),
    getRef: async () => ({ ref: 'refs/heads/main', sha: HEAD }),
    getTree: async () => ({
      sha: 'tree',
      truncated: false,
      entries: [
        { path: 'index.html', type: 'file', size: 12, sha: 'a' },
        { path: 'Psc-preparation', type: 'dir', size: undefined, sha: 'b' }
      ]
    }),
    getFile: async (path) => ({
      path,
      sha: 'blob',
      size: 5,
      base64: Buffer.from('hello').toString('base64')
    }),
    findEntry: async (path) => ({ path, type: 'file', sha: 'blob', size: 5 }),
    listCommits: async () => [
      { sha: HEAD, shortSha: HEAD.slice(0, 7), message: 'Test commit', author: { name: 'Arun', date: '2026-10-27T00:00:00Z' } }
    ],
    getCommit: async (sha) => ({ sha, shortSha: sha.slice(0, 7), message: 'commit', files: [] }),
    publishDirect: async ({ files, message }) => {
      calls.push({ method: 'publishDirect', files, message });
      return { commitSha: 'e'.repeat(40), branch: 'main', baseSha: HEAD, files };
    },
    publishPullRequest: async ({ files, message, title }) => {
      calls.push({ method: 'publishPullRequest', files, message, title });
      return { commitSha: 'f'.repeat(40), branch: 'admin/test', baseSha: HEAD, prNumber: 7, prUrl: 'https://github.com/pr/7', files };
    },
    getPages: async () => ({ available: true, status: 'built' }),
    getTarball: async () => new Uint8Array([31, 139, 8, 0]),
    listPullRequests: async () => [{ number: 7, title: 'PR', state: 'open' }],
    mergePullRequest: async (number) => ({ merged: true, sha: '1'.repeat(40) }),
    closePullRequest: async () => ({ state: 'closed' }),
    ...overrides
  };
  return { github: base, calls };
}

async function buildApi(options = {}) {
  const adminPassword = await hashPassword(PASSWORD, { iterations: 20000 });
  const { github, calls } = createFakeGitHub(options.githubOverrides || {});
  const api = createApi({
    github,
    adminPassword,
    sessionSecret: SECRET,
    dryRun: options.dryRun || false,
    loginLimiter: createLoginLimiter({ maxFailures: 3, windowMs: 60000, blockMs: 60000 }),
    config: {
      owner: 'Erarunpanthi',
      repo: 'arunpanthi.com.np',
      branch: 'main',
      siteUrl: 'https://arunpanthi.com.np',
      maxUploadMB: 1,
      allowedOrigins: ['https://arunpanthi.com.np', 'http://localhost:8787'],
      publishMode: 'direct',
      readOnly: options.readOnly || false
    }
  });
  return { api, calls };
}

function req(api, { method = 'GET', path, query = {}, body = null, token = null, origin = 'https://arunpanthi.com.np', ip = '1.1.1.1' }) {
  const headers = {};
  if (token) headers.authorization = 'Bearer ' + token;
  if (origin) headers.origin = origin;
  return api.handle({ method, path, query, headers, body, ip });
}

async function login(api, password = PASSWORD, ip = '1.1.1.1') {
  const response = await req(api, { method: 'POST', path: '/api/auth/login', body: { password }, ip });
  return { status: response.status, data: JSON.parse(response.body) };
}

test('health is public and describes the deployment', async () => {
  const { api } = await buildApi();
  const response = await req(api, { path: '/api/health', origin: '' });
  assert.equal(response.status, 200);
  const data = JSON.parse(response.body);
  assert.equal(data.ok, true);
  assert.equal(data.repo.name, 'arunpanthi.com.np');
  assert.equal(data.dryRun, false);
});

test('private routes require a valid session', async () => {
  const { api } = await buildApi();
  const unauthorized = await req(api, { path: '/api/repo/tree' });
  assert.equal(unauthorized.status, 401);
  const badToken = await req(api, { path: '/api/repo/tree', token: 'nope.nope.nope' });
  assert.equal(badToken.status, 401);
});

test('login rejects a wrong password and accepts the configured one', async () => {
  const { api } = await buildApi();
  const bad = await login(api, 'wrong-password', '9.9.9.9');
  assert.equal(bad.status, 401);
  assert.equal(bad.data.error.code, 'invalid_credentials');

  const good = await login(api, PASSWORD, '9.9.9.9');
  assert.equal(good.status, 200);
  assert.match(good.data.token, /^[\w-]+\.[\w-]+\.[\w-]+$/);
  assert.equal(good.data.user.login, 'arunpanthi');

  const tree = await req(api, { path: '/api/repo/tree', token: good.data.token });
  assert.equal(tree.status, 200);
  const data = JSON.parse(tree.body);
  assert.equal(data.headSha, HEAD);
  assert.equal(data.entries.length, 2);
});

test('repeated login failures are rate limited', async () => {
  const { api } = await buildApi();
  for (let i = 0; i < 3; i++) {
    const response = await req(api, { method: 'POST', path: '/api/auth/login', body: { password: 'bad' }, ip: '5.5.5.5' });
    assert.equal(response.status, 401);
  }
  const blocked = await req(api, { method: 'POST', path: '/api/auth/login', body: { password: PASSWORD }, ip: '5.5.5.5' });
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers['Retry-After']) > 0);
});

test('file reads return text, language and public URL', async () => {
  const { api } = await buildApi();
  const { data } = await login(api);
  const response = await req(api, { path: '/api/repo/file', query: { path: 'index.html' }, token: data.token });
  assert.equal(response.status, 200);
  const file = JSON.parse(response.body);
  assert.equal(file.text, 'hello');
  assert.equal(file.isBinary, false);
  assert.equal(file.publicUrl, 'https://arunpanthi.com.np/index.html');
});

test('publishing validates paths and content', async () => {
  const { api } = await buildApi();
  const { data } = await login(api);

  const traversal = await req(api, {
    method: 'POST',
    path: '/api/repo/publish',
    body: { message: 'x', files: [{ path: '../../etc/passwd', text: 'x' }] },
    token: data.token
  });
  assert.equal(traversal.status, 400);
  assert.equal(JSON.parse(traversal.body).error.code, 'invalid_path');

  const forbidden = await req(api, {
    method: 'POST',
    path: '/api/repo/publish',
    body: { message: 'x', files: [{ path: 'admin-server/.env', text: 'x' }] },
    token: data.token
  });
  assert.equal(forbidden.status, 403);

  const empty = await req(api, {
    method: 'POST',
    path: '/api/repo/publish',
    body: { files: [] },
    token: data.token
  });
  assert.equal(empty.status, 400);

  const oversized = Buffer.alloc(1.5 * 1024 * 1024).toString('base64');
  const tooBig = await req(api, {
    method: 'POST',
    path: '/api/repo/publish',
    body: { files: [{ path: 'Photos/big.png', base64: oversized }] },
    token: data.token
  });
  assert.equal(tooBig.status, 413);
});

test('publishing without an explicit mode commits directly', async () => {
  const { api, calls } = await buildApi();
  const { data } = await login(api);
  const response = await req(api, {
    method: 'POST',
    path: '/api/repo/publish',
    body: {
      message: 'Update homepage heading',
      files: [{ path: 'index.html', text: '<h1>Hello</h1>' }]
    },
    token: data.token
  });
  assert.equal(response.status, 200);
  const result = JSON.parse(response.body);
  assert.equal(result.ok, true);
  assert.equal(result.mode, 'direct');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].files[0].path, 'index.html');
  assert.equal(Buffer.from(calls[0].files[0].base64, 'base64').toString('utf8'), '<h1>Hello</h1>');
  assert.match(result.commitUrl, /github\.com\/Erarunpanthi\/arunpanthi\.com\.np\/commit\//);
});

test('PR mode forwards to publishPullRequest', async () => {
  const { api, calls } = await buildApi();
  const { data } = await login(api);
  const response = await req(api, {
    method: 'POST',
    path: '/api/repo/publish',
    body: {
      mode: 'pr',
      title: 'Add weekly test',
      message: 'Add weekly test',
      files: [{ path: 'Psc-preparation/Current-Affairs/tests.js', text: 'window.CA_TESTS = {};' }]
    },
    token: data.token
  });
  assert.equal(response.status, 200);
  const result = JSON.parse(response.body);
  assert.equal(result.mode, 'pr');
  assert.equal(result.prNumber, 7);
  assert.equal(calls[0].method, 'publishPullRequest');
});

test('dry run never writes to GitHub', async () => {
  const { api, calls } = await buildApi({ dryRun: true });
  const { data } = await login(api);
  const response = await req(api, {
    method: 'POST',
    path: '/api/repo/publish',
    body: { files: [{ path: 'index.html', text: '<h1>x</h1>' }] },
    token: data.token
  });
  assert.equal(response.status, 200);
  const result = JSON.parse(response.body);
  assert.equal(result.dryRun, true);
  assert.equal(calls.length, 0);
});

test('read-only mode blocks writes but allows reads', async () => {
  const { api } = await buildApi({ readOnly: true });
  const { data } = await login(api);
  const write = await req(api, {
    method: 'POST',
    path: '/api/repo/publish',
    body: { files: [{ path: 'index.html', text: 'x' }] },
    token: data.token
  });
  assert.equal(write.status, 403);
  assert.equal(JSON.parse(write.body).error.code, 'read_only');

  const read = await req(api, { path: '/api/repo/tree', token: data.token });
  assert.equal(read.status, 200);
});

test('a ref race during publish becomes a friendly conflict', async () => {
  const { api } = await buildApi({
    githubOverrides: {
      publishDirect: async () => {
        throw new GitHubError(422, 'github_conflict', 'Reference does not match');
      }
    }
  });
  const { data } = await login(api);
  const response = await req(api, {
    method: 'POST',
    path: '/api/repo/publish',
    body: { files: [{ path: 'index.html', text: 'x' }] },
    token: data.token
  });
  assert.equal(response.status, 409);
  const payload = JSON.parse(response.body);
  assert.equal(payload.error.code, 'conflict');
  assert.equal(payload.error.details.head, HEAD);
});

test('CORS only allows configured origins', async () => {
  const { api } = await buildApi();
  const allowed = await req(api, { path: '/api/health', origin: 'https://arunpanthi.com.np' });
  assert.equal(allowed.headers['Access-Control-Allow-Origin'], 'https://arunpanthi.com.np');

  const denied = await req(api, { path: '/api/health', origin: 'https://evil.example' });
  assert.equal(denied.headers['Access-Control-Allow-Origin'], undefined);

  const preflight = await req(api, { method: 'OPTIONS', path: '/api/repo/publish', origin: 'https://arunpanthi.com.np' });
  assert.equal(preflight.status, 204);
  assert.match(preflight.headers['Access-Control-Allow-Headers'], /Authorization/);
});

test('backup endpoint returns a gzip download', async () => {
  const { api } = await buildApi();
  const { data } = await login(api);
  const response = await req(api, { path: '/api/repo/backup', token: data.token });
  assert.equal(response.status, 200);
  assert.equal(response.headers['Content-Type'], 'application/gzip');
  assert.match(response.headers['Content-Disposition'], /attachment; filename="arunpanthi\.com\.np-\d{4}-\d{2}-\d{2}\.tar\.gz"/);
});
