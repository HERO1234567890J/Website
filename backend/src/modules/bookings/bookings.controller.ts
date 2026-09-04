import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { BookingsService } from './bookings.service.js';
import { UsersService } from '../users/users.service.js';
import { CancelBookingDto, CreateBookingDto } from './dto/create-booking.dto.js';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { CurrentUser, type JwtUser } from '../auth/decorators/current-user.decorator.js';

/**
 * /api/bookings — public surface.
 *
 * §11-style idempotency: POST /api/bookings requires an
 * `Idempotency-Key` header (client-generated UUID). A retry of the
 * same key returns the existing booking row without recreating it.
 *
 * Authentication is OPTIONAL on create (guest checkout, §28). The
 * remaining endpoints (cancel, claim, get, list) require a valid
 * JWT — `assertCanRead` inside the service enforces that a caller
 * can only see their own bookings (or those matching their email
 * for the pre-claim window).
 */
@Controller('api/bookings')
export class BookingsController {
  constructor(
    private readonly bookings: BookingsService,
    private readonly users: UsersService,
  ) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateBookingDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @CurrentUser() user: JwtUser | null,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required.');
    }
    // Loose UUID format check — accept any unique string the client
    // generates, but require non-empty + bounded length so we don't
    // accept arbitrary attacker payloads.
    if (idempotencyKey.length < 8 || idempotencyKey.length > 200) {
      throw new BadRequestException('Idempotency-Key must be 8–200 chars.');
    }

    // Resolve the current authenticated user (may be null for guests).
    const ctxUser = user
      ? await this.users.findById(user.id)
      : null;

    const payload: CreateBookingDto = {
      ...dto,
      // Flip the sentinel so @ValidateIf skips guest fields for
      // authenticated users. Server still prefers the JWT-derived
      // email/name, but the DTO validation doesn't block the call.
      _isAuthenticated: !!ctxUser,
    };

    return this.bookings.createBooking(payload, {
      userId: ctxUser?.id,
      idempotencyKey,
    });
  }

  @UseGuards(JwtAccessGuard)
  @Get()
  async listMine(@CurrentUser() user: JwtUser) {
    const full = await this.users.requireById(user.id);
    return this.bookings.listMine({ userId: user.id, email: full.email });
  }

  @UseGuards(JwtAccessGuard)
  @Get(':id')
  async get(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    const full = await this.users.requireById(user.id);
    return this.bookings.getById(id, {
      userId: user.id,
      guestEmail: full.email,
      isAdmin: false,
    });
  }

  @UseGuards(JwtAccessGuard)
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
    @CurrentUser() user: JwtUser,
  ) {
    const full = await this.users.requireById(user.id);
    return this.bookings.cancelByCustomer(id, { userId: user.id, guestEmail: full.email }, dto);
  }

  @UseGuards(JwtAccessGuard)
  @Post(':id/claim')
  @HttpCode(HttpStatus.OK)
  async claim(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.bookings.claim(id, user.id);
  }
}