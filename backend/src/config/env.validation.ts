import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  validateSync,
  Min,
} from 'class-validator';

/**
 * Strict env validation at boot — fail fast per §18 / §20 if anything
 * required is missing. Runs once in main.ts before NestFactory.create().
 */
export class EnvSchema {
  @IsEnum(['development', 'test', 'production'])
  NODE_ENV: 'development' | 'test' | 'production' = 'development';

  @IsInt()
  @Min(1)
  PORT = 3001;

  @IsUrl({ require_tld: false })
  APP_URL = 'http://localhost:3000';

  @IsUrl({ require_tld: false })
  API_URL = 'http://localhost:3001';

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  JWT_SECRET!: string;

  @IsString()
  JWT_REFRESH_SECRET!: string;

  @IsString()
  JWT_ACCESS_TTL = '15m';

  @IsString()
  JWT_REFRESH_TTL = '7d';

  @IsInt()
  @Min(4)
  @IsOptional()
  BCRYPT_ROUNDS = 12;

  @IsString()
  EASYCASH_BASE_URL!: string;

  @IsString()
  @IsOptional()
  EASYCASH_API_KEY?: string;

  @IsString()
  @IsOptional()
  EASYCASH_WEBHOOK_SECRET?: string;

  @IsString()
  @IsOptional()
  RESEND_API_KEY?: string;

  @IsString()
  EMAIL_FROM = 'bookings@d-trips.com';

  @IsString()
  EMAIL_REPLY_TO = 'hello@d-trips.com';

  @IsString()
  @IsOptional()
  BUNNY_STORAGE_ZONE?: string;

  @IsString()
  @IsOptional()
  BUNNY_STORAGE_API_KEY?: string;

  @IsString()
  @IsOptional()
  BUNNY_CDN_BASE?: string;

  @IsString()
  @IsOptional()
  SENTRY_DSN?: string;

  @IsString()
  @IsOptional()
  SENTRY_ENVIRONMENT?: string;

  @IsString()
  LOG_LEVEL = 'info';
}

export function validateEnv(raw: Record<string, unknown>): EnvSchema {
  const instance = plainToInstance(EnvSchema, raw, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(instance, { skipMissingProperties: false });
  if (errors.length > 0) {
    const messages = errors
      .map((e) => `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('\n  ');
    throw new Error(`Invalid environment configuration:\n  ${messages}`);
  }
  return instance;
}