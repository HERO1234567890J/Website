# PHASE 14 HANDOFF — D-Trips monore

> **Purpose** onboard Phase 15 (Frontend rebuild connecting every
> page to the real backend) in a fresh session. Phase 15 is the
> **largest and riskiest** phase — every form, every list, every
> detail page in the frontend has to be rewired from the stub
> layer to live API calls without breaking what already works.
> **Repo** `/D-trips/` — Vite SPA in `frontend/`, NestJS API in `backend/`.
> **Spec** `/D-trips/docs/PROJECT_SPEC.md` (§-references in this doc
> resolve there).
> **Last commit** `a24d42f` — see §5 below.

---

## 1. TL;DR — what's built so far

| # | Phase | Status | One-liner |
|---|---|---|---|
| 5 | Scaffold | ✅ | NestJS 12 + Prisma 6 + 17 feature module folders, raw schema for 20 models |
| 6 | Auth | ✅ | `/api/auth/{register,login,logout,refresh}` with hand-rolled JWT + refresh rotation |
| 7 | Tours / Categories / Availability | ✅ | Public list/detail/availability + admin CRUD + audit |
| 8 | Build-Trip wizard | ✅ | TripTypePresets + `/api/trip-requests` submission |
| 9 | Bookings + state machine + consent + promo codes | ✅ | Capacity-safe booking (`SELECT … FOR UPDATE`), state machine, promo redemption |
| 10 | EasyCash `PaymentService` | ✅ | Interface + full stub marked `§11 PENDING: requires real EasyCash API docs` |
| 11 | Email (Resend) | ✅ | 11-event `EmailService` + Notification tracking + retry worker |
| 12 | Reviews + Contact inbox + Admin dashboard | ✅ | All 7 admin sections real, no fake stats |
| 13 | i18n + multi-currency + SiteContent | ✅ | en/ar languages, EGP base + USD display, DB-driven content |
| 14 | Legal pages → SiteContent | ✅ | `/privacy-policy` + `/terms-conditions` fetch from `/api/site-content` |

**Backend test/build status** `tsc -p tsconfig.build.json` → 0 errors · `oxlint src/` → 0 warnings · `vitest run` → 11/11 tests pass (auth + state machine).

**Frontend test/build status** `tsc -b --noEmit` → 0 errors · `vite build` → 92 modules, 308 KB JS gzip 86 KB.

---

## 2. Phase 15 — 7-chunk plan (frontend ↔ backend wiring)

The proposed order keeps each chunk small enough to review in one one
sitting. Any chunk can ship independently.

### 15A — Auth-gated API client foundation
- Replace the placeholder `api()` in `frontend/src/lib/api/client.ts` with token-aware variant:
  - read `accessToken` + `refreshToken` from `localStorage` per §13
  - inject `Authorization: Bearer <accessToken>` on every call
  - on 401: call `POST /api/auth/refresh`, persist new pair, retry the original request
  - on refresh-fail: clear tokens, redirect to `/login?next=<path>`
- Switch `useAuthFlow.login/register/logout` to call the real API
- Wire `AuthContext` to read/write tokens to localStorage
- Delete `useAuthFlow`'s call to `submitStub('login'|'signup'|'logout')`
- Result: working login / signup / logout / Account page bootstrap

### 15B — Public catalog (tours, categories, destinations, homepage)
- Replace `HOME_TRIPS` + `TOURS` constants in `Home.tsx` + `Tours.tsx` with `GET /api/tours`
- Wire category/destination filters to `?category=&destination=&minPrice=&maxPrice=&minDays=&maxDays=&sort=&page=&pageSize=`
- `TourDetail.tsx` fetches `/api/tours/:slug` + uses `/api/tours/:slug/availability` for the date picker
- `BuildTrip.tsx` fetches `/api/trip-type-presets` for the Scene 1 grid
- Categories + destinations dropdowns fetch from `/api/categories` + `/api/destinations`
- About page uses SiteContent `about.body` + `company.contact`
- Result: every public listing page reads live data

