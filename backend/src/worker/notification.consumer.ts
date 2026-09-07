import { Injectable, Logger } from '@nestjs/common';
import { QueueService } from '../queue/queue.service';
import { PushService } from '../push/push.service';
import { CacheService } from '../cache/cache.service';
import {
  HEADER_RETRY_COUNT,
  MAX_RETRIES,
  RETRY_DELAYS_MS,
  ROUTING_KEYS,
  parseNotificationPushEvent,
  type NotificationPushEvent,
} from '../queue/events';
import type { AmqpMessage } from '../queue/amqp.types';

const PREFETCH = 10; // max unacked messages held by this worker: a slow push can't hoard the queue
const DRAIN_POLL_MS = 50;
const DRAIN_MAX_MS = 10_000;
const DONE_TTL_S = 86_400; // 24h dedupe window — covers any realistic redelivery

const reason = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * The first consumer. Every branch of handle() ends in exactly ONE ack or nack:
 *  - malformed         → nack, no requeue  → the queue's DLX routes it to notifications.push.dead
 *  - already handled   → ack (idempotent: Redis mark mq:done:<id>, set AFTER a successful push)
 *  - push ok           → mark + ack
 *  - push failed       → republish to retry.<n+1> (x-retry-count header) + ack the original,
 *                        or after MAX_RETRIES → nack, no requeue → dead queue.
 * requeue=true appears in exactly one place: the retry republish itself failed because the broker
 * connection is going away — the broker redelivers unacked messages on loss regardless.
 */
@Injectable()
export class NotificationConsumer {
  private readonly log = new Logger(NotificationConsumer.name);
  private inFlight = 0;

  constructor(
    private readonly queue: QueueService,
    private readonly push: PushService,
    private readonly cache: CacheService,
  ) {}

  async start(): Promise<void> {
    await this.queue.consume((msg) => this.handle(msg), PREFETCH);
    this.log.log(`Consuming notifications.push (prefetch ${PREFETCH})`);
  }

  /** Graceful stop: no new deliveries, then wait for in-flight handlers to ack/nack. */
  async stop(): Promise<void> {
    await this.queue.cancel();
    const deadline = Date.now() + DRAIN_MAX_MS;
    while (this.inFlight > 0 && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, DRAIN_POLL_MS));
    }
  }

  async handle(msg: AmqpMessage): Promise<void> {
    this.inFlight += 1;
    try {
      let event: NotificationPushEvent;
      try {
        event = parseNotificationPushEvent(msg.content.toString());
      } catch (e) {
        this.log.warn(`dead-lettering malformed message: ${reason(e)}`);
        this.queue.nack(msg, false);
        return;
      }

      const doneKey = `mq:done:${event.id}`;
      if (await this.cache.get(doneKey)) {
        this.log.log(`duplicate, skipping id=${event.id}`);
        this.queue.ack(msg);
        return;
      }

      try {
        await this.push.sendToUser(event.userId, event.payload);
      } catch (e) {
        this.retryOrDead(msg, event, reason(e));
        return;
      }

      await this.cache.set(doneKey, 1, DONE_TTL_S); // mark AFTER success: a crash mid-send → retry, not skip
      this.queue.ack(msg);
      this.log.log(`push sent id=${event.id} user=${event.userId}`);
    } finally {
      this.inFlight -= 1;
    }
  }

  private retryOrDead(msg: AmqpMessage, event: NotificationPushEvent, why: string): void {
    const attempt = Number(msg.properties.headers?.[HEADER_RETRY_COUNT] ?? 0);
    if (attempt >= MAX_RETRIES) {
      this.log.warn(`dead-lettering after ${attempt} retries id=${event.id} reason=${why}`);
      this.queue.nack(msg, false);
      return;
    }
    const next = attempt + 1;
    const ok = this.queue.publish(ROUTING_KEYS.notificationPushRetry(next), event, {
      headers: { [HEADER_RETRY_COUNT]: next },
    });
    if (!ok) {
      this.queue.nack(msg, true); // broker going away — put it back; it redelivers on loss anyway
      return;
    }
    this.queue.ack(msg); // the retry copy is safely parked; the original is done
    this.log.warn(`retry ${next}/${MAX_RETRIES} in ${RETRY_DELAYS_MS[attempt] / 1000}s id=${event.id} reason=${why}`);
  }
}
