/* Cloudflare Worker entry point for the admin API.
 *
 * Deploy:  npx wrangler deploy
 * Secrets: npx wrangler secret put GITHUB_TOKEN
 *          npx wrangler secret put ADMIN_PASSWORD_HASH
 *          npx wrangler secret put SESSION_SECRET
 * Vars:    GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, PUBLIC_SITE_URL,
 *          ALLOWED_ORIGINS, PUBLISH_MODE, MAX_UPLOAD_MB, DRY_RUN, READ_ONLY
 */

import { createApi } from './lib/api.js';
import { createGitHub } from './lib/github.js';

let cached = null;

function buildApi(env) {
  const owner = env.GITHUB_OWNER || 'Erarunpanthi';
  const repo = env.GITHUB_REPO || 'arunpanthi.com.np';
  const branch = env.GITHUB_BRANCH || 'main';

  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 16) {
    throw new Error('SESSION_SECRET must be set to at least 16 characters');
  }
  if (!env.ADMIN_PASSWORD_HASH && !env.ADMIN_PASSWORD) {
    throw new Error('ADMIN_PASSWORD_HASH (or ADMIN_PASSWORD) must be set');
  }
  if (env.ADMIN_PASSWORD_HASH && !env.ADMIN_PASSWORD_HASH.startsWith('pbkdf2$')) {
    throw new Error('ADMIN_PASSWORD_HASH must look like pbkdf2$sha256$...');
  }

  const github = env.GITHUB_TOKEN
    ? createGitHub({ token: env.GITHUB_TOKEN, owner, repo, branch })
    : null;

  return createApi({
    github,
    adminPassword: env.ADMIN_PASSWORD_HASH || env.ADMIN_PASSWORD,
    sessionSecret: env.SESSION_SECRET,
    dryRun: env.DRY_RUN === '1',
    config: {
      owner,
      repo,
      branch,
      siteUrl: env.PUBLIC_SITE_URL || 'https://arunpanthi.com.np',
      maxUploadMB: Number(env.MAX_UPLOAD_MB) || 25,
      allowedOrigins: env.ALLOWED_ORIGINS || 'https://arunpanthi.com.np',
      publishMode: env.PUBLISH_MODE === 'pr' ? 'pr' : 'direct',
      readOnly: env.READ_ONLY === '1',
      SESSION_TTL_HOURS: env.SESSION_TTL_HOURS
    }
  });
}

function getApi(env) {
  if (cached && cached.key === env.SESSION_SECRET + '|' + env.GITHUB_TOKEN + '|' + env.ADMIN_PASSWORD_HASH) {
    return cached.api;
  }
  const api = buildApi(env);
  cached = { key: env.SESSION_SECRET + '|' + env.GITHUB_TOKEN + '|' + env.ADMIN_PASSWORD_HASH, api };
  return api;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (!url.pathname.startsWith('/api/')) {
      return new Response(
        JSON.stringify({ error: { code: 'not_found', message: 'This Worker only serves /api/* routes' } }),
        { status: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    let body = null;
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const text = await request.text();
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          return new Response(
            JSON.stringify({ error: { code: 'invalid_json', message: 'Invalid JSON body' } }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    let api;
    try {
      api = getApi(env);
    } catch (error) {
      return new Response(
        JSON.stringify({ error: { code: 'misconfigured', message: error.message } }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const query = {};
    for (const [key, value] of url.searchParams) query[key] = value;

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const headers = {};
    for (const [key, value] of request.headers) headers[key.toLowerCase()] = value;

    const result = await api.handle({
      method: request.method,
      path: url.pathname,
      query,
      headers,
      body,
      ip
    });

    return new Response(result.body === null || result.body === undefined ? null : result.body, {
      status: result.status,
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store',
        ...(result.headers || {})
      }
    });
  }
};
