import { Body, Controller, DefaultValuePipe, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type JwtUser } from '../auth/decorators/current-user.decorator.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';
import { FaqsService } from './faqs.service.js';
import { CreateFaqDto, UpdateFaqDto } from './dto/faq.dto.js';

@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('api/admin/faqs')
export class AdminFaqsController {
  constructor(
    private readonly faqs: FaqsService,
    private readonly audit: AuditLogService,
  ) {}

  @Get()
  list(
    @Query('page', new DefaultValuePipe(1)) page: number,
    @Query('pageSize', new DefaultValuePipe(50)) pageSize: number,
  ) {
    return this.faqs.listAllForAdmin({
      page,
      pageSize: Math.min(pageSize, 200),
    });
  }

  @Post()
  async create(@Body() dto: CreateFaqDto, @CurrentUser() user: JwtUser) {
    const created = await this.faqs.create(dto);
    await this.audit.record({
      adminUserId: user.id,
      action: 'FAQ_CREATED',
      entityType: 'FAQ',
      entityId: created.id,
      metadata: { question: created.question.slice(0, 80) },
    });
    return created;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateFaqDto,
    @CurrentUser() user: JwtUser,
  ) {
    const updated = await this.faqs.update(id, dto);
    await this.audit.record({
      adminUserId: user.id,
      action: 'FAQ_UPDATED',
      entityType: 'FAQ',
      entityId: updated.id,
      metadata: { fields: Object.keys(dto) },
    });
    return updated;
  }

  @Delete(':id')
  async deactivate(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    const result = await this.faqs.deactivate(id);
    await this.audit.record({
      adminUserId: user.id,
      action: 'FAQ_DEACTIVATED',
      entityType: 'FAQ',
      entityId: result.id,
    });
    return result;
  }
}