# STAGE 4 HANDOFF — D-Trips SPA migration

> **Purpose**: single document to onboard Stage 5 (state) in a fresh session.
> **Repo**: `/D-trips/frontend/` (Vite + React 18 + TypeScript + Tailwind CSS SPA).
> **Reference**: `/D-trips/Website/*.html` (14-page static prototype).
> **Architecture lock**: separate from backend per §3 + §34; backend lands later as NestJS project in `/D-trips/backend/`.

---

## 1. TL;DR — what's built and what works

| Stage | Status | Deliverable |
|---|---|---|
| 0.1 | ✅ | Vite + React 18 + TS + Tailwind scaffold; design tokens (TS + CSS vars + Tailwind); seed-image registry; stub-form registry; empty AuthContext; commercial-assets notice; @types/node. |
| 1 | ✅ | `:root` tokens + `@font-face` declarations in `globals.css`; Google Fonts preconnect in `index.html`; `<Reveal>`, `<Eyebrow>`, `<Perf>` micro-components; `<SiteHeader>` (basic), `<WhatsAppFloat>`; home page renders hero + perf + section preview. |
| 2 | ✅ | `<SiteHeader>` upgraded (scroll-overlay, mobile burger + full-screen overlay, body-scroll-lock, active links via `useLocation`); `<SiteFooter>` + `<NewsletterForm>`; `<PublicLayout>` (flex-column wrapper); footer-shell + footer CSS. |
| 3 | ✅ | Full component library across `ui/`, `trip/`, `booking/`, `build-trip/` folders — 17 components. `<PayOption>` is **visual-only** (no payment logic). |
| 4 | ✅ | All 14 page files + full router (`App.tsx`) + ~620 lines of page-specific CSS appended to `globals.css`. |
| **5** | **⏭ NEXT** | **Extract `useBuildTrip()` hook; build `useContactForm` / `useCheckoutForm`; wire auth flow against API client.** |

**Verification**: `npx tsc -b --noEmit` → zero errors; all 14 routes return HTTP 200 from dev server.

---

## 2. Route plan (LOCKED — do not change without updating this doc)

```
/                                  → Home              (overlay header)
/about                             → About            (overlay header)
/tours                             → Tours            (overlay header, has filter state)
/tours/:slug                       → TourDetail       (overlay header, dynamic route)
/build-trip                        → Scene 1          (overlay header)
/build-trip/destinations           → Scene 2          (overlay header)
/build-trip/details                → Scene 3          (overlay header)
/build-trip/review                 → Scene 4          (overlay header)
/checkout                           → Checkout        (overlay header, reads ?trip=&price=&travelers=&date=)
/contact                            → Contact         (overlay header)
/login                              → Login          (overlay header, auth-wrap split body)
/signup                             → Signup         (overlay header, auth-wrap split body)
/account                            → Account        (default header, 3 internal tabs)
/admin                              → Admin          (own chrome, no PublicLayout)
```

**Key decisions** (verified with user):
- `/tours/:slug` is **dynamic**. Currently one slug is hardcoded (`ras-mohammed-dahab`) in `src/pages/TourDetail.tsx:15-50` as `SLUG_TO_TRIP`. Add more slugs there or replace with API fetch in Stage 5+.
- Build-trip uses **exact sub-routes** per `§3` (not `/build-trip/1`, `/build-trip/2`).
- **Admin is single-page with sidebar tabs** (not split into `/admin/tours`, etc.) — matches original `Website/admin.html:1043-1068` `goTo()` pattern. Internal state: `currentAdminPage: 'dashboard' | 'tours' | 'bookings' | 'users' | 'reviews' | 'faqs' | 'settings'`. Stage 5 can add `?tab=tours` query-string deep-linking without breaking change.
- All public routes nest inside `<PublicLayout variant="overlay">`. `/admin` renders outside it.

**Router**: `src/App.tsx` — `react-router-dom@6.26+` `<Routes>` + `<Route>` with nested layout pattern.

---

## 3. Layout strategy

