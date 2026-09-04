import { registerAs } from '@nestjs/config';

/**
 * Centralised typed configuration. Every env var referenced here MUST also
 * exist in `.env.example`. Validation happens in env.validation.ts at boot.
 */
export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  appUrl: string;
  apiUrl: string;
}

export interface AuthConfig {
  jwtSecret: string;
  jwtRefreshSecret: string;
  jwtAccessTtl: string;
  jwtRefreshTtl: string;
  bcryptRounds: number;
}

export interface EasyCashConfig {
  baseUrl: string;
  apiKey: string;
  webhookSecret: string;
}

export interface EmailConfig {
  resendApiKey: string;
  from: string;
  replyTo: string;
}

export interface BunnyConfig {
  storageZone: string;
  storageApiKey: string;
  cdnBase: string;
}

export interface SentryConfig {
  dsn: string;
  environment: string;
}

export interface LogConfig {
  level: string;
}

export const appConfig = registerAs('app', (): AppConfig => ({
  nodeEnv: (process.env.NODE_ENV as AppConfig['nodeEnv']) ?? 'development',
  port: Number(process.env.PORT ?? 3001),
  appUrl: process.env.APP_URL ?? 'http://localhost:3000',
  apiUrl: process.env.API_URL ?? 'http://localhost:3001',
}));

export const bunnyConfig = registerAs('bunny', (): BunnyConfig => ({
  storageZone: process.env.BUNNY_STORAGE_ZONE ?? '',
  storageApiKey: process.env.BUNNY_STORAGE_API_KEY ?? '',
  cdnBase: process.env.BUNNY_CDN_BASE ?? '',
}));

export default appConfig;

// Each nested config namespace is exposed via ConfigService.get<...>('auth')
// etc. Keeping them as separate factories makes module access explicit and
// tree-shakeable per the spec's "never expose server-side secrets" rule.