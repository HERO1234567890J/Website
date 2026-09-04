import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Tour, TourDate } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EmailService } from '../email/email.service.js';
import { CreateTourDateDto, UpdateTourDateDto } from './dto/tour.dto.js';
import { ToursService } from './tours.service.js';

/**
 * §9 — TourDate CRUD. The row's `remainingCapacity` is the live
 * counter decremented inside the booking flow's interactive
 * transaction with row-level locking (SELECT … FOR UPDATE).
 */
@Injectable()
export class TourDatesService {
  private readonly logger = new Logger(TourDatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tours: ToursService,
    private readonly email: EmailService,
  ) {}

  async listByTour(tourId: string): Promise<TourDate[]> {
    await this.tours.requireById(tourId);
    return this.prisma.tourDate.findMany({
      where: { tourId },
      orderBy: { startDate: 'asc' },
    });
  }

  async create(tourId: string, dto: CreateTourDateDto): Promise<TourDate> {
    await this.tours.requireById(tourId);
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end < start) {
      throw new ConflictException('endDate must be on or after startDate.');
    }
    return this.prisma.tourDate.create({
      data: {
        tourId,
        startDate: start,
        endDate: end,
        capacity: dto.capacity,
        remainingCapacity: dto.capacity,
      },
    });
  }

  async update(id: string, dto: UpdateTourDateDto): Promise<TourDate> {
    await this.requireById(id);
    const data: { startDate?: Date; endDate?: Date; capacity?: number; remainingCapacity?: number } = {};
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);
    if (dto.capacity !== undefined) {
      data.capacity = dto.capacity;
      const existing = await this.prisma.tourDate.findUnique({ where: { id } });
      if (existing) {
        const booked = existing.capacity - existing.remainingCapacity;
        data.remainingCapacity = Math.max(0, dto.capacity - booked);
      } else {
        data.remainingCapacity = dto.capacity;
      }
    }
    return this.prisma.tourDate.update({ where: { id }, data });
  }

  /**
   * Plain remove — refused when active bookings exist. Use
   * `cancelTourDate()` below for the bulk-cancellation flow that
   * fires `sendTourCancelledBulk` per §12.
   */
  async remove(id: string): Promise<{ ok: true; id: string }> {
    const existing = await this.requireById(id);
    const blockingBookings = await this.prisma.booking.count({
      where: {
        tourDateId: existing.id,
        status: { in: ['PENDING', 'PAYMENT_PENDING', 'PAID', 'CONFIRMED'] },
      },
    });
    if (blockingBookings > 0) {
      throw new ConflictException(
        `TourDate ${id} has ${blockingBookings} active booking(s). Cancel them first.`,
      );
    }
    await this.prisma.tourDate.delete({ where: { id } });
    return { ok: true, id };
  }

  /**
   * §12 — bulk tour cancellation flow.
   *
   *   1. Atomic transaction:
   *        - flip every active booking on this date to CANCELLED
   *        - delete the TourDate
   *   2. Post-commit, BEST-EFFORT, fire sendTourCancelledBulk for
   *      each booking — EmailService never throws to the caller.
   *
   * Refunds
   *   v1 with the stub gateway (§11) marks each booking as
   *   CANCELLED without a refund webhook. Real refund processing
   *   lands when the EasyCash wire-up moves from stub → real
   *   (the `PaymentService.refund` body today throws
   *   `NotImplementedException`).
   */
  async cancelTourDate(id: string): Promise<{
    ok: true;
    id: string;
    cancelledBookings: number;
  }> {
    const existing = await this.requireById(id);

    const { cancelled } = await this.prisma.$transaction(async (tx) => {
      const bookings = await tx.booking.findMany({
        where: {
          tourDateId: existing.id,
          status: { in: ['PENDING', 'PAYMENT_PENDING', 'PAID', 'CONFIRMED'] },
        },
        select: {
          id: true,
          userId: true,
          guestEmail: true,
          guestName: true,
          tour: { select: { title: true } },
        },
      });

      if (bookings.length > 0) {
        await tx.booking.updateMany({
          where: { id: { in: bookings.map((b) => b.id) } },
          data: { status: 'CANCELLED' },
        });
      }

      await tx.tourDate.delete({ where: { id: existing.id } });

      const tourRel = await tx.tour.findUnique({
        where: { id: existing.tourId },
        select: { title: true },
      });

      return {
        cancelled: bookings.map((b) => ({
          id: b.id,
          userId: b.userId,
          guestEmail: b.guestEmail,
          guestName: b.guestName,
          tourName: tourRel?.title ?? b.tour?.title ?? 'Tour',
          startDate: existing.startDate,
        })),
      };
    });

    // Best-effort bulk email — failures are logged; the admin sees
    // the cancellation count regardless and can chase missing
    // notifications via the retry worker's table.
    for (const b of cancelled) {
      try {
        await this.email.sendTourCancelledBulk({
          bookingId: b.id,
          userId: b.userId ?? '00000000-0000-0000-0000-000000000000',
          tourDateId: existing.id,
          ref: `DT-${b.id.slice(0, 8).toUpperCase()}`,
          guestEmail: b.guestEmail,
          guestName: b.guestName,
          tourName: b.tourName,
          startDate: b.startDate,
        });
      } catch (err) {
        this.logger.error(
          `sendTourCancelledBulk failed for booking=${b.id}: ${(err as Error).message}`,
        );
      }
    }

    return {
      ok: true,
      id,
      cancelledBookings: cancelled.length,
    };
  }

  async requireById(id: string): Promise<TourDate> {
    const d = await this.prisma.tourDate.findUnique({ where: { id } });
    if (!d) throw new NotFoundException(`TourDate ${id} not found.`);
    return d;
  }
}

// Re-export so the admin controller doesn't need a second Prisma
// import path.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _tour: Tour | null = null;