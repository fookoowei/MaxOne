import { Injectable } from '@nestjs/common';
import { AlertsService } from '../alerts/alerts.service';
import { isTriggered } from '../alerts/is-triggered';
import { NotificationService } from './notification.service';

// Runs on the price tick: finds pending alerts, fires the newly-crossed ones (one-shot).
@Injectable()
export class AlertCheckService {
  constructor(
    private readonly alerts: AlertsService,
    private readonly notify: NotificationService,
  ) {}

  // Cheap gate for the tick's cost guard.
  async pendingCount(): Promise<number> {
    return (await this.alerts.findPending()).length;
  }

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
    // Alert prices are display floats (not minor units) — format inline, not with formatMinor.
    const px = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
    for (const a of fired) {
      const price = priceBySymbol.get(a.symbol)!;
      // One call → socket toast (open tab) + Web Push (closed app); SW dedupes when focused.
      await this.notify.notify(a.userId, {
        title: `🔔 ${a.symbol} crossed ${a.direction} ${px(a.targetPrice)}`,
        body: `now ${px(price)}`,
        tag: a.id,
        url: '/alerts',
      });
    }
  }
}
