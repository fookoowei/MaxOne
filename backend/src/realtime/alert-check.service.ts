import { Injectable } from '@nestjs/common';
import { AlertsService } from '../alerts/alerts.service';
import { isTriggered } from '../alerts/is-triggered';
import { RealtimeService } from './realtime.service';

// Runs on the price tick: finds pending alerts, fires the newly-crossed ones (one-shot).
@Injectable()
export class AlertCheckService {
  constructor(
    private readonly alerts: AlertsService,
    private readonly realtime: RealtimeService,
  ) {}

  async check(assets: { symbol: string; price: number }[]): Promise<void> {
    const priceBySymbol = new Map(assets.map((a) => [a.symbol, a.price]));
    const pending = await this.alerts.findPending();
    const fired = pending.filter((a) => {
      const price = priceBySymbol.get(a.symbol);
      return price !== undefined && isTriggered(a.direction, a.targetPrice, price);
    });
    if (fired.length === 0) return;
    // Mark before emit — a crash mid-loop can't double-fire on the next tick.
    await this.alerts.markTriggered(fired.map((a) => a.id));
    for (const a of fired) {
      this.realtime.emitAlert(a.userId, {
        id: a.id,
        symbol: a.symbol,
        direction: a.direction,
        targetPrice: a.targetPrice,
        price: priceBySymbol.get(a.symbol)!,
      });
    }
  }
}
