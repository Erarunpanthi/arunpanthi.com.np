# Admin panel

A private, browser-based control room for **arunpanthi.com.np**. Edit pages,
publish the weekly current-affairs test, add practice sets, upload photos and
change the navbar — all without touching GitHub by hand.

Everything you change is first saved as a **draft in your browser**. Nothing
appears on the live site until you press **Publish**.

- Panel: `https://arunpanthi.com.np/admin/` (served by GitHub Pages)
- Backend: a small Node service in [`../admin-server`](../admin-server/README.md)
- No build step, no framework, no cookies. The GitHub token never reaches the browser.

---

## 1. One-time setup

1. Deploy the backend (see [`../admin-server/README.md`](../admin-server/README.md)).
   You need its public URL, for example `https://admin-api.arunpanthi.com.np`.
2. Make sure `ALLOWED_ORIGINS` on the backend includes
   `https://arunpanthi.com.np` and `https://www.arunpanthi.com.np`.
3. Open `https://arunpanthi.com.np/admin/`.
4. Expand **Advanced**, paste the backend URL, press **Test** — the status line
   should turn green with `Connected to Erarunpanthi/arunpanthi.com.np`.
5. Type the admin password and sign in.

The backend URL is remembered in `localStorage` on that device. If the panel is
served **by** the backend itself (`http://localhost:8787/admin/`), leave the field
empty and the panel uses the same origin.

> Tip: you can also set a permanent default by editing `apiBase` in
> [`config.json`](config.json). A URL typed on the sign-in screen overrides it.

---

## 2. The screens

| Screen | What it is for |
| --- | --- |
| **Dashboard** | Site counts, recent commits, what is missing this week, pending drafts. |
| **Files** | Tree browser for every file in the repository, with a syntax-highlighted editor. Raw HTML/CSS/JS lives here. |
| **Uploads** | Drag-and-drop images, PDFs and documents. Large photos are resized before upload. |
| **Weekly current affairs** | The Wednesday question bank (`Psc-preparation/Current-Affairs/tests.js`). |
| **Practice tests** | The timed subject-wise sets in `Psc-preparation/Test/`. |
| **Page text** | Edit headings and paragraphs of any page like a document — no HTML. |
| **SEO & metadata** | Titles, meta descriptions, canonicals, Open Graph/Twitter tags, sitemap. |
| **Navigation & footer** | Navbar items, social links, copyright line. |
| **History & backups** | Recent commits, per-file restore, full `.tar.gz` backup. |
| **Pull requests** | Review-mode publishes waiting to be merged. |
| **Settings** | Connection info, appearance, activity log, housekeeping. |

### How drafting works

- A change is staged when you press **Save draft** (or **Add to pending changes**
  in Uploads).
- The badge in the top bar shows how many files are waiting.
- Drafts survive reloads and are kept per browser. They are **not** visible to
  other devices or other people.
- **Pending changes** (sidebar) shows a side-by-side diff of every staged file,
  with the option to unstage one file or discard everything.
- Publishing clears the drafts that were sent.

### Publishing modes

At the bottom of the publish dialog choose how the change goes out:

- **Commit to main** (default) — one atomic commit; GitHub Pages rebuilds in
  about a minute. This is the normal path.
- **Open a pull request** — commits to a temporary `admin/…` branch and opens a
  PR. Merge it from the **Pull requests** screen (or GitHub) when you have
  reviewed the diff.

If someone else committed to `main` while your panel was open, the publish is
rejected with a conflict warning. You can refresh and re-apply, or choose
*Overwrite anyway* (only when you are sure).

### Keyboard

| Shortcut | Action |
| --- | --- |
| `Ctrl/Cmd + S` | Save draft in the current editor |
| `Ctrl/Cmd + F` | Find inside the code editor |
| `Tab` / `Shift + Tab` | Indent / outdent in the code editor |
| `Esc` | Close a dialog |

---

## 3. Weekly current affairs (every Wednesday)

1. Open **Weekly current affairs**.
2. Press **New test set** — the date defaults to the next Wednesday and the
   details are copied from the latest set.
3. Adjust the Nepali (BS) date if needed. The badge tells you whether it is a
   Wednesday (only Wednesdays appear on the site).
4. Write or paste the questions. Correct answer = the radio button; the
   explanation is optional.
