import { Injectable, NotFoundException } from '@nestjs/common';
import { Destination, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateDestinationDto, UpdateDestinationDto } from './dto/destination.dto.js';

@Injectable()
export class DestinationsService {
  constructor(private readonly prisma: PrismaService) {}

  listActive(): Promise<Destination[]> {
    return this.prisma.destination.findMany({
      where: { isActive: true },
      orderBy: [{ name: 'asc' }],
    });
  }

  listAll(): Promise<Destination[]> {
    return this.prisma.destination.findMany({ orderBy: [{ name: 'asc' }] });
  }

  async requireById(id: string): Promise<Destination> {
    const d = await this.prisma.destination.findUnique({ where: { id } });
    if (!d) throw new NotFoundException(`Destination ${id} not found.`);
    return d;
  }

  async create(dto: CreateDestinationDto): Promise<Destination> {
    return this.prisma.destination.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateDestinationDto): Promise<Destination> {
    await this.requireById(id);
    return this.prisma.destination.update({
      where: { id },
      data: dto as Prisma.DestinationUpdateInput,
    });
  }

  async deactivate(id: string): Promise<Destination> {
    await this.requireById(id);
    return this.prisma.destination.update({
      where: { id },
      data: { isActive: false },
    });
  }
}