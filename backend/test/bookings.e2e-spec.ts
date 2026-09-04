import { beforeAll, afterAll, describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { BookingStatus } from '@prisma/client';
import { cleanDatabase, createTestApp, registerUser, seedTour, type TestContext } from './test-utils.js';

/**
 * e2e — bookings concurrency/capacity guarantees (§8 / §10 / §11).
 *
 * These are the real-Postgres integration tests that mock tests cannot
 * do: the `SELECT ... FOR UPDATE` row lock inside createBooking, the
 * Idempotency-Key short-circuit (unique index on Booking.idempotencyKey),
 * and the server-authoritative price. The throttler on POST /api/bookings
 * is 10/min, so this file keeps POSTs to that route well under the limit
 * (<=8 total).
 *
 * NOTE (verified from source): the CreateBookingDto@ValidateIf for
 * guestEmail/guestName reads `_isAuthenticated`, but the global
 * ValidationPipe runs BEFORE the controller sets that sentinel — so even
 * authenticated customers must supply guestEmail + guestName in the body.
 * Every booking POST below therefore includes them.
 */
describe('bookings e2e — capacity, idempotency, concurrency', () => {
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

  async function customer() {
    return registerUser(ctx.http);
  }

  function bookingBody(tourDateId: string, tourId: string, overrides: Partial<Record<string, unknown>> = {}) {
    return {
      origin: 'TOUR',
      tourId,
      tourDateId,
      travelerCount: 1,
      consentAcceptedAt: new Date().toISOString(),
      guestEmail: `guest-${Math.random()}@example.com`,
      guestName: 'Guest',
      ...overrides,
    };
  }

  it('creates a booking with server-side price and decrements capacity by exactly 1', async () => {
    const seeded = await seedTour(ctx.prisma, { capacity: 10, startingPrice: 100000 });
    const me = await customer();

    const res = await request(ctx.http)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${me.token}`)
      .set('Idempotency-Key', 'create-key-abcdef123')
      .send(bookingBody(seeded.dateId, seeded.tourId))
      .expect(201);

    expect(res.body.origin).toBe('TOUR');
    expect(res.body.status).toBe(BookingStatus.PENDING);
    expect(res.body.subtotal).toBe(100000);
    expect(res.body.total).toBe(100000);
    expect(res.body.travelerCount).toBe(1);

    const td = await ctx.prisma.tourDate.findUnique({ where: { id: seeded.dateId } });
    expect(td!.remainingCapacity).toBe(9);
  });

  it('rejects a second booking when capacity is exhausted (409)', async () => {
    const seeded = await seedTour(ctx.prisma, { capacity: 1 });
    const a = await customer();
    const b = await customer();

    await request(ctx.http)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${a.token}`)
      .set('Idempotency-Key', 'exhaust-first-aaa')
      .send(bookingBody(seeded.dateId, seeded.tourId))
      .expect(201);

    const second = await request(ctx.http)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${b.token}`)
      .set('Idempotency-Key', 'exhaust-second-bbb')
      .send(bookingBody(seeded.dateId, seeded.tourId))
      .expect(409);

    expect(second.body.message).toContain('Only 0 seat(s) remaining');

    const td = await ctx.prisma.tourDate.findUnique({ where: { id: seeded.dateId } });
    expect(td!.remainingCapacity).toBe(0);
  });

  it('Idempotency-Key: same key + body returns the SAME booking without double-decrement', async () => {
    const seeded = await seedTour(ctx.prisma, { capacity: 5 });
    const me = await customer();
    const key = 'idem-key-abcdefghi';

    const first = await request(ctx.http)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${me.token}`)
      .set('Idempotency-Key', key)
      .send(bookingBody(seeded.dateId, seeded.tourId))
      .expect(201);

    const second = await request(ctx.http)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${me.token}`)
      .set('Idempotency-Key', key)
      .send(bookingBody(seeded.dateId, seeded.tourId))
      .expect(201);

    expect(second.body.id).toBe(first.body.id);
    // both responses identical (same booking row, same status)
    expect(second.body.status).toBe(first.body.status);
    expect(second.body.total).toBe(first.body.total);

    const td = await ctx.prisma.tourDate.findUnique({ where: { id: seeded.dateId } });
    // decremented exactly once despite two requests
    expect(td!.remainingCapacity).toBe(4);

    // and only one Booking row exists for the key
    const count = await ctx.prisma.booking.count({ where: { idempotencyKey: key } });
    expect(count).toBe(1);
  });

  it('concurrent double-booking on capacity-1 date: exactly one wins (201), other fails (409)', async () => {
    const seeded = await seedTour(ctx.prisma, { capacity: 1 });
    const a = await customer();
    const b = await customer();

    const [ra, rb] = await Promise.all([
      request(ctx.http)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${a.token}`)
        .set('Idempotency-Key', 'concurrent-a-11111')
        .send(bookingBody(seeded.dateId, seeded.tourId)),
      request(ctx.http)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${b.token}`)
        .set('Idempotency-Key', 'concurrent-b-22222')
        .send(bookingBody(seeded.dateId, seeded.tourId)),
    ]);

    const statuses = [ra.status, rb.status].sort();
    expect(statuses).toEqual([201, 409]);

    const loser = ra.status === 409 ? ra : rb;
    // The loser may fail either because capacity ran out (seat check) or
    // because a serializable-transaction serialization conflict surfaced.
    const msg = String(loser.body.message ?? '');
    expect(
      msg.includes('Only 0 seat(s) remaining') ||
        msg.includes('updated concurrently'),
    ).toBe(true);

    const td = await ctx.prisma.tourDate.findUnique({ where: { id: seeded.dateId } });
    expect(td!.remainingCapacity).toBe(0);

    const booked = await ctx.prisma.booking.count({ where: { tourDateId: seeded.dateId } });
    expect(booked).toBe(1);
  });

  it('customer cancellation: status -> CANCELLED but capacity is NOT released', async () => {
    const seeded = await seedTour(ctx.prisma, { capacity: 5 });
    const me = await customer();

    // Seed the booking directly (authenticated owner) so the customer
    // cancellation path is exercised (POST /api/bookings creates a guest
    // booking with userId=null).
    const created = await ctx.prisma.booking.create({
      data: {
        userId: me.userId,
        guestEmail: me.email,
        guestName: 'Test',
        origin: 'TOUR',
        tourId: seeded.tourId,
        tourDateId: seeded.dateId,
        travelerCount: 1,
        travelerNames: [],
        subtotal: 100000,
        discountAmount: 0,
        total: 100000,
        currency: 'EGP',
        status: BookingStatus.PENDING,
        consentAcceptedAt: new Date(),
        idempotencyKey: `cancel-create-${Date.now()}`,
      },
    });

    // A real create decrements remainingCapacity (5 -> 4); mirror that here
    // since we seed the booking directly rather than via POST.
    await ctx.prisma.tourDate.update({
      where: { id: seeded.dateId },
      data: { remainingCapacity: 4 },
    });

    const tdBefore = await ctx.prisma.tourDate.findUnique({ where: { id: seeded.dateId } });
    expect(tdBefore!.remainingCapacity).toBe(4);

    const cancelled = await request(ctx.http)
      .post(`/api/bookings/${created.id}/cancel`)
      .set('Authorization', `Bearer ${me.token}`)
      .send({ reason: 'change of plans' });
    expect(cancelled.status).toBe(200);

    expect(cancelled.body.status).toBe(BookingStatus.CANCELLED);

    // VERIFIED from source (cancelByCustomer): it only flips status to
    // CANCELLED; remainingCapacity is NOT incremented back.
    const tdAfter = await ctx.prisma.tourDate.findUnique({ where: { id: seeded.dateId } });
    expect(tdAfter!.remainingCapacity).toBe(4);
  });

  it('customer cannot cancel a booking in a non-cancellable (CONFIRMED) state (409)', async () => {
    const seeded = await seedTour(ctx.prisma, { capacity: 5 });
    const me = await customer();

    // Seed a booking directly via prisma in CONFIRMED (not in
    // CUSTOMER_CANCELLABLE = {PENDING, PAYMENT_PENDING}).
    const booking = await ctx.prisma.booking.create({
      data: {
        userId: me.userId,
        guestEmail: me.email,
        guestName: 'Test',
        origin: 'TOUR',
        tourId: seeded.tourId,
        tourDateId: seeded.dateId,
        travelerCount: 1,
        travelerNames: [],
        subtotal: 100000,
        discountAmount: 0,
        total: 100000,
        currency: 'EGP',
        status: BookingStatus.CONFIRMED,
        consentAcceptedAt: new Date(),
        idempotencyKey: `noncancellable-${Date.now()}`,
      },
    });

    const res = await request(ctx.http)
      .post(`/api/bookings/${booking.id}/cancel`)
      .set('Authorization', `Bearer ${me.token}`)
      .send({})
      .expect(409);

    expect(res.body.message).toContain('cannot be self-cancelled');

    const still = await ctx.prisma.booking.findUnique({ where: { id: booking.id } });
    expect(still!.status).toBe(BookingStatus.CONFIRMED);
  });
});
