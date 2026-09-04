import { Controller, Get } from '@nestjs/common';
import { FaqsService } from './faqs.service.js';
import { Public } from '../auth/decorators/public.decorator.js';

@Controller('api/faqs')
export class FaqsController {
  constructor(private readonly faqs: FaqsService) {}

  @Public()
  @Get()
  list() {
    return this.faqs.listActive();
  }
}