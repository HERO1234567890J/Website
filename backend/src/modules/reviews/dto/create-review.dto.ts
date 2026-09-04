import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

/**
 * POST /api/reviews
 *
 * §14 — eligibility enforced server-side:
 *   - The authenticated user must own a Booking with:
 *       tourId === dto.tourId
 *       status  === COMPLETED
 *   - One review per Booking (DB-enforced via Review.bookingId @unique).
 *
 * New reviews start in PENDING and are only shown publicly after
 * admin approval (PATCH /api/admin/reviews/:id/approve).
 */
export class CreateReviewDto {
  @IsString()
  tourId!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  title?: string;

  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  body!: string;
}