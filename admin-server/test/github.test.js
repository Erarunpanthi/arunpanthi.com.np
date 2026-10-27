import test from 'node:test';
import assert from 'node:assert/strict';
import { createGitHub, GitHubError } from '../lib/github.js';

const PARENT = 'a'.repeat(40);
const NEW_COMMIT = 'b'.repeat(40);
const BASE_TREE = 'c'.repeat(40);

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function createMockFetch(overrides = {}) {
  const calls = [];
  const handler = async (url, options = {}) => {
    const parsed = new URL(url);
    const key = `${options.method || 'GET'} ${parsed.pathname}${parsed.search}`;
    calls.push({ key, method: options.method || 'GET', path: parsed.pathname, body: options.body ? JSON.parse(options.body) : null });

    if (overrides[key]) return overrides[key](options);
    if (parsed.pathname.endsWith('/git/ref/heads/main')) return jsonResponse({ ref: 'refs/heads/main', object: { sha: PARENT } });
    if (parsed.pathname.endsWith('/git/ref/heads/admin/test')) return jsonResponse({ ref: 'refs/heads/admin/test', object: { sha: PARENT } });
    if (parsed.pathname.includes('/commits/' + PARENT)) return jsonResponse({ sha: PARENT, commit: { tree: { sha: BASE_TREE } } });
    if (parsed.pathname.endsWith('/git/blobs')) return jsonResponse({ sha: 'blob' + calls.length });
    if (parsed.pathname.endsWith('/git/trees')) return jsonResponse({ sha: 'new-tree' });
    if (parsed.pathname.endsWith('/git/commits')) return jsonResponse({ sha: NEW_COMMIT });
    if (parsed.pathname.includes('/git/refs/heads/')) return jsonResponse({ object: { sha: NEW_COMMIT } });
    if (parsed.pathname.endsWith('/git/refs')) return jsonResponse({ ref: 'refs/heads/admin/test' });
    if (parsed.pathname.endsWith('/pulls')) return jsonResponse({ number: 42, html_url: 'https://github.com/x/y/pull/42' });
    return jsonResponse({ message: 'not mocked: ' + parsed.pathname }, 404);
  };
  return { fetchImpl: handler, calls };
}

function client(fetchImpl) {
  return createGitHub({ token: 'test-token', owner: 'Erarunpanthi', repo: 'arunpanthi.com.np', branch: 'main', fetchImpl });
}

test('publishDirect creates blobs, a tree on the base tree, a commit and moves the ref', async () => {
  const { fetchImpl, calls } = createMockFetch();
  const gh = client(fetchImpl);

  const result = await gh.publishDirect({
    expectedHead: PARENT,
    message: 'Update homepage',
    files: [
      { path: 'index.html', base64: Buffer.from('<h1>Hi</h1>').toString('base64') },
      { path: 'Photos/old.png', delete: true }
    ]
  });

  assert.equal(result.commitSha, NEW_COMMIT);
  assert.equal(result.baseSha, PARENT);

  const treeCall = calls.find((call) => call.method === 'POST' && call.path.endsWith('/git/trees'));
  assert.ok(treeCall, 'tree was created');
  assert.equal(treeCall.body.base_tree, BASE_TREE);
  assert.equal(treeCall.body.tree.length, 2);
  const deleted = treeCall.body.tree.find((entry) => entry.path === 'Photos/old.png');
  assert.equal(deleted.sha, null);
  const updated = treeCall.body.tree.find((entry) => entry.path === 'index.html');
  assert.match(updated.sha, /^blob/);

  const commitCall = calls.find((call) => call.method === 'POST' && call.path.endsWith('/git/commits'));
  assert.equal(commitCall.body.message, 'Update homepage');
  assert.equal(commitCall.body.tree, 'new-tree');
  assert.deepEqual(commitCall.body.parents, [PARENT]);

  const refCall = calls.find((call) => call.method === 'PATCH');
  assert.ok(refCall.path.endsWith('/git/refs/heads/main'));
  assert.equal(refCall.body.sha, NEW_COMMIT);
  assert.equal(refCall.body.force, false);
});

