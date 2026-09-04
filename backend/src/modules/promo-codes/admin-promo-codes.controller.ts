import { Body, Controller, DefaultValuePipe, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type JwtUser } from '../auth/decorators/current-user.decorator.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';
import { PromoCodesService } from './promo-codes.service.js';
import { CreatePromoCodeDto, UpdatePromoCodeDto } from './dto/promo-code.dto.js';

/**
 * /api/admin/promo-codes — admin CRUD per §29.
 *
 * Hard delete is intentionally NOT exposed — promo codes stay in
 * the DB for audit history per §15. Deactivation flips `isActive`.
 */
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('api/admin/promo-codes')
export class AdminPromoCodesController {
  constructor(
    private readonly codes: PromoCodesService,
    private readonly audit: AuditLogService,
  ) {}

  @Get()
  list() {
    return this.codes.listAll();
  }

  /**
   * §29 — usage history per code. Stats (times redeemed,
   * total discount given) live on the PromoCode row itself
   * (`redeemedCount`); this endpoint returns the per-redemption
   * detail so the admin can audit who used the code and when.
   */
  @Get(':id/redemptions')
  redemptions(
    @Param('id') id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(50), ParseIntPipe) pageSize: number,
  ) {
    return this.codes.listRedemptions(id, page, Math.min(pageSize, 200));
  }

  @Post()
  async create(@Body() dto: CreatePromoCodeDto, @CurrentUser() user: JwtUser) {
    const created = await this.codes.create(dto);
    await this.audit.record({
      adminUserId: user.id,
      action: 'PROMO_CODE_CREATED',
      entityType: 'PromoCode',
      entityId: created.id,
      metadata: { code: created.code, type: created.type, value: created.value },
    });
    return created;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePromoCodeDto,
    @CurrentUser() user: JwtUser,
  ) {
    const updated = await this.codes.update(id, dto);
    await this.audit.record({
      adminUserId: user.id,
      action: 'PROMO_CODE_UPDATED',
      entityType: 'PromoCode',
      entityId: updated.id,
      metadata: { fields: Object.keys(dto) },
    });
    return updated;
  }

  @Delete(':id')
  async deactivate(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    const result = await this.codes.deactivate(id);
    await this.audit.record({
      adminUserId: user.id,
      action: 'PROMO_CODE_DEACTIVATED',
      entityType: 'PromoCode',
      entityId: result.id,
    });
    return result;
  }
}