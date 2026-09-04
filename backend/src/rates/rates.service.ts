import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CacheService } from '../cache/cache.service';
import { convertMinor } from './convert-minor';

/**
 * The ONLY place the app talks to an external FX provider. Isolated behind this seam so a
 * future swap (a keyed provider, a cache) is a one-file change that never touches wallet logic.
 * Fail-closed: any failure throws 503 and the caller moves no money.
 * M16a: rates are cached 60s (Frankfurter is an ECB daily feed, so this is conservative). The
 * fail-closed rule survives the cache: a miss whose fetch fails still throws, nothing is stored.
 */
const RATE_TTL = 60;

@Injectable()
export class RatesService {
  private readonly base = 'https://api.frankfurter.app';

  constructor(private readonly cache: CacheService) {}

  async getRate(from: string, to: string): Promise<Prisma.Decimal> {
    // No conversion needed — never bother the network (or the cache).
    if (from === to) return new Prisma.Decimal(1);
    // Decimal doesn't survive JSON, so the cache holds the rate as its exact string form.
    const rate = await this.cache.wrap(`rates:${from}:${to}`, RATE_TTL, async () =>
      (await this.fetchRate(from, to)).toString(),
    );
    return new Prisma.Decimal(rate);
  }

  private async fetchRate(from: string, to: string): Promise<Prisma.Decimal> {
    let res: Response;
    try {
      res = await fetch(`${this.base}/latest?base=${from}&symbols=${to}`);
    } catch {
      throw new ServiceUnavailableException('Exchange rate provider unavailable');
    }
    if (!res.ok) {
      throw new ServiceUnavailableException('Exchange rate provider unavailable');
    }

    const body = (await res.json()) as { rates?: Record<string, number> };
    const rate = body?.rates?.[to];
    if (rate == null) {
      throw new ServiceUnavailableException(`No exchange rate for ${from} -> ${to}`);
    }
    return new Prisma.Decimal(rate);
  }

  // A preview: the live rate + the converted minor-unit amount, using the same math a transfer
  // uses (convertMinor). Same-currency short-circuits to rate 1 with no network call.
  async quote(from: string, to: string, amount: number) {
    const rate = await this.getRate(from, to);
    return { from, to, amount, rate: rate.toString(), converted: convertMinor(amount, rate) };
  }
}
