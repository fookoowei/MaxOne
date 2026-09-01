import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { MarketsService } from '../markets/markets.service';
import { RealtimeService } from './realtime.service';
import { AlertCheckService } from './alert-check.service';

// Polls CoinGecko on a timer and broadcasts prices to connected clients.
// Cost guard: skip the upstream call entirely when nobody is watching.
@Injectable()
export class PriceStreamService {
  constructor(
    private readonly markets: MarketsService,
    private readonly realtime: RealtimeService,
    private readonly alertCheck: AlertCheckService,
  ) {}

  @Interval('price-stream', 15_000)
  async tick(): Promise<void> {
    if (this.realtime.connectedCount() === 0) return; // nobody watching → no CoinGecko call
    const assets = await this.markets.list(); // fail-soft: [] on provider error (M11d-1)
    if (assets.length === 0) return; // don't wipe clients with an empty list
    this.realtime.broadcastPrices(assets);
    await this.alertCheck.check(assets); // NEW — same prices, no extra fetch
  }
}
