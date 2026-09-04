import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ContactMessageStatus, Role } from '@prisma/client';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type JwtUser } from '../auth/decorators/current-user.decorator.js';
import { ContactMessagesService } from './contact-messages.service.js';
import { AdminUpdateContactMessageDto } from './dto/admin-update-contact-message.dto.js';

/**
 * /api/admin/contact-messages — admin inbox (§24).
 *
 *   GET   /api/admin/contact-messages        paginated + ?status= filter
 *   PATCH /api/admin/contact-messages/:id    status change + reply metadata
 */
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('api/admin/contact-messages')
export class AdminContactMessagesController {
  constructor(private readonly messages: ContactMessagesService) {}

  @Get()
  list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(50), ParseIntPipe) pageSize: number,
    @Query('status') status?: ContactMessageStatus,
  ) {
      return this.messages.listAllForAdmin({
        page,
        pageSize: Math.min(pageSize, 200),
        ...(status ? { status } : {}),
      });
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: AdminUpdateContactMessageDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.messages.adminUpdate(id, dto, user.id);
  }
}