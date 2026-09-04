import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type JwtUser } from '../auth/decorators/current-user.decorator.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';
import { CategoriesService } from './categories.service.js';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto.js';

/**
 * /api/admin/categories — admin-only category management per §7.
 *
 * Every mutation writes an AuditLog row (§15) capturing who/what
 * before returning. The audit failure is non-blocking (logged but
 * does not roll back the business write).
 */
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('api/admin/categories')
export class AdminCategoriesController {
  constructor(
    private readonly categories: CategoriesService,
    private readonly audit: AuditLogService,
  ) {}

  @Get()
  list() {
    return this.categories.listAll();
  }

  @Post()
  async create(@Body() dto: CreateCategoryDto, @CurrentUser() user: JwtUser) {
    const created = await this.categories.create(dto);
    await this.audit.record({
      adminUserId: user.id,
      action: 'CATEGORY_CREATED',
      entityType: 'Category',
      entityId: created.id,
      metadata: { slug: created.slug, name: created.name },
    });
    return created;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: JwtUser,
  ) {
    const updated = await this.categories.update(id, dto);
    await this.audit.record({
      adminUserId: user.id,
      action: 'CATEGORY_UPDATED',
      entityType: 'Category',
      entityId: updated.id,
      metadata: { fields: Object.keys(dto) },
    });
    return updated;
  }

  @Delete(':id')
  async deactivate(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    const result = await this.categories.deactivate(id);
    await this.audit.record({
      adminUserId: user.id,
      action: 'CATEGORY_DEACTIVATED',
      entityType: 'Category',
      entityId: result.id,
    });
    return result;
  }
}