5. **Save draft**, then **Publish**.

The homepage automatically shows a *Give exam* button for every Wednesday that
has an entry. Before publishing, *Preview exam* opens the exact exam page
(`/Psc-preparation/Current-Affairs/exam/date=YYYY-MM-DD`).

**Faster data entry:** use **Import** on the question toolbar to paste JSON or
CSV instead of typing each question. **Export** gives you JSON for backup.

Accepted import shape:

```json
[
  {
    "question": "सन् २०२६ को नोबेल शान्ति पुरस्कार कसलाई प्रदान गरियो ?",
    "options": ["A", "B", "C", "D"],
    "correct": 1,
    "explanation": "Optional"
  }
]
```

`correct` is the zero-based index of the right option. CSV works too:
`question,option1,option2,option3,option4,correct,explanation`.

---

## 4. Practice tests

- **New test set** picks a topic from the test index, creates `topic-N.html`
  from the template and inserts the *Start exam* link automatically.
- Editing an existing set updates both the questions and the page metadata.
- The **Raw HTML** button opens the same file in the full code editor when you
  need to change something unusual.

---

## 5. Uploads

- Drop files on the Uploads screen or click to browse.
- Choose the destination folder (`Photos` is the default; `assets` and
  `Resources` are also suggested).
- Large JPEG/PNG/WebP files are resized to 1800 px and re-compressed first. If
  there is no gain, the original is kept.
- File names are cleaned automatically: `My Photo (1).JPG` → `My-Photo-1.jpg`.
- After publishing, copy the public URL from the Files screen (link icon) and
  reference it in a page, e.g. `/Photos/my-photo.jpg`.

Limits: 25 MB per file (configurable with `MAX_UPLOAD_MB`) and 300 files per
publish.

---

## 6. Page text vs. Files

**Page text** lists every text block of an HTML page grouped by heading and
writes your edits back into the same HTML, leaving tags and attributes alone.
Use it for copy changes.

**Files** gives you the raw file. Use it for structure, scripts, styles or
anything the text editor does not show.

Both produce ordinary file drafts — the difference is only the interface.

---

## 7. SEO & metadata

- **Scan all pages** loads every page once and marks missing titles,
  descriptions, canonicals and social tags.
- Select a page to see a Google-style preview and edit every head field.
- **Fill social fields** copies the title/description into `og:` and `twitter:`
  tags.
- **Update sitemap** appends canonical URLs that are missing from
  `sitemap.xml`; existing entries (and their `lastmod`) are never touched.

---

## 8. History, restore and backups

- **History & backups** lists commits newest-first, with a per-file `+n −n`
  summary and the patch.
- **Restore** stages that file at its old version — nothing changes until you
  publish.
- **Download backup** streams the whole repository as a `.tar.gz`.

---

## 9. Safety notes

- The GitHub token lives only on the backend, in environment variables. It is
  never sent to the browser or committed.
- The backend refuses to edit `admin-server/` itself and blocks dangerous file
  types.
- Sessions are short-lived JWTs (12 h by default). *Keep me signed in* stores
  the token in `localStorage`; otherwise it lives in `sessionStorage`.
- Drafts are stored in `localStorage` (up to ~4 MB). Very large uploads are held
  in memory only and must be published before reloading the page.
- The panel is marked `noindex, nofollow`; it is not linked from the site.

## 10. Troubleshooting

| Symptom | Fix |
| --- | --- |
| “Cannot reach the admin API” | Check the backend URL on the sign-in screen. On a different origin, `ALLOWED_ORIGINS` must list the panel origin. |
| “Incorrect password” | The backend `ADMIN_PASSWORD_HASH` / `ADMIN_PASSWORD` does not match. Regenerate with `npm --prefix admin-server run hash-password`. |
| “Dry run mode” badge | The server runs with `DRY_RUN=1`. Publishing is simulated. |
| “Repository changed since this page was loaded” | Someone else committed. Reload the file tree, re-apply your draft, or use *Overwrite anyway*. |
| The site still shows old files | GitHub Pages takes about a minute. Hard-refresh; cache-busting `?v=` values are bumped automatically for tests and navigation. |
| Drafts disappeared | They live in the browser profile that created them. Clearing site data removes them. |
