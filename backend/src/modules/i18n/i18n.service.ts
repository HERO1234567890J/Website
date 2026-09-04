import { Injectable } from '@nestjs/common';
import { Language } from '@prisma/client';
import { SiteContentService } from '../site-content/site-content.service.js';
import { LanguagesService } from '../languages/languages.service.js';

/**
 * §25 — i18n lookup helper.
 *
 * The frontend picks the locale from the toggle / browser
 * preference. The backend resolves (key, locale) reads with a
 * default-locale fallback so a missing Arabic row never 404s the
 * page.
 *
 * For locale resolution from a request (Accept-Language header,
 * ?locale= query, JWT claim) use `resolveLocale()` below.
 */
@Injectable()
export class I18nService {
  constructor(
    private readonly languages: LanguagesService,
    private readonly content: SiteContentService,
  ) {}

  /** Single-key read with locale → default fallback. */
  translate(key: string, locale: string): Promise<unknown> {
    return this.content.get(key, locale).then((row) => row?.content ?? null);
  }

  /** Batch read for a whole page. */
  translateMany(keys: string[], locale: string) {
    return this.content.getMany(keys, locale);
  }

  /** Enabled languages (cache-friendly — return array directly). */
  listEnabledLanguages(): Promise<Language[]> {
    return this.languages.listEnabled();
  }

  /**
   * §25 — resolve the locale to use for a request:
   *
   *   1. explicit `?locale=` query
   *   2. JWT claim (when authenticated) — Phase 15+ when the auth
   *      flow carries a locale preference
   *   3. Accept-Language header — pick the first tag that matches
   *      an enabled language
   *   4. default language
   */
  async resolveLocale(input: { queryLocale?: string; acceptLanguage?: string }): Promise<string> {
    if (input.queryLocale) {
      const enabled = await this.languages.listEnabled();
      if (enabled.some((l) => l.code === input.queryLocale)) return input.queryLocale;
    }

    if (input.acceptLanguage) {
      const tags = input.acceptLanguage
        .split(',')
        .map((t) => t.trim().split(';')[0].toLowerCase());
      const enabled = await this.languages.listEnabled();
      const enabledCodes = new Set(enabled.map((l) => l.code));
      for (const tag of tags) {
        const exact = tag.split('-')[0]; // strip region
        if (enabledCodes.has(exact)) return exact;
      }
    }

    const enabled = await this.languages.listEnabled();
    const fallback = enabled.find((l) => l.isDefault);
    return fallback?.code ?? enabled[0]?.code ?? 'en';
  }
}