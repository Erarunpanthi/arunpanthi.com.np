"""Check navigation follows the published syllabus index order."""
from html.parser import HTMLParser
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
SYLLABUS = ROOT / "Psc-preparation" / "Syllabus"
PAGES = ("General", "Hydrology", "Building-Architecture", "Nepal-telecom", "Caan")


class Parser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.nav = False
        self.items = []
        self.styles = []
        self.nav_count = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "link" and attrs.get("rel") == "stylesheet":
            self.styles.append(attrs.get("href"))
        if tag == "nav" and "topic-navigation" in attrs.get("class", "").split():
            self.nav = True
            self.nav_count += 1
        elif self.nav and "topic-navigation-item" in attrs.get("class", "").split():
            self.items.append((tag, attrs))

    def handle_endtag(self, tag):
        if tag == "nav":
            self.nav = False


class SyllabusNavigationTest(unittest.TestCase):
    def test_all_published_syllabuses(self):
        for i, slug in enumerate(PAGES):
            with self.subTest(syllabus=slug):
                parser = Parser()
                parser.feed((SYLLABUS / (slug + ".html")).read_text())
                self.assertEqual(parser.nav_count, 1)
                self.assertIn("/css/topic-navigation.css?v=20261110", parser.styles)
                self.assertEqual(len(parser.items), 3)
                self.assertEqual(parser.items[1][1].get("href"), "/Psc-preparation/Syllabus/")
                for item, index in ((parser.items[0], i - 1), (parser.items[2], i + 1)):
                    if 0 <= index < len(PAGES):
                        self.assertEqual(item[0], "a")
                        self.assertEqual(item[1].get("href"), "/Psc-preparation/Syllabus/" + PAGES[index])
                        self.assertTrue((SYLLABUS / (PAGES[index] + ".html")).is_file())
                    else:
                        self.assertEqual(item[0], "span")
                        self.assertEqual(item[1].get("aria-disabled"), "true")


if __name__ == "__main__":
    unittest.main()
