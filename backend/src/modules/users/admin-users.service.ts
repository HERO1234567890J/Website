import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';

export interface AdminUserListItem {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: User['role'];
  emailVerifiedAt: Date | null;
  isBlocked: boolean;
  blockReason: string | null;
  blockedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  bookingsCount: number;
  totalSpentEgp: number;
}

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  listAll(query: { page: number; pageSize: number; search?: string }) {
    const where: Prisma.UserWhereInput = {};
    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          emailVerifiedAt: true,
          isBlocked: true,
          blockReason: true,
          blockedAt: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { bookings: true } },
          bookings: {
            where: { status: { in: ['PAID', 'CONFIRMED', 'COMPLETED'] } },
            select: { total: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]).then(([items, total]) => ({
      items: items.map((u) => ({
        ...u,
        bookingsCount: u._count.bookings,
        totalSpentEgp: u.bookings.reduce((s, b) => s + b.total, 0),
        _count: undefined,
        bookings: undefined,
      })),
      total,
    }));
  }

  async updateRole(
    id: string,
    newRole: User['role'],
    adminUserId: string,
  ): Promise<{ id: string; role: User['role'] }> {
    const before = await this.prisma.user.findUnique({ where: { id } });
    if (!before) return this.prisma.user.update({
      where: { id },
      data: { role: newRole },
      select: { id: true, role: true },
    });
    const updated = await this.prisma.user.update({
      where: { id },
      data: { role: newRole },
      select: { id: true, role: true },
    });
    await this.audit.record({
      adminUserId,
      action: 'USER_ROLE_CHANGED',
      entityType: 'User',
      entityId: updated.id,
      metadata: { from: before.role, to: updated.role },
    });
    return updated;
  }

  /**
   * §15 / §18 — admin-managed block. When blocking, every active
   * refresh token for this user is revoked so any open session is
   * force-logged-out on the next API call (JwtAccessGuard and
   * JwtRefreshGuard both re-check `isBlocked` on every request).
   *
   * Admins cannot block themselves — the controller validates this
   * up front and returns 400 before this method runs.
   */
  async setBlocked(
    id: string,
    adminUserId: string,
    blocked: boolean,
    reason: string | undefined,
  ): Promise<{
    id: string;
    isBlocked: boolean;
    blockReason: string | null;
    blockedAt: Date | null;
  }> {
    const before = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, isBlocked: true },
    });
    if (!before) {
      throw new NotFoundException(`User ${id} not found.`);
    }
    if (before.isBlocked === blocked) {
      throw new BadRequestException(
        `User is already ${blocked ? 'blocked' : 'unblocked'}.`,
      );
    }

    const data: Prisma.UserUpdateInput = {
      isBlocked: blocked,
      blockReason: blocked ? reason ?? null : null,
      blockedAt: blocked ? new Date() : null,
    };
    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        isBlocked: true,
        blockReason: true,
        blockedAt: true,
      },
    });

    if (blocked) {
      // §18 — revoke every active refresh token so the user is
      // logged out of every device. The access token still has a
      // short TTL so a blocked user can't make new requests for
      // more than ~15 minutes even if they keep their current
      // access token; the JwtAccessGuard's isBlocked check closes
      // that window too.
      await this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    await this.audit.record({
      adminUserId,
      action: blocked ? 'USER_BLOCKED' : 'USER_UNBLOCKED',
      entityType: 'User',
      entityId: id,
      ...(reason ? { metadata: { reason } } : {}),
    });

    return updated;
  }

  async csvExport(search?: string): Promise<string> {
    const where: Prisma.UserWhereInput = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
        isBlocked: true,
        _count: { select: { bookings: true } },
        bookings: {
          where: { status: { in: ['PAID', 'CONFIRMED', 'COMPLETED'] } },
          select: { total: true },
        },
      },
    });

    const header = 'ID,Email,Name,Phone,Role,Joined,Blocked,Bookings,Total Spent (EGP)';
    const rows = users.map((u) => {
      const spent = u.bookings.reduce((s, b) => s + b.total, 0);
      return [
        u.id,
        u.email,
        u.name ?? '',
        u.phone ?? '',
        u.role,
        u.createdAt.toISOString().slice(0, 10),
        u.isBlocked ? 'Yes' : 'No',
        u._count.bookings,
        spent,
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });

    return [header, ...rows].join('\n');
  }
}