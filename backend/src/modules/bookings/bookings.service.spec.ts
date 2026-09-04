import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { BookingsService } from './bookings.service.js';
import { assertTransition, isTerminal, CUSTOMER_CANCELLABLE } from './state-machine.js';

/**
 * Unit tests for BookingsService using constructor-injection vi.fn()
 * mocks of PrismaService + dependencies (same style as auth.service.spec.ts).
 *
 * createBooking is mocked down to the Prisma layer: `prisma.$transaction`
 * invokes the interactive-transaction callback with a fake `tx` that we
 * fully control, so we can exercise the business logic (price, capacity
 * check, decrement, promo redeem, idempotency short-circuit) without a DB.
 */

function makeTx() {
  return {
    $executeRaw: vi.fn().mockResolvedValue([{ id: 'td-1' }]),
    tourDate: {
      findUnique: vi.fn(),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: { remainingCapacity: number } }) => ({
        id: where.id,
        remainingCapacity: data.remainingCapacity,
      })),
    },
    booking: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'b-1',
        ...data,
      })),
    },
    tripRequest: { findUnique: vi.fn() },
  };
}

function makePrisma(tx: ReturnType<typeof makeTx>) {
  return {
    booking: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(async (cb: (t: unknown) => unknown) => cb(tx)),
  };
}

function makeDeps() {
  return {
    users: { findById: vi.fn(), requireById: vi.fn() },
    promos: { validate: vi.fn(), redeem: vi.fn() },
    email: {
      sendBookingCreated: vi.fn().mockResolvedValue(undefined),
      sendBookingCancellation: vi.fn().mockResolvedValue(undefined),
    },
    audit: { record: vi.fn().mockResolvedValue(undefined) },
  };
}

type Deps = ReturnType<typeof makeDeps>;

function build(deps: Deps, tx: ReturnType<typeof makeTx>, prisma?: ReturnType<typeof makePrisma>) {
  const svc = new BookingsService(
    (prisma ?? makePrisma(tx)) as never,
    deps.users as never,
    deps.promos as never,
    deps.email as never,
    deps.audit as never,
  );
  return svc;
}

function futureTourDate(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'td-1',
    tourId: 'tour-1',
    startDate: new Date(Date.now() + 86400_000),
    capacity: 5,
    remainingCapacity: 5,
    tour: { id: 'tour-1', startingPrice: 100000 },
    ...overrides,
  };
}

function guestDto(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    origin: 'TOUR' as const,
    tourId: 'tour-1',
    tourDateId: 'td-1',
    travelerCount: 2,
    consentAcceptedAt: '2026-01-01T00:00:00.000Z',
    guestEmail: 'guest@example.com',
    guestName: 'Guest',
    ...overrides,
  };
}

describe('booking state machine contract', () => {
  it('allows PENDING -> PAYMENT_PENDING -> PAID -> CONFIRMED -> COMPLETED', () => {
    expect(() => assertTransition(BookingStatus.PENDING, BookingStatus.PAYMENT_PENDING)).not.toThrow();
    expect(() => assertTransition(BookingStatus.PAYMENT_PENDING, BookingStatus.PAID)).not.toThrow();
    expect(() => assertTransition(BookingStatus.PAID, BookingStatus.CONFIRMED)).not.toThrow();
    expect(() => assertTransition(BookingStatus.CONFIRMED, BookingStatus.COMPLETED)).not.toThrow();
  });

  it('rejects illegal PENDING -> CONFIRMED (skips payment path)', () => {
    expect(() => assertTransition(BookingStatus.PENDING, BookingStatus.CONFIRMED)).toThrow(
      BadRequestException,
    );
  });

  it('treats CANCELLED/COMPLETED/FAILED/EXPIRED as terminal and blocks further moves', () => {
    for (const s of [
      BookingStatus.CANCELLED,
      BookingStatus.COMPLETED,
      BookingStatus.FAILED,
      BookingStatus.EXPIRED,
    ]) {
      expect(isTerminal(s)).toBe(true);
      expect(() => assertTransition(s, BookingStatus.PENDING)).toThrow(BadRequestException);
    }
  });

  it('CUSTOMER_CANCELLABLE is exactly {PENDING, PAYMENT_PENDING}', () => {
    expect(CUSTOMER_CANCELLABLE.has(BookingStatus.PENDING)).toBe(true);
    expect(CUSTOMER_CANCELLABLE.has(BookingStatus.PAYMENT_PENDING)).toBe(true);
    expect(CUSTOMER_CANCELLABLE.has(BookingStatus.PAID)).toBe(false);
    expect(CUSTOMER_CANCELLABLE.has(BookingStatus.CONFIRMED)).toBe(false);
    expect(CUSTOMER_CANCELLABLE.has(BookingStatus.CANCELLED)).toBe(false);
  });
});

