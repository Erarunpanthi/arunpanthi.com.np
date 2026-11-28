#!/usr/bin/env python3
"""Audit the repository for the indexing problems Search Console reports.

Fails (exit code 1) when it finds:

  * a sitemap URL with no file behind it, or a noindex page in the sitemap
  * a page whose canonical does not equal the URL the host serves
  * a redirect whose target is missing, noindex, or itself a redirect
  * a redirect source that was not actually kept as a forwardable file,
    so GitHub Pages would answer 404 for a URL Google still calls
  * an internal <a href> pointing at a retired URL
  * an internal href/src that resolves to no file at all (404 in production)

Run: python3 tools/check-indexing.py
"""
from __future__ import annotations

import os

import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from redirects import (  # noqa: E402
    DUPLICATES, HANDWRITTEN_REDIRECTS, MOVED_FILES, PLACEHOLDERS,
)

ROOT = Path(__file__).resolve().parents[1]

# These scripts are run from the repo root, but be explicit so a stray cwd can
# never write the wrong sitemap or redirect map.
os.chdir(ROOT)
BASE = "https://arunpanthi.com.np"
SKIP_LINK_DIRS = {"partials", "tools", "assets"}

errors: list[str] = []


def route_file(route: str) -> Path | None:
    clean = route.strip("/")
    if not clean:
        return ROOT / "index.html"
    target = ROOT / clean
    if target.is_dir():
        return target / "index.html"
    for candidate in (ROOT / (clean + ".html"), target):
        if candidate.is_file():
            return candidate
    return None


def dir_route(path: Path) -> str:
    posix = path.relative_to(ROOT).as_posix()
    if posix == "index.html":
        return "/"
    if posix.endswith("index.html"):
        return "/" + posix[: -len("index.html")]
    return "/" + posix[: -len(".html")]


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def is_noindex(text: str) -> bool:
    return any(
        "noindex" in tag.lower()
        for tag in re.findall(r"<meta[^>]+name=[\"'](?:robots|googlebot)[\"'][^>]*>", text, re.I)
    )


def is_redirect(text: str) -> bool:
    return 'http-equiv="refresh"' in text.lower()


def canonical_of(text: str) -> str | None:
    m = re.search(r"<link[^>]+rel=[\"']canonical[\"'][^>]*>", text, re.I)
    if not m:
        return None
    h = re.search(r"href=[\"']([^\"']+)", m.group(0), re.I)
    return h.group(1) if h else None


def main() -> int:
    # --- 1. canonical == served URL, for every indexable page -------------
    indexable: set[str] = set()
    for file in ROOT.rglob("*.html"):
        rel = file.relative_to(ROOT)
        if any(p.startswith(".") for p in rel.parts) or (rel.parts and rel.parts[0] in SKIP_LINK_DIRS):
            continue
        text = read(file)
        if "</head>" not in text.lower():
            continue
        route = dir_route(file)
        served = BASE + route
        if is_redirect(text):
            continue
        if is_noindex(text):
            continue
        indexable.add(route)
        canon = canonical_of(text)
        if canon != served:
            errors.append(f"canonical mismatch: {rel} declares {canon}, served at {served}")

    # --- 2. sitemap ------------------------------------------------------
    sitemap = ROOT / "sitemap.xml"
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    locs = []
    for node in ET.parse(sitemap).getroot().findall("sm:url/sm:loc", ns):
        locs.append((node.text or "").strip())
    seen = set()
    for loc in locs:
        if loc in seen:
            errors.append(f"duplicate sitemap entry: {loc}")
        seen.add(loc)
        if not loc.startswith(BASE):
            errors.append(f"foreign host in sitemap: {loc}")
            continue
        route = loc[len(BASE):] or "/"
        if not route.endswith("/") and route != "/" and route.count("/") and route_file(route):
            pass
        if route not in indexable:
            errors.append(f"sitemap URL is not an indexable page: {loc}")
    for route in sorted(indexable - {loc[len(BASE):] or "/" for loc in seen}):
        if route in ("/404",):
            continue
        errors.append(f"indexable page missing from sitemap: {BASE}{route}")

    # --- 3. redirects ----------------------------------------------------
    routes: dict[str, str] = dict(DUPLICATES)
    routes.update(MOVED_FILES)
    routes.update(HANDWRITTEN_REDIRECTS)
    for source, (target, _, _) in PLACEHOLDERS.items():
        routes[source] = target
    for source, target in sorted(routes.items()):
        target_file = route_file(target)
        if target_file is None:
            errors.append(f"redirect target missing: {source} -> {target}")
            continue
        target_text = read(target_file)
        if is_noindex(target_text):
            errors.append(f"redirect target is noindex: {source} -> {target}")
        if is_redirect(target_text):
            errors.append(f"redirect chain: {source} -> {target} is also a redirect")
        if source in PLACEHOLDERS:
            source_file = route_file(source)
            if source_file is None:
                errors.append(
                    f"retired URL has no file, GitHub Pages would 404 it: {source}"
                )
            else:
                source_text = read(source_file)
                if not is_redirect(source_text):
                    errors.append(f"retired URL does not forward: {source}")
                if canonical_of(source_text) != BASE + target:
                    errors.append(
                        f"retired URL canonical is not its replacement: {source}"
                    )

    # --- 4. internal links to retired URLs -------------------------------
    retired = {route.rstrip("/") or "/" for route in routes}
    for file in ROOT.rglob("*.html"):
        rel = file.relative_to(ROOT)
        if any(p.startswith(".") for p in rel.parts) or (rel.parts and rel.parts[0] in SKIP_LINK_DIRS):
            continue
        text = read(file)
        for href in re.findall(r"<a[^>]+href=[\"']([^\"'#?]+)", text, re.I):
            if href.startswith(("http://", "https://", "mailto:", "tel:", "//")):
                if not href.startswith(BASE):
                    continue
                href = href[len(BASE):] or "/"
            if not href.startswith("/"):
                continue
            if (href.rstrip("/") or "/") in retired:
                errors.append(f"internal link to retired URL in {rel}: {href}")

    # --- 5. internal links that resolve to no file ----------------------
    import posixpath

    def resolves(route: str) -> bool:
        return route_file(route) is not None

    for file in ROOT.rglob("*.html"):
        rel = file.relative_to(ROOT)
        if any(p.startswith(".") for p in rel.parts) or (rel.parts and rel.parts[0] in SKIP_LINK_DIRS):
            continue
        text = read(file)
        for href in re.findall(r'(?:href|src)=["\']([^"\'#?]+)', text, re.I):
            if href.startswith(("http://", "https://", "mailto:", "tel:", "//", "data:", "javascript:")) or "$" in href:
                continue
            route = href if href.startswith("/") else posixpath.normpath(
                posixpath.join("/" + str(rel.parent), href)
            )
            if route.startswith("/.."):
                errors.append(f"link escapes the site root in {rel}: {href}")
            elif not resolves(route):
                errors.append(f"broken internal link in {rel}: {href}")

    for error in errors:
        print("FAIL", error)
    print(f"{len(errors)} problem(s); {len(indexable)} indexable page(s); {len(locs)} sitemap URL(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
