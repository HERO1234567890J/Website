import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminUsersService } from './admin-users.service.js';

function makePrisma(users: any[] = [], totalCount = 0) {
  return {
    user: {
      findMany: vi.fn().mockResolvedValue(users),
      count: vi.fn().mockResolvedValue(totalCount),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    refreshToken: { updateMany: vi.fn() },
    $transaction: vi.fn(async (fns: any[]) => {
      const results = [];
      for (const fn of fns) {
        results.push(await fn);
      }
      return results;
    }),
  };
}

function makeAudit() {
  return { record: vi.fn() };
}

function makeUser(overrides: Partial<any> = {}) {
  return {
    id: 'u-1',
    email: 'test@example.com',
    name: 'Test User',
    phone: null,
    role: 'CUSTOMER' as const,
    emailVerifiedAt: null,
    isBlocked: false,
    blockReason: null,
    blockedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    _count: { bookings: 3 },
    bookings: [
      { total: 5000 },
      { total: 3000 },
      { total: 2000 },
    ],
    ...overrides,
  };
}

describe('AdminUsersService', () => {
  let svc: AdminUsersService;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listAll — bookings count and total spent', () => {
    it('returns bookingsCount and totalSpentEgp per user', async () => {
      const user = makeUser();
      const prisma = makePrisma([user], 1);
      svc = new AdminUsersService(prisma as never, makeAudit() as never);

      const result = await svc.listAll({ page: 1, pageSize: 25 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].bookingsCount).toBe(3);
      expect(result.items[0].totalSpentEgp).toBe(10000); // 5000 + 3000 + 2000
    });

    it('returns 0 totalSpentEgp when user has no qualifying bookings', async () => {
      const user = makeUser({ _count: { bookings: 0 }, bookings: [] });
      const prisma = makePrisma([user], 1);
      svc = new AdminUsersService(prisma as never, makeAudit() as never);

      const result = await svc.listAll({ page: 1, pageSize: 25 });

      expect(result.items[0].bookingsCount).toBe(0);
      expect(result.items[0].totalSpentEgp).toBe(0);
    });

    it('does not include raw _count or bookings arrays in the returned items', async () => {
      const user = makeUser();
      const prisma = makePrisma([user], 1);
      svc = new AdminUsersService(prisma as never, makeAudit() as never);

      const result = await svc.listAll({ page: 1, pageSize: 25 });

      // _count and bookings are set to undefined (stripped from response)
      expect(result.items[0]._count).toBeUndefined();
      expect(result.items[0].bookings).toBeUndefined();
      // But the computed fields are present
      expect(result.items[0].bookingsCount).toBe(3);
      expect(result.items[0].totalSpentEgp).toBe(10000);
    });

    it('only aggregates PAID/CONFIRMED/COMPLETED bookings (filtered by Prisma where clause)', async () => {
      const user = makeUser();
      const prisma = makePrisma([user], 1);
      svc = new AdminUsersService(prisma as never, makeAudit() as never);

      await svc.listAll({ page: 1, pageSize: 25 });

      // The bookings select should have a where clause for status
      const findManyCall = prisma.user.findMany.mock.calls[0][0];
      const bookingsSelect = findManyCall.select.bookings;
      expect(bookingsSelect.where.status.in).toEqual(['PAID', 'CONFIRMED', 'COMPLETED']);
    });
  });

  describe('csvExport', () => {
    it('returns CSV with header and user rows', async () => {
      const user = makeUser();
      const prisma = makePrisma([user], 1);
      svc = new AdminUsersService(prisma as never, makeAudit() as never);

      const csv = await svc.csvExport();

      const lines = csv.split('\n');
      expect(lines[0]).toContain('ID');
      expect(lines[0]).toContain('Email');
      expect(lines[0]).toContain('Bookings');
      expect(lines[0]).toContain('Total Spent');
      expect(lines.length).toBe(2); // header + 1 row
      expect(lines[1]).toContain('test@example.com');
      expect(lines[1]).toContain('3'); // bookings count
      expect(lines[1]).toContain('10000'); // total spent
    });

    it('applies search filter to the query', async () => {
      const prisma = makePrisma([], 0);
      svc = new AdminUsersService(prisma as never, makeAudit() as never);

      await svc.csvExport('alice');

      const findManyCall = prisma.user.findMany.mock.calls[0][0];
      expect(findManyCall.where.OR).toBeDefined();
      expect(findManyCall.where.OR).toHaveLength(2);
    });

    it('returns only the header when no users match', async () => {
      const prisma = makePrisma([], 0);
      svc = new AdminUsersService(prisma as never, makeAudit() as never);

      const csv = await svc.csvExport('nonexistent');
      const lines = csv.split('\n');
      expect(lines.length).toBe(1); // header only
    });
  });
});
