import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { PaymentsController } from './payments.controller.js';
import { AdminPaymentsController } from './admin-payments.controller.js';
import { EasyCashPaymentService } from './easycash-payment.service.js';
import { PAYMENT_SERVICE } from './payment-service.interface.js';
import { BookingsModule } from '../bookings/bookings.module.js';
import { UsersModule } from '../users/users.module.js';

/**
 * D-Trips backend — PaymentsModule (§11)
 *
 * Wires the gateway implementation behind the PaymentService
 * interface via DI. To swap EasyCash for another gateway, add it
 * as a second `useClass` provider with a discriminator (e.g. a
 * factory that picks one based on `Payment.gateway`). For v1 we
 * only ship the EasyCash stub.
 */
@Module({
  imports: [BookingsModule, UsersModule],
  controllers: [PaymentsController, AdminPaymentsController],
  providers: [
    EasyCashPaymentService,
    {
      provide: PAYMENT_SERVICE,
      useExisting: EasyCashPaymentService,
    },
    PaymentsService,
  ],
  exports: [PaymentsService, PAYMENT_SERVICE],
})
export class PaymentsModule {}