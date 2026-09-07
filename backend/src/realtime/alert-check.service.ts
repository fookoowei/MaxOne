import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { isTriggered } from '../alerts/is-triggered';
import { NotificationService } from './notification.service';

// Runs on the price tick: finds pending alerts, fires the newly-crossed ones (one-shot).
@Injectable()
export class AlertCheckService {
  constructor(
    private readonly alerts: AlertsService,
    private readonly notify: NotificationService,
    private readonly prisma: PrismaService,
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
    // Alert prices are display floats (not minor units) — format inline, not with formatMinor.
    const px = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
    // M16d: mark + enqueue in ONE transaction. Before, "mark then notify" could crash in between
    // and leave an alert marked but the user never told; now they commit together or not at all,
    // and a crash after commit is covered by the outbox relay.
    const events = await this.prisma.$transaction(async (tx) => {
      await this.alerts.markTriggered(fired.map((a) => a.id), tx);
      return Promise.all(
        fired.map((a) =>
          this.notify.enqueue(tx, a.userId, {
            title: `🔔 ${a.symbol} crossed ${a.direction} ${px(a.targetPrice)}`,
            body: `now ${px(priceBySymbol.get(a.symbol)!)}`,
            tag: a.id,
            url: '/alerts',
          }),
        ),
      );
    });
    for (const e of events) await this.notify.dispatch(e);
  }
}
