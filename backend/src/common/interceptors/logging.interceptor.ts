import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

/**
 * §18 / §20 — Request logging interceptor.
 *
 * Logs method, URL, status code, and response time for every request.
 * Never logs request bodies, query params, headers, or response
 * payloads — these may contain passwords, tokens, PII, or payment
 * data.
 *
 * Slow requests (>2 s) are logged at WARN level so they stand out
 * in production dashboards.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const { method, url } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - start;
          const status = res.statusCode;
          const level = ms > 2000 ? 'warn' : 'log';
          this.logger[level](`${method} ${url} ${status} ${ms}ms`);
        },
        error: (err: unknown) => {
          const ms = Date.now() - start;
          const status =
            err instanceof Error && 'status' in err
              ? (err as { status: number }).status
              : 500;
          this.logger.error(
            `${method} ${url} ${status} ${ms}ms`,
            err instanceof Error ? err.stack : String(err),
          );
        },
      }),
    );
  }
}
