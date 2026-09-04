import { Module } from '@nestjs/common';
import { AdminDashboardController } from './admin-dashboard.controller.js';
import { AdminDashboardService } from './admin-dashboard.service.js';

/**
 * D-Trips backend — AdminModule (§15)
 *
 * Phase 12 wires the dashboard analytics snapshot endpoint. The
 * 7 admin sections (Dashboard, Tours, Bookings, Users, Reviews,
 * FAQs, Contact Messages) are split across the feature modules
 * themselves (ToursModule, BookingsModule, UsersModule, etc.) —
 * each module owns its own `admin-*.controller.ts`.
 *
 * This module hosts only the cross-section analytics that doesn't
 * belong to a single feature:
 *   GET /api/admin/dashboard — single snapshot endpoint
 *
 * Site Content & Settings (currencies, languages, privacy policy
 * text, etc.) lands with Phase 13 — i18n is a prerequisite.
 */
@Module({
  controllers: [AdminDashboardController],
  providers: [AdminDashboardService],
})
export class AdminModule {}