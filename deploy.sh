#!/usr/bin/env bash
set -euo pipefail

# MIXXEA one-command deploy (run locally)
#
# Edit these variables or export them before running.
# No secrets are stored in git; SSH_KEY points to your local private key.

VPS_HOST="${VPS_HOST:-YOUR_VPS_HOST}"
VPS_USER="${VPS_USER:-mixxea}"
VPS_PATH="${VPS_PATH:-/var/www/mixxea}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_rsa}"

if [[ "${VPS_HOST}" == "YOUR_VPS_HOST" ]]; then
  echo "Set VPS_HOST first (export VPS_HOST=your.server.ip)"
  exit 1
fi

if [[ ! -f "${SSH_KEY}" ]]; then
  echo "SSH key not found: ${SSH_KEY}"
  exit 1
fi

detect_stack() {
  if grep -q '"next"' package.json; then
    echo "next"
  elif grep -q '"vite"' package.json; then
    echo "vite"
  else
    echo "unknown"
  fi
}

detect_pm() {
  if [[ -f "pnpm-lock.yaml" ]]; then
    echo "pnpm"
  else
    echo "npm"
  fi
}

APP_STACK="$(detect_stack)"
PKG_MANAGER="$(detect_pm)"

if [[ "${APP_STACK}" == "unknown" ]]; then
  echo "Could not detect stack (expected Next.js or Vite in package.json)."
  exit 1
fi

echo "Deploying stack=${APP_STACK} package_manager=${PKG_MANAGER} to ${VPS_USER}@${VPS_HOST}:${VPS_PATH}"

ssh -i "${SSH_KEY}" -o StrictHostKeyChecking=accept-new "${VPS_USER}@${VPS_HOST}" "mkdir -p '${VPS_PATH}/current'"

# Sync full repository; build happens on VPS.
rsync -az --delete \
  --exclude ".git" \
  --exclude ".github" \
  --exclude "node_modules" \
  --exclude "dist" \
  --exclude ".next" \
  -e "ssh -i ${SSH_KEY} -o StrictHostKeyChecking=accept-new" \
  ./ "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/current/"

ssh -i "${SSH_KEY}" -o StrictHostKeyChecking=accept-new "${VPS_USER}@${VPS_HOST}" "APP_STACK='${APP_STACK}' PKG_MANAGER='${PKG_MANAGER}' VPS_PATH='${VPS_PATH}' bash -s" <<'EOF'
set -euo pipefail
cd "${VPS_PATH}/current"

if [[ "${PKG_MANAGER}" == "pnpm" ]]; then
  pnpm install --frozen-lockfile
  pnpm build
else
  if [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install
  fi
  npm run build
fi

if [[ "${APP_STACK}" == "next" ]]; then
  sudo systemctl restart mixxea.service
  sudo systemctl status mixxea.service --no-pager --full | head -n 12
else
  sudo nginx -t
  sudo systemctl reload nginx
  echo "Vite SPA deployed to ${VPS_PATH}/current/dist (served by Nginx)"
fi
EOF

echo "Deploy complete."
