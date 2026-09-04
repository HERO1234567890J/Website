import { Controller, Get } from '@nestjs/common';
import { DestinationsService } from './destinations.service.js';
import { Public } from '../auth/decorators/public.decorator.js';

@Controller('api/destinations')
export class DestinationsController {
  constructor(private readonly destinations: DestinationsService) {}

  @Public()
  @Get()
  list() {
    return this.destinations.listActive();
  }
}