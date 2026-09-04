import { beforeAll, afterAll, describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { Role } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter.js';
import { cleanDatabase, createTestApp, type TestContext } from './test-utils.js';

/**
 * §18 security-hardening assertions.
 *
 * What the harness DOES exercise:
 *   - ValidationPipe (whitelist + forbidNonWhitelisted), applied in
 *     createTestApp the same way bootstrap() applies it.
 *   - ThrottlerModule (global 60/min + per-route @Throttle on login).
 *   - The app's exception shape for handled errors (Nest defaults).
 *
 * What is deliberately NOT asserted over HTTP: Helmet security headers,
 * CORS, rawBody, cookie-parser and the LoggingInterceptor are wired in
 * src/main.ts ONLY. The e2e harness boots AppModule directly and never
 * calls bootstrap(), so those middleware are absent here — asserting
 * their headers would fail spuriously. AllExceptionsFilter is also
 * main.ts-wired, so we unit-test its production-vs-dev contract below
 * instead of over HTTP.
 *
 * Throttling note: the throttler store is per-app and in-memory, and it
 * is NOT reset between tests. This file fires 11 login requests in ONE
 * test (the only login traffic in this file) so the per-route 10/min
 * limit can't bleed into other tests.
 */

/** Seed a CUSTOMER directly in the DB so login has a target. */
async function seedCustomer(
  prisma: PrismaService,
  email: string,
  password: string,
): Promise<{ id: string; email: string }> {
  const bcrypt = await import('bcrypt');
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, 4),
      name: 'Seed Customer',
      role: Role.CUSTOMER,
    },
  });
  return { id: user.id, email: user.email };
}

describe('security: validation, rate limiting, error shape', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
  });

  it('ValidationPipe: unknown body fields → 400 (forbidNonWhitelisted)', async () => {
    const res = await request(ctx.http)
      .post('/api/auth/register')
      .send({
        email: 'extra@example.com',
        password: 'correct-horse-battery',
        name: 'Extra',
        // Not in RegisterDto — the global pipe must reject it.
        role: 'ADMIN',
      })
      .expect(400);
    expect(res.body.statusCode).toBe(400);
    expect(res.body.message).toBeDefined();
  });

  it('rate limiting: POST /api/auth/login throttled at 10/min → 429 on the 11th', async () => {
    const user = await seedCustomer(ctx.prisma, 'throttle@example.com', 'correct-horse-battery');

    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      const s = await request(ctx.http)
        .post('/api/auth/login')
        .send({ email: user.email, password: 'correct-horse-battery' })
        .then((r) => r.status);
      statuses.push(s);
    }

    // First 10 land inside the window, the 11th is throttled.
    expect(statuses.slice(0, 10)).toEqual(Array(10).fill(200));
    expect(statuses[10]).toBe(429);
  });
});

describe('security: AllExceptionsFilter unit contract (main.ts-wired, tested directly)', () => {
  function makeHost() {
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const requestObj = { method: 'POST', url: '/api/test' };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => requestObj,
      }),
    };
    return { response, host };
  }

  it('production: 500 responses do NOT leak a stack trace or internals', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const { response, host } = makeHost();
      const filter = new AllExceptionsFilter();
      filter.catch(new Error('boom'), host as never);
      const body = response.json.mock.calls[0][0] as Record<string, unknown>;
      expect(response.status).toHaveBeenCalledWith(500);
      expect(body.statusCode).toBe(500);
      expect(body.message).toBe('Internal server error');
      expect(body).not.toHaveProperty('stack');
      expect(body).not.toHaveProperty('error');
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it('non-production (test): the stack field is kept for debugging', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    try {
      const { response, host } = makeHost();
      const filter = new AllExceptionsFilter();
      filter.catch(new Error('boom'), host as never);
      const body = response.json.mock.calls[0][0] as Record<string, unknown>;
      expect(response.status).toHaveBeenCalledWith(500);
      expect(body.statusCode).toBe(500);
      expect(body).toHaveProperty('stack');
    } finally {
      process.env.NODE_ENV = prev;
    }
  });
});