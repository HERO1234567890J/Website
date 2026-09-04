import { Controller, Get, Query } from '@nestjs/common';
import { SiteContentService } from './site-content.service.js';
import { Public } from '../auth/decorators/public.decorator.js';

@Controller('api/site-content')
export class SiteContentController {
  constructor(private readonly content: SiteContentService) {}

  /**
   * Public read — single key. `?key=homepage.hero&locale=en`.
   */
  @Public()
  @Get()
  get(@Query('key') key: string, @Query('locale') locale: string) {
    return this.content.get(key, locale);
  }

  /**
   * Public read — batch. `?keys=homepage.hero,company.contact&locale=en`.
   * Returns an array of { key, row } so the frontend can hydrate a
   * whole page with one round trip.
   */
  @Public()
  @Get('batch')
  batch(@Query('keys') keys: string, @Query('locale') locale: string) {
    const list = keys.split(',').map((k) => k.trim()).filter(Boolean);
    return this.content.getMany(list, locale);
  }
}