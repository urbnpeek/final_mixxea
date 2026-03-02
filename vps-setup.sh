#!/usr/bin/env bash
set -euo pipefail

# One-time VPS bootstrap for MIXXEA Vite deploys
# Usage:
#   sudo DOMAIN=example.com EMAIL=admin@example.com bash vps-setup.sh

DOMAIN="${DOMAIN:-YOUR_DOMAIN}"
EMAIL="${EMAIL:-YOUR_EMAIL}"
APP_USER="code"
APP_GROUP="code"
VPS_PATH="/home/code/mixxea"

if [[ "$EUID" -ne 0 ]]; then
  echo "Run as root: sudo bash vps-setup.sh"
  exit 1
fi

if [[ "$DOMAIN" == "YOUR_DOMAIN" || "$EMAIL" == "YOUR_EMAIL" ]]; then
  echo "Set DOMAIN and EMAIL first. Example:"
  echo "  sudo DOMAIN=example.com EMAIL=admin@example.com bash vps-setup.sh"
  exit 1
fi

echo "[1/7] Install packages"
apt-get update -y
apt-get install -y nginx rsync ufw certbot python3-certbot-nginx

echo "[2/7] Ensure deploy directories"
install -d -m 755 -o "$APP_USER" -g "$APP_GROUP" "$VPS_PATH"
install -d -m 755 -o "$APP_USER" -g "$APP_GROUP" "$VPS_PATH/current"
install -d -m 755 -o "$APP_USER" -g "$APP_GROUP" "$VPS_PATH/current/dist"
install -d -m 755 -o "$APP_USER" -g "$APP_GROUP" "$VPS_PATH/releases"
install -d -m 755 -o "$APP_USER" -g "$APP_GROUP" "$VPS_PATH/shared"
install -d -m 755 -o www-data -g www-data /var/www/certbot

echo "[3/7] Configure UFW"
ufw default deny incoming || true
ufw default allow outgoing || true
ufw allow OpenSSH || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true
ufw --force enable

echo "[4/7] Install nginx site config"
sed "s/YOUR_DOMAIN/$DOMAIN/g" nginx.conf > /etc/nginx/sites-available/mixxea
ln -sfn /etc/nginx/sites-available/mixxea /etc/nginx/sites-enabled/mixxea
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl restart nginx

echo "[5/7] Request/renew Let's Encrypt cert"
if [[ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
  certbot --nginx --non-interactive --agree-tos --email "$EMAIL" -d "$DOMAIN" -d "www.$DOMAIN" --redirect
else
  certbot renew --non-interactive || true
fi
nginx -t
systemctl reload nginx

echo "[6/7] Verify ownership"
chown -R "$APP_USER:$APP_GROUP" "$VPS_PATH"

echo "[7/7] Done"
echo "VPS ready for GitHub Actions deploys."
echo "Deploy root: $VPS_PATH"
