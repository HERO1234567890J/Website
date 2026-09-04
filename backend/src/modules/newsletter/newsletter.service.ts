import { Injectable, Logger } from '@nestjs/common';
import { NewsletterSubscriber } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto.js';

/**
 * Phase 15A §6.4 — newsletter subscription.
 *
 * The footer form had `submitStub('newsletter')` which logged to the
 * console and resolved with a fake ref. Per §23 ("No fake features,
 * ever") that stub is replaced with a real DB row. No double-opt-in,
 * no admin management UI, no email confirmation — the spec for v1
 * is just "store the email".
 *
 * Upsert on email so a re-submission by the same address is a 200,
 * not a 409. The original createdAt is preserved (setOnInsert).
 */
@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);

  constructor(private readonly prisma: PrismaService) {}

  async subscribe(dto: SubscribeNewsletterDto): Promise<NewsletterSubscriber> {
    const row = await this.prisma.newsletterSubscriber.upsert({
      where: { email: dto.email },
      update: {}, // returning visitor — keep original createdAt, no-op update
      create: { email: dto.email },
    });
    this.logger.log(`Newsletter subscribe: ${row.email} (${row.id})`);
    return row;
  }
}
