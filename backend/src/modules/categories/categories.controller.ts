import { Controller, Get } from '@nestjs/common';
import { CategoriesService } from './categories.service.js';
import { Public } from '../auth/decorators/public.decorator.js';

/**
 * Public surface — used by the public site's TourCatalog to render
 * category filters and by the Build-Trip wizard's category picker.
 */
@Controller('api/categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Public()
  @Get()
  list() {
    return this.categories.listActive();
  }
}