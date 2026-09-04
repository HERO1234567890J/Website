import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { PromoCodesService } from './promo-codes.service.js';
import { ValidatePromoCodeDto } from './dto/promo-code.dto.js';
import { CurrentUser, type JwtUser } from '../auth/decorators/current-user.decorator.js';

/**
 * /api/promo-codes/validate — checkout-time gate.
 *
 * Authenticated so the server can apply the per-customer usage
 * limit (§29); the actual booking creation that REQUIRES a logged-
 * in user is still guest-checkout-friendly per §28. Anonymous
 * callers can still call validate but the per-customer check is
 * skipped.
 */
@UseGuards(JwtAccessGuard)
@Controller('api/promo-codes')
export class PromoCodesController {
  constructor(private readonly codes: PromoCodesService) {}

  @Post('validate')
  validate(@Body() dto: ValidatePromoCodeDto, @CurrentUser() user: JwtUser) {
    return this.codes.validate(dto, { userId: user.id });
  }
}