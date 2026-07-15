#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# Ricognizione READ-ONLY del vecchio server (195.231.124.180).
# Non modifica NULLA: raccoglie stack, siti, database e dimensioni per
# pianificare la migrazione di brennerogru.it. Eseguire COME ROOT sul
# vecchio server:
#     scp deploy/inspect-old-server.sh root@195.231.124.180:/tmp/
#     ssh root@195.231.124.180 'bash /tmp/inspect-old-server.sh' | tee old-server-report.txt
# ─────────────────────────────────────────────────────────────────
set -uo pipefail

line() { printf '\n===== %s =====\n' "$1"; }
have() { command -v "$1" >/dev/null 2>&1; }

line "SISTEMA"
uname -a
cat /etc/os-release 2>/dev/null | grep -E 'PRETTY_NAME|VERSION='
echo "uptime: $(uptime)"
echo "disco:"; df -h / /var 2>/dev/null

line "WEB SERVER ATTIVI"
for s in nginx apache2 httpd caddy; do
  if have "$s" || systemctl status "$s" >/dev/null 2>&1; then
    echo "-> $s presente"; systemctl is-active "$s" 2>/dev/null
    "$s" -v 2>&1 | head -1
  fi
done
echo "porte in ascolto:"; (ss -tlnp || netstat -tlnp) 2>/dev/null | grep -E ':80|:443|:3306|:5432|:8080' || true

line "VHOST / DOCROOT"
echo "--- nginx ---"; ls -1 /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null
grep -RhoE 'server_name[^;]+|root[^;]+' /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null | sort -u
echo "--- apache ---"; ls -1 /etc/apache2/sites-enabled/ 2>/dev/null
grep -RhoE 'ServerName[^$]*|ServerAlias[^$]*|DocumentRoot[^$]*' /etc/apache2/sites-enabled/ /etc/httpd/conf.d/ 2>/dev/null | sort -u
echo "contenuto /var/www:"; ls -la /var/www 2>/dev/null
echo "dimensioni web dir:"; du -sh /var/www/* 2>/dev/null

line "PHP"
if have php; then php -v | head -1; echo "socket php-fpm:"; ls -1 /run/php/ 2>/dev/null; fi

line "WORDPRESS (se presente)"
for wp in $(find /var/www -maxdepth 3 -name wp-config.php 2>/dev/null); do
  echo "-> $wp"
  grep -E "DB_NAME|DB_USER|DB_HOST|table_prefix" "$wp" 2>/dev/null | sed 's/DB_PASSWORD.*/DB_PASSWORD *** nascosta ***/'
done

line "MYSQL / MARIADB"
if have mysql; then
  mysql --version
  echo "database e dimensioni (MB):"
  mysql -N -e "SELECT table_schema, ROUND(SUM(data_length+index_length)/1024/1024,1) FROM information_schema.tables GROUP BY table_schema;" 2>/dev/null \
    || echo "  (serve autenticazione: rilanciare a mano con  mysql -u root -p )"
fi

line "POSTGRESQL"
if have psql; then
  psql --version
  sudo -u postgres psql -c "\l+" 2>/dev/null || echo "  (rilanciare come utente postgres)"
fi

line "CERTIFICATI TLS"
ls -1 /etc/letsencrypt/live/ 2>/dev/null || echo "  nessun certbot standard"
have certbot && certbot certificates 2>/dev/null | grep -E 'Certificate Name|Domains|Expiry'

line "CRON / TASK PIANIFICATI"
crontab -l 2>/dev/null; ls -1 /etc/cron.d/ 2>/dev/null

line "SERVIZI DOCKER (se usati)"
have docker && docker ps --format '  {{.Names}}  {{.Image}}  {{.Ports}}' 2>/dev/null

printf '\n===== FINE RICOGNIZIONE =====\n'