describe('BookingsService.createBooking (mocked prisma)', () => {
  let deps: Deps;
  let tx: ReturnType<typeof makeTx>;
  let prisma: ReturnType<typeof makePrisma>;
  let svc: BookingsService;

  beforeEach(() => {
    deps = makeDeps();
    tx = makeTx();
    prisma = makePrisma(tx);
    svc = build(deps, tx, prisma);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('computes server-side subtotal/total and decrements capacity by travelerCount', async () => {
    tx.tourDate.findUnique.mockResolvedValue(futureTourDate());
    prisma.booking.findUnique.mockResolvedValue(null);

    const booking = await svc.createBooking(guestDto(), { idempotencyKey: 'key-1' });

    expect(booking.status).toBe(BookingStatus.PENDING);
    expect(booking.subtotal).toBe(200000); // 100000 * 2
    expect(booking.total).toBe(200000);
    expect(booking.origin).toBe('TOUR');
    // lock issued first — the tagged-template $executeRaw receives a
    // TemplateStringsArray whose JOINED body carries the "FOR UPDATE"
    expect(tx.$executeRaw).toHaveBeenCalled();
    const lockStrings = tx.$executeRaw.mock.calls[0]?.[0] as string[];
    expect(Array.isArray(lockStrings) ? lockStrings.join('') : '').toContain('FOR UPDATE');
    // decrement by travelerCount (5 -> 3), NOT by 1
    expect(tx.tourDate.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { remainingCapacity: 3 } }),
    );
    // no promo -> no redemption
    expect(deps.promos.redeem).not.toHaveBeenCalled();
    // post-commit side effect fired
    expect(deps.email.sendBookingCreated).toHaveBeenCalled();
  });

  it('applies a validated promo code and redeems it inside the tx', async () => {
    tx.tourDate.findUnique.mockResolvedValue(futureTourDate());
    prisma.booking.findUnique.mockResolvedValue(null);
    deps.promos.validate.mockResolvedValue({ promoCodeId: 'p-1', discountAmount: 20000 });

    const booking = await svc.createBooking(
      guestDto({ promoCode: 'SAVE10' }),
      { idempotencyKey: 'key-2' },
    );

    expect(deps.promos.validate).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'SAVE10', subtotal: 200000, tourIds: ['tour-1'] }),
      { userId: undefined },
    );
    expect(booking.promoCodeId).toBe('p-1');
    expect(booking.discountAmount).toBe(20000);
    expect(booking.total).toBe(180000); // subtotal - discount
    expect(deps.promos.redeem).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ promoCodeId: 'p-1', discountAmount: 20000 }),
    );
  });

  it('throws ConflictException when capacity is insufficient BEFORE decrementing', async () => {
    tx.tourDate.findUnique.mockResolvedValue(
      futureTourDate({ remainingCapacity: 1, capacity: 1 }),
    );
    prisma.booking.findUnique.mockResolvedValue(null);

    await expect(
      svc.createBooking(guestDto(), { idempotencyKey: 'key-3' }),
    ).rejects.toBeInstanceOf(ConflictException);

    // guard against over-decrement: update must not run when capacity can't be locked
    expect(tx.tourDate.update).not.toHaveBeenCalled();
    expect(tx.booking.create).not.toHaveBeenCalled();
  });

  it('Idempotency-Key short-circuit returns the existing booking without re-decrementing', async () => {
    const existing = { id: 'b-existing', status: BookingStatus.PENDING, idempotencyKey: 'key-4' };
    prisma.booking.findUnique.mockResolvedValue(existing);

    const out = await svc.createBooking(guestDto(), { idempotencyKey: 'key-4' });

    expect(out).toBe(existing);
    // tx never opens, no decrement, no duplicate insert
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.tourDate.update).not.toHaveBeenCalled();
    expect(tx.booking.create).not.toHaveBeenCalled();
  });

  it('resolves guest identity from the authenticated user (JWT) when present', async () => {
    tx.tourDate.findUnique.mockResolvedValue(futureTourDate());
    prisma.booking.findUnique.mockResolvedValue(null);
    deps.users.findById.mockResolvedValue({ id: 'u-1', email: 'sara@example.com', name: 'Sara' });

    const booking = await svc.createBooking(
      guestDto({ guestEmail: undefined, guestName: undefined }),
      { userId: 'u-1', idempotencyKey: 'key-5' },
    );

    expect(deps.users.findById).toHaveBeenCalledWith('u-1');
    expect(booking.guestEmail).toBe('sara@example.com');
    expect(booking.guestName).toBe('Sara');
    expect(booking.userId).toBe('u-1');
  });
});
