import { beforeAll, afterAll, describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { cleanDatabase, createTestApp, seedTour, type TestContext } from './test-utils.js';

/**
 * e2e — public tours catalog (§7 / §9).
 *
 * All /api/tours read endpoints are @Public() (no auth required). The
 * service layer is responsible for excluding unpublished tours and
 * future-running availability. These tests assert that gating against the
 * real DB.
 */
describe('tours public catalog e2e', () => {
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

  it('GET /api/tours lists only published tours', async () => {
    await seedTour(ctx.prisma, { slug: 'published-tour', title: 'Published' });
    await seedTour(ctx.prisma, { slug: 'unpublished-tour', title: 'Hidden', isPublished: false });

    const res = await request(ctx.http).get('/api/tours').expect(200);

    const slugs = res.body.items.map((t: { slug: string }) => t.slug);
    expect(slugs).toContain('published-tour');
    expect(slugs).not.toContain('unpublished-tour');
  });

  it('GET /api/tours/:slug returns published detail; 404 for unpublished/nonexistent', async () => {
    await seedTour(ctx.prisma, { slug: 'detail-tour' });

    const res = await request(ctx.http).get('/api/tours/detail-tour').expect(200);
    expect(res.body.slug).toBe('detail-tour');
    expect(res.body.isPublished).toBe(true);

    await seedTour(ctx.prisma, { slug: 'hidden-tour', isPublished: false });
    // unpublished tour must not be exposed by slug detail
    const hidden = await request(ctx.http).get('/api/tours/hidden-tour').expect(404);
    expect(hidden.body.error).toBe('Not Found');

    await request(ctx.http).get('/api/tours/does-not-exist').expect(404);
  });

  it('GET /api/tours/:slug/availability returns only future dates with remaining capacity', async () => {
    const pub = await seedTour(ctx.prisma, { slug: 'avail-tour', capacity: 5 });

    // one future date with capacity 5
    const first = await request(ctx.http)
      .get(`/api/tours/avail-tour/availability`)
      .expect(200);
    expect(first.body).toHaveLength(1);
    expect(first.body[0].remainingCapacity).toBe(5);
    const dateId = first.body[0].id;

    // exhaust that date -> availability must drop it (remainingCapacity > 0 filter)
    await ctx.prisma.tourDate.update({
      where: { id: dateId },
      data: { remainingCapacity: 0 },
    });
    const afterExhaust = await request(ctx.http)
      .get(`/api/tours/avail-tour/availability`)
      .expect(200);
    expect(afterExhaust.body).toEqual([]);

    // a date wholly in the past must be excluded too (startDate >= now filter)
    await ctx.prisma.tourDate.create({
      data: {
        tourId: pub.tourId,
        startDate: new Date(Date.now() - 10 * 86400_000),
        endDate: new Date(Date.now() - 5 * 86400_000),
        capacity: 5,
        remainingCapacity: 5,
      },
    });
    const afterPast = await request(ctx.http)
      .get(`/api/tours/avail-tour/availability`)
      .expect(200);
    expect(afterPast.body).toEqual([]);
  });

  it('availability/date-gating: unpublished tour is not exposed', async () => {
    await seedTour(ctx.prisma, { slug: 'avail-hidden', isPublished: false });
    await request(ctx.http).get('/api/tours/avail-hidden/availability').expect(404);
    await request(ctx.http).get('/api/tours/avail-hidden').expect(404);
  });
});
