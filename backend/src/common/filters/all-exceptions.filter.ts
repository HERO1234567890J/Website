import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import type { Request, Response } from 'express';

/**
 * §18 — Global exception filter.
 *
 * In production: strips stack traces, raw DB errors, and internal
 * details from every error response. Returns a consistent JSON shape
 * with `statusCode`, `message`, and optional `error`.
 *
 * In development: preserves the original NestJS error body for easier
 * debugging.
 *
 * Never logs passwords, tokens, or payment secrets.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isProduction = process.env.NODE_ENV === 'production';
    const isHttpException = exception instanceof HttpException;

    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // §30 — report to Sentry (no-op when SENTRY_DSN is unset). Never
    // report expected 4xx client errors; only 5xx and unexpected
    // throws matter for alerting. PII is scrubbed by `initSentry`'s
    // beforeSend hook before any payload leaves the server.
    if (status >= 500) {
      Sentry.withScope((scope) => {
        scope.setTag('http.status', String(status));
        scope.setTag('http.method', request.method);
        scope.setTag('http.url', request.url);
        Sentry.captureException(exception);
      });
    }

    const exceptionResponse = isHttpException
      ? exception.getResponse()
      : null;

    // Build the message — never leak internals in production.
    let message: string | string[];
    if (isHttpException && typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const resp = exceptionResponse as Record<string, unknown>;
      message = (resp.message as string | string[]) ?? exception.message;
    } else if (exception instanceof Error) {
      message = isProduction
        ? 'Internal server error'
        : exception.message;
    } else {
      message = 'Internal server error';
    }

    const error = isHttpException && !isProduction
      ? (exceptionResponse as Record<string, unknown>)?.error
      : undefined;

    // Structured log — never include request body (may contain
    // passwords, tokens, PII, payment data).
    this.logger.error(
      `${request.method} ${request.url} → ${status}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(status).json({
      statusCode: status,
      message,
      ...(error !== undefined ? { error } : {}),
      ...(isProduction
        ? {}
        : { stack: exception instanceof Error ? exception.stack : undefined }),
    });
  }
}
