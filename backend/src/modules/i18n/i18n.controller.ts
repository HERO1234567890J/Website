import { Controller, Get, Query } from '@nestjs/common';
import { I18nService } from './i18n.service.js';
import { Public } from '../auth/decorators/public.decorator.js';

/**
 * /api/i18n — locale-resolution helper exposed to the frontend.
 *
 *   GET /api/i18n/resolve?locale=ar&accept-language=en-US,ar
 *     Returns the locale the backend will use for this request.
 */
@Controller('api/i18n')
export class I18nController {
  constructor(private readonly i18n: I18nService) {}

  @Public()
  @Get('resolve')
  async resolve(
    @Query('locale') locale?: string,
    @Query('accept-language') acceptLanguage?: string,
  ) {
    const resolved = await this.i18n.resolveLocale({
      ...(locale ? { queryLocale: locale } : {}),
      ...(acceptLanguage ? { acceptLanguage } : {}),
    });
    return { locale: resolved };
  }
}