# PHASE 8 HANDOFF — D-Trips monorepo

> **Purpose**: state of the build as Phase 8 closes. Single document to
> onboard Phase 9 (Bookings + state machine + consent + promo codes).
> **Repo**: `/D-trips/` — Vite SPA in `frontend/`, NestJS API in `backend/`.
> **Spec**: `/D-trips/docs/PROJECT_SPEC.md` (every §-reference in this doc
> resolves there).
> **Last commit**: `ba683ca` (see §5 below).

---

## 1. TL;DR — what's built and what's left

| Layer | Status | Where |
|---|---|---|
| Frontend SPA (Stages 0.1–7) | ✅ | `frontend/` — 16 routes, 14 pages, all hooks wired |
| Backend scaffold (Phase 5) | ✅ | `backend/` — NestJS + Prisma + 17 feature module folders |
| Auth (Phase 6) | ✅ | `register/login/logout/refresh` (§13 hand-rolled JWT) |
| Tours / Categories / Availability (Phase 7) | ✅ | full CRUD + public list/detail/availability + audit-log (§7/§15) |
| Build-Trip wizard backend (Phase 8) | ✅ | TripTypePresets + TripRequests submission (§7) |
| **Bookings + state machine + consent + promo codes** | **⏭ NEXT** | **Phase 9 — §8 / §10 / §29** |
| Payments (Phase 10) | pending | §11 — EasyCash behind `PaymentService` interface |
| Email (Phase 11) | partial stub | §12 — `EmailService.sendTripRequestReceived` works (logs); Resend swap pending |
| Reviews (Phase 12) | pending | §14 — completed-booking eligibility + admin moderation |

**Verified per phase**:
- Frontend: `tsc -b --noEmit` → 0 errors; `vite build` → 309 KB JS gzip 86 KB.
- Backend: `tsc -p tsconfig.build.json` → 0 errors; `oxlint src/` → 0 warnings; `vitest run` → 4/4 tests pass (`auth.service.spec.ts`).

---

## 2. Deferred items — by phase

The table below is the canonical deferral list. Every entry is referenced in the commit message that deferred it.

| Item | Origin phase | Lands in | Notes |
|---|---|---|---|
| TripRequest → Booking promotion at checkout | Phase 8 | **Phase 9** | `Booking.tripRequestId` is already nullable+unique in schema; the bookings service will flip the request to `CONFIRMED` on payment success |
| Admin status-change / reply actions on `/admin/trip-requests` | Phase 8 | **Phase 9** | POST/PATCH for status moves + reply side of §24 |
| Booking entity + state machine (`DRAFT → PENDING → PAYMENT_PENDING → PAID → CONFIRMED → CANCELLED → COMPLETED / FAILED / FAILED / EXPIRED`) | not started | **Phase 9** | §8 / §10 — single source of truth for booking lifecycle |
| T&C + Privacy consent capture (`Booking.consentAcceptedAt`) with timestamp | not started | **Phase 9** | §8 — explicit checkbox at checkout, stored server-side, never trusted client-side |
| Promo code validation + redemption ledger | not started | **Phase 9** | §29 — server-side discount calc, `PromoCodeRedemption` row per redemption |
| Guest-checkout claim flow (link `Booking.guestEmail` to a later `User.email` registration) | not started | **Phase 9** | §28 — `Booking.userId` already nullable + `guestEmail` always present |
| Concurrency-safe capacity decrement (`SELECT … FOR UPDATE`) inside Prisma interactive tx | not started | **Phase 9** | §9 — `TourDate.remainingCapacity` is the lock target |
| EasyCash `PaymentService` interface + every §11 edge case | Phase 10 stub | **Phase 10** | §11 — implementation behind interface; signature scheme pending real docs |
| Real Resend integration in `EmailService` body | Phase 8 stub | **Phase 11** | §12 — every per-event method lands; retry/idempotency machinery lands too |
| `sendTourCancelledBulk` (when admin deletes a TourDate with active bookings) | not started | **Phase 11** | §12 — called from `TourDatesService.remove()` once Phase 11 lands |
| `sendBookingCreated`, `sendBookingConfirmation`, `sendPaymentConfirmation`, etc. | not started | **Phase 11** | §12 — each method one event, retry isolated from payment state |
| Reviews CRUD + eligibility check (`COMPLETED` booking only) | not started | **Phase 12** | §14 — server-side enforced |
| Admin moderation gate (`Review.status` PENDING → PUBLISHED / REJECTED) | not started | **Phase 12** | §14 — admin side |
| §25 i18n via `SiteContent` for `Category.name` / `Destination.name` / `TripTypePreset.name` | Phase 7 + 8 (model fields exist as English defaults) | **Phase 13** | SiteContent schema in place; lookup layer is what lands |
| Currency display toggle (EGP ↔ USD) | not started | **Phase 13** | §26 — `Currency` table in place; conversion logic is what lands |
| TripTypePreset seed (Friends/Family/Honeymoon/Solo/Adventure/University) | not started | **Phase 13 fixture** | schema's there; seed/migration is what lands |
| Gallery image upload via Bunny Storage | not started | dedicated media phase | §7 — `Tour.coverImageId` / `TourImage.src` accept URLs today; CDN layer lands separately |
| Rate limiting on `/api/auth/login` | not started | security hardening | §18 + §32 — middleware in front of auth route |
| Password reset + forgot-password flow | not started | security hardening | §13 |
| Admin `/api/admin/auth` login endpoint | not started | Phase 12 | §15 — separate flow per spec |

