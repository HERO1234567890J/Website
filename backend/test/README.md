# Backend test suites (§21)

This directory holds the backend test suites:

- **Unit tests** (`src/**/*.spec.ts`) — mocked, no DB. Run with
  `npx vitest run --config ./vitest.config.ts`.
- **e2e integration tests** (`test/**/*.e2e-spec.ts`) — boot the full Nest
  `AppModule` against a **real PostgreSQL** test database. Run serially
  (`fileParallelism: false`). Sharing a real DB lets the suite exercise
  concurrency (serializable transactions), idempotency, and payment
  webhooks that unit tests cannot.

## Test database bootstrap

The e2e config (`vitest.config.e2e.ts`) injects `DATABASE_URL`; it defaults
to a local portable Postgres unless overridden:

```
DATABASE_URL=postgresql://dtrips@127.0.0.1:5433/dtrips_test
```

Bring the DB up and apply the schema before the first run:

1. Start a local Postgres (e.g. the portable PG 16.6 binary on port `5433`,
   database `dtrips_test`, trust auth).
2. Push the Prisma schema so all tables exist:

   ```
   npx prisma db push
   ```

3. Never point `DATABASE_URL` / `TEST_DATABASE_URL` at dev or prod.

The harness truncates every table (except `_prisma_migrations`) before each
suite (`cleanDatabase` in `test/test-utils.ts`), so the DB is erased between
suites.

## Running the suites

Because each e2e file boots the app and imports take ~90-160s, run e2e files
**in small groups** (2-3 at a time) rather than the whole suite at once:

```bash
# single file first when unsure
npx vitest run --config ./vitest.config.e2e.ts test/bookings.e2e-spec.ts

# small groups
npx vitest run --config ./vitest.config.e2e.ts test/payments.e2e-spec.ts test/reviews.e2e-spec.ts
```

Use a generous timeout (Vitest per-file ~180s+; shell timeouts ≥400s). The
full e2e suite takes ~10+ minutes and can appear to "hang" purely from the
accumulated import/transform time — the per-file breakdown shows ~100-190s
each.

Static checks:

```bash
npx tsc --noEmit   # 0 errors expected
npx oxlint         # backend + frontend
```

## Environment notes

- **Do NOT set `BCRYPT_ROUNDS`** in the e2e env: env values are strings and
  `bcrypt.hash(pw, '12')` throws `Invald salt` (it wants a Number). Omit the
  var so `ConfigService.get('BCRYPT_ROUNDS', 12)` returns the numeric default.
- `JWT_SECRET`, `JWT_REFRESH_SECRET`, `APP_URL`, `API_URL`, `PORT`,
  `EMAIL_*`, `LOG_LEVEL` are injected by the config so the app boots in a
  hermetic test environment; Sentry is disabled (`SENTRY_DSN: ''`).
