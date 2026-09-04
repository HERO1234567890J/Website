import { Module } from '@nestjs/common';
import { FaqsService } from './faqs.service.js';
import { FaqsController } from './faqs.controller.js';
import { AdminFaqsController } from './admin-faqs.controller.js';

@Module({
  controllers: [FaqsController, AdminFaqsController],
  providers: [FaqsService],
  exports: [FaqsService],
})
export class FaqsModule {}