---

## 3. Prisma schema — current state

**File**: `backend/prisma/schema.prisma` (469 lines)
**Provider**: PostgreSQL
**Status**: validated (`prisma validate`); client generated; **no migrations run yet** (no live DB).

### 3.1 Enums (8)

| Enum | Values | Spec ref |
|---|---|---|
| `Role` | `CUSTOMER`, `ADMIN` | §13 — narrow on purpose; SUPER_ADMIN/STAFF reserved |
| `BookingOrigin` | `TOUR`, `CUSTOM_TRIP` | §7 — discriminator for unified booking entity |
| `BookingStatus` | `DRAFT, PENDING, PAYMENT_PENDING, PAID, CONFIRMED, CANCELLED, COMPLETED, FAILED, EXPIRED` | §10 |
| `PaymentGateway` | `EASYCASH` | §11 |
| `PaymentStatus` | `PENDING, SUCCEEDED, FAILED, REFUNDED` | §11 |
| `ReviewStatus` | `PENDING, PUBLISHED, REJECTED` | §14 |
| `ContactMessageStatus` | `NEW, REPLIED, ARCHIVED` | §24 |
| `PromoCodeType` | `PERCENTAGE, FIXED_AMOUNT` | §29 |
| `PromoCodeScope` | `ALL, TOURS, CATEGORIES` | §29 |

(Audit action is a plain `String` field per §15 — too varied to enum.)

### 3.2 Models (20)

#### Auth & users (§13)
- **`User`** — id, email (unique), passwordHash, role (Role, default CUSTOMER), name, phone, emailVerifiedAt, createdAt, updatedAt. Relations: refreshTokens, bookings (UserBookings), reviews, promoRedemptions, auditLogs.
- **`RefreshToken`** — id, userId→User (Cascade), tokenHash (unique, SHA-256 of issued JWT), expiresAt, revokedAt, createdAt. Indexed on userId.

#### Tours (§7)
- **`Category`** — id, slug (unique), name, isActive, displayOrder. → Tour[].
- **`Destination`** — id, slug (unique), name, isActive. → Tour[].
- **`Tour`** — id, slug (unique), title, shortDescription (VARCHAR 280), description, categoryId→Category, destinationId→Destination? (nullable), startingPrice (Int — EGP piasters), currency (default "EGP"), durationDays, isPublished (default false), coverImageId?, images[], dates[], itinerary (Json?), included (String[]), excluded (String[]), meetingInfo?, cancellationPolicy?, bookings[], reviews[], createdAt, updatedAt. Indexed: categoryId, destinationId, isPublished, startingPrice, durationDays.
- **`TourImage`** — id, tourId→Tour (Cascade), src (Bunny ID or URL), alt?, displayOrder. Indexed: tourId.
- **`TourDate`** — id, tourId→Tour (Cascade), startDate, endDate, capacity (Int), remainingCapacity (Int — §9 lock target), bookings[], createdAt, updatedAt. Unique: (tourId, startDate). Indexed: startDate.

