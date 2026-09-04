import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Currency, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateCurrencyDto, UpdateCurrencyDto } from './dto/currency.dto.js';

/**
 * §26 — display currencies (informational only — EGP is the
 * authoritative charge currency per §8 / §26).
 *
 * Seed runs in onModuleInit; idempotent — only inserts when the
 * table is empty so admin edits survive a restart.
 */
@Injectable()
export class CurrenciesService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    const count = await this.prisma.currency.count();
    if (count === 0) {
      await this.prisma.currency.createMany({
        data: [
          {
            code: 'EGP',
            symbol: 'E£',
            exchangeRateToEgp: 1,
            isBase: true,
            isEnabled: true,
            displayOrder: 0,
          },
          {
            code: 'USD',
            symbol: '$',
            exchangeRateToEgp: 50,
            isBase: false,
            isEnabled: true,
            displayOrder: 1,
          },
        ],
      });
    }
  }

  /** Public — only enabled, non-base OR base display currencies. */
  listEnabled(): Promise<Currency[]> {
    return this.prisma.currency.findMany({
      where: { isEnabled: true },
      orderBy: [{ displayOrder: 'asc' }, { code: 'asc' }],
    });
  }

  listAll(): Promise<Currency[]> {
    return this.prisma.currency.findMany({
      orderBy: [{ displayOrder: 'asc' }, { code: 'asc' }],
    });
  }

  async requireByCode(code: string): Promise<Currency> {
    const c = await this.prisma.currency.findUnique({ where: { code } });
    if (!c) throw new NotFoundException(`Currency ${code} not found.`);
    return c;
  }

  async create(dto: CreateCurrencyDto): Promise<Currency> {
    return this.prisma.currency.create({
      data: {
        code: dto.code.toUpperCase(),
        symbol: dto.symbol,
        exchangeRateToEgp: dto.exchangeRateToEgp,
        isBase: false, // base is always EGP, set by seed
        isEnabled: dto.isEnabled ?? true,
        displayOrder: dto.displayOrder ?? 0,
      },
    });
  }

  async update(code: string, dto: UpdateCurrencyDto): Promise<Currency> {
    await this.requireByCode(code);
    const data: Prisma.CurrencyUpdateInput = {
      ...(dto.symbol !== undefined && { symbol: dto.symbol }),
      ...(dto.exchangeRateToEgp !== undefined && { exchangeRateToEgp: dto.exchangeRateToEgp }),
      ...(dto.displayOrder !== undefined && { displayOrder: dto.displayOrder }),
      ...(dto.isEnabled !== undefined && { isEnabled: dto.isEnabled }),
    };
    return this.prisma.currency.update({ where: { code }, data });
  }

  async setExchangeRate(code: string, rate: number): Promise<Currency> {
    await this.requireByCode(code);
    return this.prisma.currency.update({
      where: { code },
      data: { exchangeRateToEgp: rate },
    });
  }
}