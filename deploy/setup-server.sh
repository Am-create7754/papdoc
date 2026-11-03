#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu server (Google Cloud e2-micro / Oracle / any VPS) for Healthify.
#
#   sudo bash setup-server.sh <public-hostname> <email-for-https-certificate>
#
# Before running, copy the production env file to /etc/healthify/env (see deploy/make-env.js).
# Safe to re-run: every step checks or overwrites its own output.
set -euo pipefail

HOSTNAME_ARG="${1:?usage: setup-server.sh <public-hostname> <email>}"
EMAIL_ARG="${2:?usage: setup-server.sh <public-hostname> <email>}"
APP_DIR=/opt/healthify
APP_USER=healthify
REPO_URL=https://github.com/Am-create7754/papdoc.git
UPLOADS_DIR=/var/lib/healthify/uploads
ENV_FILE=/etc/healthify/env

[ "$(id -u)" -eq 0 ] || { echo "Run with sudo."; exit 1; }
[ -f "$ENV_FILE" ] || { echo "Missing $ENV_FILE — copy the production env file there first."; exit 1; }

echo "==> Swap (small free-tier VMs have ~1GB RAM; building the frontend needs more)"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> System packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl git nginx certbot python3-certbot-nginx build-essential iptables-persistent

echo "==> Node.js 22"
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node -v

echo "==> App user and folders"
id "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin "$APP_USER"
mkdir -p "$UPLOADS_DIR" /etc/healthify
chown -R "$APP_USER:$APP_USER" /var/lib/healthify
chown root:"$APP_USER" "$ENV_FILE"
chmod 640 "$ENV_FILE"

echo "==> Code"
if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO_URL" "$APP_DIR"
fi
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
git config --system --add safe.directory "$APP_DIR"

echo "==> Firewall (some images, e.g. Oracle's, block 80/443 in iptables by default)"
for port in 80 443; do
  iptables -C INPUT -p tcp --dport "$port" -j ACCEPT 2>/dev/null || iptables -I INPUT -p tcp --dport "$port" -j ACCEPT
done
netfilter-persistent save

echo "==> systemd service"
cat >/etc/systemd/system/healthify.service <<UNIT
[Unit]
Description=Healthify (API + website)
After=network-online.target
Wants=network-online.target

[Service]
User=$APP_USER
WorkingDirectory=$APP_DIR
EnvironmentFile=$ENV_FILE
ExecStart=/usr/bin/node backend/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable healthify

echo "==> nginx"
cat >/etc/nginx/sites-available/healthify <<NGINX
server {
    listen 80;
    server_name $HOSTNAME_ARG;

    # Up to 5 attachments of 5MB each per consultation.
    client_max_body_size 30m;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }
}
NGINX
ln -sf /etc/nginx/sites-available/healthify /etc/nginx/sites-enabled/healthify
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "==> Build and start"
bash "$APP_DIR/deploy/update.sh"

echo "==> HTTPS certificate (Let's Encrypt)"
certbot --nginx --non-interactive --agree-tos --redirect -m "$EMAIL_ARG" -d "$HOSTNAME_ARG"

echo
echo "Done. Healthify is live at https://$HOSTNAME_ARG"
