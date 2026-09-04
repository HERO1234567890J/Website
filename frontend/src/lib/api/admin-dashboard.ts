import { api } from './client.js';

/**
 * §15 — admin dashboard analytics snapshot.
 *
 * Mirrors `AdminDashboardService.snapshot()` on the backend. Every
 * figure is computed from a real Prisma aggregate on the production
 * tables — nothing here is fabricated. Money values are integer
 * EGP piasters per §8.
 */
export interface DashboardBookingCategory {
  tourId: string | null;
  categoryId: string | null;
  categoryName: string | null;
  count: number;
}

export interface DashboardRecentBooking {
  id: string;
  status: string;
  guestEmail: string;
  guestName: string;
  /** Integer EGP piasters (per §8). */
  total: number;
  /** ISO-8601 timestamp from JSON serialization. */
  createdAt: string;
  user: { email: string | null; name: string | null } | null;
  tour: { title: string; slug: string } | null;
}

export interface DashboardSnapshot {
  revenue: {
    /** Successful payments, lifetime — integer piasters. */
    totalEgp: number;
    /** Successful payments in the last 30 days — integer piasters. */
    last30dEgp: number;
  };
  bookings: {
    /** BookingStatus → count, e.g. { CONFIRMED: 12, PENDING: 3 }. */
    byStatus: Record<string, number>;
    byCategory: DashboardBookingCategory[];
    recent: DashboardRecentBooking[];
  };
  reviews: {
    pendingCount: number;
  };
  notifications: {
    failedCount: number;
    retryingCount: number;
  };
}

/**
 * GET /api/admin/dashboard — analytics snapshot.
 *
 * Admin-only. Real Prisma aggregates (§15). No params; the response
 * is a single point-in-time view covering revenue totals, bookings
 * by status + category, recent bookings, pending reviews, and
 * notification health.
 */
export function getDashboard(): Promise<DashboardSnapshot> {
  return api('/admin/dashboard');
}

export interface RevenueTimeseriesPoint {
  month: string;
  amount: number;
}

export interface RevenueTimeseriesResponse {
  currency: string;
  points: RevenueTimeseriesPoint[];
}

export function getRevenueTimeseries(months = 8): Promise<RevenueTimeseriesResponse> {
  return api(`/admin/dashboard/revenue-timeseries?months=${months}`);
}
