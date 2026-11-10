#!/usr/bin/env python3
"""Write the redirect placeholder page for every thin URL in tools/redirects.py.

The site is hosted on GitHub Pages, where .htaccess rules are ignored: an
unknown path falls back to 404.html (HTTP 404). A bare 404 for a URL that used
to exist is exactly what Search Console reports as "Soft 404" / "Not found
(404)", so each placeholder URL is kept as a real file that

  * is noindex, and
  * immediately forwards to the canonical page, both with
    <meta http-equiv="refresh"> (works without JS) and with JS
    (location.replace, so the placeholder is never left in history).

The canonical points at the target, which tells Google the URL is a duplicate.
Keep the target pages indexable and worth ranking, and the placeholder URLs are
folded into them instead of appearing as separate errors.

Run: python3 tools/build-redirect-pages.py [--check]
"""
from __future__ import annotations

import os

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from redirects import PLACEHOLDERS  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]

# These scripts are run from the repo root, but be explicit so a stray cwd can
# never write the wrong sitemap or redirect map.
os.chdir(ROOT)
BASE = "https://arunpanthi.com.np"

TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, follow">
    <title>{label} moved | CivPrepMaster</title>
    <meta name="description" content="{label} is now covered on the {hub_label} page. You are being forwarded there automatically.">
    <link rel="canonical" href="{target_url}">
    <meta http-equiv="refresh" content="0; url={target}">
    <link rel="icon" href="/favicon.ico" type="image/x-icon">
    <link rel="stylesheet" href="/css/styles.css?v=20260924">
    <style>
        body {{
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 24px;
            background: #f4f7f5;
            font-family: "Segoe UI", system-ui, sans-serif;
            color: #17231b;
        }}
        .moved-card {{
            max-width: 520px;
            padding: 36px 32px;
            border: 1px solid #dce5de;
            border-radius: 14px;
            background: #fff;
            box-shadow: 0 3px 14px rgba(15, 48, 22, .06);
            text-align: center;
        }}
        .moved-card h1 {{ margin: 0 0 12px; font-size: 1.35rem; color: #123b1b; }}
        .moved-card p {{ margin: 0 0 22px; color: #516057; line-height: 1.7; }}
        .moved-card a {{
            display: inline-block;
            padding: 11px 18px;
            border-radius: 9px;
            background: #1b5e20;
            color: #fff;
            font-weight: 700;
            text-decoration: none;
        }}
        .moved-card a:hover {{ background: #0d3b12; }}
    </style>
</head>
<body>
    <main class="moved-card">
        <h1>{label} has moved</h1>
        <p>{label} is now part of <strong>{hub_label}</strong> on CivPrepMaster, so this
        separate page is no longer needed. You are being forwarded automatically.</p>
        <a href="{target}">Continue to {hub_label}</a>
    </main>
    <script>window.location.replace("{target}");</script>
</body>
</html>
"""


def build(check: bool) -> int:
    problems = 0
    written = 0
    for source, (target, label, hub_label) in sorted(PLACEHOLDERS.items()):
        page = TEMPLATE.format(
            label=label,
            hub_label=hub_label,
            target=target,
            target_url=BASE + target,
        )
        path = ROOT / source.strip("/") / "index.html"
        if path.exists() and path.read_text(encoding="utf-8") == page:
            continue
        written += 1
        if not check:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(page, encoding="utf-8")
    if check:
        if written:
            print(f"{written} redirect placeholder page(s) out of date")
            problems = 1
        else:
            print("Redirect placeholder pages up to date")
    else:
        print(f"Wrote {written} redirect placeholder page(s)")
    return problems


if __name__ == "__main__":
    raise SystemExit(build("--check" in sys.argv))