#### Build-Trip wizard (§7)
- **`TripTypePreset`** — id, slug (unique), name, imageId? (Bunny ID), displayOrder, isActive, requests[], createdAt, updatedAt.
- **`TripRequest`** — id, userId? (nullable for guests), tripTypePresetId→TripTypePreset, destinations (Json), otherDestination?, dateFrom?, dateTo?, duration?, travelers (default 2), budget?, notes?, contactName, contactEmail, contactPhone, status (BookingStatus, default PENDING), booking? (1-1 with Booking), createdAt, updatedAt. Indexed: userId.

#### Bookings + state machine (§8, §10)
- **`Booking`** — id, userId? (nullable per §28), user?→User (UserBookings), guestEmail, guestName, guestPhone?, origin (BookingOrigin), tourId?, tour?→Tour, tourDateId?, tourDate?→TourDate, tripRequestId? @unique, tripRequest?→TripRequest, travelerCount, travelerNames (String[]), specialRequests?, pickupLocation?, subtotal (Int — EGP piasters), discountAmount (default 0), total (Int — authoritative per §8), currency (default "EGP"), promoCodeId?, promoCode?→PromoCode, consentAcceptedAt? (DateTime — §8 explicit T&C+Privacy consent), status (BookingStatus, default PENDING), payments[], review?, createdAt, updatedAt. Indexed: userId, guestEmail, status.

#### Payments (§11)
- **`Payment`** — id, bookingId→Booking, gateway (PaymentGateway), gatewayTransactionId?, amount (Int — EGP piasters), currency (default "EGP"), status (PaymentStatus, default PENDING), gatewayResponse? (Json — last known gateway payload, no secrets), events[], createdAt, updatedAt. Unique: (gateway, gatewayTransactionId). Indexed: bookingId, status.
- **`PaymentEvent`** — id, paymentId→Payment (Cascade), gatewayEventId @unique (idempotency key), eventType (String), payload (Json), processedAt (default now). Indexed: paymentId.

#### Reviews (§14)
- **`Review`** — id, userId→User, tourId→Tour, bookingId @unique, booking→Booking, rating (Int, 1..5 enforced in DTO), title?, body, status (ReviewStatus, default PENDING), createdAt, publishedAt?. Indexed: (tourId, status).

#### FAQs (§15)
- **`FAQ`** — id, question, answer, displayOrder, isActive, category?, createdAt, updatedAt.

#### Contact messages (§24)
- **`ContactMessage`** — id, name, email, phone?, subject, body, status (ContactMessageStatus, default NEW), receivedAt (default now), repliedAt?, repliedBy?. Indexed: status, receivedAt.

#### Promo codes (§29)
- **`PromoCode`** — id, code (unique), type (PromoCodeType), value (Int — percent or piaster amount), minBookingAmount?, scope (PromoCodeScope, default ALL), scopeTourIds (String[]), scopeCategoryIds (String[]), startDate?, endDate?, totalUsageLimit?, perCustomerUsageLimit?, isActive, redeemedCount (default 0), redemptions[], bookings[], createdAt, updatedAt.
- **`PromoCodeRedemption`** — id, promoCodeId→PromoCode, bookingId @unique, userId?, user?→User, discountAmount (Int — EGP piasters), redeemedAt (default now). Indexed: promoCodeId, userId.

#### Audit log (§15)
- **`AuditLog`** — id, adminUserId→User, action (String), entityType (String), entityId (String), metadata (Json — never raw bodies / secrets), createdAt. Indexed: adminUserId, (entityType, entityId), createdAt.

