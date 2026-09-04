import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminDashboardService } from './admin-dashboard.service.js';

function makePrisma(queryRawResult: any[] = []) {
  return {
    $queryRaw: vi.fn().mockResolvedValue(queryRawResult),
    payment: {
      aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 0 } }),
    },
    booking: {
      count: vi.fn().mockResolvedValue(0),
      groupBy: vi.fn().mockResolvedValue([]),
      findMany: vi.fn().mockResolvedValue([]),
    },
    review: { count: vi.fn().mockResolvedValue(0) },
    notification: { count: vi.fn().mockResolvedValue(0) },
    tour: { findMany: vi.fn().mockResolvedValue([]) },
  };
}

describe('AdminDashboardService — revenueTimeseries', () => {
  let svc: AdminDashboardService;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns months with zero revenue as amount: 0 (not gaps)', async () => {
    // Use current month minus 1 so it's within the query range
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthKey = lastMonth.toISOString().slice(0, 7);
    const thisMonthKey = thisMonth.toISOString().slice(0, 7);

    // Simulate: only last month has revenue, this month has none
    const prisma = makePrisma([
      { month: lastMonth, amount: BigInt(50000) },
    ]);
    svc = new AdminDashboardService(prisma as never);

    const result = await svc.revenueTimeseries(2);

    expect(result.currency).toBe('EGP');
    expect(result.points.length).toBeGreaterThanOrEqual(2);

    // Last month should have the revenue
    const lm = result.points.find((p) => p.month === lastMonthKey);
    expect(lm).toBeDefined();
    expect(lm!.amount).toBe(50000);

    // This month should be zero-filled
    const tm = result.points.find((p) => p.month === thisMonthKey);
    expect(tm).toBeDefined();
    expect(tm!.amount).toBe(0);
  });

  it('returns all zero months when there is no revenue at all', async () => {
    const prisma = makePrisma([]); // empty — no revenue ever
    svc = new AdminDashboardService(prisma as never);

    const result = await svc.revenueTimeseries(8);

    expect(result.currency).toBe('EGP');
    expect(result.points.length).toBeGreaterThanOrEqual(8);
    expect(result.points.every((p) => p.amount === 0)).toBe(true);
  });

  it('caps months to 24 maximum', async () => {
    const prisma = makePrisma([]);
    svc = new AdminDashboardService(prisma as never);

    const result = await svc.revenueTimeseries(100);

    // capped at 24, plus the current month = 25 points
    expect(result.points.length).toBeLessThanOrEqual(25);
  });

  it('defaults to 8 months when no argument is provided', async () => {
    const prisma = makePrisma([]);
    svc = new AdminDashboardService(prisma as never);

    const result = await svc.revenueTimeseries();

    expect(result.points.length).toBeGreaterThanOrEqual(8);
  });

  it('converts BigInt amounts to regular numbers', async () => {
    // Use current month so it falls within the query range
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const prisma = makePrisma([
      { month: thisMonth, amount: BigInt(1234567) },
    ]);
    svc = new AdminDashboardService(prisma as never);

    const result = await svc.revenueTimeseries(1);

    const point = result.points.find((p) => p.amount > 0);
    expect(point).toBeDefined();
    expect(typeof point!.amount).toBe('number');
    expect(point!.amount).toBe(1234567);
  });
});
