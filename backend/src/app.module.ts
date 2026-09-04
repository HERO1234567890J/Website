import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import configuration, { bunnyConfig } from './config/configuration.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { ToursModule } from './modules/tours/tours.module.js';
import { CategoriesModule } from './modules/categories/categories.module.js';
import { DestinationsModule } from './modules/destinations/destinations.module.js';
import { BuildTripModule } from './modules/build-trip/build-trip.module.js';
import { BookingsModule } from './modules/bookings/bookings.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';
import { EmailModule } from './modules/email/email.module.js';
import { ReviewsModule } from './modules/reviews/reviews.module.js';
import { FaqsModule } from './modules/faqs/faqs.module.js';
import { ContactMessagesModule } from './modules/contact-messages/contact-messages.module.js';
import { PromoCodesModule } from './modules/promo-codes/promo-codes.module.js';
import { SiteContentModule } from './modules/site-content/site-content.module.js';
import { AuditLogModule } from './modules/audit-log/audit-log.module.js';
import { I18nModule } from './modules/i18n/i18n.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { NewsletterModule } from './modules/newsletter/newsletter.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { UploadsModule } from './modules/uploads/uploads.module.js';

/**
 * D-Trips backend — root AppModule.
 *
 * §3 / §34 phase 5 — NestJS modular monolith. Every feature domain owns
 * a self-contained module under src/modules/. Cross-cutting concerns
 * (Prisma, Config, AuthGuards, AuditLog) are imported once as
 * @Global() and shared across feature modules.
 *
 * Implementation order (§34 phases 6–12): Auth → Tours → BuildTrip →
 * Bookings → Payments → Email → Reviews → Admin. Phase 7 (Tours,
 * Categories, Availability) lands here.
 *
 * §18 — ThrottlerModule wired globally. Default 60 reqs/min/IP is
 * loose enough for normal browsing; per-endpoint overrides
 * (e.g. /api/payments/intent) tighten it for guest-checkout
 * brute-force defense.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration, bunnyConfig],
      cache: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000, // 1 minute window
        limit: 60, // 60 requests per IP per minute by default
      },
    ]),
    PrismaModule,
    AuditLogModule,

    // ─── Public surface ─────────────────────────────────────────────
    AuthModule,
    UsersModule,
    ToursModule,
    CategoriesModule,
    DestinationsModule,
    BuildTripModule,
    BookingsModule,
    PaymentsModule,
    EmailModule,
    ReviewsModule,
    FaqsModule,
    ContactMessagesModule,
    PromoCodesModule,
    SiteContentModule,

    // ─── Internal / cross-cutting ───────────────────────────────────
    I18nModule,
    AdminModule,
    NewsletterModule,
    HealthModule,
    UploadsModule,
  ],
  providers: [
    {
      // Global default ThrottlerGuard — endpoints without an
      // explicit @Throttle() use the 60/min limit. Endpoints with
      // their own @Throttle() override the default per-route.
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}