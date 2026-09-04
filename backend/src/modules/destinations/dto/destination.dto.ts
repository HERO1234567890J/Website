import { IsBoolean, IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateDestinationDto {
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase, digits, and hyphens only.' })
  @Length(2, 64)
  slug!: string;

  @IsString()
  @Length(2, 80)
  name!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateDestinationDto {
  @IsOptional()
  @IsString()
  @Length(2, 80)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}