#### Site content (§15, §26, §27) — DB-driven i18n
- **`SiteContent`** — id, key (String — e.g. `homepage.hero`, `privacy_policy.body`), locale (String — `en`/` `ar`), content (Json), updatedAt, updatedBy?. Unique: (key, locale).
- **`Currency`** — code (id — `EGP`/`USD`), symbol, exchangeRateToEgp (Float — refreshed by cron per §26), isEnabled, isBase (exactly one row true), displayOrder.
- **`Language`** — code (id — `en`/` `ar`), name, isEnabled, isDefault (exactly one row true), isRtl.

### 3.3 Relationship diagram (text)

```
User ──< RefreshToken
User ──< Booking       (nullable, §28 guest checkout)
User ──< Review
User ──< PromoCodeRedemption
User ──< AuditLog

Category ──< Tour
Destination ──< Tour
Tour ──< TourImage
Tour ──< TourDate
Tour ──< Booking
Tour ──< Review

TripTypePreset ──< TripRequest
TripRequest ─1:1─ Booking?  (nullable+unique)

Booking ──< Payment
Payment ──< PaymentEvent
Booking ──> PromoCode? (nullable)
Booking ──1:1─ Review? (nullable+unique)

AuditLog.adminUserId ──> User
```

---

## 4. API endpoints — built so far

All under `/api/...`. Authentication via `Authorization: Bearer <jwt>`
(§13). Admin routes additionally gated by `RolesGuard(Role.ADMIN)`.

### 4.1 Auth (§13) — module `auth/`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | @Public | Create CUSTOMER user, return access+refresh |
| POST | `/api/auth/login` | @Public | bcrypt verify, return access+refresh (constant-time path) |
| POST | `/api/auth/logout` | JwtAccessGuard | Revoke all refresh tokens for user |
| POST | `/api/auth/refresh` | @Public + JwtRefreshGuard | Rotate refresh token |

### 4.2 Users (§13) — module `users/`

Internal service used by auth. No public routes yet (admin profile management is a later phase).

### 4.3 Tours (§7) — module `tours/`

**Public:**
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/tours` | List with `?search & ?category & ?destination & ?minPrice/maxPrice & ?minDays/maxDays & ?sort & ?page & ?pageSize` (pageSize capped 100) |
| GET | `/api/tours/:slug` | Detail + category + destination + images + future dates |
| GET | `/api/tours/:slug/availability` | Date list only (for booking widget date picker) |

**Admin** (`/api/admin/tours` and `/api/admin/tour-dates/:id`):
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/admin/tours` | List all (incl. unpublished) |
| GET | `/api/admin/tours/:id` | Get by id |
| POST | `/api/admin/tours` | Create |
| PATCH | `/api/admin/tours/:id` | Update |
| DELETE | `/api/admin/tours/:id` | Soft delete (unpublish) |
| POST | `/api/admin/tours/:tourId/dates` | Add TourDate |
| PATCH | `/api/admin/tour-dates/:id` | Update TourDate (preserves booked headcount) |
| DELETE | `/api/admin/tour-dates/:id` | Remove (refuses if active bookings) |

### 4.4 Categories (§7) — module `categories/`

**Public:**
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/categories` | List active |

**Admin:**
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/admin/categories` | List all |
| POST | `/api/admin/categories` | Create |
| PATCH | `/api/admin/categories/:id` | Update |
| DELETE | `/api/admin/categories/:id` | Soft delete |

### 4.5 Destinations (§7) — module `destinations/`

Same 5-endpoint shape as Categories, under `/api/destinations` and `/api/admin/destinations`.

### 4.6 Build-Trip (§7) — module `build-trip/`

**Public:**
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/trip-type-presets` | Active presets (Scene 1) |
| POST | `/api/trip-requests` | Submit Scene-4 wizard payload |

**Admin:**
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/admin/trip-type-presets` | List all |
| POST | `/api/admin/trip-type-presets` | Create |
| PATCH | `/api/admin/trip-type-presets/:id` | Update |
| DELETE | `/api/admin/trip-type-presets/:id` | Soft delete |
| GET | `/api/admin/trip-requests` | Paginated inbox (page/pageSize) |

