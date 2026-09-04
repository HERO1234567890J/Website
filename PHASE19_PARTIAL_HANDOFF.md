# Phase 19 — Partial Handoff (CI/CD + Docker Production)

**Date:** 2026-09-03
**Status:** IN PROGRESS — 3 of 12 todos completed, 9 remaining

---

## Completed files

### 1. `backend/Dockerfile` (multi-stage)
- **Stage 1 (builder):** `node:20-alpine` → `npm ci` → `prisma generate` → `npm run build`
- **Stage 2 (runner):** `node:20-alpine` + `curl` → copies `node_modules` + `dist` + `prisma/`
- **CMD:** `npx prisma migrate deploy && node dist/main` — auto-runs migrations on container start
- **HEALTHCHECK:** `curl -f http://localhost:3001/api/health` (30s interval, requires Todo #8)

### 2. `frontend/Dockerfile` (multi-stage)
- **Stage 1 (builder):** `node:20-alpine` → `npm ci` → `npm run build` (Vite SPA)
- **Stage 2 (runner):** `nginx:alpine` → copies `dist/` + `nginx.conf` → serves on `:80`
- **HEALTHCHECK:** `wget -q --spider http://localhost:80/` (no curl in nginx:alpine)

### 3. `frontend/nginx.conf`
- **Reverse proxy:** `proxy_pass http://backend:3001` (docker-compose service name)
- **SPA fallback:** `try_files $uri $uri/ /index.html`
- **Gzip:** text, css, js, json, xml, svg
- **Static caching:** 1 year with `immutable` (Vite hashed filenames)
- **Security headers:** nosniff, SAMEORIGIN, strict-origin-when-cross-origin
- **Dotfile blocking:** `location ~ /\.` → deny all

### 4. `backend/prisma/migrations/20260903000000_init/`
- **migration.sql:** 593 lines, generated via `prisma migrate diff --from-empty --to-schema-datamodel`
- **migration_lock.toml:** `provider = "postgresql"`
- This is the baseline migration for the entire schema

---

## Recorded notes / limitations

### Health endpoint (pending — Todo #8)
- No `/api/health` endpoint exists yet in the backend
- Both Dockerfiles reference it in their HEALTHCHECK
- Must be added before production deployment

### Migration auto-run in CMD (single-instance only)
- `CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]` runs migrations on every container start
- **Acceptable for v1:** single Contabo VPS, one instance (§22)
- **Not suitable for multi-instance scaling:** if two containers start simultaneously, both will attempt `migrate deploy` concurrently — Prisma handles this gracefully (advisory lock), but best practice for scaled deployments is to run migrations as a separate CI/CD step before containers start
- **Action if scaling needed later:** move `prisma migrate deploy` to a separate init container or CI/CD job, remove from CMD

---

## Remaining Todo list

| # | Task | Status |
|---|------|--------|
| 1 | Baseline Prisma migration | ✅ Done |
| 2 | `backend/Dockerfile` | ✅ Done |
| 3 | `frontend/Dockerfile` + `nginx.conf` | ✅ Done |
| 4 | `docker-compose.yml` + root `.env.example` | ⏳ Next |
| 5 | Production nginx reverse-proxy (HTTPS/Let's Encrypt) | ⏳ Pending |
| 6 | `.dockerignore` files (backend + frontend) | ⏳ Pending |
| 7 | `backup.sh` + `restore.sh` with retention | ⏳ Pending |
| 8 | Health check endpoint (`/api/health`) | ⏳ Pending |
| 9 | GitHub Actions `ci.yml` (lint, typecheck, test, build on PR) | ⏳ Pending |
| 10 | GitHub Actions `deploy.yml` (main: build + SSH deploy + migrate) | ⏳ Pending |
| 11 | `deployment/README.md` with rollback path | ⏳ Pending |
| 12 | Verify: tsc, oxlint, build; commit Phase 19 | ⏳ Pending |

---

## Git log (current HEAD)

```
370ca82 fix(bookings): handle PG serialization conflict as 409 + validate bookingId + fix guest guard
a37796c feat: Phase 17 — Sentry error monitoring + Google Analytics (§30 / §31)
646e90e feat: Phase 16 — security hardening (§18)
80de7d8 feat: Phase 15G.7 — admin Settings wired to /api/admin/*, RTL shell mirror
a045d6b feat: Phase 15G.6 — admin FAQs wired to /api/admin/faqs
fa368f5 feat: Phase 15G.5 — admin Reviews wired to /api/admin/reviews
7d112ad docs(15G.4): split FU-10 — mark block/unblock done, leave count+spend+csv
bf98460 feat: Block / Unblock user with refresh-token revocation (§15 / §18)
fa164cd docs(15G.4): add FU-10 — block-status + bookings count/spend + CSV export
c2e17bd feat: Phase 15G.4 — admin Users wired to /api/admin/users
```
