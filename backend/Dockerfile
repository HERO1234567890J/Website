# ─── D-Trips backend — production Dockerfile (§22) ──────────────────
#
# Multi-stage build: install → build → runtime.
# The runner image includes the prisma CLI (needed for `migrate deploy`
# at container start) and all production node_modules.
#
# Build:
#   docker build -t dtrips-backend -f Dockerfile .
#
# Run (standalone — prefer docker-compose in production):
#   docker run -p 3001:3001 --env-file .env dtrips-backend
# ────────────────────────────────────────────────────────────────────

# ─── Stage 1: install deps + compile TypeScript ─────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Layer cache — install deps first, copy source after.
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Copy source, generate Prisma client, build NestJS
COPY . .
RUN npx prisma generate
RUN npm run build

# ─── Stage 2: production runtime ────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# curl for Docker HEALTHCHECK
RUN apk add --no-cache curl

# Copy built artefacts + node_modules + Prisma schema/migrations
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

EXPOSE 3001

# §22 — Docker HEALTHCHECK (requires /api/health endpoint)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# §22 — run Prisma migrations then start the NestJS server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
