#!/usr/bin/env python3
"""Static server that mimics GitHub Pages routing, for local verification.

Pages serves <path>/index.html for directories, answers extension-less routes
from the matching .html file, and falls back to 404.html with status 404 for
anything else. .htaccess is ignored, so this is the closest local model of
production.

Run: python3 tools/serve-pages.py [port]
"""
from __future__ import annotations

import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class PagesHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def translate_path(self, path: str) -> str:
        clean = path.split("?")[0].split("#")[0]
        target = ROOT / clean.lstrip("/")
        if target.is_dir():
            index = target / "index.html"
            if index.is_file():
                return str(index)
        for candidate in (target, ROOT / (clean.lstrip("/") + ".html")):
            if candidate.is_file():
                return str(candidate)
        return str(ROOT / "404.html")

    def send_head(self):  # noqa: N802 (stdlib naming)
        served = Path(self.translate_path(self.path))
        if served.name == "404.html" and served.parent == ROOT:
            # Same as Pages: the 404 document, served with status 200.
            body = served.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            import io
            return io.BytesIO(body)
        return super().send_head()

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("%s %s\n" % (self.address_string(), fmt % args))


def main() -> int:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    server = ThreadingHTTPServer(("0.0.0.0", port), PagesHandler)
    print(f"Serving {ROOT} on http://0.0.0.0:{port}", flush=True)
    server.serve_forever()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
