import {
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Language } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateLanguageDto, UpdateLanguageDto } from './dto/language.dto.js';

/**
 * §25 — enabled languages for the public site. `en` is the v1
 * default; `ar` ships with `isRtl=true` so the frontend can flip
 * layout direction. Adding a new language (French, German, …) is
 * a row insert — no code change required.
 */
@Injectable()
export class LanguagesService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    const count = await this.prisma.language.count();
    if (count === 0) {
      await this.prisma.language.createMany({
        data: [
          { code: 'en', name: 'English', isDefault: true, isRtl: false, isEnabled: true },
          { code: 'ar', name: 'العربية', isDefault: false, isRtl: true, isEnabled: true },
        ],
      });
    }
  }

  listEnabled(): Promise<Language[]> {
    return this.prisma.language.findMany({
      where: { isEnabled: true },
      orderBy: [{ isDefault: 'desc' }, { code: 'asc' }],
    });
  }

  listAll(): Promise<Language[]> {
    return this.prisma.language.findMany({
      orderBy: [{ isDefault: 'desc' }, { code: 'asc' }],
    });
  }

  async requireByCode(code: string): Promise<Language> {
    const l = await this.prisma.language.findUnique({ where: { code } });
    if (!l) throw new NotFoundException(`Language ${code} not found.`);
    return l;
  }

  async create(dto: CreateLanguageDto): Promise<Language> {
    if (dto.isDefault) {
      // §25 — exactly one language may be the default. Unset any
      // existing default before inserting the new one.
      await this.prisma.language.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.language.create({
      data: {
        code: dto.code.toLowerCase(),
        name: dto.name,
        isEnabled: dto.isEnabled ?? true,
        isDefault: dto.isDefault ?? false,
        isRtl: dto.isRtl ?? false,
      },
    });
  }

  async update(code: string, dto: UpdateLanguageDto): Promise<Language> {
    await this.requireByCode(code);
    return this.prisma.language.update({
      where: { code },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.isEnabled !== undefined && { isEnabled: dto.isEnabled }),
        ...(dto.isRtl !== undefined && { isRtl: dto.isRtl }),
      },
    });
  }

  async setDefault(code: string): Promise<Language> {
    await this.requireByCode(code);
    await this.prisma.language.updateMany({
      where: { isDefault: true, NOT: { code } },
      data: { isDefault: false },
    });
    return this.prisma.language.update({
      where: { code },
      data: { isDefault: true },
    });
  }
}