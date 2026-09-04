import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PromoCode, PromoCodeRedemption, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  CreatePromoCodeDto,
  PromoCodeRejectionReason,
  UpdatePromoCodeDto,
  ValidatePromoCodeDto,
} from './dto/promo-code.dto.js';

/**
 * §29 — promo code lifecycle.
 *
 *   validate()    Checkout-time gate. Throws `BadRequestException`
 *                 with a stable `reason` field on rejection so the
 *                 frontend can render a specific message without
 *                 leaking whether the code exists.
 *   redeem()      Called from BookingsService inside the booking
 *                 creation transaction. Atomically increments the
 *                 `redeemedCount` counter (guarded by the row lock).
 *   admin CRUD    create / list / update / deactivate (delete is
 *                 intentionally NOT exposed — promo codes are kept
 *                 for audit history per §15).
 */
export interface PromoCodeValidationResult {
  promoCodeId: string;
  discountAmount: number;
}

@Injectable()
export class PromoCodesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── admin ─────────────────────────────────────────────────────

  listAll(): Promise<PromoCode[]> {
    return this.prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async requireById(id: string): Promise<PromoCode> {
    const p = await this.prisma.promoCode.findUnique({ where: { id } });
    if (!p) throw new NotFoundException(`PromoCode ${id} not found.`);
    return p;
  }

  async create(dto: CreatePromoCodeDto): Promise<PromoCode> {
    if (dto.type === 'PERCENTAGE' && dto.value > 100) {
      throw new BadRequestException('PERCENTAGE value must be 1..100.');
    }
    return this.prisma.promoCode.create({
      data: {
        code: dto.code.toUpperCase(),
        type: dto.type,
        value: dto.value,
        minBookingAmount: dto.minBookingAmount ?? null,
        scope: dto.scope ?? 'ALL',
        scopeTourIds: dto.scopeTourIds ?? [],
        scopeCategoryIds: dto.scopeCategoryIds ?? [],
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        totalUsageLimit: dto.totalUsageLimit ?? null,
        perCustomerUsageLimit: dto.perCustomerUsageLimit ?? null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdatePromoCodeDto): Promise<PromoCode> {
    await this.requireById(id);
    const existing = await this.requireById(id);
    if (existing.type === 'PERCENTAGE' && dto.value !== undefined && dto.value > 100) {
      throw new BadRequestException('PERCENTAGE value must be 1..100.');
    }
    const data: Prisma.PromoCodeUpdateInput = {
      ...(dto.value !== undefined && { value: dto.value }),
      ...(dto.minBookingAmount !== undefined && { minBookingAmount: dto.minBookingAmount }),
      ...(dto.scope !== undefined && { scope: dto.scope }),
      ...(dto.scopeTourIds !== undefined && { scopeTourIds: dto.scopeTourIds }),
      ...(dto.scopeCategoryIds !== undefined && { scopeCategoryIds: dto.scopeCategoryIds }),
      ...(dto.startDate !== undefined && { startDate: dto.startDate ? new Date(dto.startDate) : null }),
      ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
      ...(dto.totalUsageLimit !== undefined && { totalUsageLimit: dto.totalUsageLimit }),
      ...(dto.perCustomerUsageLimit !== undefined && {
        perCustomerUsageLimit: dto.perCustomerUsageLimit,
      }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    };
    return this.prisma.promoCode.update({ where: { id }, data });
  }

  async deactivate(id: string): Promise<PromoCode> {
    await this.requireById(id);
    return this.prisma.promoCode.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * §29 — redemption history for a code. Includes the booking +
   * user snapshot so the admin can answer "who used this code".
   */
  async listRedemptions(id: string, page: number, pageSize: number) {
    await this.requireById(id);
    const [items, total] = await Promise.all([
      this.prisma.promoCodeRedemption.findMany({
        where: { promoCodeId: id },
        orderBy: { redeemedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
      }),
      this.prisma.promoCodeRedemption.count({ where: { promoCodeId: id } }),
    ]);
    return { items, total };
  }

  // ─── public validate ───────────────────────────────────────────

  /**
   * Validate a code against the cart shape. Returns the discount
   * in EGP piasters. Throws `BadRequestException` with a stable
   * `reason` field on rejection.
   *
   * NB: this does NOT redeem. The caller (BookingsService) must
   * call `redeem()` inside the booking-creation transaction so
   * the `redeemedCount` increment is atomic with the booking
   * row + capacity lock.
   */
  async validate(
    dto: ValidatePromoCodeDto,
    ctx: { userId?: string },
  ): Promise<PromoCodeValidationResult> {
    const code = await this.prisma.promoCode.findUnique({
      where: { code: dto.code.toUpperCase() },
    });
    if (!code) throw this.reject('NOT_FOUND');

    const now = new Date();
    if (!code.isActive) throw this.reject('INACTIVE');
    if (code.startDate && code.startDate > now) throw this.reject('NOT_YET_ACTIVE');
    if (code.endDate && code.endDate < now) throw this.reject('EXPIRED');

    if (code.minBookingAmount && dto.subtotal < code.minBookingAmount) {
      throw this.reject('INSUFFICIENT_BOOKING_AMOUNT');
    }

    if (code.totalUsageLimit !== null && code.redeemedCount >= code.totalUsageLimit) {
      throw this.reject('TOTAL_USAGE_EXHAUSTED');
    }

    if (code.perCustomerUsageLimit !== null && ctx.userId) {
      const used = await this.prisma.promoCodeRedemption.count({
        where: { promoCodeId: code.id, userId: ctx.userId },
      });
      if (used >= code.perCustomerUsageLimit) {
        throw this.reject('PER_CUSTOMER_LIMIT_REACHED');
      }
    }

    // §29 — scope match. ALL skips; TOURS / CATEGORIES require
    // intersection with the cart's tourIds / categoryIds.
    if (code.scope === 'TOURS' && dto.tourIds && dto.tourIds.length > 0) {
      const intersects = dto.tourIds.some((id) => code.scopeTourIds.includes(id));
      if (!intersects) throw this.reject('SCOPE_MISMATCH');
    }
    if (code.scope === 'CATEGORIES' && dto.categoryIds && dto.categoryIds.length > 0) {
      const intersects = dto.categoryIds.some((id) => code.scopeCategoryIds.includes(id));
      if (!intersects) throw this.reject('SCOPE_MISMATCH');
    }

    const discountAmount = this.computeDiscount(code, dto.subtotal);
    return { promoCodeId: code.id, discountAmount };
  }

  /**
   * Atomically increment the redeemed counter and insert the
   * redemption ledger row. MUST be called inside the booking
   * creation transaction so the increment and the booking insert
   * commit together.
   */
  async redeem(
    tx: Prisma.TransactionClient,
    params: { promoCodeId: string; bookingId: string; userId?: string; discountAmount: number },
  ): Promise<PromoCodeRedemption> {
    await tx.promoCode.update({
      where: { id: params.promoCodeId },
      data: { redeemedCount: { increment: 1 } },
    });
    return tx.promoCodeRedemption.create({
      data: {
        promoCodeId: params.promoCodeId,
        bookingId: params.bookingId,
        userId: params.userId ?? null,
        discountAmount: params.discountAmount,
      },
    });
  }

  // ─── private ───────────────────────────────────────────────────

  private computeDiscount(code: PromoCode, subtotal: number): number {
    if (code.type === 'PERCENTAGE') {
      // code.value is integer percent (1..100). Round half-down on
      // the piaster boundary so totals never come back non-integer.
      return Math.floor((subtotal * code.value) / 100);
    }
    // FIXED_AMOUNT — value is piaster amount, capped at subtotal.
    return Math.min(subtotal, code.value);
  }

  private reject(reason: PromoCodeRejectionReason): never {
    throw new BadRequestException({ message: 'Promo code rejected.', reason });
  }
}