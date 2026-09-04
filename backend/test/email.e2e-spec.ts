import { beforeAll, afterAll, describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { EmailEventType, NotificationStatus } from '@prisma/client';
import { cleanDatabase, createTestApp, registerUser, seedTour, type TestContext } from './test-utils.js';

/**
 * e2e — email idempotency + no-Resend no-throw behavior (§12).
 *
 * VERIFIED from source (email.service.ts dispatch / email-retry.service.ts):
 *   - When RESEND_API_KEY is EMPTY (as in the vitest.config.e2e.ts env),
 *     EmailRetryService.onModuleInit returns early and `this.resend` stays
 *     null. attemptResend() returns `false` immediately and NEVER touches
 *     the DB to FAIL the row.
 *   - firstAttempt() FIRST calls markRetrying() (sets status RETRYING,
 *     attempts=1) and then attemptResend() returns false. So the final
 *     Notification row status is RETRYING — NOT FAILED as the brief
 *     assumed. (If resend WERE configured and the API rejected/threw,
 *     the row would end up FAILED via markFailed.)
 *   - EmailService.dispatch wraps the retry call in try/catch and never
 *     rethrows (§12), so a missing Resend key can never fail a
 *     registration / booking.
 *   - Idempotency: Notification.idempotencyKey is @unique and the upsert
 *     is update:{} (never overwrites). A repeated dispatch for the same
 *     logical event keys to the SAME row; a second trigger does not
 *     create a duplicate.
 *
 * Triggers used (cheapest DB-triggering routes):
 *   - POST /api/auth/register      -> sendWelcomeEmail (WELCOME)
 *   - POST /api/bookings           -> sendBookingCreated (BOOKING_CREATED)
 */
describe('email e2e — notification idempotency + no-throw when Resend unset', () => {
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

  it('registration writes a WELCOME Notification row and does NOT throw despite no Resend key', async () => {
    const res = await request(ctx.http)
      .post('/api/auth/register')
      .send({
        email: `welcome-${Date.now()}@example.com`,
        password: 'correct-horse-battery',
        name: 'Welcome Tester',
      })
      .expect(201);

    // registration succeeded => welcome email dispatch did not throw
    expect(res.body.user.id).toBeTruthy();

    const userId = res.body.user.id;
    const rows = await ctx.prisma.notification.findMany({
      where: {
        eventType: EmailEventType.WELCOME,
        idempotencyKey: `welcome:${userId}`,
      },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].recipientEmail).toBe(res.body.user.email);
    expect(rows[0].bookingId).toBeNull();

    // VERIFIED: with no Resend the row lands in RETRYING (markRetrying ran,
    // then attemptResend returned false without marking FAILED).
    expect(rows[0].status).toBe(NotificationStatus.RETRYING);
    expect(rows[0].attempts).toBe(1);
  });

  it('booking creation writes a BOOKING_CREATED Notification row, and re-POSTing the same Idempotency-Key does NOT create a second row', async () => {
    const me = await registerUser(ctx.http);
    const seeded = await seedTour(ctx.prisma);
    const key = `email-booking-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const body = {
      origin: 'TOUR',
      tourId: seeded.tourId,
      tourDateId: seeded.dateId,
      travelerCount: 1,
      consentAcceptedAt: new Date().toISOString(),
      guestEmail: `guest-${Date.now()}@example.com`,
      guestName: 'Guest',
    };

    const first = await request(ctx.http)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${me.token}`)
      .set('Idempotency-Key', key)
      .send(body)
      .expect(201);
    const bookingId = first.body.id;

    // one BOOKING_CREATED row, keyed by idempotencyKey booking-created:<id>
    const afterFirst = await ctx.prisma.notification.findMany({
      where: {
        eventType: EmailEventType.BOOKING_CREATED,
        idempotencyKey: `booking-created:${bookingId}`,
      },
    });
    expect(afterFirst).toHaveLength(1);

    // re-POST the SAME Idempotency-Key -> same booking, same idempotencyKey
    const second = await request(ctx.http)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${me.token}`)
      .set('Idempotency-Key', key)
      .send(body)
      .expect(201);
    expect(second.body.id).toBe(bookingId);

    // idempotency short-circuit in createBooking returns the existing
    // booking BEFORE the sendBookingCreated side-effect, so no 2nd row.
    const afterSecond = await ctx.prisma.notification.findMany({
      where: {
        eventType: EmailEventType.BOOKING_CREATED,
        idempotencyKey: `booking-created:${bookingId}`,
      },
    });
    expect(afterSecond).toHaveLength(1);

    // booking state intact despite empty Resend key
    const booking = await ctx.prisma.booking.findUnique({ where: { id: bookingId } });
    expect(booking!.status).toBe('PENDING');
    expect(booking!.guestEmail).toBe(body.guestEmail);
  });

  it('booking-created row is keyed by the booking id and carries no duplicate across a distinct booking', async () => {
    const me = await registerUser(ctx.http);
    const seeded = await seedTour(ctx.prisma);
    const make = () =>
      request(ctx.http)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${me.token}`)
        .set('Idempotency-Key', `distinct-${Date.now()}-${Math.random().toString(36).slice(2)}`)
        .send({
          origin: 'TOUR',
          tourId: seeded.tourId,
          tourDateId: seeded.dateId,
          travelerCount: 1,
          consentAcceptedAt: new Date().toISOString(),
          guestEmail: `guest-${Date.now()}@example.com`,
          guestName: 'Guest',
        })
        .expect(201);

    const a = await make();
    const b = await make();

    // two distinct bookings -> two distinct idempotency keys -> two rows
    const rows = await ctx.prisma.notification.findMany({
      where: {
        eventType: EmailEventType.BOOKING_CREATED,
        bookingId: { in: [a.body.id, b.body.id] },
      },
    });
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((r) => r.idempotencyKey)).size).toBe(2);
  });
});
