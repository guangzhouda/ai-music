#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# deploy.sh
# 将 ai-music 部署到 1472800.xyz/music/
# 用法: sudo bash deploy.sh
# ============================================================

SITE_ROOT="/var/www/my-site"
MUSIC_DIR="${SITE_ROOT}/music"
DEPLOY_USER="aojing"
WEB_GROUP="www-data"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AI_MUSIC_SRC="${SCRIPT_DIR}"
LOCAL_NODE="${SCRIPT_DIR}/../.tools/node22/bin"
NGINX_CONF="/etc/nginx/sites-available/my-site"

if [[ "${EUID}" -ne 0 ]]; then
  echo "请用 root 运行:"
  echo "  sudo bash $0"
  exit 1
fi

echo "========================================"
echo "  部署 AI Music Studio → /music/"
echo "========================================"

# ---- 1. 构建 ----
echo ""
echo "[1/4] 构建 ai-music ..."
cd "${AI_MUSIC_SRC}"
export PATH="${LOCAL_NODE}:${PATH}"

if [[ ! -d node_modules ]]; then
  npm install --no-audit --no-fund
fi
npm run build

# ---- 2. 部署前端 ----
echo ""
echo "[2/4] 部署前端静态文件 ..."
rm -rf "${MUSIC_DIR}"
mkdir -p "${MUSIC_DIR}"
cp -r "${AI_MUSIC_SRC}/apps/web/dist/." "${MUSIC_DIR}/"
chown -R "${DEPLOY_USER}:${WEB_GROUP}" "${MUSIC_DIR}"
find "${MUSIC_DIR}" -type d -exec chmod 0755 {} +
find "${MUSIC_DIR}" -type f -exec chmod 0644 {} +

# ---- 3. 后端 systemd 服务 ----
echo ""
echo "[3/4] 配置后端服务 ..."

cat > /etc/systemd/system/ai-music-server.service << SERVICE_EOF
[Unit]
Description=AI Music Studio Backend
After=network.target

[Service]
Type=simple
User=${DEPLOY_USER}
WorkingDirectory=${AI_MUSIC_SRC}
Environment=NODE_ENV=production
EnvironmentFile=${AI_MUSIC_SRC}/.env
ExecStart=${LOCAL_NODE}/node ${AI_MUSIC_SRC}/apps/server/dist/index.js
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICE_EOF

systemctl daemon-reload
systemctl enable ai-music-server
systemctl restart ai-music-server
echo "  后端已启动 (端口 8787)"

# ---- 4. Nginx 配置 ----
echo ""
echo "[4/4] 更新 Nginx 配置 ..."

BACKUP="${NGINX_CONF}.bak-$(date +%Y%m%d-%H%M%S)"

# 检查是否已包含 /music/ 配置
if grep -q "location /music/" "${NGINX_CONF}" 2>/dev/null; then
  echo "  /music/ 配置已存在，跳过 Nginx 更新"
else
  cp "${NGINX_CONF}" "${BACKUP}"
  echo "  已备份 → ${BACKUP}"

  # 写入完整新配置
  cat > "${NGINX_CONF}" << 'NGINX_EOF'
server {
    listen 443 ssl;
    listen [::]:443 ssl;

    server_name www.1472800.xyz;

    ssl_certificate /etc/letsencrypt/live/1472800.xyz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/1472800.xyz/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    return 301 https://1472800.xyz$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;

    server_name 1472800.xyz;

    root /var/www/my-site;
    index index.html;

    ssl_certificate /etc/letsencrypt/live/1472800.xyz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/1472800.xyz/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # ---- Blog ----
    location / {
        try_files $uri $uri/ =404;
    }

    # ---- AI Music API (proxy → backend :8787) ----
    location /api/ {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # ---- AI Music Frontend (SPA) ----
    location /music/ {
        alias /var/www/my-site/music/;
        try_files $uri $uri/ /music/index.html;
        index index.html;
    }

    location ~* \.(?:css|js|jpg|jpeg|gif|png|svg|ico|webp|avif|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
        try_files $uri =404;
        access_log off;
    }

    location ~ /\.(?!well-known) {
        deny all;
    }
}

server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name 1472800.xyz www.1472800.xyz;

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/my-site;
        default_type "text/plain";
        try_files $uri =404;
    }

    location / {
        return 301 https://1472800.xyz$request_uri;
    }
}
NGINX_EOF

  echo "  测试 Nginx 配置..."
  if nginx -t 2>&1; then
    systemctl reload nginx
    echo "  Nginx 已重载"
  else
    echo "  ❌ 配置测试失败，回滚..."
    cp "${BACKUP}" "${NGINX_CONF}"
    nginx -t && systemctl reload nginx
    exit 1
  fi
fi

# ---- 完成 ----
echo ""
echo "========================================"
echo "  ✅ 部署完成！"
echo "========================================"
echo ""
echo "  AI Music: https://1472800.xyz/music/"
echo "  API:      https://1472800.xyz/api/"
echo "  Blog:     https://1472800.xyz/"
echo ""
echo "  后端状态:"
systemctl status ai-music-server --no-pager -l 2>&1 | head -10
echo ""
echo "  验证命令:"
echo "    curl -I https://1472800.xyz/music/"
echo "    curl https://1472800.xyz/api/overview"
