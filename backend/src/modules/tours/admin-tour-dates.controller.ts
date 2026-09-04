import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type JwtUser } from '../auth/decorators/current-user.decorator.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';
import { TourDatesService } from './tour-dates.service.js';
import { CreateTourDateDto, UpdateTourDateDto } from './dto/tour.dto.js';

/**
 * /api/admin/tours/:tourId/dates and /api/admin/tour-dates/:id
 *
 * §9 — capacity management with audit log entries. Per the spec,
 * removing a TourDate with active bookings must trigger the bulk
 * `sendTourCancelledBulk` email flow (§12); that lands with Phase 11.
 */
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('api/admin')
export class AdminTourDatesController {
  constructor(
    private readonly dates: TourDatesService,
    private readonly audit: AuditLogService,
  ) {}

  @Get('tours/:tourId/dates')
  list(@Param('tourId') tourId: string) {
    return this.dates.listByTour(tourId);
  }

  @Post('tours/:tourId/dates')
  async add(
    @Param('tourId') tourId: string,
    @Body() dto: CreateTourDateDto,
    @CurrentUser() user: JwtUser,
  ) {
    const created = await this.dates.create(tourId, dto);
    await this.audit.record({
      adminUserId: user.id,
      action: 'TOUR_DATE_CREATED',
      entityType: 'TourDate',
      entityId: created.id,
      metadata: { tourId, capacity: created.capacity, startDate: created.startDate },
    });
    return created;
  }

  @Patch('tour-dates/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTourDateDto,
    @CurrentUser() user: JwtUser,
  ) {
    const updated = await this.dates.update(id, dto);
    await this.audit.record({
      adminUserId: user.id,
      action: 'TOUR_DATE_UPDATED',
      entityType: 'TourDate',
      entityId: updated.id,
      metadata: { fields: Object.keys(dto) },
    });
    return updated;
  }

  @Delete('tour-dates/:id')
  async remove(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    const result = await this.dates.remove(id);
    await this.audit.record({
      adminUserId: user.id,
      action: 'TOUR_DATE_REMOVED',
      entityType: 'TourDate',
      entityId: result.id,
    });
    return result;
  }

  /**
   * §12 — bulk cancellation flow. Cancels every active booking on
   * this TourDate and fires `sendTourCancelledBulk` for each. The
   * per-booking cancellation is committed atomically with the
   * TourDate delete; emails are post-commit best-effort.
   */
  @Post('tour-dates/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    const result = await this.dates.cancelTourDate(id);
    await this.audit.record({
      adminUserId: user.id,
      action: 'TOUR_DATE_CANCELLED_BULK',
      entityType: 'TourDate',
      entityId: result.id,
      metadata: { cancelledBookings: result.cancelledBookings },
    });
    return result;
  }
}