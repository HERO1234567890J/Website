import { Module } from '@nestjs/common';
import { SiteContentService } from './site-content.service.js';
import { SiteContentController } from './site-content.controller.js';
import { AdminSiteContentController } from './admin-site-content.controller.js';

@Module({
  controllers: [SiteContentController, AdminSiteContentController],
  providers: [SiteContentService],
  exports: [SiteContentService],
})
export class SiteContentModule {}