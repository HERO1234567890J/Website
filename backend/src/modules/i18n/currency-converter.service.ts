import { Injectable } from '@nestjs/common';
import { Currency } from '@prisma/client';
import { CurrenciesService } from '../currencies/currencies.service.js';

/**
 * §26 — display currency conversion.
 *
 *   EGP stays the authoritative charge currency (§8 / §26). This
 *   service ONLY converts amounts for rendering in the public
 *   site (price tags, order summaries, etc.).
 *
 *   roundHalfUp at the 2-decimal piaster boundary so the converted
 *   amount is always an integer number of minor units in the
 *   target display currency. We don't worry about sub-piaster
 *   precision — UX-wise, showing "EGP 130.00" is enough.
 */
@Injectable()
export class CurrencyConverter {
  constructor(private readonly currencies: CurrenciesService) {}

  /** EGP minor units → display currency minor units (informational). */
  async fromEgp(amountEgpMinor: number, targetCurrency: string): Promise<number> {
    if (targetCurrency === 'EGP') return amountEgpMinor;
    const c = await this.currencies.requireByCode(targetCurrency);
    return this.convert(amountEgpMinor, c);
  }

  private convert(amountEgpMinor: number, target: Currency): number {
    // exchangeRateToEgp = how many EGP per 1 unit of the target
    // currency. So amount-display = amount-egp / rate.
    const raw = amountEgpMinor / target.exchangeRateToEgp;
    return Math.round(raw);
  }
}