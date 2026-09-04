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
import { CurrentUser, type JwtUser } from '../auth/decorators/current-user.decorator.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';
import { LanguagesService } from './languages.service.js';
import { CreateLanguageDto, UpdateLanguageDto } from './dto/language.dto.js';

@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('api/admin/languages')
export class AdminLanguagesController {
  constructor(
    private readonly languages: LanguagesService,
    private readonly audit: AuditLogService,
  ) {}

  @Get()
  list() {
    return this.languages.listAll();
  }

  @Post()
  async create(@Body() dto: CreateLanguageDto, @CurrentUser() user: JwtUser) {
    const created = await this.languages.create(dto);
    await this.audit.record({
      adminUserId: user.id,
      action: 'LANGUAGE_CREATED',
      entityType: 'Language',
      entityId: created.code,
      metadata: { name: created.name, isRtl: created.isRtl, isDefault: created.isDefault },
    });
    return created;
  }

  @Patch(':code')
  async update(
    @Param('code') code: string,
    @Body() dto: UpdateLanguageDto,
    @CurrentUser() user: JwtUser,
  ) {
    const updated = await this.languages.update(code, dto);
    await this.audit.record({
      adminUserId: user.id,
      action: 'LANGUAGE_UPDATED',
      entityType: 'Language',
      entityId: updated.code,
      metadata: { fields: Object.keys(dto) },
    });
    return updated;
  }

  @Patch(':code/default')
  async setDefault(@Param('code') code: string, @CurrentUser() user: JwtUser) {
    const updated = await this.languages.setDefault(code);
    await this.audit.record({
      adminUserId: user.id,
      action: 'LANGUAGE_SET_DEFAULT',
      entityType: 'Language',
      entityId: updated.code,
    });
    return updated;
  }
}