import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role, ReviewStatus } from '@prisma/client';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type JwtUser } from '../auth/decorators/current-user.decorator.js';
import { ReviewsService } from './reviews.service.js';
import { RejectReviewDto } from './dto/reject-review.dto.js';

/**
 * /api/admin/reviews — admin moderation (§14).
 *
 *   GET   /api/admin/reviews                paginated inbox + ?status=
 *   PATCH /api/admin/reviews/:id/approve    PENDING → PUBLISHED
 *   PATCH /api/admin/reviews/:id/reject     PENDING → REJECTED
 *                                            (body: { reason? })
 */
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('api/admin/reviews')
export class AdminReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(50), ParseIntPipe) pageSize: number,
    @Query('status') status?: ReviewStatus,
  ) {
    return this.reviews.listAllForAdmin({
      page,
      pageSize: Math.min(pageSize, 200),
      ...(status ? { status } : {}),
    });
  }

  @Patch(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.reviews.approve(id, user.id);
  }

  @Patch(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectReviewDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.reviews.reject(id, user.id, dto.reason);
  }
}