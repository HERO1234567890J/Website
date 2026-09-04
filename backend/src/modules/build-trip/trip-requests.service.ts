import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, TripRequest } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EmailService } from '../email/email.service.js';
import { CreateTripRequestDto } from './dto/trip-request.dto.js';
import { TripTypePresetsService } from './trip-type-presets.service.js';

/**
 * §7 — wizard submission. The wizard's Scene 4 posts here; we create
 * a TripRequest row and fire `sendTripRequestReceived` so the trip
 * director's inbox gets a notification (and the admin can pull the
 * full request from `/api/admin/trip-requests`).
 *
 * Booking linkage
 *   The TripRequest row's status is `PENDING`. When Phase 9 (Bookings)
 *   lands, the customer can promote a trip request to a Booking via
 *   `/api/bookings` by passing `tripRequestId` — the booking service
 *   will look up the trip request, recalculate the authoritative
 *   price server-side (§8), and flip the request to CONFIRMED.
 *
 * Reference id
 *   The shape returned to the frontend matches the ConfirmPanel
 *   contract used by the rest of the wizard ("DT-XXX" style ref).
 *   The format stays human-friendly for v1; the DB id is also
 *   returned in the response body for programmatic use.
 */
@Injectable()
export class TripRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly presets: TripTypePresetsService,
    private readonly email: EmailService,
  ) {}

  async create(dto: CreateTripRequestDto): Promise<{ id: string; ref: string }> {
    // Server-side guard: Scene 2 in the frontend already enforces this,
    // but a direct POST must not be able to skip it.
    const hasDestinations = dto.destinations.length > 0;
    const hasOther = !!(dto.otherDestination && dto.otherDestination.trim().length > 0);
    if (!hasDestinations && !hasOther) {
      throw new ConflictException('At least one destination or "other" is required.');
    }

    // Resolve the slug → id and verify the preset is active. We use
    // findFirst + isActive filter so an admin-deactivated preset
    // silently rejects the submission rather than surfacing an id.
    const preset = await this.prisma.tripTypePreset.findFirst({
      where: { slug: dto.tripTypePresetSlug, isActive: true },
    });
    if (!preset) {
      throw new ConflictException('Unknown trip type.');
    }

    const request = await this.prisma.tripRequest.create({
      data: {
        tripTypePresetId: preset.id,
        destinations: dto.destinations as Prisma.InputJsonValue,
        otherDestination: dto.otherDestination ?? null,
        dateFrom: dto.dateFrom ? new Date(dto.dateFrom) : null,
        dateTo: dto.dateTo ? new Date(dto.dateTo) : null,
        duration: dto.duration ?? null,
        travelers: dto.travelers ?? 2,
        budget: dto.budget ?? null,
        notes: dto.notes ?? null,
        contactName: dto.contactName,
        contactEmail: dto.contactEmail.toLowerCase(),
        contactPhone: dto.contactPhone,
        status: 'PENDING',
      },
    });

    const ref = `DT-${request.id.slice(0, 8).toUpperCase()}`;

    // §12 — fire the notification. Failures here MUST NOT roll back the
    // trip-request creation; the EmailService stub logs, the real
    // implementation in Phase 11 retries in the background.
    await this.email.sendTripRequestReceived({
      ref,
      tripRequestId: request.id,
      contactEmail: request.contactEmail,
      contactName: request.contactName,
    });

    return { id: request.id, ref };
  }

  /** Admin list with basic pagination — Phase 9 will add filters + status changes. */
  async listAll(page: number, pageSize: number): Promise<{ items: TripRequest[]; total: number }> {
    const [items, total] = await Promise.all([
      this.prisma.tripRequest.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { tripTypePreset: true },
      }),
      this.prisma.tripRequest.count(),
    ]);
    return { items, total };
  }
}