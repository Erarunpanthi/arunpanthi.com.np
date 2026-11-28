"""Check navigation between available PSC notes and MCQs.

Run with: python3 tools/test-psc-topic-navigation.py
"""
from html.parser import HTMLParser
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
SECTIONS = ("first-paper-notes", "Subjective-Note", "MCQ")


class NavigationParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_navigation = False
        self.navigation_count = 0
        self.items = []
        self.styles = []
        self.old_pagers = 0

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        classes = attrs.get("class", "").split()
        if tag == "link" and attrs.get("rel") == "stylesheet":
            self.styles.append(attrs.get("href"))
        if "topic-pager" in classes:
            self.old_pagers += 1
        if tag == "nav" and "topic-navigation" in classes:
            self.navigation_count += 1
            self.in_navigation = True
        elif self.in_navigation and "topic-navigation-item" in classes:
            self.items.append((tag, attrs))

    def handle_endtag(self, tag):
        if tag == "nav":
            self.in_navigation = False


class TopicNavigationTest(unittest.TestCase):
    def test_navigation_on_all_topic_pages(self):
        for section in SECTIONS:
            directory = ROOT / "Psc-preparation" / section
            pages = sorted((p for p in directory.glob("*.html") if p.name != "index.html"),
                           key=lambda p: tuple(map(int, p.stem.split("."))))
            self.assertTrue(pages)
            for index, path in enumerate(pages):
                with self.subTest(page=path.relative_to(ROOT)):
                    parser = NavigationParser()
                    parser.feed(path.read_text(encoding="utf-8"))
                    self.assertEqual(parser.navigation_count, 1)
                    self.assertEqual(parser.old_pagers, 0)
                    self.assertIn("/css/topic-navigation.css?v=20261110", parser.styles)
                    self.assertEqual(len(parser.items), 3)
                    previous, topics, following = parser.items
                    self.assertEqual(topics[1].get("href"), f"/Psc-preparation/{section}/")
                    for item, target in ((previous, pages[index - 1] if index else None),
                                         (following, pages[index + 1] if index + 1 < len(pages) else None)):
                        if target is None:
                            self.assertEqual(item[0], "span")
                            self.assertEqual(item[1].get("aria-disabled"), "true")
                        else:
                            self.assertEqual(item[0], "a")
                            self.assertEqual(item[1].get("href"), f"/Psc-preparation/{section}/{target.stem}")
                            self.assertTrue(target.is_file())


if __name__ == "__main__":
    unittest.main()
