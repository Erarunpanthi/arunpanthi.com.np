/* Minimal GitHub REST client used by the admin API.
 * No Node-only APIs so it also runs inside a Cloudflare Worker. */

export class GitHubError extends Error {
  constructor(status, code, message, details) {
    super(message || 'GitHub request failed');
    this.name = 'GitHubError';
    this.status = status || 502;
    this.code = code || 'github_error';
    this.details = details;
  }
}

const API_ROOT = 'https://api.github.com';
const API_VERSION = '2022-11-28';

function encodeRefPath(ref) {
  return String(ref)
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
}

function normalizeMessage(message) {
  const text = String(message || '').replace(/\r\n/g, '\n').trim();
  return text.length > 2000 ? text.slice(0, 2000) : text;
}

export function createGitHub({ token, owner, repo, branch = 'main', fetchImpl, userAgent = 'arunpanthi-admin' }) {
  if (!token) throw new Error('GITHUB_TOKEN is required');
  if (!owner || !repo) throw new Error('GITHUB_OWNER and GITHUB_REPO are required');

  const doFetch = fetchImpl || globalThis.fetch;
  if (typeof doFetch !== 'function') throw new Error('fetch is not available');

  const repoRoot = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const cache = new Map();
  let cachedUser = null;

  async function request(path, { method = 'GET', body, raw = false, accept, retries = 2, timeoutMs = 30000 } = {}) {
    const url = path.startsWith('http') ? path : API_ROOT + path;
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: accept || 'application/vnd.github+json',
      'X-GitHub-Api-Version': API_VERSION,
      'User-Agent': userAgent
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    let attempt = 0;
    for (;;) {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
      try {
        const response = await doFetch(url, {
          method,
          headers,
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: controller ? controller.signal : undefined,
          redirect: 'follow'
        });
        if (timer) clearTimeout(timer);

        if (response.status >= 500 && attempt < retries && method === 'GET') {
          attempt += 1;
          await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
          continue;
        }

        if (!response.ok) {
          let payload = null;
          let text = '';
          try {
            text = await response.text();
            payload = text ? JSON.parse(text) : null;
          } catch {
            payload = null;
          }
          const message =
            (payload && payload.message) ||
            (response.status === 401 ? 'GitHub token is invalid or expired' : 'GitHub API error ' + response.status);
          const code =
            response.status === 401
              ? 'github_unauthorized'
              : response.status === 403 && /rate limit/i.test(message)
                ? 'github_rate_limited'
                : response.status === 404
                  ? 'github_not_found'
                  : response.status === 409 || response.status === 422
                    ? 'github_conflict'
                    : 'github_error';
          throw new GitHubError(response.status === 401 ? 502 : response.status, code, message, {
            status: response.status,
            path: url.replace(API_ROOT, ''),
            body: text ? text.slice(0, 800) : undefined
          });
        }

        if (raw) return response;
        if (response.status === 204) return null;
        return await response.json();
      } catch (error) {
        if (timer) clearTimeout(timer);
        if (error instanceof GitHubError) throw error;
        if (attempt < retries && method === 'GET') {
          attempt += 1;
          await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
          continue;
        }
        throw new GitHubError(502, 'github_network_error', 'Could not reach GitHub: ' + (error.message || error));
      }
    }
  }

  function cacheKey(...parts) {
    return parts.join('|');
  }

  async function cached(key, ttlMs, producer) {
    const hit = cache.get(key);
    const now = Date.now();
    if (hit && hit.expires > now) return hit.value;
    const value = await producer();
    cache.set(key, { value, expires: now + ttlMs });
    return value;
  }

  function invalidate() {
    cache.clear();
  }

  async function getAuthenticatedUser() {
    if (cachedUser) return cachedUser;
    const user = await request('/user');
    cachedUser = {
      login: user.login,
      name: user.name || user.login,
      avatarUrl: user.avatar_url,
      htmlUrl: user.html_url
    };
    return cachedUser;
  }

  async function getRepo() {
    return cached(cacheKey('repo'), 120000, async () => {
      const data = await request(repoRoot);
      return {
        owner: data.owner.login,
        name: data.name,
        fullName: data.full_name,
        defaultBranch: data.default_branch,
        private: data.private,
        htmlUrl: data.html_url,
        description: data.description,
        pushedAt: data.pushed_at,
        sizeKb: data.size
      };
    });
  }

  async function getRef(branchName = branch) {
    const data = await request(`${repoRoot}/git/ref/heads/${encodeRefPath(branchName)}`);
    return { ref: data.ref, sha: data.object.sha };
  }

  async function getCommit(sha, { withFiles = true } = {}) {
    const data = await request(`${repoRoot}/commits/${encodeURIComponent(sha)}`);
    return {
      sha: data.sha,
      shortSha: String(data.sha).slice(0, 7),
      message: (data.commit && data.commit.message) || '',
      author: {
        name: (data.commit && data.commit.author && data.commit.author.name) || '',
        date: data.commit && data.commit.author && data.commit.author.date,
        login: data.author && data.author.login,
        avatarUrl: data.author && data.author.avatar_url
      },
      htmlUrl: data.html_url,
      parents: (data.parents || []).map((p) => p.sha),
      files: withFiles
        ? (data.files || []).map((file) => ({
            filename: file.filename,
            previousFilename: file.previous_filename,
            status: file.status,
            additions: file.additions,
            deletions: file.deletions,
            changes: file.changes,
            patch: file.patch
          }))
        : undefined
    };
  }

  async function getTree(ref = branch, { recursive = true } = {}) {
    return cached(cacheKey('tree', ref, recursive), 30000, async () => {
      const data = await request(
        `${repoRoot}/git/trees/${encodeRefPath(ref)}${recursive ? '?recursive=1' : ''}`
      );
      return {
        sha: data.sha,
        truncated: !!data.truncated,
        entries: (data.tree || [])
          .filter((entry) => entry.type === 'blob' || entry.type === 'tree')
          .map((entry) => ({
            path: entry.path,
            type: entry.type === 'tree' ? 'dir' : 'file',
            size: entry.size,
            sha: entry.sha
          }))
      };
    });
  }

  async function findEntry(repoPath, ref = branch) {
    const tree = await getTree(ref);
    return tree.entries.find((entry) => entry.path === repoPath) || null;
  }

  async function getBlob(sha) {
    const data = await request(`${repoRoot}/git/blobs/${encodeURIComponent(sha)}`);
    if (data.encoding === 'base64') return data.content.replace(/\n/g, '');
    return null;
  }

  async function getFile(repoPath, ref = branch) {
    const entry = await findEntry(repoPath, ref);
    if (!entry || entry.type !== 'file') {
      throw new GitHubError(404, 'file_not_found', `File not found: ${repoPath}`);
    }
    const encoded = await getBlob(entry.sha);
    if (encoded === null) {
      throw new GitHubError(502, 'unsupported_encoding', 'GitHub returned an unsupported blob encoding');
    }
    return { path: repoPath, sha: entry.sha, size: entry.size, base64: encoded };
  }

  async function listCommits({ path, perPage = 30, page = 1, sha = branch } = {}) {
    const params = new URLSearchParams({ per_page: String(Math.min(100, Math.max(1, perPage))), page: String(Math.max(1, page)), sha });
    if (path) params.set('path', path);
    const data = await request(`${repoRoot}/commits?${params.toString()}`);
    return (Array.isArray(data) ? data : []).map((item) => ({
      sha: item.sha,
      shortSha: String(item.sha).slice(0, 7),
      message: ((item.commit && item.commit.message) || '').split('\n')[0],
      author: {
        name: (item.commit && item.commit.author && item.commit.author.name) || '',
        date: item.commit && item.commit.author && item.commit.author.date,
        login: item.author && item.author.login,
        avatarUrl: item.author && item.author.avatar_url
      },
      htmlUrl: item.html_url
    }));
  }

  async function createBlob(content, encoding = 'base64') {
    const data = await request(`${repoRoot}/git/blobs`, {
      method: 'POST',
      body: { content, encoding }
    });
    return data.sha;
  }

  async function createTree(baseTree, entries) {
    const data = await request(`${repoRoot}/git/trees`, {
      method: 'POST',
      body: { base_tree: baseTree, tree: entries }
    });
    return data.sha;
  }

  async function createCommit({ message, tree, parents }) {
    const data = await request(`${repoRoot}/git/commits`, {
      method: 'POST',
      body: { message: normalizeMessage(message), tree, parents }
    });
    return data.sha;
  }

  async function createRef(branchName, sha) {
    await request(`${repoRoot}/git/refs`, {
      method: 'POST',
      body: { ref: `refs/heads/${branchName}`, sha }
    });
    return branchName;
  }

  async function updateRef(branchName, sha) {
    const data = await request(`${repoRoot}/git/refs/heads/${encodeRefPath(branchName)}`, {
      method: 'PATCH',
      body: { sha, force: false }
    });
    return data.object.sha;
  }

  async function deleteRef(branchName) {
    await request(`${repoRoot}/git/refs/heads/${encodeRefPath(branchName)}`, { method: 'DELETE' });
  }

  /**
   * Commits many file changes atomically.
   * files: [{ path, base64?, delete? }]
   */
  async function commitFiles({ files, message, targetBranch = branch, baseSha, parents }) {
    if (!Array.isArray(files) || !files.length) {
      throw new GitHubError(400, 'no_files', 'No files to publish');
    }
    const headSha = baseSha || (await getRef(targetBranch)).sha;
    const baseTreeSha = await getCommitTree(headSha);

    const treeEntries = [];
    for (const file of files) {
      if (file.delete) {
        treeEntries.push({ path: file.path, mode: '100644', type: 'blob', sha: null });
        continue;
      }
      const blobSha = await createBlob(file.base64, 'base64');
      treeEntries.push({ path: file.path, mode: '100644', type: 'blob', sha: blobSha });
    }

    const treeSha = await createTree(baseTreeSha, treeEntries);
    const newCommitSha = await createCommit({
      message,
      tree: treeSha,
      parents: parents || [headSha]
    });
    await updateRef(targetBranch, newCommitSha);
    invalidate();
    return { commitSha: newCommitSha, branch: targetBranch, baseSha: headSha, files };
  }

  async function getCommitTree(sha) {
    const data = await request(`${repoRoot}/commits/${encodeURIComponent(sha)}`);
    return data.commit.tree.sha;
  }

  /** Direct publish: one atomic commit on the configured branch. */
  async function publishDirect({ files, message, expectedHead, force = false }) {
    const head = await getRef(branch);
    if (!force && expectedHead && expectedHead !== head.sha) {
      throw new GitHubError(409, 'conflict', 'The repository changed since this page was loaded.', {
        head: head.sha,
        expected: expectedHead
      });
    }
    return commitFiles({ files, message, targetBranch: branch, baseSha: head.sha });
  }

  /** PR publish: commits on a temporary admin branch and opens a pull request. */
  async function publishPullRequest({ files, message, title, body, expectedHead, branchName, force = false }) {
    const head = await getRef(branch);
    if (!force && expectedHead && expectedHead !== head.sha) {
      throw new GitHubError(409, 'conflict', 'The repository changed since this page was loaded.', {
        head: head.sha,
        expected: expectedHead
      });
    }
    const newBranch = branchName || 'admin/' + new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15);
    await createRef(newBranch, head.sha);
    let commit;
    try {
      commit = await commitFiles({ files, message, targetBranch: newBranch, baseSha: head.sha });
      const pr = await request(`${repoRoot}/pulls`, {
        method: 'POST',
        body: {
          title: title || message,
          head: newBranch,
          base: branch,
          body: body || 'Created with the CivPrepMaster admin panel.'
        }
      });
      return {
        commitSha: commit.commitSha,
        branch: newBranch,
        baseSha: head.sha,
        prNumber: pr.number,
        prUrl: pr.html_url,
        files
      };
    } catch (error) {
      // Do not leave an empty admin branch behind when the PR could not be created.
      try {
        await deleteRef(newBranch);
      } catch {
        /* ignore cleanup errors */
      }
      throw error;
    }
  }

  async function listPullRequests(state = 'open') {
    const params = new URLSearchParams({ state, per_page: '30', sort: 'updated', direction: 'desc' });
    const data = await request(`${repoRoot}/pulls?${params.toString()}`);
    return (Array.isArray(data) ? data : []).map((pr) => ({
      number: pr.number,
      title: pr.title,
      state: pr.state,
      draft: pr.draft,
      url: pr.html_url,
      branch: pr.head && pr.head.ref,
      base: pr.base && pr.base.ref,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      user: pr.user && pr.user.login,
      mergeable: pr.mergeable
    }));
  }

  async function mergePullRequest(number, method = 'squash') {
    const data = await request(`${repoRoot}/pulls/${Number(number)}/merge`, {
      method: 'PUT',
      body: { merge_method: ['merge', 'squash', 'rebase'].includes(method) ? method : 'squash' }
    });
    invalidate();
    return { merged: data.merged, sha: data.sha, message: data.message };
  }

  async function closePullRequest(number) {
    const data = await request(`${repoRoot}/pulls/${Number(number)}`, {
      method: 'PATCH',
      body: { state: 'closed' }
    });
    return { state: data.state, url: data.html_url };
  }

  async function getPages() {
    try {
      const data = await request(`${repoRoot}/pages`);
      return {
        available: true,
        status: data.status,
        url: data.html_url,
        cname: data.cname,
        buildType: data.build_type,
        source: data.source
      };
    } catch (error) {
      if (error instanceof GitHubError && (error.status === 404 || error.status === 403)) {
        return { available: false, reason: error.message };
      }
      throw error;
    }
  }

  async function getTarball(ref = branch, { maxBytes = 120 * 1024 * 1024 } = {}) {
    const response = await request(`${repoRoot}/tarball/${encodeRefPath(ref)}`, {
      raw: true,
      accept: 'application/vnd.github+json',
      timeoutMs: 120000
    });
    const buffer = new Uint8Array(await response.arrayBuffer());
    if (buffer.byteLength > maxBytes) {
      throw new GitHubError(413, 'backup_too_large', 'Backup is larger than the configured limit');
    }
    return buffer;
  }

  return {
    owner,
    repo,
    branch,
    request,
    invalidate,
    getAuthenticatedUser,
    getRepo,
    getRef,
    getCommit,
    getTree,
    findEntry,
    getFile,
    listCommits,
    publishDirect,
    publishPullRequest,
    listPullRequests,
    mergePullRequest,
    closePullRequest,
    getPages,
    getTarball
  };
}
