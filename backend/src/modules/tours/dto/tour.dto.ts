import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

/**
 * GET /api/tours — query string.
 *
 * §7 — server-side search/filter/sort/pagination. Default sort is
 * `newest` (createdAt desc). `pageSize` is capped at 100 so an admin
 * can't accidentally request the whole catalog in one go.
 */
export class ListToursQueryDto {
  @IsOptional()
  @IsString()
  @Length(1, 80)
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  destination?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxDays?: number;

  @IsOptional()
  @IsString()
  @Matches(/^(price-asc|price-desc|duration-asc|duration-desc|newest)$/)
  sort?: 'price-asc' | 'price-desc' | 'duration-asc' | 'duration-desc' | 'newest';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

/**
 * POST /api/admin/tours
 *
 * §7 — full tour body. startingPrice is integer EGP piasters per §8.
 * itinerary is structured JSON (Day[]). coverImageId is a string
 * (URL or Bunny Storage ID once the upload pipeline lands).
 */
export class CreateTourDto {
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase, digits, and hyphens only.' })
  @Length(2, 96)
  slug!: string;

  @IsString()
  @Length(2, 160)
  title!: string;

  @IsString()
  @Length(1, 280)
  shortDescription!: string;

  @IsString()
  @Length(1, 8000)
  description!: string;

  @IsString()
  categoryId!: string;

  @IsOptional()
  @IsString()
  destinationId?: string;

  @IsInt()
  @Min(0)
  startingPrice!: number;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsInt()
  @Min(0)
  @Max(365)
  durationDays!: number;

  @IsOptional()
  @IsString()
  coverImageId?: string;

  @IsOptional()
  itinerary?: unknown;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  included?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excluded?: string[];

  @IsOptional()
  @IsString()
  meetingInfo?: string;

  @IsOptional()
  @IsString()
  cancellationPolicy?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class UpdateTourDto {
  @IsOptional()
  @IsString()
  @Length(2, 160)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(1, 280)
  shortDescription?: string;

  @IsOptional()
  @IsString()
  @Length(1, 8000)
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  destinationId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  startingPrice?: number;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  durationDays?: number;

  @IsOptional()
  @IsString()
  coverImageId?: string | null;

  @IsOptional()
  itinerary?: unknown;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  included?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excluded?: string[];

  @IsOptional()
  @IsString()
  meetingInfo?: string;

  @IsOptional()
  @IsString()
  cancellationPolicy?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

/**
 * POST /api/admin/tours/:id/dates
 *
 * §9 — capacity and remainingCapacity are tracked separately so the
 * server can enforce over-booking via row-level locks inside Prisma
 * interactive transactions (Booking creation later). For v1 we just
 * store both equal at insert time; the booking flow will decrement
 * remainingCapacity atomically.
 */
export class CreateTourDateDto {
  @IsISO8601()
  startDate!: string;

  @IsISO8601()
  endDate!: string;

  @IsInt()
  @Min(1)
  @Max(10000)
  capacity!: number;
}

export class UpdateTourDateDto {
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  capacity?: number;
}