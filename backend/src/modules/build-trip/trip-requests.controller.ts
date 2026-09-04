import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { TripRequestsService } from './trip-requests.service.js';
import { CreateTripRequestDto } from './dto/trip-request.dto.js';
import { Public } from '../auth/decorators/public.decorator.js';

/**
 * /api/trip-requests — Scene 4 wizard submission.
 *
 * Public — guests can submit a trip request without an account per
 * §28 (no forced registration). The TripRequest row stores the
 * contact details so a later registration with the same verified
 * email can claim it (Phase 9 will wire that claim flow).
 */
@Controller('api/trip-requests')
export class TripRequestsController {
  constructor(private readonly requests: TripRequestsService) {}

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  submit(@Body() dto: CreateTripRequestDto) {
    return this.requests.create(dto);
  }
}