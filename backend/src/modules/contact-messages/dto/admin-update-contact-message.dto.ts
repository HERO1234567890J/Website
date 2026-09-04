import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ContactMessageStatus } from '@prisma/client';

export class AdminUpdateContactMessageDto {
  @IsEnum(ContactMessageStatus)
  status!: ContactMessageStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reply?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  internalNote?: string;
}