# D-Trips — Frontend (SPA)

Vite + React 18 + TypeScript + Tailwind CSS. Migrated from the static
prototype in `/Website/`. Backend (NestJS) is a separate project —
see `MIGRATION_NOTES.md` for the full plan.

## Quickstart

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm build
pnpm preview
```

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Vite dev server |
| `pnpm build` | Type-check + production build to `dist/` |
| `pnpm preview` | Serve the built bundle |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript only |
| `pnpm format` | Prettier |
| `pnpm seed:check` | Flag temp unsplash refs (pass `--prod` to enforce) |

## Architecture

- **Frontend**: this repo. SPA, React Router v6.
- **Backend**: separate NestJS project (§34 step 5). API client will live at
  `src/lib/api-client.ts` (created in Stage 5 alongside the auth refresh logic).

## Commercial assets

See `COMMERCIAL_ASSETS.md` — brand fonts must be licensed and dropped
into `/fonts/` before launch. Until then, the fallback chain resolves
to Google Fonts' Yellowtail (free) and the system cursive stack.

## Stage 0.1 status (current)

- ✅ Repo skeleton + Vite + React 18 + TS + Tailwind v3.4 wired.
- ✅ Design tokens exported as TS + CSS variables + Tailwind theme.
- ✅ 17 unsplash URLs catalogued in `src/lib/seed-images.ts` as temporary seed.
- ✅ Stub form registry + AuthContext stub in place.
- ✅ CI guard (`scripts/check-seed.ts`) + commercial-assets notice.
- ⏭️ Stages 1–9 next — see `MIGRATION_NOTES.md`.
