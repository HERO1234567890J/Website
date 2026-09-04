import { Body, Controller, DefaultValuePipe, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type JwtUser } from '../auth/decorators/current-user.decorator.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';
import { ToursService } from './tours.service.js';
import { CreateTourDto, UpdateTourDto } from './dto/tour.dto.js';

/**
 * /api/admin/tours — admin tour CRUD per §7.
 *
 * Every mutation writes an AuditLog row (§15).
 */
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('api/admin/tours')
export class AdminToursController {
  constructor(
    private readonly tours: ToursService,
    private readonly audit: AuditLogService,
  ) {}

  @Get()
  list(
    @Query('page', new DefaultValuePipe(1)) page: number,
    @Query('pageSize', new DefaultValuePipe(50)) pageSize: number,
    @Query('search') search?: string,
    @Query('status') status?: 'PUBLISHED' | 'DRAFT',
  ) {
    return this.tours.listAll({
      page,
      pageSize: Math.min(pageSize, 200),
      ...(search && search.trim() ? { search: search.trim() } : {}),
      ...(status ? { status } : {}),
    });
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.tours.requireById(id);
  }

  @Post()
  async create(@Body() dto: CreateTourDto, @CurrentUser() user: JwtUser) {
    const created = await this.tours.create(dto);
    await this.audit.record({
      adminUserId: user.id,
      action: 'TOUR_CREATED',
      entityType: 'Tour',
      entityId: created.id,
      metadata: { slug: created.slug, title: created.title },
    });
    return created;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTourDto,
    @CurrentUser() user: JwtUser,
  ) {
    const updated = await this.tours.update(id, dto);
    await this.audit.record({
      adminUserId: user.id,
      action: 'TOUR_UPDATED',
      entityType: 'Tour',
      entityId: updated.id,
      metadata: { fields: Object.keys(dto) },
    });
    return updated;
  }

  @Delete(':id')
  async unpublish(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    const result = await this.tours.unpublish(id);
    await this.audit.record({
      adminUserId: user.id,
      action: 'TOUR_UNPUBLISHED',
      entityType: 'Tour',
      entityId: result.id,
    });
    return result;
  }
}