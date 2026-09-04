import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { Role } from '@prisma/client';

/**
 * §21 — e2e test harness.
 *
 * Boots the full Nest AppModule against the configured TEST database
 * (see test/README.md for the required DATABASE_URL + `db push` step).
 *
 * The AppModule's ConfigModule reads env at boot — so set the env
 * BEFORE importing AppModule (top of file or via a seed setup).
 *
 * Email is a no-op when RESEND_API_KEY is empty: EmailRetryService
 * marks the Notification row RETRYING but never throws, so booking /
 * payment state is unaffected — which is exactly the §12 contract we
 * assert on elsewhere.
 *
 * Rate limiting (ThrottlerModule, §18) is active globally with
 * 60 req/min; the per-endpoint overrides (login 10/min, bookings
 * 10/min, payments 10/min) mean tests MUST NOT fire >10 calls per
 * second to those routes. We clear the throttler cache between tests.
 *
 * The harness mirrors the parts of main.ts that the module graph needs:
 *   - `rawBody: true` — the EasyCash webhook controller reads
 *     `req.rawBody` (missing bytes → 400 "Raw body unavailable").
 *   - `cookieParser()` — JwtRefreshGuard reads `req.cookies`.
 * Everything else (helmet, CORS, AllExceptionsFilter, LoggingInterceptor)
 * lives in `bootstrap()`/main.ts and is NOT exercised here; those are
 * covered by unit tests (see security.e2e-spec.ts).
 */

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
  http: ReturnType<INestApplication['getHttpServer']>;
}

/** Build + boot the Nest app against the current TEST_DATABASE_URL. */
export async function createTestApp(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication<INestApplication>({
    rawBody: true,
  });
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();

  const prisma = moduleRef.get(PrismaService);
  const http = app.getHttpServer();
  return { app, prisma, http };
}

/** Wipe the DB to a clean slate. Run BEFORE each suite's tests. */
export async function cleanDatabase(prisma: PrismaService): Promise<void> {
  const tablenames = await prisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

  const tables = tablenames
    .map((t) => t.tablename)
    .filter((n) => n !== '_prisma_migrations');

  const defer = [];
  for (const table of tables) {
    defer.push(`"${table}"`);
  }
  if (defer.length === 0) return;
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${defer.join(', ')} RESTART IDENTITY CASCADE`);
}

/** Register a plain CUSTOMER user, return their JWT access token. */
export async function registerUser(
  http: ReturnType<INestApplication['getHttpServer']>,
  overrides: Partial<{ email: string; name: string; phone: string }> = {},
): Promise<{ token: string; email: string; userId: string }> {
  const email = overrides.email ?? `user-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const res = await request(http)
    .post('/api/auth/register')
    .send({ email, password: 'correct-horse-battery', name: overrides.name ?? 'Test User', phone: overrides.phone })
    .expect(201);
  return {
    token: res.body.accessToken,
    email,
    userId: res.body.user.id,
  };
}

/** Seed a category + published tour + a future TourDate with capacity. */
export async function seedTour(
  prisma: PrismaService,
  overrides: Partial<{
    slug: string;
    title: string;
    startingPrice: number;
    durationDays: number;
    capacity: number;
    isPublished: boolean;
  }> = {},
): Promise<{ id: string; tourId: string; dateId: string }> {
  const slug = overrides.slug ?? `tour-${Date.now()}-${Math.random().toString(36).slice(0, 6)}`;
  const category = await prisma.category.create({
    data: { slug: `cat-${slug}`, name: 'Category', isActive: true, displayOrder: 0 },
  });
  const tour = await prisma.tour.create({
    data: {
      slug,
      title: overrides.title ?? 'A Test Tour',
      shortDescription: 'Short description for the test tour.',
      description: 'Full description.',
      categoryId: category.id,
      startingPrice: overrides.startingPrice ?? 100000, // EGP piasters (1000 EGP)
      currency: 'EGP',
      durationDays: overrides.durationDays ?? 3,
      isPublished: overrides.isPublished ?? true,
      itinerary: [],
      included: ['Meals'],
      excluded: ['Flights'],
    },
  });
  const startDate = new Date(Date.now() + 30 * 86400_000);
  const endDate = new Date(startDate.getTime() + 7 * 86400_000);
  const date = await prisma.tourDate.create({
    data: {
      tourId: tour.id,
      startDate,
      endDate,
      capacity: overrides.capacity ?? 10,
      remainingCapacity: overrides.capacity ?? 10,
    },
  });
  return { id: tour.id, tourId: tour.id, dateId: date.id };
}

/** Create an ADMIN user directly in the DB (bypasses register). */
export async function createAdmin(
  prisma: PrismaService,
  password = 'admin-secret-123',
): Promise<{ id: string; email: string; password: string }> {
  const bcrypt = await import('bcrypt');
  const email = `admin-${Date.now()}@d-trips.test`;
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, 4),
      name: 'Admin',
      role: Role.ADMIN,
    },
  });
  return { id: user.id, email, password };
}
