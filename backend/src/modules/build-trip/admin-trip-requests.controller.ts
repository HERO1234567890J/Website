import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { TripRequestsService } from './trip-requests.service.js';

/**
 * /api/admin/trip-requests — paginated inbox of incoming wizard
 * submissions. Status-change + contact-reply endpoints land in
 * Phase 9 alongside the rest of the booking pipeline.
 */
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('api/admin/trip-requests')
export class AdminTripRequestsController {
  constructor(private readonly requests: TripRequestsService) {}

  @Get()
  list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(50), ParseIntPipe) pageSize: number,
  ) {
    return this.requests.listAll(page, Math.min(pageSize, 200));
  }
}