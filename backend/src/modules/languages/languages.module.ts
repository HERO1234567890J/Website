import { Module } from '@nestjs/common';
import { LanguagesService } from './languages.service.js';
import { LanguagesController } from './languages.controller.js';
import { AdminLanguagesController } from './admin-languages.controller.js';

@Module({
  controllers: [LanguagesController, AdminLanguagesController],
  providers: [LanguagesService],
  exports: [LanguagesService],
})
export class LanguagesModule {}