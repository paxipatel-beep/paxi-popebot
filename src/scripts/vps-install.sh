#!/bin/bash
# Paperclip AI Installation Script for Hostinger VPS
# This script runs as root via Hostinger post-install API
# Logs: /post_install.log

set -euo pipefail
exec > >(tee -a /post_install.log) 2>&1

echo "=== Paperclip AI VPS Setup - $(date) ==="

# --- 1. System Update ---
echo "[1/7] Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

# --- 2. Install Node.js 20 ---
echo "[2/7] Installing Node.js 20..."
if ! command -v node &>/dev/null || [[ "$(node -v)" != v20* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "Node.js version: $(node -v)"

# --- 3. Install pnpm ---
echo "[3/7] Installing pnpm..."
npm install -g pnpm@latest
echo "pnpm version: $(pnpm -v)"

# --- 4. Install PostgreSQL ---
echo "[4/7] Installing PostgreSQL..."
apt-get install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql

# Create paperclip database and user
sudo -u postgres psql -c "CREATE USER paperclip WITH PASSWORD 'paperclip_secure_2024';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE paperclip OWNER paperclip;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE paperclip TO paperclip;" 2>/dev/null || true

# --- 5. Install Nginx ---
echo "[5/7] Installing Nginx reverse proxy..."
apt-get install -y nginx

cat > /etc/nginx/sites-available/paperclip <<'NGINX'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/paperclip /etc/nginx/sites-enabled/paperclip
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
systemctl enable nginx

# --- 6. Clone and Build Paperclip ---
echo "[6/7] Cloning and building Paperclip AI..."
PAPERCLIP_DIR="/opt/paperclip"

if [ -d "$PAPERCLIP_DIR" ]; then
  cd "$PAPERCLIP_DIR" && git pull
else
  git clone https://github.com/paperclipai/paperclip.git "$PAPERCLIP_DIR"
fi

cd "$PAPERCLIP_DIR"
pnpm install --frozen-lockfile || pnpm install
pnpm build

# --- 7. Create systemd service ---
echo "[7/7] Creating Paperclip systemd service..."
cat > /etc/systemd/system/paperclip.service <<'SERVICE'
[Unit]
Description=Paperclip AI Agent Orchestration Platform
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/paperclip
ExecStart=/usr/bin/env pnpm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3100
Environment=DATABASE_URL=postgresql://paperclip:paperclip_secure_2024@localhost:5432/paperclip

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable paperclip
systemctl start paperclip

# --- Done ---
echo ""
echo "=== Paperclip AI Installation Complete ==="
echo "  Service: systemctl status paperclip"
echo "  URL:     http://$(hostname -I | awk '{print $1}'):3100"
echo "  Nginx:   http://$(hostname -I | awk '{print $1}')"
echo "  Logs:    journalctl -u paperclip -f"
echo "=== $(date) ==="
