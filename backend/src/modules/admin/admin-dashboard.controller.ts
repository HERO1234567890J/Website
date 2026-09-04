import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { AdminDashboardService } from './admin-dashboard.service.js';

/**
 * /api/admin/dashboard — analytics snapshot (§15).
 *
 * Every figure here comes from a real Prisma aggregate. No fake
 * stats, no mocked numbers — see AdminDashboardService for the
 * exact queries.
 */
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('api/admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly dashboard: AdminDashboardService) {}

  @Get()
  snapshot() {
    return this.dashboard.snapshot();
  }

  @Get('revenue-timeseries')
  revenueTimeseries(@Query('months') months?: string) {
    return this.dashboard.revenueTimeseries(months ? parseInt(months, 10) : 8);
  }
}