import { Module } from '@nestjs/common';
import { TripTypePresetsService } from './trip-type-presets.service.js';
import { TripRequestsService } from './trip-requests.service.js';
import { TripTypePresetsController } from './trip-type-presets.controller.js';
import { TripRequestsController } from './trip-requests.controller.js';
import { AdminTripTypePresetsController } from './admin-trip-type-presets.controller.js';
import { AdminTripRequestsController } from './admin-trip-requests.controller.js';

/**
 * D-Trips backend — BuildTripModule (§7)
 *
 * Hosts the wizard backend:
 *   - TripTypePreset  → Scene 1 (trip type selector)
 *   - TripRequest     → Scene 4 submission (Destinations → Details → Review)
 *
 * The TripRequest → Booking promotion (the wizard's "checkout" path)
 * lands in Phase 9 (Bookings) along with the unified state machine.
 */
@Module({
  controllers: [
    TripTypePresetsController,
    TripRequestsController,
    AdminTripTypePresetsController,
    AdminTripRequestsController,
  ],
  providers: [TripTypePresetsService, TripRequestsService],
  exports: [TripTypePresetsService, TripRequestsService],
})
export class BuildTripModule {}