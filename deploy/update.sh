#!/usr/bin/env bash
# Pulls the latest code from GitHub, rebuilds and restarts Healthify. Run on the server:
#
#   sudo bash /opt/healthify/deploy/update.sh
set -euo pipefail

APP_DIR=/opt/healthify
APP_USER=healthify
ENV_FILE=/etc/healthify/env

cd "$APP_DIR"
sudo -u "$APP_USER" git pull --ff-only

# The frontend bakes VITE_* values in at build time. Only those lines are exported here — the env
# file also holds values (like the MongoDB URI with '&') that a shell must never interpret.
VITE_VARS=$(grep -E '^VITE_[A-Z0-9_]+=' "$ENV_FILE" || true)

sudo -u "$APP_USER" env $VITE_VARS NODE_ENV=production npm run build

systemctl restart healthify
sleep 3
if curl -fsS http://127.0.0.1:5000/api/health >/dev/null; then
  echo "Healthify restarted and healthy."
else
  echo "Healthify did not come up — check: journalctl -u healthify -n 50"
  exit 1
fi
