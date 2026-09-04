import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type JwtUser } from '../auth/decorators/current-user.decorator.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';
import { TripTypePresetsService } from './trip-type-presets.service.js';
import { CreateTripTypePresetDto, UpdateTripTypePresetDto } from './dto/trip-type-preset.dto.js';

@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('api/admin/trip-type-presets')
export class AdminTripTypePresetsController {
  constructor(
    private readonly presets: TripTypePresetsService,
    private readonly audit: AuditLogService,
  ) {}

  @Get()
  list() {
    return this.presets.listAll();
  }

  @Post()
  async create(@Body() dto: CreateTripTypePresetDto, @CurrentUser() user: JwtUser) {
    const created = await this.presets.create(dto);
    await this.audit.record({
      adminUserId: user.id,
      action: 'TRIP_TYPE_PRESET_CREATED',
      entityType: 'TripTypePreset',
      entityId: created.id,
      metadata: { slug: created.slug, name: created.name },
    });
    return created;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTripTypePresetDto,
    @CurrentUser() user: JwtUser,
  ) {
    const updated = await this.presets.update(id, dto);
    await this.audit.record({
      adminUserId: user.id,
      action: 'TRIP_TYPE_PRESET_UPDATED',
      entityType: 'TripTypePreset',
      entityId: updated.id,
      metadata: { fields: Object.keys(dto) },
    });
    return updated;
  }

  @Delete(':id')
  async deactivate(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    const result = await this.presets.deactivate(id);
    await this.audit.record({
      adminUserId: user.id,
      action: 'TRIP_TYPE_PRESET_DEACTIVATED',
      entityType: 'TripTypePreset',
      entityId: result.id,
    });
    return result;
  }
}