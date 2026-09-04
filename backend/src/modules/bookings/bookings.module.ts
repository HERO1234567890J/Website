import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service.js';
import { BookingsController } from './bookings.controller.js';
import { AdminBookingsController } from './admin-bookings.controller.js';
import { PromoCodesModule } from '../promo-codes/promo-codes.module.js';
import { UsersModule } from '../users/users.module.js';

/**
 * D-Trips backend — BookingsModule (§8 / §10 / §11 / §28)
 *
 * The heart of the booking pipeline. createBooking() is the
 * capacity-safe + idempotency-safe + promo-aware entry point.
 * State transitions go through the state-machine in
 * `./state-machine.ts`.
 *
 * Cross-module deps:
 *   PromoCodesModule — provides PromoCodesService for validate+redeem
 *   UsersModule       — provides UsersService for guest/user resolution
 */
@Module({
  imports: [PromoCodesModule, UsersModule],
  controllers: [BookingsController, AdminBookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}