#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# Provisioning di base del NUOVO server (167.86.73.223), Ubuntu/Debian.
# Installa: nginx, Docker+Compose, certbot, firewall. Idempotente.
# Eseguire COME ROOT sul nuovo server:
#     scp deploy/setup-new-server.sh root@167.86.73.223:/tmp/
#     ssh root@167.86.73.223 'bash /tmp/setup-new-server.sh'
#
# NON tocca DNS né emette certificati (quello va fatto dopo il cutover DNS,
# vedi MIGRATION.md). NON tocca il vecchio server.
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

echo "== aggiornamento indice pacchetti =="
apt-get update -y

echo "== nginx, certbot, utilità =="
apt-get install -y nginx certbot python3-certbot-nginx rsync curl ca-certificates gnupg ufw

echo "== Docker Engine + Compose plugin =="
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc || \
  curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  . /etc/os-release
  DIST_ID=${ID}; CODENAME=${VERSION_CODENAME}
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/${DIST_ID} ${CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
systemctl enable --now docker

echo "== webroot per le challenge ACME =="
mkdir -p /var/www/certbot

echo "== firewall (SSH + HTTP/HTTPS) =="
ufw allow OpenSSH || true
ufw allow 'Nginx Full' || true
ufw --force enable || true

echo "== versioni installate =="
nginx -v
docker --version
docker compose version
certbot --version

cat <<'NOTE'

── FATTO. Prossimi passi (vedi deploy/MIGRATION.md) ─────────────────
  • Parte C: migrare brennerogru.it (file + database) — ancora senza DNS
  • Parte D: deployare la webapp (docker compose) — ancora senza DNS
  • Test con /etc/hosts locale puntando gli host a 167.86.73.223
  • Solo alla fine: cutover DNS + certbot per emettere i certificati
─────────────────────────────────────────────────────────────────────
NOTE
