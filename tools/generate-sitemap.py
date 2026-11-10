#!/usr/bin/env python3
"""Generate sitemap.xml from indexable HTML pages and their declared canonicals."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://arunpanthi.com.np"

class Metadata(HTMLParser):
    def __init__(self):
        super().__init__()
        self.canonical = None
        self.noindex = False
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag.lower() == "link" and "canonical" in attrs.get("rel", "").lower().split():
            self.canonical = attrs.get("href")
        if tag.lower() == "meta" and attrs.get("name", "").lower() in ("robots", "googlebot"):
            if "noindex" in attrs.get("content", "").lower():
                self.noindex = True

urls = set()
for file in ROOT.rglob("*.html"):
    if any(part.startswith(".") for part in file.relative_to(ROOT).parts) or file.name == "404.html":
        continue
    metadata = Metadata()
    metadata.feed(file.read_text(encoding="utf-8", errors="replace"))
    if metadata.noindex:
        continue
    if metadata.canonical:
        parsed = urlparse(metadata.canonical)
        if parsed.scheme != "https" or parsed.netloc != "arunpanthi.com.np" or parsed.query or parsed.fragment:
            continue
        canonical = metadata.canonical
    else:
        rel = file.relative_to(ROOT)
        if rel.as_posix() == "index.html":
            canonical = BASE + "/"
        else:
            canonical = BASE + "/" + (rel.parent.as_posix().rstrip("/") + "/" if rel.name.lower() == "index.html" else rel.with_suffix("").as_posix())
    urls.add(canonical)

ns = "http://www.sitemaps.org/schemas/sitemap/0.9"
ET.register_namespace("", ns)
root = ET.Element(f"{{{ns}}}urlset")
for url in sorted(urls):
    node = ET.SubElement(root, f"{{{ns}}}url")
    ET.SubElement(node, f"{{{ns}}}loc").text = url
ET.indent(root, space="  ")
ET.ElementTree(root).write(ROOT / "sitemap.xml", encoding="utf-8", xml_declaration=True)
print(f"Wrote {len(urls)} canonical, indexable URLs to sitemap.xml")
