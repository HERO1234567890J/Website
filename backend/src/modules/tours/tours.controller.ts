import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ToursService } from './tours.service.js';
import { ListToursQueryDto } from './dto/tour.dto.js';
import { Public } from '../auth/decorators/public.decorator.js';

/**
 * /api/tours — public catalog and detail.
 *
 * §7 — server-side search/filter/sort/pagination lives in the service
 * layer. The public list excludes unpublished tours automatically.
 */
@Controller('api/tours')
export class ToursController {
  constructor(private readonly tours: ToursService) {}

  @Public()
  @Get()
  list(@Query() query: ListToursQueryDto) {
    return this.tours.list(query);
  }

  @Public()
  @Get(':slug')
  detail(@Param('slug') slug: string) {
    return this.tours.getBySlug(slug);
  }

  @Public()
  @Get(':slug/availability')
  availability(@Param('slug') slug: string) {
    return this.tours.availability(slug);
  }

  /**
   * §8 — server-authoritative price preview.
   *
   * `?dateId=<tourDateId>&travelers=<n>` → price breakdown for the
   * checkout OrderSummary. The frontend never multiplies anything
   * itself; this endpoint is the single source of truth.
   */
  @Public()
  @Get(':slug/price')
  price(
    @Param('slug') slug: string,
    @Query('dateId') dateId: string,
    @Query('travelers', new DefaultValuePipe(1), ParseIntPipe) travelers: number,
  ) {
    if (!dateId) {
      throw new BadRequestException('dateId query param is required.');
    }
    if (travelers < 1 || travelers > 20) {
      throw new BadRequestException('travelers must be between 1 and 20.');
    }
    return this.tours.price(slug, dateId, travelers);
  }
}