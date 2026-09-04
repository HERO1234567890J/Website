import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';

/**
 * POST /api/newsletter/subscribe — payload.
 *
 * Phase 15A §6.4 — single field, real persistence. v1 has no
 * double-opt-in or admin management (deferred); we only store
 * (email, createdAt) so a returning visitor silently re-subscribes.
 */
export class SubscribeNewsletterDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(254)
  email!: string;
}
