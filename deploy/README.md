# deploy/

Artefatti per portare il progetto sul server `167.86.73.223`. **Preparazione:
non tocca la produzione.** Procedura completa in **[MIGRATION.md](./MIGRATION.md)**.

| File | Scopo |
|------|-------|
| `MIGRATION.md` | Runbook passo-passo: migrazione brennerogru.it + deploy webapp + cutover DNS/TLS |
| `inspect-old-server.sh` | Ricognizione **read-only** del vecchio server (stack, DB, vhost) |
| `setup-new-server.sh` | Provisioning nuovo server: nginx, Docker, certbot, firewall |
| `Dockerfile` | Immagine di produzione della webapp (build frontend + server Node) |
| `docker-entrypoint.sh` | `prisma migrate deploy` + seed opzionale, poi avvio |
| `docker-compose.prod.yml` | App Node + Postgres, con volumi persistenti |
| `.env.production.example` | Template variabili di produzione (copiare in `.env`) |
| `nginx/lift.bglift.com.conf` | Reverse proxy TLS → webapp su `127.0.0.1:3001` |
| `nginx/brennerogru.it.conf` | Template vhost sito brennerogru (da adattare all'ispezione) |

## TL;DR webapp (una volta sul server)

```bash
cd /opt/bglift/deploy
cp -n .env.production.example .env      # poi edita: password DB + JWT_SECRET
SEED_ON_START=true docker compose -f docker-compose.prod.yml --env-file .env up -d --build
curl -s http://127.0.0.1:3001/api/health   # → {"ok":true}
```

Credenziali seed iniziali: `admin@bglift.it` / `admin123`, `tecnico@bglift.it` /
`tecnico123` — **cambiarle al primo accesso**.
