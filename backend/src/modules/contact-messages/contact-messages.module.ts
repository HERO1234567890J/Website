import { Module } from '@nestjs/common';
import { ContactMessagesService } from './contact-messages.service.js';
import { ContactMessagesController } from './contact-messages.controller.js';
import { AdminContactMessagesController } from './admin-contact-messages.controller.js';

@Module({
  controllers: [ContactMessagesController, AdminContactMessagesController],
  providers: [ContactMessagesService],
  exports: [ContactMessagesService],
})
export class ContactMessagesModule {}