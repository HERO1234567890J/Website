import { IsBoolean, IsInt, IsOptional, IsString, Length, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateFaqDto {
  @IsString()
  @Length(5, 280)
  question!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(4000)
  answer!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateFaqDto {
  @IsOptional()
  @IsString()
  @Length(5, 280)
  question?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(4000)
  answer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}