**`src/layouts/PublicLayout.tsx`** — wraps public routes:
```tsx
<div className="public-layout"> {/* flex column, min-height: 100vh */}
  <SiteHeader variant={variant} /> {/* variant="overlay" for all current routes */}
  <main className="public-main"><Outlet /></main>  {/* flex: 1 */}
  <SiteFooter />
  <WhatsAppFloat />
</div>
```
- `.footer-shell` uses `margin-top: auto` to push itself to the bottom on short pages.
- `variant="default"` (solid header) is the future-state for `/login` + `/signup` IF you decide they should not have a header overlay. Currently they use `variant="overlay"` like every other public route.

**Admin (`src/pages/Admin.tsx`)** — has its own chrome (`.shell` > `.sidebar` + `.main-col` > `.topbar` + `.content`). State machine: `useState<AdminPage>('dashboard')`. No `PublicLayout`.

---

## 4. Component contracts

> All components are **presentational**. Business logic (auth, payments, API) is NOT inside any component. State comes from parent or hooks (Stage 5).

### `src/components/site/` (chrome — Stages 1-2)

| Component | Props | Notes |
|---|---|---|
| `<Reveal>` | `{ children, as?: ElementType, className? }` | IntersectionObserver fade-in at `threshold: 0.15`; unobserves after first hit. Use as section/div wrapper. |
| `<Eyebrow>` | `{ children, className?, style? }` | Uppercase Poppins label with sun-yellow `::before` bar (26×2px). Works light + dark bg. |
| `<Perf>` | `{ variant?: 'default' \| 'sun', className? }` | 16px film-reel divider. `sun` paints dots yellow. |
| `<SiteHeader>` | `{ variant?: 'default' \| 'overlay' }` | Auto-toggles `.scrolled` at `scrollY > 40` (overlay only). Mobile burger + full-screen overlay. Body-scroll-lock when open. Auto-close on route change. Active-link via `useLocation`. |
| `<SiteFooter>` | none | Newsletter band + 4-col footer grid (brand / Company / Get in touch) + bottom row. Inset `border-radius: 10px` card via `.footer-shell`. |
| `<NewsletterForm>` | none | Calls `submitStub('newsletter', { email })`. Shows "Thanks" for 3s on submit. |
| `<WhatsAppFloat>` | none | Fixed bottom-right. Ping animation + hover tooltip. Hidden `<640px`. **NOT** rendered in `/admin`. |

### `src/components/ui/` (primitives)

| Component | Props | Notes |
|---|---|---|
| `<StatusBadge>` | `{ status: BadgeStatus, children }` | `BadgeStatus = 'upcoming' \| 'pending' \| 'completed' \| 'paid' \| 'refunded' \| 'draft' \| 'active' \| 'blocked' \| 'published'`. Class is the status name itself. |
| `<ChipOption>` | `{ selected, onClick, children, className? }` | Renders as `<button aria-pressed>` for a11y. Used by build-trip-details + admin settings. |
| `<StepperInput>` | `{ value, onChange, min=1, max=20, className? }` | Circular ± with script-font count. Used by build-trip-details + admin. |
| `<Stepper>` | `{ steps: Step[], currentStep, fillPercent?, className? }` | 4-step wizard progress. Steps below `currentStep` get `.done` (ink); current = `.active` (sun-yellow with box-shadow). |
| `<FaqAccordion>` | `{ items: FaqItem[], singleOpen=true, className? }` | `FaqItem = { q, a, defaultOpen? }`. Single-open by default (matches original). Uses ref + scrollHeight for maxHeight transition. |
| `<ConfirmPanel>` | `{ eyebrow, title, description, refLabel, actions, className?, children? }` | Sun-circle ✓ + script title + ref chip + actions. Visibility controlled by parent toggling `.show` class. `actions` accept either `{ href }` or `{ onClick }` and `variant: 'solid' \| 'outline'`. |
| `<TextField>` | `{ id, label, value, onChange, placeholder?, required?, error?, autoComplete?, type='text', className? }` | Bottom-border input. `type` accepts `'text' \| 'email' \| 'tel' \| 'password' \| 'date' \| 'number'`. |
| `<TextAreaField>` | same minus `type` | + `rows=4`. |