### 15C — Build-Trip wizard submit (real backend)
- `BuildTripReview.tsx` (line 60): swap `submitStub('buildTrip', {...})` for `api('/api/trip-requests', { body: {...} })`
- Same payload shape (tripTypePresetSlug, destinations, dates, travelerCount, etc.)
- Replace the synthetic DT-XXXX ref with `res.id` returned by the backend
- Wire Scene 1 redirect-guard from `useBuildTrip` to live `/api/trip-type-presets` validation (Phase 15B also covers this)
- Result: real wizard submissions land in the DB + fire `sendTripRequestReceived`

### 15D — Checkout (real booking + payment intent flow)
- `useCheckoutForm.ts` (line 100): swap `submitStub('checkout', ...)` for `api('/api/bookings', { body: {...} })`
  - requires the new `Idempotency-Key` header (UUID, 8–200 chars) — generate on the client
  - returns `ref` from `response.id` (`DT-XXXXXXXX` style from Phase 9's ref format)
- `Checkout.tsx` payment section: after the booking is created, call `api('/api/payments/intent', { body: { bookingId, returnUrl, cancelUrl }, headers: { 'Idempotency-Key': <uuid> } })` and redirect to ` `redirectUrl` (EasyCash hosted page — stub returns mock URL until EasyCash docs land)
- `useCheckoutForm` shape: keep `ref`, `redirectUrl`, add `Idempotency-Key` generation helper
- Result: booking flow creates real bookings + kicks off a real (mocked) payment intent

### 15E — Account page (real bookings list + profile)
- `Account.tsx` profile tab: PATCH `/api/account/profile` (or for v1 inline edit + PATCH on save)
- `Account.tsx` My Tours tab: GET `/api/bookings` (auth) → render real bookings
- Wire `useAuthFlow`'` `accountProfile` / `accountPassword` handlers (per `STUB_FORMS` §12.7)
- Result: Account page reflects real state (currently hard-coded mock data)

### 15F — LocaleProvider + global language/currency toggle
- New `<LocaleProvider>` context with `useLocale()` + `useCurrency()` hooks
- Reads initial locale from `Accept-Language` via `GET /api/i18n/resolve`
- Reads enabled languages from `GET /api/languages`
- Reads enabled currencies from `GET /api/currencies` (with rates)
- `useCurrency()` returns `{ formatPrice(egpMinor, target?) }` using `CurrencyConverter` server-side equivalent (a small frontend helper — server is still authoritative)
- Replace the local locale toggles added in Phase 14 (Privacy/Terms pages) with the shared provider
- Add `CurrencyToggle` in the header
- Add `<html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>` update via small effect (RTL is the spec's hard requirement for Arabic)
- All existing pages pass the current locale through to backend reads
- Result: site-wide language + currency toggle working from a single source

### 15G — Admin dashboard wiring (7 sections)
- `Admin.tsx` currently renders mock data per the Stage-4 commit comment — every section needs replacing:
  1. **Dashboard** — `GET /api/admin/dashboard` → real revenue / bookings / counts
  2. **Tours** — already CRUD'd in Phase 7, just wire the frontend to the existing endpoints
  3. **Bookings** — `GET /api/admin/bookings?status=&page=&pageSize=` + status-change PATCH
  4. **Users** — `GET /api/admin/users?search=` + role-change PATCH
  5. **Reviews** — `GET /api/admin/reviews?status=PENDING` + approve/reject PATCH
  6. **FAQs** — full CRUD over `/api/admin/faqs` + `/api/faqs`
  7. **Contact Messages** — `GET /api/admin/contact-messages` + status PATCH + reply field
  - Add: **Promo Codes admin** — CRUD + `/api/admin/promo-codes/:id/redemptions` view
  - Add: **Audit Log viewer** — `GET /api/admin/audit-log?action=&entityType=&entityId=&adminUserId=`
  - Add: **Languages / Currencies / SiteContent admin** — Phase 13 surfaces, Phase 15G wires the UI
- Result: every admin button performs a real backend operation (per §15)

### Suggested commit granularity
- 15A = 1 commit (auth foundation — biggest risk)
- 15B = 1 commit per page affected (`Home`, `Tours`, `TourDetail`, `BuildTrip` Scene1, `About`)
- 15C = 1 commit (wizard submit)
- 15D = 2 commits (bookings first, payment intent second — easier to bisect)
- 15E = 1 commit
- 15F = 1 commit
- 15G = 1 commit per admin section (7 commits)

---

## 3. API endpoints — full backend inventory (as of Phase14)

85 routes. 4 base mount points under the `/api` prefix. Base URL for the
dev frontend: `http://localhost:3001/api` (configurable via `VITE_API_URL`).

### Public — no auth required

| Method | Path | Expected body / query | Notes |
|---|---|---|---|
| GET | `/api/languages` | — | Enabled languages (en/ar default) |
| GET | `/api/currencies` | — | Enabled currencies with rates |
| GET | `/api/i18n/resolve?locale=&accept-language=` | query | Locale resolution helper |
| GET | `/api/site-content?key=&locale=` | query | Single key, default-locale fallback |
| GET | `/api/site-content/batch?keys=&locale=` | query | Multi-key batch read |
| GET | `/api/categories` | — | Active categories |
| GET | `/api/destinations` | — | Active destinations |
| GET | `/api/trip-type-presets` | — | Active presets for Scene1 |
| GET | `/api/faqs` | — | Active FAQs |
| GET | `/api/tours` | query `?search&category&destination&minPrice&maxPrice&minDays&maxDays&sort&page&pageSize` | `pageSize` capped at 100 |
| GET | `/api/tours/:slug` | — | Detail + future dates + images |
| GET | `/api/tours/:slug/availability` | — | Date list for the booking widget |
| GET | `/api/reviews/tour/:tourId` | — | PUBLISHED reviews only |
| POST | `/api/trip-requests` | `{ tripTypePrefixSlug, destinations[], otherDestination?, dateFrom?, dateTo?, duration?, travelers?, budget?, notes?, contactName, contactEmail, contactPhone }` | Idempotency NOT required on this route |
| POST | `/api/contact-messages` | `{ name, email, phone?, subject, body }` | Persists row + fires `sendContactMessageReceived` |
| POST | `/api/payments/webhook` | raw bytes (signature-verified) | EasyCash callback |
| POST | `/api/auth/register` | `{ email, password, name, phone? }` | Returns `{ accessToken, refreshToken, expiresIn, user }` |
| POST | `/api/auth/login` | `{ email, password }` | Returns same shape as register |
| POST | `/api/auth/refresh` | `{ refreshToken }` | Returns same shape + rotated refresh |
| POST | `/api/promo-codes/validate` | `{ code, travelerCount, subtotal, tourIds?, categoryIds? }` (auth required for per-customer limit) | Returns `{ promoCodeId, discountAmount }` or 400 with `reason` |

### Authenticated — `Authorization: Bearer <accessToken>` required

| Method | Path | Expected body | Notes |
|---|---|---|---|
| GET | `/api/reviews/me` | — | Caller's reviews, all statuses |
| POST | `/api/reviews` | `{ tourId, rating, title?, body }` | Eligibility enforced server-side |
| GET | `/api/bookings` | — | Caller's bookings (by userId or guestEmail) |
| GET | `/api/bookings/:id` | — | Caller's booking (owner check) |
| POST | `/api/bookings/:id/cancel` | `{ reason? }` | Self-cancel; only PENDING/PAYMENT_PENDING allowed |
| POST | `/api/bookings/:id/claim` | — | Link a guest-checkout booking to the authenticated user (§28) |
| GET | `/api/payments/:id` | — | Owner's payment view |
| POST | `/api/payments/intent` | `{ bookingId, returnUrl, cancelUrl, metadata? }` | Header `Idempotency-Key` required (UUID, 8–200 chars). Returns `{ paymentId, redirectUrl, expiresAt? }` |
| POST | `/api/auth/logout` | — | Revokes all refresh tokens for the user |

### Admin — auth + `Role.ADMIN` required

| Method | Path | Notes |
|---|---|---|
| GET / POST / DELETE / PATCH | `/api/admin/categories[/:id]` | Phase 7 |
| GET / POST / DELETE / PATCH | `/api/admin/destinations[/:id]` | Phase 7 |
| GET / POST / DELETE / PATCH | `/api/admin/tours[/:id]` | Phase 7 |
| POST / PATCH / DELETE | `/api/admin/tours/:tourId/dates`, `/api/admin/tour-dates/:id` | Phase 7 + bulk-cancel in Phase 11 |
| GET / POST / DELETE / PATCH | `/api/admin/trip-type-presets[/:id]` | Phase 8 |
| GET | `/api/admin/trip-requests?page=&pageSize=` | Phase 8 |
| GET / PATCH | `/api/admin/bookings[/:id]?status=&page=&pageSize=` | Phase 9 — `PATCH` moves status via the state machine |
| GET / POST / PATCH / DELETE | `/api/admin/promo-codes[/:id]` | Phase 9 |
| GET | `/api/admin/promo-codes/:id/redemptions?page=&pageSize=` | Phase 12 |
| GET | `/api/admin/payments?status=&page=&pageSize=` | Phase 10 |
| GET | `/api/admin/payments/:id` | Phase 10 |
| GET / PATCH | `/api/admin/reviews[/:id/approve\|/:id/reject]` | Phase 12 |
| GET / PATCH | `/api/admin/contact-messages[/:id]?status=&page=&pageSize=` | Phase 12 |
| GET / POST / PATCH / DELETE | `/api/admin/faqs[/:id]` | Phase 12 |
| GET / PATCH | `/api/admin/users[/:id]` | Phase 12 |
| GET | `/api/admin/audit-log?action=&entityType=&entityId=&adminUserId=` | Phase 12 (read-only) |
| GET | `/api/admin/dashboard` | Phase 12 — single-snapshot analytics |
| GET / POST / PATCH | `/api/admin/currencies[/:code]` | Phase 13 |
| GET / POST / PATCH | `/api/admin/languages[/:code]` + `PATCH /:code/default` | Phase 13 |
| GET / PUT / DELETE | `/api/admin/site-content/keys`, `/api/admin/site-content/:key/:locale` | Phase 13 |

---

## 4. `submitStub()` — current state + replacement plan

**`frontend/src/lib/stub-forms.ts`** — the stub. Logs each call to the console with `[STUB] <formId>` + a 400 ms timeout + a fake `DT-XXXXXX` ref.

**Callers (7 files):**

| File | Call | Backend replacement |
|---|---|---|
| `src/components/site/NewsletterForm.tsx:51` | `submitStub('newsletter', { email })` | **NOT in backend yet** — `POST /api/newsletter/subscribe` (§12.3) is in `STUB_FORMS` but no controller exists. Decide: build a `NewsletterModule` (Phase 15A stretch) or remove the form. |
| `src/hooks/useContactForm.ts:91` | `submitStub('contact', values)` | `api('/api/contact-messages', { body: dto })` → **Phase 15C** or earlier |
| `src/hooks/useAuthFlow.ts:60` | `submitStub(formId, payload)` for `login`/`signup`/`logout | `api('/api/auth/{login,register,logout}', { body: payload })` → **Phase 15A** |
| `src/hooks/useCheckoutForm.ts:101` | `submitStub('checkout', {...})` | `api('/api/bookings', { body: dto, headers: { 'Idempotency-Key': uuid } })` → **Phase 15D** |
| `src/pages/BuildTripReview.tsx:60` | `submitStub('buildTrip', { name, email, phone })` | `api('/api/trip-requests', { body: fullWizardPayload })` → **Phase 15C** |
| `src/auth/AuthContext.tsx` | type-only (defines `AuthState`) | no change |

`STUB_FORMS` entries that **don't** map to a real endpoint:
- `accountProfile` / `accountPassword` — endpoint shape unclear; build a thin `AccountsModule` in 15E or fold into `UsersModule` (`PATCH /api/users/me`, `POST /api/users/me/password`)
- `adminTourCreate` / `adminTourUpdate` / `adminBooking` / `adminSettings` / `adminFaq` / `adminReviewApprove` — superseded by the per-domain admin controllers (already wired in 15G)

Plan: **delete `submitStub()` + `STUB_FORMS` + `stub-forms.ts` after the last caller migrates** (likely 15E).

---

## 5. Git log + last commit

```
a24d42f  feat(frontend): Phase 14 — legal pages fetch from SiteContent (§27)
f518f8a  feat(backend): Phase 13 — i18n + multi-currency + SiteContent admin (§25 / §26 / §27)
d72c659  feat(backend): Phase 12 — Reviews + Contact inbox + AuditLog view + Admin dashboard
449ea4c  feat(backend): Phase 11 — full Resend EmailService (§12)
4cb2b74  feat(backend): Phase 10 — EasyCash PaymentService interface + full workflow (§11)
5c6db6d  feat(backend): Phase 9 — Bookings + state machine + consent + promo codes (§8 / §10 / §11 / §28 / §29)
ddf55e4  docs: add PHASE8_HANDOFF.md — state-of-build before Phase 9
ba683ca  feat(backend): Phase 8 — Build-Trip wizard backend (§7)
a06319d  feat(backend): Phase 7 — Tours, Categories, Availability (§7)
e3a2890  feat(backend): Phase 6 — Auth module (§13 hand-rolled JWT)
dda0986  feat(frontend): Stage 7 — legal routes + real social links
cb66967  docs: preserve original project spec at docs/PROJECT_SPEC.md
48ef7f8  feat(backend): scaffold NestJS + Prisma + module tree per §34 phase 4–5
85f68b3  chore: monorepo initial commit — frontend SPA (Stages 0.1–6 complete)
```

**HEAD** `a24d42f9ec71be421b5cc22e9405fd3824accad2` — `feat(frontend): Phase 14 — legal pages fetch from SiteContent (§27)`

Working tree: **clean**.

---

## 6. Risks / open questions for Phase 15 start

1. **Idempotency-Key generation** — `crypto.randomUUID()` is available in all evergreen browsers + Node 18+. Use that for `Idempotency-Key` headers (15D).
2. **Token storage** — spec says localStorage for v1 (Phase 13§18, httpOnly cookie later). Two-key pair: `accessToken` + `refreshToken` with explicit refresh-on-401 inside `api()` (15A).
3. **EasyCash real wire-up** — still pending the business's docs. `POST /api/payments/intent` returns a mock `redirectUrl` for now (Phase 10); the frontend should still redirect the customer there and accept whatever stubbed behaviour the gateway exposes (15D).
4. **Newsletter endpoint missing** — `STUB_FORMS.newsletter` (`POST /api/newsletter/subscribe`) has no backend. Either build a tiny `NewsletterModule` mirroring `ContactMessagesService.submit()` pattern, or remove the footer form from the frontend.
5. **Account profile / password endpoints missing** — same situation for `accountProfile` / `accountPassword`. Phase 15E should land a thin `AccountsModule` (`PATCH /api/users/me`, `POST /api/users/me/password`) or extend `UsersModule`.
6. **RTL on `<html>`** — Phase 15F must set `document.documentElement.lang = locale` + `dir = locale === 'ar' ? 'rtl' : 'ltr'` (the spec's hard requirement for Arabic).
7. **Vite dev proxy** — during dev, the frontend runs on `:3000` and the API on `:3001`. Either set `VITE_API_URL=http://localhost:3001/api` directly or proxy `/api` through Vite. The simpler path is the env var; add a note to `frontend/README.md` if it doesn't exist.

---

**End of Phase 14 handoff. Next file to open when starting Phase 15**: `frontend/src/lib/api/client.ts` (token-aware rewrite) → `frontend/src/hooks/useAuthFlow.ts` (real auth calls) → `frontend/src/auth/AuthContext.tsx` (localStorage sync) → proceed through 15B–15G.

**Recommendation**: in the new session, start with **15A** only. The auth foundation is a hard prerequisite for everything else, and shipping 15A in one commit makes rollback cheap. Move to 15B once the auth round-trip works in dev (login a user, verify the access token persists across page reloads, verify refresh-on-401).