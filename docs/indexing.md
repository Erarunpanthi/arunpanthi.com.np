# Indexing rules

Google Search Console reported a set of URLs as **"Excluded by 'noindex' tag"**,
plus duplicates that leaked into the index. Those buckets are caused by three
structural problems, all fixed here. This file explains the rules so the same
errors do not come back; the checks at the bottom enforce them.

## 1. Retired URLs must exist, and must forward

GitHub Pages ignores `.htaccess`. If a file is deleted, its URL answers **404**,
which Search Console reports as "Soft 404" / "Not found (404)". So a URL that is
retired is **not** deleted outright:

* the URL keeps a real file (`tools/build-redirect-pages.py` writes it),
* that file is `noindex`,
* it forwards with both `<meta http-equiv="refresh">` and
  `window.location.replace()`,
* and its `canonical` points at the page that replaced it.

The list of retired URLs lives in **`tools/redirects.py`** — the single source of
truth for `404.html` + `js/legacy-redirects.js` (what actually runs on Pages) and
the generated block in `.htaccess` (for Apache hosts).

## 2. One canonical URL per page — exact match

A canonical that differs from the served URL is ignored by Google, so the page
is crawled as a duplicate instead of the version that ranks. This site has two
route shapes:

| File | URL the host serves | Canonical must be |
| --- | --- | --- |
| `index.html` | `/` | `https://arunpanthi.com.np/` |
| `foo/index.html` | `/foo/` | `https://arunpanthi.com.np/foo/` |
| `foo.html` | `/foo` | `https://arunpanthi.com.np/foo` |

`tools/fix-indexing.py` rewrites every page to match this table, including
`og:url` and the `hreflang` alternates. Do not hand-edit canonicals.

## 3. Thin pages must not be indexed

An "under construction" page with ~24 words of copy is a **soft 404**; indexing
it dilutes the quality signal for the whole site. Pages that hold no original
content are retired into the hub page that already covers the topic (see
`tools/redirects.py`) and stay `noindex` until real content is written.

Genuine content pages (e.g. `NEC-license-preparation/Notes/Engineering-Drawing.html`)
must be `index, follow` and reachable by an in-content `<a href>` from a hub page,
not only from the sitemap.

## Checks

Run these before pushing; each exits non-zero when something is wrong.

```bash
python3 tools/build-redirect-pages.py --check   # placeholders match redirects.py
python3 tools/fix-indexing.py --check           # robots + canonical are exact
python3 tools/generate-redirects.py --check     # .htaccess and JS agree
python3 tools/generate-sitemap.py               # rebuild sitemap.xml
python3 tools/check-indexing.py                 # full audit (run after the above)
```

`tools/check-indexing.py` is the audit to trust: it fails on any `noindex` page
that is in the sitemap, any sitemap URL that returns no local file, any redirect
target that is missing or `noindex`, any redirect chain, any canonical that does
not match the served URL, and any internal link pointing at a retired URL.

## After deploying

1. Search Console → **Sitemaps**: resubmit `sitemap.xml`.
2. **URL Inspection** → *Test live URL* for `/`, `/Resources/Past-Questions/` and
   `/NEC-license-preparation/Notes/Engineering-Drawing`, then *Request indexing*.
3. **Page indexing** report refreshes over days, not minutes — the
   "Excluded by 'noindex' tag" rows move to "Page with redirect" once Google
   recrawls the retired URLs, and then drop out of the report.
