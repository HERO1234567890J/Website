import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

/**
 * §15 — admin dashboard analytics.
 *
 * NO fake statistics. Every number returned here is computed from
 * a real Prisma aggregate on the production tables — nothing is
 * hard-coded.
 */
export interface DashboardSnapshot {
  revenue: {
    totalEgp: number;
    last30dEgp: number;
  };
  bookings: {
    byStatus: Record<string, number>;
    byCategory: Array<{
      tourId: string | null;
      categoryId: string | null;
      categoryName: string | null;
      count: number;
    }>;
    recent: Array<{
      id: string;
      status: string;
      guestEmail: string;
      guestName: string;
      total: number;
      createdAt: Date;
      user: { email: string | null; name: string | null } | null;
      tour: { title: string; slug: string } | null;
    }>;
  };
  reviews: {
    pendingCount: number;
  };
  notifications: {
    failedCount: number;
    retryingCount: number;
  };
}

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async revenueTimeseries(months = 8): Promise<{ currency: string; points: Array<{ month: string; amount: number }> }> {
    const capped = Math.min(Math.max(months, 1), 24);
    const since = new Date();
    since.setMonth(since.getMonth() - capped);
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const rows = await this.prisma.$queryRaw<Array<{ month: Date; amount: bigint }>>`
      SELECT
        date_trunc('month', p."createdAt") AS month,
        COALESCE(SUM(p.amount), 0) AS amount
      FROM "Payment" p
      WHERE p.status = 'SUCCEEDED'
        AND p."createdAt" >= ${since}
      GROUP BY date_trunc('month', p."createdAt")
      ORDER BY month ASC
    `;

    // Build a complete months array so months with zero revenue show up
    const result: Array<{ month: string; amount: number }> = [];
    const cursor = new Date(since);
    const now = new Date();
    const dataMap = new Map(rows.map((r) => [r.month.toISOString().slice(0, 7), Number(r.amount)]));

    while (cursor <= now) {
      const key = cursor.toISOString().slice(0, 7);
      result.push({ month: key, amount: dataMap.get(key) ?? 0 });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return { currency: 'EGP', points: result };
  }

  async snapshot(): Promise<DashboardSnapshot> {
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalRevenueAgg,
      last30dRevenueAgg,
      bookingsByStatusRaw,
      bookingsByCategoryRaw,
      recent,
      pendingReviewCount,
      failedNotificationCount,
      retryingNotificationCount,
    ] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { status: 'SUCCEEDED' },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { status: 'SUCCEEDED', booking: { createdAt: { gte: since30d } } },
        _sum: { amount: true },
      }),
      this.prisma.booking.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.booking.groupBy({
        by: ['tourId'],
        where: { tourId: { not: null } },
        _count: { _all: true },
      }),
      this.prisma.booking.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { user: { select: { email: true, name: true } }, tour: { select: { title: true, slug: true } } },
      }),
      this.prisma.review.count({ where: { status: 'PENDING' } }),
      this.prisma.notification.count({ where: { status: 'FAILED' } }),
      this.prisma.notification.count({ where: { status: 'RETRYING' } }),
    ]);

    const tourIds = bookingsByCategoryRaw
      .map((row) => row.tourId)
      .filter((id): id is string => id !== null);
    const tours = tourIds.length
      ? await this.prisma.tour.findMany({
          where: { id: { in: tourIds } },
          select: { id: true, categoryId: true, category: { select: { name: true, slug: true } } },
        })
      : [];
    const tourLookup = new Map(tours.map((t) => [t.id, t]));

    const bookingsByCategory = bookingsByCategoryRaw
      .map((row) => {
        const t = row.tourId ? tourLookup.get(row.tourId) : undefined;
        return {
          tourId: row.tourId,
          categoryId: t?.categoryId ?? null,
          categoryName: t?.category.name ?? null,
          count: row._count._all,
        };
      })
      .sort((a, b) => b.count - a.count);

    const bookingsByStatus = Object.fromEntries(
      bookingsByStatusRaw.map((r) => [r.status, r._count._all]),
    ) as Record<string, number>;

    return {
      revenue: {
        totalEgp: totalRevenueAgg._sum.amount ?? 0,
        last30dEgp: last30dRevenueAgg._sum.amount ?? 0,
      },
      bookings: {
        byStatus: bookingsByStatus,
        byCategory: bookingsByCategory,
        recent: recent.map((b) => ({
          id: b.id,
          status: b.status,
          guestEmail: b.guestEmail,
          guestName: b.guestName,
          total: b.total,
          createdAt: b.createdAt,
          user: b.user,
          tour: b.tour,
        })),
      },
      reviews: {
        pendingCount: pendingReviewCount,
      },
      notifications: {
        failedCount: failedNotificationCount,
        retryingCount: retryingNotificationCount,
      },
    };
  }
}