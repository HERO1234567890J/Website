You are building the complete, production-ready **D-Trips** tourism/travel booking platform end to end. You are not producing a prototype, a design mockup, or another prompt — you are the engineer implementing this system. Work in the controlled phases defined at the end of this document, and do not skip the inspection phase.

## 1. Project context

D-Trips is a professional tourism/travel booking platform (Sinai/Egypt tours are the observed subject matter — Ras Mohammed, Dahab, etc.). The public site lets visitors browse fixed tours **and/or** compose a custom trip through a guided wizard, select dates and travelers, pay online, and manage their bookings. The business runs everything through an admin dashboard that is the single source of truth for the public site's data. The company already has 1,000+ users; this must be built to scale, not as a toy.

The current design exists as **14 static HTML files with inline CSS and zero backend**. These files will be provided to you directly (uploaded to the working directory/repo you're given) — treat the **uploaded/provided files as the authoritative source**, not a remote clone. A GitHub repository (`https://github.com/HERO1234567890J/D-trips`) has been referenced as a possible origin for these files, but its existence, contents, and accessibility have **not been independently verified** — do not assume it is reachable, up to date, or even public. If you are given direct filesystem/repo access to the 14 HTML files (however they arrive — upload, mounted repo, etc.), work from those. Only attempt to reach the GitHub URL if you are explicitly instructed to and have the access to check; if it's unreachable, empty, or inconsistent with the provided files, the provided files win, no exceptions. Treat all of this as your visual/UX/IA reference only — never ship it as-is, never leave it as static HTML, and never blindly preserve broken or non-functional pieces of it.

## 2. Phase 1 — Mandatory inspection before writing any code

Before writing a single line of application code:
1. Locate and open every one of the 14 HTML files plus `_dash_body.html`/`_dash_css.html` from wherever they were actually provided to you (uploaded files/mounted directory take priority over any remote repo reference), and read them in full. If a claimed source (e.g. the GitHub URL above) turns out to be inaccessible, empty, or doesn't match what was actually provided, explicitly note that discrepancy in your implementation plan rather than silently proceeding on an assumption.
2. Catalogue every distinct page, section, component pattern, form, and interactive element.
3. Extract the full design token set (colors, fonts, spacing scale, breakpoints) directly from the `:root` CSS variables and inline `<style>` blocks — do not invent new tokens where real ones exist in the source.
4. Note that all images in the source are either base64 data-URIs or hot-linked `images.unsplash.com` URLs — plan to replace both with a real, admin-manageable media pipeline (Bunny Storage) using the Unsplash images only as temporary seed content, clearly marked for replacement, never shipped to production as external hotlinks.
5. Note that the brand's decorative wordmark font (`LemonadoScript`/`ShinanoItalic`) is referenced via `@font-face` but the actual font files are **not present** in the provided files (pointing at a non-existent `/fonts` directory). Implement the CSS fallback chain as-is (`Yellowtail` → system cursive) and flag in your final report that licensed font files are a required business asset, not something to fabricate or replace with a lookalike.
6. Produce a written implementation plan before touching code. Do not delete any existing file before you have read and understood it.
7. Confirm there is no existing backend anywhere in the provided files (there isn't, per inspection) before assuming otherwise.

## 3. Technology stack (do not substitute without a documented reason)

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS.
- **Backend:** Node.js + TypeScript + NestJS (modular monolith — no microservices).
- **Database:** PostgreSQL.
- **ORM:** Prisma (schema, migrations, transactions, type safety).
- **Payments:** EasyCash. **You do not have EasyCash's official API documentation in this prompt.** Do not invent endpoints, field names, or signature schemes. Build the entire payment flow behind a `PaymentService` interface (`createPaymentIntent`, `verifyPayment`, `handleWebhook`, `refund`) with EasyCash as the sole implementation, and clearly mark every place where a real EasyCash credential, endpoint, or verification mechanism is required, pending the actual documentation being supplied. Every other part of the system (booking state machine, idempotency ledger, price calculation) must be built as if the real integration will be dropped in.
- **Email:** Resend (or better, if you have a documented reason), called only from the backend, never exposing API keys to the frontend.
- **Storage/CDN:** Bunny Storage for images/assets; Bunny Stream only if/when video is needed.
- **Hosting:** Docker + Docker Compose + Nginx + HTTPS on a Contabo VPS.

## 4. Information architecture — build these exact routes/pages

Public: `/` (home), `/about`, `/tours` (catalog with filters/search/pagination), `/tours/:slug` (tour detail — hero/gallery, overview, highlights, itinerary, included/excluded, availability, booking widget, reviews, related tours), `/build-trip` (trip-type selector: Friends / Family / Honeymoon / Solo Traveler / Adventure / University Trip — admin-editable presets), `/build-trip/destinations`, `/build-trip/details`, `/build-trip/review` (the 3-step wizard after type selection), `/checkout`, `/contact`, `/login`, `/signup`.

Authenticated user: `/account` (profile, my trips — upcoming/past, cancel booking, security/password, notifications).

Public (additional static/legal pages, content admin-editable — see §26): `/privacy-policy`, `/terms-conditions`.

Admin (separate, desktop-first, own auth): `/admin/login` (build this — it does not exist in the source), `/admin` dashboard (revenue chart, bookings-by-category chart, recent bookings, system monitoring), `/admin/tours` (CRUD + add-new-tour form), `/admin/bookings` (list + order detail view), `/admin/users`, `/admin/reviews`, `/admin/faqs`, `/admin/contact-messages` (inbox for all `/contact` submissions — see §26), `/admin/settings` (general info, social links, homepage hero, about page content, privacy policy content, terms & conditions content, logo & branding upload).

**Out of scope for v1 (explicit decision, not an oversight):** a dedicated support-ticketing system (`SupportTicket`/`SupportMessage` entities, an admin "Support" inbox). The source design has no such UI — customer support is handled via the existing `/contact` form plus the admin-configurable WhatsApp/email/social links in Site Settings. If the business wants in-app ticketing later, it is a separate, additive module — do not build it speculatively now.

## 5. Design system — implement exactly this, do not invent a new one

```css
--paper:#FFFFFF; --sand:#FFF8EE; --sun:#FFA61C; --sun-dark:#e0900e;
--ink:#000000; --ink-soft:#232323; --line: rgba(0,0,0,0.12);
--script: 'Yellowtail', cursive;              /* decorative fallback */
--brand-font: 'LemonadoScript','ShinanoItalic','Yellowtail', cursive; /* true wordmark, files pending from business */
--cine: 'Fraunces', serif;                     /* tour titles / display headings */
--body: 'Inter', sans-serif;                   /* body copy, forms, buttons */
--eyebrow: 'Poppins', sans-serif;              /* uppercase small-caps section labels */
```
Typography hierarchy rule (non-negotiable): the decorative/brand font is for logo and pure decorative flourish only. Tour titles use `--cine`. All body copy, buttons, forms, and the entire admin dashboard use `--body`. Never use the decorative or script font anywhere readability matters.

Preserve the "film reel perforation" divider motif, scroll-reveal animations, and the cinema/travel visual identity observed in the source. Rebuild these as reusable React components/CSS utilities, not copy-pasted inline styles.

## 6. Mobile-first requirement (highest priority)

Design and implement every public page mobile-first. Conceptually verify against 360/375/390/414px before tablet/laptop/desktop/large-desktop. Pay special attention to navigation, tour cards, images, booking controls, date selectors, forms, checkout, payment, modals, buttons, typography, and sticky elements. No horizontal overflow, no unusable tiny touch targets, anywhere. The admin dashboard is desktop-first but must remain usable on tablets; it does not need to be mobile-optimized to the same degree.

## 7. Tour system & Build-Trip system — build both, as two related but distinct concepts

**Tours** (catalog): title, slug, description, short description, cover image, gallery, destination, category, duration, starting price, currency, itinerary, included/excluded services, meeting/pickup info, available dates with capacity, cancellation policy, published/unpublished state, timestamps. Categories are admin-managed (create/edit/deactivate/reorder), never hardcoded in the frontend.

**Build-Trip wizard**: admin-managed `TripTypePreset` records (Friends/Family/Honeymoon/Solo/Adventure/University, matching the source) each with its own imagery/copy; a 3-step flow (Destinations → Details → Review) that lets the customer assemble a custom trip request; this converges into the same `Booking` entity as a tour booking at checkout, with an `origin` discriminator (`TOUR` vs `CUSTOM_TRIP`).

Tour listing: server-side search/filter/sort/pagination (search, category, destination, price, duration, date, availability) — never download the full catalog to filter client-side.

## 8. Booking flow & price integrity

Tour Details or Build-Trip Review → select date → select guest count → optional promo code (§29) → backend calculates authoritative price → checkout requires an explicit checkbox confirming the customer has read and agrees to the Terms & Conditions and Privacy Policy (§27) before payment can be initiated — this consent (with timestamp) is stored on the booking, not just checked client-side and forgotten → checkout creates a `DRAFT`/`PENDING` booking → payment → verified payment moves booking through `PAYMENT_PENDING → PAID → CONFIRMED` → confirmation email. The frontend never supplies a trusted price, total, discount, or availability figure — the backend recalculates and verifies every one of these server-side on every write. Use Prisma `Decimal` (or integer minor units) for all money; never JavaScript floats.

**Guest/traveler data — collect only what's needed:** name, email, phone, traveler count, traveler names (if required for the tour), special requests, pickup location. Do not add speculative fields (ID numbers, passport data, date of birth, etc.) unless a specific tour type genuinely requires them for operations. Treat all guest PII with the same access controls as user account data — never exposed to unauthenticated requests, never logged in plaintext.

## 9. Availability & concurrency

Enforce capacity server-side, inside a database transaction with row-level locking (`SELECT ... FOR UPDATE` via Prisma interactive transactions) on the relevant `TourDate`/availability row, so two simultaneous bookings can never together exceed remaining capacity. Never rely on disabling a date in the React UI as the actual control. Auto-expire unpaid `PENDING` bookings past a configurable TTL via a background job, releasing held capacity.

## 10. Booking state machine

States: `DRAFT, PENDING, PAYMENT_PENDING, PAID, CONFIRMED, CANCELLED, COMPLETED, FAILED, EXPIRED`. Define and enforce valid transitions only (e.g. `PENDING→PAYMENT_PENDING→PAID→CONFIRMED`; `PENDING/PAYMENT_PENDING→CANCELLED/FAILED/EXPIRED`). Never allow an email/notification failure to move a `PAID` booking backward — notification delivery status is a separate field from booking/payment status.

## 11. EasyCash payment integration & required edge cases

Architecture: React → NestJS `PaymentService` → EasyCash API → customer payment interface → EasyCash callback/webhook → backend verification (signature/transaction-status check per EasyCash's actual mechanism, once documentation is available) → DB update inside a transaction → booking confirmation → email. The frontend returning "success" is never sufficient on its own to confirm payment — only backend-verified webhook/callback/status-check confirms it. Store no raw card data; prefer EasyCash-hosted payment collection.

Explicitly handle: customer loses connection after paying (resolved via webhook, not frontend return), double-click on Pay (idempotent booking/payment creation), duplicate payment requests and duplicate webhooks (idempotency keys + a `PaymentEvent` append-only ledger keyed on gateway transaction ID), payment succeeds but frontend crashes (backend still finalizes), payment fails (booking never becomes confirmed), payment stays pending (booking stays in the matching pending state), customer closes the browser mid-flow (gateway mechanism resolves it), server errors during verification (never mark paid without full verification), price tampering (backend recalculates, ignores any client-supplied amount), booking race conditions (see §9), replay attacks (verify authenticity/transaction state per EasyCash's actual signature mechanism — do not invent one).

Entities: `Booking`, `Payment`, `PaymentEvent` (internal ID, booking ID, gateway transaction ID, amount, currency, status, gateway response/reference, timestamps). All state changes to booking+payment together happen inside one DB transaction with duplicate-processing checks and an audit event, never as independent sequential writes.

## 12. Email automation

Single `EmailService` with one method per event:
- `sendWelcomeEmail`
- `sendBookingCreated`
- `sendPaymentConfirmation`
- `sendBookingConfirmation`
- `sendBookingUpdate`
- `sendBookingCancellation` (single booking, customer- or admin-initiated)
- `sendTourCancelledBulk` (**distinct from the above** — when an admin cancels or removes an entire `TourDate`, this notifies *every* customer with an active booking on that date in one batch job, not one at a time inline in the request/response cycle; each notification still goes through the same per-booking idempotency/retry tracking)
- `sendPaymentFailed`
- `sendPasswordReset`
- `sendTourReminder`
- `sendContactMessageReceived` (fired on every `/contact` form submission — sends a notification to the company's configured contact email from Site Settings; see §26 for the full contact-message flow)

No ad-hoc email logic in controllers. Email delivery failures never roll back or downgrade a paid/confirmed booking — track notification delivery status independently and retry via a simple background job.

## 13. User account, authentication & roles

Registration, login, logout, Argon2/bcrypt password hashing, password reset, JWT access + refresh token handling, optional email verification (non-blocking). User dashboard: profile, my bookings (upcoming/past), booking detail with payment status, cancel booking, update profile, change password, notification preferences, support/contact link. Users can only ever access their own bookings — enforce this in the backend on every query, not just by hiding UI.

**Roles (explicit decision):** implement `CUSTOMER` and `ADMIN` as the two roles for v1 — the source design shows a single, undifferentiated admin dashboard with no evidence of multiple admin tiers. However, implement the role/permission check as a proper guard-based system keyed off a `role` enum column and a `Permission`/policy layer (not scattered `if (user.role === 'ADMIN')` checks), so that `SUPER_ADMIN` and `STAFF` tiers can be added later by extending the enum and policy map without a schema rewrite. Do not build the finer-grained tiers now — just don't architect yourself into a corner.

## 14. Reviews — eligibility & moderation (explicit decision)

A user may submit a review for a tour **only if** they have a `Booking` on that tour in `COMPLETED` status (i.e. a verified past customer, not any logged-in user). Newly submitted reviews are created in a `PENDING` state and are never shown on the public site until an admin explicitly publishes them via **Reviews & Testimonials**. Enforce the eligibility check server-side on the create-review endpoint — never trust a client-side "has booked" flag.

## 15. Admin system (must be 100% real — no fake anything)

Build a dedicated, secure `/admin/login` page (does not exist in source design) with its own auth flow: login, logout, session/token handling, role verification, rate limiting on login attempts, secure password handling, appropriate session expiration. Admin authorization must be enforced by the backend on every admin endpoint — never rely on hiding admin routes in React.

Implement every section observed in the source design as a fully working feature: Dashboard & Analytics (real revenue chart from real bookings data, real bookings-by-category chart, real recent-bookings list, basic system monitoring/health), Tours & Trips (full CRUD, add-new-tour form, availability management, including cancelling/removing a `TourDate` which must trigger `sendTourCancelledBulk` per §12), Bookings & Orders (server-side paginated/searchable/filterable list, real order detail view), Users (list, view, role/status management), Reviews & Testimonials (moderate/publish per §14), FAQs (CRUD), Contact Messages (every `/contact` submission stored in the DB with a status — `NEW` / `REPLIED` / `ARCHIVED` — plus the outbound notification email per §12/§26; nothing sent from the public form is ever "fire and forget" with no record), Site Content & Settings (company info, contact details, WhatsApp, email, social links, cancellation policy, booking settings, base currency + enabled display currencies, enabled languages, privacy policy content, terms & conditions content, homepage hero content, about page content, logo/branding upload). Every button must perform a real, backend-connected operation. No fake statistics, no fake tables, no placeholder CRUD, no buttons that do nothing. Destructive actions require confirmation; financial/booking changes show a clear resulting status.

For large tables (bookings, users): server-side pagination, search, filters, sorting, proper loading states — never render an entire dataset client-side.

**Audit log:** every admin write action listed above (create/edit/delete/publish/status-change) must write an `AuditLog` row capturing: **who** (admin user ID), **what** (action type, e.g. `TOUR_UPDATED`, `BOOKING_CANCELLED`, `REVIEW_PUBLISHED`), **when** (timestamp), **target entity** (entity type + ID), and **relevant metadata** (a JSON diff or key changed fields — never the full request body if it could contain secrets). Never write passwords, tokens, or payment credentials into the audit log.

## 16. Frontend architecture

```
src/
  app/  components/  layouts/  pages/  features/  hooks/  services/  api/  types/  utils/  routes/  assets/
```
Feature-based organization, reusable components for tour cards, buttons, forms, modals, date selectors, booking components, navigation, footer, alerts, loading/error/empty states. No hardcoded production data in React — the database is the source of truth end to end; the admin changes the database, the public site reads it.

## 17. Performance & UX polish

Optimize images (real Bunny-served assets, responsive/lazy-loaded), keep bundles lean, paginate/virtualize large tables, avoid unnecessary re-renders and layout thrashing, keep animations cheap. Checkout must minimize friction and never surprise the user with an unexplained price change. The user should always be able to see, at every step: which tour/trip they're viewing, price, date, traveler count, what's included, booking status, payment status, cancellation rules.

## 18. Security

Guard against SQL injection, XSS, IDOR, broken access control, privilege escalation, brute-force auth, rate abuse, CSRF where applicable, CORS misconfiguration, sensitive data leakage, insecure uploads, payment/booking/price manipulation, race conditions, replay attacks. Every API endpoint: auth guard + role guard + DTO validation + input sanitization + rate limiting + secure headers + CORS config + consistent, non-leaky error responses (no stack traces, no raw DB errors, in production). File uploads: validate real MIME type, extension, and size server-side (never trust filename or client-declared MIME type); store via Bunny Storage/CDN, not on the application server.

## 19. Accessibility & SEO

Accessibility: semantic HTML, full keyboard navigation, proper labels, visible focus states, accessible dialogs, sufficient contrast, screen-reader-friendly controls, touch-friendly targets, no color-only status indicators.

SEO: proper titles/meta descriptions/canonical URLs/Open Graph per page, structured data where appropriate, SEO-friendly tour slugs, sitemap, robots.txt. Recommended approach: prerender/SSG the public marketing and tour pages (home, about, tours, tour detail, contact) via a Vite prerendering plugin; keep booking, account, and admin as client-rendered SPA routes, since those need no SEO and full SSR would be unjustified complexity at this scale. Document this tradeoff explicitly in your final report rather than silently picking one.

## 20. API documentation, logging, observability

Swagger/OpenAPI covering auth, tours, bookings, payments, users, admin. Structured logging of auth failures, payment processing, webhook events, booking creation/cancellation, admin actions, and critical errors — never log passwords, API keys, JWTs, payment secrets, or raw sensitive payment data. Health endpoint, application/database/payment-integration error logging, correlation IDs on requests where useful.

## 21. Testing

Cover, at minimum: auth (login/registration/unauthorized access/role restriction), tours (CRUD, availability, filtering), bookings (successful booking, invalid date, invalid capacity, concurrent booking, cancellation), payments (successful, failed, pending, duplicate callback, duplicate webhook, payment-after-disconnect, verification, amount mismatch), reviews (non-eligible user blocked from submitting, moderation gate holds unpublished reviews), security (unauthorized booking access, IDOR, admin endpoint protection, price tampering), emails (correct triggers, duplicate-event handling, bulk tour-cancellation notifies all affected bookings exactly once).

## 22. Deployment

```
Internet → Nginx → (Frontend static build / API) → NestJS → PostgreSQL
                          NestJS → EasyCash, Resend, Bunny
```
Docker + Docker Compose, Nginx config with HTTPS (Let's Encrypt), Prisma migration procedure as a deploy step, automated PostgreSQL backups with documented retention and a tested restore procedure (do not rely solely on VPS snapshots), application logs, health checks. Provide a complete `.env.example` covering `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, EasyCash credentials, email provider credentials, Bunny credentials, `APP_URL`, `API_URL`. Never commit real secrets; never expose server-side secrets through Vite's client env vars.

## 23. No fake features, ever

Do not ship fake dashboard statistics, fake API calls, fake payment success, fake booking confirmation, non-functional buttons, fake CRUD, placeholder data presented as real, hardcoded production tours, or a mock backend pretending to be complete. If a third-party credential (EasyCash, Resend, Bunny) is unavailable to you right now, implement the real integration code path correctly and clearly document the exact configuration/credential the business must supply — never substitute a fake "success" response to make the demo look done.

## 24. Contact Us — data flow (explicit decision)

The `/contact` form is **not** a fire-and-forget mail relay. On submission:
1. Persist the message to the database as a `ContactMessage` entity (name, email, phone (optional), subject, message body, status, timestamps). Status starts at `NEW` and admins can move it to `REPLIED` / `ARCHIVED` from `/admin/contact-messages`.
2. In the same request, trigger `sendContactMessageReceived` (§12) to notify the company's configured contact email (from Site Settings) that a new message has arrived.

Both paths run together — the DB row is the durable record (so nothing is lost if the notification email fails to send), and the email is the real-time nudge to the team. Treat this exactly like the existing `EmailService` pattern used for booking notifications: no ad-hoc mail logic outside `EmailService`, and email delivery failure never blocks or loses the stored message.

## 25. Internationalization (i18n)

Ship v1 with **two languages**: **English (default/primary)** and **Arabic**, switchable via a visible language toggle on the public site (RTL layout must work correctly for Arabic — mirror layout, not just flip text direction). Do not hardcode any user-facing string in components — route all public-facing copy (and admin-editable content: about page, homepage hero, FAQs, privacy policy, terms & conditions) through the i18n layer/database so it can be translated.

Architect the i18n system (keys, locale files structure, `Accept-Language`/locale-routing strategy, DB-driven content translation) so that additional languages (e.g. French, German, Russian — common nationalities visiting Sinai/Dahab/Sharm) can be added later purely by adding locale data, with no structural rework.

## 26. Currency

**Egyptian Pound (EGP) is the base currency and the only currency money actually moves in** — all prices are stored, calculated, and charged in EGP through EasyCash. Display currency is a separate, presentation-only concern:
- Ship v1 with **EGP (default)** and **USD** as selectable display currencies on the public site (a toggle, not per-user auto-detection only).
- Architect it so additional display currencies (e.g. EUR) can be enabled later from `/admin/settings` without a code change — an admin-configurable list of enabled currencies plus an exchange-rate value/source that's refreshed periodically.
- The displayed converted price is for information only; the authoritative price calculated and charged server-side (§8) is always in EGP. Never let a client-supplied display currency or exchange rate influence the real charge amount.

## 27. Legal pages — Privacy Policy & Terms and Conditions (explicit decision)

Required for a platform that collects personal data and takes online payment. Build both as:
- Public static routes: `/privacy-policy` and `/terms-conditions` (§4).
- Content is **not** hardcoded in the frontend — it's admin-editable (rich text) from `/admin/settings`, the same pattern already used for the About page content, so the business can update it without a redeploy.
- Both pages respect the i18n system (§25) — content should be editable/stored per enabled language, not English-only.

## 28. Guest checkout vs. mandatory registration (explicit decision)

**Do not force account creation to book.** Industry-standard for tourism booking sites, and the right default here: allow **guest checkout** — a visitor can complete a full booking and payment by supplying name, email, phone, and traveler details, with no account required. This maximizes conversion, which matters commercially.

At the same time:
- Offer an easy, optional "create an account" step during or right after checkout (pre-filled from the guest details) so returning customers can track bookings without re-entering data.
- Every `Booking` is tied to an email address regardless of guest/registered status. If a guest later registers or logs in with the same, verified email, surface their past guest bookings on `/account` (a "claim past bookings" pattern) — this is a nice-to-have, not a blocker for v1, but design the `Booking.userId` field as nullable with an `email` field always present so this linkage is possible without a schema rewrite.
- Guests can still look up a specific booking's status via a secure link (e.g. a booking reference + email, sent in the confirmation email) even without ever creating an account.

## 29. Promo codes / discounts (explicit decision)

Build a `PromoCode` entity and admin-managed discount system:
- Fields: code (unique, case-insensitive), type (`PERCENTAGE` or `FIXED_AMOUNT`), value, optional minimum booking amount, optional scope (all tours / specific tours / specific categories), optional start/end validity dates, optional total usage limit, optional per-customer usage limit, active/inactive flag, timestamps.
- Admin CRUD for promo codes lives under `/admin/settings` (or its own `/admin/promo-codes` section if the list grows) with usage stats (times redeemed, total discount given) visible per code.
- At checkout, the customer can enter a code; the **backend** validates it (exists, active, within date range, scope matches the cart, usage limits not exceeded for this code/this customer) and recalculates the discounted price server-side. The frontend never supplies a trusted discount amount — same rule as price integrity in §8. An invalid/expired/exhausted code returns a clear rejection, never a silent partial discount.
- Track redemptions in a `PromoCodeRedemption` join row (promo code ID, booking ID, timestamp, discount amount applied) so usage limits and reporting are enforceable and auditable, not just inferred from booking totals.

## 30. Error monitoring & alerting

Structured logging (§20) is not sufficient on its own for a small team to notice production problems in real time. Integrate a dedicated error-monitoring service (**Sentry**, self-hosted or cloud — or a documented equivalent if the business already has a preference) on both the NestJS backend and the React frontend:
- Capture unhandled exceptions, failed payment verifications, webhook processing failures, and 5xx spikes with full stack traces and request context.
- Scrub PII and payment secrets before any error payload leaves the server — never send raw card data, tokens, or passwords to the monitoring service, same discipline as §20's logging rules.
- Configure real-time alerting (email and/or a Slack/Discord/WhatsApp webhook, admin-configurable) for the highest-severity categories specifically: payment verification failures, webhook processing failures, and booking state-machine violations — these are the failures that cost the business money or trust if they go unnoticed.

## 31. Analytics & marketing tracking

Integrate **Google Analytics 4** (and optionally a Meta/Facebook Pixel if the business runs paid social ads) on the public site so the team can measure traffic sources and conversion:
- Track at minimum: page views, tour detail views, Build-Trip wizard starts/step completions, checkout starts, and confirmed bookings (as a purchase/conversion event) — this is what lets the business evaluate ad spend and funnel drop-off.
- Implement this through a thin, isolated analytics service/hook — tracking calls must never sit inside booking/payment business logic itself, so analytics failures or ad-blockers can never affect a real transaction.
- Show a cookie/tracking consent notice on first visit before non-essential tracking scripts load, and respect the visitor's choice. Keep this lightweight and non-blocking — it must not hurt the mobile performance budget in §17.

## 32. CI/CD pipeline

Do not rely on manual, ad-hoc deploys for a production system handling payments. Set up a CI/CD pipeline (GitHub Actions, assuming the project's own working repository — the one you build this codebase in — is hosted on GitHub; adapt to whatever git host it actually ends up on):
- **On every pull request:** install dependencies, lint, type-check, run the automated test suite (§21), and run a production build — block merge on failure.
- **On merge to `main`:** build the Docker images and deploy to the Contabo VPS (e.g. via SSH + `docker compose up -d --build`, or a container registry push/pull step), then run the Prisma migration step (§22) as part of the deploy, not as a manual afterthought.
- Document the rollback procedure explicitly (previous image tag/tagged release + `docker compose` rollback, plus the database restore procedure from §22's backup strategy) — a deploy pipeline without a documented rollback path is incomplete.
- Never put real secrets in the repository or in workflow files in plaintext — use GitHub Actions secrets/environment protection rules for `DATABASE_URL`, JWT secrets, EasyCash/Resend/Bunny credentials, and VPS SSH credentials.

## 33. Engineering decision-making principle

Where a requirement in this document is not explicit but a reasonable, standard production default clearly exists, make the engineering decision yourself and document it in your implementation plan/final report — do not stall the build waiting for an answer. Only stop and ask for clarification when the missing information would make correct implementation genuinely impossible, or could cause irreversible business/financial consequences (e.g. an ambiguous EasyCash credential requirement, not "should the button be blue or orange").

## 34. Required build phases — work through these in order, and after each major phase, build, run the relevant tests, fix errors, and confirm the architecture is sound before continuing

1. Inspect all provided frontend files, and any GitHub repository reference only if it's actually accessible and verified (per §2 — the provided files are authoritative regardless).
2. Analyze the existing HTML/CSS design in full.
3. Design and document the final architecture.
4. Design the PostgreSQL schema (Prisma) — including `role`/permission structure (§13), review eligibility fields (§14), `AuditLog` fields (§15), the `ContactMessage` entity (§24), and the `PromoCode`/`PromoCodeRedemption` entities (§29).
5. Scaffold the NestJS backend foundation and module structure.
6. Implement authentication and authorization (customer + admin), with guest checkout supported per §28.
7. Implement tours, categories, availability, and the Build-Trip preset/wizard backend.
8. Implement users and bookings (including the unified booking state machine, promo code validation per §29, and stored T&C/Privacy consent per §8).
9. Implement the EasyCash payment integration behind `PaymentService`, with every edge case in §11 handled, and every EasyCash-specific detail clearly flagged pending real documentation.
10. Implement transactional emails via `EmailService`, including the bulk tour-cancellation flow (§12).
11. Implement reviews with the eligibility/moderation rule in §14.
12. Implement the full admin dashboard, with every control wired to a real backend operation, including the audit log (§15), Contact Messages inbox (§24), and promo code management (§29).
13. Implement the i18n layer (§25) and multi-currency display (§26).
14. Implement the Privacy Policy / Terms & Conditions admin-editable static pages (§27).
15. Convert/rebuild the frontend into React + TypeScript, mobile-first, using the exact design system in §5.
16. Connect the frontend to the real APIs, removing all mock/hardcoded data.
17. Implement security hardening across the full stack.
18. Integrate error monitoring/alerting (§30) and analytics (§31).
19. Implement tests per §21.
20. Set up the CI/CD pipeline (§32) and Docker/production deployment per §22.
21. Run a final security and business-logic audit against every requirement in this document before declaring the project complete.

## 35. Acceptance criteria

The platform is complete only when: the public site is fully responsive and mobile-first and matches the reference design's identity; tours and Build-Trip both load entirely from the database; booking, payment, authentication, the user dashboard, transactional emails, and error states all work end to end; guest checkout works without forcing registration, per §28; a valid promo code correctly discounts the server-calculated price and an invalid/expired/exhausted one is rejected, per §29; the T&C/Privacy Policy consent checkbox is required and stored on every booking, per §8; reviews follow the completed-booking eligibility rule and admin moderation gate; the admin dashboard's login, CRUD, availability, bookings, users, payments visibility, statistics, audit log, and promo code management are all real and every control performs a real operation; the backend is NestJS + PostgreSQL + Prisma with real auth, RBAC (extensible role/policy layer), validation, transactions, error handling, logging, and security; EasyCash payment is integrated with secure backend-only credentials, verified payment, webhook/callback handling, duplicate protection, idempotency, failure handling, and concurrency safety; transactional email covers every listed event (including bulk tour-cancellation) with retry/failure handling that never controls payment state; error monitoring/alerting is live and firing on payment/webhook failures per §30; analytics tracks the funnel from page view through confirmed booking without touching booking/payment logic per §31; the CI/CD pipeline lints, type-checks, tests, and builds on every PR and deploys with a documented rollback path per §32; deployment runs on Docker on the Contabo VPS behind Nginx/HTTPS with PostgreSQL migrations, backups, and documented environment configuration; every `/contact` submission is persisted as a `ContactMessage` and triggers a real notification email, visible and actionable from `/admin/contact-messages`; the public site works fully in English and Arabic (including correct RTL) with all admin-editable content translated, and the i18n architecture supports adding further languages without structural rework; prices are always calculated and charged in EGP server-side, with EGP/USD available as display currencies and the exchange-rate/currency-list admin-configurable for adding more later; the Privacy Policy and Terms & Conditions pages are live, admin-editable, and translated per §25.

Build a production-ready application. Do not build a prototype.