### 4.7 Cross-cutting modules (no routes yet)

- `prisma/` — `@Global()` PrismaService wrapper
- `audit-log/` — `@Global()` AuditLogService (write-only, called by every admin mutation)
- `auth/` — JwtAccessGuard + JwtRefreshGuard + RolesGuard, `@Global()` exported
- `email/` — `@Global()` EmailService stub (`sendTripRequestReceived` logs; Resend swap in Phase 11)
- `i18n/`, `faqs/`, `reviews/`, `contact-messages/`, `promo-codes/`, `payments/`, `bookings/`, `site-content/`, `admin/` — module stubs from the scaffold, awaiting implementation

---

## 5. Git log

```
ba683ca  feat(backend): Phase 8 — Build-Trip wizard backend (§7)
a06319d  feat(backend): Phase 7 — Tours, Categories, Availability (§7)
e3a2890  feat(backend): Phase 6 — Auth module (§13 hand-rolled JWT)
dda0986  feat(frontend): Stage 7 — legal routes + real social links
cb66967  docs: preserve original project spec at docs/PROJECT_SPEC.md
48ef7f8  feat(backend): scaffold NestJS + Prisma + module tree per §34 phase 4–5
85f68b3  chore: monorepo initial commit — frontend SPA (Stages 0.1–6 complete)
```

**HEAD**: `ba683ca7d338da5b5ea4807d24dc0835c5a3bf99` — `feat(backend): Phase 8 — Build-Trip wizard backend (§7)`

---

## 6. Phase 9 — entry point

Per the §34 phases list, Phase 9 covers "**users and bookings (including the unified booking state machine, promo code validation per §29, and stored T&C/Privacy consent per §8)**."

### 6.1 Concrete deliverables for Phase 9

In dependency order:

1. **Bookings module** — the heart of this phase.
   - `POST /api/bookings` — create booking from either a `tourId + tourDateId` (TOUR origin) or a `tripRequestId` (CUSTOM_TRIP origin). Required body: travelerCount, travelerNames, specialRequests?, pickupLocation?, consentAcceptedAt (must be set, §8), promoCode? (string).
   - `POST /api/bookings/:id/cancel` — customer self-cancel.
   - `POST /api/bookings/:id/claim` — guest-checkout claim after registration (§28): re-fetches the booking by `(guestEmail, id)`, sets `userId` if a matching user exists or the supplied one is created.
   - `GET /api/bookings/:id` — get one (must be owner or admin).
   - `GET /api/bookings` — list mine (auth required; returns bookings where `userId == me`).
   - `GET /api/admin/bookings` — paginated list + filters (status, origin, date range).
   - `PATCH /api/admin/bookings/:id` — admin status transitions (with audit log).

2. **State machine** — `BookingsService.transition(id, fromStatus, toStatus)` enforces valid transitions only (per §10):
   - `DRAFT → PENDING`
   - `PENDING → PAYMENT_PENDING | CANCELLED | FAILED | EXPIRED`
   - `PAYMENT_PENDING → PAID | CANCELLED | FAILED | EXPIRED`
   - `PAID → CONFIRMED | REFUNDED` (refund lives in Phase 10 actually — Phase 9 owns up to PAID → CONFIRMED on payment webhook verification)
   - `CONFIRMED → COMPLETED | CANCELLED`
   - PlusC: email/notification failures do NOT regress `PAID` or `CONFIRMED` (§10).

3. **Capacity-safe booking** — wrap booking creation in a Prisma `$transaction([…])` with `SELECT … FOR UPDATE` on the relevant `TourDate` row when `origin == TOUR`. Decrement `remainingCapacity`. Throw on insufficient capacity.

4. **Promo code validation** — `PromoCodesService.validate(code, userId, totalAmount, tourIds?, categoryIds?)` returning `{ promoCodeId, discountAmount }` or throwing `ConflictException`. Persist a `PromoCodeRedemption` row when applied. Enforce `totalUsageLimit`, `perCustomerUsageLimit`, scope match, date window.

