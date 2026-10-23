# syntax=docker/dockerfile:1.7
# Next.js (output: "standalone") optimizado para Railway.

ARG NODE_VERSION=20
# Mantener igual a la versión de prisma en package.json
ARG PRISMA_VERSION=6.16.0

# ── deps ──────────────────────────────────────────────
FROM node:${NODE_VERSION}-bookworm-slim AS deps
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ── build ─────────────────────────────────────────────
FROM deps AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Railway inyecta las variables de servicio como build args solo si se declaran;
# el build NO necesita DATABASE_URL real (no hay queries en build).
RUN npx prisma generate && npm run build

# ── runtime ───────────────────────────────────────────
FROM node:${NODE_VERSION}-bookworm-slim AS runner
ARG PRISMA_VERSION
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0

# CLI de Prisma para `prisma migrate deploy` (preDeployCommand de Railway)
RUN npm install -g prisma@${PRISMA_VERSION}

COPY --from=builder /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

USER node
EXPOSE 3000
# Railway define $PORT; Next standalone lo lee desde process.env.PORT
CMD ["node", "server.js"]
