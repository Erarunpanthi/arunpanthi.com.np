"""Verify university syllabus buttons, annotation surfaces and protection."""
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1] / "Resources/Syllabus"
UNIVERSITIES = ("TU", "KU", "FU", "MWU")


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.links = []
        self.scripts = []
        self.styles = []
        self.surfaces = []
        self.feed(path.read_text(encoding="utf-8"))

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag == "a":
            self.links.append(attrs)
        if tag == "script" and "src" in attrs:
            self.scripts.append(attrs["src"])
        if tag == "link" and attrs.get("rel") == "stylesheet":
            self.styles.append(attrs.get("href"))
        if "data-note-pen-surface" in attrs:
            self.surfaces.append(tag)


class SyllabusFeaturesTest(unittest.TestCase):
    def test_watermark_and_lazy_loading(self):
        for filename in ("index.html", *(f"{u}-syllabus.html" for u in UNIVERSITIES)):
            with self.subTest(page=filename):
                scripts = Counter(Page(ROOT / filename).scripts)
                self.assertEqual(scripts["/js/logo.js?v=20261101"], 1)
                self.assertEqual(scripts["/js/lazy-load.js"], 1)
        self.assertTrue((ROOT.parents[1] / "Photos/watermark.png").is_file())

    def test_directory_buttons(self):
        page = Page(ROOT / "index.html")
        for university in UNIVERSITIES:
            with self.subTest(university=university):
                href = f"/Resources/Syllabus/{university}-syllabus"
                links = [a for a in page.links if a.get("href") == href]
                self.assertEqual(len(links), 1)
                self.assertIn("cta-button", links[0].get("class", "").split())
                self.assertTrue(links[0].get("aria-label"))
                self.assertTrue((ROOT / f"{university}-syllabus.html").is_file())

    def test_individual_pages(self):
        for university in UNIVERSITIES:
            with self.subTest(university=university):
                page = Page(ROOT / f"{university}-syllabus.html")
                self.assertEqual(page.surfaces, ["main"])
                self.assertIn("/css/note-pen.css?v=20261109-4", page.styles)
                counts = Counter(page.scripts)
                self.assertEqual(counts["/js/note-pen.js?v=20261109-4"], 1)
                self.assertEqual(counts["/js/text-protect.js"], 1)


if __name__ == "__main__":
    unittest.main()
