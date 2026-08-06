# -*- coding: utf-8 -*-
"""독도 탐사본부 로컬 서버 — python serve.py → http://localhost:8123
   멀티스레드 필수: BGM(mp3) 스트리밍 연결이 열려 있어도 다른 요청을 처리해야 함."""
import http.server
from http.server import ThreadingHTTPServer

PORT = 8123


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".json": "application/json; charset=utf-8",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    ThreadingHTTPServer.allow_reuse_address = True
    with ThreadingHTTPServer(("", PORT), Handler) as httpd:
        print(f"독도 탐사본부 → http://localhost:{PORT}")
        httpd.serve_forever()
