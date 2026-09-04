import { beforeAll, afterAll, describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { cleanDatabase, createTestApp, type TestContext } from './test-utils.js';

/**
 * Full auth flow against the real DB: register, login, refresh-rotation
 * (cookie), logout, and the users/me + isBlocked paths.
 *
 * NOTE: cookie-parser is wired in src/main.ts only, but the e2e harness
 * boots AppModule directly (no bootstrap()). JwtRefreshGuard reads the
 * refresh token from `req.cookies`, so the harness applies cookie-parser
 * in createTestApp() (see test-utils.ts) — auth tests can rely on it.
 * Everything else that matters (ValidationPipe, Throttler, AppModule
 * providers) is already active in the harness.
 *
 * Throttling: register + login are @Throttle 10/min. This file stays
 * under 10 register hits and 10 login hits within the 60s window (9
 * register + 2 login total) so we never trip our own rate limit.
 */

/** Decode the payload segment of a JWT (HS256 — payload is base64url). */
function jwtPayload(token: string): Record<string, unknown> {
  const [, payload] = token.split('.');
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
}

/** Extract the refresh_token value from a response's Set-Cookie header. */
function refreshCookieFrom(
  res: { headers: Record<string, string | string[] | undefined> },
): string {
  const raw = res.headers['set-cookie'];
  const lines = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [];
  const line = lines.find((c) => c.startsWith('refresh_token='));
  if (!line) throw new Error('No refresh_token cookie in Set-Cookie header');
  return line.split(';')[0].slice('refresh_token='.length).trim();
}

describe('auth: register / login / refresh / me / logout against real DB', () => {
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

  it('register: 201 + accessToken + httpOnly refresh cookie, JWT has sub/email/role', async () => {
    const res = await request(ctx.http)
      .post('/api/auth/register')
      .send({
        email: 'AuthE2E@Example.com',
        password: 'correct-horse-battery',
        name: 'Auth E2E',
      })
      .expect(201);

    expect(res.body.accessToken).toBeTruthy();
    // The refresh token never appears in the JSON body — cookie only.
    expect(res.body.refreshToken).toBeUndefined();
    expect(res.body.expiresIn).toBe(900); // 15m
    expect(res.body.user.email).toBe('authe2e@example.com'); // lowercased
    expect(res.body.user.role).toBe('CUSTOMER');

    const payload = jwtPayload(res.body.accessToken);
    expect(payload.sub).toBe(res.body.user.id);
    expect(payload.email).toBe('authe2e@example.com');
    expect(payload.role).toBe('CUSTOMER');

    const setCookie = res.headers['set-cookie'];
    const cookieLine = (
      Array.isArray(setCookie) ? setCookie : typeof setCookie === 'string' ? [setCookie] : []
    ).find((c) => c.startsWith('refresh_token='));
    expect(cookieLine).toBeTruthy();
    expect(cookieLine).toContain('HttpOnly');
    expect(cookieLine).toContain('SameSite=Lax');
  });

  it('register: duplicate email → 409 with generic message', async () => {
    await ctx.prisma.user.create({
      data: {
        email: 'dup@example.com',
        passwordHash:
          '$2b$12$0000000000000000000000.0000000000000000000000000000000000',
        name: 'Seed',
      },
    });

    const res = await request(ctx.http)
      .post('/api/auth/register')
      .send({
        email: 'DUP@Example.com',
        password: 'correct-horse-battery',
        name: 'Seed 2',
      })
      .expect(409);

    expect(res.body).toMatchObject({
      statusCode: 409,
      message: 'Could not register with these details.',
      error: 'Conflict',
    });
  });

  it('register: invalid payload → 400 (ValidationPipe whitelist/forbidNonWhitelisted)', async () => {
    // Missing password + bad email + empty name → class-validator failures.
    const missing = await request(ctx.http)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', name: '' })
      .expect(400);
    expect(missing.body.statusCode).toBe(400);
    expect(Array.isArray(missing.body.message)).toBe(true);

    // Unknown field → forbidNonWhitelisted rejects it.
    const extra = await request(ctx.http)
      .post('/api/auth/register')
      .send({
        email: 'extrafield@example.com',
        password: 'correct-horse-battery',
        name: 'Extra',
        isAdmin: true,
      })
      .expect(400);
    expect(extra.body.statusCode).toBe(400);
  });

  it('login: correct credentials → 200 + tokens/cookie; wrong password → 401 generic', async () => {
    await request(ctx.http)
      .post('/api/auth/register')
      .send({
        email: 'login@example.com',
        password: 'correct-horse-battery',
        name: 'Login',
      })
      .expect(201);

    const ok = await request(ctx.http)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'correct-horse-battery' })
      .expect(200);
    expect(ok.body.accessToken).toBeTruthy();
    expect(ok.body.refreshToken).toBeUndefined();
    expect(ok.body.user.email).toBe('login@example.com');
    expect(refreshCookieFrom(ok)).toBeTruthy();

    const bad = await request(ctx.http)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'wrong-password' })
      .expect(401);
    expect(bad.body).toMatchObject({
      statusCode: 401,
      message: 'Invalid email or password.',
      error: 'Unauthorized',
    });
  });

  it('refresh: rotates with the refresh cookie; no cookie and replayed tokens → 401', async () => {
    const reg = await request(ctx.http)
      .post('/api/auth/register')
      .send({
        email: 'refresh@example.com',
        password: 'correct-horse-battery',
        name: 'Refresh',
      })
      .expect(201);
    const c1 = refreshCookieFrom(reg);

    // No cookie → guard rejects before any DB lookup.
    const noCookie = await request(ctx.http).post('/api/auth/refresh').expect(401);
    expect(noCookie.body.message).toBe('Refresh token required.');

    // Valid cookie → 200 with a NEW access token + rotated cookie.
    const rot = await request(ctx.http)
      .post('/api/auth/refresh')
      .set('Cookie', `refresh_token=${c1}`)
      .expect(200);
    expect(rot.body.accessToken).toBeTruthy();
    expect(rot.body.refreshToken).toBeUndefined();
    expect(rot.body.user.email).toBe('refresh@example.com');
    expect(refreshCookieFrom(rot)).toBeTruthy();

    // The old token was rotated (revoked) — replaying it must fail.
    const replay = await request(ctx.http)
      .post('/api/auth/refresh')
      .set('Cookie', `refresh_token=${c1}`)
      .expect(401);
    expect(replay.body.message).toBe('Refresh token not recognized.');
  });

  it('GET /api/users/me: with access token → 200 user view; without token → 401', async () => {
    const reg = await request(ctx.http)
      .post('/api/auth/register')
      .send({
        email: 'me@example.com',
        password: 'correct-horse-battery',
        name: 'Me',
      })
      .expect(201);

    const me = await request(ctx.http)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${reg.body.accessToken}`)
      .expect(200);
    expect(me.body.id).toBe(reg.body.user.id);
    expect(me.body.email).toBe('me@example.com');
    expect(me.body.role).toBe('CUSTOMER');
    expect(me.body).toHaveProperty('emailVerifiedAt'); // null until verified
    expect(me.body).toHaveProperty('bookingEmails');
    expect(me.body).not.toHaveProperty('passwordHash');

    const noAuth = await request(ctx.http).get('/api/users/me').expect(401);
    expect(noAuth.body.message).toBe('Missing bearer token.');
  });

  it('blocked user: /api/users/me → 403 (guard re-checks isBlocked on every request)', async () => {
    const reg = await request(ctx.http)
      .post('/api/auth/register')
      .send({
        email: 'blocked@example.com',
        password: 'correct-horse-battery',
        name: 'Blocked',
      })
      .expect(201);

    await ctx.prisma.user.update({
      where: { id: reg.body.user.id },
      data: { isBlocked: true },
    });

    const blocked = await request(ctx.http)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${reg.body.accessToken}`)
      .expect(403);
    expect(blocked.body).toMatchObject({
      statusCode: 403,
      message: 'Account is blocked. Please contact support.',
      error: 'Forbidden',
    });
  });

  it('logout: revokes refresh tokens; subsequent refresh with old cookie → 401', async () => {
    const reg = await request(ctx.http)
      .post('/api/auth/register')
      .send({
        email: 'logout@example.com',
        password: 'correct-horse-battery',
        name: 'Logout',
      })
      .expect(201);
    const c1 = refreshCookieFrom(reg);

    const out = await request(ctx.http)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${reg.body.accessToken}`)
      .expect(200);
    expect(out.body).toEqual({ ok: true });

    // Server-side the row is revoked → refresh with the old cookie fails.
    const afterLogout = await request(ctx.http)
      .post('/api/auth/refresh')
      .set('Cookie', `refresh_token=${c1}`)
      .expect(401);
    expect(afterLogout.body.message).toBe('Refresh token not recognized.');
  });
});