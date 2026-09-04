import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContactMessage, ContactMessageStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';
import { EmailService } from '../email/email.service.js';
import { CreateContactMessageDto } from './dto/create-contact-message.dto.js';
import { AdminUpdateContactMessageDto } from './dto/admin-update-contact-message.dto.js';

/**
 * §24 — contact form inbox.
 *
 * Public POST persists the row first, then fires the team-inbox
 * email. Email failures are logged but never roll back the row —
 * the DB row is the durable record so nothing is lost if
 * notifications are down.
 */
@Injectable()
export class ContactMessagesService {
  private readonly logger = new Logger(ContactMessagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly audit: AuditLogService,
    private readonly config: ConfigService,
  ) {}

  async submit(dto: CreateContactMessageDto): Promise<ContactMessage> {
    const message = await this.prisma.contactMessage.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
        phone: dto.phone ?? null,
        subject: dto.subject,
        body: dto.body,
        status: ContactMessageStatus.NEW,
      },
    });

    // §24 — fire the team-inbox notification. Recipient is the
    // company's configured contact email; for v1 we use
    // EMAIL_REPLY_TO (the team's hello@ inbox) as the destination.
    const toEmail = this.config.get<string>(
      'CONTACT_INBOX_EMAIL',
      this.config.get<string>('EMAIL_REPLY_TO', 'hello@d-trips.com'),
    );
    try {
      await this.email.sendContactMessageReceived({
        contactMessageId: message.id,
        toEmail,
        subject: message.subject,
        name: message.name,
        email: message.email,
        ...(message.phone ? { phone: message.phone } : {}),
        body: message.body,
      });
    } catch (err) {
      this.logger.error(
        `sendContactMessageReceived failed for ${message.id}: ${(err as Error).message}`,
      );
    }

    return message;
  }

  async requireById(id: string): Promise<ContactMessage> {
    const m = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!m) throw new NotFoundException(`ContactMessage ${id} not found.`);
    return m;
  }

  listAllForAdmin(query: { status?: ContactMessageStatus; page: number; pageSize: number }) {
    const where = query.status ? { status: query.status } : {};
    return Promise.all([
      this.prisma.contactMessage.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.contactMessage.count({ where }),
    ]).then(([items, total]) => ({ items, total }));
  }

  async adminUpdate(
    id: string,
    dto: AdminUpdateContactMessageDto,
    adminUserId: string,
  ): Promise<ContactMessage> {
    const before = await this.requireById(id);
    const data: { status: ContactMessageStatus; repliedAt?: Date | null; repliedBy?: string | null } = {
      status: dto.status,
    };
    if (dto.status === ContactMessageStatus.REPLIED) {
      data.repliedAt = new Date();
      data.repliedBy = adminUserId;
    } else {
      // Moving away from to_REPLIED clears the reply timestamps.
      if (before.status === ContactMessageStatus.REPLIED) {
        data.repliedAt = null;
        data.repliedBy = null;
      }
    }
    const updated = await this.prisma.contactMessage.update({ where: { id }, data });
    await this.audit.record({
      adminUserId,
      action: 'CONTACT_MESSAGE_STATUS_CHANGED',
      entityType: 'ContactMessage',
      entityId: updated.id,
      metadata: {
        from: before.status,
        to: updated.status,
        ...(dto.internalNote ? { internalNote: dto.internalNote } : {}),
      },
    });
    return updated;
  }
}