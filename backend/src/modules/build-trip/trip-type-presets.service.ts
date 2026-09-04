import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TripTypePreset } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateTripTypePresetDto, UpdateTripTypePresetDto } from './dto/trip-type-preset.dto.js';

/**
 * §7 — TripTypePreset management. The 6 originals from the source
 * (Friends/Family/Honeymoon/Solo/Adventure/University) are seeded by
 * a future Phase-13 fixture; v1 lets the admin create them via CRUD.
 */
@Injectable()
export class TripTypePresetsService {
  constructor(private readonly prisma: PrismaService) {}

  listActive(): Promise<TripTypePreset[]> {
    return this.prisma.tripTypePreset.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
  }

  listAll(): Promise<TripTypePreset[]> {
    return this.prisma.tripTypePreset.findMany({
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async requireBySlug(slug: string): Promise<TripTypePreset> {
    const p = await this.prisma.tripTypePreset.findUnique({ where: { slug } });
    if (!p) throw new NotFoundException(`TripTypePreset ${slug} not found.`);
    return p;
  }

  async requireById(id: string): Promise<TripTypePreset> {
    const p = await this.prisma.tripTypePreset.findUnique({ where: { id } });
    if (!p) throw new NotFoundException(`TripTypePreset ${id} not found.`);
    return p;
  }

  async create(dto: CreateTripTypePresetDto): Promise<TripTypePreset> {
    return this.prisma.tripTypePreset.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        imageId: dto.imageId ?? null,
        displayOrder: dto.displayOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateTripTypePresetDto): Promise<TripTypePreset> {
    await this.requireById(id);
    const data: Prisma.TripTypePresetUpdateInput = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.imageId !== undefined && { imageId: dto.imageId }),
      ...(dto.displayOrder !== undefined && { displayOrder: dto.displayOrder }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    };
    return this.prisma.tripTypePreset.update({ where: { id }, data });
  }

  async deactivate(id: string): Promise<TripTypePreset> {
    await this.requireById(id);
    return this.prisma.tripTypePreset.update({
      where: { id },
      data: { isActive: false },
    });
  }
}