import { Controller, Get } from '@nestjs/common';
import { TripTypePresetsService } from './trip-type-presets.service.js';
import { Public } from '../auth/decorators/public.decorator.js';

/**
 * /api/trip-type-presets — public list used by Scene 1 of the
 * Build-Trip wizard (src/pages/BuildTrip.tsx).
 */
@Controller('api/trip-type-presets')
export class TripTypePresetsController {
  constructor(private readonly presets: TripTypePresetsService) {}

  @Public()
  @Get()
  list() {
    return this.presets.listActive();
  }
}