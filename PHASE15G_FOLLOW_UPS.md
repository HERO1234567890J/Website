# Phase 15G — Deferred Follow-Ups

> **Scope** items intentionally left out of the per-section commits
> in Phase 15G so each commit stays small and bisectable. None of
> these are blockers for §15 ("no fake anything, every button
> performs a real backend operation") — they're gaps in the
> underlying backend snapshots / pipelines that the admin frontend
> exposes honestly rather than mocking.
>
> **Where these get picked up** Phase 16 (CI/CD + production deploy)
> is too late for user-visible work; the natural slot is the
> pre-delivery polish phase that runs after 15G lands and before the
> §35 acceptance pass.

---

## FU-1 — Admin Dashboard: revenue time-series chart (§15)

**Why deferred** The `GET /api/admin/dashboard` snapshot returns
revenue aggregates (`totalEgp`, `last30dEgp`) but no month-by-month
series. The Phase 4 source design rendered an "Revenue, Last 8
Months" bar chart, so the section needs a real time-series feed to
restore that view. 15G.1 replaced the mocked chart with an honest
empty state rather than fabricate monthly bars (§23).

**Backend endpoint to add**

```
GET /api/admin/dashboard/revenue-timeseries
```

**Query params (optional)**

- `months` — how many trailing months to return (default `8`,
  cap `24`).

**Response shape**

```ts
interface RevenueTimeseriesPoint {
  /** "YYYY-MM" — first day of the month, UTC. */
  month: string;
  /** Successful payments in that month — integer piasters. */
  amount: number;
}

interface RevenueTimeseriesResponse {
  /** Display currency for the points — always EGP (base). */
  currency: 'EGP';
  /** Always returned newest-last so the UI can map directly to bars. */
  points: RevenueTimeseriesPoint[];
}
```

**Suggested query** `prisma.payment.aggregate` grouped by
`date_trunc('month', "createdAt")`, filtered to `status: 'SUCCEEDED'`,
with a `generate_series` outer join so months with zero revenue
return `amount: 0` instead of dropping out of the series.

**Frontend hook** add to `frontend/src/lib/api/admin-dashboard.ts`
as `getRevenueTimeseries(months?: number)`; render in the existing
`.bars` slot in `DashboardSection`.

**Acceptance** the chart reappears in the Dashboard with real
Prisma data; empty months render as zero-height bars (not gaps).

---

## FU-2 — Admin Tours: server-side pagination on `GET /api/admin/tours`

**Why deferred** `ToursService.listAll()` (Phase 7) currently
returns the full list with no pagination. Acceptable while the
catalog is small; will not scale to the projected 100+ tours. The
public `GET /api/tours` already supports `?page=&pageSize=` (capped
at 100) — the admin variant should mirror it.

**Backend change** extend `AdminToursController.list()` to accept
`ListToursQueryDto` (same DTO the public route uses, with one
extra optional `status` filter for `PUBLISHED` | `DRAFT`) and have
`ToursService.listAll(query)` apply it.

**Frontend change** `adminTours.ts → listAdminTours(query)` should
return `PagedResult<AdminTourView>`; the Tours section wires a real
pager component (the mocked `<button>1 2 3 ›</button>` in Admin.tsx
today).

---

## FU-3 — Admin Tours: image upload pipeline (Bunny Storage, §2.4)

**Why deferred** Phase 15G wires the `coverImageId` text input as a
raw URL paste. The full admin upload flow needs Bunny Storage signed
upload URLs on the backend and a drag-drop + preview UI on the
frontend. Until that lands, admins either paste a URL or upload
elsewhere and paste the resulting URL.

**Backend endpoint to add**

```
POST /api/admin/uploads/sign   → { uploadUrl, publicUrl, headers }
```

(Returns a signed PUT URL the browser uploads to directly, so the
NestJS process never proxies the bytes — keeps the API server
light per §22.)

**Frontend change** replace the `coverImageId` URL input with a
drag-drop box wired to the sign endpoint; show preview using
`publicUrl`; store `publicUrl` as `coverImageId`.

---

## FU-4 — Admin Tours: dates management sub-CRUD UI

**Why deferred** `admin-tour-dates.controller.ts` exposes the full
date CRUD (`POST /api/admin/tours/:tourId/dates`, `PATCH
/api/admin/tour-dates/:id`, `DELETE /api/admin/tour-dates/:id`, plus
the bulk `POST /api/admin/tour-dates/:id/cancel`). Phase 15G.2 wires
the API client and types but does NOT add a UI for adding/editing/
cancelling individual TourDates — that's a per-tour expandable panel
or a dedicated sub-route.

**Backend** none — controller already complete.

**Frontend** add a `<TourDatesManager tourId={...} />` component
inside the tour edit modal (or a "Manage dates" expand-row in the
tours table) that:
- lists current + future TourDates with capacity / remaining
- lets admin add a date range + capacity
- lets admin cancel a date (with the bulk-cancel confirm that lists
  how many active bookings will be notified per §12)

---

## FU-5 — Admin Tours: itinerary + included/excluded rich editor

**Why deferred** 15G.2 edits itinerary / included / excluded as
plain textareas. Useful for shipping a working admin, but a proper
day-by-day itinerary builder (drag-reorder, "Add day" with title +
bullets) is a real product surface, not a CRUD field. Defer to the
polish phase alongside the image upload work.

---

## FU-6 — Sidebar + content-margin RTL flip on the admin shell

**Why deferred** Per Phase 15G plan §5, this is one focused CSS
pass at the end of 15G (lands with 15G.7). The public site already
has `[dir="rtl"]` overrides from 15F; the admin shell is a separate
asymmetric layout that doesn't need per-section churn.

**Scope** `.sidebar` flips `left: 0` → `right: 0`; mobile slide-in
flips `translateX(-100%)` → `+100%`; sidebar toggle button swaps
sides; admin content margin flips `margin-left: 264px` →
`margin-right: 264px`; status pills / table actions handle via
logical properties; charts pass `rtl: true` to Chart.js / Recharts.

**Acceptance** open `/admin` in Arabic locale (LocaleProvider from
15F), confirm sidebar is on the right, toggle works, no horizontal
overflow, charts render RTL.

---

## FU-7 — Admin Bookings: state-machine transitions UI

**Why deferred** `admin-bookings.controller.ts` already supports
`PATCH /api/admin/bookings/:id` with a state-machine guard.
Phase 15G.3 wires the list + filter; the per-booking state-machine
actions (CONFIRM, CANCEL, MARK COMPLETED, REFUND) are a per-row
action menu that lands alongside the detail-view expansion.

---

## FU-8 — Admin Site Content: bulk-locale Save for SiteContent

**Why deferred** `admin-site-content.controller.ts` exposes
`PUT /api/admin/site-content/:key/:locale`. The Settings tab in
15G.7 will wire one-locale-at-a-time saves per key; a "Save all
locales" batch button that PUTs each locale in sequence (or a new
batch endpoint) is a polish-phase convenience.

