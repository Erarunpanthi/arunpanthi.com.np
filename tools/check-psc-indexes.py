"""Check the four PSC landing pages using only Python's standard library.

Run from any directory: python tools/check-psc-indexes.py
"""
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import unittest

ROOT = Path(__file__).resolve().parents[1]
PAGES = {"Subjective-Note": 17, "first-paper-notes": 29, "MCQ": 27, "Test": 29}


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.elements = []
        self.feed(path.read_text(encoding="utf-8"))

    def handle_starttag(self, tag, attrs):
        self.elements.append((tag, dict(attrs)))

    def by_class(self, name):
        return [(tag, attrs) for tag, attrs in self.elements
                if name in attrs.get("class", "").split()]


class PSCIndexesTest(unittest.TestCase):
    def test_shared_layout_and_content(self):
        for name, count in PAGES.items():
            with self.subTest(page=name):
                page = Page(ROOT / "Psc-preparation" / name / "index.html")
                self.assertEqual(len(page.by_class("topic-card")), count)
                self.assertEqual(len(page.by_class("subjective-hero")), 1)
                self.assertEqual(len(page.by_class("marks")), 0)
                self.assertEqual(len(page.by_class("topic-marks")), 0)
                self.assertEqual(sum(tag == "h1" for tag, _ in page.elements), 1)
                ids = Counter(a["id"] for _, a in page.elements if "id" in a)
                self.assertTrue(all(count == 1 for count in ids.values()))
                for expected in ("navbar", "main-content", "social-section", "footer"):
                    self.assertIn(expected, ids)
                styles = [a["href"] for tag, a in page.elements
                          if tag == "link" and a.get("rel") == "stylesheet"]
                self.assertIn("/Psc-preparation/Subjective-Note/subjective.css?v=20261006", styles)
                for tag, attrs in page.elements:
                    if "aria-labelledby" in attrs:
                        for label in attrs["aria-labelledby"].split():
                            self.assertIn(label, ids)
                    if tag == "a" and attrs.get("href", "").startswith("#"):
                        self.assertIn(attrs["href"][1:], ids)

    def test_resource_links_exist(self):
        for name in PAGES:
            page = Page(ROOT / "Psc-preparation" / name / "index.html")
            for _, attrs in page.by_class("notes-button"):
                with self.subTest(page=name, href=attrs.get("href")):
                    url = urlsplit(attrs["href"])
                    self.assertFalse(url.netloc, "Use same-origin resource links")
                    path = ROOT / url.path.lstrip("/")
                    self.assertTrue(path.is_file() or Path(str(path) + ".html").is_file())
                    if name == "Test":
                        self.assertEqual(attrs.get("target"), "_blank")
                        self.assertIn("noopener", attrs.get("rel", ""))

    def test_expandable_resources(self):
        for name, count in (("MCQ", 1), ("Test", 29)):
            page = Page(ROOT / "Psc-preparation" / name / "index.html")
            disclosures = page.by_class("topic-resources")
            self.assertEqual(len(disclosures), count)
            self.assertTrue(all(tag == "details" for tag, _ in disclosures))
            self.assertEqual(sum(tag == "summary" for tag, _ in page.elements), count)


if __name__ == "__main__":
    unittest.main()
