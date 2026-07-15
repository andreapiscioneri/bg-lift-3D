#!/bin/sh
set -e

# Applica le migrazioni Prisma allo schema di produzione (idempotente).
echo "[entrypoint] prisma migrate deploy…"
npx prisma migrate deploy

# Seed opzionale: crea admin/tecnico e i modelli gru di default.
# Le operazioni del seed sono upsert → sicuro da rilanciare, ma per non
# ripristinare dati modificati lo eseguiamo solo se richiesto esplicitamente.
if [ "$SEED_ON_START" = "true" ]; then
  echo "[entrypoint] seeding database…"
  node prisma/seed.js || echo "[entrypoint] seed fallito (continuo comunque)"
fi

echo "[entrypoint] avvio applicazione: $*"
exec "$@"
