import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { validateEnv } from './config/env.validation.js';
import { initSentry } from './config/sentry.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';

async function bootstrap(): Promise<void> {
  // Fail fast on missing/invalid env (§18 / §20).
  const env = validateEnv(process.env);

  // §30 — init Sentry BEFORE the Nest app boots so boot-time failures
  // are captured too. No-op when SENTRY_DSN is unset.
  initSentry({ SENTRY_DSN: env.SENTRY_DSN, SENTRY_ENVIRONMENT: env.SENTRY_ENVIRONMENT });

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
    // §11 — webhook signature verification needs the raw request
    // body bytes, NOT a re-serialised JSON tree. NestJS exposes
    // them as `req.rawBody` when this flag is on.
    rawBody: true,
  });

  // ─── §18 — Security headers via Helmet ──────────────────────────
  // Sets X-Content-Type-Options, X-Frame-Options, Strict-Transport-
  // Security, X-XSS-Protection, Referrer-Policy, etc. Default
  // Helmet config is secure-by-default; only override what we
  // genuinely need.
  app.use(
    helmet({
      // Allow the Vite dev server's inline scripts/styles in dev.
      contentSecurityPolicy:
        process.env.NODE_ENV === 'production'
          ? undefined // use Helmet defaults (strict CSP)
          : false,  // disable CSP in dev for Vite HMR
      // NFC — frontend images are served from Bunny CDN, not inline.
      crossOriginEmbedderPolicy: false,
    }),
  );

  // ─── Global validation pipe (§18) ───────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ─── §18 — Global exception filter ──────────────────────────────
  // Strips stack traces and internal details in production.
  app.useGlobalFilters(new AllExceptionsFilter());

  // ─── §18/§20 — Request logging interceptor ──────────────────────
  // Logs method, URL, status, duration. Never logs bodies/secrets.
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Phase 15A — refresh tokens live in an httpOnly secure cookie set
  // by the AuthController. cookie-parser populates req.cookies so the
  // JwtRefreshGuard can read the value back on /api/auth/refresh.
  // The signed-cookie secret is shared with JWT_REFRESH_SECRET so the
  // cookie can be tamper-checked without a DB roundtrip; the DB still
  // owns revocation.
  app.use(cookieParser());

  // ─── §18 — CORS hardening ───────────────────────────────────────
  const config = app.get(ConfigService);
  const port = config.get<number>('app.port', 3001);
  const appUrl = config.get<string>('app.appUrl', 'http://localhost:3000');
  app.enableCors({
    origin: appUrl,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Idempotency-Key',
      'Accept',
      'Accept-Language',
      'X-Requested-With',
    ],
    exposedHeaders: ['X-Total-Count'],
    credentials: true,
    maxAge: 86400, // 24 h preflight cache
  });

  await app.listen(port);
  Logger.log(`D-Trips backend listening on :${port} (CORS → ${appUrl})`, 'Bootstrap');
}

void bootstrap();
