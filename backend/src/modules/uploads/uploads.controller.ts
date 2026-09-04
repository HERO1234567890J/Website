import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { BunnyStorageService } from './bunny-storage.service.js';
import { SignUploadDto } from './dto/sign-upload.dto.js';

/**
 * §3 / FU-3 — Admin image upload pipeline.
 *
 * POST /api/admin/uploads/sign returns a signed URL the browser uses
 * to PUT directly to Bunny Storage. The NestJS process never proxies
 * the file bytes — keeps the API server light per §22.
 */
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('api/admin/uploads')
export class UploadsController {
  constructor(private readonly bunny: BunnyStorageService) {}

  @Post('sign')
  sign(@Body() dto: SignUploadDto) {
    return this.bunny.signUpload(dto);
  }
}
