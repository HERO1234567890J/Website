import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Tour, TourDate } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateTourDto, ListToursQueryDto, UpdateTourDto } from './dto/tour.dto.js';

/**
 * §7 / §8 / §9 — tours catalog + availability.
 *
 * Public methods:
 *   list(query)       server-side filter/sort/paginate over isPublished tours
 *   getBySlug(slug)   detail with category/destination/dates/images
 *   availability(slug) future TourDates with remainingCapacity > 0
 *
 * Admin methods live alongside in the same service so the helpers
 * (requireById, buildWhere, buildOrderBy) are shared.
 */
@Injectable()
export class ToursService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── public ─────────────────────────────────────────────────────

  async list(query: ListToursQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.buildPublicWhere(query);
    const orderBy = this.buildOrderBy(query.sort);

    const [items, total] = await Promise.all([
      this.prisma.tour.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          category: true,
          destination: true,
        },
      }),
      this.prisma.tour.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async getBySlug(slug: string) {
    const tour = await this.prisma.tour.findUnique({
      where: { slug },
      include: {
        category: true,
        destination: true,
        images: { orderBy: { displayOrder: 'asc' } },
        dates: {
          where: { startDate: { gte: new Date() }, remainingCapacity: { gt: 0 } },
          orderBy: { startDate: 'asc' },
        },
      },
    });
    if (!tour || !tour.isPublished) {
      throw new NotFoundException(`Tour ${slug} not found.`);
    }
    return tour;
  }

  async availability(slug: string): Promise<TourDate[]> {
    const tour = await this.prisma.tour.findUnique({
      where: { slug },
      select: { id: true, isPublished: true },
    });
    if (!tour || !tour.isPublished) {
      throw new NotFoundException(`Tour ${slug} not found.`);
    }
    return this.prisma.tourDate.findMany({
      where: {
        tourId: tour.id,
        startDate: { gte: new Date() },
        remainingCapacity: { gt: 0 },
      },
      orderBy: { startDate: 'asc' },
    });
  }

  /**
   * §8 — server-authoritative price preview for the checkout page.
   *
   * The frontend must NEVER compute or display a final price from
   * its own side (§8 hard rule). This endpoint is what the
   * checkout's OrderSummary reads; it returns the price per person,
   * subtotal, and a hard capacity check (so the user can see the
   * "Only N seats remaining" message in real time).
   *
   * Promo-code discount is NOT applied here — Phase 15E wires the
   * promo flow separately (and the backend's authoritative calc
   * still happens inside the bookings tx at create-time).
   */
  async price(
    slug: string,
    tourDateId: string,
    travelerCount: number,
  ): Promise<{
    pricePerPerson: number;
    subtotal: number;
    discountAmount: number;
    total: number;
    currency: string;
    capacity: number;
    remainingCapacity: number;
  }> {
    const tour = await this.prisma.tour.findUnique({
      where: { slug },
      select: {
        id: true,
        isPublished: true,
        startingPrice: true,
        currency: true,
      },
    });
    if (!tour || !tour.isPublished) {
      throw new NotFoundException(`Tour ${slug} not found.`);
    }
    const td = await this.prisma.tourDate.findUnique({
      where: { id: tourDateId },
      select: {
        id: true,
        tourId: true,
        capacity: true,
        remainingCapacity: true,
        startDate: true,
      },
    });
    if (!td || td.tourId !== tour.id) {
      throw new NotFoundException(`TourDate ${tourDateId} not found for ${slug}.`);
    }
    if (td.remainingCapacity < travelerCount) {
      throw new ConflictException(
        `Only ${td.remainingCapacity} seat(s) remaining; please reduce traveler count.`,
      );
    }
    const subtotal = tour.startingPrice * travelerCount;
    return {
      pricePerPerson: tour.startingPrice,
      subtotal,
      discountAmount: 0,
      total: subtotal,
      currency: tour.currency,
      capacity: td.capacity,
      remainingCapacity: td.remainingCapacity,
    };
  }

  // ─── admin ─────────────────────────────────────────────────────

  async listAll(query?: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: 'PUBLISHED' | 'DRAFT';
  }): Promise<{ items: Tour[]; total: number; page: number; pageSize: number }> {
    const page = query?.page ?? 1;
    const pageSize = Math.min(query?.pageSize ?? 50, 200);
    const where: Prisma.TourWhereInput = {};
    if (query?.search && query.search.trim()) {
      const q = query.search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (query?.status === 'PUBLISHED') where.isPublished = true;
    if (query?.status === 'DRAFT') where.isPublished = false;
    const [items, total] = await Promise.all([
      this.prisma.tour.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { category: true, destination: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.tour.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async requireById(id: string): Promise<Tour> {
    const t = await this.prisma.tour.findUnique({ where: { id } });
    if (!t) throw new NotFoundException(`Tour ${id} not found.`);
    return t;
  }

  async requireBySlug(slug: string): Promise<Tour> {
    const t = await this.prisma.tour.findUnique({ where: { slug } });
    if (!t) throw new NotFoundException(`Tour ${slug} not found.`);
    return t;
  }

  async create(dto: CreateTourDto): Promise<Tour> {
    return this.prisma.tour.create({
      data: {
        slug: dto.slug,
        title: dto.title,
        shortDescription: dto.shortDescription,
        description: dto.description,
        categoryId: dto.categoryId,
        destinationId: dto.destinationId ?? null,
        startingPrice: dto.startingPrice,
        currency: dto.currency ?? 'EGP',
        durationDays: dto.durationDays,
        coverImageId: dto.coverImageId ?? null,
        itinerary: (dto.itinerary ?? null) as Prisma.InputJsonValue,
        included: dto.included ?? [],
        excluded: dto.excluded ?? [],
        meetingInfo: dto.meetingInfo ?? null,
        cancellationPolicy: dto.cancellationPolicy ?? null,
        isPublished: dto.isPublished ?? false,
      },
    });
  }

  async update(id: string, dto: UpdateTourDto): Promise<Tour> {
    await this.requireById(id);
    const data: Prisma.TourUpdateInput = {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.shortDescription !== undefined && { shortDescription: dto.shortDescription }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.categoryId !== undefined && { category: { connect: { id: dto.categoryId } } }),
      ...(dto.destinationId !== undefined && {
        destination: dto.destinationId === null
          ? { disconnect: true }
          : { connect: { id: dto.destinationId } },
      }),
      ...(dto.startingPrice !== undefined && { startingPrice: dto.startingPrice }),
      ...(dto.currency !== undefined && { currency: dto.currency }),
      ...(dto.durationDays !== undefined && { durationDays: dto.durationDays }),
      ...(dto.coverImageId !== undefined && {
        coverImageId: dto.coverImageId === null ? null : dto.coverImageId,
      }),
      ...(dto.itinerary !== undefined && { itinerary: dto.itinerary as Prisma.InputJsonValue }),
      ...(dto.included !== undefined && { included: dto.included }),
      ...(dto.excluded !== undefined && { excluded: dto.excluded }),
      ...(dto.meetingInfo !== undefined && { meetingInfo: dto.meetingInfo }),
      ...(dto.cancellationPolicy !== undefined && { cancellationPolicy: dto.cancellationPolicy }),
      ...(dto.isPublished !== undefined && { isPublished: dto.isPublished }),
    };
    return this.prisma.tour.update({ where: { id }, data });
  }

  /**
   * Soft delete — unpublishes the tour so it disappears from public
   * lists and the booking flow but stays in the DB for history /
   * audit / future re-activation. Hard delete would orphan
   * historical bookings (Booking.tourId FK).
   */
  async unpublish(id: string): Promise<Tour> {
    await this.requireById(id);
    return this.prisma.tour.update({
      where: { id },
      data: { isPublished: false },
    });
  }

  // ─── helpers ───────────────────────────────────────────────────

  private buildPublicWhere(query: ListToursQueryDto): Prisma.TourWhereInput {
    const where: Prisma.TourWhereInput = { isPublished: true };
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { shortDescription: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.category) {
      where.category = { slug: query.category };
    }
    if (query.destination) {
      where.destination = { slug: query.destination };
    }
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.startingPrice = {};
      if (query.minPrice !== undefined) where.startingPrice.gte = query.minPrice;
      if (query.maxPrice !== undefined) where.startingPrice.lte = query.maxPrice;
    }
    if (query.minDays !== undefined || query.maxDays !== undefined) {
      where.durationDays = {};
      if (query.minDays !== undefined) where.durationDays.gte = query.minDays;
      if (query.maxDays !== undefined) where.durationDays.lte = query.maxDays;
    }
    return where;
  }

  private buildOrderBy(sort: ListToursQueryDto['sort']): Prisma.TourOrderByWithRelationInput[] {
    switch (sort) {
      case 'price-asc':
        return [{ startingPrice: 'asc' }];
      case 'price-desc':
        return [{ startingPrice: 'desc' }];
      case 'duration-asc':
        return [{ durationDays: 'asc' }];
      case 'duration-desc':
        return [{ durationDays: 'desc' }];
      case 'newest':
      default:
        return [{ createdAt: 'desc' }];
    }
  }
}