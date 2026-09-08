import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { RealtimeService, type NotificationPayload } from './realtime.service';
import { OutboxService } from '../outbox/outbox.service';
import { ROUTING_KEYS, type NotificationPushEvent } from '../queue/events';
import { getAuditContext } from '../audit/audit.context';

/**
 * Two halves that mirror before-commit / after-commit (M16d):
 *  - enqueue(tx, …): INSIDE the caller's Postgres transaction — the event row commits with the money.
 *  - dispatch(event): AFTER commit — socket toast now (in-process) + publish-now via the outbox.
 * If the broker is down, dispatch's publish fails softly and the 2s relay picks the row up later.
 * Nothing is lost, only delayed. The worker never changed.
 */
@Injectable()
export class NotificationService {
  constructor(
    private readonly realtime: RealtimeService,
    private readonly outbox: OutboxService,
  ) {}

  async enqueue(
    tx: Prisma.TransactionClient,
    userId: string,
    payload: NotificationPayload,
  ): Promise<NotificationPushEvent> {
    const event: NotificationPushEvent = {
      id: randomUUID(),
      type: ROUTING_KEYS.notificationPush,
      occurredAt: new Date().toISOString(),
      userId,
      payload,
      ...(getAuditContext().requestId ? { requestId: getAuditContext().requestId } : {}),
    };
    await this.outbox.enqueue(tx, ROUTING_KEYS.notificationPush, event);
    return event;
  }

  /** After commit. Never throws — a delivery hiccup must never fail an already-settled request. */
  async dispatch(event: NotificationPushEvent): Promise<void> {
    try {
      this.realtime.emitNotification(event.userId, event.payload);
    } catch {
      /* socket emit is best-effort */
    }
    await this.outbox.publishNow({ id: event.id, routingKey: ROUTING_KEYS.notificationPush, payload: event });
  }
}
