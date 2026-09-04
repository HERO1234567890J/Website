import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type JwtUser } from '../auth/decorators/current-user.decorator.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';
import { SiteContentService } from './site-content.service.js';

/**
 * /api/admin/site-content — admin editor (§15 / §27).
 *
 *   GET   /api/admin/site-content/keys                       list all keys
 *   PUT   /api/admin/site-content/:key/:locale               upsert one row
 *   DELETE /api/admin/site-content/:key/:locale              hard delete (rare — only for cleanup)
 */
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('api/admin/site-content')
export class AdminSiteContentController {
  constructor(
    private readonly content: SiteContentService,
    private readonly audit: AuditLogService,
  ) {}

  @Get('keys')
  listKeys() {
    return this.content.listAllKeys();
  }

  @Put(':key/:locale')
  async upsert(
    @Param('key') key: string,
    @Param('locale') locale: string,
    @Body() body: { content: Record<string, unknown> },
    @CurrentUser() user: JwtUser,
  ) {
    const updated = await this.content.upsert(key, locale, body.content, user.id);
    await this.audit.record({
      adminUserId: user.id,
      action: 'SITE_CONTENT_UPSERTED',
      entityType: 'SiteContent',
      entityId: `${key}:${locale}`,
      metadata: { keys: Object.keys(body.content) },
    });
    return updated;
  }

  @Delete(':key/:locale')
  async delete(
    @Param('key') key: string,
    @Param('locale') locale: string,
    @CurrentUser() user: JwtUser,
  ) {
    const result = await this.content.deleteByKeyLocale(key, locale);
    await this.audit.record({
      adminUserId: user.id,
      action: 'SITE_CONTENT_DELETED',
      entityType: 'SiteContent',
      entityId: `${key}:${locale}`,
    });
    return result;
  }
}