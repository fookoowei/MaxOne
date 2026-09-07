import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { RealtimeService, type NotificationPayload } from './realtime.service';
import { QueueService } from '../queue/queue.service';
import { ROUTING_KEYS, type NotificationPushEvent } from '../queue/events';

/**
 * One delivery call → socket toast NOW (in-process, no I/O) + Web Push LATER (queued; the worker
 * sends it). The HTTP request no longer waits on Google/Apple push servers, and a push the broker
 * accepted survives an API crash. Broker down → publish returns false, socket still fired, push
 * dropped (logged once by QueueService) — M16d's outbox is the fix for that gap.
 */
@Injectable()
export class NotificationService {
  constructor(
    private readonly realtime: RealtimeService,
    private readonly queue: QueueService,
  ) {}

  async notify(userId: string, payload: NotificationPayload): Promise<void> {
    this.realtime.emitNotification(userId, payload);
    const event: NotificationPushEvent = {
      id: randomUUID(),
      type: ROUTING_KEYS.notificationPush,
      occurredAt: new Date().toISOString(),
      userId,
      payload,
    };
    this.queue.publish(ROUTING_KEYS.notificationPush, event);
  }
}
