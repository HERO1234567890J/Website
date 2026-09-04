import { Injectable, NotFoundException } from '@nestjs/common';
import { Category, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto.js';

/**
 * §7 — Categories are admin-managed (CRUD). Public surface filters
 * active ones; admin surface sees everything.
 */
@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public list — only active categories, sorted by displayOrder. */
  listActive(): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
  }

  /** Admin list — includes inactive. */
  listAll(): Promise<Category[]> {
    return this.prisma.category.findMany({
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async requireById(id: string): Promise<Category> {
    const c = await this.prisma.category.findUnique({ where: { id } });
    if (!c) throw new NotFoundException(`Category ${id} not found.`);
    return c;
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    return this.prisma.category.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        displayOrder: dto.displayOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    await this.requireById(id);
    return this.prisma.category.update({
      where: { id },
      data: dto as Prisma.CategoryUpdateInput,
    });
  }

  /**
   * Soft delete — flips isActive to false so existing tours keep
   * rendering under the historical category slug but the category
   * disappears from new filters. Hard delete would orphan FK
   * references.
   */
  async deactivate(id: string): Promise<Category> {
    await this.requireById(id);
    return this.prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
  }
}