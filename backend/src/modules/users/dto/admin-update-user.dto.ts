import { IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

/**
 * §13 — admin role update. The Role enum is intentionally narrow
 * in v1 (CUSTOMER + ADMIN only); adding SUPER_ADMIN/STAFF later
 * is a one-line enum change plus a migration.
 */
export class AdminUpdateUserDto {
  @IsEnum(Role)
  role!: Role;
}