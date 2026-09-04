# ─── D-Trips frontend — production Dockerfile (§22) ─────────────────
#
# Multi-stage build: Vite → nginx.
# The built SPA is served by nginx which also reverse-proxies /api
# to the NestJS backend container.
#
# Build:
#   docker build -t dtrips-frontend -f Dockerfile .
#
# Run (standalone — prefer docker-compose):
#   docker run -p 80:80 dtrips-frontend
# ────────────────────────────────────────────────────────────────────

# ─── Stage 1: build Vite SPA ───────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ─── Stage 2: serve with nginx ─────────────────────────────────────
FROM nginx:alpine AS runner

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# SPA + /api proxy config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Built static assets
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# §22 — Docker HEALTHCHECK (nginx serves the SPA on :80)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:80/ || exit 1
