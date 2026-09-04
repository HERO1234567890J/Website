import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type JwtUser } from '../auth/decorators/current-user.decorator.js';
import { BookingsService } from './bookings.service.js';
import { AdminUpdateBookingDto } from './dto/create-booking.dto.js';

/**
 * /api/admin/bookings — admin view of the unified booking inbox.
 *
 * Status transitions land here via PATCH /api/admin/bookings/:id.
 * The state machine in `./state-machine.ts` is the only thing that
 * lets a transition succeed; everything else throws.
 */
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles('ADMIN')
@Controller('api/admin/bookings')
export class AdminBookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get()
  list(
    @Query('page', new DefaultValuePipe(1)) page: number,
    @Query('pageSize', new DefaultValuePipe(50)) pageSize: number,
    @Query('status', new DefaultValuePipe(undefined)) status?: BookingStatus,
    @Query('search') search?: string,
  ) {
    return this.bookings.listAllForAdmin({
      page,
      pageSize: Math.min(pageSize, 200),
      ...(status ? { status } : {}),
      ...(search && search.trim() ? { search: search.trim() } : {}),
    });
  }

  @Get('stats')
  stats() {
    return this.bookings.getStatsForAdmin();
  }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.bookings.getById(id, { isAdmin: true });
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AdminUpdateBookingDto,
    @CurrentUser() user: JwtUser,
  ) {
    if (!dto.status) {
      throw new BadRequestException('status is required.');
    }
    return this.bookings.adminTransition(id, dto, user.id);
  }
}