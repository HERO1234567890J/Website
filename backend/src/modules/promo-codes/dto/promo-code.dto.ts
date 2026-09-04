import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { PromoCodeScope, PromoCodeType } from '@prisma/client';

const SLUG_RE = /^[A-Z0-9_-]+$/i;

/**
 * POST /api/admin/promo-codes
 *
 * §29 — code is the human-typed identifier (case-insensitive on
 * lookup; stored uppercased). `value` is interpreted by `type`:
 *   PERCENTAGE   → 1..100 (percent off)
 *   FIXED_AMOUNT → EGP piasters (integer)
 * Scope-specific IDs (`scopeTourIds`, `scopeCategoryIds`) are
 * only consulted when scope is TOURS / CATEGORIES.
 */
export class CreatePromoCodeDto {
  @IsString()
  @Matches(SLUG_RE, { message: 'code may contain letters, digits, hyphens, underscores.' })
  @Length(2, 32)
  code!: string;

  @IsEnum(PromoCodeType)
  type!: PromoCodeType;

  @IsInt()
  @Min(1)
  value!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  minBookingAmount?: number;

  @IsOptional()
  @IsEnum(PromoCodeScope)
  scope?: PromoCodeScope;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  scopeTourIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  scopeCategoryIds?: string[];

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  totalUsageLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  perCustomerUsageLimit?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePromoCodeDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  value?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  minBookingAmount?: number;

  @IsOptional()
  @IsEnum(PromoCodeScope)
  scope?: PromoCodeScope;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  scopeTourIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  scopeCategoryIds?: string[];

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  totalUsageLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  perCustomerUsageLimit?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * POST /api/promo-codes/validate — checkout-time validation.
 *
 * The customer types a code at checkout; the frontend posts the
 * code + the cart shape (tourId list or categoryId list, traveler
 * count, subtotal in EGP piasters). The server returns either the
 * computed discount or a structured rejection reason.
 *
 * NB: this endpoint DOES NOT redeem — redemption happens when the
 * booking is created in `BookingsService` and the
 * `PromoCodeRedemption` row is inserted there.
 */
export class ValidatePromoCodeDto {
  @IsString()
  @Matches(SLUG_RE)
  @Length(2, 32)
  code!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  tourIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  categoryIds?: string[];

  @IsInt()
  @Min(1)
  @Max(1000)
  @Type(() => Number)
  travelerCount!: number;

  @IsInt()
  @Min(1)
  subtotal!: number;
}

export type PromoCodeRejectionReason =
  | 'NOT_FOUND'
  | 'INACTIVE'
  | 'NOT_YET_ACTIVE'
  | 'EXPIRED'
  | 'INSUFFICIENT_BOOKING_AMOUNT'
  | 'TOTAL_USAGE_EXHAUSTED'
  | 'PER_CUSTOMER_LIMIT_REACHED'
  | 'SCOPE_MISMATCH';