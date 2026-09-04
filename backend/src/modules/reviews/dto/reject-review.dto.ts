import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * PATCH /api/admin/reviews/:id/reject — body.
 *
 * Reason is optional and recorded on the AuditLog row's metadata
 * (REVIEW_REJECTED → { reason }). Frontend sends it from the
 * rejection confirm modal so the team can audit *why* a review
 * was bounced (terms violation, spam, off-topic, etc).
 */
export class RejectReviewDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}