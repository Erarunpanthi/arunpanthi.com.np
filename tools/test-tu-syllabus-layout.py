"""Check TU syllabus section nesting and visible table-of-contents targets."""
from html.parser import HTMLParser
from pathlib import Path
import unittest

PAGE = Path(__file__).resolve().parents[1] / "Resources/Syllabus/TU-syllabus.html"


class LayoutParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.errors = []
        self.parents = {}
        self.hidden = set()
        self.links = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "a" and any(item[1] == "table-of-contents" for item in self.stack):
            if attrs.get("href", "").startswith("#"):
                self.links.append(attrs["href"][1:])
        if tag in {"div", "section", "main"}:
            ident = attrs.get("id")
            if ident:
                self.parents[ident] = tuple(self.stack)
                if "display:none" in attrs.get("style", "").replace(" ", ""):
                    self.hidden.add(ident)
            self.stack.append((tag, ident))

    def handle_endtag(self, tag):
        if tag in {"div", "section", "main"}:
            if not self.stack or self.stack[-1][0] != tag:
                self.errors.append((tag, self.getpos()))
            else:
                self.stack.pop()


class LayoutTest(unittest.TestCase):
    def test_sections_and_contents(self):
        page = LayoutParser()
        page.feed(PAGE.read_text(encoding="utf-8"))
        self.assertEqual(page.errors, [])
        self.assertEqual(page.stack, [])
        self.assertTrue(page.links)
        for target in page.links:
            with self.subTest(target=target):
                self.assertIn(target, page.parents)
                self.assertNotIn(target, page.hidden)
        for number in range(1, 9):
            with self.subTest(semester=number):
                parents = page.parents[f"sem{number}"]
                self.assertFalse(any(tag == "section" for tag, _ in parents))
                self.assertTrue(any(tag == "main" for tag, _ in parents))
        self.assertTrue(any(ident == "sem2" for _, ident in page.parents["ee451"]))


if __name__ == "__main__":
    unittest.main()
