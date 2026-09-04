import { Module } from '@nestjs/common';
import { BunnyStorageService } from './bunny-storage.service.js';
import { UploadsController } from './uploads.controller.js';

@Module({
  controllers: [UploadsController],
  providers: [BunnyStorageService],
  exports: [BunnyStorageService],
})
export class UploadsModule {}
