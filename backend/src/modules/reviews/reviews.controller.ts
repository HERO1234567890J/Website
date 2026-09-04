import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { CurrentUser, type JwtUser } from '../auth/decorators/current-user.decorator.js';
import { ReviewsService } from './reviews.service.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { Public } from '../auth/decorators/public.decorator.js';

/**
 * /api/reviews — public surface (§14).
 *
 *   POST /api/reviews                submit (auth required; eligibility check)
 *   GET  /api/reviews/tour/:tourId   public list of PUBLISHED reviews
 *   GET  /api/reviews/me             the authenticated user's reviews (all statuses)
 */
@Controller('api/reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @UseGuards(JwtAccessGuard)
  @Post()
  create(@Body() dto: CreateReviewDto, @CurrentUser() user: JwtUser) {
    return this.reviews.create(user.id, dto);
  }

  @Public()
  @Get('tour/:tourId')
  listForTour(@Param('tourId') tourId: string) {
    return this.reviews.listForTour(tourId);
  }

  @UseGuards(JwtAccessGuard)
  @Get('me')
  listMine(@CurrentUser() user: JwtUser) {
    return this.reviews.listForUser(user.id);
  }
}