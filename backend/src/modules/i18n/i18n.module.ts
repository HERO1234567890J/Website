import { Module } from '@nestjs/common';
import { I18nService } from './i18n.service.js';
import { CurrencyConverter } from './currency-converter.service.js';
import { I18nController } from './i18n.controller.js';
import { LanguagesModule } from '../languages/languages.module.js';
import { SiteContentModule } from '../site-content/site-content.module.js';
import { CurrenciesModule } from '../currencies/currencies.module.js';

/**
 * D-Trips backend — I18nModule (§25)
 *
 *   - I18nService           — locale resolution + content lookup
 *   - CurrencyConverter    — EGP → display currency (informational)
 *
 *   Backend's role in i18n (§25):
 *     - serves the data the frontend needs to render in any locale
 *     - serves the locale list the toggle binds to
 *     - serves content for the rendered locale (or default fallback)
 *
 *   Frontend picks the locale from a toggle / browser preference;
 *   it passes the chosen locale on every SiteContent / tour fetch.
 */
@Module({
  imports: [LanguagesModule, SiteContentModule, CurrenciesModule],
  controllers: [I18nController],
  providers: [I18nService, CurrencyConverter],
  exports: [I18nService, CurrencyConverter],
})
export class I18nModule {}