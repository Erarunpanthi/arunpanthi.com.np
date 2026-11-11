"""Check shared scripts on PSC syllabus, notes and MCQ pages.

Run with: python3 tools/test-psc-shared-scripts.py
"""
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import unittest

ROOT = Path(__file__).resolve().parents[1]
SECTIONS = ("Syllabus", "first-paper-notes", "Subjective-Note", "MCQ")
REQUIRED = {
    "/js/lazy-load.js": "",
    "/js/text-protect.js": "",
    "/js/layout.js": "v=20260924",
    "/js/logo.js": "v=20261101",
    "/js/note-pen.js": "v=20261109-4",
}


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.scripts = []
        self.styles = []
        self.pen_surface = False
        self.feed(path.read_text(encoding="utf-8"))

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag == "script" and "src" in attrs:
            self.scripts.append(urlsplit(attrs["src"]))
        if tag == "link" and attrs.get("rel") == "stylesheet":
            self.styles.append(urlsplit(attrs.get("href", "")))
        if "syllabus-wrapper" in attrs.get("class", "").split() or "data-note-pen-surface" in attrs:
            self.pen_surface = True


class SharedScriptsTest(unittest.TestCase):
    def test_every_page_has_required_scripts_once(self):
        for section in SECTIONS:
            pages = sorted((ROOT / "Psc-preparation" / section).rglob("*.html"))
            self.assertTrue(pages, f"No HTML pages in {section}")
            for path in pages:
                with self.subTest(page=path.relative_to(ROOT)):
                    page = Page(path)
                    counts = Counter(script.path for script in page.scripts)
                    for script, version in REQUIRED.items():
                        self.assertEqual(counts[script], 1, script)
                        self.assertEqual(next(s.query for s in page.scripts if s.path == script), version)
                    if page.pen_surface:
                        self.assertIn(("/css/note-pen.css", "v=20261109-4"),
                                      [(style.path, style.query) for style in page.styles])


if __name__ == "__main__":
    unittest.main()
