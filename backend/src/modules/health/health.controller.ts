import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service.js';
import { Public } from '../auth/decorators/public.decorator.js';

@Controller('api/health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Public()
  @Get()
  check() {
    return this.health.check();
  }
}