---

## FU-9 — Admin Bookings: payment-method column + per-status aggregate stats

**Why deferred** The 15G.3 admin Bookings list does not surface
the payment method (Instapay / Credit Card / Bank Transfer) that
the source design rendered as a "Checkout" column, and the 4 stat
cards from the design (Total Orders / Total Revenue / Pending
Payments / Refund Requests) were removed because no honest
aggregate endpoint existed for them.

**Backend changes**

1. Extend the list include with the latest payment:

   ```ts
   include: {
     // …existing tour / tourDate / user joins…
     payments: {
       orderBy: { createdAt: 'desc' },
       take: 1,
       select: { method: true, status: true, amount: true },
     },
   }
   ```

   Add a `payment: { method, status, amount } | null` field to
   the `AdminBooking` type on the frontend and render it in the
   table.

2. Add a sibling aggregate endpoint so the 4 stat cards can come
   back without re-iterating pages:

   ```
   GET /api/admin/bookings/stats
   ```

   Returns:

   ```ts
   interface BookingsStats {
     totalCount: number;
     revenueEgp: number;          // sum(total) over PAID|CONFIRMED|COMPLETED
     pendingPaymentCount: number; // count where status === PAYMENT_PENDING
     cancelledCount: number;      // count where status === CANCELLED
   }
   ```

   Cheap to compute with two `prisma.booking.aggregate` + two
   `prisma.booking.count` queries in parallel.

**Frontend** add `getBookingsStats()` to `admin-bookings.ts`,
re-render the 4 stat cards at the top of `BookingsSection`,
honoring the same filters (the stats are filter-scoped, so the
"Total Orders" number matches the visible list).

---

## FU-10 — Admin Users: bookings count/spend aggregates + CSV export

**Status:** split off from the original FU-10 (the block/unblock
piece landed in `bf98460`). Two remaining gaps from 15G.4:

1. **Bookings count + Total Spent per user** — would be honest and
   useful, but the `GET /api/admin/users` select doesn't include
   the Booking join today. Adding it means either an extra
   `_count.booking` aggregate and a `payment` aggregate on the
   existing list query, or a new `GET /api/admin/users/:id/stats`
   endpoint for the detail modal.

2. **CSV export** — the mock toolbar had an "Export CSV" button
   that's wired to nothing. Implementing it client-side from the
   current page's items would lie about completeness (the table
   paginates). Two honest paths: (a) a `GET /api/admin/users.csv`
   stream that respects the same search + filter, or (b) a
   server-side job that emails the CSV (better for 1,000+ user
   exports per §15 performance expectations).

### ✅ Done — Block / Unblock user (commit `bf98460`)

**Backend**

- `schema.prisma` — new columns on User:
  `isBlocked Boolean @default(false)`,
  `blockReason String?`,
  `blockedAt DateTime?`.
- `PATCH /api/admin/users/:id/block` (`{ blocked, reason? }`) —
  self-protected at the controller (400 if admin targets self),
  service revokes all of the user's refresh tokens on block,
  audit row `USER_BLOCKED` / `USER_UNBLOCKED` with optional
  reason in metadata.
- `JwtAccessGuard`, `JwtRefreshGuard`, `OptionalJwtGuard` — every
  authenticated request does a PK lookup on `User.isBlocked`.
  403 (not 401) so the frontend's refresh-on-401 cycle doesn't
  loop trying to recover a revoked session. The refresh guard
  additionally revokes the matching `RefreshToken` row before
  throwing.

### Backend changes (still pending)

1. Extend the admin users list include:

   ```ts
   include: {
     // …existing select…
     _count: { select: { bookings: true } },
     bookings: {
       where: { status: { in: ['PAID', 'CONFIRMED', 'COMPLETED'] } },
       select: { total: true },
     },
   }
   ```

   Compute `totalSpentEgp` = `sum(booking.total)` server-side so
   the frontend never sees raw money.

2. New CSV streaming endpoint or background job for export.

### Frontend (still pending)

- Add `bookingsCount` + `totalSpentEgp` to the `AdminUser` type
  and surface in the table + modal.
- Wire the CSV export once the backend stream lands.

---

*Add new follow-ups as they're discovered. Reference them in the
commit message that defers the work so they're discoverable from
`git log`.*
