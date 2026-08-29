"""本地预览服务器：带 no-store 头，避免 Chromium 启发式缓存加载旧页面。
用法: python serve.py [目录] [端口]   默认 ./app 8766
"""
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

root = sys.argv[1] if len(sys.argv) > 1 else './app'
port = int(sys.argv[2]) if len(sys.argv) > 2 else 8766


class NoStoreHandler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=root, **kw)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, fmt, *args):
        pass


if __name__ == '__main__':
    print(f'serving {root} at http://127.0.0.1:{port}')
    ThreadingHTTPServer(('127.0.0.1', port), NoStoreHandler).serve_forever()
