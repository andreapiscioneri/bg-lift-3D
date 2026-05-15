# BGLift 3D

Web-tool 3D responsive per il calcolo della capacità di carico delle gru BGLift.
Pensato per operatori in cantiere: configura la gru e verifica in tempo reale se il sollevamento è sicuro.

## Stack

- **Vite + React 18** — build & dev server
- **React-Three-Fiber + Drei** — rendering 3D dichiarativo
- **Tailwind CSS** — UI responsive mobile-first
- **Zustand** — state management leggero
- **Comlink** — comunicazione semplificata con Web Worker
- **Web Worker** — calcoli matematici pesanti fuori dal thread UI per mantenere 60 fps

## Avvio

```bash
cd "bg lift 3D"
yarn install
yarn dev
```

Il dev server è esposto anche sulla rete locale (vedi output di Vite): comodo per testare su smartphone.

## Struttura

```
src/
├── components/
│   ├── 3D/          # Scena Three.js (gru, stabilizzatori, suolo)
│   └── UI/          # Pannelli, slider, indicatori
├── hooks/           # useCraneCalc, useResponsive
├── workers/         # Web Worker per i calcoli SWL e reazioni stabilizzatori
├── data/            # Modelli gru (BR0089.json) e tabelle di carico
├── store/           # Stato globale Zustand
└── utils/           # Helper matematici, formattazione
```

## Sicurezza

I calcoli di capacità (Safe Working Load) e le reazioni sugli stabilizzatori sono critici per la sicurezza:
non utilizzare questo strumento in cantiere senza una validazione formale rispetto alle tabelle ufficiali del costruttore.
