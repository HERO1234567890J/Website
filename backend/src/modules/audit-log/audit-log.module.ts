import { Global, Module } from '@nestjs/common';
import { AuditLogService } from './audit-log.service.js';
import { AuditLogReadService } from './audit-log-read.service.js';
import { AdminAuditLogController } from './admin-audit-log.controller.js';

@Global()
@Module({
  controllers: [AdminAuditLogController],
  providers: [AuditLogService, AuditLogReadService],
  exports: [AuditLogService, AuditLogReadService],
})
export class AuditLogModule {}