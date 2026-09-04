import { Module } from '@nestjs/common';
import { ToursService } from './tours.service.js';
import { TourDatesService } from './tour-dates.service.js';
import { ToursController } from './tours.controller.js';
import { AdminToursController } from './admin-tours.controller.js';
import { AdminTourDatesController } from './admin-tour-dates.controller.js';

@Module({
  controllers: [
    ToursController,
    AdminToursController,
    AdminTourDatesController,
  ],
  providers: [ToursService, TourDatesService],
  exports: [ToursService, TourDatesService],
})
export class ToursModule {}