# Migration Notes — D-Trips Phase 1 → SPA

**Reference:** `/Website/*.html` (the 14-page static prototype).
**Target:** `/frontend/` (this repo, Vite + React 18 + TypeScript + Tailwind SPA).

## Phase 1 inventory (16 files audited)

- 13 public pages + 1 partial CSS (`_dash_css.html`) + 1 partial body (`_dash_body.html`)
- 5 base64-embedded images (logo × N, founder photo, admin logo preview)
- 17 unique hotlinked unsplash images (~40 use sites)
- 1 WhatsApp floating-button pattern (every public page)

## Stage map (0–9)

- **Stage 0** — repo skeleton + design tokens + conventions ← _we are here (Stage 0.1 done)_
- **Stage 1** — globals + fonts wired
- **Stage 2** — extract chrome (header, footer, mobile nav, WA float, reveal, perf, eyebrow)
- **Stage 3** — component library (TripCard, FaqAccordion, Stepper, etc.)
- **Stage 4** — page-by-page migration (14 routes + admin)
- **Stage 5** — state: build-trip wizard, auth context
- **Stage 6** — asset pipeline: logo + founder extract, seed registry
- **Stage 7** — bug fixes (build-trip Scene 1 save, real legal routes, stub form handlers)
- **Stage 8** — QA: visual regression + Lighthouse + a11y
- **Stage 9** — deliverables

## Architecture lock

- **Frontend**: Vite + React 18 + TypeScript + Tailwind CSS (this repo).
  - SPA only — no SSR / SSG for v1.
  - React Router v6 for client routing.
  - Plain `<img>` for v1; revisit responsive images in §2.4 swap.
- **Backend**: Node.js + NestJS (separate project, see §34 step 5).
  - Real auth: JWT (access + refresh) + Argon2/bcrypt, hand-rolled (§13).
  - Real email: Resend (§12).
  - Real file storage: Bunny Storage (§2.4).
- **Auth for v1**: empty stub context (`src/auth/AuthContext.tsx`).
  Real implementation lands with backend.

## Known bugs folded in for Stage 7

1. `Website/build-trip.html` (Scene 1) doesn't save `vibe` to localStorage —
   next page redirects back. Fix in `useBuildTrip()` hook.
2. All `#` placeholder links (social, Privacy, T&C, contact submit).
3. All forms lack backend wiring — `submitStub()` from
   `src/lib/stub-forms.ts` is the single grep target for §12.

## See also

- `COMMERCIAL_ASSETS.md` — licensed-font dependencies.
- `src/lib/seed-images.ts` — temporary image registry (17 URLs).
- `src/lib/stub-forms.ts` — stub form registry (16 routes).
- `scripts/check-seed.ts` — CI guard: fails if seed URLs leak into prod.
