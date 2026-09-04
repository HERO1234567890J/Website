import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { AuditLogReadService } from './audit-log-read.service.js';

/**
 * /api/admin/audit-log — read-only view (§15).
 *
 *   GET /api/admin/audit-log
 *     ?action=         exact match
 *     ?entityType=     exact match (Tour, Booking, Review, …)
 *     ?entityId=       exact match
 *     ?adminUserId=    exact match
 *
 * No mutations live here. Write-only AuditLogService stays as-is.
 */
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('api/admin/audit-log')
export class AdminAuditLogController {
  constructor(private readonly audit: AuditLogReadService) {}

  @Get()
  list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(100), ParseIntPipe) pageSize: number,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('adminUserId') adminUserId?: string,
  ) {
    return this.audit.list({
      page,
      pageSize: Math.min(pageSize, 500),
      ...(action ? { action } : {}),
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
      ...(adminUserId ? { adminUserId } : {}),
    });
  }
}