"""琴琴课表 · 云同步服务器（单文件，仅 Python 标准库）

功能：
  1. 托管 App 静态文件（app/ 目录）
  2. /api/state  拉取云端课表      GET    Authorization: Bearer <同步码>
  3. /api/push   上传课表          POST   {base_rev, data}  冲突返回 409 {rev, data}
  4. /api/ping   测试连接          GET

用法：
  python3 sync_server.py            # 默认 0.0.0.0:8780，静态目录 ../app
  python3 sync_server.py 0.0.0.0 9000 /srv/qinqin/app

同步码：首次运行自动生成 tokens.txt（一行一个码，夫妻共用同一个即可，可自行增删）。
数据：同目录 qinqin.db（SQLite），记得定期备份这个文件。
HTTPS：正式使用请前面挂一层 nginx / caddy 反代（微信里打开网页也必须有 HTTPS + 域名）。
"""
import json
import os
import sqlite3
import sys
import threading
import uuid
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(BASE, '..', 'app')
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8780
HOST = sys.argv[1] if len(sys.argv) > 1 else '0.0.0.0'
if len(sys.argv) > 3:
    ROOT = sys.argv[3]
DB = os.path.join(BASE, 'qinqin.db')
TOKENS_FILE = os.path.join(BASE, 'tokens.txt')

LOCK = threading.Lock()


def init():
    if not os.path.exists(TOKENS_FILE):
        code = uuid.uuid4().hex[:16]
        with open(TOKENS_FILE, 'w', encoding='utf-8') as f:
            f.write(code + '\n')
        print('=' * 46)
        print('  同步码（发给家人，App 里填这个）:', code)
        print('  也保存在', TOKENS_FILE)
        print('=' * 46)
    con = sqlite3.connect(DB)
    con.execute('CREATE TABLE IF NOT EXISTS state('
                'id INTEGER PRIMARY KEY CHECK(id=1), data TEXT, rev INTEGER)')
    con.commit()
    con.close()


def load_tokens():
    with open(TOKENS_FILE, encoding='utf-8') as f:
        return {line.strip() for line in f if line.strip()}


def get_state():
    con = sqlite3.connect(DB)
    row = con.execute('SELECT rev, data FROM state WHERE id=1').fetchone()
    con.close()
    if not row:
        return 0, None
    return row[0], json.loads(row[1]) if row[1] else None


def put_state(data, rev):
    con = sqlite3.connect(DB)
    con.execute('INSERT INTO state(id, data, rev) VALUES(1, ?, ?) '
                'ON CONFLICT(id) DO UPDATE SET data=excluded.data, rev=excluded.rev',
                (json.dumps(data, ensure_ascii=False), rev))
    con.commit()
    con.close()


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=os.path.abspath(ROOT), **kw)

    def end_headers(self):
        path = self.path.split('?')[0]
        if path.startswith('/assets/font'):
            self.send_header('Cache-Control', 'public, max-age=31536000, immutable')
        else:
            self.send_header('Cache-Control', 'no-store')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Authorization,Content-Type')
        self.send_header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        super().end_headers()

    def log_message(self, fmt, *args):
        pass

    def _json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _authed(self):
        h = self.headers.get('Authorization', '')
        return h.startswith('Bearer ') and h[7:] in load_tokens()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/ping':
            return self._json({'ok': True, 'name': 'qinqin-sync'})
        if self.path == '/api/state':
            if not self._authed():
                return self._json({'error': 'unauthorized'}, 401)
            rev, data = get_state()
            return self._json({'rev': rev, 'data': data})
        return super().do_GET()

    def do_POST(self):
        if self.path != '/api/push':
            return self._json({'error': 'not found'}, 404)
        if not self._authed():
            return self._json({'error': 'unauthorized'}, 401)
        try:
            n = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(n).decode('utf-8'))
            base_rev = int(body.get('base_rev', 0))
            data = body.get('data')
            if not isinstance(data, dict) or not isinstance(data.get('students', []), list):
                return self._json({'error': 'bad data'}, 400)
        except Exception:
            return self._json({'error': 'bad request'}, 400)
        with LOCK:
            cur_rev, cur_data = get_state()
            if base_rev != cur_rev:
                return self._json({'error': 'conflict', 'rev': cur_rev, 'data': cur_data}, 409)
            put_state(data, cur_rev + 1)
            return self._json({'ok': True, 'rev': cur_rev + 1})


if __name__ == '__main__':
    init()
    print(f'琴琴课表同步服务 http://{HOST}:{PORT}  静态目录={os.path.abspath(ROOT)}  库={DB}')
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
