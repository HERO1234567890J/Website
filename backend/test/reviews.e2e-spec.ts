import { beforeAll, afterAll, describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { BookingStatus, ReviewStatus } from '@prisma/client';
import { cleanDatabase, createAdmin, createTestApp, registerUser, seedTour, type TestContext } from './test-utils.js';

/**
 * e2e — reviews (§14) + admin moderation.
 *
 * Route map (verified):
 *   POST   /api/reviews                       JwtAccessGuard, 201 (default POST)
 *   GET    /api/reviews/tour/:tourId          @Public, 200
 *   GET    /api/reviews/me                    JwtAccessGuard, 200
 *   GET    /api/admin/reviews?status=         ADMIN, 200
 *   PATCH  /api/admin/reviews/:id/approve     ADMIN, 200
 *   PATCH  /api/admin/reviews/:id/reject      ADMIN, 200
 *
 * Eligibility (reviews.service.create, verified):
 *   - caller owns a Booking where userId===caller && tourId===dto.tourId
 *     && status===COMPLETED, and that booking has NO Review row yet.
 *   - else 403 ForbiddenException ("Only customers with a COMPLETED
 *     booking on this tour can submit a review.")
 *   - if the eligible booking already has a review -> 409 Conflict.
 *
 * We seed a COMPLETED booking directly via prisma to prove eligibility.
 *
 * Rate-limit note: /api/auth/register is @Throttle 10/min. This file uses
 * 9 registerUser calls total (well under the limit). beforeEach CLEANS the
 * DB, so a fresh auth user must be registered per test.
 */
describe('reviews e2e — create, eligibility, admin moderation', () => {
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

  async function completedBookingFor(userId: string, tourId: string) {
    return ctx.prisma.booking.create({
      data: {
        userId,
        guestEmail: `guest-${Date.now()}@example.com`,
        guestName: 'Guest',
        origin: 'TOUR',
        tourId,
        travelerCount: 1,
        travelerNames: [],
        subtotal: 100000,
        discountAmount: 0,
        total: 100000,
        currency: 'EGP',
        status: BookingStatus.COMPLETED,
        consentAcceptedAt: new Date(),
        idempotencyKey: `review-booking-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      },
    });
  }

  function validReview(tourId: string, overrides: Record<string, unknown> = {}) {
    return {
      tourId,
      rating: 5,
      body: 'An absolutely wonderful tour experience. Highly recommended.',
      ...overrides,
    };
  }

  it('customer with a COMPLETED booking can create a review (201, PENDING); DTO rejects bad rating/body (400)', async () => {
    const me = await registerUser(ctx.http);
    const seeded = await seedTour(ctx.prisma);
    await completedBookingFor(me.userId, seeded.tourId);

    const res = await request(ctx.http)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${me.token}`)
      .send(validReview(seeded.tourId))
      .expect(201);

    expect(res.body.status).toBe(ReviewStatus.PENDING);
    expect(res.body.rating).toBe(5);
    expect(res.body.tourId).toBe(seeded.tourId);
    expect(res.body.userId).toBe(me.userId);

    const row = await ctx.prisma.review.findUnique({ where: { id: res.body.id } });
    expect(row!.status).toBe(ReviewStatus.PENDING);

    // DTO validation (rating out of range, body too short)
    const badRating = await request(ctx.http)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${me.token}`)
      .send(validReview(seeded.tourId, { rating: 6 }))
      .expect(400);
    expect(badRating.body.message).toBeTruthy();

    await request(ctx.http)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${me.token}`)
      .send(validReview(seeded.tourId, { body: 'short' }))
      .expect(400);
  });

  it('ineligible: no COMPLETED booking (or another user owns it) is rejected (403)', async () => {
    const me = await registerUser(ctx.http);
    const other = await registerUser(ctx.http);
    const seeded = await seedTour(ctx.prisma);
    // A COMPLETED booking exists, but for the OTHER user, not `me`.
    await completedBookingFor(other.userId, seeded.tourId);

    const res = await request(ctx.http)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${me.token}`)
      .send(validReview(seeded.tourId))
      .expect(403);

    expect(res.body.message).toContain('COMPLETED booking');
  });

  it('a booking in a non-COMPLETED state (PAID) does not grant eligibility (403)', async () => {
    const me = await registerUser(ctx.http);
    const seeded = await seedTour(ctx.prisma);
    await ctx.prisma.booking.create({
      data: {
        userId: me.userId,
        guestEmail: `guest-${Date.now()}@example.com`,
        guestName: 'Guest',
        origin: 'TOUR',
        tourId: seeded.tourId,
        travelerCount: 1,
        travelerNames: [],
        subtotal: 100000,
        discountAmount: 0,
        total: 100000,
        currency: 'EGP',
        status: BookingStatus.PAID,
        consentAcceptedAt: new Date(),
        idempotencyKey: `review-paid-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      },
    });

    await request(ctx.http)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${me.token}`)
      .send(validReview(seeded.tourId))
      .expect(403);
  });

  it('already reviewed booking -> 409 Conflict (one review per booking)', async () => {
    const me = await registerUser(ctx.http);
    const seeded = await seedTour(ctx.prisma);
    const booking = await completedBookingFor(me.userId, seeded.tourId);

    await request(ctx.http)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${me.token}`)
      .send(validReview(seeded.tourId))
      .expect(201);

    const second = await request(ctx.http)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${me.token}`)
      .send(validReview(seeded.tourId))
      .expect(409);

    expect(second.body.message).toContain('already exists');
    expect(booking.id).toBeTruthy();
  });

  it('public list shows only PUBLISHED reviews; a PENDING review is hidden', async () => {
    const me = await registerUser(ctx.http);
    const seeded = await seedTour(ctx.prisma);
    await completedBookingFor(me.userId, seeded.tourId);

    await request(ctx.http)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${me.token}`)
      .send(validReview(seeded.tourId))
      .expect(201);

    const pub = await request(ctx.http)
      .get(`/api/reviews/tour/${seeded.tourId}`)
      .expect(200);
    expect(pub.body).toEqual([]);
  });

  it('admin moderation approve: pending in admin list -> published in public list with publishedAt + audit', async () => {
    const admin = await createAdmin(ctx.prisma);
    const adminLogin = await request(ctx.http)
      .post('/api/auth/login')
      .send({ email: admin.email, password: admin.password })
      .expect(200);
    const adminToken = adminLogin.body.accessToken;

    const me = await registerUser(ctx.http);
    const seeded = await seedTour(ctx.prisma);
    await completedBookingFor(me.userId, seeded.tourId);
    const created = await request(ctx.http)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${me.token}`)
      .send(validReview(seeded.tourId))
      .expect(201);
    const reviewId = created.body.id;

    const inbox = await request(ctx.http)
      .get('/api/admin/reviews')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(inbox.body.total).toBe(1);
    expect(inbox.body.items[0].id).toBe(reviewId);

    const before = await request(ctx.http)
      .get(`/api/reviews/tour/${seeded.tourId}`)
      .expect(200);
    expect(before.body).toEqual([]);

    const approved = await request(ctx.http)
      .patch(`/api/admin/reviews/${reviewId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(approved.body.status).toBe(ReviewStatus.PUBLISHED);
    expect(approved.body.publishedAt).toBeTruthy();

    const after = await request(ctx.http)
      .get(`/api/reviews/tour/${seeded.tourId}`)
      .expect(200);
    expect(after.body).toHaveLength(1);
    expect(after.body[0].id).toBe(reviewId);

    const audit = await ctx.prisma.auditLog.findFirst({
      where: { action: 'REVIEW_PUBLISHED', entityId: reviewId },
    });
    expect(audit).toBeTruthy();
    expect(audit!.adminUserId).toBe(admin.id);
  });

  it('admin moderation reject: -> excluded from public list, marked REJECTED', async () => {
    const admin = await createAdmin(ctx.prisma);
    const adminLogin = await request(ctx.http)
      .post('/api/auth/login')
      .send({ email: admin.email, password: admin.password })
      .expect(200);
    const adminToken = adminLogin.body.accessToken;

    const me = await registerUser(ctx.http);
    const seeded = await seedTour(ctx.prisma);
    await completedBookingFor(me.userId, seeded.tourId);
    const created = await request(ctx.http)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${me.token}`)
      .send(validReview(seeded.tourId))
      .expect(201);
    const reviewId = created.body.id;

    await request(ctx.http)
      .patch(`/api/admin/reviews/${reviewId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'off-topic' })
      .expect(200);

    const rejected = await ctx.prisma.review.findUnique({ where: { id: reviewId } });
    expect(rejected!.status).toBe(ReviewStatus.REJECTED);

    const pub = await request(ctx.http)
      .get(`/api/reviews/tour/${seeded.tourId}`)
      .expect(200);
    expect(pub.body).toEqual([]);
  });

  it('non-admin cannot access the admin reviews endpoints (403)', async () => {
    const me = await registerUser(ctx.http);
    await request(ctx.http)
      .get('/api/admin/reviews')
      .set('Authorization', `Bearer ${me.token}`)
      .expect(403);
  });
});
