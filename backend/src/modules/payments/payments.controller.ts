import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { OptionalJwtGuard } from '../auth/guards/optional-jwt.guard.js';
import { CurrentUser, type JwtUser } from '../auth/decorators/current-user.decorator.js';
import { PaymentsService } from './payments.service.js';
import { CreatePaymentIntentDto } from './dto/create-intent.dto.js';

/**
 * /api/payments — public surface.
 *
 *   POST /api/payments/intent      create intent for an owned booking.
 *                                  §28 — accepts BOTH authenticated
 *                                  users (JWT) AND guests carrying
 *                                  `bookingId + guestEmail` matching
 *                                  the booking row. The OptionalJwtGuard
 *                                  attaches `req.user` only when a
 *                                  valid JWT is present; the service
 *                                  branches on its presence.
 *   POST /api/payments/webhook     EasyCash callback (gateway-only,
 *                                  no auth — verified by the gateway
 *                                  signature scheme in the
 *                                  EasyCashPaymentService impl)
 *   POST /api/payments/verify/:intentId  polling-friendly read for
 *                                       the customer-facing redirect
 *                                       page (NOT a source of truth —
 *                                       §11)
 *   GET  /api/payments/:id         owner-or-admin payment view
 *
 * The intent endpoint requires the Idempotency-Key header (same
 * pattern as POST /api/bookings).
 */
@Controller('api/payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /**
   * §28 — guest checkout accepts EITHER a JWT (registered user) OR
   * the (bookingId, guestEmail) pair from the same session as the
   * booking creation. The OptionalJwtGuard attaches req.user only
   * when a valid bearer is present.
   *
   * Rate limiting: 10 attempts / minute / IP (default Throttler
   * config in AppModule). Tight enough to make brute-forcing a
   * (bookingId, email) pair impractical; loose enough that the
   * legitimate checkout flow (one refresh + one retry on
   * network failure) isn't disrupted.
   */
  @UseGuards(OptionalJwtGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('intent')
  @HttpCode(HttpStatus.CREATED)
  async createIntent(
    @Body('bookingId', new ParseUUIDPipe()) bookingId: string,
    @Body() dto: CreatePaymentIntentDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @CurrentUser() user: JwtUser | null,
    @Req() req: Request & { ip?: string },
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required.');
    }
    const metadata = dto.metadata ? this.safeParseMetadata(dto.metadata) : undefined;
    return this.payments.createIntent(
      bookingId,
      {
        returnUrl: dto.returnUrl,
        cancelUrl: dto.cancelUrl,
        idempotencyKey,
        ...(metadata ? { metadata } : {}),
        ...(dto.guestEmail ? { guestEmail: dto.guestEmail.toLowerCase() } : {}),
      },
      { userId: user?.id, idempotencyKey, ...(req.ip ? { ip: req.ip } : {}) },
    );
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers() headers: Record<string, string | undefined>,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException(
        'Raw body unavailable — NestFactory must be created with { rawBody: true }.',
      );
    }
    // Pass the raw body and headers into the orchestrator; the
    // gateway implementation decides what (if anything) to do with
    // them. §11 — signature verification is the gateway's job.
    return this.payments.handleWebhook(
      { rawBody },
      {
        signature: headers['x-signature'] || headers['signature'],
        eventId: headers['x-event-id'] || headers['event-id'],
        eventType: headers['x-event-type'] || headers['event-type'],
        timestamp: headers['x-timestamp'] || headers['timestamp'],
      },
    );
  }

  @UseGuards(JwtAccessGuard)
  @Get(':id')
  async get(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: JwtUser) {
    return this.payments.getById(id, { userId: user.id, isAdmin: false });
  }

  private safeParseMetadata(raw: string): Record<string, unknown> {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      throw new BadRequestException('metadata must be a JSON object.');
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('metadata is not valid JSON.');
    }
  }
}