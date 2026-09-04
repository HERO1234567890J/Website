import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service.js';
import { NotificationsService } from './notifications.service.js';
import { EmailRetryService } from './email-retry.service.js';

/**
 * D-Trips backend — EmailModule (§12)
 *
 * @Global so every feature module (Auth, Bookings, Payments,
 * BuildTrip, future ContactMessages / Reviews / Admin) can call
 * `EmailService.send*` without explicit module imports.
 *
 * The retry worker is started in EmailRetryService.onModuleInit
 * and torn down in onModuleDestroy so the interval handle doesn't
 * leak across hot reloads in dev.
 */
@Global()
@Module({
  providers: [EmailService, NotificationsService, EmailRetryService],
  exports: [EmailService, NotificationsService, EmailRetryService],
})
export class EmailModule {}