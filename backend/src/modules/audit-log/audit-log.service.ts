import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';

/**
 * §15 — every admin write action must write an AuditLog row capturing
 * who/what/when/target + a structured metadata diff (never raw request
 * bodies that could carry secrets).
 *
 * Used by admin controllers via a thin `record()` wrapper; failures
 * here must NOT roll back the business write (the audit log is for
 * forensics, not correctness of the action itself) — we log the
 * failure to stderr and continue.
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(params: {
    adminUserId: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          adminUserId: params.adminUserId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      this.logger.error(
        `AuditLog write failed (${params.action} on ${params.entityType}:${params.entityId}): ${(err as Error).message}`,
      );
    }
  }
}