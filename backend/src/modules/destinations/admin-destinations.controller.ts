import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type JwtUser } from '../auth/decorators/current-user.decorator.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';
import { DestinationsService } from './destinations.service.js';
import { CreateDestinationDto, UpdateDestinationDto } from './dto/destination.dto.js';

@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('api/admin/destinations')
export class AdminDestinationsController {
  constructor(
    private readonly destinations: DestinationsService,
    private readonly audit: AuditLogService,
  ) {}

  @Get()
  list() {
    return this.destinations.listAll();
  }

  @Post()
  async create(@Body() dto: CreateDestinationDto, @CurrentUser() user: JwtUser) {
    const created = await this.destinations.create(dto);
    await this.audit.record({
      adminUserId: user.id,
      action: 'DESTINATION_CREATED',
      entityType: 'Destination',
      entityId: created.id,
      metadata: { slug: created.slug, name: created.name },
    });
    return created;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDestinationDto,
    @CurrentUser() user: JwtUser,
  ) {
    const updated = await this.destinations.update(id, dto);
    await this.audit.record({
      adminUserId: user.id,
      action: 'DESTINATION_UPDATED',
      entityType: 'Destination',
      entityId: updated.id,
      metadata: { fields: Object.keys(dto) },
    });
    return updated;
  }

  @Delete(':id')
  async deactivate(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    const result = await this.destinations.deactivate(id);
    await this.audit.record({
      adminUserId: user.id,
      action: 'DESTINATION_DEACTIVATED',
      entityType: 'Destination',
      entityId: result.id,
    });
    return result;
  }
}