5. **T&C + Privacy consent** — `Booking.consentAcceptedAt` is set server-side from the request body (timestamp), never trusted from a hidden client field. The DTO rejects missing/empty consent. The frontend checkbox already exists in `Checkout.tsx` (Stage 4) and the legal pages now exist (Stage 7).

6. **DTOs + validation** — `CreateBookingDto`, `CancelBookingDto`, `ClaimBookingDto`, `AdminUpdateBookingDto`. All use class-validator. The `consentAcceptedAt` is `@IsDateString()` and required.

7. **AuditLog entries** on every admin status transition + booking creation by admin. Customer-side bookings don't audit (no admin action).

8. **EmailService stubs for `sendBookingCreated`, `sendBookingCancellation`** (Phase 11 will swap to Resend).

### 6.2 Files Phase 9 will create (mod

```
backend/src/modules/bookings/
├── dto/
│   ├── create-booking.dto.ts
│   ├── claim-booking.dto.ts
│   ├── cancel-booking.dto.ts
│   └── admin-update-booking.dto.ts
├── bookings.service.ts          (state machine + capacity-safe create + promo)
├── bookings.controller.ts       (public: create, get, cancel, claim, list-mine)
├── admin-bookings.controller.ts (admin: list, get, patch status)
├── bookings.module.ts
└── bookings.service.spec.ts     (state-machine + capacity + promo unit tests)

backend/src/modules/promo-codes/
├── dto/promo-code.dto.ts
├── promo-codes.service.ts
├── promo-codes.controller.ts          (public: validate at checkout)
├── admin-promo-codes.controller.ts    (admin: CRUD)
└── promo-codes.module.ts

backend/src/modules/email/email.service.ts   (extend with sendBooking* methods)
```

### 6.3 Out of Phase 9 scope (deferred to later phases, see §2)

- Real payment intent creation, webhook handler, gateway verification → Phase 10.
- Real Resend integration in email bodies → Phase 11.
- Booking refund flow → Phase 10.
- Booking review eligibility + reviews moderation → Phase 12.
- §25 i18n for `Booking.consentAcceptedAt` copy / UI labels → Phase 13.

### 6.4 Architecture decisions locked for Phase 9

- **All booking prices are authoritative server-side.** Frontend's `subtotal` is informational only; backend recomputes `subtotal`, `discountAmount`, `total` from `tour.startingPrice × travelerCount - promoDiscount` (§8).
- **Money is integer EGP piasters** everywhere; no JS floats (already locked in schema).
- **Capacity is decremented inside a `prisma.$transaction`** with row-level lock on `TourDate`. Custom-trip bookings (`CUSTOM_TRIP`) do not touch `TourDate` — capacity is for fixed-departure tours only.
- **Soft delete pattern continues**: admin never hard-deletes bookings; cancellation flips status to `CANCELLED` and triggers `sendBookingCancellation` (Phase 11 swap).
- **AuditLog is mandatory** on admin-side transitions (CREATE/UPDATE/STATUS_CHANGE) — same pattern as Phase 7/7/7 + 8.

### 6.5 Verification gate before Phase 10

- `tsc -p tsconfig.build.json` → 0 errors
- `oxlint src/` → 0 warnings
- `vitest run` → all tests pass; new tests cover:
  - Booking creation with valid promo + capacity OK
  - Booking creation with insufficient capacity → throws
  - Booking creation with expired/invalid promo → throws
  - State-machine invalid transitions throw
  - Cancel without consent or without guestEmail throws
  - Claim flow links booking to user when guestEmail matches

---

## 7. Verified file/dir inventory

