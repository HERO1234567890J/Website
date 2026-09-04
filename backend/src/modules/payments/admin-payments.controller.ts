import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { PaymentsService } from './payments.service.js';

@UseGuards(JwtAccessGuard, RolesGuard)
@Roles('ADMIN')
@Controller('api/admin/payments')
export class AdminPaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(50), ParseIntPipe) pageSize: number,
    @Query('status') status?: PaymentStatus,
  ) {
    return this.payments.adminList({
      page,
      pageSize: Math.min(pageSize, 200),
      ...(status ? { status } : {}),
    });
  }

  @Get(':id')
  get(@Query('id', new ParseUUIDPipe()) id: string) {
    return this.payments.getById(id, { isAdmin: true });
  }
}