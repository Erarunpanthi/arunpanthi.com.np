# admin-server

The backend for the [admin panel](../admin/README.md). One small, zero-dependency
Node service that holds the GitHub token and turns the panel's drafts into
commits or pull requests.

- No npm dependencies, no build step. Node **18.17+**.
- Runs on any Node host (Render, Railway, Fly.io, a VPS) or as a Cloudflare
  Worker (`worker.js`).
- Serves the website + panel too when `SERVE_SITE=1`, which makes local
  development a single command.

```
admin-server/
├── server.js          Node entry point (API + optional static preview)
├── worker.js          Cloudflare Workers entry point (API only)
├── lib/
│   ├── api.js         routes, auth guard, CORS, validation, audit log
│   ├── auth.js        PBKDF2 password hashing + HS256 session tokens
│   ├── github.js      GitHub REST client (direct commits and PR mode)
│   └── paths.js       path/extension guards and content types
├── test/              42 unit tests (node --test)
├── hash-password.mjs  prints an ADMIN_PASSWORD_HASH
├── Dockerfile
└── wrangler.toml.example
```

---

## 1. GitHub token

Create a **fine-grained personal access token** for the repository
`Erarunpanthi/arunpanthi.com.np`:

| Permission | Access | Why |
| --- | --- | --- |
| Contents | Read and write | read files, commit changes |
| Metadata | Read-only | automatically included |
| Pull requests | Read and write | only for the “pull request” publish mode |
| Pages | Read-only | optional, shows the deployment status on the dashboard |

A classic token with `repo` scope also works. Store the token **only** in the
backend environment — never in `admin/config.json` or the repository.

---

## 2. Local quickstart

```bash
cd admin-server
cp .env.example .env
# edit .env: GITHUB_TOKEN, ADMIN_PASSWORD or ADMIN_PASSWORD_HASH, SESSION_SECRET
node hash-password.mjs "a-strong-password"      # paste the output into .env
DRY_RUN=1 npm start
```

Open <http://localhost:8787/admin/>. With `DRY_RUN=1` you can click through
everything; publishing validates but never commits.

`npm run dev` restarts the server on file changes. `npm test` runs the suite.

Try it without a token: `DRY_RUN=1 SERVE_SITE=1 ADMIN_PASSWORD=test1234 SESSION_SECRET=0123456789abcdef node server.js`
— the panel loads and everything except GitHub-backed screens reports
`github_not_configured`.

---

## 3. Configuration

All variables are optional except `GITHUB_TOKEN` and one of the password
variables.

| Variable | Default | Notes |
| --- | --- | --- |
| `GITHUB_TOKEN` | — | Fine-grained PAT with Contents RW (+ Pull requests RW for PR mode). |
| `GITHUB_OWNER` | `Erarunpanthi` | Repository owner. |
| `GITHUB_REPO` | `arunpanthi.com.np` | Repository name. |
| `GITHUB_BRANCH` | `main` | Branch GitHub Pages serves. |
| `ADMIN_PASSWORD_HASH` | — | Preferred. `pbkdf2$sha256$210000$<salt>$<hash>` from `hash-password.mjs`. |
| `ADMIN_PASSWORD` | — | Plain password; hashed in memory at boot. Handy for trials. |
| `SESSION_SECRET` | random per boot | At least 16 chars. Changing it signs everybody out. |
| `SESSION_TTL_HOURS` | `12` | Session lifetime. |
| `PORT` | `8787` | HTTP port. |
| `HOST` | `0.0.0.0` | Bind address. |
| `SERVE_SITE` | `1` | `0` = API only (the GitHub Pages set-up). |
| `SITE_ROOT` | repo root | Folder served when `SERVE_SITE=1`. |
| `ALLOWED_ORIGINS` | site + localhost | Comma separated; `*` allows any origin. |
| `PUBLISH_MODE` | `direct` | `direct` or `pr` (panel lets you change it per publish). |
| `DRY_RUN` | `0` | `1` = simulate publishes. |
| `READ_ONLY` | `0` | `1` = block every write. |
| `MAX_UPLOAD_MB` | `25` | Per-file upload limit. |
| `TRUST_PROXY` | `0` | `1` behind a reverse proxy (uses `X-Forwarded-For` for rate limits). |
| `PUBLIC_SITE_URL` | `https://arunpanthi.com.np` | Used for public file URLs. |

`admin-server/.env` is loaded automatically and is git-ignored.

---

## 4. Deploying the API

The panel is static and stays on GitHub Pages. The API only needs to be
reachable over HTTPS by your browser.

### Render / Railway / Fly.io

1. Create a service from this repository.
2. Root directory `admin-server`, start command `node server.js`.
3. Add the environment variables above (`SERVE_SITE=0`).
4. Add your panel origin to `ALLOWED_ORIGINS`
   (`https://arunpanthi.com.np,https://www.arunpanthi.com.np`).
5. Note the public URL and enter it on the panel's sign-in screen.

### Docker

```bash
docker build -t arunpanthi-admin admin-server
docker run -p 8787:8787 --env-file admin-server/.env arunpanthi-admin
```

The image is `node:22-alpine`, runs as an unprivileged user and only contains
the server code (no site files).

### VPS (systemd + Caddy)

