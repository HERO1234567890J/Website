import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Length, Min, MinLength } from 'class-validator';

/**
 * POST /api/admin/currencies
 *
 * §26 — admin-configurable display currencies. The base currency
 * is EGP (set once via seed); additional display currencies (USD,
 * EUR, …) are added here. `exchangeRateToEgp` is the multiplier
 * (1 display-unit = N EGP); refresh is manual in v1, automated via
 * a cron when the business supplies a rate source.
 */
export class CreateCurrencyDto {
  @IsString()
  @Length(3, 3)
  @MinLength(3)
  code!: string;

  @IsString()
  @Length(1, 8)
  symbol!: string;

  @IsNumber()
  @Min(0.000001)
  exchangeRateToEgp!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

export class UpdateCurrencyDto {
  @IsOptional()
  @IsString()
  @Length(1, 8)
  symbol?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.000001)
  exchangeRateToEgp?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}