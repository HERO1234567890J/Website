import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
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
 * POST /api/trip-requests — Scene-4 submission of the Build-Trip
 * wizard. Mirrors the v1 frontend wizard state (src/hooks/useBuildTrip).
 *
 * Validation rules
 *   - tripTypePresetSlug must reference an active preset (validated
 *     again server-side in TripRequestsService.create).
 *   - destinations[] OR otherDestination non-empty (matches the
 *     Scene-2 `canProceedFromScene2` logic).
 *   - contactEmail is required + valid; contactPhone is the same
 *     shape the frontend uses in `minPhone()` validation.
 *   - notes capped at 4,000 chars to bound storage.
 */
export class CreateTripRequestDto {
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'tripTypePresetSlug must be a slug.' })
  tripTypePresetSlug!: string;

  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  destinations!: string[];

  @IsOptional()
  @IsString()
  @Length(1, 160)
  otherDestination?: string;

  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @IsOptional()
  @IsISO8601()
  dateTo?: string;

  @IsOptional()
  @IsString()
  @Length(1, 60)
  duration?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  travelers?: number;

  @IsOptional()
  @IsString()
  @Length(1, 60)
  budget?: string;

  @IsOptional()
  @IsString()
  @Max(4000)
  notes?: string;

  @IsString()
  @Length(1, 100)
  contactName!: string;

  @IsEmail({}, { message: 'A valid contact email is required.' })
  @Length(1, 254)
  contactEmail!: string;

  @IsString()
  @Matches(/^[0-9+\-\s()]{8,32}$/, { message: 'contactPhone looks invalid.' })
  contactPhone!: string;
}