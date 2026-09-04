import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

/**
 * §21 — end-to-end integration tests against a real PostgreSQL.
 *
 * The app (AppModule → PrismaService) reads DATABASE_URL from env at
 * boot, so we inject the test connection here. The defaults point at
 * the local PORTABLE test Postgres provisioned by test/setup-test-db.sh
 * (PG 16.6, port 5433, db `dtrips_test`) — override any value with a
 * real env var (e.g. `TEST_DATABASE_URL=... npm run test:e2e`).
 *
 * Never point TEST_DATABASE_URL / DATABASE_URL at dev or prod.
 *
 * `db push` is run against the same URL in setup-test-db.sh before
 * the suite.
 */
const defaultTestUrl =
  process.env.DATABASE_URL ??
  'postgresql://dtrips@127.0.0.1:5433/dtrips_test';

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    // nodenext emits `.js` specifiers for `.ts` sources; let Vite map
    // `./x.js` → `./x.ts` even when the importer lives outside src/.
    extensions: ['.ts', '.tsx', '.js', '.mjs', '.json'],
  },
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    // e2e tests boot the full Nest app and hit a shared real DB; run
    // them serially so they can't corrupt each other's rows.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      // AppModule / PrismaService read these from process.env at boot.
      NODE_ENV: 'test',
      DATABASE_URL: defaultTestUrl,
      JWT_SECRET: 'e2e-test-jwt-secret-0123456789abcdef',
      JWT_REFRESH_SECRET: 'e2e-test-refresh-secret-0123456789',
      JWT_ACCESS_TTL: '15m',
      JWT_REFRESH_TTL: '7d',
      // NOTE: do NOT set BCRYPT_ROUNDS here. Env values are always
      // strings and `bcrypt.hash(pw, '12')` throws "Invalid salt"
      // (it expects a Number). The auth service's
      // `config.get('BCRYPT_ROUNDS', 12)` returns the numeric default
      // when the var is unset, so omitting it keeps hashing fast-ish
      // (12 rounds ≈ 250 ms) AND correct.
      APP_URL: 'http://localhost:3000',
      API_URL: 'http://localhost:3001',
      PORT: '3001',
      // Email is a no-op / FAILED-notification when Resend is unset —
      // the §12 contract is asserted via Notification rows, not live mail.
      EMAIL_FROM: 'test@d-trips.test',
      EMAIL_REPLY_TO: 'test@d-trips.test',
      // No Sentry traffic from tests.
      SENTRY_DSN: '',
      SENTRY_ENVIRONMENT: 'test',
      LOG_LEVEL: 'warn',
    },
  },
});