### `src/components/trip/`

| Component | Props | Notes |
|---|---|---|
| `<TripCard>` | `{ tag, imageSrc, imageAlt, location, date, groupType, price, priceSub?, href, status?, ctaLabel?, className? }` | Optional `status?: 'upcoming' \| 'pending' \| 'completed'` overlays `<StatusBadge>` top-right. Hover scales photo + ink CTA. |
| `<TripFilterTabs>` | `{ tabs: Tab[], activeKey, onChange, className? }` | Controlled — parent owns state. |

### `src/components/booking/`

| Component | Props | Notes |
|---|---|---|
| `<BookingWidget>` | `{ price, currency='LE', priceSub?, depositNote?, dates[], defaultDate?, defaultTravelers=2, minTravelers=1, maxTravelers=16, tripName, baseHref='/checkout', ctaLabel='Book This Trip', className? }` | **Self-contained state.** Builds the checkout URL itself: `?trip={encoded}&price={n}&travelers={n}&date={encoded}`. |
| `<PayOption>` | `{ value, name, selected, onSelect, icon, title, subtitle }` | ⚠️ **VISUAL-ONLY per §11.** No payment SDK, no Stripe/Tap/Fawry, no API calls. Real payment logic lives in NestJS `PaymentService`. |
| `<OrderSummary>` | `{ tripName, tripDate, tripImageSrc, tripImageAlt, lines: OrderLine[], totalLabel, totalValue, ctaLabel, ctaHref?, ctaOnClick?, consentText?, className? }` | Sticky aside. Renders CTA as `<a>` if `ctaHref` else `<button>`. |

### `src/components/build-trip/` (wizard)

| Component | Props | Notes |
|---|---|---|
| `<VibeCard>` | `{ imageSrc, imageAlt, tag, title, selected, onSelect?, dataVibe?, className? }` | Renders round sun-yellow check badge top-right when selected. Keyboard accessible (Enter/Space). |
| `<DestinationCard>` | `{ imageSrc, imageAlt, tag, title, selected, onSelect, dataDest?, className? }` | Square white-bg checkbox top-right, becomes sun-yellow + ink border on select. |
| `<BtHero>` | `{ eyebrow='Build My Trip', title, sceneLabel, className? }` | Centered wizard page header. |
| `<BtBack>` | `{ to, children }` | `<Link>` with arrow, animates left on hover. |
| `<BtContentHead>` | `{ title, subtitle?, underline=true, className? }` | Centered h2 + sun-yellow underline. `title` can include `<em>`. |
| `<BtAction>` | `{ children, hint?, className? }` | Bottom-of-section wrapper: divider + CTA + optional hint. |
| `<BtnContinue>` | `{ children, onClick?, href?, disabled?, type='button', ariaDisabled? }` | Black CTA pill with arrow. Renders `<Link>` if `href` else `<button>`. |
| `<BtRecap>` | `{ chips: BtRecapChip[], className? }` | Each chip = "Label: <b>value</b>". |

---

## 5. State infrastructure (Stage 5 will refactor)

### 5.1 Form submission — `submitStub()`

**Location**: `src/lib/stub-forms.ts`

**Single grep target for §12 backend wiring**. Every form in the app calls this function. When the NestJS API lands, replace the body with `fetch('/api/...')`.

**Signature**:
```ts
submitStub<K extends StubFormId>(
  formId: K,
  payload: unknown,
): Promise<{ ok: true; ref?: string }>
```

