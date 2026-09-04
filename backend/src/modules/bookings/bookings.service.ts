import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Booking, BookingStatus, Prisma, Tour } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';
import { EmailService } from '../email/email.service.js';
import { PromoCodesService } from '../promo-codes/promo-codes.service.js';
import { UsersService } from '../users/users.service.js';
import {
  CreateBookingDto,
  CancelBookingDto,
  AdminUpdateBookingDto,
} from './dto/create-booking.dto.js';
import {
  CUSTOMER_CANCELLABLE,
  assertTransition,
  isTerminal,
} from './state-machine.js';

export type PaymentDrivenTransition =
  | 'PAYMENT_INTENT_CREATED'   // PENDING → PAYMENT_PENDING
  | 'PAYMENT_SUCCEEDED'        // PAYMENT_PENDING → PAID
  | 'PAYMENT_FAILED';          // PAYMENT_PENDING → FAILED

/**
 * §8 / §10 / §11 — bookings core.
 *
 * createBooking() is the critical path:
 *   1. Idempotency-Key lookup — short-circuit if seen before.
 *   2. Open an interactive Prisma transaction with Serializable
 *      isolation.
 *   3. If origin == TOUR, lock the TourDate row
 *      (`SELECT … FOR UPDATE`), verify remainingCapacity ≥
 *      travelerCount, decrement.
 *   4. Resolve the promo code (if any) via PromoCodesService.
 *      Redeem atomically inside the same transaction.
 *   5. Compute subtotal / discountAmount / total server-side.
 *   6. Insert the Booking row stamped with consentAcceptedAt and
 *      the idempotencyKey.
 *   7. Post-commit: sendBookingCreated + audit (no audit on
 *      customer-side creates per §15).
 *
 * transitionStatus() — single chokepoint for status moves; the
 * state machine is the only thing that lets a transition happen.
 */
