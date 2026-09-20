# -*- coding: utf-8 -*-
# 秋秋课表 qinqin.db 每日备份（SQLite 在线备份，保留最近 14 天）
import sqlite3, os, time, glob

BASE = '/opt/qinqin/repo/server'
DB = os.path.join(BASE, 'qinqin.db')
OUT = '/opt/qinqin/backups'
os.makedirs(OUT, exist_ok=True)
dst = os.path.join(OUT, 'qinqin-' + time.strftime('%Y%m%d') + '.db')
con = sqlite3.connect(DB)
bak = sqlite3.connect(dst)
with bak:
    con.backup(bak)
bak.close()
con.close()
files = sorted(glob.glob(os.path.join(OUT, 'qinqin-*.db')))
for f in files[:-14]:
    os.remove(f)
print('backup ok ->', dst, os.path.getsize(dst), 'bytes, kept', min(len(files), 14))
