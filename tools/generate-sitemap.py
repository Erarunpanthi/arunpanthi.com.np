#!/usr/bin/env python3
"""Generate sitemap.xml from the pages that are genuinely indexable.

A URL is included only when all of the following hold:

* the file is a servable route (not a partial, tool or template),
* its robots meta is not noindex,
* its canonical exactly equals the URL the server answers for that file
  (see tools/fix-indexing.py — a mismatched canonical is ignored by Google and
  shows up as "Alternate page with proper canonical tag" in Search Console).

Run: python3 tools/generate-sitemap.py
"""
from __future__ import annotations

import os

from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse
import datetime as dt
import subprocess
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]

# These scripts are run from the repo root, but be explicit so a stray cwd can
# never write the wrong sitemap or redirect map.
os.chdir(ROOT)
BASE = "https://arunpanthi.com.np"

# Folders whose HTML files are fragments, tooling or generated artefacts rather
# than public pages.
SKIP_DIRS = {"partials", "tools", "assets"}

# Manually maintained priority buckets. Anything else falls back to 0.6.
PRIORITY = {
    "/": 1.0,
    "/Resources/": 0.9,
    "/Resources/Past-Questions/": 0.9,
    "/NEC-license-preparation/": 0.9,
    "/Psc-preparation/": 0.9,
    "/Resources/Syllabus/": 0.8,
}
CHANGEFREQ = {
    "/": "weekly",
    "/Resources/Past-Questions/": "weekly",
    "/Psc-preparation/Current-Affairs/": "daily",
    "/NEC-license-preparation/Final-Capsule/": "weekly",
}


class Metadata(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.canonical: str | None = None
        self.noindex = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        a = dict(attrs)
        if tag.lower() == "link" and "canonical" in (a.get("rel") or "").lower().split():
            self.canonical = a.get("href")
        if tag.lower() == "meta" and (a.get("name") or "").lower() in ("robots", "googlebot"):
            if "noindex" in (a.get("content") or "").lower():
                self.noindex = True


def served_url(file: Path) -> str:
    """URL the host answers for this file (mirrors the .htaccess rewrites)."""
    posix = file.relative_to(ROOT).as_posix()
    if posix == "index.html":
        return BASE + "/"
    if posix.endswith("/index.html"):
        return BASE + "/" + posix[: -len("index.html")]
    return BASE + "/" + posix[: -len(".html")]


def last_commit_date(rel: str) -> str | None:
    try:
        out = subprocess.run(
            ["git", "log", "-1", "--format=%cs", "--", rel],
            cwd=ROOT, capture_output=True, text=True, check=True,
        ).stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None
    if not out or out > dt.date.today().isoformat():
        # A commit dated in the future is a clock artefact, not a modification.
        return None
    return out


def main() -> int:
    today = dt.date.today().isoformat()
    entries: dict[str, tuple[str, str, str]] = {}

    for file in ROOT.rglob("*.html"):
        rel = file.relative_to(ROOT)
        if any(p.startswith(".") for p in rel.parts):
            continue
        if rel.parts and rel.parts[0] in SKIP_DIRS:
            continue
        if file.name == "404.html":
            continue

        meta = Metadata()
        meta.feed(file.read_text(encoding="utf-8", errors="replace"))
        if meta.noindex:
            continue

        expected = served_url(file)
        canonical = meta.canonical or expected
        parsed = urlparse(canonical)
        if parsed.scheme != "https" or parsed.netloc != "arunpanthi.com.np":
            continue
        if canonical != expected:
            print(f"SKIP {rel}: canonical {canonical} != served {expected}")
            continue
        if parsed.query or parsed.fragment:
            continue

        path = parsed.path
        priority = PRIORITY.get(path)
        if priority is None:
            depth = len([p for p in path.split("/") if p])
            priority = 0.7 if depth <= 2 else 0.6
        changefreq = CHANGEFREQ.get(path, "monthly")
        entries[canonical] = (f"{priority:.1f}", changefreq, last_commit_date(rel.as_posix()) or today)

    ns = "http://www.sitemaps.org/schemas/sitemap/0.9"
    ET.register_namespace("", ns)
    root = ET.Element(f"{{{ns}}}urlset")
    for url in sorted(entries):
        priority, changefreq, lastmod = entries[url]
        node = ET.SubElement(root, f"{{{ns}}}url")
        ET.SubElement(node, f"{{{ns}}}loc").text = url
        ET.SubElement(node, f"{{{ns}}}lastmod").text = lastmod
        ET.SubElement(node, f"{{{ns}}}changefreq").text = changefreq
        ET.SubElement(node, f"{{{ns}}}priority").text = priority
    ET.indent(root, space="  ")
    ET.ElementTree(root).write(ROOT / "sitemap.xml", encoding="utf-8", xml_declaration=True)
    print(f"Wrote {len(entries)} canonical, indexable URLs to sitemap.xml")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
