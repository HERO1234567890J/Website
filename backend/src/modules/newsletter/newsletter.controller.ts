import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { NewsletterService } from './newsletter.service.js';
import { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto.js';
import { Public } from '../auth/decorators/public.decorator.js';

/**
 * POST /api/newsletter/subscribe — public, no auth (§4 footer form).
 *
 * Returns 201 Created on first subscribe, 200 OK on re-subscribe
 * (upsert semantics). The DB row is the durable record per §23.
 */
@Controller('api/newsletter')
export class NewsletterController {
  constructor(private readonly newsletter: NewsletterService) {}

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('subscribe')
  @HttpCode(HttpStatus.OK)
  subscribe(@Body() dto: SubscribeNewsletterDto) {
    return this.newsletter.subscribe(dto);
  }
}