test('publishDirect refuses to overwrite newer commits unless forced', async () => {
  const { fetchImpl, calls } = createMockFetch();
  const gh = client(fetchImpl);

  await assert.rejects(
    () =>
      gh.publishDirect({
        expectedHead: 'f'.repeat(40),
        message: 'test',
        files: [{ path: 'index.html', base64: '' }]
      }),
    (error) => error instanceof GitHubError && error.status === 409 && error.code === 'conflict'
  );
  assert.equal(calls.some((call) => call.method === 'POST'), false, 'nothing was written');

  const result = await gh.publishDirect({
    expectedHead: 'f'.repeat(40),
    force: true,
    message: 'forced',
    files: [{ path: 'index.html', base64: '' }]
  });
  assert.equal(result.commitSha, NEW_COMMIT);
});

test('publishPullRequest creates an admin branch and opens a PR', async () => {
  const { fetchImpl, calls } = createMockFetch();
  const gh = client(fetchImpl);

  const result = await gh.publishPullRequest({
    message: 'Add test set',
    title: 'Add test set',
    files: [{ path: 'Psc-preparation/Test/9.9-1.html', base64: 'PGgxPkhpPC9oMT4=' }]
  });

  assert.equal(result.prNumber, 42);
  assert.equal(result.prUrl, 'https://github.com/x/y/pull/42');
  assert.match(result.branch, /^admin\//);

  const createRef = calls.find((call) => call.method === 'POST' && call.path.endsWith('/git/refs'));
  assert.equal(createRef.body.ref, 'refs/heads/' + result.branch);
  assert.equal(createRef.body.sha, PARENT);

  const prCall = calls.find((call) => call.method === 'POST' && call.path.endsWith('/pulls'));
  assert.equal(prCall.body.head, result.branch);
  assert.equal(prCall.body.base, 'main');
});

test('a failed PR creation cleans up the temporary branch', async () => {
  const failedPull = async () => new Response(JSON.stringify({ message: 'Validation Failed' }), { status: 422 });
  const { fetchImpl, calls } = createMockFetch({
    'POST /repos/Erarunpanthi/arunpanthi.com.np/pulls': failedPull
  });
  const gh = client(fetchImpl);

  await assert.rejects(() =>
    gh.publishPullRequest({
      message: 'broken',
      files: [{ path: 'index.html', base64: '' }]
    })
  );

  const del = calls.find((call) => call.method === 'DELETE');
  assert.ok(del, 'temporary branch was deleted');
  assert.match(del.path, /\/git\/refs\/heads\/admin\//);
});

test('getFile falls back to the blob API and returns base64', async () => {
  const tree = {
    sha: 'tree',
    truncated: false,
    tree: [{ path: 'index.html', type: 'blob', size: 5, sha: 'blobsha' }]
  };
  const { fetchImpl } = createMockFetch({
    'GET /repos/Erarunpanthi/arunpanthi.com.np/git/trees/main?recursive=1': async () => jsonResponse(tree),
    'GET /repos/Erarunpanthi/arunpanthi.com.np/git/blobs/blobsha': async () =>
      jsonResponse({ sha: 'blobsha', encoding: 'base64', content: Buffer.from('hello\n').toString('base64') })
  });
  const gh = client(fetchImpl);
  const file = await gh.getFile('index.html');
  assert.equal(file.base64, Buffer.from('hello\n').toString('base64'));
  assert.equal(file.size, 5);
});

test('GitHub 401 responses surface as configuration errors', async () => {
  const { fetchImpl } = createMockFetch({
    'GET /user': async () => new Response(JSON.stringify({ message: 'Bad credentials' }), { status: 401 })
  });
  const gh = client(fetchImpl);
  await assert.rejects(
    () => gh.getAuthenticatedUser(),
    (error) => error instanceof GitHubError && error.code === 'github_unauthorized' && error.status === 502
  );
});
