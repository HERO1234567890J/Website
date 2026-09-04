import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export interface UploadSignResult {
  uploadUrl: string;
  publicUrl: string;
  path: string;
  headers: Record<string, string>;
}

@Injectable()
export class BunnyStorageService {
  private readonly zone: string;
  private readonly apiKey: string;
  private readonly cdnBase: string;

  constructor(private readonly config: ConfigService) {
    this.zone = this.config.get<string>('bunny.storageZone', '');
    this.apiKey = this.config.get<string>('bunny.storageApiKey', '');
    this.cdnBase = this.config.get<string>('bunny.cdnBase', '');
  }

  isConfigured(): boolean {
    return !!(this.zone && this.apiKey && this.cdnBase);
  }

  /**
   * Generate a signed upload URL for direct browser → Bunny upload.
   * The browser PUTs the file directly; NestJS never proxies bytes.
   */
  signUpload(params: {
    folder: string;
    filename: string;
    mimeType: string;
    fileSize: number;
  }): UploadSignResult {
    if (!this.isConfigured()) {
      throw new BadRequestException('Bunny Storage is not configured. Set BUNNY_STORAGE_ZONE, BUNNY_STORAGE_API_KEY, and BUNNY_CDN_BASE.');
    }

    if (!ALLOWED_MIME_TYPES.includes(params.mimeType)) {
      throw new BadRequestException(`File type ${params.mimeType} is not allowed. Accepted: ${ALLOWED_MIME_TYPES.join(', ')}`);
    }

    if (params.fileSize > MAX_FILE_SIZE) {
      throw new BadRequestException(`File size ${params.fileSize} exceeds maximum of ${MAX_FILE_SIZE} bytes.`);
    }

    // Sanitize filename: strip path separators, use UUID prefix for uniqueness
    const safeName = params.filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .slice(0, 128);

    const uniqueName = `${randomUUID()}-${safeName}`;
    const path = `${params.folder}/${uniqueName}`;

    // Bunny Storage REST API — direct PUT with AccessKey header
    const uploadUrl = `https://storage.bunnycdn.com/${this.zone}/${path}`;

    const publicUrl = `${this.cdnBase.replace(/\/$/, '')}/${path}`;

    return {
      uploadUrl,
      publicUrl,
      path,
      headers: {
        AccessKey: this.apiKey,
        'Content-Type': params.mimeType,
      },
    };
  }
}