**Stub-form registry** (must stay in sync — add entries when creating new forms):
```ts
STUB_FORMS = {
  // Public site
  newsletter:        { route: 'POST /api/newsletter/subscribe',  spec: '§12.3' },
  contact:           { route: 'POST /api/contact',               spec: '§12.4' },
  buildTrip:         { route: 'POST /api/build-trip/request',    spec: '§12.5' },
  checkout:          { route: 'POST /api/bookings',              spec: '§12.6' },
  // Auth
  login:             { route: 'POST /api/auth/login',            spec: '§13.2' },
  signup:            { route: 'POST /api/auth/register',         spec: '§13.3' },
  logout:            { route: 'POST /api/auth/logout',           spec: '§13.4' },
  refresh:           { route: 'POST /api/auth/refresh',          spec: '§13.5' },
  // Account
  accountProfile:    { route: 'PATCH /api/account/profile',      spec: '§12.7' },
  accountPassword:   { route: 'POST /api/account/password',      spec: '§12.7' },
  // Admin
  adminTourCreate:   { route: 'POST /api/admin/tours',           spec: '§14.2' },
  adminTourUpdate:   { route: 'PATCH /api/admin/tours/:id',      spec: '§14.2' },
  adminBooking:      { route: 'POST /api/admin/bookings/:id',    spec: '§14.3' },
  adminSettings:     { route: 'PUT /api/admin/settings',         spec: '§14.4' },
  adminFaq:          { route: 'PUT /api/admin/faqs/:id',         spec: '§14.5' },
  adminReviewApprove:{ route: 'POST /api/admin/reviews/:id/approve', spec: '§14.6' },
}
```

**Current behavior** (stub): logs to console + 400ms delay + returns `{ ok: true, ref: 'DT-XXX' }`.

**Consumers** (must call via `submitStub` not raw `fetch`):
- `NewsletterForm.tsx` — `'newsletter'`
- `Contact.tsx` — `'contact'`
- `BuildTripReview.tsx` — `'buildTrip'`
- `Checkout.tsx` — `'checkout'`
- `Login.tsx`, `Signup.tsx` — `'login'`/`'signup'`

**TODO markers**: every consumer has `// TODO(STUB): wire to NestJS API per STUB_FORMS[formId]` comments. Stage 5 polishes these into proper loading/error states; §12 implementation replaces `submitStub` body.

### 5.2 Build-trip wizard state

**Location**: `src/lib/build-trip-state.ts`

**Public API** (currently inline in pages — Stage 5 extracts to `useBuildTrip()` hook):
```ts
export interface BuildTripState {
  vibe?: string;
  destinations?: string[];
  otherDestination?: string;
  dateFrom?: string;
  dateTo?: string;
  duration?: string;
  travelers?: number;
  budget?: string;
  notes?: string;
  name?: string;
  email?: string;
  phone?: string;
}

export function dtLoad(): BuildTripState
export function dtSave(patch: Partial<BuildTripState>): BuildTripState
export function dtClear(): void
```

**localStorage key**: `'dtripsBuildTrip'` — JSON-serialized.

**Used by**: `BuildTrip.tsx`, `BuildTripDestinations.tsx`, `BuildTripDetails.tsx`, `BuildTripReview.tsx`.

**Wizard flow** (currently works end-to-end):
1. Scene 1 saves `vibe` on Continue (currently fires via `dtSave({vibe})` on click; `continueTo()` requires `vibe` truthy).
2. Scene 2 reads `vibe` for recap, saves `destinations` + `otherDestination` on Continue.
3. Scene 3 reads `vibe` + `destinations` for recap, saves form fields on Continue.
4. Scene 4 reads all prior state, validates contact form, calls `submitStub('buildTrip')`, then `dtClear()` on success.

**Known bug from §2.5 — Stage 7 fix**: Scene 1 has only a soft comment about redirecting if `vibe` is missing (line ~46 in `BuildTripDestinations.tsx`). Needs a hard `navigate('/build-trip')` redirect when `dtLoad().vibe` is undefined. Same guard needed at start of Scenes 2, 3, 4. Stage 5's `useBuildTrip()` hook should own this guard.

### 5.3 Auth state (stub)

**Location**: `src/auth/AuthContext.tsx`

