import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CreateLanguageDto {
  @IsString()
  @Length(2, 8)
  code!: string;

  @IsString()
  @Length(2, 80)
  name!: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isRtl?: boolean;
}

export class UpdateLanguageDto {
  @IsOptional()
  @IsString()
  @Length(2, 80)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isRtl?: boolean;
}