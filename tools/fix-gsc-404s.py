#!/usr/bin/env python3
"""Review a Google Search Console 404 URL export and safely map moved pages.

Usage:
  python3 tools/fix-gsc-404s.py gsc-404-urls.csv

Input may be a CSV exported by Search Console or a plain text file with one URL
per line. The script only proposes 301s when it can verify that a matching,
indexable replacement page exists in this repository. It never redirects an
unknown URL to the homepage. Results are written to gsc-404-review.csv and
legacy-redirects.htaccess; review these before adding rules to the site's
.htaccess file. URLs without a genuine replacement should remain 404/410.
"""
from __future__ import annotations

import argparse
import csv
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
HOST = "arunpanthi.com.np"


class PageSignals(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.noindex = False
        self.canonical: str | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        a = dict(attrs)
        if tag.lower() == "meta" and a.get("name", "").lower() in {"robots", "googlebot"}:
            if "noindex" in (a.get("content") or "").lower():
                self.noindex = True
        if tag.lower() == "link" and "canonical" in (a.get("rel") or "").lower().split():
            self.canonical = a.get("href")


def read_urls(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8-sig", errors="replace")
    if not text.strip():
        return []
    if "," not in text.splitlines()[0] and "\t" not in text.splitlines()[0]:
        return [line.strip() for line in text.splitlines() if line.strip()]
    rows = list(csv.reader(text.splitlines()))
    # GSC exports commonly label the URL column "URL" or "Page"; if the
    # heading is not recognizable, use the first column for each row.
    header = [x.strip().lower() for x in rows[0]]
    idx = next((i for i, x in enumerate(header) if x in {"url", "page", "address"} or "url" in x), 0)
    start = 1 if any(x in {"url", "page", "address"} or "url" in x for x in header) else 0
    return [row[idx].strip() for row in rows[start:] if len(row) > idx and row[idx].strip()]


def page_file(path: str) -> Path | None:
    """Resolve a public route to its actual HTML file, if present."""
    clean = unquote(path).split("?", 1)[0]
    if not clean.startswith("/"):
        clean = "/" + clean
    rel = clean.lstrip("/")
    choices: list[Path] = []
    if not rel or clean.endswith("/"):
        choices.append(ROOT / rel / "index.html")
    else:
        choices.extend([ROOT / rel, ROOT / (rel + ".html"), ROOT / rel / "index.html"])
    for candidate in choices:
        if candidate.is_file() and candidate.suffix.lower() == ".html":
            return candidate
    return None


def is_indexable(file: Path) -> bool:
    signals = PageSignals()
    try:
        signals.feed(file.read_text(encoding="utf-8", errors="replace"))
    except OSError:
        return False
    return not signals.noindex and file.name != "404.html"


def url_for_file(file: Path) -> str:
    rel = file.relative_to(ROOT)
    if rel.as_posix() == "index.html":
        return "/"
    if rel.name.lower() == "index.html":
        return "/" + rel.parent.as_posix().rstrip("/") + "/"
    # Keep the site's established clean-URL convention for HTML documents.
    return "/" + rel.with_suffix("").as_posix()


def proposed_routes(old_path: str) -> list[str]:
    p = unquote(old_path).split("?", 1)[0]
    p = re.sub(r"/index\.(?:html|php)$", "/", p, flags=re.I)
    candidates = []
    # Known folder reorganization: legacy top-level Past-Questions moved under Resources.
    if p == "/Past-Questions" or p.startswith("/Past-Questions/"):
        candidates.append("/Resources" + p)
    # The prior privacy-policy slug was replaced by the site's current legal page.
    if p.rstrip("/").lower() == "/privacy-policy":
        candidates.append("/PrivacyPolicy")
    # The old generic exam-preparation landing route now lives in the NEC section.
    if p.rstrip("/").lower() == "/exam-preparation":
        candidates.append("/NEC-license-preparation/exam-preparation/")
    # If an old path has an exact page counterpart under a clean .html route,
    # the web server's existing extensionless rewrite already serves that page.
    candidates.append(p)
    return list(dict.fromkeys(candidates))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url_file", type=Path, help="GSC CSV export or plain URL list")
    parser.add_argument("--review", type=Path, default=ROOT / "gsc-404-review.csv")
    parser.add_argument("--rules", type=Path, default=ROOT / "legacy-redirects.htaccess")
    args = parser.parse_args()

    if not args.url_file.is_file():
        parser.error(f"input file not found: {args.url_file}")
    rows: list[tuple[str, str, str]] = []
    rules: set[tuple[str, str]] = set()
    for raw in read_urls(args.url_file):
        if "://" in raw:
            parsed = urlparse(raw)
        elif raw.startswith("/"):
            parsed = urlparse("https://" + HOST + raw)
        else:
            parsed = urlparse("https://" + raw)
        if parsed.netloc.lower().removeprefix("www.") not in {HOST, ""}:
            rows.append((raw, "REVIEW — external/unrecognized host", ""))
            continue
        old = parsed.path or "/"
        old_file = page_file(old)
        if old_file and is_indexable(old_file):
            rows.append((raw, "CHECK — route currently resolves to an indexable page", url_for_file(old_file)))
            continue
        target = None
        for path in proposed_routes(old):
            candidate = page_file(path)
            if candidate and is_indexable(candidate):
                canonical = url_for_file(candidate)
                if canonical.rstrip("/").lower() != old.rstrip("/").lower():
                    target = canonical
                    break
        if target:
            rows.append((raw, "301 — moved page found; review and add redirect", target))
            rules.add((old, target))
        else:
            rows.append((raw, "KEEP 404/410 — no verified indexable replacement", ""))

    with args.review.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["old_url", "recommendation", "replacement_url"])
        writer.writerows(rows)
    with args.rules.open("w", encoding="utf-8") as f:
        f.write("# Generated suggestions only. Review before adding to .htaccess.\n")
        f.write("# Do not redirect deleted pages to the homepage or unrelated content.\n")
        for source, destination in sorted(rules):
            # Apache RewriteRule patterns do not start with a slash.
            source_pattern = re.escape(source.lstrip("/").rstrip("/"))
            f.write(f"RewriteRule ^{source_pattern}/?$ {destination} [R=301,L]\n")
    print(f"Reviewed {len(rows)} URL(s): {args.review}")
    print(f"Proposed {len(rules)} verified 301 rule(s): {args.rules}")
    print("Rows marked KEEP 404/410 have no verified replacement; do not redirect them to the homepage.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
