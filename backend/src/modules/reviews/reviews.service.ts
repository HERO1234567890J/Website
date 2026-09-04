import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Review, ReviewStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';
import { CreateReviewDto } from './dto/create-review.dto.js';

/**
 * §14 — Reviews.
 *
 * Eligibility (server-side, never trusted from the client):
 *   - user owns a Booking with tourId === dto.tourId
 *   - that Booking.status === COMPLETED
 *   - that Booking has no Review row yet (Booking.id @unique)
 *
 * New reviews start PENDING; admin moderation moves them to
 * PUBLISHED or REJECTED. Only PUBLISHED rows are returned by the
 * public tour review list.
 */
@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  /**
   * Eligibility check (§14) + insert. The eligibility lookup runs
   * BEFORE the insert; one DB call resolves tour + completed
   * booking + existing review status.
   */
  async create(userId: string, dto: CreateReviewDto): Promise<Review> {
    const eligible = await this.prisma.booking.findFirst({
      where: {
        userId,
        tourId: dto.tourId,
        status: 'COMPLETED',
      },
      include: { review: true },
    });
    if (!eligible) {
      throw new ForbiddenException(
        'Only customers with a COMPLETED booking on this tour can submit a review.',
      );
    }
    if (eligible.review) {
      throw new ConflictException('A review for this booking already exists.');
    }

    return this.prisma.review.create({
      data: {
        userId,
        tourId: dto.tourId,
        bookingId: eligible.id,
        rating: dto.rating,
        title: dto.title ?? null,
        body: dto.body,
        status: ReviewStatus.PENDING,
      },
    });
  }

  /** Public — only PUBLISHED reviews for a tour. */
  listForTour(tourId: string): Promise<Review[]> {
    return this.prisma.review.findMany({
      where: { tourId, status: ReviewStatus.PUBLISHED },
      orderBy: { publishedAt: 'desc' },
      include: { user: { select: { name: true } } },
    });
  }

  /** The authenticated user's reviews (all statuses). */
  listForUser(userId: string): Promise<Review[]> {
    return this.prisma.review.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── admin ─────────────────────────────────────────────────────

  async requireById(id: string): Promise<Review> {
    const r = await this.prisma.review.findUnique({ where: { id } });
    if (!r) throw new NotFoundException(`Review ${id} not found.`);
    return r;
  }

  listAllForAdmin(query: { status?: ReviewStatus; page: number; pageSize: number }) {
    const where = query.status ? { status: query.status } : {};
    return Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          user: { select: { name: true, email: true } },
          tour: { select: { id: true, slug: true, title: true } },
        },
      }),
      this.prisma.review.count({ where }),
    ]).then(([items, total]) => ({ items, total }));
  }

  async approve(id: string, adminUserId: string): Promise<Review> {
    const r = await this.requireById(id);
    if (r.status !== ReviewStatus.PENDING) {
      throw new ConflictException(`Review is in ${r.status} state; cannot approve.`);
    }
    const updated = await this.prisma.review.update({
      where: { id },
      data: { status: ReviewStatus.PUBLISHED, publishedAt: new Date() },
    });
    await this.audit.record({
      adminUserId,
      action: 'REVIEW_PUBLISHED',
      entityType: 'Review',
      entityId: updated.id,
      metadata: { tourId: updated.tourId, userId: updated.userId },
    });
    return updated;
  }

  async reject(id: string, adminUserId: string, reason?: string): Promise<Review> {
    const r = await this.requireById(id);
    if (r.status !== ReviewStatus.PENDING) {
      throw new ConflictException(`Review is in ${r.status} state; cannot reject.`);
    }
    const updated = await this.prisma.review.update({
      where: { id },
      data: { status: ReviewStatus.REJECTED },
    });
    await this.audit.record({
      adminUserId,
      action: 'REVIEW_REJECTED',
      entityType: 'Review',
      entityId: updated.id,
      metadata: { tourId: updated.tourId, userId: updated.userId, ...(reason ? { reason } : {}) },
    });
    return updated;
  }
}