```ini
# /etc/systemd/system/arunpanthi-admin.service
[Unit]
Description=arunpanthi admin API
After=network.target

[Service]
WorkingDirectory=/srv/arunpanthi/admin-server
ExecStart=/usr/bin/node server.js
EnvironmentFile=/srv/arunpanthi/admin-server/.env
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
```

```
admin.arunpanthi.com.np {
    reverse_proxy 127.0.0.1:8787
}
```

Set `TRUST_PROXY=1` so rate limiting sees the real client IP. The panel itself
can keep living on `https://arunpanthi.com.np/admin/`.

### Cloudflare Workers

`worker.js` exposes the same `/api/*` surface:

```bash
npx wrangler deploy --config admin-server/wrangler.toml
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put ADMIN_PASSWORD_HASH
npx wrangler secret put SESSION_SECRET
```

Copy `wrangler.toml.example` to `wrangler.toml` first and adjust the name and
`ALLOWED_ORIGINS`. Workers have a memory/time budget — very large uploads and
the `.tar.gz` backup are better on the Node server.

---

## 5. Security model

- The browser never sees the GitHub token. It gets a signed, expiring session
  token after proving knowledge of the admin password.
- Passwords are stored as PBKDF2-SHA256 (210 000 iterations, per-password salt).
- Login is rate-limited per IP (8 failures / 10 min, then a cool-down).
- Every write is validated: path traversal, `..`, absolute paths, `.git/`,
  `.env`, `admin-server/` and executable extensions are rejected.
- Commit size limits: 300 files, 6 MB per text file, `MAX_UPLOAD_MB` per binary.
- Direct commits are guarded by an `expectedHead` check so two editors cannot
  silently overwrite each other.
- `CSP`, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` are set
  on everything the Node server returns.
- `DRY_RUN=1` and `READ_ONLY=1` are hard stops for demos and previews.
- An in-memory audit log (`GET /api/audit`) records logins and publishes.

Rotate the password: run `node hash-password.mjs "new-password"`, update
`ADMIN_PASSWORD_HASH`, restart. Rotate `SESSION_SECRET` to invalidate every
existing session.

---

## 6. API reference

Every route is under `/api`. `Authorization: Bearer <token>` is required
everywhere except `/api/health` and `/api/auth/login`.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | service info, dry-run/read-only flags, repo, limits |
| `POST` | `/auth/login` | `{password}` → `{token, expiresAt, user, dryRun, repo}` |
| `POST` | `/auth/logout` | no-op server-side (the client drops the token) |
| `GET` | `/auth/me` | session + GitHub user |
| `GET` | `/repo/tree?ref=` | flat file list + `headSha` |
| `GET` | `/repo/file?path=&ref=` | `{sha, size, base64, text, isBinary, language}` |
| `GET` | `/repo/raw?path=` / `/repo/download?path=` | raw bytes |
| `GET` | `/repo/exists?path=` | existence check |
| `GET` | `/repo/commits?path=&per_page=&page=` | commit list |
| `GET` | `/repo/commits/:sha` | commit + file patches |
| `GET` | `/repo/pages` | GitHub Pages status (degrades gracefully) |
| `POST` | `/repo/publish` | `{files, message, mode, title, body, expectedHead, force}` |
| `GET` | `/repo/pulls?state=` | open/closed pull requests |
| `POST` | `/repo/pulls/:n/merge` `{method}` | merge (default `squash`) |
| `POST` | `/repo/pulls/:n/close` | close without merging |
| `GET` | `/repo/backup` | repository tarball |
| `GET` | `/audit?limit=` | recent activity |

`POST /repo/publish` accepts:

```json
{
  "files": [
    { "path": "index.html", "text": "<!DOCTYPE html>…" },
    { "path": "Photos/new.jpg", "base64": "…" },
    { "path": "old-page.html", "delete": true }
  ],
  "message": "Admin: update homepage",
  "mode": "direct",
  "expectedHead": "40-character sha",
  "title": "PR title (mode=pr)",
  "body": "PR description (mode=pr)",
  "force": false
}
```

Errors are `{ "error": { "code", "message", "details?" } }`. Codes include
`invalid_credentials`, `rate_limited`, `unauthorized`, `invalid_path`,
`forbidden_path`, `too_many_files`, `file_too_large`, `unsupported_file_type`,
`conflict` (409, with `details.head`), `read_only`, `github_not_configured`,
`github_unauthorized`, `github_rate_limited`, `github_not_found`.

---

## 7. Tests

```bash
node --test admin-server/test/*.test.js
```

42 tests cover password hashing and token verification, path/extension guards,
the GitHub client (direct + PR publish, conflicts, error mapping), the HTTP API
(auth, uploads, dry-run, audit) and the shared content libraries (Nepali date
conversion, current-affairs parsing, practice-test round-trips, HTML text edits,
SEO, sitemap, cache-busting, diff).

## 8. Troubleshooting

| Symptom | Cause |
| --- | --- |
| `github_not_configured` | `GITHUB_TOKEN` missing. |
| `github_unauthorized` | Token expired or lacks Contents write. |
| `github_rate_limited` | GitHub secondary/primary limit; retry later. |
| Browser console shows CORS errors | Add the panel origin to `ALLOWED_ORIGINS` and restart. |
| `Cannot reach the admin API` | Wrong URL, server asleep, or mixed content (use HTTPS). |
| `conflict` on publish | Someone committed to the branch; reload or force. |
| `read_only` | `READ_ONLY=1` is set. |
