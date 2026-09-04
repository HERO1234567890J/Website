import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';

/**
 * §15 — read-only view over AuditLog.
 *
 * Existing AuditLogService (write-only) stays as-is. This class is
 * the read counterpart used by AdminAuditLogController.
 */
@Injectable()
export class AuditLogReadService {
  constructor(private readonly prisma: PrismaService) {}

  list(query: {
    page: number;
    pageSize: number;
    action?: string;
    entityType?: string;
    entityId?: string;
    adminUserId?: string;
  }) {
    const where: Prisma.AuditLogWhereInput = {};
    if (query.action) where.action = query.action;
    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId) where.entityId = query.entityId;
    if (query.adminUserId) where.adminUserId = query.adminUserId;

    return Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          admin: { select: { email: true, name: true, role: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]).then(([items, total]) => ({ items, total }));
  }
}