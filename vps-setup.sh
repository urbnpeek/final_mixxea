#!/usr/bin/env bash
set -euo pipefail

# MIXXEA VPS bootstrap (Ubuntu 22.04/24.04)
# Run once on VPS as root: sudo bash vps-setup.sh
#
# Edit these placeholders before running:
# - DOMAIN: your public domain
# - EMAIL: certbot email
# - VPS_PATH: deployment root path

DOMAIN="YOUR_DOMAIN"
EMAIL="YOUR_EMAIL"
VPS_PATH="/var/www/mixxea"
APP_USER="mixxea"
APP_STACK="vite" # "vite" (this repo) or "next"
APP_PORT="3000"  # used only when APP_STACK=next

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo bash vps-setup.sh"
  exit 1
fi

echo "[1/9] Installing base packages"
apt-get update -y
apt-get install -y ca-certificates curl gnupg lsb-release rsync ufw nginx certbot python3-certbot-nginx

echo "[2/9] Installing Node.js 20 and pnpm"
if ! command -v node >/dev/null 2>&1 || ! node -v | grep -qE '^v20\.'; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
corepack enable || true
corepack prepare pnpm@latest --activate || npm install -g pnpm

echo "[3/9] Creating dedicated user (${APP_USER})"
if ! id -u "${APP_USER}" >/dev/null 2>&1; then
  useradd --system --create-home --shell /bin/bash "${APP_USER}"
fi

echo "[4/9] Preparing folder structure under ${VPS_PATH}"
install -d -m 755 -o "${APP_USER}" -g "${APP_USER}" "${VPS_PATH}"
install -d -m 755 -o "${APP_USER}" -g "${APP_USER}" "${VPS_PATH}/current"
install -d -m 755 -o "${APP_USER}" -g "${APP_USER}" "${VPS_PATH}/shared"
install -d -m 755 -o www-data -g www-data /var/www/certbot

echo "[5/9] Configuring UFW firewall"
ufw default deny incoming >/dev/null || true
ufw default allow outgoing >/dev/null || true
ufw allow OpenSSH >/dev/null || true
ufw allow 80/tcp >/dev/null || true
ufw allow 443/tcp >/dev/null || true
ufw --force enable

write_http_only_config() {
cat >/etc/nginx/sites-available/mixxea <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    $(if [[ "${APP_STACK}" == "next" ]]; then cat <<'NEXTHTTP'
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_cache_bypass $http_upgrade;
    }
NEXTHTTP
else cat <<'SPAHTTP'
    root /var/www/mixxea/current/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(?:js|mjs|css|png|jpg|jpeg|gif|svg|webp|avif|ico|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    location = /index.html {
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }
SPAHTTP
fi)

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
EOF
}

write_https_config() {
cat >/etc/nginx/sites-available/mixxea <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN} www.${DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml image/svg+xml font/woff font/woff2;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    $(if [[ "${APP_STACK}" == "next" ]]; then cat <<'NEXTHTTPS'
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_cache_bypass $http_upgrade;
    }
NEXTHTTPS
else cat <<'SPAHTTPS'
    root /var/www/mixxea/current/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(?:js|mjs|css|png|jpg|jpeg|gif|svg|webp|avif|ico|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    location = /index.html {
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }
SPAHTTPS
fi)

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
EOF
}

echo "[6/9] Writing Nginx site config"
if [[ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]]; then
  write_https_config
else
  write_http_only_config
fi

ln -sfn /etc/nginx/sites-available/mixxea /etc/nginx/sites-enabled/mixxea
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl restart nginx

echo "[7/9] Requesting/renewing SSL cert"
if [[ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]]; then
  certbot --nginx --non-interactive --agree-tos --email "${EMAIL}" -d "${DOMAIN}" -d "www.${DOMAIN}" --redirect
else
  certbot renew --non-interactive || true
fi
write_https_config
nginx -t
systemctl reload nginx

echo "[8/9] Configuring systemd service for Next.js only"
if [[ "${APP_STACK}" == "next" ]]; then
  cat >/etc/systemd/system/mixxea.service <<EOF
[Unit]
Description=MIXXEA Next.js app
After=network.target

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${VPS_PATH}/current
Environment=NODE_ENV=production
Environment=PORT=${APP_PORT}
ExecStart=/usr/bin/env pnpm start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable mixxea.service
else
  systemctl disable mixxea.service >/dev/null 2>&1 || true
fi

echo "[9/9] Done"
echo "VPS bootstrap complete."
echo "DOMAIN=${DOMAIN}"
echo "APP_STACK=${APP_STACK}"
echo "VPS_PATH=${VPS_PATH}"
