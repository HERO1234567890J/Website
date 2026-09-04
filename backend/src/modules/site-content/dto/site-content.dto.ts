import { IsObject, IsOptional, IsString, Length } from 'class-validator';

/**
 * PUT /api/admin/site-content/:key/:locale
 *
 * §15 / §26 / §27 — admin-editable site content keyed by
 * (key, locale). Content payload is a free-form JSON object so
 * the same row can carry strings, rich-text, link lists, etc.
 *
 * v1 key namespace (extend by adding new keys — never repurpose):
 *   homepage.hero           { eyebrow, title, sub }
 *   about.body              { html }
 *   privacy_policy.body     { markdown }
 *   terms_conditions.body   { markdown }
 *   company.contact         { phone, email, whatsapp, address }
 *   company.social          { instagram, facebook }
 *   footer.contact          { phone, email, whatsapp }
 *   cancellation_policy     { text }
 */
export class UpsertSiteContentDto {
  @IsString()
  @Length(1, 200)
  key!: string;

  @IsString()
  @Length(2, 8)
  locale!: string;

  @IsObject()
  content!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  updatedBy?: string;
}