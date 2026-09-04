import { Module } from '@nestjs/common';
import { NewsletterController } from './newsletter.controller.js';
import { NewsletterService } from './newsletter.service.js';

/**
 * Phase 15A — newsletter subscribe endpoint.
 *
 * Minimal by design. v1 stores (email, createdAt) only. When the
 * business wants admin management (subscriber list, unsubscribe
 * links, campaign sends) it belongs here as additive methods +
 * DTOs — not a rewrite.
 */
@Module({
  controllers: [NewsletterController],
  providers: [NewsletterService],
})
export class NewsletterModule {}
