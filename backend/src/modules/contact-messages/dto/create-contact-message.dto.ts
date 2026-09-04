import { IsEmail, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * POST /api/contact-messages — public (§24).
 *
 * On submit:
 *   1. Persist ContactMessage with status = NEW (§24 hard rule —
 *      nothing sent from /contact is ever "fire and forget").
 *   2. Fire sendContactMessageReceived to the team inbox so the
 *      company gets a real-time nudge.
 *
 * Email failure MUST NOT roll back the message row (§24) — the DB
 * row is the durable record.
 */
export class CreateContactMessageDto {
  @IsString()
  @Length(1, 100)
  name!: string;

  @IsEmail({}, { message: 'A valid email is required.' })
  @Length(1, 254)
  email!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9+\-\s()]{8,32}$/)
  phone?: string;

  @IsString()
  @Length(1, 200)
  subject!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  body!: string;
}