```ts
interface AuthState {
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

interface User { id, name, email, role: 'admin' | 'staff' | 'parent' }
```

**Current behavior** (stub):
- `useState< User | null >(STUB_USER)` — Sara Ahmed signed in by default, role `admin`.
- `signIn(email, password)` — sets user = STUB_USER (no-op).
- `signOut()` — sets user = null.

**Wrapped**: in `src/main.tsx` inside `<BrowserRouter>`.

**Consumers**: `Login.tsx` (calls `signIn` then navigates to `/account`), `Signup.tsx` (same), `Account.tsx` (reads `user` for display + `signOut` on sign-out button).

**Stage 13 wiring**: real JWT auth per §13. Hand-rolled in NestJS:
- Access + refresh tokens
- Argon2 (or bcrypt) password hashing server-side
- Tokens stored client-side (localStorage for v1, httpOnly cookie later)
- Refresh-token rotation
- NO NextAuth, NO Clerk, NO Passport

---

## 6. Design tokens (do not duplicate)

Tokens live in **3 places** that must stay in sync:

| Layer | File | Format |
|---|---|---|
| CSS variables | `src/styles/globals.css:8-29` | `:root { --paper: #FFFFFF; ... }` |
| Tailwind theme | `tailwind.config.ts` | `colors: { paper: '#FFFFFF', ... }`, `fontFamily: { script: [...] }` |
| TS constants | `src/lib/tokens/colors.ts`, `typography.ts`, `spacing.ts` | `export const colors = { paper: '#FFFFFF' }` |

**Public-design admin extras** (admin-only): `--good`, `--warn`, `--bad`, `--sidebar-w`.

**Hard-coded literals** (used by original HTMLs, kept as vars in CSS):
- `--whatsapp: #25D366`, `--whatsapp-hover: #1ebd5a` (WA float)
- `--success: #1f7a3f`, `--error: #c0392b` (form states)

---

## 7. Seed content (TEMPORARY per §2.4)

**Location**: `src/lib/seed-images.ts`

**17 unique Unsplash URLs** catalogued as a typed record. Every consumer imports from this file (never hard-codes). CI guard: `scripts/check-seed.ts` — run via `pnpm seed:check --prod` after §2.4 swap.

**Currently seeded**:
- 6 trip cards on Home + Tours
- 4 destinations on BuildTrip-destinations
- 6 vibes on BuildTrip
- 12 gallery items on About
- Auth visuals (login + signup)
- Contact + tour-detail + teaser photos

**Bunny Storage swap plan** (Stage 6 + §2.4):
- All URLs go through `SEED_IMAGES.<key>`.
- On §2.4 launch, change only this file's URLs to Bunny Storage CDN paths.
- One file edit, zero code changes elsewhere.

**Public/logo.svg** placeholder lives at `/frontend/public/brand/logo.svg` (orange circle + "D"). Real D-Trips logo extracted from base64 in `Website/index.html:606` — happens in Stage 6.

**Founder portrait** placeholder at `Website/about.html:556` (base64-encoded JPEG) — also base64 inlines across pages. Extract in Stage 6.

---

## 8. Decisions taken in Stages 1-4 (intentional shortcuts, all logged)

