import { Module } from '@nestjs/common';
import { CurrenciesService } from './currencies.service.js';
import { CurrenciesController } from './currencies.controller.js';
import { AdminCurrenciesController } from './admin-currencies.controller.js';

@Module({
  controllers: [CurrenciesController, AdminCurrenciesController],
  providers: [CurrenciesService],
  exports: [CurrenciesService],
})
export class CurrenciesModule {}