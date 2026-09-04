# PHASE 15F HANDOFF — D-Trips monorepo

> **Purpose** onboard Phase 15G (admin dashboard — the final chunk
> of Phase 15) in a fresh session. Phase 15 was the **largest and
> riskiest** phase of the rebuild: every form, every list, every
> detail page in the frontend had to be rewired from the stub
> layer to live API calls. Phase 15G completes the loop on the
> admin side — every button performs a real backend operation
> per §15 ("No fake statistics, no fake tables, no placeholder
> CRUD, no buttons that do nothing").
>
> **Repo** `/D-trips/` — Vite SPA in `frontend/`, NestJS API in
> `backend/`.
> **Spec** `/D-trips/docs/PROJECT_SPEC.md` (§-references resolve
> there).
> **Last commit** `bcbb6a8` — Phase 15F LocaleProvider.

---

## 1. TL;DR — what Phase 15 built

| # | Phase | Status | One-liner |
|---|---|---|---|
| 15A | Auth foundation | ✅ | Cookie-based refresh + newsletter + UserRole enum aligned with backend |
| 15B | Public reads | ✅ | Home / Tours / TourDetail / BuildTrip (Scene 1+2) / About / SiteContent wired to real APIs |
| — | About fixup | ✅ | Founder / gallery / pillars made admin-editable per §4/§15/§26 |
| 15C | Public submits | ✅ | Build-Trip Scene 4 + /contact form hit real `/api/trip-requests` + `/api/contact-messages` |
| 15D | Checkout | ✅ | `/api/bookings` (Idempotency-Key + §8 server price preview) + `/api/payments/intent` |
| — | §28 fixup | ✅ | Guest checkout per §28/§35 — `OptionalJwtGuard` + `guestEmail` ownership check + ThrottlerModule brute-force defense |
| 15E | Account | ✅ | `/api/users/me` (profile + password + notification prefs) + `/api/bookings` list |
| 15F | LocaleProvider | ✅ | Site-wide `<html lang dir>` from `/api/languages` + display currency from `/api/currencies`; RTL mirror in CSS; Privacy/Terms use the shared provider |

**Backend test/build status** `tsc -p tsconfig.build.json` → 0 errors · `oxlint src/` → 0 warnings · `vitest run` → 11/11 tests pass (auth + state machine).

**Frontend test/build status** `tsc -b --noEmit` → 0 errors · `vite build` → 106 modules, 321.54 KB JS gzip 90.84 KB.

---

## 2. Phase 15 commit log (most recent first)

```
bcbb6a8 feat: Phase 15F — LocaleProvider + site-wide locale/currency toggles
dc60c52 feat: Phase 15E — Account page (profile, bookings, password, prefs)
6e91570 fix(payments): allow guest checkout per §28 / §35
33b071e feat: Phase 15D — checkout (bookings + payment intent), §8-enforced
6e18241 feat(frontend): Phase 15C — wizard submit + contact form hit real APIs
531bb4f fix(about): make founder / gallery / pillars admin-editable per §4/§15/§26
03cd215 feat(frontend): Phase 15B — Public reads wired to real APIs
25c1f65 feat: Phase 15A — Auth foundation (cookie refresh + newsletter)
```

**HEAD** `bcbb6a89e09039dc17bc84d58c3dd894d180ba41`

---

## 3. End-to-end coverage so far

| Surface | Endpoint | Frontend consumer |
|---|---|---|
| Public auth | `POST /api/auth/{register,login,refresh,logout}` | `useAuthFlow` hook, AuthContext, Login/Signup pages |
| Public catalog | `GET /api/tours`, `/api/tours/:slug`, `/api/tours/:slug/availability`, `/api/tours/:slug/price` | Home, Tours, TourDetail, BookingWidget |
| Public reads | `/api/categories`, `/api/destinations`, `/api/trip-type-presets`, `/api/faqs`, `/api/languages`, `/api/currencies`, `/api/i18n/resolve` | Tours filters, BuildTrip Scene 1+2, LocaleProvider |
| Public writes | `/api/trip-requests`, `/api/contact-messages`, `/api/newsletter/subscribe` | BuildTripReview, Contact, NewsletterForm |
| Public price preview | `/api/tours/:slug/price?dateId=&travelers=` | Checkout (server-authoritative §8) |
| Public bookings | `POST /api/bookings` (Idempotency-Key + guest allowed §28) | Checkout |
| Public payments | `POST /api/payments/intent` (OptionalJwtGuard; accepts `guestEmail`) | Checkout |
| Authenticated me | `GET/PATCH /api/users/me`, `POST /api/users/me/password`, `PATCH /api/users/me/notification-preferences` | Account profile / security / notifications tabs |
| Authenticated bookings | `GET /api/bookings`, `GET /api/bookings/:id`, `POST /api/bookings/:id/cancel`, `POST /api/bookings/:id/claim` | Account My Tours tab |

**Remaining public-surface gaps**: FAQ list (`/api/faqs`) endpoint exists on backend but the public site doesn't render a FAQs page yet (the Home page has inline FAQ accordion). Not a 15G concern.

---

## 4. Phase 15G — Admin Dashboard

Per §15 the admin dashboard is "**every section observed in the source design as a fully working feature**" with "**every button must perform a real, backend-connected operation**". The source design (Stage 4) shows 7 top-level sections in `frontend/src/pages/Admin.tsx`. The backend already has admin controllers wired for each.

### 4.1 The 7 admin sections — endpoint inventory

| # | Admin section | Frontend `Admin.tsx` page key | Backend controllers + endpoints |
|---|---|---|---|
| 1 | **Dashboard & Analytics** | `'dashboard'` | `admin-dashboard.controller.ts` → `GET /api/admin/dashboard` (real Prisma aggregates — revenue chart, bookings-by-category, recent bookings, system monitoring) |
| 2 | **Tours & Trips** | `'tours'` | `admin-tours.controller.ts` → `GET/POST/PATCH/DELETE /api/admin/tours[/:id]`<br>`admin-tour-dates.controller.ts` → `POST/PATCH/DELETE /api/admin/tours/:tourId/dates`, `/api/admin/tour-dates/:id` |
| 3 | **Bookings & Orders** | `'bookings'` | `admin-bookings.controller.ts` → `GET /api/admin/bookings?status=&page=&pageSize=`, `PATCH /api/admin/bookings/:id` (state-machine transition) |
| 4 | **Users** | `'users'` | `admin-users.controller.ts` → `GET /api/admin/users?search=&page=&pageSize=`, `PATCH /api/admin/users/:id` (role change) |
| 5 | **Reviews & Testimonials** | `'reviews'` | `admin-reviews.controller.ts` → `GET /api/admin/reviews?status=PENDING`, `PATCH /api/admin/reviews/:id/approve\|reject` |
| 6 | **FAQs** | `'faqs'` | `admin-faqs.controller.ts` → full CRUD over `/api/admin/faqs[/:id]` |
| 7 | **Site Content & Settings** | `'settings'` | `admin-site-content.controller.ts` → `GET /api/admin/site-content/keys`, `PUT/DELETE /api/admin/site-content/:key/:locale`<br>+ Languages admin (`admin-languages.controller.ts`)<br>+ Currencies admin (`admin-currencies.controller.ts`)<br>+ Promo Codes admin (`admin-promo-codes.controller.ts`)<br>+ Audit Log viewer (`admin-audit-log.controller.ts`)<br>+ Contact Messages inbox (`admin-contact-messages.controller.ts`) |

**Current `Admin.tsx`** is 758 lines — every section renders mostly **mocked data** (per the Stage-4 commit comment). Phase 15G = replace every mock with a real API call.

### 4.2 Suggested commit granularity (per Phase 14 handoff)

> 15G = 1 commit per admin section (7 commits total). Each commit
> is small enough to review in one sitting and easy to bisect if
> a regression slips in.

```
15G.1 = Dashboard   (1 commit)
15G.2 = Tours       (1 commit)
15G.3 = Bookings   (1 commit)
15G.4 = Users       (1 commit)
15G.5 = Reviews     (1 commit)
15G.6 = FAQs        (1 commit)
15G.7 = Settings    (1 commit — touches 6 sub-controllers: site-content + languages + currencies + promo-codes + audit-log + contact-messages)
```

### 4.3 Auth wiring — already in place

- All `/api/admin/*` controllers use `@UseGuards(JwtAccessGuard, RolesGuard)` + `@Roles(Role.ADMIN)` (per the AuthModule's `RolesGuard` pattern).
- The frontend `AuthGuard` in `frontend/src/auth/AuthGuard.tsx` accepts `role="ADMIN"` (renamed from `"admin"` in 15A) and redirects non-admins to `/login`.
- `Admin.tsx` is wrapped in `<AuthGuard role="ADMIN">` in `App.tsx` — already gated.
- The api() client auto-attaches the JWT bearer header; on 401 it refreshes via `OptionalJwtGuard`-compatible logic (the public-booking 401 doesn't trigger refresh, but admin 401s do).

### 4.4 Per-section wiring checklist

For each of the 7 commits:

1. **Add the API helper** under `frontend/src/lib/api/admin-<section>.ts` (mirrors existing `lib/api/*.ts` shape):
   - `listXxx()` paginated list
   - `createXxx()` / `updateXxx()` / `deleteXxx()` mutations
   - Type definitions matching the backend's response shape

2. **Replace the mock data** in `Admin.tsx`'s section with a `useEffect` + `useState` pattern:
   - Loading / empty / error states explicit
   - Mutations invalidate the relevant list (refetch on success)
   - Destructive actions show a confirm() / inline confirm
   - State changes (e.g. booking status, review approve/reject) reflect in the list immediately

3. **Per-section endpoint map**:

| Section | Methods + endpoints |
|---|---|
| Dashboard | `GET /api/admin/dashboard` (single snapshot response — no params) |
| Tours | `GET /api/admin/tours?page=&pageSize=` · `POST /api/admin/tours` · `PATCH /api/admin/tours/:id` · `DELETE /api/admin/tours/:id` (soft-delete = unpublish) · `POST /api/admin/tours/:tourId/dates` · `PATCH /api/admin/tour-dates/:id` · `DELETE /api/admin/tour-dates/:id` |
| Bookings | `GET /api/admin/bookings?status=&page=&pageSize=` · `GET /api/admin/bookings/:id` · `PATCH /api/admin/bookings/:id` (state-machine PATCH) |
| Users | `GET /api/admin/users?search=&page=&pageSize=` · `PATCH /api/admin/users/:id` (role change only) |
| Reviews | `GET /api/admin/reviews?status=PENDING|PUBLISHED|REJECTED&page=&pageSize=` · `PATCH /api/admin/reviews/:id/approve` · `PATCH /api/admin/reviews/:id/reject` |
| FAQs | `GET /api/admin/faqs?page=&pageSize=` · `POST /api/admin/faqs` · `PATCH /api/admin/faqs/:id` · `DELETE /api/admin/faqs/:id` |
| Settings (composite) | Site Content: `GET /api/admin/site-content/keys`, `PUT /api/admin/site-content/:key/:locale`, `DELETE /api/admin/site-content/:key/:locale`<br>Languages: `GET/POST/PATCH /api/admin/languages[/:code]`, `PATCH /api/admin/languages/:code/default`<br>Currencies: `GET/POST/PATCH /api/admin/currencies[/:code]`<br>Promo Codes: `GET/POST/PATCH/DELETE /api/admin/promo-codes[/:id]`, `GET /api/admin/promo-codes/:id/redemptions`<br>Audit Log: `GET /api/admin/audit-log?action=&entityType=&entityId=&adminUserId=` (read-only)<br>Contact Messages: `GET /api/admin/contact-messages?status=&page=&pageSize=`, `PATCH /api/admin/contact-messages/:id` |

### 4.5 Things to reuse / not re-invent

- `api()` client (`frontend/src/lib/api/client.ts`) — already has the 401 → refresh → retry cycle + skipRefresh option for non-auth 401s.
- `ApiError` class — same error mapping as the public flows use; the `toMessage()` helper in `useAuthFlow` is a good model for admin error display.
- `formatPrice(amountMinor, currency)` + `useLocale().formatPrice` — admin views show prices for tours, bookings, etc.; both work identically.
- `BookingStatus` / `ReviewStatus` / `ContactMessageStatus` enum types — mirror the backend's Prisma enums; reuse the existing `mapBookingStatus` helper pattern from `Account.tsx` for status pills.
- `SiteContentRow` type — already used by `PrivacyPolicy` / `TermsConditions` / `About`; the admin editor for the `about.body`, `homepage.hero`, `privacy_policy.body`, `terms_conditions.body`, `footer.contact` keys reuses this shape.

---

## 5. Known follow-up — RTL on admin pages

The `[dir="rtl"]` block appended in 15F covers the public-site asymmetric layouts it was tested against. The **admin shell** (`Admin.tsx`) was not wired in 15F and has its own asymmetric patterns that will likely need RTL overrides once 15G lands:

- **Sidebar** is fixed-positioned to `left: 0` on the desktop (per `.sidebar` CSS at `frontend/src/styles/globals.css:2418`); it needs to flip to `right: 0` in RTL.
- **Mobile sidebar slide-in** transitions `transform: translateX(-100%)` (off-screen to the left) — needs to flip to `+100%` (off-screen to the right).
- **Sidebar toggle button** lives in the top-right of the content area when mobile — needs to swap sides in RTL.
- **Admin content margin** is `margin-left: 264px` on desktop (sidebar width) — needs to flip to `margin-right: 264px` in RTL.
- **Status pills / action buttons** in tables may be right-aligned in RTL where they were left-aligned in LTR — handle via logical properties where added.
- **Charts** (revenue chart, bookings-by-category) — Chart.js or Recharts renders need `rtl: true` config; layout flips happen automatically once the canvas parent has `dir="rtl"`.

These are visual-review items — they're not blockers for wiring data, but the first commit that touches the admin shell layout should run a quick RTL screenshot pass.

**Recommendation**: when 15G.1 (Dashboard) lands, do the sidebar + content margin flip first as a focused CSS pass. Subsequent section commits don't need to repeat that work — they inherit the shell's RTL support.

---

## 6. Architecture reference for 15G

### 6.1 Frontend state shape for admin views

Each section follows the same pattern (extracted from `Account.tsx`'s working example):

```ts
const [items, setItems] = useState<XxxView[] | null>(null);
const [error, setError] = useState<string | null>(null);
const [mutatingId, setMutatingId] = useState<string | null>(null);

useEffect(() => {
  let cancelled = false;
  listXxxs({ page: 1, pageSize: 50 })
    .then((res) => { if (!cancelled) setItems(res.items); })
    .catch((err: Error) => { if (!cancelled) setError(err.message); });
  return () => { cancelled = true; };
}, []);

async function mutate(id: string) {
  setMutatingId(id);
  try {
    await updateXxx(id, ...);
    // Refetch or locally patch the row.
  } catch (err) { /* show inline */ }
  finally { setMutatingId(null); }
}
```

### 6.2 Audit log integration

§15 says admin write actions MUST write an `AuditLog` row. **The backend already does this** — every admin controller (tours, bookings, users, reviews, faqs, site-content, currencies, languages, promo-codes) wraps mutations in `AuditLogService.record({...})`. The audit log viewer endpoint (`GET /api/admin/audit-log`) is already wired.

15G's job on the audit-log side is just to render the read-only table in the Settings tab. No backend work needed.

### 6.3 Pre-existing patterns to mirror

- `frontend/src/pages/Account.tsx` — Tabs pattern (active-tab state, per-tab components)
- `frontend/src/components/booking/OrderSummary.tsx` — Small presentational component with `className` slot for layout overrides
- `frontend/src/components/ui/StatusBadge.tsx` — Status pill (already used by Account's TripCard `status` prop)
- `frontend/src/hooks/useAuthFlow.ts` — `toMessage(err, fallback)` helper for ApiError → user-facing string

---

## 7. Suggested opening moves for 15G

1. **Start with Dashboard (15G.1)** — it's the smallest section, has a single endpoint, and gives an immediate confidence boost. Also kicks off the RTL sidebar flip.
2. **Then Tours (15G.2)** — biggest CRUD surface, validates the list/paginate/mutate pattern.
3. **Bookings / Users / Reviews / FAQs (15G.3-15G.6)** — smaller, similar shapes.
4. **Settings (15G.7) last** — touches 6 sub-controllers; biggest UI surface but each sub-controller is small.

After 15G lands, every button in `/admin` performs a real backend operation per §15. The v1 frontend↔backend wiring is then **complete end-to-end**; only Phase 16+ (CI/CD, deployment, email hardening, etc.) remain.

---

**End of Phase 15F handoff. Next file to open when starting Phase 15G**: `frontend/src/pages/Admin.tsx` (current 758 lines of mock data) → `frontend/src/lib/api/admin-*.ts` (one per section) → proceed through 7 commits.

**Recommendation**: in the new session, start with 15G.1 (Dashboard) only. The single `GET /api/admin/dashboard` endpoint + the RTL sidebar flip together set the foundation for the rest of the work.
