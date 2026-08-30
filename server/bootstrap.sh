#!/usr/bin/env bash
# 秋秋课表 · 服务器一键部署（在 ECS 的远程连接终端里由部署命令调用）
# 前提：Ubuntu 24.04（自带 python3），当前为 root
set -e
cd "$(dirname "$0")/.."

echo "== 1. 目录 =="
mkdir -p /opt/qinqin
if [ ! -d /opt/qinqin/repo ]; then
  echo "（应已由部署命令克隆到 /opt/qinqin/repo）"
fi
cd /opt/qinqin/repo

echo "== 2. 同步码 =="
cd server
if [ ! -f tokens.txt ]; then
  python3 -c "import uuid; open('tokens.txt','w').write(uuid.uuid4().hex[:16]+'\n')"
fi
CODE=$(cat tokens.txt)

echo "== 3. systemd 常驻服务 =="
cat > /etc/systemd/system/qinqin.service <<'U'
[Unit]
Description=Qinqin Schedule Sync Server
After=network.target

[Service]
WorkingDirectory=/opt/qinqin/repo/server
ExecStart=/usr/bin/python3 /opt/qinqin/repo/server/sync_server.py 0.0.0.0 8780
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
U
systemctl daemon-reload
systemctl enable --now qinqin
sleep 1

echo "== 4. 自检 ="
systemctl --no-pager status qinqin | head -6 || true
curl -s http://127.0.0.1:8780/api/ping && echo " ← 本机服务 OK"

IP=$(curl -s --max-time 5 ifconfig.me || echo "112.74.96.47")
echo
echo "=============================================="
echo " 部署完成！"
echo " App + 同步地址: http://$IP:8780"
echo " 同步码: $CODE"
echo " 手机不通的话 → 阿里云安全组放行 8780/TCP"
echo "=============================================="
