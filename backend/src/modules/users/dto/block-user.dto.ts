import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * PATCH /api/admin/users/:id/block
 *
 * §15 / §18 — admin-managed user block. Sets `isBlocked` on the
 * User row and, when blocking, revokes every active refresh token
 * so any open session is force-logged-out on the next request
 * (the JwtRefreshGuard re-checks `isBlocked` on every refresh and
 * rejects rotated tokens the same way).
 *
 * Reason is recorded on the User row + the AuditLog entry.
 */
export class BlockUserDto {
  @IsBoolean()
  blocked!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}