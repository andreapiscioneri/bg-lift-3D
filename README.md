# BGLift 3D

Web-tool 3D responsive per il calcolo della capacità di carico delle gru BGLift.
Pensato per operatori in cantiere: configura la gru e verifica in tempo reale se il sollevamento è sicuro.

Il configuratore è ora avvolto in una web-app multi-utente: login, progetti salvati per utente
e area amministrazione per gestire utenti e catalogo modelli gru.

## Stack

**Frontend**
- **Vite + React 18** — build & dev server
- **React Router** — routing (login, dashboard progetti, configuratore, admin)
- **React-Three-Fiber + Drei** — rendering 3D dichiarativo
- **Tailwind CSS** — UI responsive mobile-first
- **Zustand** — state management leggero
- **Comlink + Web Worker** — calcoli SWL fuori dal thread UI per mantenere 60 fps

**Backend**
- **Express** — API REST (`/api`)
- **Prisma + PostgreSQL** — ORM con migrazioni (crea/aggiorna lo schema del DB)
- **JWT in cookie httpOnly + bcrypt** — autenticazione; ruoli `USER` / `ADMIN`
- **Multer** — upload dei modelli 3D (.glb) e dei dati tecnici (.json)

## Avvio

Prerequisiti: Node 20+, Docker (per PostgreSQL).

```bash
yarn install
cp .env.example .env

yarn db:up        # avvia PostgreSQL (docker compose, porta 5433)
yarn db:migrate   # crea/aggiorna lo schema (prisma migrate dev)
yarn db:seed      # utente admin + modello BR0089

yarn dev          # frontend (5173) + API (3001) insieme
```

Credenziali seed: `admin@bglift.it` / `admin123` (da cambiare subito).

Il dev server Vite fa da proxy verso l'API (`/api`, `/uploads`), ed è esposto
sulla rete locale: comodo per testare su smartphone.

## Funzionalità

- **Autenticazione** — registrazione, login, sessione via cookie httpOnly.
- **Progetti per utente** — ogni progetto nasce da un tipo gru + modello e salva
  la configurazione del configuratore 3D; ognuno vede solo i propri (l'admin tutti).
- **Area admin** — gestione utenti (creazione, ruolo, attivazione, reset password)
  e catalogo modelli gru (upload .glb + dati tecnici .json con la struttura di
  `src/data/BR0089.json`).

## Struttura

```
prisma/              # Schema DB, migrazioni, seed
server/              # API Express
├── routes/          # auth, projects, models, admin users
├── auth.js          # JWT, middleware requireAuth/requireAdmin
└── uploads/         # GLB caricati dall'admin (gitignored)
src/
├── api/             # client fetch verso /api
├── auth/            # AuthContext (login/logout/me)
├── pages/           # Login, Dashboard, Configuratore, Admin
├── components/
│   ├── 3D/          # Scena Three.js (gru, stabilizzatori, suolo)
│   ├── UI/          # Pannelli, slider, indicatori
│   └── Layout/      # Shell con header/nav
├── hooks/           # useCraneCalc, useResponsive
├── workers/         # Web Worker per i calcoli SWL e reazioni stabilizzatori
├── data/            # BR0089.json (usato dal seed)
├── store/           # Stato globale Zustand
└── utils/           # Helper matematici, formattazione
```

## Note

- La cinematica della scena 3D (perni, ripartizione mesh, corse) è calibrata sul
  GLB dell'M250: un nuovo modello caricato dall'admin viene renderizzato solo se
  il suo GLB ha la stessa struttura di nodi; in caso contrario servirà una
  calibrazione dedicata in `src/components/3D/CraneScene.jsx`.
- In produzione (`NODE_ENV=production`) l'API serve anche la build statica di `dist/`.

## Sicurezza

I calcoli di capacità (Safe Working Load) e le reazioni sugli stabilizzatori sono critici per la sicurezza:
non utilizzare questo strumento in cantiere senza una validazione formale rispetto alle tabelle ufficiali del costruttore.
