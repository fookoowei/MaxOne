import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { MarketsService } from '../markets/markets.service';
import { RealtimeService } from './realtime.service';
import { AlertCheckService } from './alert-check.service';

// Polls Kraken (via MarketsService) on a timer, broadcasts prices to connected clients, and
// drives the alert check. Cost guard: fetch only when someone is watching OR a pending alert
// exists (so closed-app alerts still fire, without polling 24/7 when there's nothing to do).
@Injectable()
export class PriceStreamService {
  private readonly log = new Logger(PriceStreamService.name);

  constructor(
    private readonly markets: MarketsService,
    private readonly realtime: RealtimeService,
    private readonly alertCheck: AlertCheckService,
  ) {}

  @Interval('price-stream', 15_000)
  async tick(): Promise<void> {
    // A 15s timer must never depend on anything else to keep running: an unhandled rejection here
    // only gets caught process-wide when SENTRY_DSN is configured (see sentry.ts), so this cannot
    // be the sole thing standing between one bad tick and a crashed process.
    try {
      const watching = this.realtime.connectedCount() > 0;
      const pending = await this.alertCheck.pendingCount(); // cheap DB read
      if (!watching && pending === 0) return; // nobody watching AND no active alert → idle
      const assets = await this.markets.list(); // fail-soft: [] on provider error (M11d-1)
      if (assets.length === 0) return; // don't wipe clients / don't check on a blip
      if (watching) this.realtime.broadcastPrices(assets); // only to connected clients
      if (pending > 0) await this.alertCheck.check(assets); // check whenever alerts are pending
    } catch (err) {
      this.log.warn(`price-stream tick failed: ${(err as Error).message}`);
    }
  }
}
