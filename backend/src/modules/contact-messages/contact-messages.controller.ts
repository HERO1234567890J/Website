import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ContactMessagesService } from './contact-messages.service.js';
import { CreateContactMessageDto } from './dto/create-contact-message.dto.js';
import { Public } from '../auth/decorators/public.decorator.js';

@Controller('api/contact-messages')
export class ContactMessagesController {
  constructor(private readonly messages: ContactMessagesService) {}

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  submit(@Body() dto: CreateContactMessageDto) {
    return this.messages.submit(dto);
  }
}