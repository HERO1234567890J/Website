import { Controller, Get } from '@nestjs/common';
import { LanguagesService } from './languages.service.js';
import { Public } from '../auth/decorators/public.decorator.js';

@Controller('api/languages')
export class LanguagesController {
  constructor(private readonly languages: LanguagesService) {}

  @Public()
  @Get()
  list() {
    return this.languages.listEnabled();
  }
}