#!/usr/bin/env python3
"""Normalise robots + canonical directives on every page to the URL that is served.

The site has two kinds of routes and they end differently:

  * directory pages   Resources/Past-Questions/index.html -> /Resources/Past-Questions/
  * single-file pages  aboutus.html                       -> /aboutus

Google penalises a canonical that does not match the URL it crawled (it treats
it as "Page with redirect" / "Alternate page with proper canonical tag"), so
every page must declare exactly one self-referencing canonical built from the
route above.  This script does that in place and also fixes og:url, twitter:url
and the hreflang alternates that repeat the canonical.

Utility pages that should never appear in the index get a noindex tag.  Pages
that are ordinary content get an explicit, indexable robots tag, so a missing
tag can never silently mean "index whatever you like".

Run: python3 tools/fix-indexing.py [--check]
Pass --check to only report problems (exit code 1 when something needs fixing).
"""
from __future__ import annotations

import os

import re
import sys
import sys
from pathlib import Path
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent))
from redirects import PLACEHOLDERS  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]

# These scripts are run from the repo root, but be explicit so a stray cwd can
# never write the wrong sitemap or redirect map.
os.chdir(ROOT)
BASE = "https://arunpanthi.com.np"

INDEX_ROBOTS = "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
NOINDEX_ROBOTS = "noindex, follow"

# Pages that must never be indexed: error pages, fragments, tooling and
# personal/one-off pages that carry no search value.
NOINDEX = {
    "404.html",
    "partials/navbar.html",
    "partials/footer.html",
    "partials/social.html",
    "sani.html",
    "tools/whatsapp-quiz.html",
    "Progress/index.html",
    # /Psc-video/ holds the real video library; the old folder duplicated it.
    "Psc-preparation/Psc-video/index.html",
}


def placeholder_target(rel: Path) -> str | None:
    """Retired URL that forwards to another page (see tools/redirects.py)."""
    route = "/" + rel.parent.as_posix() if rel.name == "index.html" else None
    if route == "/.":
        route = "/"
    return PLACEHOLDERS.get(route, (None,))[0] if route else None


def final_url(rel: Path) -> str:
    """Public URL the server answers for this file (see .htaccess)."""
    posix = rel.as_posix()
    if posix == "index.html":
        return BASE + "/"
    if posix.endswith("/index.html"):
        return BASE + "/" + posix[: -len("index.html")]
    return BASE + "/" + posix[: -len(".html")]


def html_files() -> list[Path]:
    out = []
    for f in sorted(ROOT.rglob("*.html")):
        rel = f.relative_to(ROOT)
        if any(p.startswith(".") for p in rel.parts):
            continue
        out.append(f)
    return out


TAG_RE = re.compile(r"<meta[^>]*name=[\"'](?:robots|googlebot)[\"'][^>]*>", re.I)
CANON_RE = re.compile(r"<link[^>]*rel=[\"']canonical[\"'][^>]*>", re.I)
CANON_HREF = re.compile(r"href=[\"']([^\"']*)[\"']", re.I)
HEAD_END = re.compile(r"</head>", re.I)


def set_robots(text: str, value: str) -> str:
    """Replace every robots/googlebot meta with one canonical robots tag."""
    if TAG_RE.search(text):
        first = True
        def repl(m: re.Match[str]) -> str:
            nonlocal first
            if first:
                first = False
                return f'<meta name="robots" content="{value}">'
            return ""
        return TAG_RE.sub(repl, text)
    tag = f'    <meta name="robots" content="{value}">\n'
    m = HEAD_END.search(text)
    if not m:
        return text
    return text[: m.start()] + tag + text[m.start():]


def set_canonical(text: str, url: str) -> str:
    if CANON_RE.search(text):
        done = False
        def repl(m: re.Match[str]) -> str:
            nonlocal done
            if done:
                return ""
            done = True
            return f'<link rel="canonical" href="{url}">'
        return CANON_RE.sub(repl, text)
    tag = f'    <link rel="canonical" href="{url}">\n'
    m = HEAD_END.search(text)
    if not m:
        return text
    return text[: m.start()] + tag + text[m.start():]


def fix_url_metadata(text: str, url: str) -> str:
    """og:url / twitter:url / hreflang alternates must repeat the canonical."""
    text = re.sub(
        r'(<meta\s+property=["\']og:url["\']\s+content=["\'])[^"\']*(["\'])',
        lambda m: m.group(1) + url + m.group(2),
        text,
        flags=re.I,
    )
    text = re.sub(
        r'(<meta\s+name=["\']twitter:url["\']\s+content=["\'])[^"\']*(["\'])',
        lambda m: m.group(1) + url + m.group(2),
        text,
        flags=re.I,
    )

    def alt(m: re.Match[str]) -> str:
        href = m.group(2)
        parsed = urlparse(href)
        if parsed.netloc and parsed.netloc not in ("arunpanthi.com.np", "www.arunpanthi.com.np"):
            return m.group(0)
        return f'{m.group(1)}{url}{m.group(3)}'

    return re.sub(
        r'(<link[^>]*rel=["\']alternate["\'][^>]*hreflang=["\'][^"\']+["\'][^>]*href=["\'])([^"\']*)(["\'])',
        alt,
        text,
        flags=re.I,
    )


def main() -> int:
    check = "--check" in sys.argv
    changed = 0
    problems: list[str] = []

    for path in html_files():
        rel = path.relative_to(ROOT)
        rel_posix = rel.as_posix()
        url = final_url(rel)
        target = placeholder_target(rel)
        if target:
            # A retired page must point its canonical at its replacement, never
            # at itself: that is what tells Google which URL to keep.
            url = BASE + target
            want_robots = NOINDEX_ROBOTS
        else:
            want_robots = NOINDEX_ROBOTS if rel_posix in NOINDEX else INDEX_ROBOTS

        original = path.read_text(encoding="utf-8", errors="replace")
        text = original

        # Pages without a <head> (front-end fragments) are left untouched.
        if not HEAD_END.search(text):
            continue

        text = set_robots(text, want_robots)
        text = set_canonical(text, url)
        if not target:
            text = fix_url_metadata(text, url)

        canon_m = CANON_RE.search(text)
        canon = CANON_HREF.search(canon_m.group(0)).group(1) if canon_m else None
        if canon != url:
            problems.append(f"{rel_posix}: canonical {canon} != {url}")
        if want_robots not in text:
            problems.append(f"{rel_posix}: robots tag not normalised")

        if text != original:
            changed += 1
            if not check:
                path.write_text(text, encoding="utf-8")

    if check:
        for p in problems:
            print("FAIL", p)
        print(f"{len(problems)} problem(s); {changed} file(s) would change")
        return 1 if (problems or changed) else 0

    print(f"Normalised {changed} of {len(html_files())} HTML files")
    for p in problems:
        print("WARN", p)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
