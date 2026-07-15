# Migrazione & deploy — runbook

Due obiettivi sul **nuovo server `167.86.73.223`**:

1. **Migrare `brennerogru.it`** (sito + database) dal **vecchio server `195.231.124.180`**, mantenendo la risposta su `brennerogru.it` e `www.brennerogru.it`.
2. **Deployare questa webapp** (BGLift 3D) e farla rispondere su `lift.bglift.com`.

> **Stato attuale: la produzione resta sul vecchio server.** Tutto qui sotto è
> *preparazione*. Il traffico si sposta solo al passo **Parte E (cutover DNS)**,
> da eseguire consapevolmente quando tutto è testato.

## Architettura di arrivo

```
                    Internet
                       │
        ┌──────────────┴───────────────┐
        │   167.86.73.223  (nginx :443) │
        ├───────────────────────────────┤
        │  brennerogru.it, www  → sito   │  (PHP-FPM o statico, da ispezione)
        │  lift.bglift.com      → :3001  │  → container Node (Docker)
        │                                │  → container Postgres (Docker)
        └───────────────────────────────┘
```

Un solo nginx sul host termina il TLS e instrada per dominio. La webapp gira in
Docker e ascolta **solo su `127.0.0.1:3001`**; il sito brennerogru gira sul host
(o in Docker, secondo l'ispezione).

## ⚠️ Sicurezza credenziali

Le password root dei server sono state condivise in chat: **ruotarle** a
migrazione conclusa e passare ad autenticazione a chiave SSH (`ssh-copy-id`),
disabilitando poi `PermitRootLogin`/`PasswordAuthentication`. Non commettere mai
`deploy/.env` (è già in `.gitignore`).

---

## Parte A — Ispezione del vecchio server (read-only)

Serve a sapere **con che stack** gira brennerogru.it prima di replicarlo.

```bash
scp deploy/inspect-old-server.sh root@195.231.124.180:/tmp/
ssh root@195.231.124.180 'bash /tmp/inspect-old-server.sh' | tee deploy/old-server-report.txt
```

Dal report annota: **web server** (nginx/apache), **PHP sì/no + versione**,
**motore DB** (MySQL/MariaDB vs Postgres), **nome database**, **docroot**,
**dimensioni** cartella web e dump, **certificati** esistenti, **cron**.
→ Con questi dati si finalizzano `nginx/brennerogru.it.conf` e i comandi sotto.

---

## Parte B — Provisioning del nuovo server

```bash
scp deploy/setup-new-server.sh root@167.86.73.223:/tmp/
ssh root@167.86.73.223 'bash /tmp/setup-new-server.sh'
```

Installa nginx, Docker + Compose, certbot, firewall (SSH/HTTP/HTTPS). Non tocca
DNS né certificati.

---

## Parte C — Migrare brennerogru.it (senza spostare il traffico)

**Stack reale accertato** (ricognizione del 15/07 su `75.119.141.75`, VPS Contabo
Ubuntu 24.04 CONDIVISO con altri siti):

| Elemento | Valore |
|----------|--------|
| App | Nuxt 3 SSR, dir `/var/www/html/Brennero-gru/` (~893 MB + node_modules) |
| Runtime | processo Node `.output/server/index.mjs` su **127.0.0.1:3000** (pm2, `ecosystem.config.cjs`, app name `BrenneroGru`) |
| DB | **MySQL `zend`** (solo **2.4 MB, 33 tabelle**) nel container Docker `mysql_prod` (`mysql:5.7`), utente `nuxt` |
| ORM | Prisma (`provider = "mysql"`) |
| nginx | reverse proxy `/ → 127.0.0.1:3000`, server_name `.it/.com` + www |
| TLS | cert certbot `brennerogru.it` (copre anche `.com` e i www) |

> ⚠️ **Server condiviso — migrare SOLO la fetta brennerogru.** Sullo stesso box
> girano anche `fiordaliso.denani.it` (Nuxt+MySQL `fiordaliso`, **stesso container
> `mysql_prod`**), `app.agrochem.it` (Next.js) e **InvenTree** (Docker+Postgres).
> Non toccare quei siti né dumpare l'intero MySQL: esportare **solo il DB `zend`**.

> ⚠️ **Falla di sicurezza da correggere nella migrazione:** sul vecchio server il
> MySQL Docker è pubblicato su `0.0.0.0:3306` e il `DATABASE_URL` usa l'IP pubblico
> (`mysql://nuxt:…@75.119.141.75:3306/zend`). Sul nuovo server bindare MySQL su
> **`127.0.0.1:3306`** e usare `@127.0.0.1` / `@localhost` nel `DATABASE_URL`.

### C.1 — File dell'app

`.output` di Nitro è auto-contenuto (include le sue dipendenze) → **non serve
ricompilare né copiare il `node_modules` di root**. Basta portare `.output`,
`public`, `.env`, `ecosystem.config.cjs`, `prisma/`.

```bash
ssh root@167.86.73.223 'mkdir -p /var/www/html/Brennero-gru'
# rsync diretto vecchio → nuovo (delta, ripetibile). Escludi build intermedi:
rsync -avz \
  --exclude node_modules --exclude .nuxt --exclude .git \
  root@75.119.141.75:/var/www/html/Brennero-gru/ \
  root@167.86.73.223:/var/www/html/Brennero-gru/
# Node 22 sul nuovo server (come il vecchio, nvm v22):
ssh root@167.86.73.223 'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash && . ~/.nvm/nvm.sh && nvm install 22'
```

### C.2 — Database (solo `zend`)

```bash
# MySQL sul NUOVO server, bindato su localhost (in docker o nativo). In docker:
ssh root@167.86.73.223 'docker run -d --name mysql_prod --restart unless-stopped \
  -e MYSQL_ROOT_PASSWORD=CAMBIAMI_root -e MYSQL_DATABASE=zend \
  -e MYSQL_USER=nuxt -e MYSQL_PASSWORD=Ciaociao1010 \
  -p 127.0.0.1:3306:3306 mysql:5.7'

# Dump del SOLO db zend dal vecchio (NON blocca il sito):
ssh root@75.119.141.75 \
  'docker exec -e MYSQL_PWD=Ciaociao1010 mysql_prod mysqldump -unuxt --single-transaction --routines zend' \
  | gzip > /tmp/zend.sql.gz

# Import sul nuovo:
gunzip -c /tmp/zend.sql.gz | \
  ssh root@167.86.73.223 'docker exec -i -e MYSQL_PWD=Ciaociao1010 mysql_prod mysql -unuxt zend'
```

### C.3 — Config applicativa

Il dominio non cambia → nessun search-replace. Va solo aggiornato l'accesso al DB
per puntare al MySQL locale (e chiudere l'esposizione pubblica):

```bash
# .env  ed  ecosystem.config.cjs (ha una copia di DATABASE_URL che ha priorità):
#   DATABASE_URL="mysql://nuxt:Ciaociao1010@127.0.0.1:3306/zend"
# Tenere invariato NUXT_SESSION_PASSWORD (stabilità sessioni).
```

### C.4 — Avvio con pm2

```bash
ssh root@167.86.73.223 '. ~/.nvm/nvm.sh && npm i -g pm2 && cd /var/www/html/Brennero-gru \
  && pm2 start ecosystem.config.cjs && pm2 save && pm2 startup systemd -u root --hp /root'
# verifica: curl -sI http://127.0.0.1:3000  → risposta dall'app Nuxt
```

### C.5 — vhost nginx + test PRIMA del DNS

```bash
scp deploy/nginx/brennerogru.it.conf root@167.86.73.223:/etc/nginx/sites-available/brennerogru
ssh root@167.86.73.223 'ln -sf /etc/nginx/sites-available/brennerogru /etc/nginx/sites-enabled/ && nginx -t && systemctl reload nginx'
```

Sulla tua macchina forza la risoluzione al nuovo IP via `/etc/hosts`, poi apri il
sito (in HTTP; il warning TLS è normale finché non emetti il cert al cutover):

```
167.86.73.223 brennerogru.it www.brennerogru.it
```

Poi rimuovi la riga da `/etc/hosts`.

---

## Parte D — Deploy della webapp (lift.bglift.com)

```bash
# 1) Porta il codice sul server (git clone o rsync della repo, SENZA node_modules/dist)
ssh root@167.86.73.223 'mkdir -p /opt/bglift'
rsync -avz --exclude node_modules --exclude dist --exclude .git \
  --exclude server/uploads ./ root@167.86.73.223:/opt/bglift/

# 2) Config di produzione
ssh root@167.86.73.223 'cd /opt/bglift/deploy && cp -n .env.production.example .env'
#    poi EDITA /opt/bglift/deploy/.env: password DB robusta, JWT_SECRET casuale.
#    Genera i segreti:  openssl rand -base64 36

# 3) Primo avvio (con seed per creare admin/tecnico + modelli)
ssh root@167.86.73.223 \
  'cd /opt/bglift/deploy && SEED_ON_START=true docker compose -f docker-compose.prod.yml --env-file .env up -d --build'

#    Dopo il primo avvio, rimetti SEED_ON_START=false nel .env.
#    Log:   docker compose -f docker-compose.prod.yml logs -f app
#    Salute: curl -s http://127.0.0.1:3001/api/health   → {"ok":true}
```

**Dati esistenti (opzionale).** Il DB di produzione parte vuoto + seed. Se vuoi
portare i progetti già creati in sviluppo, esporta/importa il volume Postgres:

```bash
# sulla macchina di sviluppo
docker exec bglift-db pg_dump -U bglift bglift | gzip > bglift-dev.sql.gz
scp bglift-dev.sql.gz root@167.86.73.223:/tmp/
# sul server (a stack su, con SEED_ON_START=false)
ssh root@167.86.73.223 'gunzip -c /tmp/bglift-dev.sql.gz | docker exec -i bglift-db psql -U bglift bglift'
```

### vhost nginx della webapp

```bash
scp deploy/nginx/lift.bglift.com.conf root@167.86.73.223:/etc/nginx/sites-available/lift.bglift.com
ssh root@167.86.73.223 'ln -sf /etc/nginx/sites-available/lift.bglift.com /etc/nginx/sites-enabled/ && nginx -t'
```

> Nota: la webapp mette il cookie di sessione con flag `Secure` in produzione →
> funziona solo via HTTPS (garantito da nginx dopo il certificato). Consigliato
> aggiungere `app.set('trust proxy', 1)` in `server/index.js` per il corretto
> riconoscimento di IP/protocollo dietro proxy (miglioria, non bloccante).

---

## Parte E — Cutover DNS + TLS (sposta il traffico)

Da fare quando le Parti C e D sono testate e verdi.

1. **Abbassa il TTL** dei record DNS a 300s **qualche ora/giorno prima**, dal
   pannello del registrar/DNS (non gestibile da qui).
2. **Sync finale** appena prima dello switch, per catturare le ultime modifiche:
   - `rsync` finale dei file di brennerogru (C.1)
   - dump+import finale del DB (C.2) — idealmente con breve finestra di "sola
     lettura"/manutenzione sul vecchio sito per non perdere scritture.
3. **Aggiorna i record DNS** → far puntare a `167.86.73.223`:
   - `brennerogru.it`       A → 167.86.73.223
   - `www.brennerogru.it`   A (o CNAME → brennerogru.it) → 167.86.73.223
   - `lift.bglift.com`      A → 167.86.73.223
4. **Attendi la propagazione** (`dig +short brennerogru.it`, `dig +short lift.bglift.com`).
5. **Emetti i certificati** (ora che il DNS punta al nuovo server):
   ```bash
   # includere -d brennerogru.com -d www.brennerogru.com SOLO se si spostano anche i .com
   ssh root@167.86.73.223 'certbot --nginx -d brennerogru.it -d www.brennerogru.it'
   ssh root@167.86.73.223 'certbot --nginx -d lift.bglift.com'
   ssh root@167.86.73.223 'systemctl reload nginx && certbot renew --dry-run'
   ```
6. **Verifica finale**: HTTPS valido su tutti e tre gli host, login webapp,
   upload/download certificati PDF, contenuti brennerogru.

---

## Rollback

Il vecchio server resta intatto per tutta la migrazione. Se qualcosa va storto
dopo il cutover: **ripristina i record DNS** al vecchio IP `195.231.124.180`
(entro il TTL basso impostato) — il sito torna a servire dall'originale mentre si
indaga. Nessun dato del vecchio server viene toccato dalla procedura.

## Checklist rapida

- [x] A · ispezione vecchio server (75.119.141.75) — stack Nuxt+MySQL accertato
- [x] B · nuovo server provvisto (nginx/docker/certbot/firewall/node22/pm2)
- [x] C · brennerogru copiato (file + DB `zend`) e testato via Host override — OK
- [x] D · webapp su, `/api/health` ok, testata via Host override — OK
- [x] Segreti robusti impostati, MySQL su 127.0.0.1, `SEED_ON_START=false`
- [ ] TTL DNS abbassato (registrar)
- [ ] E · sync finale → switch DNS → certbot → verifica HTTPS  ← **DA FARE**
- [ ] Password root ruotate, SSH a chiave, root login disabilitato

### Cutover — record DNS da cambiare (al registrar) → 167.86.73.223
```
brennerogru.it        A → 167.86.73.223
www.brennerogru.it    A → 167.86.73.223
brennerogru.com       A → 167.86.73.223
www.brennerogru.com   A → 167.86.73.223
lift.bglift.com       A → 167.86.73.223   (record nuovo)
```
Poi certbot sul nuovo server:
```
certbot --nginx -d brennerogru.it -d www.brennerogru.it -d brennerogru.com -d www.brennerogru.com
certbot --nginx -d lift.bglift.com
```
