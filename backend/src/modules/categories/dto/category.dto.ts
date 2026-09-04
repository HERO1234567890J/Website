import { IsBoolean, IsInt, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';

/**
 * POST /api/admin/categories
 *
 * §7 — Categories are admin-managed. Slug is the immutable lookup key.
 * The `name` field is the English default; SiteContent keyed by
 * `category:{slug}:name` overrides per locale (§25).
 */
export class CreateCategoryDto {
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase, digits, and hyphens only.' })
  @Length(2, 64)
  slug!: string;

  @IsString()
  @Length(2, 80)
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @Length(2, 80)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}