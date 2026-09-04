import { Injectable, NotFoundException } from '@nestjs/common';
import { FAQ, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateFaqDto, UpdateFaqDto } from './dto/faq.dto.js';

@Injectable()
export class FaqsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public — active FAQs only. */
  listActive(): Promise<FAQ[]> {
    return this.prisma.fAQ.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  listAllForAdmin(query: { page: number; pageSize: number }) {
    return Promise.all([
      this.prisma.fAQ.findMany({
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.fAQ.count(),
    ]).then(([items, total]) => ({ items, total }));
  }

  async requireById(id: string): Promise<FAQ> {
    const f = await this.prisma.fAQ.findUnique({ where: { id } });
    if (!f) throw new NotFoundException(`FAQ ${id} not found.`);
    return f;
  }

  create(dto: CreateFaqDto): Promise<FAQ> {
    return this.prisma.fAQ.create({
      data: {
        question: dto.question,
        answer: dto.answer,
        category: dto.category ?? null,
        displayOrder: dto.displayOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateFaqDto): Promise<FAQ> {
    await this.requireById(id);
    const data: Prisma.FAQUpdateInput = {
      ...(dto.question !== undefined && { question: dto.question }),
      ...(dto.answer !== undefined && { answer: dto.answer }),
      ...(dto.category !== undefined && { category: dto.category }),
      ...(dto.displayOrder !== undefined && { displayOrder: dto.displayOrder }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    };
    return this.prisma.fAQ.update({ where: { id }, data });
  }

  async deactivate(id: string): Promise<FAQ> {
    await this.requireById(id);
    return this.prisma.fAQ.update({
      where: { id },
      data: { isActive: false },
    });
  }
}