| Decision | Where | Why | When to revisit |
|---|---|---|---|
| **SVG placeholder logo** | `public/brand/logo.svg` | No real logo file available; visual parity won't include the actual D-Trips monogram | Stage 6 — extract base64 → PNG |
| **Placeholder founder photo** | `About.tsx:120` | We don't have access to the actual David Fakher photo; using `SEED_IMAGES.aboutPacific` as stand-in | Stage 6 — same swap |
| **Founder bracket SVGs** | `About.tsx:121-122` | Decorative sun-yellow corner brackets in original; kept structurally, positioned via CSS | Stage 8 polish if needed |
| **No mobile burger opened-by-default logic** | `SiteHeader.tsx` | `mobileOpen` resets to `false` on every route change via `useEffect([location.pathname])`. If a deep-link needs to open the menu, add `?openMenu=1` query handling | Stage 9 if needed |
| **Single slug in TourDetail** | `TourDetail.tsx:15-50` | `SLUG_TO_TRIP` has only `ras-mohammed-dahab`. Fallback object renders generic "Tour" | Stage 5 — wire to real tours API |
| **Tours page has 9 hardcoded entries** | `Tours.tsx:5-20` | Same data used on home (subset) and account (bookings) | Stage 5 — extract to `useTours()` hook backed by API |
| **Vibe data inline** | `BuildTrip.tsx:9-23` | 6 vibes hardcoded | Stage 5 — extract to API |
| **Destinations inline** | `BuildTripDestinations.tsx:11-26` | 8 destinations hardcoded | Stage 5 — extract to API |
| **Recap chip bug: Scene 1 skip guard** | `BuildTripDestinations.tsx:46` | Currently a soft comment; `vibe` is undefined but page still renders | **Stage 7** — add hard `navigate('/build-trip')` redirect when guard fails |
| **Admin is single-route** | `App.tsx` | Matches original `data-page` tab pattern. No URL change between admin sub-pages | Stage 5+ if needed — `?tab=tours` query string |
| **Login/Signup use `variant="overlay"`** | `App.tsx` | Same chrome as every other public route. Could change to `default` for visual distinction | Visual call — try both, see what reads better |
| **No CSP / security headers** | `index.html`, `vite.config.ts` | Dev-only setup. Add headers + nonce for inline scripts in Stage 8 | Stage 8 |
| **`.home-preview` placeholder section** | `Home.tsx:88-99` | A "Discover Our Trips" eyebrow + title waiting for Stage 4 trip-grid (now populated). This was the Stage 1 placeholder | Could be removed now that the trip grid is below |
| **`#` hrefs for social + legal** | `SiteFooter.tsx:48,55,74,75`, `Contact.tsx:62,86` | Instagram, Facebook, Privacy, T&C, social-row links all `#` placeholders | Stage 7 — wire to `/legal/privacy`, `/legal/terms`, real social URLs |
| **All form submission is stubbed** | every page | `submitStub()` logs + 400ms delay + fake ref | §12 / §13 — replace with real API |
| **No `/admin/login` / no admin auth guard** | `Admin.tsx` | Admin page renders regardless of session. The stub AuthContext makes `user` always truthy so `/admin` is reachable | Stage 5 — add role check, redirect to `/login?next=/admin` |
| **Hardcoded trip meta in tour-detail more-journeys fallback** | `TourDetail.tsx:231-235` | When `trip.moreJourneys` is empty, renders 3 hardcoded fallback cards | Stage 5 — derive from API |
| **`page.hero` padding-top: 56px** | `Checkout.tsx:104`, `Account.tsx:174` | Manually-tweaked top padding because the `<main>` content starts immediately under the header | Could extract to a CSS variable `--section-pad-top: 56px` in Stage 8 cleanup |

---

## 9. What's verified vs. pending

### ✅ Verified (Stage 4)
- TypeScript compiles cleanly (`npx tsc -b --noEmit` → 0 errors)
- All 14 routes return HTTP 200 from dev server
- Visual parity at desktop (1440×900) for Home hero + section preview — confirmed by user in Stage 2 review
- Build-trip wizard flows Scene 1 → Scene 2 → Scene 3 → Scene 4 → Confirm
- Checkout deep-link from `/tours/:slug` → `/checkout?trip=...&price=...&travelers=...&date=...`
- Stub form submission returns DT-XXX ref, triggers ConfirmPanel
- AuthContext stub: signIn auto-sets user, signOut clears
- Admin sidebar tabs toggle 7 panels via internal state

### ⏳ Pending (Stage 5+)
- **Stage 5 (next)**:
  - Extract `useBuildTrip()` hook with proper guards
  - Add hard redirect in Scenes 2-4 if prior state missing
  - Build `useContactForm` + `useCheckoutForm` hooks with loading/error states
  - Wire real auth flow against API client (currently stub-only)
