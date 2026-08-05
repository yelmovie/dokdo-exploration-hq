# -*- coding: utf-8 -*-
"""독도 탐사본부 로컬 서버 — python serve.py → http://localhost:8123"""
import http.server
import socketserver

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
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"독도 탐사본부 → http://localhost:{PORT}")
        httpd.serve_forever()
