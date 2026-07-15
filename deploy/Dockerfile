# ─────────────────────────────────────────────────────────────────
# BGLift 3D — immagine di produzione
# Un solo processo Node serve: dist (frontend), /api, /uploads e la SPA.
# ─────────────────────────────────────────────────────────────────

# ---- Stage 1: build (frontend + prisma client) ----
FROM node:20-bookworm-slim AS build
WORKDIR /app

# Dipendenze complete (servono devDeps: vite, prisma CLI, ecc.).
# Si usa `npm install` e non `npm ci` perché il package-lock.json del repo è
# disallineato dal package.json (il team lavora con yarn). Per build 100%
# riproducibili, rigenerare il lock:  npm install --package-lock-only
COPY package.json ./
RUN npm install --no-audit --no-fund

# Sorgenti + build
COPY . .
RUN npx prisma generate \
 && npm run build          # produce ./dist

# ---- Stage 2: runtime ----
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Prisma su Debian ha bisogno di openssl
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# node_modules completi dal build (include la CLI prisma per "migrate deploy"
# offline e il query engine già generato). Immagine più grande ma robusta:
# ottimizzabile in seguito con un pruning mirato dei soli pacchetti server.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

COPY package.json ./
COPY prisma ./prisma
COPY server ./server
# il seed legge src/data/*.json
COPY src/data ./src/data

COPY deploy/docker-entrypoint.sh ./deploy/docker-entrypoint.sh
RUN chmod +x ./deploy/docker-entrypoint.sh

EXPOSE 3001
ENTRYPOINT ["./deploy/docker-entrypoint.sh"]
CMD ["node", "server/index.js"]
