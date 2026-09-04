import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type JwtUser } from '../auth/decorators/current-user.decorator.js';
import { AdminUsersService } from './admin-users.service.js';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto.js';
import { BlockUserDto } from './dto/block-user.dto.js';

@UseGuards(JwtAccessGuard, RolesGuard)
@Roles('ADMIN')
@Controller('api/admin/users')
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(50), ParseIntPipe) pageSize: number,
    @Query('search') search?: string,
  ) {
    return this.users.listAll({
      page,
      pageSize: Math.min(pageSize, 200),
      ...(search ? { search } : {}),
    });
  }

  @Patch(':id')
  updateRole(
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserDto,
    @CurrentUser() user: JwtUser,
  ) {
    if (id === user.id) {
      throw new BadRequestException("You can't change your own role.");
    }
    return this.users.updateRole(id, dto.role, user.id);
  }

  /**
   * §15 / §18 — admin-managed user block. When blocked=true the
   * service revokes every active refresh token for this user so any
   * open session is force-logged-out. Block takes effect on the next
   * request (JwtAccessGuard and JwtRefreshGuard both re-check
   * isBlocked), so the admin doesn't need to wait for access-token
   * TTL to expire.
   */
  @Patch(':id/block')
  setBlocked(
    @Param('id') id: string,
    @Body() dto: BlockUserDto,
    @CurrentUser() user: JwtUser,
  ) {
    if (id === user.id) {
      throw new BadRequestException("You can't block your own account.");
    }
    return this.users.setBlocked(id, user.id, dto.blocked, dto.reason);
  }

  @Get('csv')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="users.csv"')
  async csvExport(@Query('search') search: string | undefined, @Res() res: Response) {
    const csv = await this.users.csvExport(search);
    res.send(csv);
  }
}