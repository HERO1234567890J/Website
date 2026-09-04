import { Module } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { AdminUsersService } from './admin-users.service.js';
import { AdminUsersController } from './admin-users.controller.js';

/**
 * D-Trips backend — UsersModule
 *
 * §13 — profile lookup (UsersService) + customer-facing self-service
 *       (UsersController): getMe, updateMe, changePassword,
 *       updateNotificationPrefs.
 * §15 — admin list + role management (AdminUsersService + Controller).
 *
 * Phase 15E wires the customer-facing controller. The booking-
 * related methods on UsersService used by BookingsService (findById,
 * requireById) stay exported for the BookingsModule.
 */
@Module({
  controllers: [UsersController, AdminUsersController],
  providers: [UsersService, AdminUsersService],
  exports: [UsersService, AdminUsersService],
})
export class UsersModule {}