@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly promos: PromoCodesService,
    private readonly email: EmailService,
    private readonly audit: AuditLogService,
  ) {}

  // ─── public ─────────────────────────────────────────────────────

  /**
   * Idempotency-Key header — required on POST /api/bookings. Same
   * key on retry returns the existing booking. The unique index
   * on `Booking.idempotencyKey` is the final guarantee against
   * duplicate inserts under concurrent retries.
   */
  async createBooking(
    dto: CreateBookingDto,
    ctx: { userId?: string; idempotencyKey: string },
  ): Promise<Booking> {
    // 1. Idempotency short-circuit.
    const existing = await this.prisma.booking.findUnique({
      where: { idempotencyKey: ctx.idempotencyKey },
    });
    if (existing) return existing;

    // Resolve guest fields from JWT context when present.
    const user = ctx.userId ? await this.users.findById(ctx.userId) : null;
    if (ctx.userId && !user) {
      throw new ForbiddenException('Authenticated user not found.');
    }
    const guestEmail = (user?.email ?? dto.guestEmail ?? '').toLowerCase();
    const guestName = user?.name ?? dto.guestName ?? '';
    const guestPhone = user?.phone ?? dto.guestPhone ?? null;
    if (!guestEmail) throw new BadRequestException('guestEmail is required.');
    if (!guestName) throw new BadRequestException('guestName is required.');

    try {
      return await this.prisma.$transaction(
        async (tx) => {
        let tour: Tour | null = null;
        let subtotal = 0;

        if (dto.origin === 'TOUR') {
          if (!dto.tourId || !dto.tourDateId) {
            throw new BadRequestException('tourId and tourDateId are required for TOUR bookings.');
          }
          // 3a. Lock the TourDate row. SELECT ... FOR UPDATE inside
          // the tx prevents two simultaneous bookings from seeing
          // the same remainingCapacity.
          await tx.$executeRaw`SELECT id FROM "TourDate" WHERE id = ${dto.tourDateId} FOR UPDATE`;
          const td = await tx.tourDate.findUnique({
            where: { id: dto.tourDateId },
            include: { tour: true },
          });
          if (!td || td.tourId !== dto.tourId) {
            throw new NotFoundException('TourDate not found for the given tourId.');
          }
          if (td.startDate < new Date()) {
            throw new ConflictException('TourDate is in the past.');
          }
          if (td.remainingCapacity < dto.travelerCount) {
            throw new ConflictException(
              `Only ${td.remainingCapacity} seat(s) remaining; please reduce traveler count.`,
            );
          }

          // 3b. Decrement remainingCapacity. Server-authoritative.
          await tx.tourDate.update({
            where: { id: td.id },
            data: { remainingCapacity: td.remainingCapacity - dto.travelerCount },
          });

          tour = td.tour;
          subtotal = td.tour.startingPrice * dto.travelerCount;
        } else {
          // CUSTOM_TRIP — verify the trip request exists and is not
          // already linked to a booking (§7 — 1:1 with Booking).
          if (!dto.tripRequestId) {
            throw new BadRequestException('tripRequestId is required for CUSTOM_TRIP bookings.');
          }
          const tripReq = await tx.tripRequest.findUnique({
            where: { id: dto.tripRequestId },
            include: { booking: true },
          });
          if (!tripReq) {
            throw new NotFoundException('TripRequest not found.');
          }
          if (tripReq.booking) {
            throw new ConflictException('TripRequest already linked to a booking.');
          }
          // Custom-trip pricing is quoted by the admin post-submit
          // (Phase 12 dashboard); subtotal stays 0 here.
        }

        // 4. Promo validation — runs OUTSIDE the locked rows but
        // still inside the tx so any DB read (perCustomerUsageLimit)
        // sees a consistent snapshot.
        let promoCodeId: string | null = null;
        let discountAmount = 0;
        if (dto.promoCode) {
          const validated = await this.promos.validate(
            {
              code: dto.promoCode,
              travelerCount: dto.travelerCount,
              subtotal,
              ...(dto.origin === 'TOUR' && tour ? { tourIds: [tour.id] } : {}),
            },
            { userId: ctx.userId },
          );
          promoCodeId = validated.promoCodeId;
          discountAmount = validated.discountAmount;
        }

        const total = Math.max(0, subtotal - discountAmount);

        // 5/6. Insert the booking row.
        const booking = await tx.booking.create({
          data: {
            userId: user?.id ?? null,
            guestEmail,
            guestName,
            guestPhone,
            origin: dto.origin,
            tourId: dto.origin === 'TOUR' ? dto.tourId : null,
            tourDateId: dto.origin === 'TOUR' ? dto.tourDateId : null,
            tripRequestId: dto.origin === 'CUSTOM_TRIP' ? dto.tripRequestId : null,
            travelerCount: dto.travelerCount,
            travelerNames: dto.travelerNames ?? [],
            specialRequests: dto.specialRequests ?? null,
            pickupLocation: dto.pickupLocation ?? null,
            subtotal,
            discountAmount,
            total,
            currency: 'EGP',
            promoCodeId,
            consentAcceptedAt: new Date(dto.consentAcceptedAt),
            status: BookingStatus.PENDING,
            idempotencyKey: ctx.idempotencyKey,
          },
        });

        // 4b. Record the redemption inside the same tx.
        if (promoCodeId && discountAmount > 0) {
          await this.promos.redeem(tx, {
            promoCodeId,
            bookingId: booking.id,
            ...(ctx.userId ? { userId: ctx.userId } : {}),
            discountAmount,
          });
        }

        return booking;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ).then(async (booking) => {
      // 7. Post-commit side effects — best-effort, MUST NOT throw.
      try {
        await this.email.sendBookingCreated({
          bookingId: booking.id,
          ref: `DT-${booking.id.slice(0, 8).toUpperCase()}`,
          guestEmail: booking.guestEmail,
          guestName: booking.guestName,
          totalEgp: booking.total,
          origin: booking.origin,
        });
      } catch (err) {
        this.logger.error(
          `sendBookingCreated failed for ${booking.id}: ${(err as Error).message}`,
        );
      }
      return booking;
    });
    } catch (err) {
      if (this.isSerializationFailure(err)) {
        throw new ConflictException('Booking is being updated concurrently; please retry.');
      }
      throw err;
    }
  }

  async cancelByCustomer(
    id: string,
    ctx: { userId?: string; guestEmail?: string },
    _dto: CancelBookingDto,
  ): Promise<Booking> {
    const booking = await this.requireById(id);
    this.assertCanRead(booking, ctx);
    if (!CUSTOMER_CANCELLABLE.has(booking.status)) {
      throw new ConflictException(
        `Booking is in ${booking.status} state and cannot be self-cancelled.`,
      );
    }
    assertTransition(booking.status, BookingStatus.CANCELLED);
    const updated = await this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED },
    });
    try {
      await this.email.sendBookingCancellation({
        bookingId: updated.id,
        ref: `DT-${updated.id.slice(0, 8).toUpperCase()}`,
        guestEmail: updated.guestEmail,
        guestName: updated.guestName,
        cancelledBy: 'CUSTOMER',
        // §11 — refunds land with Phase 10's EasyCash integration.
        // v1 marks every customer-initiated cancel as PENDING until
        // the gateway's refund webhook says SUCCEEDED.
        refundStatus: 'PENDING',
      });
    } catch (err) {
      this.logger.error(
        `sendBookingCancellation failed for ${updated.id}: ${(err as Error).message}`,
      );
    }
    return updated;
  }

  /**
   * §28 — guest-checkout claim. Links a booking to the
   * authenticated user when the user's email matches the
   * booking's `guestEmail`. Idempotent: calling twice with the
   * same user is a no-op.
   */
  async claim(id: string, userId: string): Promise<Booking> {
    const user = await this.users.requireById(userId);
    const booking = await this.requireById(id);
    if (booking.userId === user.id) return booking; // already claimed
    if (booking.guestEmail.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenException(
        'Booking guestEmail does not match authenticated user; cannot claim.',
      );
    }
    return this.prisma.booking.update({
      where: { id },
      data: { userId: user.id },
    });
  }

  async getById(
    id: string,
    ctx: { userId?: string; guestEmail?: string; isAdmin: boolean },
  ): Promise<Booking> {
    const booking = await this.requireById(id);
    if (ctx.isAdmin) return booking;
    this.assertCanRead(booking, ctx);
    return booking;
  }

  async listMine(ctx: { userId: string; email: string }): Promise<Booking[]> {
    return this.prisma.booking.findMany({
      where: {
        OR: [
          { userId: ctx.userId },
          { guestEmail: ctx.email.toLowerCase() },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: { tour: true, tourDate: true },
    });
  }

  // ─── admin ─────────────────────────────────────────────────────

  async listAllForAdmin(query: {
    page: number;
    pageSize: number;
    status?: BookingStatus;
    search?: string;
  }): Promise<{
    items: (Booking & {
      tour: { id: string; slug: string; title: string } | null;
      tourDate: { id: string; startDate: Date; endDate: Date } | null;
      user: { id: string; email: string; name: string | null } | null;
      latestPayment: { gateway: string; status: string; amount: number } | null;
    })[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const { page, pageSize } = query;
    const where: Prisma.BookingWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.search && query.search.trim()) {
      const q = query.search.trim();
      where.OR = [
        { guestEmail: { contains: q, mode: 'insensitive' } },
        { guestName: { contains: q, mode: 'insensitive' } },
        { id: { equals: q } }, // exact UUID match — fast path for "#DT-..." searches
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          tour: { select: { id: true, slug: true, title: true } },
          tourDate: { select: { id: true, startDate: true, endDate: true } },
          user: { select: { id: true, email: true, name: true } },
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { gateway: true, status: true, amount: true },
          },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);
    return {
      items: items.map(({ payments, ...rest }) => ({
        ...rest,
        latestPayment: payments[0] ?? null,
      })),
      total,
      page,
      pageSize,
    };
  }

  async getStatsForAdmin(): Promise<{
    totalCount: number;
    revenueEgp: number;
    pendingPaymentCount: number;
    cancelledCount: number;
  }> {
    const [totalCount, revenueAgg, pendingPaymentCount, cancelledCount] = await Promise.all([
      this.prisma.booking.count(),
      this.prisma.booking.aggregate({
        _sum: { total: true },
        where: { status: { in: ['PAID', 'CONFIRMED', 'COMPLETED'] } },
      }),
      this.prisma.booking.count({ where: { status: 'PAYMENT_PENDING' } }),
      this.prisma.booking.count({ where: { status: 'CANCELLED' } }),
    ]);
    return {
      totalCount,
      revenueEgp: revenueAgg._sum.total ?? 0,
      pendingPaymentCount,
      cancelledCount,
    };
  }

  async adminTransition(
    id: string,
    dto: AdminUpdateBookingDto,
    adminUserId: string,
  ): Promise<Booking> {
    const before = await this.requireById(id);
    if (isTerminal(before.status)) {
      throw new ConflictException(`Booking is in terminal state ${before.status}.`);
    }
    assertTransition(before.status, dto.status);

    const data: Prisma.BookingUpdateInput = { status: dto.status };
    if (dto.overrideConsentAt) {
      data.consentAcceptedAt = new Date(dto.overrideConsentAt);
    }
    const updated = await this.prisma.booking.update({ where: { id }, data });

    await this.audit.record({
      adminUserId,
      action: 'BOOKING_STATUS_CHANGED',
      entityType: 'Booking',
      entityId: updated.id,
      metadata: {
        from: before.status,
        to: updated.status,
        ...(dto.reason ? { reason: dto.reason } : {}),
      },
    });

    if (updated.status === BookingStatus.CANCELLED) {
      try {
        await this.email.sendBookingCancellation({
          bookingId: updated.id,
          ref: `DT-${updated.id.slice(0, 8).toUpperCase()}`,
          guestEmail: updated.guestEmail,
          guestName: updated.guestName,
          cancelledBy: 'ADMIN',
          refundStatus: 'PENDING',
        });
      } catch (err) {
        this.logger.error(
          `sendBookingCancellation (admin) failed for ${updated.id}: ${(err as Error).message}`,
        );
      }
    } else if (updated.status === BookingStatus.CONFIRMED) {
      try {
        await this.email.sendBookingConfirmation({
          bookingId: updated.id,
          ref: `DT-${updated.id.slice(0, 8).toUpperCase()}`,
          guestEmail: updated.guestEmail,
          guestName: updated.guestName,
          ...(updated.tourId ? { tourName: undefined } : {}),
        });
      } catch (err) {
        this.logger.error(
          `sendBookingConfirmation failed for ${updated.id}: ${(err as Error).message}`,
        );
      }
    } else {
      try {
        await this.email.sendBookingUpdate({
          bookingId: updated.id,
          ref: `DT-${updated.id.slice(0, 8).toUpperCase()}`,
          guestEmail: updated.guestEmail,
          guestName: updated.guestName,
          fromStatus: before.status,
          toStatus: updated.status,
          ...(dto.reason ? { reason: dto.reason } : {}),
        });
      } catch (err) {
        this.logger.error(
          `sendBookingUpdate failed for ${updated.id}: ${(err as Error).message}`,
        );
      }
    }

    return updated;
  }

  // ─── private ───────────────────────────────────────────────────

  async requireById(id: string): Promise<Booking> {
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b) throw new NotFoundException(`Booking ${id} not found.`);
    return b;
  }

  /**
   * §10 / §11 — payment-driven status transition. Called from
   * PaymentsService inside its own webhook / intent transaction so
   * the Booking row, the Payment row, and the PaymentEvent row all
   * commit together. Uses a distinct audit action (`BOOKING_PAYMENT_*`)
   * so admin manual transitions stay visually separate in the log.
   *
   * Returns the booking row AFTER the update (with the new status).
   */
  async transitionForPayment(
    id: string,
    target: 'PAYMENT_PENDING' | 'PAID' | 'FAILED',
    reason: PaymentDrivenTransition,
  ): Promise<Booking> {
    const before = await this.requireById(id);
    if (isTerminal(before.status)) {
      throw new ConflictException(`Booking is in terminal state ${before.status}.`);
    }
    assertTransition(before.status, target);
    const updated = await this.prisma.booking.update({
      where: { id },
      data: { status: target },
    });
    await this.audit.record({
      adminUserId: 'system:payment-gateway',
      action: `BOOKING_PAYMENT_${reason}`,
      entityType: 'Booking',
      entityId: updated.id,
      metadata: { from: before.status, to: updated.status, reason },
    });
    return updated;
  }

  private assertCanRead(
    booking: Booking,
    ctx: { userId?: string; guestEmail?: string },
  ): void {
    const ownsByUser = ctx.userId && booking.userId === ctx.userId;
    const ownsByEmail =
      ctx.guestEmail &&
      booking.guestEmail.toLowerCase() === ctx.guestEmail.toLowerCase();
    if (!ownsByUser && !ownsByEmail) {
      throw new ForbiddenException('You do not have access to this booking.');
    }
  }

  private isSerializationFailure(err: unknown): boolean {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2034'
    ) {
      return true;
    }
    return (
      (err as { message?: string })?.message?.includes(
        'could not serialize access',
      ) ?? false
    );
  }
}