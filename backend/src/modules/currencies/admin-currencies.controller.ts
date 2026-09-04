import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrenciesService } from './currencies.service.js';
import { CreateCurrencyDto, UpdateCurrencyDto } from './dto/currency.dto.js';

/**
 * /api/admin/currencies — admin CRUD (§26).
 *
 * Disabling a currency hides it from the public `/api/currencies`
 * list (the frontend currency toggle), but does NOT affect any
 * historical bookings (those always settle in EGP per §8).
 */
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('api/admin/currencies')
export class AdminCurrenciesController {
  constructor(private readonly currencies: CurrenciesService) {}

  @Get()
  list() {
    return this.currencies.listAll();
  }

  @Post()
  create(@Body() dto: CreateCurrencyDto) {
    return this.currencies.create(dto);
  }

  @Patch(':code')
  update(@Param('code') code: string, @Body() dto: UpdateCurrencyDto) {
    return this.currencies.update(code, dto);
  }
}