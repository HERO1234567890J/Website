import { Module } from '@nestjs/common';
import { PromoCodesService } from './promo-codes.service.js';
import { PromoCodesController } from './promo-codes.controller.js';
import { AdminPromoCodesController } from './admin-promo-codes.controller.js';

@Module({
  controllers: [PromoCodesController, AdminPromoCodesController],
  providers: [PromoCodesService],
  exports: [PromoCodesService],
})
export class PromoCodesModule {}