- **Stage 6**: extract logo + founder from base64 → real PNG/JPG in `public/brand/`
- **Stage 7**: real legal routes (`/legal/privacy`, `/legal/terms`), real social URLs, hard redirect guards
- **Stage 8**: visual regression at 3 viewports, Lighthouse, a11y, `seed:check --prod` gate
- **Stage 9**: README refresh, MIGRATION_NOTES update, COMMERCIAL_ASSETS verification, final report

### ⏭ Known bugs (deferred)
1. `BuildTripDestinations.tsx:46` — soft comment about missing-vibe redirect; needs hard `navigate('/build-trip')` if `dtLoad().vibe` is undefined (Stage 7).
2. `Account.tsx:185` — save-toast toggle class is always-on (`${toast ? 'show' : ''}` evaluates `''` when null) — Stage 8 polish.
3. `Admin.tsx:265, 279, 318` — uses `event!` non-null assertion in inline arrow function. Stage 8 polish.
4. `/admin` has no auth guard — anyone can reach it in the stub. Stage 5.

---

## 10. How to verify locally

```bash
cd "/mnt/c/Users/HP/OneDrive/Desktop/D-trips/frontend"
pnpm install          # or npm/yarn — install was clean
pnpm dev              # http://localhost:5173
```

**Manual walkthrough checklist**:
- [ ] `/` — hero loads, trip grid shows 6 cards, teaser splits, reviews, FAQ
- [ ] `/tours` — filter tabs toggle; "International" shows 5 cards, "Local" shows 4
- [ ] `/tours/ras-mohammed-dahab` — booking widget on right; price updates with travelers
- [ ] Click "Book This Trip" → `/checkout?trip=Ras%20Mohammed%20×%20Dahab&price=13000&travelers=2&date=...`
- [ ] `/build-trip` — pick a vibe → Continue → Scene 2
- [ ] Scene 2 — pick destinations (and/or type in "Other") → Continue → Scene 3
- [ ] Scene 3 — fill form → Continue → Scene 4
- [ ] Scene 4 — fill name/email/phone → "Send My Trip Request" → ConfirmPanel with DT-XXX
- [ ] `/login` → click "Continue" → `/account` (auto-signed-in via stub)
- [ ] `/account` — click between My Profile / My Tours / Security tabs; sign out → `/login`
- [ ] `/admin` — click each sidebar item; dashboard charts + tables render

**Smoke test all routes** (in <60s):
```bash
for path in / /about /tours /tours/ras-mohammed-dahab /build-trip /build-trip/destinations /build-trip/details /build-trip/review /checkout /contact /login /signup /account /admin; do
  curl -s -o /dev/null -w "$path → %{http_code}\n" "http://localhost:5173$path"
done
```

---

## 11. Where Stage 5 starts

Pick up here in the next session:

```bash
cd "/mnt/c/Users/HP/OneDrive/Desktop/D-trips/frontend"
pnpm dev
```

**Suggested Stage 5 entry points** (any order works):

1. **`src/hooks/useBuildTrip.ts`** — extract the wizard state + add `navigate('/build-trip')` hard guard when `vibe` missing. Replace all 4 build-trip pages' direct `dtLoad`/`dtSave`/`dtClear` calls with the hook.
2. **`src/hooks/useAuthFlow.ts`** — `signIn`/`signUp`/`signOut` that calls `submitStub` then updates `useAuth()` context. Wire to `/login` and `/signup` pages.
3. **`src/hooks/useContactForm.ts` + `src/hooks/useCheckoutForm.ts`** — common pattern: `{ values, errors, isSubmitting, submit }`. Replaces the 60+ lines of `useState` per page.
4. **`<AuthGuard role="admin">`** — wraps `/admin` route, redirects to `/login?next=/admin` if user role !== admin.

Read the user-message history (this conversation) for context on locked decisions and Stage 0.1 corrections (Vite+React SPA, not Next.js; no NextAuth/Clerk — JWT hand-rolled per §13).
