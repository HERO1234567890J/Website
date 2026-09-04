import { Controller, Get } from '@nestjs/common';
import { CurrenciesService } from './currencies.service.js';
import { Public } from '../auth/decorators/public.decorator.js';

@Controller('api/currencies')
export class CurrenciesController {
  constructor(private readonly currencies: CurrenciesService) {}

  @Public()
  @Get()
  list() {
    return this.currencies.listEnabled();
  }
}