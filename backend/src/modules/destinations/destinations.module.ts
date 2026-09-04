import { Module } from '@nestjs/common';
import { DestinationsService } from './destinations.service.js';
import { DestinationsController } from './destinations.controller.js';
import { AdminDestinationsController } from './admin-destinations.controller.js';

@Module({
  controllers: [DestinationsController, AdminDestinationsController],
  providers: [DestinationsService],
  exports: [DestinationsService],
})
export class DestinationsModule {}