```
D-trips/
├── .gitignore                  # monorepo root — ignores node_modules, dist,
│                                 Website/, *.tsbuildinfo
├── docs/
│   └── PROJECT_SPEC.md        # the original spec, preserved
├── Website/                   # IGNORED — read-only reference prototype
├── frontend/                  # Vite + React 18 + TS + Tailwind
│   ├── src/
│   │   ├── App.tsx (16 routes incl. /privacy-policy + /terms-conditions)
│   │   ├── pages/   (Home, About, Tours, TourDetail, BuildTrip{1..4},
│   │   │            Checkout, Contact, Login, Signup, Account, Admin,
│   │   │            PrivacyPolicy, TermsConditions)
│   │   ├── components/  (site/, ui/, trip/, booking/, build-trip/)
│   │   ├── hooks/       (useBuildTrip, useAuthFlow, useContactForm,
│   │   │                useCheckoutForm)
│   │   ├── auth/        (AuthContext, AuthGuard)
│   │   ├── layouts/     (PublicLayout)
│   │   ├── lib/         (seed-images, stub-forms, validation,
│   │   │                build-trip-state, tokens/{colors,typography,spacing})
│   │   └── styles/      (globals.css)
│   ├── public/brand/    (logo.png, founder.jpg, home-teaser.jpg)
│   └── package.json
└── backend/                   # NestJS 12 + Prisma 6
    ├── prisma/
    │   └── schema.prisma       (20 models, 8 enums — see §3)
    ├── src/
    │   ├── main.ts            (env validation + ValidationPipe + CORS)
    │   ├── app.module.ts      (ConfigModule + PrismaModule + AuditLogModule
    │   │                       + 16 feature modules)
    │   ├── config/            (configuration.ts, env.validation.ts)
    │   ├── prisma/            (prisma.module.ts, prisma.service.ts)
    │   └── modules/
    │       ├── auth/          (service, controller, module, dto/,
    │       │                   decorators/, guards/, auth.service.spec.ts)
    │       ├── users/         (service, module)
    │       ├── tours/         (service, controller, dto/, admin-*,
    │       │                   tour-dates.service.ts, module)
    │       ├── categories/    (service, controller, dto/, admin-*,
    │       │                   module)
    │       ├── destinations/  (same pattern as categories)
    │       ├── build-trip/    (trip-type-presets.*, trip-requests.*,
    │       │                   admin-*, dto/, module)
    │       ├── email/         (service — stub, module)
    │       ├── audit-log/     (service, module — @Global)
    │       ├── bookings/      (stub — Phase 9)
    │       ├── payments/      (stub — Phase 10)
    │       ├── promo-codes/   (stub — Phase 9)
    │       ├── reviews/       (stub — Phase 12)
    │       ├── faqs/          (stub — Phase 12/13)
    │       ├── contact-messages/ (stub — Phase 12)
    │       ├── site-content/  (stub — Phase 13)
    │       ├── i18n/          (stub — Phase 13)
    │       └── admin/         (stub — Phase 12)
    ├── .env.example           (DATABASE_URL, JWT_*, EASYCASH_*, RESEND_*,
    │                            BUNNY_*, SENTRY_DSN, EMAIL_*, LOG_LEVEL)
    └── package.json
```

---

## 8. Open architectural questions for Phase 9 start

None blocking — these decisions are locked per the spec and earlier commits:

1. **Booking creation requires consent** — locked per §8.
2. **Promo code application is server-side** — locked per §29.
3. **Capacity lock is `SELECT … FOR UPDATE` on `TourDate.remainingCapacity`** — locked per §9.
4. **`CustomTrip` bookings don't decrement `TourDate` capacity** — locked per §7 (custom trips are scheduled bespoke; no fixed-date inventory).
5. **Money is integer EGP piasters** — locked in schema + all services.

The only open question is **idempotency for booking creation** (double-clicks per §11). Recommendation: require an `Idempotency-Key` header on `POST /api/bookings` and store the key on `Booking` (small `idempotencyKey String? @unique` migration). Will land in Phase 9.

---

**End of Phase 8 handoff. Next file to open when starting Phase 9**: `backend/prisma/schema.prisma` (start at the `Booking` model, then `PromoCode` / `PromoCodeRedemption`), then `backend/src/modules/bookings/`.