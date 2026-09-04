import { beforeAll, afterAll, describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { cleanDatabase, createTestApp, type TestContext } from './test-utils.js';

describe('smoke: app boots against real DB', () => {
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

  it('boots and registers a user', async () => {
    const res = await request(ctx.http)
      .post('/api/auth/register')
      .send({ email: 'smoke@example.com', password: 'correct-horse-battery', name: 'Smoke' })
      .expect(201);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user.role).toBe('CUSTOMER');
  });
});
